import crypto from 'crypto-js'
(() => {

  let intern = {
    method: null,
    password: null,
    hasMade: false
  }

  function encrypt(string) {
    return crypto[intern.method]
      .encrypt(string, intern.password)
      .toString()
  }

  function decrypt(string) {
    return crypto[intern.method]
      .decrypt(string, intern.password)
      .toString(crypto.enc.Utf8)
  }

  class SecureStorage{

    constructor(password, method) {
      intern.method = method
      intern.password = password
      if(intern.hasMade) intern.method = false
      intern.hasMade = true
    }

    set(key, value) {
      if (typeof key === 'object') {
        for (let i in key) {
          localStorage[i] = encrypt(JSON.stringify(key[i]))
        }
        return this
      } else {
        localStorage[key] = encrypt(JSON.stringify(value))
        return this
      }
    }


    get(key) {
      if (localStorage[key]) {
        return JSON.parse(decrypt(localStorage[key]))
      }
    }


    remove(key) {
      if (localStorage[key]) {
        localStorage.removeItem(key)
      }
    }


    reset(){
      if (typeof localStorage === 'object') {
        let keys = Object.keys(localStorage)
        for (let i in keys) {
          localStorage.removeItem(keys[i]);
        }
      }
    }


    password(password) {
      intern.password = password
      return this
    }


    method(method) {
      intern.method = method
      return this
    }

  }

  module.exports = SecureStorage

})()
