// NSF/services/youservice/entry.js
// Description:
// "youservice/entry.js" description.
// Copyright 2018 NOOXY. All Rights Reserved.

// Your service entry point
function start(api) {
  // Get the service socket of your service
  let ss = api.Service.ServiceSocket;
  // BEWARE! To prevent callback error crash the system.
  // If you call an callback function which is not API provided. Such as setTimeout(callback, timeout).
  // You need to wrap the callback funciton by api.SafeCallback.
  // E.g. setTimeout(api.SafeCallback(callback), timeout)
  let safec = api.SafeCallback;
  // Please save and manipulate your files in this directory
  let files_path = api.Me.FilesPath;

  // Access another service on this daemon
  let admin_daemon_asock = api.Servcie.ActivitySocket.createDefaultAdminDeamonSocket('Another Service', (err, activitysocket)=> {
    // accessing other service
  });

  // JSONfunction is a function that can be defined, which others entities can call.
  // It is a NOOXY Service Framework Standard
  ss.def('JSONfunction', (json, entityID, returnJSON)=>{
    // Code here for JSONfunciton
    // Return Value for JSONfunction call. Otherwise remote will not recieve funciton return value.
    let json_be_returned = {
      d: 'Hello! NOOXY Service Framework!'
    }
    // First parameter for error, next is JSON to be returned.
    returnJSON(false, json_be_returned);
  });

  // Safe define a JSONfunction.
  ss.sdef('SafeJSONfunction', (json, entityID, returnJSON)=>{
    // Code here for JSONfunciton
    // Return Value for JSONfunction call. Otherwise remote will not recieve funciton return value.
    let json_be_returned = {
      d: 'Hello! NOOXY Service Framework!'
    }
    // First parameter for error, next is JSON to be returned.
    returnJSON(false, json_be_returned);
  });

  // ServiceSocket.onData, in case client send data to this Service.
  // You will need entityID to Authorize remote user. And identify remote.
  ss.onData = (entityID, data) => {
    // Get Username and process your work.
    let username = api.Service.Entity.returnEntityOwner(entityID);
    // To store your data and associated with userid INSEAD OF USERNAME!!!
    // Since userid can be promised as a unique identifer!!!
    let userid = null;
    // Get userid from API
    api.Authenticity.getUserID(username, (err, id) => {
      userid = id;
    });
    // process you operation here
    console.log('recieve a data');
    console.log(data);
  }
  // Send data to client.
  ss.sendData(entityID, 'My data to be transfer.');
  // ServiceSocket.onConnect, in case on new connection.
  ss.onConnect = (entityID) => {
    // Do something.
  }
  // ServiceSocket.onClose, in case connection close.
  ss.onClose = (entityID) => {
    // Get Username and process your work.
    let username = api.Service.Entity.returnEntityOwner(entityID);
    // To store your data and associated with userid INSEAD OF USERNAME!!!
    // Since userid can be promised as a unique identifer!!!
    let userid = null;
    // Get userid from API
    api.Authenticity.getUserID(username, (err, id) => {
      userid = id;
    });
    // process you operation here
    console.log('ServiceSocket closed');
  }
}

// If the daemon stop, your service recieve close signal here.
function close(api) {
  // Saving state of you service.
  // Please save and manipulate your files in this directory
  let services_files_path = api.Me.FilesPath;
}

// Export your work for system here.
module.exports = {
  start: start,
  close: close
}
