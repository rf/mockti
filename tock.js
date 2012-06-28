var fs = require('fs');
var data = JSON.parse(fs.readFileSync('./api.jsca'));
var Emitter = require('events').EventEmitter;

// Modify Emitter's prototype to conform with what Ti does
Emitter.prototype.addEventListener = Emitter.prototype.on;
Emitter.prototype.removeEventListener = Emitter.prototype.off;
Emitter.prototype.fireEvent = Emitter.prototype.emit;

Titanium = Ti = {};

function retrieve (list) {
  var name = list.shift();
  var current = Ti[name] = Ti[name] || Object.create(Emitter);
  if (list.length > 0) return retrieve(list);
  else return current;
}

function method (namespace, obj, name) {
  // dont want to overwrite these
  if (['addEventListener', 'removeEventListener', 'fireEvent'].indexOf(name) != -1) return;

  // factory
  if (name.indexOf('create') != -1) {
    obj[name] = function (props) {
      var proto = retrieve(namespace.concat([name.slice(6)]));
      var ret = Object.create(proto);
      _.extend(ret, props);
      return ret;
    };

    return;
  }

  if (name == 'add') {
    obj.add = function (view) {
      this.children = this.children || [];
      this.children.push(view);
    };
  }

  // otherwise it's some method so just make it a noop
  obj[name] = function () {};
}

data.types.forEach(function (item) {
  // Don't worry about stuff that isn't actually in the Titanium namespace for
  // now
  if (item.name.indexOf('Titanium.') == -1) return;

  var name = item.name.slice(9);
  var namespace = name.split('.').slice(1);
  var obj = retrieve(name.split('.'));
  
  item.functions.forEach(function (fn) {
    method(namespace, obj, fn.name);
  });
});

console.dir(Ti);
