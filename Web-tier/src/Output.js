import React, { Component } from 'react';
import AWS from "aws-sdk";

AWS.config.update({
    accessKeyId: process.env.REACT_APP_ACCESS_ID,
    secretAccessKey: process.env.REACT_APP_ACCESS_KEY,
    region:process.env.REACT_APP_REGION
  });

var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
var sqsparams={
    QueueUrl:process.env.REACT_APP_RESPONSEQUEUE_URL,
    AttributeNames:['ApproximateNumberOfMessages']
};
var params = {
    AttributeNames: [
       "SentTimestamp"
    ],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: [
       "All"
    ],
    QueueUrl: process.env.REACT_APP_RESPONSEQUEUE_URL,
    VisibilityTimeout: 20,
    WaitTimeSeconds: 0
   };
  function  responsequeueLisitner () {
    const Resultset=[];
        sqs.getQueueAttributes(sqsparams, function (err,data) {
            var numOfMsgs = parseInt(data.Attributes.ApproximateNumberOfMessages);
            if(numOfMsgs>0){
                sqs.receiveMessage(params, function(err,data){
                    if(err){
                        console.log(err)
                    }else if(data.Messages){
                        (data.Messages).map((data,index)=>{
                            Resultset.push(data.Body)

                        })
                        
                        
                        var deleteParams = {
                            QueueUrl: process.env.REACT_APP_RESPONSEQUEUE_URL,
                            ReceiptHandle: data.Messages[0].ReceiptHandle
                          };
                          sqs.deleteMessage(deleteParams, function(err, data) {
                            if (err) {
                              console.log("Delete Error", err);
                            } else {
                              console.log("Message Deleted", data);
                            }
                          });
                    }
                })
            }
            
        })
    
 return Resultset;
     
}
class Output extends Component {

    constructor(props) {
        
        super(props)
       // this.responsequeueLisitner = this.responsequeueLisitner.bind(this)
        this.update=this.update.bind(this);
       this.state={
            results : []
        }
    }
    
    renderTableData(){
        return this.state.results.map((everyResult, index)=>{
            const{imageOutput} = everyResult.Body
            return(
                <tr key={imageOutput}>
                    <td>{imageOutput}</td>
                 </tr>
            )

        })
    }


update=(() =>{  this.setState({
    results:responsequeueLisitner()
}, () => {
    console.log(this.state.results)   
})
});
    render() {
        return (
            <div>
                <h1>Result</h1>
                <button onClick={this.update}>
            GetResult
				</button>
                <table id ='results'>
             <tbody>
            {this.renderTableData()}
            </tbody>
    </table>
                
                
            </div>
        );
    }
}

export default Output;