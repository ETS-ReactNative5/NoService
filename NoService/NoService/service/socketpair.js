// NoService/NoService/socketpair.js
// Description:
// "socketpair.js" provide functions of socket.
// Copyright 2018 NOOXY. All Rights Reserved.
'use strict';
const Utils = require('../library').Utilities;

function ServiceSocket(service_name, prototype, emitRouter, debug, entity_module) {
  let _jsonfunctions = prototype==null?{}:prototype;
  let _holding_entities = [];
  // as on data callback
  let _emitasdata = (conn_profile, i, d) => {
    let _data = {
      "m": "AS",
      "d": {
        "i": i,
        "d": d,
      }
    };
    emitRouter(conn_profile, 'CA', _data);
  }

  let _emitasevent = (conn_profile, i, n, d) => {
    let _data = {
      "m": "EV",
      "d": {
        "i": i,
        "n": n,
        "d": d,
      }
    };
    emitRouter(conn_profile, 'CA', _data);
  }

  let _emitasclose = (conn_profile, i) => {
    let _data = {
      "m": "CS",
      "d": {
        "i": i
      }
    };
    emitRouter(conn_profile, 'CA', _data);
  }
  // JSON Function

  let _send_handler = null;
  let _mode = null;
  let _on_dict = {
    connect: (entityID, callback) => {
      if(debug)
        Utils.TagLog('*WARN*', '_emitConnect of service "'+service_name+'" not implemented');
      callback(false);
    },

    data: (entityID, data) => {
      if(debug)
        Utils.TagLog('*WARN*', '_emitData of service "'+service_name+'" not implemented');
    },

    close: (entityID, callback) => {
      if(debug)
        Utils.TagLog('*WARN*', 'onClose of service "'+service_name+'" not implemented');
      callback(false);
    }
  }

  this.returnJSONfuncList = () => {
    return Object.keys(_jsonfunctions);
  };

  this.returnJSONfuncDict = () => {
    return _jsonfunctions;
  };

  this.def = (name, callback) => {
    _jsonfunctions[name] = _jsonfunctions[name] == null?{}:_jsonfunctions[name];
    _jsonfunctions[name].obj = callback;
  };

  this.sendEvent = (entityID, event, data)=> {
    entity_module.getEntityConnProfile(entityID, (err, connprofile)=>{
      _emitasevent(connprofile, entityID, event, data);
    });
  };

  this.broadcastEvent = (event, data)=> {
    let query = 'service='+service_name+',type=Activity';
    entity_module.getfliteredEntitiesList(query, (err, entitiesID)=>{
      for(let i in entitiesID) {
        entity_module.getEntityConnProfile(entitiesID[i], (err, connprofile) => {
          _emitasevent(connprofile, entitiesID[i], event, data);
        });
      }
    });
  };

  this.sendData = (entityID, data) => {
    entity_module.getEntityConnProfile(entityID, (err, connprofile)=>{
      _emitasdata(connprofile, entityID, data);
    });
  };

  this.broadcastData = (data) => {
    // console.log('f');
    let query = 'service='+service_name+',type=Activity';
    entity_module.getfliteredEntitiesList(query, (err, entitiesID)=>{
      for(let i in entitiesID) {
        entity_module.getEntityConnProfile(entitiesID[i], (err, connprofile) => {
          _emitasdata(connprofile, entitiesID[i], data);
        });
      }
    });
  };

  this.closeAll = (callback)=>{
    // console.log('f');
    let query = 'service='+service_name+',type=Activity';
    entity_module.getfliteredEntitiesList(query, (err, entitiesID)=>{
      for(let i in entitiesID) {
        this._closeSocket(entitiesID[i]);
      }
      callback(false);
    });
  };

  this.close = ()=> {

  };

  this.on = (type, callback)=> {
    _on_dict[type] = callback;
  };

  this._emitFunctionCall = (entityID, JFname, jsons, callback) => {
    try {
      if(_jsonfunctions[JFname]) {
        _jsonfunctions[JFname].obj(JSON.parse(jsons==null?'{}':jsons), entityID, (err, returnVal)=> {
          callback(err, returnVal);
        });
      }
      else {
        throw new Error('JSONfunction '+JFname+' not exist');
      }
    }
    catch (err) {
      if(debug) {
        Utils.TagLog('*ERR*', 'An error occured on JSON function call. Jfunc might not be exist.');
        console.log(err);
      }
      callback(err);
    }
  };

  this._closeSocket = (entityID, remoteClosed)=> {
    entity_module.getEntityConnProfile(entityID, (err, connprofile)=>{
      if(remoteClosed)
        _emitasclose(connprofile, entityID);
      this._emitClose(entityID, (err)=>{
        entity_module.deleteEntity(entityID, (err)=> {
            if(err && debug) {
              Utils.TagLog('*ERR*', 'Error occured at ServiceSocket close.');
              console.log(err);
            }
        });
      });
    });
  };

  this._emitConnect = (entityID, callback)=> {
    _on_dict['connect'](entityID, callback);
  }

  this._emitData = (entityID, data)=> {
    _on_dict['data'](entityID, data);
  }

  this._emitClose = (entityID, callback)=> {
    _on_dict['close'](entityID, callback);
  }

  this.returnServiceName = () => {
    return service_name;
  }

};

function ActivitySocket(conn_profile, emitRouter, debug) {
  // Service Socket callback
  let _emitdata = (i, d) => {
    let _data = {
      "m": "SS",
      "d": {
        "i": i,
        "d": d,
      }
    };
    emitRouter(conn_profile, 'CS', _data);
  }

  // Service Socket callback
  let _emitclose = (i) => {
    let _data = {
      "m": "CS",
      "d": {
        "i": i
      }
    };
    emitRouter(conn_profile, 'CS', _data);
  }

  let _emitjfunc = (entity_id, name, tempid, Json)=> {
    let _data = {
      "m": "JF",
      "d": {
        "i": entity_id,
        "n": name,
        "j": JSON.stringify(Json),
        "t": tempid
      }
    };
    emitRouter(conn_profile, 'CS', _data);
  }

  let _entity_id = null;
  let _launched = false;

  let wait_ops = [];
  let wait_launch_ops = [];
  let _jfqueue = {};
  let _on_dict = {
    data: ()=> {
      if(debug) Utils.TagLog('*WARN*', 'ActivitySocket on "data" not implemented')
    },
    close: ()=> {
      if(debug) Utils.TagLog('*WARN*', 'ActivitySocket on "close" not implemented')
    }
  };

  let _on_event = {

  };

  // For waiting connection is absolutly established. We need to wrap operations and make it queued.
  let exec = (callback) => {
    if(_launched != false) {
      callback();
    }
    else {
      wait_ops.push(callback);
    }
  };

  this.launch = () => {
    _launched = true;
    for(let i in wait_ops) {
      wait_ops[i]();
    }
  };

  this.setEntityID = (id) => {
    _entity_id = id;
    let entities_prev = conn_profile.returnBundle('bundle_entities');
    if(entities_prev != null) {
      conn_profile.setBundle('bundle_entities', [_entity_id].concat(entities_prev));
    }
    else {
      conn_profile.setBundle('bundle_entities', [_entity_id]);
    }
  };

  this.sendJFReturn = (err, tempid, returnvalue) => {
    if(err) {
      _jfqueue[tempid](err);
    }
    else {
      _jfqueue[tempid](err, JSON.parse(returnvalue));
    }
  };

  // JSONfunction call
  this.call = (name, Json, callback) => {
    let op = ()=> {
      let tempid = Utils.generateUniqueID();
      _jfqueue[tempid] = (err, returnvalue) => {
        callback(err, returnvalue);
      };
      _emitjfunc(_entity_id, name, tempid, Json);
    };
    exec(op);
  }

  this.getEntityID = (callback) => {
    callback(false, _entity_id);
  };

  this.sendData = (data) => {
    let op = ()=> {
      _emitdata(_entity_id, data);
    };
    exec(op);
  };

  this.on = (type, callback)=> {
    _on_dict[type] = callback;
  };

  this.onEvent = (event, callback)=> {
    _on_event[event] = callback;
  };

  this._emitData = (data) => {
    _on_dict['data'](false, data);
  };

  this._emitEvent = (event, data)=> {
    _on_event[event](false, data);
  };

  this._emitClose = () => {
    _on_dict['close'](false);
  };

  this.remoteClosed = false;

  this.close = () => {
    let op = ()=> {
      let bundle = conn_profile.returnBundle('bundle_entities');
      for (let i=bundle.length-1; i>=0; i--) {
        if (bundle[i] === _entity_id) {
          if(!this.remoteClosed)
            _emitclose(_entity_id);
          this._emitClose();
          setTimeout(()=>{
            // tell worker abort referance
            if(_ASockets[_entity_id])
              _ASockets[_entity_id].worker_cancel_refer = true;
            delete _ASockets[_entity_id];
          }, ActivitySocketDestroyTimeout);
          bundle.splice(i, 1);
        }
      }
      conn_profile.setBundle('bundle_entities', bundle);
      if(bundle.length == 0) {
        conn_profile.closeConnetion();
      }
    }
    exec(op);
  };
};

module.exports = {
  ServiceSocket: ServiceSocket,
  ActivitySocket: ActivitySocket
};
