import { websockethandler } from "./websocketHandler.js";
// import codapNotificationHandler from "./codapNotificationHandler.js";

const {sendBrushingMessage, sendCODAPComponentInfoMessage} = await websockethandler();

export {sendBrushingMessage, sendCODAPComponentInfoMessage};