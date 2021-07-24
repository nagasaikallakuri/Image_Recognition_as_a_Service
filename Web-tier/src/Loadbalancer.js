import * as Sentry from '@sentry/react';
import AWS from "aws-sdk";
import {createInstances, getNumberOfInstances} from './CreateEc2';

AWS.config.update({
    accessKeyId: process.env.REACT_APP_ACCESS_ID,
    secretAccessKey: process.env.REACT_APP_ACCESS_KEY,
    region:process.env.REACT_APP_REGION
  });

var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
// let ec2 = new AWS.EC2({
//     region: process.env.REACT_APP_REGION,
//     accessKeyId: process.env.REACT_APP_ACCESS_ID,
//     secretAccessKey: process.env.REACT_APP_ACCESS_KEY
// });

var ec2params = { 
    Filters: [ 
        { Name: 'instance-state-name', Values: ['running', 'pending', 'shutting-down'] },
        { Name: "tag:purpose",  Values: ["app-tier"] }
    ]
};
var sqsparams={
    QueueUrl:process.env.REACT_APP_REQUESTQUEUE_URL,
    AttributeNames:['ApproximateNumberOfMessages']
};

Sentry.init({
    dsn: process.env.sentry_url,
    tracesSampleRate: 1.0,
});




export const scaleInScaleOut = (currentInstance)=>{
    var numOfMsgs=0,countOfRunningInstances=0;


    // async function x(){
    //     return numOfMsgs = await 
    // }

    sqs.getQueueAttributes(sqsparams, function (err,data) {
        var numOfMsgs = parseInt(data.Attributes.ApproximateNumberOfMessages);
        getNumberOfInstances(function (numberOfAppInstances){

            if(numOfMsgs > 0 && numOfMsgs > numberOfAppInstances){

                var temp = process.env.REACT_APP_MAX_APP_INSTANCES -numberOfAppInstances;
        
                if(temp> 0)
                {
                    var temp1 = numOfMsgs -numberOfAppInstances;
        
                    if(temp1 >= temp){
        
                        createInstances(temp, numberOfAppInstances);
                    }else{
                        createInstances(temp1, numberOfAppInstances);
                    }
        
                }
            } 
        });
    })
    // })
    // .catch( err => { console.log(err); }
   
}

