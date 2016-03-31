# Secure Local Storage
Javascript Library to make secure local storage with encryption. Based on [secure-local-storage.js](https://github.com/BosNaufal/secure-string-js).

[DEMO](https://rawgit.com/BosNaufal/secure-local-storage/master/index.html)


Local storage is the easiest way ( I Think ) to make a "session like" in the Single Page Application (SPA), but there is another choice, using cookies. As a junior, I prefer using local storage than cookies. And sometime, I need to store important data in the Local Storage but it will make the data unsafe since it's easy to inject and change via developer tools.

So, I decided to make Secure Local Storage to encrypt Local Storage data and concat it. Hopefully, it will make Local Storage become safer and hard to inject. Your local storage will looks like this.


<img src="./secure-local-storage.png" alt="Secure Local Storage | By Bos Naufal"/>


## Install
Include the [secure-local-storage.js](./build/secure-local-storage.min.js) to your HTML Then it's ready to run.

## Example
```javascript

// Create a secure storage
var storage = new SecureStorage('password', 'encryption-method');

// You can change your password later
storage.password('BaR');
// also encryption method
storage.method('DES');

// You can also in this way
storage.password('BaR').method('DES');

// Set some value
storage.set('username','BosNaufal');
// and you can set an object or array
storage.set('user', { name: 'Ali', age: 17 });
// or this way
storage.set({ username: 'BosNaufal' });

// You can set values continual
storage.set('username', 'BosNaufal').set('user', { name: 'Ali', age: 17 });

// Get your local storage value
storage.get('username'); // Return BosNaufal
storage.get('user'); // Return { name: 'Ali', age: 17 }

/**
If you have a wrong password you will get an empty string
**/

// Set Wrong Password
secureStorage.password('wrongPass');

// Get your local storage value with wrong password
secureStorage.get('username'); // Return ""




// set to your correct password
secureStorage.password('BaR');

// get it again
secureStorage.get('username'); // Return BosNaufal
```

## Usage

```javascript
new SecureStorage(password, method)
```

## API

#### password(pass)
Set a new Password. You only need to set it once. Don't worry, the Secure Local Storage will keep your password and will not share it.

#### set( data )
To set a new value or just update the current Secure Local Storage data.

```javascript
// Set some index and value
secureStorage.set('username','BosNaufal');
// or you can use this way
secureStorage.set({
  id: '4',
  username: 'BosNaufal',
  role: 'user',
})
```

#### get( index )
Get the Secure Local Storage Data if you're already to set the password.
```javascript
// Get Username
secureStorage.get('id'); // return '4'
secureStorage.get('username'); // return 'BosNaufal'
secureStorage.get('role'); // return 'user'
```

#### method( name )
Set a new encryption method.
Available methods:
* AES
* DES
* TripleDES
* RC4
* RC4Drop
* Rabbit
* RabbitLegacy

```javascript
// Set method
secureStorage.method('AES');
```

## Hopefully it can be useful~

## Contributing

Feel free to fork, and make any change.

For build your to code, first install devDependencies then build with gulp:

```shell
npm i
gulp # Remember, gulp is installed before
```

For install gulp:

```
[sudo] npm i -g gulp-cli
```

## Let's talk about some projects
Just Contact Me At:
- Email: [bosnaufalemail@gmail.com](mailto:bosnaufalemail@gmail.com)
- Skype Id: bosnaufal254
- twitter: [@BosNaufal](https://twitter.com/BosNaufal)

## License
[MIT](http://opensource.org/licenses/MIT)
Copyright (c) 2016 - forever Naufal Rabbani
