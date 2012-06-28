# tock

**tock** is a mocking framework for Titanium.  It loads up a `jsca` description
of the Titanium API and creates a `Titanium` object with all of the proper
objects and methods for testing code.  Every proxy is an emitter (as in Ti
itself).  Methods also emit an event `function::name` when invoked.

This is a continuation of my exploration of the testing of programs written for the
Titanium framework.  It's a [Zombie.js](http://zombie.labnotes.org/) style
approach to the problem; rather than running inside of the emulators and 
simulating events, we instead just simulate the environment.  This may prove
useful for testing certain types of user interfaces and code.  I've found it
helpful for mocking requests for testing my network code.

## How to use it

Install it like this

```shell
$ npm i tock
```

Then, use it like this

```javascript
require('tock');

var xhr = Titanium.Network.createHTTPClient();
var view = Ti.UI.createView();
```

You'll probably want to require() some of the code in your `Resources` folder.
Currently I have my project setup with a `test` folder which has a couple tests;
these require code out of Resources after requiring `tock`.  Then, I attempt
requests, make assertions, etc.

## Future ideas

1. The `jsca` file has type information.  Add setters which assert types.
2. Assert types of arguments.

## License

MIT.
