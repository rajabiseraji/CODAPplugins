
import { codapNotificationHandler } from "./codapNotificationHandler.js";
const DATA_CONTEXT_NAME = "engine";

export const websockethandler = async function() {
    // if you want the extrusion to delete the thing on the desktop side, just set this to true 
    // if it's false, it will just clone the vis in XR instead of transferring it there
    const extrudeToDelete = false;
    
    const ws = await connectToServer();
    
    document.body.onmousemove = (evt) => {
        const messageBody = { x: evt.clientX, y: evt.clientY };
        ws.send(JSON.stringify(messageBody));
    };

    ws.onmessage = (webSocketMessage) => {
        const messageBody = JSON.parse(webSocketMessage.data);
        if(messageBody.sender && messageBody.sender === "unity") {
            console.log("here's the data from our Unity client")
            console.log(messageBody)

            // first we want to see what is the type of operation that we need to do
            switch (messageBody.typeOfMessage) {
              case "CREATE":
                // do stuff that have to do with creation
                codapHelperModules.sendCodapGraphCreationReq(messageBody);
                break;
              
              case "EXTRUDE":
                // console.log("I was asked to extrude sth and here's the data");
                // console.log(messageBody);
                console.log("Extruding ");
                let foundComponent = codapNotificationHandler.findComponentFromList(messageBody);

                if(extrudeToDelete) {
                  // If you don't want the extrusion to delete something, then comment this 
                  // If not, it will just delete the vis from desktop and recreates it in XR
                  codapHelperModules.sendCodapGraphDeleteReq(foundComponent.id);
                }


                if(foundComponent) {
                  console.log(foundComponent);
                  const newMsgBody = {
                    x: foundComponent.values.position.x,
                    y: foundComponent.values.position.y,
                    typeOfMessage: "CODAPINFO",
                    xAxisName: foundComponent.values.xAttributeName,
                    yAxisName: foundComponent.values.yAttributeName
                  }

                  // send this msg to the server to be sent to Unity 
                  ws.send(JSON.stringify(newMsgBody));

                }
                //  do stuff to extrude a visualization from desktop to VR
                // get the position of the desktop from the msg 
                // use the position to get the relative component from the list
                break;

              default:
                break;
            }

        }
        const cursor = getOrCreateCursorFor(messageBody);
        cursor.style.transform = `translate(${messageBody.x}px, ${messageBody.y}px)`;
    };
        
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