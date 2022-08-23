import { codapHelperModules } from "./websocketHandler.js";

var componentList = [];
var selectedCaseIndexes = new Set();
var firstCaseId = -1;
const DATA_CONTEXT_NAME = "engine";

export const codapNotificationHandler = {

    getSelectedCaseIndexes: function() {
        return selectedCaseIndexes;
    },
    
    findFirstCaseId: function() {
        // console.log("im in finding first case id");

        var index  = 0;
        findCaseIdByIndex(index).then((foundId) => {
            // console.log("found id is " + foundId);
            firstCaseId = foundId;
        }).catch((errMsg) => {
            console.log(errMsg);
        });
    },

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

        // let's add a 300ms wait before looking for the component that just got created 
        // so that we don't have bulshit data on codap's side
        setTimeout(() => {
            findComponent(id).then(addToComponentList).catch((errMsg) => {
                console.log(errMsg);
            });
        }, 300);
        
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

    graphSelectionHandler: function(imsg) {
        console.log("in graphselection");
        console.log(imsg);

        // 1- debounce the execution until the last one
        // after the last one, get 
        if(!imsg.values.result.extend)
            selectedCaseIndexes.clear();
        
        if (imsg.values.result.cases){
            // this means that we have something to do here!
            var caseIds = imsg.values.result.cases.map(item => (item.id - firstCaseId));
            caseIds.forEach(caseId => {
                selectedCaseIndexes.add(caseId);
            });
        }

        // now send it to unity using the websocket thingy
        // console.log(selectedCaseIndexes);
        // TODO: we need to figure out how to send this wo webscokethandler.js
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

function findCaseIdByIndex(CODAPCaseIndex) {
    const msg = {
        "action": "get",
        "resource": `dataContext[${DATA_CONTEXT_NAME}].collection[cases].caseByIndex[${CODAPCaseIndex}]`,
    }
    
    return new Promise((resolve, reject) => {
        codapHelperModules.sendCodapReq(msg).then((result) => {
            if(result.values) {
                // do something with the results here
                console.log("just got index back");
                if(result.values && result.values.case && result.values.case.id) {
                    console.log("case id is " + result.values.case.id);
                    resolve(result.values.case.id);
                } else {
                    reject("no first case id found");
                }
            } else {
                reject("result.values is empty");
            }
        });
    }) 
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

function addToSelectedCases(resultObject) {
    
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


