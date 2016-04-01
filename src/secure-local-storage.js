import crypto from 'crypto-js'

(() => {

  let intern = {
    prefix: `@S@S@`,
    method: null,
    password: null
  }

  class SecureStorage{

    constructor(password, method) {
      intern.method = method
      intern.password = password
    }


    encrypt(string) {
      return crypto[intern.method]
        .encrypt(string, intern.password)
        .toString()
    }


    decrypt(string) {
      return crypto[intern.method]
        .decrypt(string, intern.password)
        .toString(crypto.enc.Utf8)
    }


    set(key, value) {
      if (typeof key === 'object') {
        for (let i in key) {
          localStorage[intern.prefix + i] = this.encrypt(JSON.stringify(key[i]))
        }
        return this
      } else {
        localStorage[intern.prefix + key] = this.encrypt(JSON.stringify(value))
        return this
      }
    }


    get(key) {
      let regex = new RegExp('^' + intern.prefix)
      if (localStorage[intern.prefix + key]) {
        return JSON.parse(this.decrypt(localStorage[intern.prefix + key]))
      }
    }


    remove(key) {
      let regex = new RegExp('^' + intern.prefix)
      if (localStorage[intern.prefix + key]) {
        localStorage.removeItem(intern.prefix + key)
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
