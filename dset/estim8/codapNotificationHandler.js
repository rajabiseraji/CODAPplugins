import { codapHelperModules } from "./websocketHandler.js";

var componentList = [];

export const codapNotificationHandler = {

    componentChangeHandler: function(imsg) {
        console.log("i'm here for the component change: ");
        console.log(imsg);

        var id = imsg.values.id;
        findComponent(id).then(changeComponentListItem).catch((errMsg) => {
            console.log(errMsg);
        });
        
    },
    
    componentCreateHandler: function(imsg) {
        console.log("A component just got create : ");
        console.log(imsg);
        
        if(imsg.values.type !== "graph")
        return;
        
        // as the next step, just find it using the codap interface
        
        var id = imsg.values.id;
        findComponent(id).then(addToComponentList).catch((errMsg) => {
            console.log(errMsg);
        });
        
    },
    
    componentDeleteHandler: function(imsg) {
        console.log("a component just got deleted: ");
        console.log(imsg);
        
        if(imsg.values.type !== "DG.GraphView") // for some reason the name in delete differs from the name in create and change
        return;
        
        var id = imsg.values.id;
        removeComponentFromList(id);


        console.log("here's the component list after the fact");
        console.log(componentList);
    },

    // This function gets the websocket msg and is called from websocketHandler 
    // it will find the component in the component list and returns it to the caller
    findComponentFromList: function(websocketMsg) {
        const targetPosition = {
            x: websocketMsg.x, 
            y: websocketMsg.y
        }
        return componentList.find((component) => {
            // if the component was in the bounds that we have selected, return it to the sender
            if(component.values.position.x <= targetPosition.x && targetPosition.x <= component.values.position.endX)
                if(component.values.position.y <= targetPosition.y && targetPosition.y <= component.values.position.endY)
                    return component;
        });
    },
    
}



function findComponent(CODAPcomponentID) {
    const msg = {
      "action": "get",
      "resource": `component[${CODAPcomponentID}]`
    };
    
    return new Promise((resolve, reject) => {
        codapHelperModules.sendCodapReq(msg).then((result) => {
            if(result.values) {
                // do something with the results here
                resolve({resultObjectFromCodap: result, CODAPcomponentID});
            } else {
                reject("result.values is empty");
            }
        });
    }) 
}

function addToComponentList({resultObjectFromCodap, CODAPcomponentID}) {
    var component =  {
        id: CODAPcomponentID, 
        values: resultObjectFromCodap.values
    };
    component.values.position = findInScreenPosition(component.values.position, component.values.dimensions);
    var exists = componentList.some((el) => el.id === CODAPcomponentID);
    if (!exists)
        componentList.push(component);

    console.log("here's the component list after the fact");
    console.log(componentList);
}

function removeComponentFromList(CODAPcomponentID) {
    var foundIndex = componentList.findIndex((el) => el.id === CODAPcomponentID);
    if(foundIndex !== -1) 
        componentList.splice(foundIndex, 1);
}

function changeComponentListItem({resultObjectFromCodap, CODAPcomponentID}) {
    var foundIndex = componentList.findIndex((el) => el.id === CODAPcomponentID);
    if(foundIndex !== -1) {
        componentList[foundIndex].values = resultObjectFromCodap.values;
        componentList[foundIndex].values.position = findInScreenPosition(componentList[foundIndex].values.position, componentList[foundIndex].values.dimensions);
    }

    console.log("here's the component list after the fact");
    console.log(componentList);
}

// receives an object in the form of {left: int, top: int} that are the positions in CODAP space 
// and returns the position of the component in the real viewport
function findInScreenPosition(CODAPcomponentPosition, CODAPcomponentDimensions) {
    // codap's position.top is the relative height from the parent object 
    // which means that we should add the other heights to find the height of our element on desktop
    const chromeNavbarHeight =  71; // window.outerHeight -  window.innerHeight;
    const codapNavbarHeight = 95;
    // console.log("here's the codap component position before the fact " + CODAPcomponentPosition.top);
    return {
        x: CODAPcomponentPosition.left,
        y: CODAPcomponentPosition.top + codapNavbarHeight + chromeNavbarHeight,
        endX: CODAPcomponentPosition.left + CODAPcomponentDimensions.width,
        endY: CODAPcomponentPosition.top + codapNavbarHeight + chromeNavbarHeight + CODAPcomponentDimensions.height
    }
}


