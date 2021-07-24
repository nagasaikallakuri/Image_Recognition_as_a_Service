package com.amazonaws.samples;

import java.util.List;
import java.util.concurrent.TimeUnit;

import software.amazon.awssdk.services.sqs.model.Message;
import com.amazonaws.listenerSqs.ListenerSqs;

public class App {
    //private static final long SLEEP_CYCLE = 60000;

    /*
     * Before running the code:
     *      Fill in your AWS access credentials in the provided credentials
     *      file template, and be sure to move the file to the default location
     *      (C:\\Users\\ntallapr\\.aws\\credentials) where the sample code will load the
     *      credentials from.
     *      https://console.aws.amazon.com/iam/home?#security_credential
     *
     * WARNING:
     *      To avoid accidental leakage of your credentials, DO NOT keep
     *      the credentials file in your source directory.
     */

    public static void main(String[] args) throws Exception {
    	
    	System.out.println("started");
        ListenerSqs tempMessage = new ListenerSqs();
        tempMessage.listenMessage();
        

    }
}
