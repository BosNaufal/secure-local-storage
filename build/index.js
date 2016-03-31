/*! Copyright (c) 2016 Naufal Rabbani (https://github.com/BosNaufal)
* Licensed Under MIT (http://opensource.org/licenses/MIT)
*
* Secure Local Storage - Version 1.3.0
*
*/
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _cryptoJs = require('crypto-js');

var _cryptoJs2 = _interopRequireDefault(_cryptoJs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
  function _class(password, method) {
    _classCallCheck(this, _class);

    this.prefix = '@S@S@' + method + '@' + password + '@';
    this._method = method;
    this._password = password;
  }

  _createClass(_class, [{
    key: 'encrypt',
    value: function encrypt(string) {
      return _cryptoJs2.default[this._method].encrypt(string, this._password).toString();
    }
  }, {
    key: 'decrypt',
    value: function decrypt(string) {
      return _cryptoJs2.default[this._method].decrypt(string, this._password).toString(_cryptoJs2.default.enc.Utf8);
    }
  }, {
    key: 'set',
    value: function set(key, value) {
      if ((typeof key === 'undefined' ? 'undefined' : _typeof(key)) === 'object') {
        for (var i in key) {
          localStorage[this.prefix + i] = this.encrypt(JSON.stringify(key[i]));
        }

        return this;
      } else {
        localStorage[this.prefix + key] = this.encrypt(JSON.stringify(value));

        return this;
      }
    }
  }, {
    key: 'get',
    value: function get(key) {
      var regex = new RegExp('^' + this.prefix);
      if (localStorage[this.prefix + key]) {
        return JSON.parse(this.decrypt(localStorage[this.prefix + key]));
      }
    }
  }, {
    key: 'password',
    value: function password(_password) {
      this._password = _password;

      return this;
    }
  }, {
    key: 'method',
    value: function method(_method) {
      this._method = _method;

      return this;
    }
  }]);

  return _class;
}();

exports.default = _class;
module.exports = exports['default'];