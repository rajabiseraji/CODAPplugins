import { codapHelperModules } from "./websocketHandler.js";

var componentList = [];

export const codapNotificationHandler = {

    componentChangeHandler: function(imsg) {
        console.log("i'm here for the component change: ");
        console.log(imsg);

        var id = imsg.values.id;
        findComponent(id, changeComponentListItem);
        
    },
    
    componentCreateHandler: function(imsg) {
        console.log("A component just got create : ");
        console.log(imsg);
        
        if(imsg.values.type !== "graph")
        return;
        
        // as the next step, just find it using the codap interface
        
        var id = imsg.values.id;
        findComponent(id, addToComponentList);
        
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
    
}



async function findComponent(CODAPcomponentID, callbackfn) {
    const msg = {
      "action": "get",
      "resource": `component[${CODAPcomponentID}]`
    };
    
    await codapHelperModules.sendCodapReq(msg, (result) => {
        if(result.values) {
            // do something with the results here
            callbackfn(result, CODAPcomponentID);
        }
    });
}

function addToComponentList(resultObjectFromCodap, CODAPcomponentID) {
    var component =  {
        id: CODAPcomponentID, 
        values: resultObjectFromCodap.values
    };
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

function changeComponentListItem(resultObjectFromCodap, CODAPcomponentID) {
    var foundIndex = componentList.findIndex((el) => el.id === CODAPcomponentID);
    if(foundIndex !== -1) 
        componentList[foundIndex].values = resultObjectFromCodap.values;

    console.log("here's the component list after the fact");
    console.log(componentList);
}


