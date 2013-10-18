# mockti

[![build status](https://secure.travis-ci.org/rf/mockti.png)](http://travis-ci.org/rf/mockti)

**mockti** is a mocking framework for Titanium.  It loads up a `jsca` description
of the Titanium API and creates a `Titanium` object with all of the proper
objects and methods for testing code.  Every proxy is an emitter (as in Ti
itself).  Methods also emit an event `function::name` when invoked.

This is a continuation of my exploration of testing in Titanium.
It's a [Zombie.js](http://zombie.labnotes.org/) style
approach to the problem; rather than running inside of the emulators and 
simulating events, we instead just simulate the environment in pure 
javascript. This may prove useful for testing certain types of user interfaces 
and code.  I've found it helpful for mocking requests for testing my 
network code.

Alternatively, one could use some test runner with 
[this](https://github.com/russfrank/spade). This is the PhantomJS style approach.

## How to use it

Install it like this

```shell
$ npm i mockti
```

Then, use it like this

```javascript
var mockti = require('mockti');

// make it global 
Ti = mockti();

var xhr = Titanium.Network.createHTTPClient();
var view = Ti.UI.createView();
```

The `mockti()` function takes as an argument the path to an `api.jsca` file.
These are included with every sdk build. If you don't pass a path, it'll use
the bundled `api.jsca`, which currently is from 3.1.0 GA.

You'll probably want to require() some of the code in your `Resources` folder.
Currently I have my project setup with a `test` folder which has a couple tests;
these require code out of Resources after requiring `mockti`.  Then, I attempt
requests, make assertions, etc.

You can also make http requests, which will go through the npm `request` module.
Check out [nock](http://github.com/flatiron/nock) if you'd like to mock these
requests.

## Type Assertions

Simple types are asserted. For example, functions that accept a number or string
will have their argument's type asserted.

## License

MIT.
