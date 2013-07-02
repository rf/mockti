Ti = require('./mockti')();
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

  suite('window activity property', function () {
    var a = Ti.UI.createWindow();

    test('exists, is of right type', function () {
      assert(a.activity);
      assert(typeof a.activity.startActivity === "function");
    });

    test('methods work', function () {
      var b = false;

      a.activity.addEventListener('function::startActivity', function () {
        b = true;
      });

      a.activity.startActivity({intent: 'im an intent object'});

      assert(b, 'event listener called');
    });
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

suite('type assertions', function () {
  suite('view#animate', function () {
    test('proper args, object', function () {
      var v = Ti.UI.createView();
      v.animate({opacity: 1, duration: 500}, function () {});
    });

    test('proper args, animation', function () {
      var v = Ti.UI.createView();
      var a = Ti.UI.createAnimation({opacity: 1, duration: 500});
      v.animate(a, function () {});
    });

    test('improper cb', function () {
      var v = Ti.UI.createView();
      try {
        v.animate({opacity: 1, duration: 500}, 5);
      } catch (e) {
        // really
        assert(e.name === 'AssertionError');
        assert(e.message === 'Titanium.UI.View#animate expected argument 1 to be of type function, got type number');
      }
    });

    test('requiredness', function () {
      var v = Ti.UI.createView();
      try {
        v.animate();
        throw '';
      } catch (e){
        assert(e.name === 'AssertionError');
        assert(e.message === 'Titanium.UI.View#animate expected argument 0 to be of type object or Titanium.UI.Animation, got type undefined');
      }
    });
  });

  suite('tab#open', function () {
    test('proper args', function () {
      var t = Ti.UI.createTabGroup();
      var w = Ti.UI.createWindow();
      t.open(w);
    });
  });
});

suite('add/remove', function () {
  test('test', function () {
    var v = Ti.UI.createView();
    var a = Ti.UI.createView();
    var b = Ti.UI.createView();

    v.add(a);
    a.add(b);
    
    assert(v.children[0] === a);
    assert(v.children.length === 1);

    assert(a.children[0] === b);
    assert(a.children.length === 1);

    v.remove(b);
    assert(v.children[0] === a);
    assert(v.children.length === 1);

    v.remove(a);
    assert(v.children[0] !== a);
    assert(v.children.length === 0);
  });
});
