import { codapHelperModules } from "./websocketHandler.js";



export default {

    findComponent: function(CODAPcomponentID) {
        const msg = {
          "action": "get",
          "resource": `component[${CODAPcomponentID}]`
        };
        codapHelperModules.sendCodapReq(msg, () => console.log("found the bitch"))
    },
   
    componentChangeHandler: function(imsg) {
        console.log("i'm here for the component change: ");
        console.log(imsg);
    },
    
    componentCreateHandler: function(imsg) {
        console.log("A component just got create : ");
        console.log(imsg);
        
        if(imsg.values.type !== "graph")
            return;
    
    },
    
    componentDeleteHandler: function(imsg) {
        console.log("a component just got deleted: ");
        console.log(imsg);
    }
}

