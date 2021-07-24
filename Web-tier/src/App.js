import React, { Component } from 'react';
import './index.css';
import Upload from './Upload';
import Output from './Output';
export default class App extends Component {
 
 render(){
  return (
    <div className="App"> 
    <div>
    <Upload/>
    </div>
    <div>
    <Output/>
    </div>
    </div>
  );
 }
}

