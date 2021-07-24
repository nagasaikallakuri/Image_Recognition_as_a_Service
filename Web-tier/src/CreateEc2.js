import AWS from "aws-sdk";
import * as Sentry from '@sentry/react';
AWS.config.update({
    accessKeyId: process.env.REACT_APP_ACCESS_ID,
    secretAccessKey: process.env.REACT_APP_ACCESS_KEY,
    region:process.env.REACT_APP_REGION
  });

Sentry.init({
    dsn: process.env.sentry_url,
    tracesSampleRate: 1.0,
});

let ec2 = new AWS.EC2({
    region: process.env.REACT_APP_REGION,
    accessKeyId: process.env.REACT_APP_ACCESS_ID,
    secretAccessKey: process.env.REACT_APP_ACCESS_KEY
});

export const createInstances = (maxInstances, existingInstances, callback)=>{


    var instanceParams = {
        ImageId: process.env.REACT_APP_AWS_NEW_AMI_ID, 
        InstanceType: process.env.REACT_APP_AWS_EC2_INSTANCE_TYPE,
        KeyName: process.env.REACT_APP_AWS_KEY_NAME,
        IamInstanceProfile: {
            Arn: process.env.REACT_APP_AWS_IAM_PROFILE_ARN
        },
        SecurityGroupIds:[process.env.REACT_APP_AWS_SECURITY_GROUP_ID],
        MinCount: 1,
        MaxCount: 1
    };
    if (maxInstances > 1){
        instanceParams.MinCount = maxInstances - 1
    }
    instanceParams.MaxCount = maxInstances
    console.log(instanceParams);
    ec2.runInstances(instanceParams).promise().then((data) => {
        console.log('created runInstances')
        data.Instances.forEach((instance, index) => {
            var instanceId = instance.InstanceId;
            console.log("Created instance", instanceId);
            var tagParams = {
                Resources:  [instanceId], 
                Tags:   [
                    { Key: 'Name', Value: 'app-instance'+ (existingInstances + index + 1) },
                    { Key: 'Purpose', Value: 'app-tier' }
                ]
            };
            ec2.createTags(tagParams).promise().then((data) => {}).catch((err) => {
                console.log('error in create tags')
                Sentry.captureException(new Error('createTags'), Sentry.setContext("createTags", err));
            });
        });
        existingInstances += data.Instances.length;
        callback(existingInstances);
    }).catch((err) => {
        Sentry.captureException(new Error('createInstances'), Sentry.setContext("createInstances", err));
    });
}
 export function getNumberOfInstances(callback){
    var params = { 
        Filters: [ 
            { Name: 'instance-state-name', Values: ['running', 'pending', 'shutting-down'] },
            { Name: "tag:Purpose",  Values: ["app-tier"] }
        ]
    };
    ec2.describeInstances(params).promise().then((data) => {
        var numberOfAppInstances = 0
        data.Reservations.forEach((reservation) =>{
            numberOfAppInstances += reservation.Instances.length;
        })
        callback(numberOfAppInstances);
    }).catch((err) => {
        Sentry.captureException(new Error('getNumberOfInstances'), Sentry.setContext("getNumberOfInstances", err));
    });
}

// module.export = {
//     createInstances,
//     getNumberOfInstances
// }
