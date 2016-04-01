
import SecureStorage from './secure-local-storage.js';

var storage = new SecureStorage('Ali_Movahedi', 'AES');
storage.set({username: 'amovah', role: 'user' });

global.storage = storage
