import crypto from 'crypto-js';

export default class {
  constructor(password, method) {
    this.prefix = `@S@S@`;
    this._method = method;
    this._password = password;
  }

  encrypt(string) {
    return crypto[this._method]
      .encrypt(string, this._password)
      .toString();
  }

  decrypt(string) {
    return crypto[this._method]
      .decrypt(string, this._password)
      .toString(crypto.enc.Utf8);
  }

  set(key, value) {
    if (typeof key === 'object') {
      for (let i in key) {
        localStorage[this.prefix + i] = this.encrypt(JSON.stringify(key[i]));
      }

      return this;
    } else {
      localStorage[this.prefix + key] = this.encrypt(JSON.stringify(value));

      return this;
    }
  }

  get(key) {
    let regex = new RegExp('^' + this.prefix);
    if (localStorage[this.prefix + key]) {
      return JSON.parse(this.decrypt(localStorage[this.prefix + key]));
    }
  }

  password(password) {
    this._password = password;

    return this;
  }

  method(method) {
    this._method = method;

    return this;
  }
}
