/*! Copyright (c) 2016 Naufal Rabbani (https://github.com/BosNaufal)
* Licensed Under MIT (http://opensource.org/licenses/MIT)
*
* Secure Local Storage - Version 1.0.0
*
*/

(function(root){

  var root = this;

  var alphabet = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9'];


  /**
    ENCRYPT and DECRYPT some value
    @param {String} action
    @param {String} unsafeString
    @param {String} password

    @return {String}
  */
  var secure = function(action,unsafeString,password){


    // Password to array
    var objPassword = password.split('');

    // split the unsafeString to array
    var obj = unsafeString.split('');


    /**
      calculations of the password
      Make every single char of password become a number
      depend on its order on alphabet array

      then put it on number variable
    */
    var number = 0;
    for (var i = 0; i < objPassword.length; i++) {
      for (var j = 0; j < alphabet.length; j++) {
        if( objPassword[i] == alphabet[j] ) number += j;
      }
    }


    /**
      ENCRYPT function
      will convert every single char of unsafeString become a number
      depend on its order on alphabet array

      then increase them with the num (calculations of the password char)
      the total of it will decrease by alphabet.length if they are more than alphabet.length
      after meet the perfect number ( not more than alphabet.length ) find a alphabet depend on that

      then push it to secure string

      return encoded URI Component of secure string
    */
    // ENCRYPT IT!
    if(action == 'encrypt'){
      var encryptIt = function(alpha){
        for (var j = 0; j < alphabet.length; j++) {
          if( alpha == alphabet[j] ){
            var outOfRange = function(num){
              if(num > alphabet.length){
                num -= alphabet.length;
                return outOfRange(num);
              } else{
                return num;
              }
            };
            return alphabet[outOfRange(j+number)]; // encrypting depend on password calculations
          }
        }
        return alpha;
      }

      var secure = [];
      for (var i = 0; i < obj.length; i++) {
        var encrypt = encryptIt(obj[i]);
        secure.push(encrypt);
      }


      // encrypted string
      return secure.join('');
    }



    /**
      DECRYPT function

      encode URI Component the unsafeString params then...

      will convert every single char of unsafeString become a number
      depend on its order on alphabet array

      then decrease them with the num (calculations of the password char)
      the total of it will increase by alphabet.length if they are less than alphabet.length
      after meet the perfect number ( not less than alphabet.length ) find a alphabet depend on that

      then push it to original string

      return original string
    */
    // DECRYPT IT!
    if(action == 'decrypt'){
      var decryptIt = function(alpha){
        for (var j = 0; j < alphabet.length; j++) {
          if( alpha == alphabet[j] ){
            var minusOne = function(num){
              if(num < 0){
                num += alphabet.length;
                return minusOne(num);
              } else{
                return num;
              }
            };
            return alphabet[minusOne(j-number)];
          }
        }
        return alpha;
      }


      var original = [];
      for (var i = 0; i < obj.length; i++) {
        var decrypt = decryptIt(obj[i]);
        original.push(decrypt);
      }

      // decrypted string
      return original.join('');
    }

  };


  // Secure Local Storage Configuration
  var config = function secureStorageConfig(){
    root.__SECURE_LOCAL_STORAGE_PASS__ = "";

    // Get number indicator from localStorage
    var nums = window.localStorage.getItem('secureLocalStorageNums');

    // If it isn't length
    if(nums === null){
      // Make internal password indicator become Random
      this.num1 = Math.floor(Math.random() * 5);
      this.num2 = Math.floor(Math.random() * 7);
    } else {
      // get it!
      this.num1 = parseFloat(nums.substr(0,1));
      this.num2 = parseFloat(nums.substr(1,1));
    }

  };



  /**
    Setting the global password of secure local Storage
    @param {String} pass
  */
  config.prototype.setPassword = function (pass) {

    // Make an encrypted password
    var pass = secure('encrypt',pass,alphabet[this.num2]+'secureStorageInternalPassword'+alphabet[this.num1]);
    root.__SECURE_LOCAL_STORAGE_PASS__ = pass;

    // set the random nums to secureStorage
    window.localStorage.setItem('secureLocalStorageNums',this.num1.toString()+this.num1.toString());
  };


  // Initialize
  var storage = function secureStorage(){
    var me = this;

    // Make a new config()
    this.config = new config();

    this.all = {};

    // if localStorage is not empty
    if(window.localStorage.getItem('secureLocalStorage') !== null){
      // get it
      this.all = JSON.parse(decodeURIComponent(window.localStorage.getItem('secureLocalStorage')));
    }

    return this;
  };


  /**
    Shortcut to setting the password
    @param {String} pass
  */
  storage.prototype.setPassword = function (pass) {
    this.config.setPassword(pass);
  };



  /**
    Get the Original Password

    @return {Object}
  */
  function getPassword(){
    var originalPass = secure('decrypt', root.__SECURE_LOCAL_STORAGE_PASS__, alphabet[this.num2]+'secureStorageInternalPassword'+alphabet[this.num1]);
    return originalPass;
  }


  /**
    ENCRYPT / DECRYPT Secure Object
    *- Limitation -*
    Only Non Nested Object

    @param {Object} obj

    @return {Object}
  */
  function secureObject(obj,decrypt){
    var keys = Object.keys(obj);
    var me = this;

    var action = decrypt ? 'decrypt' : 'encrypt';

    var pass = getPassword.call(me.config);

    var secureObject = {};
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      secureObject[secure(action,key,pass)] = secure(action,obj[key],pass);
    }

    return secureObject;
  };



  /**
    Set the item of localStorage
    @param {Mixed} index
    @param {String} val

    @return {storage}
  */
  storage.prototype.set = function(index,val){
    var me = this;

    if(root.__SECURE_LOCAL_STORAGE_PASS__ === ""){
      console.warn('[Secure Local Storage]: You need to set the password');
      return false;
    }

    var secure = {};

    if(typeof index === 'string'){
      var obj = {};

      obj[index] = val;

      secure = secureObject.call(me.secureStorage,obj);
    }

    if(typeof index === 'object'){
      secure = secureObject.call(me.secureStorage,index);
    }


    // Put it on localStorage
    var keys  = Object.keys(secure);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      me.all[key] = secure[key];
    }

    return window.localStorage.setItem('secureLocalStorage',encodeURIComponent(JSON.stringify(me.all)));

  };


  /**
    Get the item from localStorage
    @param {String} index

    @return {String}
  */
  storage.prototype.get = function(index){
    var me = this;

    if(window.localStorage.getItem('secureLocalStorage') === null){
      console.warn('[Secure Local Storage]: Your storage Is Empty!');
      return false;
    }

    if(root.__SECURE_LOCAL_STORAGE_PASS__ === ""){
      console.warn('[Secure Local Storage]: You need to set the password');
      return false;
    }

    var storageObj = JSON.parse(decodeURIComponent(window.localStorage.getItem('secureLocalStorage')));

    var originalObj =  secureObject.call(me.secureStorage,storageObj, true);

    return originalObj[index];
  };


  /**
    Remove the item from localStorage
    @param {String} index

    @return {storage}
  */
  storage.prototype.remove = function(index){
    var me  = this;

    if(window.localStorage.getItem('secureLocalStorage') === null){
      console.warn('[Secure Local Storage]: Your storage Is Empty!');
      return false;
    }

    if(root.__SECURE_LOCAL_STORAGE_PASS__ === ""){
      console.warn('[Secure Local Storage]: You need to set the password');
      return false;
    }

    function getPassword(){
      var originalPass = secure('decrypt', root.__SECURE_LOCAL_STORAGE_PASS__, alphabet[me.config.num2]+'secureStorageInternalPassword'+alphabet[me.config.num1]);
      return originalPass;
    }

    var encryptedIndex = secure('encrypt',index,getPassword());

    delete me.all[encryptedIndex];

    // Put it on localStorage
    return window.localStorage.setItem('secureLocalStorage',encodeURIComponent(JSON.stringify(me.all)));
  };


  /**
    Reset the localStorage
  */
  storage.prototype.reset = function(){
    this.all = {};
    window.localStorage.removeItem('secureLocalStorageNums');
    return window.localStorage.removeItem('secureLocalStorage');
  };

  // Make a new secureStorage()
  var secureStorage = new storage();





  // If support node / ES6 module
  if( typeof module === 'object' && module.exports ){
    module.exports = secureStorage;
  }
  // if using require (AMD) js
  else if (typeof define === 'function' && define.amd) {
    define(function (){ return secureStorage; });
  }
  // if script loaded by script tag in HTML file
  else if (typeof window !== undefined) {
    window.secureStorage = secureStorage;
  }

})(this);
