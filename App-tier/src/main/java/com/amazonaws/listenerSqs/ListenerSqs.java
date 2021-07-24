package com.amazonaws.listenerSqs;

import java.util.List;
import java.util.concurrent.TimeUnit;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.*;

import com.amazonaws.services.s3.AmazonS3Client;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.s3.model.ObjectMetadata;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.auth.PropertiesCredentials;
import com.amazonaws.services.s3.model.S3ObjectInputStream;
import com.amazonaws.services.s3.model.S3ObjectSummary;

import com.amazonaws.util.EC2MetadataUtils;

import com.amazonaws.services.ec2.AmazonEC2;
import com.amazonaws.services.ec2.AmazonEC2ClientBuilder;
import com.amazonaws.services.ec2.model.TerminateInstancesRequest;
import com.amazonaws.regions.Regions;

import com.amazonaws.auth.AWSCredentials;
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;

import com.amazonaws.constants.*;

public class ListenerSqs {

	private static final AWSCredentials AWS_CREDENTIALS;

	static {
		// Your accesskey and secretkey
		AWS_CREDENTIALS = new BasicAWSCredentials(Constants.ACCESSKEY, Constants.SECRETKEY);
	}

	public static void listenMessage() {

		int tempCount = 0;

		while (tempCount < 2) {
 
			System.out.println("started listening to messages");
			SqsClient sqsClient = SqsClient.builder().region(Region.US_EAST_1).build();

			ReceiveMessageRequest receiveMessageRequest = ReceiveMessageRequest.builder()
					.queueUrl(Constants.REQUESTQUEUENAME).maxNumberOfMessages(1).build();

			List<Message> messages = sqsClient.receiveMessage(receiveMessageRequest).messages();

			if (messages.isEmpty() && tempCount > 0) 
			{
				break;
				
			}
			
			if(messages.isEmpty() && tempCount <2){
				
				try {
					TimeUnit.SECONDS.sleep(15);
					tempCount++;
					continue;
				} catch (InterruptedException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}

			}

			// get the message
			Message currentMessage = messages.get(0);

			try {
				//TimeUnit.SECONDS.sleep(5);

				String imageKeyS3Input = messages.get(0).body();

				// get object from S3 and store on instance, get the file path of this image
				String imageFilePath = s3GetObject(Constants.INPUTBUCKETNAME, imageKeyS3Input);

				// Classify output
				String classifierOutput = deepLearningOutput(imageFilePath);

				System.out.println(classifierOutput);

				// Put classifier output along with image in output S3
				s3PutObject(Constants.OUTPUTBUCKETNAME, imageKeyS3Input, classifierOutput);

				System.out.println("stored image");

				// Send Response in response queue
				sendSqsMessage(imageKeyS3Input, classifierOutput);

				System.out.println("sent message");

				// delete messages
				deleteMessages(sqsClient, Constants.REQUESTQUEUENAME, currentMessage);

			} catch (Exception e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}

		}
		terminateInstance();

	}

	public static String s3GetObject(String bucketname, String name) throws Exception {

		AmazonS3 s3Client = AmazonS3ClientBuilder.standard().withRegion(Regions.US_EAST_1).build();

		GetObjectRequest request = new GetObjectRequest(bucketname, name);

		S3Object object = s3Client.getObject(request);
		S3ObjectInputStream objectContent = object.getObjectContent();
		String[] arrStri = name.split("-", 2);
		String imagePath = "./" + arrStri[0];
		IOUtils.copy(objectContent, new FileOutputStream(imagePath));

		return imagePath;

	}

	public static void s3PutObject(String bucketname, String stringObjKeyName, String classifierOutput) {

		AmazonS3 s3Client = AmazonS3ClientBuilder.standard().withRegion(Regions.US_EAST_1).build();
		// Need to check key name to make it unique, or else it will get replaced in the
		// S3 bucket
		// Upload a text string as a new object.

		try {
			s3Client.putObject(bucketname, stringObjKeyName, classifierOutput);

		} catch (Exception e) {
			System.err.println(e);
		}

	}

	public static String deepLearningOutput(String filePath) throws Exception {

		String predictedClassifierName = null;
		Process p;

		p = Runtime.getRuntime().exec("python3 image_classification.py " + filePath);

		p.waitFor();

		BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()));

		predictedClassifierName = br.readLine();

		p.destroy();

		return predictedClassifierName;
	}

	public static void sendSqsMessage(String fileName, String classifierOutput) {

		SqsClient sqsClient = SqsClient.builder().region(Region.US_EAST_1).build();

		// String queueUrl =
		// "https://sqs.us-east-1.amazonaws.com/872436459602/response_queue.fifo";

		String messageToSend = fileName + " was classified as " + classifierOutput;
		// Need to add change the message deduplication ID, because if the same image is
		// tested again then same time stamp will be present.

		try {
			sqsClient.sendMessage(SendMessageRequest.builder().queueUrl(Constants.RESPONSEQUEUENAME)
					.messageBody(messageToSend).messageDeduplicationId(fileName).messageGroupId("Group1").build());

		} catch (SqsException e) {
			System.err.println(e.awsErrorDetails().errorMessage());
		}
	}

	public static void deleteMessages(SqsClient sqsClient, String queueUrl, Message messages) {

		System.out.println("\nDelete Messages");

		try {

			DeleteMessageRequest deleteMessageRequest = DeleteMessageRequest.builder().queueUrl(queueUrl)
					.receiptHandle(messages.receiptHandle()).build();
			sqsClient.deleteMessage(deleteMessageRequest);

		} catch (SqsException e) {
			System.err.println(e.awsErrorDetails().errorMessage());
		}
	}

	public static void terminateInstance() {

		// Set up the amazon ec2 client
		AmazonEC2 ec2Client = AmazonEC2ClientBuilder.standard()
				.withCredentials(new AWSStaticCredentialsProvider(AWS_CREDENTIALS)).withRegion(Regions.US_EAST_1)
				.build();

		String instanceId = EC2MetadataUtils.getInstanceId();

		TerminateInstancesRequest terminateInstancesRequest = new TerminateInstancesRequest()
				.withInstanceIds(instanceId);

		ec2Client.terminateInstances(terminateInstancesRequest).getTerminatingInstances().get(0).getPreviousState()
				.getName();
	}
}
