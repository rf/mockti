require('./mockti');
var assert = require('assert');
var nock = require("nock");


suite('ui', function () {
  test('stupid emitter test', function () {
    var a = Ti.UI.createView();
    var b = Ti.UI.createView();
    var c = "foo";

    a.addEventListener('click', function () { c = "bar"; });
    b.addEventListener('click', function () { c = "baz"; });

    a.fireEvent('click');
    assert(c == "bar");

    b.fireEvent('click');
    assert(c == "baz");
  });
});

suite('xhr', function () {
  test('retrieves stuff', function (done) {
    var scope = nock('http://google.com')
      .get('/')
      .reply(200, 'hi its google welcome to google');

    var xhr = Ti.Network.createHTTPClient({
      onload: function (event) {
        try {
          assert(event.source === xhr, "event.source is the xhr");
          assert(this === xhr, "`this` bound to the xhr");
          assert(this.status === 200, "correct status code");
          assert(this.readyState === 4, "correct ready state");
          assert(this.responseText === 'hi its google welcome to google');
          scope.done();
          done();
        } catch (e) { done(e); }
      },

      onerror: function () {
        done(new Error('onerror should not have been called'));
      }
    });

    xhr.open("GET", "http://google.com");
    xhr.send();
  });

  test('handles 404', function (done) {
    var scope = nock('http://google.com')
      .get('/')
      .reply(404, 'hi its google welcome to google');

    var xhr = Ti.Network.createHTTPClient({
      onload: function (event) {
        console.dir(event);
        done(new Error('onload should not have been called'));
      },

      onerror: function (event) {
        try {
          assert(event.source === xhr, "event.source is the xhr");
          assert(this === xhr, "`this` bound to the xhr");
          assert(this.status === 404, "correct status code");
          assert(this.readyState === 4, "correct ready state");
          scope.done();
          done();
        } catch (e) { done(e); }
      }
    });

    xhr.open("GET", "http://google.com");
    xhr.send();
  });
});
