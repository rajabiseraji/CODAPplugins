
import { codapNotificationHandler } from "./codapNotificationHandler.js";
const DATA_CONTEXT_NAME = "vancouverHousing";

export const websockethandler = async function() {
    // if you want the extrusion to delete the thing on the desktop side, just set this to true 
    // if it's false, it will just clone the vis in XR instead of transferring it there
    const extrudeToDelete = false;
    const ws = await connectToServer();
    
    // document.body.onmousemove = (evt) => {
    //     const messageBody = { x: evt.clientX, y: evt.clientY };
    //     ws.send(JSON.stringify(messageBody));
    // };
    const debouncedFunc = debounce((msg) => {
      console.log("Hey I'm from VR");
      handleBrushFromVRToDesktop(msg)
    }, 200);

    const throttledFunc = throttle((msg) => {
      console.log("Hey I'm from VR");
      handleBrushFromVRToDesktop(msg)
    }, 400);

    ws.onmessage = (webSocketMessage) => {
        const messageBody = JSON.parse(webSocketMessage.data);
        if(messageBody.sender && messageBody.sender === "unity") {
            console.log("here's the data from our Unity client")
            console.log(messageBody)

            // first we want to see what is the type of operation that we need to do
            if(messageBody.typeOfMessage === "CREATE") {
              codapHelperModules.sendCodapGraphCreationReq(messageBody);
            } else if (messageBody.typeOfMessage === "EXTRUDE") {
              handleExtrusion(messageBody);
            } else if (messageBody.typeOfMessage === "BRUSHTODESKTOP") {
              
              // choose whether you want it throttled or debounced
              // debouncedFunc(messageBody);
              throttledFunc(messageBody);
              
            }

            // switch (messageBody.typeOfMessage) {
            //   case "CREATE":
            //     // do stuff that have to do with creation
            //     codapHelperModules.sendCodapGraphCreationReq(messageBody);
            //     break;
              
            //   case "EXTRUDE":
            //     //  do stuff to extrude a visualization from desktop to VR
            //     // get the position of the desktop from the msg 
            //     // use the position to get the relative component from the list

            //     // console.log("I was asked to extrude sth and here's the data");
            //     // console.log(messageBody);
            //     handleExtrusion(messageBody);
            //     break;

            //   default:
            //     break;
            // }

        }
        // const cursor = getOrCreateCursorFor(messageBody);
        // cursor.style.transform = `translate(${messageBody.x}px, ${messageBody.y}px)`;
    };

    function handleExtrusion(messageBody) {
      console.log("Extruding " + JSON.stringify(messageBody));
      let foundComponent = codapNotificationHandler.findComponentFromList(messageBody);

      if(extrudeToDelete) {
        // If you don't want the extrusion to delete something, then comment this 
        // If not, it will just delete the vis from desktop and recreates it in XR
        codapHelperModules.sendCodapGraphDeleteReq(foundComponent.id);
      }

      let newMsgBody = "";
      if(foundComponent) {
        console.log(foundComponent);
        newMsgBody = {
          sender: "codap",
          x: foundComponent.values.position.x,
          y: foundComponent.values.position.y,
          typeOfMessage: "CODAPINFO",
          xAxisName: foundComponent.values.xAttributeName,
          yAxisName: foundComponent.values.yAttributeName
        }
      } else if(foundComponent === undefined) {
        console.log("Didnt find anything under this coords");
        newMsgBody = {
          sender: "codap",
          x: -1,
          y: -1,
          typeOfMessage: "CODAPINFO",
          text: "NOT_FOUND",
          xAxisName: "",
          yAxisName: ""
        }
      }
        
      ws.send(JSON.stringify(newMsgBody));

    }

    function handleBrushFromVRToDesktop(messageBody) { 
      console.log("Brushing from VR");
      
      // first set a flag that codap doesn't call it's change function and send the brushing msg to unity again

      // get the data
      let indexes = messageBody.indexes;
      console.log(indexes);
      // change the indexes to a format that starts from FIRST_CASE_INDEX
      var firstCaseIndex = codapNotificationHandler.getFirstCaseIndex();
      indexes = indexes.map((item) => item + firstCaseIndex);

      // call a function in codap to brush that index
      codapHelperModules.sendCodapGraphSelectionReq(indexes);
    }

    const sendBrushingMessage = debounce(function() {
      console.log("sending brushing over to unity");
      let selectedIndexes = codapNotificationHandler.getSelectedCaseIndexes();
      console.log(selectedIndexes);

      let newMsgBody = {
        sender: "codap",
        id: 1,
        text: "brushing",
        typeOfMessage: "BRUSHTOVR",
        indexes: [...selectedIndexes]
      }

      ws.send(JSON.stringify(newMsgBody));
    }, 500);

    const sendLoggingMessage = debounce(function() {
      console.log("sending logging over to unity");



      let newMsgBody = {
        sender: "codap",
        id: 1,
        text: codapNotificationHandler.getToBeLoggedMsg(),
        typeOfMessage: "CODAPLOGGING",
      }

      ws.send(JSON.stringify(newMsgBody));
    }, 500);


    const sendCODAPComponentInfoMessage = function(updatedComponentList) {
      console.log("sending component info message over to unity");

      console.log(updatedComponentList);

      let newMsgBody = {
        sender: "codap",
        id: 10,
        text: "Component List Info",
        typeOfMessage: "COMPONENTLISTUPDATE",
        componentList: updatedComponentList 
      }

      ws.send(JSON.stringify(newMsgBody));
    };
     
    // this function generates ws constant variable
    async function connectToServer() {    
        const ws = new WebSocket('ws://localhost:7071/ws?name=codap');
        return new Promise((resolve, reject) => {
            const timer = setInterval(() => {
                if(ws.readyState === 1) {
                    clearInterval(timer);
                    resolve(ws);
                }
            }, 10);
        });   
    }

    function getOrCreateCursorFor(messageBody) {
        const sender = messageBody.sender;
        const existing = document.querySelector(`[data-sender='${sender}']`);
        if (existing) {
            return existing;
        }
        
        const template = document.getElementById('cursor');
        const cursor = template.content.firstElementChild.cloneNode(true);
        const svgPath = cursor.getElementsByTagName('path')[0];    
            
        cursor.setAttribute("data-sender", sender);
        svgPath.setAttribute('fill', `hsl(${messageBody.color}, 50%, 50%)`);    
        document.body.appendChild(cursor);

        return cursor;
    }


    return {sendBrushingMessage, sendCODAPComponentInfoMessage, sendLoggingMessage};
};


export const codapHelperModules = {
  
  sendCodapGraphCreationReq: function(messageBody) {
    const message = {
        "action": "create",
        "resource": "component",
        "values": {
          "type": "graph",
          "name": messageBody.text,
          "dimensions": {
            "width": 240,
            "height": 240
          },
          "position": "top",
          "dataContext": DATA_CONTEXT_NAME,
          "xAttributeName": messageBody.xAxisName,
          "yAttributeName": messageBody.yAxisName
        }
      }
    this.sendCodapReq(message).then(() => {
      console.log("do something in codapNotificationHandler")
    }).catch((isError) => {
      console.log("I got an error from the promise");
    });
  },

  sendCodapGraphSelectionReq: function(CODAPCaseIndexArray) {
    const message = {
      "action": "create",
      "resource": `dataContext[${DATA_CONTEXT_NAME}].selectionList`,
      "values": CODAPCaseIndexArray
    }

    this.sendCodapReq(message).then(() => {
      console.log("we sent selection from Unity to CODAP with success");
      codapNotificationHandler.setUnitySelectionMsgFlag();
    }).catch((isError) => {
      console.log("Error in selection promise!");
    });

  },

  sendCodapGraphDeleteReq: function(CODAPcomponentID) {
    const message = {
        "action": "delete",
        "resource": `component[${CODAPcomponentID}]`,
      }
    this.sendCodapReq(message).then(() => {
      console.log("do something in codapNotificationHandler")
    }).catch((isError) => {
      console.log("I got an error from the promise");
    });
  },

  sendCodapReq: function(message) {
    return new Promise((resolve, reject) => {
      codapInterface.sendRequest(message, function (result) {
        var isError = false;
        if (isSuccess(result)) {
          console.log("success in the thing");
          console.log(result);
          // if(result.values.id) {
          //   console.log("here's the id " + result.values.id);
  
            // do callback on success here
            // callbackOnSuccess(result);
            resolve(result);
  
          // } else {
          //   console.log("i didn't find any ids");
          // }
        } else {
          isError = true;
          reject(isError);
        }
      });
    })
  },

}

function isSuccess(obj) {
    if (!obj) { return false;}
    var rslt = true;
    if (!Array.isArray(obj)) obj = [obj];
    rslt = !obj.some(function (o) {
      return (!(o.success))
    });
    return rslt;
}

function debounce(func, delay) {
  let timer;
  return function () { //anonymous function
    const context = this;
    const args = arguments;
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(context, args)
    }, delay);
  }
}


const throttle = (func, limitPeriod) => {
  let lastFunc;
  let lastRan;
  return function() {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args)
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limitPeriod) {
            func.apply(context, args);
            lastRan = Date.now();
          }
       }, limitPeriod - (Date.now() - lastRan));
    }
  }
}

