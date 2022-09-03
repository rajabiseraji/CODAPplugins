import { websockethandler } from "./websocketHandler.js";
// import codapNotificationHandler from "./codapNotificationHandler.js";

const {sendBrushingMessage, sendCODAPComponentInfoMessage, sendLoggingMessage} = await websockethandler();

export {sendBrushingMessage, sendCODAPComponentInfoMessage, sendLoggingMessage};