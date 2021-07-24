import React from 'react';
import './index.css';
import AWS from 'aws-sdk'
import moment from "moment";
import 'moment-timezone';
import {scaleInScaleOut} from "./Loadbalancer";
import Output from './Output';

const S3_BUCKET = process.env.REACT_APP_BUCKET_NAME;
const REGION = process.env.REACT_APP_REGION;


export default class Upload extends React.Component {

  state = {
    flag: false,
    name:[],
    selectedFiles:[]   
  };
  
  onFileChange = (event) => {
    while(this.state.name.length > 0) {
      this.setState({
        selectedFiles:this.state.selectedFiles.pop(),
        name:this.state.name.pop(),
      });
  }
    if(event.target.files.length>0){   
      const fileslatest=[];
      const filenameslatest=[];
      var j=event.target.files.length;
      for(var i=0;i<j;i++)  {
     var file=event.target.files[i];
      var ext = file.name.split('.').pop();
      ext = ext.toLowerCase();
      let tempName = file.name.split('.');
      console.log(ext);
      if (ext === 'jpg' || ext === 'png' || ext ==='jpeg') {        
        fileslatest.push(file);
        var dateTime = moment().format("DD-MM-YYYY-hh:mm:ss");
        var tempFileName = tempName[0] + '-' + dateTime;
        filenameslatest.push(tempFileName);
        
      }
      
      else {
        this.setState({ selectedFile: null, flag: true });
        this.setState({ name: "" })
      }   
  }
  this.setState({ selectedFile: fileslatest, name: filenameslatest });
    }
    
  };
  onFileUpload = event => {


    event.preventDefault();
    let file = this.state.selectedFile;
    let newFileName = this.state.name;


    AWS.config.update({
      accessKeyId: process.env.REACT_APP_ACCESS_ID,
      secretAccessKey: process.env.REACT_APP_ACCESS_KEY,
      region:process.env.REACT_APP_REGION
    })

    const myBucket = new AWS.S3({
      params: { Bucket: S3_BUCKET },
      region: REGION,
    });
    var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

    for(var i=0;i<file.length;i++)  {
    const params = {
      ACL: 'public-read',
      Body: file[i],
      Bucket: S3_BUCKET,
      Key: newFileName[i],
    };

     myBucket.putObject(params)
      .send((err) => {
        if (err) console.log(err)
      });
      var sqsparams = {
        // Remove DelaySeconds parameter and value for FIFO queues
       // DelaySeconds: 10,
       MessageAttributes: {
         "Title": {
           DataType: "String",
           StringValue: newFileName[i],
         }
       },
       MessageBody: newFileName[i],
       MessageDeduplicationId: newFileName[i],  // Required for FIFO queues
       MessageGroupId: "Group1",  // Required for FIFO queues
       QueueUrl: "https://sqs.us-east-1.amazonaws.com/872436459602/request_queue.fifo"
     };
     
     sqs.sendMessage(sqsparams, function(err, data) {
       if (err) {
         console.log("Error", err);
       } else {
         console.log("Success", data.MessageId);
       }
       scaleInScaleOut();
     });
    }
      
    Output.responsequeueLisitner();

  };

//   listenSqsMessages =()=>{

//     AWS.config.update({
//       accessKeyId: process.env.REACT_APP_ACCESS_ID,
//       secretAccessKey: process.env.REACT_APP_ACCESS_KEY,
//       region:process.env.REACT_APP_REGION
//     })

//     var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

//     var queParams = {
//       QueueUrl: process.env.REACT_APP_RESPONSEQUEUE_URL,
//       AttributeNames : ['ApproximateNumberOfMessages'],
//      };
     
//      var numOfMsgs=0;
//      var tempCount = 0;

//   sqs.getQueueAttributes(queParams, function(err, data){
//     if (err) {
//            console.log("Error", err);
//          } else {
//           numOfMsgs = parseInt(data.Attributes.ApproximateNumberOfMessages);
//          }
//   });
// } 
// };

  fileData = () => {

    if (this.state.selectedFile!=null) {
      var names=this.state.name;
      const items=[];
      for(var i=0;i<names.length;i++) {
        items.push(<p>File Name: {names[i]}</p>)
         }
      return (
        <div>   
          {items}
        </div>
      );
          
    } else if (this.state.flag) {
      return (
        <div>
          <br />
          <h4>Choose Image File</h4>
        </div>
      );
    }
    else {
      return (
        <div>
          <br />
          <h4>Choose before Pressing the Upload button</h4>
        </div>
      );
    }
  };


  render() {
    return (
      <div className="App">
        <div>
          <input type="file" onChange={this.onFileChange}  accept=".jpg,.png,.jpeg" multiple/>
          <button onClick={this.onFileUpload}>
            Upload!
				</button>
       
        </div>
        {this.fileData()}
      </div>
    );
  }
}

