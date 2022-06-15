
(async function() {

    var activeView = "";
    var globalComponentList = [];
    const ws = await connectToServer();
    
    var componentsList = document.getElementsByClassName("dg-component-view"); 
    for (let component of componentsList) {
      component.addEventListener("mouseover", () => {
        activeView = {
          id: component.id, 
          boundingRect: component.getBoundingClientRect()
        };
      });
    }

    document.body.onmousemove = (evt) => {
        const messageBody = { x: evt.clientX, y: evt.clientY };
        ws.send(JSON.stringify(messageBody));
    };

    ws.onmessage = (webSocketMessage) => {
        const messageBody = JSON.parse(webSocketMessage.data);
        if(messageBody.sender && messageBody.sender === "unity") {
            console.log("here's the data from our Unity client")
            console.log(messageBody)
            sendCodapGraphCreationReq(messageBody);
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

    function sendCodapGraphCreationReq(messageBody) {
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
              "dataContext": "auto-mpg",
              "xAttributeName": messageBody.xAxisName,
              "yAttributeName": messageBody.yAxisName
            }
          }
        sendCodapReq(message, (result) => {
          globalComponentList.push(findComponent(result.values.id));
        });
    }

    function sendCodapReq(message, callbackOnSuccess) {
      codapInterface.sendRequest(message, function (result) {
        var isError = false;
        var diff;
        if (isSuccess(result)) {
          console.log("success in the thing");
          console.log(result);
          if(result.values.id) {
            console.log("here's the id " + result.values.id);

            // do callback on success here
            callbackOnSuccess(result);

          } else {
            console.log("i didn't find any ids");
          }
        } else {
          isError = true;
          console.log("error in the thing");
        }
      });
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

    function findComponent(CODAPcomponentID) {
      const msg = {
        "action": "get",
        "resource": `component[${CODAPcomponentID}]`
      };
      sendCodapReq(msg, () => console.log())
    }

})();
