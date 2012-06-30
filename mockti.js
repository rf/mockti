var fs = require('fs');
var data = JSON.parse(fs.readFileSync(__dirname + '/api.jsca'));
var Emitter = require('eventemitter2').EventEmitter2;
var util = require('util');
var _ = require('underscore');
var md5 = require('MD5');

// Modify Emitter's prototype to conform with what Ti does
Emitter.prototype.addEventListener = Emitter.prototype.on;
Emitter.prototype.removeEventListener = Emitter.prototype.removeListener;
Emitter.prototype.fireEvent = Emitter.prototype.emit;

Titanium = Ti = {};

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

function method (namespace, obj, name) {
  // dont want to overwrite these
  if (['addEventListener', 'removeEventListener', 'fireEvent'].indexOf(name) != -1) return;

  // factory
  if (name.indexOf('create') != -1) {
    obj[name] = function (props) {
      var base = retrieve(Ti, namespace.concat([name.slice(6)]));
      var ret = {};
      _.extend(ret, base, props);
      return ret;
    };

    return;
  }

  if (name == 'add') {
    obj.add = function (view) {
      this.children = this.children || [];
      this.children.push(view);
    };
    return;
  }

  // otherwise it's some method so just make it emit that this method was
  // called
  obj[name] = function () {
    if (this.fireEvent) this.fireEvent('function::' + name, {});
  };
}

data.types.forEach(function (item) {
  // Don't worry about stuff that isn't actually in the Titanium namespace for
  // now
  if (item.name.indexOf('Titanium.') == -1) return;

  var name = item.name.slice(9);
  var namespace = name.split('.').slice(-1);
  var obj = retrieve(Ti, name.split('.'));
  
  item.functions.forEach(function (fn) {
    method(namespace, obj, fn.name);
  });

  item.properties.forEach(function (prop) {
  });
});

// Some manual stuff

Ti.Platform ={
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

Ti.Network._requestURLs = {};
Ti.Network._requests = [];
var old = Ti.Network.createHTTPClient;
Ti.Network.createHTTPClient = function (spec) {
  var xhr = old(spec);
  xhr.open = function (method, url) {
    xhr.method = method;
    xhr.url = url;
    Ti.Network._requestURLs[url] = xhr;
    Ti.Network._requests.push(xhr);
    xhr.fireEvent('function::open', arguments);
  };

  xhr.send = function (data) {
    xhr.data = data;
    xhr.fireEvent('function::send', arguments);
  };

  return xhr;
};

Ti.Network._clear = function () {
  Ti.Network._requestURLs = {};
  Ti.Network._requests = [];
};

// Mock some file stuff
Ti.Filesystem._files = {};
// Non-standard, for convenience
Ti.Filesystem.createFile = function (spec) {
  var file = {};
  _.extend(file, Ti.Filesystem.File);
  file._exists = false;
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

Ti.include = function () {};
Ti.App.Properties.getString = function (name, def) { return def; };
Ti.App.Properties.getBool = function (name, def) { return def; };
Ti.App.Properties.getList = function (name, def) { return def; };

module.exports = Ti;
