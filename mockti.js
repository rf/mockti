function mockti (apiPath) {
  if (!apiPath) apiPath = __dirname + '/api.jsca';

  var fs = require('fs');
  var data = JSON.parse(fs.readFileSync(__dirname + '/api.jsca'));
  var Emitter = require('eventemitter2').EventEmitter2;
  var util = require('util');
  var _ = require('underscore');
  var md5 = require('MD5');
  var request = require('request');
  var querystring = require('querystring');
  var assert = require('assert');

  // Modify Emitter's prototype to conform with what Ti does
  Emitter.prototype.addEventListener = Emitter.prototype.on;
  Emitter.prototype.removeEventListener = Emitter.prototype.removeListener;
  Emitter.prototype.fireEvent = Emitter.prototype.emit;

  var Ti;
  Ti = {};

  function retrieve (root, list) {
    var name = list.shift();
    if (!root[name]) {
      root[name] = {};
      _.extend(root[name], Emitter.prototype);
    }
    var current = root[name];
    if (list.length > 0) return retrieve(current, list);
    else return current;
  }

  var assertTypeMsg = '<%=type%>#<%=name%> expected argument <%=index%> to be of' +
    ' type <%=expected%>, got type <%=found%>';

  function assertType (type, expect, objType, index, name) {
    assert(type === expect, _.template(assertTypeMsg, {
      type: objType, index: index, expected: expect, found: type, name: name
    }));
  }

  function assertTypeOr (type, expect, expectOr, objType, index, name) {
    assert(type === expect || type === expectOr, _.template(assertTypeMsg, {
      type: objType, index: index, expected: expect + " or " + expectOr, 
      found: type, name: name
    }));
  }

  function assertNotUndefined (arg, objType, index, name) {
    assert(arg !== 'undefined', objType + "#" + name + " requires argument " +
      index + " to be specified");
  }

  function assertTypes (args, expectations, obj, name) {
    var builtins = ["object", "function", "number", "string"];
    var possibleObject = ["Titanium.UI.Animation"];

    // If the argument is required and defined, we check.
    // If the argument is not required and defined, we check.
    // If the argument is not required and not defined, we don't check.
    // If the argument is required and not defined, we check.

    expectations.forEach(function (item, index) {
      if (item.type && (args[index] !== undefined || item.usage == 'required')) {
        if (builtins.indexOf(item.type.toLowerCase()) != -1)
          assertType(typeof args[index], item.type.toLowerCase(), obj._type, index, name);

        else if (possibleObject.indexOf(item.type) != -1)
          assertTypeOr(
            (args[index] && args[index]._type) || typeof args[index], 
            'object', item.type, obj._type, index, name
          );

        // otherwise just make sure it's defined
        else assertNotUndefined(args[index], obj._type, index, name);
      }
    });
  }

  function method (namespace, obj, fn) {
    // dont want to overwrite these
    if (['addEventListener', 'removeEventListener', 'fireEvent'].indexOf(fn.name) != -1) return;

    // factory
    if (fn.name.indexOf('create') != -1) {
      obj[fn.name] = function (props) {
        var base = retrieve(Ti, namespace.concat([fn.name.slice(6)]));
        var ret = {};
        _.extend(ret, base, props);
        return ret;
      };

      return;
    }

    if (fn.name == 'add') {
      obj.add = function (view) {
        this.children = this.children || [];
        this.children.push(view);

        if (this.fireEvent) this.fireEvent('function::add', arguments);

        if (fn.parameters && fn.parameters.length > 0 && Ti.assertTypes)
          assertTypes(arguments, fn.parameters, obj, fn.name);
      };
      return;
    }

    if (fn.name == 'remove') {
      obj.remove = function (view) {
        this.children = this.children || [];
        this.children = this.children.filter(function (item) {
          return item !== view;
        });
        if (this.fireEvent) this.fireEvent('function::remove', arguments);

        if (fn.parameters && fn.parameters.length > 0 && Ti.assertTypes)
          assertTypes(arguments, fn.parameters, obj, fn.name);
      };
      return;
    }

    // otherwise it's some method so just make it emit that this method was
    // called
    obj[fn.name] = function () {
      if (this.fireEvent) this.fireEvent('function::' + fn.name, arguments);

      if (fn.parameters && fn.parameters.length > 0 && Ti.assertTypes)
        assertTypes(arguments, fn.parameters, obj, fn.name);
    };
  }

  data.types.forEach(function (item) {
    // Don't worry about stuff that isn't actually in the Titanium namespace for
    // now
    if (item.name.indexOf('Titanium.') == -1) return;

    var name = item.name.slice(9);
    var namespace = name.split('.').slice(-1);
    var obj = retrieve(Ti, name.split('.'));
    obj._type = item.name;
    
    item.functions.forEach(function (fn) {
      method(namespace, obj, fn);
    });

    // TODO: do something with this data
    item.properties.forEach(function (prop) {
    });
  });

  // Some manual stuff

  Ti.Platform = {
    osname: 'android',
    version: '6',
    model: 'mock',
    id: 'mock-id',
    is24HourTimeFormat: function () { return false; },
    Android: {API_LEVEL: 18},
    displayCaps: {
      platformWidth: 480,
      platformHeight: 800,
      dpi: 160
    }
  };

  // Assert types by default.
  Ti.assertTypes = true;

  // This is my sortof silly request mocking system. It just adds requests
  // into these objects, they're like Titanium XHR requests, they can just be
  // pulled out and modified, or you can call their `.onerror()` or `.onload()`
  // method.

  // Requests by URL
  Ti.Network._requestURLs = {};

  // Requests in an array
  Ti.Network._requests = [];

  // Whether or not to use the silly fake system
  Ti.Network.fakeRequests = false;

  var old = Ti.Network.createHTTPClient;
  Ti.Network.createHTTPClient = function (spec) {
    var xhr = old(spec);
    xhr.headers = {};
    xhr.open = function (method, url) {
      xhr.method = method;
      xhr.url = url;
      Ti.Network._requestURLs[url] = xhr;
      Ti.Network._requests.push(xhr);
      xhr.fireEvent('function::open', arguments);
    };

    xhr.send = function (data) {
      if (!data) data = {};
      xhr.data = data;
      xhr.fireEvent('function::send', arguments);

      if (!Ti.Network.fakeRequests) {
        request({
          headers: xhr.headers,
          url: xhr.url,
          method: xhr.method,
          body: querystring.stringify(xhr.data)
        }, function(error, response, body){
          var event = {source: xhr};

          xhr.responseText = body;
          xhr.status = response.statusCode;
          xhr.readyState = 4;

          if (error || xhr.status != 200) {
            xhr.onerror.call(xhr, event);
          }
          
          else {
            if (typeof xhr.onreadystatechange == "function")
              xhr.onreadystatechange.call(xhr, event);
            xhr.onload.call(xhr, event);
          }
        });
      }
    };

    xhr.setRequestHeader = function(key, value){
      xhr.headers[key] = value;
    };

    return xhr;
  };

  Ti.Network._clear = function () {
    Ti.Network._requestURLs = {};
    Ti.Network._requests = [];
  };

  Ti.Network.online = true;

  // Mock some file stuff
  Ti.Filesystem._files = {};
  // Non-standard, for convenience
  Ti.Filesystem.createFile = function (spec) {
    spec = spec || {};
    var file = {};
    _.extend(file, Ti.Filesystem.File);
    file._exists = spec.exists;
    file.exists = function () {
      return file._exists;
    };

    file.read = function () {
      return {text: spec.text};
    };

    return file;
  };
  Ti.Filesystem.getFile = function (name) {
    return Ti.Filesystem._files[name] || Ti.Filesystem.createFile();
  };
  Ti.Filesystem.getApplicationDataDirectory = function () {
    return '';
  };

  Ti.Utils.md5HexDigest = function (input) {
    return md5(input);
  };

  (function () {
    var o = Ti.UI.createWindow;
    Ti.UI.createWindow = function () {
      var win = o.apply(null, arguments);
      if (Ti.Platform.osname == "android") {
        win.activity = {};
        _.extend(win.activity, Ti.Android.Activity);
      }
      return win;
    };
  }());

  Ti.include = function () {};
  Ti.App.Properties.getString = function (name, def) { return def; };
  Ti.App.Properties.getBool = function (name, def) { return def; };
  Ti.App.Properties.getList = function (name, def) { return def; };

  //Ti.API
  Ti.API.info = function(s){
    console.log(s);
  };
  Ti.API.debug = function(d){
    console.log(d);
  };
  Ti.API.error = function(e){
    console.error(e);
  };

  Ti.UI.Window.open = function () {
    Ti.UI.fireEvent("window::open", this);
  };

  alert = function () {
    Ti.fireEvent('alert', arguments);
  };

  return Ti;
}

module.exports = mockti;
