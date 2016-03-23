(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/usr/lib/node_modules/browserify/node_modules/process/browser.js":[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],"/usr/lib/node_modules/vue-hot-reload-api/index.js":[function(require,module,exports){
var Vue // late bind
var map = Object.create(null)
var shimmed = false
var isBrowserify = false

/**
 * Determine compatibility and apply patch.
 *
 * @param {Function} vue
 * @param {Boolean} browserify
 */

exports.install = function (vue, browserify) {
  if (shimmed) return
  shimmed = true

  Vue = vue
  isBrowserify = browserify

  exports.compatible = !!Vue.internalDirectives
  if (!exports.compatible) {
    console.warn(
      '[HMR] vue-loader hot reload is only compatible with ' +
      'Vue.js 1.0.0+.'
    )
    return
  }

  // patch view directive
  patchView(Vue.internalDirectives.component)
  console.log('[HMR] Vue component hot reload shim applied.')
  // shim router-view if present
  var routerView = Vue.elementDirective('router-view')
  if (routerView) {
    patchView(routerView)
    console.log('[HMR] vue-router <router-view> hot reload shim applied.')
  }
}

/**
 * Shim the view directive (component or router-view).
 *
 * @param {Object} View
 */

function patchView (View) {
  var unbuild = View.unbuild
  View.unbuild = function (defer) {
    if (!this.hotUpdating) {
      var prevComponent = this.childVM && this.childVM.constructor
      removeView(prevComponent, this)
      // defer = true means we are transitioning to a new
      // Component. Register this new component to the list.
      if (defer) {
        addView(this.Component, this)
      }
    }
    // call original
    return unbuild.call(this, defer)
  }
}

/**
 * Add a component view to a Component's hot list
 *
 * @param {Function} Component
 * @param {Directive} view - view directive instance
 */

function addView (Component, view) {
  var id = Component && Component.options.hotID
  if (id) {
    if (!map[id]) {
      map[id] = {
        Component: Component,
        views: [],
        instances: []
      }
    }
    map[id].views.push(view)
  }
}

/**
 * Remove a component view from a Component's hot list
 *
 * @param {Function} Component
 * @param {Directive} view - view directive instance
 */

function removeView (Component, view) {
  var id = Component && Component.options.hotID
  if (id) {
    map[id].views.$remove(view)
  }
}

/**
 * Create a record for a hot module, which keeps track of its construcotr,
 * instnaces and views (component directives or router-views).
 *
 * @param {String} id
 * @param {Object} options
 */

exports.createRecord = function (id, options) {
  if (typeof options === 'function') {
    options = options.options
  }
  if (typeof options.el !== 'string' && typeof options.data !== 'object') {
    makeOptionsHot(id, options)
    map[id] = {
      Component: null,
      views: [],
      instances: []
    }
  }
}

/**
 * Make a Component options object hot.
 *
 * @param {String} id
 * @param {Object} options
 */

function makeOptionsHot (id, options) {
  options.hotID = id
  injectHook(options, 'created', function () {
    var record = map[id]
    if (!record.Component) {
      record.Component = this.constructor
    }
    record.instances.push(this)
  })
  injectHook(options, 'beforeDestroy', function () {
    map[id].instances.$remove(this)
  })
}

/**
 * Inject a hook to a hot reloadable component so that
 * we can keep track of it.
 *
 * @param {Object} options
 * @param {String} name
 * @param {Function} hook
 */

function injectHook (options, name, hook) {
  var existing = options[name]
  options[name] = existing
    ? Array.isArray(existing)
      ? existing.concat(hook)
      : [existing, hook]
    : [hook]
}

/**
 * Update a hot component.
 *
 * @param {String} id
 * @param {Object|null} newOptions
 * @param {String|null} newTemplate
 */

exports.update = function (id, newOptions, newTemplate) {
  var record = map[id]
  // force full-reload if an instance of the component is active but is not
  // managed by a view
  if (!record || (record.instances.length && !record.views.length)) {
    console.log('[HMR] Root or manually-mounted instance modified. Full reload may be required.')
    if (!isBrowserify) {
      window.location.reload()
    } else {
      // browserify-hmr somehow sends incomplete bundle if we reload here
      return
    }
  }
  if (!isBrowserify) {
    // browserify-hmr already logs this
    console.log('[HMR] Updating component: ' + format(id))
  }
  var Component = record.Component
  // update constructor
  if (newOptions) {
    // in case the user exports a constructor
    Component = record.Component = typeof newOptions === 'function'
      ? newOptions
      : Vue.extend(newOptions)
    makeOptionsHot(id, Component.options)
  }
  if (newTemplate) {
    Component.options.template = newTemplate
  }
  // handle recursive lookup
  if (Component.options.name) {
    Component.options.components[Component.options.name] = Component
  }
  // reset constructor cached linker
  Component.linker = null
  // reload all views
  record.views.forEach(function (view) {
    updateView(view, Component)
  })
  // flush devtools
  if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
    window.__VUE_DEVTOOLS_GLOBAL_HOOK__.emit('flush')
  }
}

/**
 * Update a component view instance
 *
 * @param {Directive} view
 * @param {Function} Component
 */

function updateView (view, Component) {
  if (!view._bound) {
    return
  }
  view.Component = Component
  view.hotUpdating = true
  // disable transitions
  view.vm._isCompiled = false
  // save state
  var state = extractState(view.childVM)
  // remount, make sure to disable keep-alive
  var keepAlive = view.keepAlive
  view.keepAlive = false
  view.mountComponent()
  view.keepAlive = keepAlive
  // restore state
  restoreState(view.childVM, state, true)
  // re-eanble transitions
  view.vm._isCompiled = true
  view.hotUpdating = false
}

/**
 * Extract state from a Vue instance.
 *
 * @param {Vue} vm
 * @return {Object}
 */

function extractState (vm) {
  return {
    cid: vm.constructor.cid,
    data: vm.$data,
    children: vm.$children.map(extractState)
  }
}

/**
 * Restore state to a reloaded Vue instance.
 *
 * @param {Vue} vm
 * @param {Object} state
 */

function restoreState (vm, state, isRoot) {
  var oldAsyncConfig
  if (isRoot) {
    // set Vue into sync mode during state rehydration
    oldAsyncConfig = Vue.config.async
    Vue.config.async = false
  }
  // actual restore
  if (isRoot || !vm._props) {
    vm.$data = state.data
  } else {
    Object.keys(state.data).forEach(function (key) {
      if (!vm._props[key]) {
        // for non-root, only restore non-props fields
        vm.$data[key] = state.data[key]
      }
    })
  }
  // verify child consistency
  var hasSameChildren = vm.$children.every(function (c, i) {
    return state.children[i] && state.children[i].cid === c.constructor.cid
  })
  if (hasSameChildren) {
    // rehydrate children
    vm.$children.forEach(function (c, i) {
      restoreState(c, state.children[i])
    })
  }
  if (isRoot) {
    Vue.config.async = oldAsyncConfig
  }
}

function format (id) {
  return id.match(/[^\/]+\.vue$/)[0]
}

},{}],"/usr/lib/node_modules/vue/dist/vue.common.js":[function(require,module,exports){
(function (process,global){
/*!
 * Vue.js v1.0.18
 * (c) 2016 Evan You
 * Released under the MIT License.
 */
'use strict';

function set(obj, key, val) {
  if (hasOwn(obj, key)) {
    obj[key] = val;
    return;
  }
  if (obj._isVue) {
    set(obj._data, key, val);
    return;
  }
  var ob = obj.__ob__;
  if (!ob) {
    obj[key] = val;
    return;
  }
  ob.convert(key, val);
  ob.dep.notify();
  if (ob.vms) {
    var i = ob.vms.length;
    while (i--) {
      var vm = ob.vms[i];
      vm._proxy(key);
      vm._digest();
    }
  }
  return val;
}

/**
 * Delete a property and trigger change if necessary.
 *
 * @param {Object} obj
 * @param {String} key
 */

function del(obj, key) {
  if (!hasOwn(obj, key)) {
    return;
  }
  delete obj[key];
  var ob = obj.__ob__;
  if (!ob) {
    return;
  }
  ob.dep.notify();
  if (ob.vms) {
    var i = ob.vms.length;
    while (i--) {
      var vm = ob.vms[i];
      vm._unproxy(key);
      vm._digest();
    }
  }
}

var hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * Check whether the object has the property.
 *
 * @param {Object} obj
 * @param {String} key
 * @return {Boolean}
 */

function hasOwn(obj, key) {
  return hasOwnProperty.call(obj, key);
}

/**
 * Check if an expression is a literal value.
 *
 * @param {String} exp
 * @return {Boolean}
 */

var literalValueRE = /^\s?(true|false|-?[\d\.]+|'[^']*'|"[^"]*")\s?$/;

function isLiteral(exp) {
  return literalValueRE.test(exp);
}

/**
 * Check if a string starts with $ or _
 *
 * @param {String} str
 * @return {Boolean}
 */

function isReserved(str) {
  var c = (str + '').charCodeAt(0);
  return c === 0x24 || c === 0x5F;
}

/**
 * Guard text output, make sure undefined outputs
 * empty string
 *
 * @param {*} value
 * @return {String}
 */

function _toString(value) {
  return value == null ? '' : value.toString();
}

/**
 * Check and convert possible numeric strings to numbers
 * before setting back to data
 *
 * @param {*} value
 * @return {*|Number}
 */

function toNumber(value) {
  if (typeof value !== 'string') {
    return value;
  } else {
    var parsed = Number(value);
    return isNaN(parsed) ? value : parsed;
  }
}

/**
 * Convert string boolean literals into real booleans.
 *
 * @param {*} value
 * @return {*|Boolean}
 */

function toBoolean(value) {
  return value === 'true' ? true : value === 'false' ? false : value;
}

/**
 * Strip quotes from a string
 *
 * @param {String} str
 * @return {String | false}
 */

function stripQuotes(str) {
  var a = str.charCodeAt(0);
  var b = str.charCodeAt(str.length - 1);
  return a === b && (a === 0x22 || a === 0x27) ? str.slice(1, -1) : str;
}

/**
 * Camelize a hyphen-delmited string.
 *
 * @param {String} str
 * @return {String}
 */

var camelizeRE = /-(\w)/g;

function camelize(str) {
  return str.replace(camelizeRE, toUpper);
}

function toUpper(_, c) {
  return c ? c.toUpperCase() : '';
}

/**
 * Hyphenate a camelCase string.
 *
 * @param {String} str
 * @return {String}
 */

var hyphenateRE = /([a-z\d])([A-Z])/g;

function hyphenate(str) {
  return str.replace(hyphenateRE, '$1-$2').toLowerCase();
}

/**
 * Converts hyphen/underscore/slash delimitered names into
 * camelized classNames.
 *
 * e.g. my-component => MyComponent
 *      some_else    => SomeElse
 *      some/comp    => SomeComp
 *
 * @param {String} str
 * @return {String}
 */

var classifyRE = /(?:^|[-_\/])(\w)/g;

function classify(str) {
  return str.replace(classifyRE, toUpper);
}

/**
 * Simple bind, faster than native
 *
 * @param {Function} fn
 * @param {Object} ctx
 * @return {Function}
 */

function bind(fn, ctx) {
  return function (a) {
    var l = arguments.length;
    return l ? l > 1 ? fn.apply(ctx, arguments) : fn.call(ctx, a) : fn.call(ctx);
  };
}

/**
 * Convert an Array-like object to a real Array.
 *
 * @param {Array-like} list
 * @param {Number} [start] - start index
 * @return {Array}
 */

function toArray(list, start) {
  start = start || 0;
  var i = list.length - start;
  var ret = new Array(i);
  while (i--) {
    ret[i] = list[i + start];
  }
  return ret;
}

/**
 * Mix properties into target object.
 *
 * @param {Object} to
 * @param {Object} from
 */

function extend(to, from) {
  var keys = Object.keys(from);
  var i = keys.length;
  while (i--) {
    to[keys[i]] = from[keys[i]];
  }
  return to;
}

/**
 * Quick object check - this is primarily used to tell
 * Objects from primitive values when we know the value
 * is a JSON-compliant type.
 *
 * @param {*} obj
 * @return {Boolean}
 */

function isObject(obj) {
  return obj !== null && typeof obj === 'object';
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 *
 * @param {*} obj
 * @return {Boolean}
 */

var toString = Object.prototype.toString;
var OBJECT_STRING = '[object Object]';

function isPlainObject(obj) {
  return toString.call(obj) === OBJECT_STRING;
}

/**
 * Array type check.
 *
 * @param {*} obj
 * @return {Boolean}
 */

var isArray = Array.isArray;

/**
 * Define a property.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {*} val
 * @param {Boolean} [enumerable]
 */

function def(obj, key, val, enumerable) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true
  });
}

/**
 * Debounce a function so it only gets called after the
 * input stops arriving after the given wait period.
 *
 * @param {Function} func
 * @param {Number} wait
 * @return {Function} - the debounced function
 */

function _debounce(func, wait) {
  var timeout, args, context, timestamp, result;
  var later = function later() {
    var last = Date.now() - timestamp;
    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    }
  };
  return function () {
    context = this;
    args = arguments;
    timestamp = Date.now();
    if (!timeout) {
      timeout = setTimeout(later, wait);
    }
    return result;
  };
}

/**
 * Manual indexOf because it's slightly faster than
 * native.
 *
 * @param {Array} arr
 * @param {*} obj
 */

function indexOf(arr, obj) {
  var i = arr.length;
  while (i--) {
    if (arr[i] === obj) return i;
  }
  return -1;
}

/**
 * Make a cancellable version of an async callback.
 *
 * @param {Function} fn
 * @return {Function}
 */

function cancellable(fn) {
  var cb = function cb() {
    if (!cb.cancelled) {
      return fn.apply(this, arguments);
    }
  };
  cb.cancel = function () {
    cb.cancelled = true;
  };
  return cb;
}

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 *
 * @param {*} a
 * @param {*} b
 * @return {Boolean}
 */

function looseEqual(a, b) {
  /* eslint-disable eqeqeq */
  return a == b || (isObject(a) && isObject(b) ? JSON.stringify(a) === JSON.stringify(b) : false);
  /* eslint-enable eqeqeq */
}

var hasProto = ('__proto__' in {});

// Browser environment sniffing
var inBrowser = typeof window !== 'undefined' && Object.prototype.toString.call(window) !== '[object Object]';

// detect devtools
var devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__;

// UA sniffing for working around browser-specific quirks
var UA = inBrowser && window.navigator.userAgent.toLowerCase();
var isIE9 = UA && UA.indexOf('msie 9.0') > 0;
var isAndroid = UA && UA.indexOf('android') > 0;

var transitionProp = undefined;
var transitionEndEvent = undefined;
var animationProp = undefined;
var animationEndEvent = undefined;

// Transition property/event sniffing
if (inBrowser && !isIE9) {
  var isWebkitTrans = window.ontransitionend === undefined && window.onwebkittransitionend !== undefined;
  var isWebkitAnim = window.onanimationend === undefined && window.onwebkitanimationend !== undefined;
  transitionProp = isWebkitTrans ? 'WebkitTransition' : 'transition';
  transitionEndEvent = isWebkitTrans ? 'webkitTransitionEnd' : 'transitionend';
  animationProp = isWebkitAnim ? 'WebkitAnimation' : 'animation';
  animationEndEvent = isWebkitAnim ? 'webkitAnimationEnd' : 'animationend';
}

/**
 * Defer a task to execute it asynchronously. Ideally this
 * should be executed as a microtask, so we leverage
 * MutationObserver if it's available, and fallback to
 * setTimeout(0).
 *
 * @param {Function} cb
 * @param {Object} ctx
 */

var nextTick = (function () {
  var callbacks = [];
  var pending = false;
  var timerFunc;
  function nextTickHandler() {
    pending = false;
    var copies = callbacks.slice(0);
    callbacks = [];
    for (var i = 0; i < copies.length; i++) {
      copies[i]();
    }
  }

  /* istanbul ignore if */
  if (typeof MutationObserver !== 'undefined') {
    var counter = 1;
    var observer = new MutationObserver(nextTickHandler);
    var textNode = document.createTextNode(counter);
    observer.observe(textNode, {
      characterData: true
    });
    timerFunc = function () {
      counter = (counter + 1) % 2;
      textNode.data = counter;
    };
  } else {
    // webpack attempts to inject a shim for setImmediate
    // if it is used as a global, so we have to work around that to
    // avoid bundling unnecessary code.
    var context = inBrowser ? window : typeof global !== 'undefined' ? global : {};
    timerFunc = context.setImmediate || setTimeout;
  }
  return function (cb, ctx) {
    var func = ctx ? function () {
      cb.call(ctx);
    } : cb;
    callbacks.push(func);
    if (pending) return;
    pending = true;
    timerFunc(nextTickHandler, 0);
  };
})();

function Cache(limit) {
  this.size = 0;
  this.limit = limit;
  this.head = this.tail = undefined;
  this._keymap = Object.create(null);
}

var p = Cache.prototype;

/**
 * Put <value> into the cache associated with <key>.
 * Returns the entry which was removed to make room for
 * the new entry. Otherwise undefined is returned.
 * (i.e. if there was enough room already).
 *
 * @param {String} key
 * @param {*} value
 * @return {Entry|undefined}
 */

p.put = function (key, value) {
  var removed;
  if (this.size === this.limit) {
    removed = this.shift();
  }

  var entry = this.get(key, true);
  if (!entry) {
    entry = {
      key: key
    };
    this._keymap[key] = entry;
    if (this.tail) {
      this.tail.newer = entry;
      entry.older = this.tail;
    } else {
      this.head = entry;
    }
    this.tail = entry;
    this.size++;
  }
  entry.value = value;

  return removed;
};

/**
 * Purge the least recently used (oldest) entry from the
 * cache. Returns the removed entry or undefined if the
 * cache was empty.
 */

p.shift = function () {
  var entry = this.head;
  if (entry) {
    this.head = this.head.newer;
    this.head.older = undefined;
    entry.newer = entry.older = undefined;
    this._keymap[entry.key] = undefined;
    this.size--;
  }
  return entry;
};

/**
 * Get and register recent use of <key>. Returns the value
 * associated with <key> or undefined if not in cache.
 *
 * @param {String} key
 * @param {Boolean} returnEntry
 * @return {Entry|*}
 */

p.get = function (key, returnEntry) {
  var entry = this._keymap[key];
  if (entry === undefined) return;
  if (entry === this.tail) {
    return returnEntry ? entry : entry.value;
  }
  // HEAD--------------TAIL
  //   <.older   .newer>
  //  <--- add direction --
  //   A  B  C  <D>  E
  if (entry.newer) {
    if (entry === this.head) {
      this.head = entry.newer;
    }
    entry.newer.older = entry.older; // C <-- E.
  }
  if (entry.older) {
    entry.older.newer = entry.newer; // C. --> E
  }
  entry.newer = undefined; // D --x
  entry.older = this.tail; // D. --> E
  if (this.tail) {
    this.tail.newer = entry; // E. <-- D
  }
  this.tail = entry;
  return returnEntry ? entry : entry.value;
};

var cache$1 = new Cache(1000);
var filterTokenRE = /[^\s'"]+|'[^']*'|"[^"]*"/g;
var reservedArgRE = /^in$|^-?\d+/;

/**
 * Parser state
 */

var str;
var dir;
var c;
var prev;
var i;
var l;
var lastFilterIndex;
var inSingle;
var inDouble;
var curly;
var square;
var paren;
/**
 * Push a filter to the current directive object
 */

function pushFilter() {
  var exp = str.slice(lastFilterIndex, i).trim();
  var filter;
  if (exp) {
    filter = {};
    var tokens = exp.match(filterTokenRE);
    filter.name = tokens[0];
    if (tokens.length > 1) {
      filter.args = tokens.slice(1).map(processFilterArg);
    }
  }
  if (filter) {
    (dir.filters = dir.filters || []).push(filter);
  }
  lastFilterIndex = i + 1;
}

/**
 * Check if an argument is dynamic and strip quotes.
 *
 * @param {String} arg
 * @return {Object}
 */

function processFilterArg(arg) {
  if (reservedArgRE.test(arg)) {
    return {
      value: toNumber(arg),
      dynamic: false
    };
  } else {
    var stripped = stripQuotes(arg);
    var dynamic = stripped === arg;
    return {
      value: dynamic ? arg : stripped,
      dynamic: dynamic
    };
  }
}

/**
 * Parse a directive value and extract the expression
 * and its filters into a descriptor.
 *
 * Example:
 *
 * "a + 1 | uppercase" will yield:
 * {
 *   expression: 'a + 1',
 *   filters: [
 *     { name: 'uppercase', args: null }
 *   ]
 * }
 *
 * @param {String} str
 * @return {Object}
 */

function parseDirective(s) {
  var hit = cache$1.get(s);
  if (hit) {
    return hit;
  }

  // reset parser state
  str = s;
  inSingle = inDouble = false;
  curly = square = paren = 0;
  lastFilterIndex = 0;
  dir = {};

  for (i = 0, l = str.length; i < l; i++) {
    prev = c;
    c = str.charCodeAt(i);
    if (inSingle) {
      // check single quote
      if (c === 0x27 && prev !== 0x5C) inSingle = !inSingle;
    } else if (inDouble) {
      // check double quote
      if (c === 0x22 && prev !== 0x5C) inDouble = !inDouble;
    } else if (c === 0x7C && // pipe
    str.charCodeAt(i + 1) !== 0x7C && str.charCodeAt(i - 1) !== 0x7C) {
      if (dir.expression == null) {
        // first filter, end of expression
        lastFilterIndex = i + 1;
        dir.expression = str.slice(0, i).trim();
      } else {
        // already has filter
        pushFilter();
      }
    } else {
      switch (c) {
        case 0x22:
          inDouble = true;break; // "
        case 0x27:
          inSingle = true;break; // '
        case 0x28:
          paren++;break; // (
        case 0x29:
          paren--;break; // )
        case 0x5B:
          square++;break; // [
        case 0x5D:
          square--;break; // ]
        case 0x7B:
          curly++;break; // {
        case 0x7D:
          curly--;break; // }
      }
    }
  }

  if (dir.expression == null) {
    dir.expression = str.slice(0, i).trim();
  } else if (lastFilterIndex !== 0) {
    pushFilter();
  }

  cache$1.put(s, dir);
  return dir;
}

var directive = Object.freeze({
  parseDirective: parseDirective
});

var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g;
var cache = undefined;
var tagRE = undefined;
var htmlRE = undefined;
/**
 * Escape a string so it can be used in a RegExp
 * constructor.
 *
 * @param {String} str
 */

function escapeRegex(str) {
  return str.replace(regexEscapeRE, '\\$&');
}

function compileRegex() {
  var open = escapeRegex(config.delimiters[0]);
  var close = escapeRegex(config.delimiters[1]);
  var unsafeOpen = escapeRegex(config.unsafeDelimiters[0]);
  var unsafeClose = escapeRegex(config.unsafeDelimiters[1]);
  tagRE = new RegExp(unsafeOpen + '(.+?)' + unsafeClose + '|' + open + '(.+?)' + close, 'g');
  htmlRE = new RegExp('^' + unsafeOpen + '.*' + unsafeClose + '$');
  // reset cache
  cache = new Cache(1000);
}

/**
 * Parse a template text string into an array of tokens.
 *
 * @param {String} text
 * @return {Array<Object> | null}
 *               - {String} type
 *               - {String} value
 *               - {Boolean} [html]
 *               - {Boolean} [oneTime]
 */

function parseText(text) {
  if (!cache) {
    compileRegex();
  }
  var hit = cache.get(text);
  if (hit) {
    return hit;
  }
  text = text.replace(/\n/g, '');
  if (!tagRE.test(text)) {
    return null;
  }
  var tokens = [];
  var lastIndex = tagRE.lastIndex = 0;
  var match, index, html, value, first, oneTime;
  /* eslint-disable no-cond-assign */
  while (match = tagRE.exec(text)) {
    /* eslint-enable no-cond-assign */
    index = match.index;
    // push text token
    if (index > lastIndex) {
      tokens.push({
        value: text.slice(lastIndex, index)
      });
    }
    // tag token
    html = htmlRE.test(match[0]);
    value = html ? match[1] : match[2];
    first = value.charCodeAt(0);
    oneTime = first === 42; // *
    value = oneTime ? value.slice(1) : value;
    tokens.push({
      tag: true,
      value: value.trim(),
      html: html,
      oneTime: oneTime
    });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({
      value: text.slice(lastIndex)
    });
  }
  cache.put(text, tokens);
  return tokens;
}

/**
 * Format a list of tokens into an expression.
 * e.g. tokens parsed from 'a {{b}} c' can be serialized
 * into one single expression as '"a " + b + " c"'.
 *
 * @param {Array} tokens
 * @param {Vue} [vm]
 * @return {String}
 */

function tokensToExp(tokens, vm) {
  if (tokens.length > 1) {
    return tokens.map(function (token) {
      return formatToken(token, vm);
    }).join('+');
  } else {
    return formatToken(tokens[0], vm, true);
  }
}

/**
 * Format a single token.
 *
 * @param {Object} token
 * @param {Vue} [vm]
 * @param {Boolean} [single]
 * @return {String}
 */

function formatToken(token, vm, single) {
  return token.tag ? token.oneTime && vm ? '"' + vm.$eval(token.value) + '"' : inlineFilters(token.value, single) : '"' + token.value + '"';
}

/**
 * For an attribute with multiple interpolation tags,
 * e.g. attr="some-{{thing | filter}}", in order to combine
 * the whole thing into a single watchable expression, we
 * have to inline those filters. This function does exactly
 * that. This is a bit hacky but it avoids heavy changes
 * to directive parser and watcher mechanism.
 *
 * @param {String} exp
 * @param {Boolean} single
 * @return {String}
 */

var filterRE = /[^|]\|[^|]/;
function inlineFilters(exp, single) {
  if (!filterRE.test(exp)) {
    return single ? exp : '(' + exp + ')';
  } else {
    var dir = parseDirective(exp);
    if (!dir.filters) {
      return '(' + exp + ')';
    } else {
      return 'this._applyFilters(' + dir.expression + // value
      ',null,' + // oldValue (null for read)
      JSON.stringify(dir.filters) + // filter descriptors
      ',false)'; // write?
    }
  }
}

var text = Object.freeze({
  compileRegex: compileRegex,
  parseText: parseText,
  tokensToExp: tokensToExp
});

var delimiters = ['{{', '}}'];
var unsafeDelimiters = ['{{{', '}}}'];

var config = Object.defineProperties({

  /**
   * Whether to print debug messages.
   * Also enables stack trace for warnings.
   *
   * @type {Boolean}
   */

  debug: false,

  /**
   * Whether to suppress warnings.
   *
   * @type {Boolean}
   */

  silent: false,

  /**
   * Whether to use async rendering.
   */

  async: true,

  /**
   * Whether to warn against errors caught when evaluating
   * expressions.
   */

  warnExpressionErrors: true,

  /**
   * Whether to allow devtools inspection.
   * Disabled by default in production builds.
   */

  devtools: process.env.NODE_ENV !== 'production',

  /**
   * Internal flag to indicate the delimiters have been
   * changed.
   *
   * @type {Boolean}
   */

  _delimitersChanged: true,

  /**
   * List of asset types that a component can own.
   *
   * @type {Array}
   */

  _assetTypes: ['component', 'directive', 'elementDirective', 'filter', 'transition', 'partial'],

  /**
   * prop binding modes
   */

  _propBindingModes: {
    ONE_WAY: 0,
    TWO_WAY: 1,
    ONE_TIME: 2
  },

  /**
   * Max circular updates allowed in a batcher flush cycle.
   */

  _maxUpdateCount: 100

}, {
  delimiters: { /**
                 * Interpolation delimiters. Changing these would trigger
                 * the text parser to re-compile the regular expressions.
                 *
                 * @type {Array<String>}
                 */

    get: function get() {
      return delimiters;
    },
    set: function set(val) {
      delimiters = val;
      compileRegex();
    },
    configurable: true,
    enumerable: true
  },
  unsafeDelimiters: {
    get: function get() {
      return unsafeDelimiters;
    },
    set: function set(val) {
      unsafeDelimiters = val;
      compileRegex();
    },
    configurable: true,
    enumerable: true
  }
});

var warn = undefined;

if (process.env.NODE_ENV !== 'production') {
  (function () {
    var hasConsole = typeof console !== 'undefined';
    warn = function (msg, e) {
      if (hasConsole && (!config.silent || config.debug)) {
        console.warn('[Vue warn]: ' + msg);
        /* istanbul ignore if */
        if (config.debug) {
          if (e) {
            throw e;
          } else {
            console.warn(new Error('Warning Stack Trace').stack);
          }
        }
      }
    };
  })();
}

/**
 * Append with transition.
 *
 * @param {Element} el
 * @param {Element} target
 * @param {Vue} vm
 * @param {Function} [cb]
 */

function appendWithTransition(el, target, vm, cb) {
  applyTransition(el, 1, function () {
    target.appendChild(el);
  }, vm, cb);
}

/**
 * InsertBefore with transition.
 *
 * @param {Element} el
 * @param {Element} target
 * @param {Vue} vm
 * @param {Function} [cb]
 */

function beforeWithTransition(el, target, vm, cb) {
  applyTransition(el, 1, function () {
    before(el, target);
  }, vm, cb);
}

/**
 * Remove with transition.
 *
 * @param {Element} el
 * @param {Vue} vm
 * @param {Function} [cb]
 */

function removeWithTransition(el, vm, cb) {
  applyTransition(el, -1, function () {
    remove(el);
  }, vm, cb);
}

/**
 * Apply transitions with an operation callback.
 *
 * @param {Element} el
 * @param {Number} direction
 *                  1: enter
 *                 -1: leave
 * @param {Function} op - the actual DOM operation
 * @param {Vue} vm
 * @param {Function} [cb]
 */

function applyTransition(el, direction, op, vm, cb) {
  var transition = el.__v_trans;
  if (!transition ||
  // skip if there are no js hooks and CSS transition is
  // not supported
  !transition.hooks && !transitionEndEvent ||
  // skip transitions for initial compile
  !vm._isCompiled ||
  // if the vm is being manipulated by a parent directive
  // during the parent's compilation phase, skip the
  // animation.
  vm.$parent && !vm.$parent._isCompiled) {
    op();
    if (cb) cb();
    return;
  }
  var action = direction > 0 ? 'enter' : 'leave';
  transition[action](op, cb);
}

var transition = Object.freeze({
  appendWithTransition: appendWithTransition,
  beforeWithTransition: beforeWithTransition,
  removeWithTransition: removeWithTransition,
  applyTransition: applyTransition
});

/**
 * Query an element selector if it's not an element already.
 *
 * @param {String|Element} el
 * @return {Element}
 */

function query(el) {
  if (typeof el === 'string') {
    var selector = el;
    el = document.querySelector(el);
    if (!el) {
      process.env.NODE_ENV !== 'production' && warn('Cannot find element: ' + selector);
    }
  }
  return el;
}

/**
 * Check if a node is in the document.
 * Note: document.documentElement.contains should work here
 * but always returns false for comment nodes in phantomjs,
 * making unit tests difficult. This is fixed by doing the
 * contains() check on the node's parentNode instead of
 * the node itself.
 *
 * @param {Node} node
 * @return {Boolean}
 */

function inDoc(node) {
  var doc = document.documentElement;
  var parent = node && node.parentNode;
  return doc === node || doc === parent || !!(parent && parent.nodeType === 1 && doc.contains(parent));
}

/**
 * Get and remove an attribute from a node.
 *
 * @param {Node} node
 * @param {String} _attr
 */

function getAttr(node, _attr) {
  var val = node.getAttribute(_attr);
  if (val !== null) {
    node.removeAttribute(_attr);
  }
  return val;
}

/**
 * Get an attribute with colon or v-bind: prefix.
 *
 * @param {Node} node
 * @param {String} name
 * @return {String|null}
 */

function getBindAttr(node, name) {
  var val = getAttr(node, ':' + name);
  if (val === null) {
    val = getAttr(node, 'v-bind:' + name);
  }
  return val;
}

/**
 * Check the presence of a bind attribute.
 *
 * @param {Node} node
 * @param {String} name
 * @return {Boolean}
 */

function hasBindAttr(node, name) {
  return node.hasAttribute(name) || node.hasAttribute(':' + name) || node.hasAttribute('v-bind:' + name);
}

/**
 * Insert el before target
 *
 * @param {Element} el
 * @param {Element} target
 */

function before(el, target) {
  target.parentNode.insertBefore(el, target);
}

/**
 * Insert el after target
 *
 * @param {Element} el
 * @param {Element} target
 */

function after(el, target) {
  if (target.nextSibling) {
    before(el, target.nextSibling);
  } else {
    target.parentNode.appendChild(el);
  }
}

/**
 * Remove el from DOM
 *
 * @param {Element} el
 */

function remove(el) {
  el.parentNode.removeChild(el);
}

/**
 * Prepend el to target
 *
 * @param {Element} el
 * @param {Element} target
 */

function prepend(el, target) {
  if (target.firstChild) {
    before(el, target.firstChild);
  } else {
    target.appendChild(el);
  }
}

/**
 * Replace target with el
 *
 * @param {Element} target
 * @param {Element} el
 */

function replace(target, el) {
  var parent = target.parentNode;
  if (parent) {
    parent.replaceChild(el, target);
  }
}

/**
 * Add event listener shorthand.
 *
 * @param {Element} el
 * @param {String} event
 * @param {Function} cb
 * @param {Boolean} [useCapture]
 */

function on(el, event, cb, useCapture) {
  el.addEventListener(event, cb, useCapture);
}

/**
 * Remove event listener shorthand.
 *
 * @param {Element} el
 * @param {String} event
 * @param {Function} cb
 */

function off(el, event, cb) {
  el.removeEventListener(event, cb);
}

/**
 * In IE9, setAttribute('class') will result in empty class
 * if the element also has the :class attribute; However in
 * PhantomJS, setting `className` does not work on SVG elements...
 * So we have to do a conditional check here.
 *
 * @param {Element} el
 * @param {String} cls
 */

function setClass(el, cls) {
  /* istanbul ignore if */
  if (isIE9 && !/svg$/.test(el.namespaceURI)) {
    el.className = cls;
  } else {
    el.setAttribute('class', cls);
  }
}

/**
 * Add class with compatibility for IE & SVG
 *
 * @param {Element} el
 * @param {String} cls
 */

function addClass(el, cls) {
  if (el.classList) {
    el.classList.add(cls);
  } else {
    var cur = ' ' + (el.getAttribute('class') || '') + ' ';
    if (cur.indexOf(' ' + cls + ' ') < 0) {
      setClass(el, (cur + cls).trim());
    }
  }
}

/**
 * Remove class with compatibility for IE & SVG
 *
 * @param {Element} el
 * @param {String} cls
 */

function removeClass(el, cls) {
  if (el.classList) {
    el.classList.remove(cls);
  } else {
    var cur = ' ' + (el.getAttribute('class') || '') + ' ';
    var tar = ' ' + cls + ' ';
    while (cur.indexOf(tar) >= 0) {
      cur = cur.replace(tar, ' ');
    }
    setClass(el, cur.trim());
  }
  if (!el.className) {
    el.removeAttribute('class');
  }
}

/**
 * Extract raw content inside an element into a temporary
 * container div
 *
 * @param {Element} el
 * @param {Boolean} asFragment
 * @return {Element|DocumentFragment}
 */

function extractContent(el, asFragment) {
  var child;
  var rawContent;
  /* istanbul ignore if */
  if (isTemplate(el) && isFragment(el.content)) {
    el = el.content;
  }
  if (el.hasChildNodes()) {
    trimNode(el);
    rawContent = asFragment ? document.createDocumentFragment() : document.createElement('div');
    /* eslint-disable no-cond-assign */
    while (child = el.firstChild) {
      /* eslint-enable no-cond-assign */
      rawContent.appendChild(child);
    }
  }
  return rawContent;
}

/**
 * Trim possible empty head/tail text and comment
 * nodes inside a parent.
 *
 * @param {Node} node
 */

function trimNode(node) {
  var child;
  /* eslint-disable no-sequences */
  while ((child = node.firstChild, isTrimmable(child))) {
    node.removeChild(child);
  }
  while ((child = node.lastChild, isTrimmable(child))) {
    node.removeChild(child);
  }
  /* eslint-enable no-sequences */
}

function isTrimmable(node) {
  return node && (node.nodeType === 3 && !node.data.trim() || node.nodeType === 8);
}

/**
 * Check if an element is a template tag.
 * Note if the template appears inside an SVG its tagName
 * will be in lowercase.
 *
 * @param {Element} el
 */

function isTemplate(el) {
  return el.tagName && el.tagName.toLowerCase() === 'template';
}

/**
 * Create an "anchor" for performing dom insertion/removals.
 * This is used in a number of scenarios:
 * - fragment instance
 * - v-html
 * - v-if
 * - v-for
 * - component
 *
 * @param {String} content
 * @param {Boolean} persist - IE trashes empty textNodes on
 *                            cloneNode(true), so in certain
 *                            cases the anchor needs to be
 *                            non-empty to be persisted in
 *                            templates.
 * @return {Comment|Text}
 */

function createAnchor(content, persist) {
  var anchor = config.debug ? document.createComment(content) : document.createTextNode(persist ? ' ' : '');
  anchor.__v_anchor = true;
  return anchor;
}

/**
 * Find a component ref attribute that starts with $.
 *
 * @param {Element} node
 * @return {String|undefined}
 */

var refRE = /^v-ref:/;

function findRef(node) {
  if (node.hasAttributes()) {
    var attrs = node.attributes;
    for (var i = 0, l = attrs.length; i < l; i++) {
      var name = attrs[i].name;
      if (refRE.test(name)) {
        return camelize(name.replace(refRE, ''));
      }
    }
  }
}

/**
 * Map a function to a range of nodes .
 *
 * @param {Node} node
 * @param {Node} end
 * @param {Function} op
 */

function mapNodeRange(node, end, op) {
  var next;
  while (node !== end) {
    next = node.nextSibling;
    op(node);
    node = next;
  }
  op(end);
}

/**
 * Remove a range of nodes with transition, store
 * the nodes in a fragment with correct ordering,
 * and call callback when done.
 *
 * @param {Node} start
 * @param {Node} end
 * @param {Vue} vm
 * @param {DocumentFragment} frag
 * @param {Function} cb
 */

function removeNodeRange(start, end, vm, frag, cb) {
  var done = false;
  var removed = 0;
  var nodes = [];
  mapNodeRange(start, end, function (node) {
    if (node === end) done = true;
    nodes.push(node);
    removeWithTransition(node, vm, onRemoved);
  });
  function onRemoved() {
    removed++;
    if (done && removed >= nodes.length) {
      for (var i = 0; i < nodes.length; i++) {
        frag.appendChild(nodes[i]);
      }
      cb && cb();
    }
  }
}

/**
 * Check if a node is a DocumentFragment.
 *
 * @param {Node} node
 * @return {Boolean}
 */

function isFragment(node) {
  return node && node.nodeType === 11;
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 *
 * @param {Element} el
 * @return {String}
 */

function getOuterHTML(el) {
  if (el.outerHTML) {
    return el.outerHTML;
  } else {
    var container = document.createElement('div');
    container.appendChild(el.cloneNode(true));
    return container.innerHTML;
  }
}

var uid$1 = 0;

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 *
 * @constructor
 */
function Dep() {
  this.id = uid$1++;
  this.subs = [];
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null;

/**
 * Add a directive subscriber.
 *
 * @param {Directive} sub
 */

Dep.prototype.addSub = function (sub) {
  this.subs.push(sub);
};

/**
 * Remove a directive subscriber.
 *
 * @param {Directive} sub
 */

Dep.prototype.removeSub = function (sub) {
  this.subs.$remove(sub);
};

/**
 * Add self as a dependency to the target watcher.
 */

Dep.prototype.depend = function () {
  Dep.target.addDep(this);
};

/**
 * Notify all subscribers of a new value.
 */

Dep.prototype.notify = function () {
  // stablize the subscriber list first
  var subs = toArray(this.subs);
  for (var i = 0, l = subs.length; i < l; i++) {
    subs[i].update();
  }
};

var arrayProto = Array.prototype;
var arrayMethods = Object.create(arrayProto)

/**
 * Intercept mutating methods and emit events
 */

;['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(function (method) {
  // cache original method
  var original = arrayProto[method];
  def(arrayMethods, method, function mutator() {
    // avoid leaking arguments:
    // http://jsperf.com/closure-with-arguments
    var i = arguments.length;
    var args = new Array(i);
    while (i--) {
      args[i] = arguments[i];
    }
    var result = original.apply(this, args);
    var ob = this.__ob__;
    var inserted;
    switch (method) {
      case 'push':
        inserted = args;
        break;
      case 'unshift':
        inserted = args;
        break;
      case 'splice':
        inserted = args.slice(2);
        break;
    }
    if (inserted) ob.observeArray(inserted);
    // notify change
    ob.dep.notify();
    return result;
  });
});

/**
 * Swap the element at the given index with a new value
 * and emits corresponding event.
 *
 * @param {Number} index
 * @param {*} val
 * @return {*} - replaced element
 */

def(arrayProto, '$set', function $set(index, val) {
  if (index >= this.length) {
    this.length = Number(index) + 1;
  }
  return this.splice(index, 1, val)[0];
});

/**
 * Convenience method to remove the element at given index.
 *
 * @param {Number} index
 * @param {*} val
 */

def(arrayProto, '$remove', function $remove(item) {
  /* istanbul ignore if */
  if (!this.length) return;
  var index = indexOf(this, item);
  if (index > -1) {
    return this.splice(index, 1);
  }
});

var arrayKeys = Object.getOwnPropertyNames(arrayMethods);

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 *
 * @param {Array|Object} value
 * @constructor
 */

function Observer(value) {
  this.value = value;
  this.dep = new Dep();
  def(value, '__ob__', this);
  if (isArray(value)) {
    var augment = hasProto ? protoAugment : copyAugment;
    augment(value, arrayMethods, arrayKeys);
    this.observeArray(value);
  } else {
    this.walk(value);
  }
}

// Instance methods

/**
 * Walk through each property and convert them into
 * getter/setters. This method should only be called when
 * value type is Object.
 *
 * @param {Object} obj
 */

Observer.prototype.walk = function (obj) {
  var keys = Object.keys(obj);
  for (var i = 0, l = keys.length; i < l; i++) {
    this.convert(keys[i], obj[keys[i]]);
  }
};

/**
 * Observe a list of Array items.
 *
 * @param {Array} items
 */

Observer.prototype.observeArray = function (items) {
  for (var i = 0, l = items.length; i < l; i++) {
    observe(items[i]);
  }
};

/**
 * Convert a property into getter/setter so we can emit
 * the events when the property is accessed/changed.
 *
 * @param {String} key
 * @param {*} val
 */

Observer.prototype.convert = function (key, val) {
  defineReactive(this.value, key, val);
};

/**
 * Add an owner vm, so that when $set/$delete mutations
 * happen we can notify owner vms to proxy the keys and
 * digest the watchers. This is only called when the object
 * is observed as an instance's root $data.
 *
 * @param {Vue} vm
 */

Observer.prototype.addVm = function (vm) {
  (this.vms || (this.vms = [])).push(vm);
};

/**
 * Remove an owner vm. This is called when the object is
 * swapped out as an instance's $data object.
 *
 * @param {Vue} vm
 */

Observer.prototype.removeVm = function (vm) {
  this.vms.$remove(vm);
};

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

function protoAugment(target, src) {
  /* eslint-disable no-proto */
  target.__proto__ = src;
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

function copyAugment(target, src, keys) {
  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i];
    def(target, key, src[key]);
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *
 * @param {*} value
 * @param {Vue} [vm]
 * @return {Observer|undefined}
 * @static
 */

function observe(value, vm) {
  if (!value || typeof value !== 'object') {
    return;
  }
  var ob;
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__;
  } else if ((isArray(value) || isPlainObject(value)) && Object.isExtensible(value) && !value._isVue) {
    ob = new Observer(value);
  }
  if (ob && vm) {
    ob.addVm(vm);
  }
  return ob;
}

/**
 * Define a reactive property on an Object.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {*} val
 * @param {Boolean} doNotObserve
 */

function defineReactive(obj, key, val, doNotObserve) {
  var dep = new Dep();

  var property = Object.getOwnPropertyDescriptor(obj, key);
  if (property && property.configurable === false) {
    return;
  }

  // cater for pre-defined getter/setters
  var getter = property && property.get;
  var setter = property && property.set;

  // if doNotObserve is true, only use the child value observer
  // if it already exists, and do not attempt to create it.
  // this allows freezing a large object from the root and
  // avoid unnecessary observation inside v-for fragments.
  var childOb = doNotObserve ? isObject(val) && val.__ob__ : observe(val);
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      var value = getter ? getter.call(obj) : val;
      if (Dep.target) {
        dep.depend();
        if (childOb) {
          childOb.dep.depend();
        }
        if (isArray(value)) {
          for (var e, i = 0, l = value.length; i < l; i++) {
            e = value[i];
            e && e.__ob__ && e.__ob__.dep.depend();
          }
        }
      }
      return value;
    },
    set: function reactiveSetter(newVal) {
      var value = getter ? getter.call(obj) : val;
      if (newVal === value) {
        return;
      }
      if (setter) {
        setter.call(obj, newVal);
      } else {
        val = newVal;
      }
      childOb = doNotObserve ? isObject(newVal) && newVal.__ob__ : observe(newVal);
      dep.notify();
    }
  });
}

var commonTagRE = /^(div|p|span|img|a|b|i|br|ul|ol|li|h1|h2|h3|h4|h5|h6|code|pre|table|th|td|tr|form|label|input|select|option|nav|article|section|header|footer)$/i;
var reservedTagRE = /^(slot|partial|component)$/i;

var isUnknownElement = undefined;
if (process.env.NODE_ENV !== 'production') {
  isUnknownElement = function (el, tag) {
    if (tag.indexOf('-') > -1) {
      // http://stackoverflow.com/a/28210364/1070244
      return el.constructor === window.HTMLUnknownElement || el.constructor === window.HTMLElement;
    } else {
      return (/HTMLUnknownElement/.test(el.toString()) &&
        // Chrome returns unknown for several HTML5 elements.
        // https://code.google.com/p/chromium/issues/detail?id=540526
        !/^(data|time|rtc|rb)$/.test(tag)
      );
    }
  };
}

/**
 * Check if an element is a component, if yes return its
 * component id.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Object|undefined}
 */

function checkComponentAttr(el, options) {
  var tag = el.tagName.toLowerCase();
  var hasAttrs = el.hasAttributes();
  if (!commonTagRE.test(tag) && !reservedTagRE.test(tag)) {
    if (resolveAsset(options, 'components', tag)) {
      return { id: tag };
    } else {
      var is = hasAttrs && getIsBinding(el);
      if (is) {
        return is;
      } else if (process.env.NODE_ENV !== 'production') {
        var expectedTag = options._componentNameMap && options._componentNameMap[tag];
        if (expectedTag) {
          warn('Unknown custom element: <' + tag + '> - ' + 'did you mean <' + expectedTag + '>? ' + 'HTML is case-insensitive, remember to use kebab-case in templates.');
        } else if (isUnknownElement(el, tag)) {
          warn('Unknown custom element: <' + tag + '> - did you ' + 'register the component correctly? For recursive components, ' + 'make sure to provide the "name" option.');
        }
      }
    }
  } else if (hasAttrs) {
    return getIsBinding(el);
  }
}

/**
 * Get "is" binding from an element.
 *
 * @param {Element} el
 * @return {Object|undefined}
 */

function getIsBinding(el) {
  // dynamic syntax
  var exp = getAttr(el, 'is');
  if (exp != null) {
    return { id: exp };
  } else {
    exp = getBindAttr(el, 'is');
    if (exp != null) {
      return { id: exp, dynamic: true };
    }
  }
}

/**
 * Set a prop's initial value on a vm and its data object.
 *
 * @param {Vue} vm
 * @param {Object} prop
 * @param {*} value
 */

function initProp(vm, prop, value) {
  var key = prop.path;
  value = coerceProp(prop, value);
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop.options);
  }
  if (assertProp(prop, value)) {
    defineReactive(vm, key, value, true /* doNotObserve */);
  }
}

/**
 * Get the default value of a prop.
 *
 * @param {Vue} vm
 * @param {Object} options
 * @return {*}
 */

function getPropDefaultValue(vm, options) {
  // no default, return undefined
  if (!hasOwn(options, 'default')) {
    // absent boolean value defaults to false
    return options.type === Boolean ? false : undefined;
  }
  var def = options['default'];
  // warn against non-factory defaults for Object & Array
  if (isObject(def)) {
    process.env.NODE_ENV !== 'production' && warn('Object/Array as default prop values will be shared ' + 'across multiple instances. Use a factory function ' + 'to return the default value instead.');
  }
  // call factory function for non-Function types
  return typeof def === 'function' && options.type !== Function ? def.call(vm) : def;
}

/**
 * Assert whether a prop is valid.
 *
 * @param {Object} prop
 * @param {*} value
 */

function assertProp(prop, value) {
  if (!prop.options.required && ( // non-required
  prop.raw === null || // abscent
  value == null) // null or undefined
  ) {
      return true;
    }
  var options = prop.options;
  var type = options.type;
  var valid = true;
  var expectedType;
  if (type) {
    if (type === String) {
      expectedType = 'string';
      valid = typeof value === expectedType;
    } else if (type === Number) {
      expectedType = 'number';
      valid = typeof value === 'number';
    } else if (type === Boolean) {
      expectedType = 'boolean';
      valid = typeof value === 'boolean';
    } else if (type === Function) {
      expectedType = 'function';
      valid = typeof value === 'function';
    } else if (type === Object) {
      expectedType = 'object';
      valid = isPlainObject(value);
    } else if (type === Array) {
      expectedType = 'array';
      valid = isArray(value);
    } else {
      valid = value instanceof type;
    }
  }
  if (!valid) {
    process.env.NODE_ENV !== 'production' && warn('Invalid prop: type check failed for ' + prop.path + '="' + prop.raw + '".' + ' Expected ' + formatType(expectedType) + ', got ' + formatValue(value) + '.');
    return false;
  }
  var validator = options.validator;
  if (validator) {
    if (!validator(value)) {
      process.env.NODE_ENV !== 'production' && warn('Invalid prop: custom validator check failed for ' + prop.path + '="' + prop.raw + '"');
      return false;
    }
  }
  return true;
}

/**
 * Force parsing value with coerce option.
 *
 * @param {*} value
 * @param {Object} options
 * @return {*}
 */

function coerceProp(prop, value) {
  var coerce = prop.options.coerce;
  if (!coerce) {
    return value;
  }
  // coerce is a function
  return coerce(value);
}

function formatType(val) {
  return val ? val.charAt(0).toUpperCase() + val.slice(1) : 'custom type';
}

function formatValue(val) {
  return Object.prototype.toString.call(val).slice(8, -1);
}

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 *
 * All strategy functions follow the same signature:
 *
 * @param {*} parentVal
 * @param {*} childVal
 * @param {Vue} [vm]
 */

var strats = config.optionMergeStrategies = Object.create(null);

/**
 * Helper that recursively merges two data objects together.
 */

function mergeData(to, from) {
  var key, toVal, fromVal;
  for (key in from) {
    toVal = to[key];
    fromVal = from[key];
    if (!hasOwn(to, key)) {
      set(to, key, fromVal);
    } else if (isObject(toVal) && isObject(fromVal)) {
      mergeData(toVal, fromVal);
    }
  }
  return to;
}

/**
 * Data
 */

strats.data = function (parentVal, childVal, vm) {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal;
    }
    if (typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn('The "data" option should be a function ' + 'that returns a per-instance value in component ' + 'definitions.');
      return parentVal;
    }
    if (!parentVal) {
      return childVal;
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn() {
      return mergeData(childVal.call(this), parentVal.call(this));
    };
  } else if (parentVal || childVal) {
    return function mergedInstanceDataFn() {
      // instance merge
      var instanceData = typeof childVal === 'function' ? childVal.call(vm) : childVal;
      var defaultData = typeof parentVal === 'function' ? parentVal.call(vm) : undefined;
      if (instanceData) {
        return mergeData(instanceData, defaultData);
      } else {
        return defaultData;
      }
    };
  }
};

/**
 * El
 */

strats.el = function (parentVal, childVal, vm) {
  if (!vm && childVal && typeof childVal !== 'function') {
    process.env.NODE_ENV !== 'production' && warn('The "el" option should be a function ' + 'that returns a per-instance value in component ' + 'definitions.');
    return;
  }
  var ret = childVal || parentVal;
  // invoke the element factory if this is instance merge
  return vm && typeof ret === 'function' ? ret.call(vm) : ret;
};

/**
 * Hooks and param attributes are merged as arrays.
 */

strats.init = strats.created = strats.ready = strats.attached = strats.detached = strats.beforeCompile = strats.compiled = strats.beforeDestroy = strats.destroyed = strats.activate = function (parentVal, childVal) {
  return childVal ? parentVal ? parentVal.concat(childVal) : isArray(childVal) ? childVal : [childVal] : parentVal;
};

/**
 * 0.11 deprecation warning
 */

strats.paramAttributes = function () {
  /* istanbul ignore next */
  process.env.NODE_ENV !== 'production' && warn('"paramAttributes" option has been deprecated in 0.12. ' + 'Use "props" instead.');
};

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */

function mergeAssets(parentVal, childVal) {
  var res = Object.create(parentVal);
  return childVal ? extend(res, guardArrayAssets(childVal)) : res;
}

config._assetTypes.forEach(function (type) {
  strats[type + 's'] = mergeAssets;
});

/**
 * Events & Watchers.
 *
 * Events & watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */

strats.watch = strats.events = function (parentVal, childVal) {
  if (!childVal) return parentVal;
  if (!parentVal) return childVal;
  var ret = {};
  extend(ret, parentVal);
  for (var key in childVal) {
    var parent = ret[key];
    var child = childVal[key];
    if (parent && !isArray(parent)) {
      parent = [parent];
    }
    ret[key] = parent ? parent.concat(child) : [child];
  }
  return ret;
};

/**
 * Other object hashes.
 */

strats.props = strats.methods = strats.computed = function (parentVal, childVal) {
  if (!childVal) return parentVal;
  if (!parentVal) return childVal;
  var ret = Object.create(null);
  extend(ret, parentVal);
  extend(ret, childVal);
  return ret;
};

/**
 * Default strategy.
 */

var defaultStrat = function defaultStrat(parentVal, childVal) {
  return childVal === undefined ? parentVal : childVal;
};

/**
 * Make sure component options get converted to actual
 * constructors.
 *
 * @param {Object} options
 */

function guardComponents(options) {
  if (options.components) {
    var components = options.components = guardArrayAssets(options.components);
    var ids = Object.keys(components);
    var def;
    if (process.env.NODE_ENV !== 'production') {
      var map = options._componentNameMap = {};
    }
    for (var i = 0, l = ids.length; i < l; i++) {
      var key = ids[i];
      if (commonTagRE.test(key) || reservedTagRE.test(key)) {
        process.env.NODE_ENV !== 'production' && warn('Do not use built-in or reserved HTML elements as component ' + 'id: ' + key);
        continue;
      }
      // record a all lowercase <-> kebab-case mapping for
      // possible custom element case error warning
      if (process.env.NODE_ENV !== 'production') {
        map[key.replace(/-/g, '').toLowerCase()] = hyphenate(key);
      }
      def = components[key];
      if (isPlainObject(def)) {
        components[key] = Vue.extend(def);
      }
    }
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 *
 * @param {Object} options
 */

function guardProps(options) {
  var props = options.props;
  var i, val;
  if (isArray(props)) {
    options.props = {};
    i = props.length;
    while (i--) {
      val = props[i];
      if (typeof val === 'string') {
        options.props[val] = null;
      } else if (val.name) {
        options.props[val.name] = val;
      }
    }
  } else if (isPlainObject(props)) {
    var keys = Object.keys(props);
    i = keys.length;
    while (i--) {
      val = props[keys[i]];
      if (typeof val === 'function') {
        props[keys[i]] = { type: val };
      }
    }
  }
}

/**
 * Guard an Array-format assets option and converted it
 * into the key-value Object format.
 *
 * @param {Object|Array} assets
 * @return {Object}
 */

function guardArrayAssets(assets) {
  if (isArray(assets)) {
    var res = {};
    var i = assets.length;
    var asset;
    while (i--) {
      asset = assets[i];
      var id = typeof asset === 'function' ? asset.options && asset.options.name || asset.id : asset.name || asset.id;
      if (!id) {
        process.env.NODE_ENV !== 'production' && warn('Array-syntax assets must provide a "name" or "id" field.');
      } else {
        res[id] = asset;
      }
    }
    return res;
  }
  return assets;
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 *
 * @param {Object} parent
 * @param {Object} child
 * @param {Vue} [vm] - if vm is present, indicates this is
 *                     an instantiation merge.
 */

function mergeOptions(parent, child, vm) {
  guardComponents(child);
  guardProps(child);
  var options = {};
  var key;
  if (child.mixins) {
    for (var i = 0, l = child.mixins.length; i < l; i++) {
      parent = mergeOptions(parent, child.mixins[i], vm);
    }
  }
  for (key in parent) {
    mergeField(key);
  }
  for (key in child) {
    if (!hasOwn(parent, key)) {
      mergeField(key);
    }
  }
  function mergeField(key) {
    var strat = strats[key] || defaultStrat;
    options[key] = strat(parent[key], child[key], vm, key);
  }
  return options;
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 *
 * @param {Object} options
 * @param {String} type
 * @param {String} id
 * @return {Object|Function}
 */

function resolveAsset(options, type, id) {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return;
  }
  var assets = options[type];
  var camelizedId;
  return assets[id] ||
  // camelCase ID
  assets[camelizedId = camelize(id)] ||
  // Pascal Case ID
  assets[camelizedId.charAt(0).toUpperCase() + camelizedId.slice(1)];
}

/**
 * Assert asset exists
 */

function assertAsset(val, type, id) {
  if (!val) {
    process.env.NODE_ENV !== 'production' && warn('Failed to resolve ' + type + ': ' + id);
  }
}



var util = Object.freeze({
	defineReactive: defineReactive,
	set: set,
	del: del,
	hasOwn: hasOwn,
	isLiteral: isLiteral,
	isReserved: isReserved,
	_toString: _toString,
	toNumber: toNumber,
	toBoolean: toBoolean,
	stripQuotes: stripQuotes,
	camelize: camelize,
	hyphenate: hyphenate,
	classify: classify,
	bind: bind,
	toArray: toArray,
	extend: extend,
	isObject: isObject,
	isPlainObject: isPlainObject,
	def: def,
	debounce: _debounce,
	indexOf: indexOf,
	cancellable: cancellable,
	looseEqual: looseEqual,
	isArray: isArray,
	hasProto: hasProto,
	inBrowser: inBrowser,
	devtools: devtools,
	isIE9: isIE9,
	isAndroid: isAndroid,
	get transitionProp () { return transitionProp; },
	get transitionEndEvent () { return transitionEndEvent; },
	get animationProp () { return animationProp; },
	get animationEndEvent () { return animationEndEvent; },
	nextTick: nextTick,
	query: query,
	inDoc: inDoc,
	getAttr: getAttr,
	getBindAttr: getBindAttr,
	hasBindAttr: hasBindAttr,
	before: before,
	after: after,
	remove: remove,
	prepend: prepend,
	replace: replace,
	on: on,
	off: off,
	setClass: setClass,
	addClass: addClass,
	removeClass: removeClass,
	extractContent: extractContent,
	trimNode: trimNode,
	isTemplate: isTemplate,
	createAnchor: createAnchor,
	findRef: findRef,
	mapNodeRange: mapNodeRange,
	removeNodeRange: removeNodeRange,
	isFragment: isFragment,
	getOuterHTML: getOuterHTML,
	mergeOptions: mergeOptions,
	resolveAsset: resolveAsset,
	assertAsset: assertAsset,
	checkComponentAttr: checkComponentAttr,
	initProp: initProp,
	assertProp: assertProp,
	coerceProp: coerceProp,
	commonTagRE: commonTagRE,
	reservedTagRE: reservedTagRE,
	get warn () { return warn; }
});

var uid = 0;

function initMixin (Vue) {
  /**
   * The main init sequence. This is called for every
   * instance, including ones that are created from extended
   * constructors.
   *
   * @param {Object} options - this options object should be
   *                           the result of merging class
   *                           options and the options passed
   *                           in to the constructor.
   */

  Vue.prototype._init = function (options) {
    options = options || {};

    this.$el = null;
    this.$parent = options.parent;
    this.$root = this.$parent ? this.$parent.$root : this;
    this.$children = [];
    this.$refs = {}; // child vm references
    this.$els = {}; // element references
    this._watchers = []; // all watchers as an array
    this._directives = []; // all directives

    // a uid
    this._uid = uid++;

    // a flag to avoid this being observed
    this._isVue = true;

    // events bookkeeping
    this._events = {}; // registered callbacks
    this._eventsCount = {}; // for $broadcast optimization

    // fragment instance properties
    this._isFragment = false;
    this._fragment = // @type {DocumentFragment}
    this._fragmentStart = // @type {Text|Comment}
    this._fragmentEnd = null; // @type {Text|Comment}

    // lifecycle state
    this._isCompiled = this._isDestroyed = this._isReady = this._isAttached = this._isBeingDestroyed = this._vForRemoving = false;
    this._unlinkFn = null;

    // context:
    // if this is a transcluded component, context
    // will be the common parent vm of this instance
    // and its host.
    this._context = options._context || this.$parent;

    // scope:
    // if this is inside an inline v-for, the scope
    // will be the intermediate scope created for this
    // repeat fragment. this is used for linking props
    // and container directives.
    this._scope = options._scope;

    // fragment:
    // if this instance is compiled inside a Fragment, it
    // needs to reigster itself as a child of that fragment
    // for attach/detach to work properly.
    this._frag = options._frag;
    if (this._frag) {
      this._frag.children.push(this);
    }

    // push self into parent / transclusion host
    if (this.$parent) {
      this.$parent.$children.push(this);
    }

    // merge options.
    options = this.$options = mergeOptions(this.constructor.options, options, this);

    // set ref
    this._updateRef();

    // initialize data as empty object.
    // it will be filled up in _initScope().
    this._data = {};

    // save raw constructor data before merge
    // so that we know which properties are provided at
    // instantiation.
    this._runtimeData = options.data;

    // call init hook
    this._callHook('init');

    // initialize data observation and scope inheritance.
    this._initState();

    // setup event system and option events.
    this._initEvents();

    // call created hook
    this._callHook('created');

    // if `el` option is passed, start compilation.
    if (options.el) {
      this.$mount(options.el);
    }
  };
}

var pathCache = new Cache(1000);

// actions
var APPEND = 0;
var PUSH = 1;
var INC_SUB_PATH_DEPTH = 2;
var PUSH_SUB_PATH = 3;

// states
var BEFORE_PATH = 0;
var IN_PATH = 1;
var BEFORE_IDENT = 2;
var IN_IDENT = 3;
var IN_SUB_PATH = 4;
var IN_SINGLE_QUOTE = 5;
var IN_DOUBLE_QUOTE = 6;
var AFTER_PATH = 7;
var ERROR = 8;

var pathStateMachine = [];

pathStateMachine[BEFORE_PATH] = {
  'ws': [BEFORE_PATH],
  'ident': [IN_IDENT, APPEND],
  '[': [IN_SUB_PATH],
  'eof': [AFTER_PATH]
};

pathStateMachine[IN_PATH] = {
  'ws': [IN_PATH],
  '.': [BEFORE_IDENT],
  '[': [IN_SUB_PATH],
  'eof': [AFTER_PATH]
};

pathStateMachine[BEFORE_IDENT] = {
  'ws': [BEFORE_IDENT],
  'ident': [IN_IDENT, APPEND]
};

pathStateMachine[IN_IDENT] = {
  'ident': [IN_IDENT, APPEND],
  '0': [IN_IDENT, APPEND],
  'number': [IN_IDENT, APPEND],
  'ws': [IN_PATH, PUSH],
  '.': [BEFORE_IDENT, PUSH],
  '[': [IN_SUB_PATH, PUSH],
  'eof': [AFTER_PATH, PUSH]
};

pathStateMachine[IN_SUB_PATH] = {
  "'": [IN_SINGLE_QUOTE, APPEND],
  '"': [IN_DOUBLE_QUOTE, APPEND],
  '[': [IN_SUB_PATH, INC_SUB_PATH_DEPTH],
  ']': [IN_PATH, PUSH_SUB_PATH],
  'eof': ERROR,
  'else': [IN_SUB_PATH, APPEND]
};

pathStateMachine[IN_SINGLE_QUOTE] = {
  "'": [IN_SUB_PATH, APPEND],
  'eof': ERROR,
  'else': [IN_SINGLE_QUOTE, APPEND]
};

pathStateMachine[IN_DOUBLE_QUOTE] = {
  '"': [IN_SUB_PATH, APPEND],
  'eof': ERROR,
  'else': [IN_DOUBLE_QUOTE, APPEND]
};

/**
 * Determine the type of a character in a keypath.
 *
 * @param {Char} ch
 * @return {String} type
 */

function getPathCharType(ch) {
  if (ch === undefined) {
    return 'eof';
  }

  var code = ch.charCodeAt(0);

  switch (code) {
    case 0x5B: // [
    case 0x5D: // ]
    case 0x2E: // .
    case 0x22: // "
    case 0x27: // '
    case 0x30:
      // 0
      return ch;

    case 0x5F: // _
    case 0x24:
      // $
      return 'ident';

    case 0x20: // Space
    case 0x09: // Tab
    case 0x0A: // Newline
    case 0x0D: // Return
    case 0xA0: // No-break space
    case 0xFEFF: // Byte Order Mark
    case 0x2028: // Line Separator
    case 0x2029:
      // Paragraph Separator
      return 'ws';
  }

  // a-z, A-Z
  if (code >= 0x61 && code <= 0x7A || code >= 0x41 && code <= 0x5A) {
    return 'ident';
  }

  // 1-9
  if (code >= 0x31 && code <= 0x39) {
    return 'number';
  }

  return 'else';
}

/**
 * Format a subPath, return its plain form if it is
 * a literal string or number. Otherwise prepend the
 * dynamic indicator (*).
 *
 * @param {String} path
 * @return {String}
 */

function formatSubPath(path) {
  var trimmed = path.trim();
  // invalid leading 0
  if (path.charAt(0) === '0' && isNaN(path)) {
    return false;
  }
  return isLiteral(trimmed) ? stripQuotes(trimmed) : '*' + trimmed;
}

/**
 * Parse a string path into an array of segments
 *
 * @param {String} path
 * @return {Array|undefined}
 */

function parse(path) {
  var keys = [];
  var index = -1;
  var mode = BEFORE_PATH;
  var subPathDepth = 0;
  var c, newChar, key, type, transition, action, typeMap;

  var actions = [];

  actions[PUSH] = function () {
    if (key !== undefined) {
      keys.push(key);
      key = undefined;
    }
  };

  actions[APPEND] = function () {
    if (key === undefined) {
      key = newChar;
    } else {
      key += newChar;
    }
  };

  actions[INC_SUB_PATH_DEPTH] = function () {
    actions[APPEND]();
    subPathDepth++;
  };

  actions[PUSH_SUB_PATH] = function () {
    if (subPathDepth > 0) {
      subPathDepth--;
      mode = IN_SUB_PATH;
      actions[APPEND]();
    } else {
      subPathDepth = 0;
      key = formatSubPath(key);
      if (key === false) {
        return false;
      } else {
        actions[PUSH]();
      }
    }
  };

  function maybeUnescapeQuote() {
    var nextChar = path[index + 1];
    if (mode === IN_SINGLE_QUOTE && nextChar === "'" || mode === IN_DOUBLE_QUOTE && nextChar === '"') {
      index++;
      newChar = '\\' + nextChar;
      actions[APPEND]();
      return true;
    }
  }

  while (mode != null) {
    index++;
    c = path[index];

    if (c === '\\' && maybeUnescapeQuote()) {
      continue;
    }

    type = getPathCharType(c);
    typeMap = pathStateMachine[mode];
    transition = typeMap[type] || typeMap['else'] || ERROR;

    if (transition === ERROR) {
      return; // parse error
    }

    mode = transition[0];
    action = actions[transition[1]];
    if (action) {
      newChar = transition[2];
      newChar = newChar === undefined ? c : newChar;
      if (action() === false) {
        return;
      }
    }

    if (mode === AFTER_PATH) {
      keys.raw = path;
      return keys;
    }
  }
}

/**
 * External parse that check for a cache hit first
 *
 * @param {String} path
 * @return {Array|undefined}
 */

function parsePath(path) {
  var hit = pathCache.get(path);
  if (!hit) {
    hit = parse(path);
    if (hit) {
      pathCache.put(path, hit);
    }
  }
  return hit;
}

/**
 * Get from an object from a path string
 *
 * @param {Object} obj
 * @param {String} path
 */

function getPath(obj, path) {
  return parseExpression(path).get(obj);
}

/**
 * Warn against setting non-existent root path on a vm.
 */

var warnNonExistent;
if (process.env.NODE_ENV !== 'production') {
  warnNonExistent = function (path) {
    warn('You are setting a non-existent path "' + path.raw + '" ' + 'on a vm instance. Consider pre-initializing the property ' + 'with the "data" option for more reliable reactivity ' + 'and better performance.');
  };
}

/**
 * Set on an object from a path
 *
 * @param {Object} obj
 * @param {String | Array} path
 * @param {*} val
 */

function setPath(obj, path, val) {
  var original = obj;
  if (typeof path === 'string') {
    path = parse(path);
  }
  if (!path || !isObject(obj)) {
    return false;
  }
  var last, key;
  for (var i = 0, l = path.length; i < l; i++) {
    last = obj;
    key = path[i];
    if (key.charAt(0) === '*') {
      key = parseExpression(key.slice(1)).get.call(original, original);
    }
    if (i < l - 1) {
      obj = obj[key];
      if (!isObject(obj)) {
        obj = {};
        if (process.env.NODE_ENV !== 'production' && last._isVue) {
          warnNonExistent(path);
        }
        set(last, key, obj);
      }
    } else {
      if (isArray(obj)) {
        obj.$set(key, val);
      } else if (key in obj) {
        obj[key] = val;
      } else {
        if (process.env.NODE_ENV !== 'production' && obj._isVue) {
          warnNonExistent(path);
        }
        set(obj, key, val);
      }
    }
  }
  return true;
}

var path = Object.freeze({
  parsePath: parsePath,
  getPath: getPath,
  setPath: setPath
});

var expressionCache = new Cache(1000);

var allowedKeywords = 'Math,Date,this,true,false,null,undefined,Infinity,NaN,' + 'isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,' + 'encodeURIComponent,parseInt,parseFloat';
var allowedKeywordsRE = new RegExp('^(' + allowedKeywords.replace(/,/g, '\\b|') + '\\b)');

// keywords that don't make sense inside expressions
var improperKeywords = 'break,case,class,catch,const,continue,debugger,default,' + 'delete,do,else,export,extends,finally,for,function,if,' + 'import,in,instanceof,let,return,super,switch,throw,try,' + 'var,while,with,yield,enum,await,implements,package,' + 'protected,static,interface,private,public';
var improperKeywordsRE = new RegExp('^(' + improperKeywords.replace(/,/g, '\\b|') + '\\b)');

var wsRE = /\s/g;
var newlineRE = /\n/g;
var saveRE = /[\{,]\s*[\w\$_]+\s*:|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*\$\{|\}(?:[^`\\]|\\.)*`|`(?:[^`\\]|\\.)*`)|new |typeof |void /g;
var restoreRE = /"(\d+)"/g;
var pathTestRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\]|\[\d+\]|\[[A-Za-z_$][\w$]*\])*$/;
var identRE = /[^\w$\.](?:[A-Za-z_$][\w$]*)/g;
var booleanLiteralRE = /^(?:true|false)$/;

/**
 * Save / Rewrite / Restore
 *
 * When rewriting paths found in an expression, it is
 * possible for the same letter sequences to be found in
 * strings and Object literal property keys. Therefore we
 * remove and store these parts in a temporary array, and
 * restore them after the path rewrite.
 */

var saved = [];

/**
 * Save replacer
 *
 * The save regex can match two possible cases:
 * 1. An opening object literal
 * 2. A string
 * If matched as a plain string, we need to escape its
 * newlines, since the string needs to be preserved when
 * generating the function body.
 *
 * @param {String} str
 * @param {String} isString - str if matched as a string
 * @return {String} - placeholder with index
 */

function save(str, isString) {
  var i = saved.length;
  saved[i] = isString ? str.replace(newlineRE, '\\n') : str;
  return '"' + i + '"';
}

/**
 * Path rewrite replacer
 *
 * @param {String} raw
 * @return {String}
 */

function rewrite(raw) {
  var c = raw.charAt(0);
  var path = raw.slice(1);
  if (allowedKeywordsRE.test(path)) {
    return raw;
  } else {
    path = path.indexOf('"') > -1 ? path.replace(restoreRE, restore) : path;
    return c + 'scope.' + path;
  }
}

/**
 * Restore replacer
 *
 * @param {String} str
 * @param {String} i - matched save index
 * @return {String}
 */

function restore(str, i) {
  return saved[i];
}

/**
 * Rewrite an expression, prefixing all path accessors with
 * `scope.` and generate getter/setter functions.
 *
 * @param {String} exp
 * @return {Function}
 */

function compileGetter(exp) {
  if (improperKeywordsRE.test(exp)) {
    process.env.NODE_ENV !== 'production' && warn('Avoid using reserved keywords in expression: ' + exp);
  }
  // reset state
  saved.length = 0;
  // save strings and object literal keys
  var body = exp.replace(saveRE, save).replace(wsRE, '');
  // rewrite all paths
  // pad 1 space here becaue the regex matches 1 extra char
  body = (' ' + body).replace(identRE, rewrite).replace(restoreRE, restore);
  return makeGetterFn(body);
}

/**
 * Build a getter function. Requires eval.
 *
 * We isolate the try/catch so it doesn't affect the
 * optimization of the parse function when it is not called.
 *
 * @param {String} body
 * @return {Function|undefined}
 */

function makeGetterFn(body) {
  try {
    /* eslint-disable no-new-func */
    return new Function('scope', 'return ' + body + ';');
    /* eslint-enable no-new-func */
  } catch (e) {
    process.env.NODE_ENV !== 'production' && warn('Invalid expression. ' + 'Generated function body: ' + body);
  }
}

/**
 * Compile a setter function for the expression.
 *
 * @param {String} exp
 * @return {Function|undefined}
 */

function compileSetter(exp) {
  var path = parsePath(exp);
  if (path) {
    return function (scope, val) {
      setPath(scope, path, val);
    };
  } else {
    process.env.NODE_ENV !== 'production' && warn('Invalid setter expression: ' + exp);
  }
}

/**
 * Parse an expression into re-written getter/setters.
 *
 * @param {String} exp
 * @param {Boolean} needSet
 * @return {Function}
 */

function parseExpression(exp, needSet) {
  exp = exp.trim();
  // try cache
  var hit = expressionCache.get(exp);
  if (hit) {
    if (needSet && !hit.set) {
      hit.set = compileSetter(hit.exp);
    }
    return hit;
  }
  var res = { exp: exp };
  res.get = isSimplePath(exp) && exp.indexOf('[') < 0
  // optimized super simple getter
  ? makeGetterFn('scope.' + exp)
  // dynamic getter
  : compileGetter(exp);
  if (needSet) {
    res.set = compileSetter(exp);
  }
  expressionCache.put(exp, res);
  return res;
}

/**
 * Check if an expression is a simple path.
 *
 * @param {String} exp
 * @return {Boolean}
 */

function isSimplePath(exp) {
  return pathTestRE.test(exp) &&
  // don't treat true/false as paths
  !booleanLiteralRE.test(exp) &&
  // Math constants e.g. Math.PI, Math.E etc.
  exp.slice(0, 5) !== 'Math.';
}

var expression = Object.freeze({
  parseExpression: parseExpression,
  isSimplePath: isSimplePath
});

// we have two separate queues: one for directive updates
// and one for user watcher registered via $watch().
// we want to guarantee directive updates to be called
// before user watchers so that when user watchers are
// triggered, the DOM would have already been in updated
// state.

var queueIndex;
var queue = [];
var userQueue = [];
var has = {};
var circular = {};
var waiting = false;
var internalQueueDepleted = false;

/**
 * Reset the batcher's state.
 */

function resetBatcherState() {
  queue = [];
  userQueue = [];
  has = {};
  circular = {};
  waiting = internalQueueDepleted = false;
}

/**
 * Flush both queues and run the watchers.
 */

function flushBatcherQueue() {
  runBatcherQueue(queue);
  internalQueueDepleted = true;
  runBatcherQueue(userQueue);
  // dev tool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush');
  }
  resetBatcherState();
}

/**
 * Run the watchers in a single queue.
 *
 * @param {Array} queue
 */

function runBatcherQueue(queue) {
  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  for (queueIndex = 0; queueIndex < queue.length; queueIndex++) {
    var watcher = queue[queueIndex];
    var id = watcher.id;
    has[id] = null;
    watcher.run();
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1;
      if (circular[id] > config._maxUpdateCount) {
        queue.splice(has[id], 1);
        warn('You may have an infinite update loop for watcher ' + 'with expression: ' + watcher.expression);
      }
    }
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 *
 * @param {Watcher} watcher
 *   properties:
 *   - {Number} id
 *   - {Function} run
 */

function pushWatcher(watcher) {
  var id = watcher.id;
  if (has[id] == null) {
    if (internalQueueDepleted && !watcher.user) {
      // an internal watcher triggered by a user watcher...
      // let's run it immediately after current user watcher is done.
      userQueue.splice(queueIndex + 1, 0, watcher);
    } else {
      // push watcher into appropriate queue
      var q = watcher.user ? userQueue : queue;
      has[id] = q.length;
      q.push(watcher);
      // queue the flush
      if (!waiting) {
        waiting = true;
        nextTick(flushBatcherQueue);
      }
    }
  }
}

var uid$2 = 0;

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 *
 * @param {Vue} vm
 * @param {String} expression
 * @param {Function} cb
 * @param {Object} options
 *                 - {Array} filters
 *                 - {Boolean} twoWay
 *                 - {Boolean} deep
 *                 - {Boolean} user
 *                 - {Boolean} sync
 *                 - {Boolean} lazy
 *                 - {Function} [preProcess]
 *                 - {Function} [postProcess]
 * @constructor
 */
function Watcher(vm, expOrFn, cb, options) {
  // mix in options
  if (options) {
    extend(this, options);
  }
  var isFn = typeof expOrFn === 'function';
  this.vm = vm;
  vm._watchers.push(this);
  this.expression = expOrFn;
  this.cb = cb;
  this.id = ++uid$2; // uid for batching
  this.active = true;
  this.dirty = this.lazy; // for lazy watchers
  this.deps = [];
  this.newDeps = [];
  this.depIds = Object.create(null);
  this.newDepIds = null;
  this.prevError = null; // for async error stacks
  // parse expression for getter/setter
  if (isFn) {
    this.getter = expOrFn;
    this.setter = undefined;
  } else {
    var res = parseExpression(expOrFn, this.twoWay);
    this.getter = res.get;
    this.setter = res.set;
  }
  this.value = this.lazy ? undefined : this.get();
  // state for avoiding false triggers for deep and Array
  // watchers during vm._digest()
  this.queued = this.shallow = false;
}

/**
 * Evaluate the getter, and re-collect dependencies.
 */

Watcher.prototype.get = function () {
  this.beforeGet();
  var scope = this.scope || this.vm;
  var value;
  try {
    value = this.getter.call(scope, scope);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production' && config.warnExpressionErrors) {
      warn('Error when evaluating expression "' + this.expression + '". ' + (config.debug ? '' : 'Turn on debug mode to see stack trace.'), e);
    }
  }
  // "touch" every property so they are all tracked as
  // dependencies for deep watching
  if (this.deep) {
    traverse(value);
  }
  if (this.preProcess) {
    value = this.preProcess(value);
  }
  if (this.filters) {
    value = scope._applyFilters(value, null, this.filters, false);
  }
  if (this.postProcess) {
    value = this.postProcess(value);
  }
  this.afterGet();
  return value;
};

/**
 * Set the corresponding value with the setter.
 *
 * @param {*} value
 */

Watcher.prototype.set = function (value) {
  var scope = this.scope || this.vm;
  if (this.filters) {
    value = scope._applyFilters(value, this.value, this.filters, true);
  }
  try {
    this.setter.call(scope, scope, value);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production' && config.warnExpressionErrors) {
      warn('Error when evaluating setter "' + this.expression + '"', e);
    }
  }
  // two-way sync for v-for alias
  var forContext = scope.$forContext;
  if (forContext && forContext.alias === this.expression) {
    if (forContext.filters) {
      process.env.NODE_ENV !== 'production' && warn('It seems you are using two-way binding on ' + 'a v-for alias (' + this.expression + '), and the ' + 'v-for has filters. This will not work properly. ' + 'Either remove the filters or use an array of ' + 'objects and bind to object properties instead.');
      return;
    }
    forContext._withLock(function () {
      if (scope.$key) {
        // original is an object
        forContext.rawValue[scope.$key] = value;
      } else {
        forContext.rawValue.$set(scope.$index, value);
      }
    });
  }
};

/**
 * Prepare for dependency collection.
 */

Watcher.prototype.beforeGet = function () {
  Dep.target = this;
  this.newDepIds = Object.create(null);
  this.newDeps.length = 0;
};

/**
 * Add a dependency to this directive.
 *
 * @param {Dep} dep
 */

Watcher.prototype.addDep = function (dep) {
  var id = dep.id;
  if (!this.newDepIds[id]) {
    this.newDepIds[id] = true;
    this.newDeps.push(dep);
    if (!this.depIds[id]) {
      dep.addSub(this);
    }
  }
};

/**
 * Clean up for dependency collection.
 */

Watcher.prototype.afterGet = function () {
  Dep.target = null;
  var i = this.deps.length;
  while (i--) {
    var dep = this.deps[i];
    if (!this.newDepIds[dep.id]) {
      dep.removeSub(this);
    }
  }
  this.depIds = this.newDepIds;
  var tmp = this.deps;
  this.deps = this.newDeps;
  this.newDeps = tmp;
};

/**
 * Subscriber interface.
 * Will be called when a dependency changes.
 *
 * @param {Boolean} shallow
 */

Watcher.prototype.update = function (shallow) {
  if (this.lazy) {
    this.dirty = true;
  } else if (this.sync || !config.async) {
    this.run();
  } else {
    // if queued, only overwrite shallow with non-shallow,
    // but not the other way around.
    this.shallow = this.queued ? shallow ? this.shallow : false : !!shallow;
    this.queued = true;
    // record before-push error stack in debug mode
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.debug) {
      this.prevError = new Error('[vue] async stack trace');
    }
    pushWatcher(this);
  }
};

/**
 * Batcher job interface.
 * Will be called by the batcher.
 */

Watcher.prototype.run = function () {
  if (this.active) {
    var value = this.get();
    if (value !== this.value ||
    // Deep watchers and watchers on Object/Arrays should fire even
    // when the value is the same, because the value may
    // have mutated; but only do so if this is a
    // non-shallow update (caused by a vm digest).
    (isObject(value) || this.deep) && !this.shallow) {
      // set new value
      var oldValue = this.value;
      this.value = value;
      // in debug + async mode, when a watcher callbacks
      // throws, we also throw the saved before-push error
      // so the full cross-tick stack trace is available.
      var prevError = this.prevError;
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.debug && prevError) {
        this.prevError = null;
        try {
          this.cb.call(this.vm, value, oldValue);
        } catch (e) {
          nextTick(function () {
            throw prevError;
          }, 0);
          throw e;
        }
      } else {
        this.cb.call(this.vm, value, oldValue);
      }
    }
    this.queued = this.shallow = false;
  }
};

/**
 * Evaluate the value of the watcher.
 * This only gets called for lazy watchers.
 */

Watcher.prototype.evaluate = function () {
  // avoid overwriting another watcher that is being
  // collected.
  var current = Dep.target;
  this.value = this.get();
  this.dirty = false;
  Dep.target = current;
};

/**
 * Depend on all deps collected by this watcher.
 */

Watcher.prototype.depend = function () {
  var i = this.deps.length;
  while (i--) {
    this.deps[i].depend();
  }
};

/**
 * Remove self from all dependencies' subcriber list.
 */

Watcher.prototype.teardown = function () {
  if (this.active) {
    // remove self from vm's watcher list
    // this is a somewhat expensive operation so we skip it
    // if the vm is being destroyed or is performing a v-for
    // re-render (the watcher list is then filtered by v-for).
    if (!this.vm._isBeingDestroyed && !this.vm._vForRemoving) {
      this.vm._watchers.$remove(this);
    }
    var i = this.deps.length;
    while (i--) {
      this.deps[i].removeSub(this);
    }
    this.active = false;
    this.vm = this.cb = this.value = null;
  }
};

/**
 * Recrusively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 *
 * @param {*} val
 */

function traverse(val) {
  var i, keys;
  if (isArray(val)) {
    i = val.length;
    while (i--) traverse(val[i]);
  } else if (isObject(val)) {
    keys = Object.keys(val);
    i = keys.length;
    while (i--) traverse(val[keys[i]]);
  }
}

var text$1 = {

  bind: function bind() {
    this.attr = this.el.nodeType === 3 ? 'data' : 'textContent';
  },

  update: function update(value) {
    this.el[this.attr] = _toString(value);
  }
};

var templateCache = new Cache(1000);
var idSelectorCache = new Cache(1000);

var map = {
  efault: [0, '', ''],
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>']
};

map.td = map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

map.option = map.optgroup = [1, '<select multiple="multiple">', '</select>'];

map.thead = map.tbody = map.colgroup = map.caption = map.tfoot = [1, '<table>', '</table>'];

map.g = map.defs = map.symbol = map.use = map.image = map.text = map.circle = map.ellipse = map.line = map.path = map.polygon = map.polyline = map.rect = [1, '<svg ' + 'xmlns="http://www.w3.org/2000/svg" ' + 'xmlns:xlink="http://www.w3.org/1999/xlink" ' + 'xmlns:ev="http://www.w3.org/2001/xml-events"' + 'version="1.1">', '</svg>'];

/**
 * Check if a node is a supported template node with a
 * DocumentFragment content.
 *
 * @param {Node} node
 * @return {Boolean}
 */

function isRealTemplate(node) {
  return isTemplate(node) && isFragment(node.content);
}

var tagRE$1 = /<([\w:-]+)/;
var entityRE = /&#?\w+?;/;

/**
 * Convert a string template to a DocumentFragment.
 * Determines correct wrapping by tag types. Wrapping
 * strategy found in jQuery & component/domify.
 *
 * @param {String} templateString
 * @param {Boolean} raw
 * @return {DocumentFragment}
 */

function stringToFragment(templateString, raw) {
  // try a cache hit first
  var cacheKey = raw ? templateString : templateString.trim();
  var hit = templateCache.get(cacheKey);
  if (hit) {
    return hit;
  }

  var frag = document.createDocumentFragment();
  var tagMatch = templateString.match(tagRE$1);
  var entityMatch = entityRE.test(templateString);

  if (!tagMatch && !entityMatch) {
    // text only, return a single text node.
    frag.appendChild(document.createTextNode(templateString));
  } else {
    var tag = tagMatch && tagMatch[1];
    var wrap = map[tag] || map.efault;
    var depth = wrap[0];
    var prefix = wrap[1];
    var suffix = wrap[2];
    var node = document.createElement('div');

    node.innerHTML = prefix + templateString + suffix;
    while (depth--) {
      node = node.lastChild;
    }

    var child;
    /* eslint-disable no-cond-assign */
    while (child = node.firstChild) {
      /* eslint-enable no-cond-assign */
      frag.appendChild(child);
    }
  }
  if (!raw) {
    trimNode(frag);
  }
  templateCache.put(cacheKey, frag);
  return frag;
}

/**
 * Convert a template node to a DocumentFragment.
 *
 * @param {Node} node
 * @return {DocumentFragment}
 */

function nodeToFragment(node) {
  // if its a template tag and the browser supports it,
  // its content is already a document fragment.
  if (isRealTemplate(node)) {
    trimNode(node.content);
    return node.content;
  }
  // script template
  if (node.tagName === 'SCRIPT') {
    return stringToFragment(node.textContent);
  }
  // normal node, clone it to avoid mutating the original
  var clonedNode = cloneNode(node);
  var frag = document.createDocumentFragment();
  var child;
  /* eslint-disable no-cond-assign */
  while (child = clonedNode.firstChild) {
    /* eslint-enable no-cond-assign */
    frag.appendChild(child);
  }
  trimNode(frag);
  return frag;
}

// Test for the presence of the Safari template cloning bug
// https://bugs.webkit.org/showug.cgi?id=137755
var hasBrokenTemplate = (function () {
  /* istanbul ignore else */
  if (inBrowser) {
    var a = document.createElement('div');
    a.innerHTML = '<template>1</template>';
    return !a.cloneNode(true).firstChild.innerHTML;
  } else {
    return false;
  }
})();

// Test for IE10/11 textarea placeholder clone bug
var hasTextareaCloneBug = (function () {
  /* istanbul ignore else */
  if (inBrowser) {
    var t = document.createElement('textarea');
    t.placeholder = 't';
    return t.cloneNode(true).value === 't';
  } else {
    return false;
  }
})();

/**
 * 1. Deal with Safari cloning nested <template> bug by
 *    manually cloning all template instances.
 * 2. Deal with IE10/11 textarea placeholder bug by setting
 *    the correct value after cloning.
 *
 * @param {Element|DocumentFragment} node
 * @return {Element|DocumentFragment}
 */

function cloneNode(node) {
  /* istanbul ignore if */
  if (!node.querySelectorAll) {
    return node.cloneNode();
  }
  var res = node.cloneNode(true);
  var i, original, cloned;
  /* istanbul ignore if */
  if (hasBrokenTemplate) {
    var tempClone = res;
    if (isRealTemplate(node)) {
      node = node.content;
      tempClone = res.content;
    }
    original = node.querySelectorAll('template');
    if (original.length) {
      cloned = tempClone.querySelectorAll('template');
      i = cloned.length;
      while (i--) {
        cloned[i].parentNode.replaceChild(cloneNode(original[i]), cloned[i]);
      }
    }
  }
  /* istanbul ignore if */
  if (hasTextareaCloneBug) {
    if (node.tagName === 'TEXTAREA') {
      res.value = node.value;
    } else {
      original = node.querySelectorAll('textarea');
      if (original.length) {
        cloned = res.querySelectorAll('textarea');
        i = cloned.length;
        while (i--) {
          cloned[i].value = original[i].value;
        }
      }
    }
  }
  return res;
}

/**
 * Process the template option and normalizes it into a
 * a DocumentFragment that can be used as a partial or a
 * instance template.
 *
 * @param {*} template
 *        Possible values include:
 *        - DocumentFragment object
 *        - Node object of type Template
 *        - id selector: '#some-template-id'
 *        - template string: '<div><span>{{msg}}</span></div>'
 * @param {Boolean} shouldClone
 * @param {Boolean} raw
 *        inline HTML interpolation. Do not check for id
 *        selector and keep whitespace in the string.
 * @return {DocumentFragment|undefined}
 */

function parseTemplate(template, shouldClone, raw) {
  var node, frag;

  // if the template is already a document fragment,
  // do nothing
  if (isFragment(template)) {
    trimNode(template);
    return shouldClone ? cloneNode(template) : template;
  }

  if (typeof template === 'string') {
    // id selector
    if (!raw && template.charAt(0) === '#') {
      // id selector can be cached too
      frag = idSelectorCache.get(template);
      if (!frag) {
        node = document.getElementById(template.slice(1));
        if (node) {
          frag = nodeToFragment(node);
          // save selector to cache
          idSelectorCache.put(template, frag);
        }
      }
    } else {
      // normal string template
      frag = stringToFragment(template, raw);
    }
  } else if (template.nodeType) {
    // a direct node
    frag = nodeToFragment(template);
  }

  return frag && shouldClone ? cloneNode(frag) : frag;
}

var template = Object.freeze({
  cloneNode: cloneNode,
  parseTemplate: parseTemplate
});

var html = {

  bind: function bind() {
    // a comment node means this is a binding for
    // {{{ inline unescaped html }}}
    if (this.el.nodeType === 8) {
      // hold nodes
      this.nodes = [];
      // replace the placeholder with proper anchor
      this.anchor = createAnchor('v-html');
      replace(this.el, this.anchor);
    }
  },

  update: function update(value) {
    value = _toString(value);
    if (this.nodes) {
      this.swap(value);
    } else {
      this.el.innerHTML = value;
    }
  },

  swap: function swap(value) {
    // remove old nodes
    var i = this.nodes.length;
    while (i--) {
      remove(this.nodes[i]);
    }
    // convert new value to a fragment
    // do not attempt to retrieve from id selector
    var frag = parseTemplate(value, true, true);
    // save a reference to these nodes so we can remove later
    this.nodes = toArray(frag.childNodes);
    before(frag, this.anchor);
  }
};

/**
 * Abstraction for a partially-compiled fragment.
 * Can optionally compile content with a child scope.
 *
 * @param {Function} linker
 * @param {Vue} vm
 * @param {DocumentFragment} frag
 * @param {Vue} [host]
 * @param {Object} [scope]
 */
function Fragment(linker, vm, frag, host, scope, parentFrag) {
  this.children = [];
  this.childFrags = [];
  this.vm = vm;
  this.scope = scope;
  this.inserted = false;
  this.parentFrag = parentFrag;
  if (parentFrag) {
    parentFrag.childFrags.push(this);
  }
  this.unlink = linker(vm, frag, host, scope, this);
  var single = this.single = frag.childNodes.length === 1 &&
  // do not go single mode if the only node is an anchor
  !frag.childNodes[0].__v_anchor;
  if (single) {
    this.node = frag.childNodes[0];
    this.before = singleBefore;
    this.remove = singleRemove;
  } else {
    this.node = createAnchor('fragment-start');
    this.end = createAnchor('fragment-end');
    this.frag = frag;
    prepend(this.node, frag);
    frag.appendChild(this.end);
    this.before = multiBefore;
    this.remove = multiRemove;
  }
  this.node.__v_frag = this;
}

/**
 * Call attach/detach for all components contained within
 * this fragment. Also do so recursively for all child
 * fragments.
 *
 * @param {Function} hook
 */

Fragment.prototype.callHook = function (hook) {
  var i, l;
  for (i = 0, l = this.childFrags.length; i < l; i++) {
    this.childFrags[i].callHook(hook);
  }
  for (i = 0, l = this.children.length; i < l; i++) {
    hook(this.children[i]);
  }
};

/**
 * Insert fragment before target, single node version
 *
 * @param {Node} target
 * @param {Boolean} withTransition
 */

function singleBefore(target, withTransition) {
  this.inserted = true;
  var method = withTransition !== false ? beforeWithTransition : before;
  method(this.node, target, this.vm);
  if (inDoc(this.node)) {
    this.callHook(attach);
  }
}

/**
 * Remove fragment, single node version
 */

function singleRemove() {
  this.inserted = false;
  var shouldCallRemove = inDoc(this.node);
  var self = this;
  this.beforeRemove();
  removeWithTransition(this.node, this.vm, function () {
    if (shouldCallRemove) {
      self.callHook(detach);
    }
    self.destroy();
  });
}

/**
 * Insert fragment before target, multi-nodes version
 *
 * @param {Node} target
 * @param {Boolean} withTransition
 */

function multiBefore(target, withTransition) {
  this.inserted = true;
  var vm = this.vm;
  var method = withTransition !== false ? beforeWithTransition : before;
  mapNodeRange(this.node, this.end, function (node) {
    method(node, target, vm);
  });
  if (inDoc(this.node)) {
    this.callHook(attach);
  }
}

/**
 * Remove fragment, multi-nodes version
 */

function multiRemove() {
  this.inserted = false;
  var self = this;
  var shouldCallRemove = inDoc(this.node);
  this.beforeRemove();
  removeNodeRange(this.node, this.end, this.vm, this.frag, function () {
    if (shouldCallRemove) {
      self.callHook(detach);
    }
    self.destroy();
  });
}

/**
 * Prepare the fragment for removal.
 */

Fragment.prototype.beforeRemove = function () {
  var i, l;
  for (i = 0, l = this.childFrags.length; i < l; i++) {
    // call the same method recursively on child
    // fragments, depth-first
    this.childFrags[i].beforeRemove(false);
  }
  for (i = 0, l = this.children.length; i < l; i++) {
    // Call destroy for all contained instances,
    // with remove:false and defer:true.
    // Defer is necessary because we need to
    // keep the children to call detach hooks
    // on them.
    this.children[i].$destroy(false, true);
  }
  var dirs = this.unlink.dirs;
  for (i = 0, l = dirs.length; i < l; i++) {
    // disable the watchers on all the directives
    // so that the rendered content stays the same
    // during removal.
    dirs[i]._watcher && dirs[i]._watcher.teardown();
  }
};

/**
 * Destroy the fragment.
 */

Fragment.prototype.destroy = function () {
  if (this.parentFrag) {
    this.parentFrag.childFrags.$remove(this);
  }
  this.node.__v_frag = null;
  this.unlink();
};

/**
 * Call attach hook for a Vue instance.
 *
 * @param {Vue} child
 */

function attach(child) {
  if (!child._isAttached && inDoc(child.$el)) {
    child._callHook('attached');
  }
}

/**
 * Call detach hook for a Vue instance.
 *
 * @param {Vue} child
 */

function detach(child) {
  if (child._isAttached && !inDoc(child.$el)) {
    child._callHook('detached');
  }
}

var linkerCache = new Cache(5000);

/**
 * A factory that can be used to create instances of a
 * fragment. Caches the compiled linker if possible.
 *
 * @param {Vue} vm
 * @param {Element|String} el
 */
function FragmentFactory(vm, el) {
  this.vm = vm;
  var template;
  var isString = typeof el === 'string';
  if (isString || isTemplate(el)) {
    template = parseTemplate(el, true);
  } else {
    template = document.createDocumentFragment();
    template.appendChild(el);
  }
  this.template = template;
  // linker can be cached, but only for components
  var linker;
  var cid = vm.constructor.cid;
  if (cid > 0) {
    var cacheId = cid + (isString ? el : getOuterHTML(el));
    linker = linkerCache.get(cacheId);
    if (!linker) {
      linker = compile(template, vm.$options, true);
      linkerCache.put(cacheId, linker);
    }
  } else {
    linker = compile(template, vm.$options, true);
  }
  this.linker = linker;
}

/**
 * Create a fragment instance with given host and scope.
 *
 * @param {Vue} host
 * @param {Object} scope
 * @param {Fragment} parentFrag
 */

FragmentFactory.prototype.create = function (host, scope, parentFrag) {
  var frag = cloneNode(this.template);
  return new Fragment(this.linker, this.vm, frag, host, scope, parentFrag);
};

var ON = 700;
var MODEL = 800;
var BIND = 850;
var TRANSITION = 1100;
var EL = 1500;
var COMPONENT = 1500;
var PARTIAL = 1750;
var FOR = 2000;
var IF = 2000;
var SLOT = 2100;

var uid$3 = 0;

var vFor = {

  priority: FOR,

  params: ['track-by', 'stagger', 'enter-stagger', 'leave-stagger'],

  bind: function bind() {
    // support "item in/of items" syntax
    var inMatch = this.expression.match(/(.*) (?:in|of) (.*)/);
    if (inMatch) {
      var itMatch = inMatch[1].match(/\((.*),(.*)\)/);
      if (itMatch) {
        this.iterator = itMatch[1].trim();
        this.alias = itMatch[2].trim();
      } else {
        this.alias = inMatch[1].trim();
      }
      this.expression = inMatch[2];
    }

    if (!this.alias) {
      process.env.NODE_ENV !== 'production' && warn('Alias is required in v-for.');
      return;
    }

    // uid as a cache identifier
    this.id = '__v-for__' + ++uid$3;

    // check if this is an option list,
    // so that we know if we need to update the <select>'s
    // v-model when the option list has changed.
    // because v-model has a lower priority than v-for,
    // the v-model is not bound here yet, so we have to
    // retrive it in the actual updateModel() function.
    var tag = this.el.tagName;
    this.isOption = (tag === 'OPTION' || tag === 'OPTGROUP') && this.el.parentNode.tagName === 'SELECT';

    // setup anchor nodes
    this.start = createAnchor('v-for-start');
    this.end = createAnchor('v-for-end');
    replace(this.el, this.end);
    before(this.start, this.end);

    // cache
    this.cache = Object.create(null);

    // fragment factory
    this.factory = new FragmentFactory(this.vm, this.el);
  },

  update: function update(data) {
    this.diff(data);
    this.updateRef();
    this.updateModel();
  },

  /**
   * Diff, based on new data and old data, determine the
   * minimum amount of DOM manipulations needed to make the
   * DOM reflect the new data Array.
   *
   * The algorithm diffs the new data Array by storing a
   * hidden reference to an owner vm instance on previously
   * seen data. This allows us to achieve O(n) which is
   * better than a levenshtein distance based algorithm,
   * which is O(m * n).
   *
   * @param {Array} data
   */

  diff: function diff(data) {
    // check if the Array was converted from an Object
    var item = data[0];
    var convertedFromObject = this.fromObject = isObject(item) && hasOwn(item, '$key') && hasOwn(item, '$value');

    var trackByKey = this.params.trackBy;
    var oldFrags = this.frags;
    var frags = this.frags = new Array(data.length);
    var alias = this.alias;
    var iterator = this.iterator;
    var start = this.start;
    var end = this.end;
    var inDocument = inDoc(start);
    var init = !oldFrags;
    var i, l, frag, key, value, primitive;

    // First pass, go through the new Array and fill up
    // the new frags array. If a piece of data has a cached
    // instance for it, we reuse it. Otherwise build a new
    // instance.
    for (i = 0, l = data.length; i < l; i++) {
      item = data[i];
      key = convertedFromObject ? item.$key : null;
      value = convertedFromObject ? item.$value : item;
      primitive = !isObject(value);
      frag = !init && this.getCachedFrag(value, i, key);
      if (frag) {
        // reusable fragment
        frag.reused = true;
        // update $index
        frag.scope.$index = i;
        // update $key
        if (key) {
          frag.scope.$key = key;
        }
        // update iterator
        if (iterator) {
          frag.scope[iterator] = key !== null ? key : i;
        }
        // update data for track-by, object repeat &
        // primitive values.
        if (trackByKey || convertedFromObject || primitive) {
          frag.scope[alias] = value;
        }
      } else {
        // new isntance
        frag = this.create(value, alias, i, key);
        frag.fresh = !init;
      }
      frags[i] = frag;
      if (init) {
        frag.before(end);
      }
    }

    // we're done for the initial render.
    if (init) {
      return;
    }

    // Second pass, go through the old fragments and
    // destroy those who are not reused (and remove them
    // from cache)
    var removalIndex = 0;
    var totalRemoved = oldFrags.length - frags.length;
    // when removing a large number of fragments, watcher removal
    // turns out to be a perf bottleneck, so we batch the watcher
    // removals into a single filter call!
    this.vm._vForRemoving = true;
    for (i = 0, l = oldFrags.length; i < l; i++) {
      frag = oldFrags[i];
      if (!frag.reused) {
        this.deleteCachedFrag(frag);
        this.remove(frag, removalIndex++, totalRemoved, inDocument);
      }
    }
    this.vm._vForRemoving = false;
    if (removalIndex) {
      this.vm._watchers = this.vm._watchers.filter(function (w) {
        return w.active;
      });
    }

    // Final pass, move/insert new fragments into the
    // right place.
    var targetPrev, prevEl, currentPrev;
    var insertionIndex = 0;
    for (i = 0, l = frags.length; i < l; i++) {
      frag = frags[i];
      // this is the frag that we should be after
      targetPrev = frags[i - 1];
      prevEl = targetPrev ? targetPrev.staggerCb ? targetPrev.staggerAnchor : targetPrev.end || targetPrev.node : start;
      if (frag.reused && !frag.staggerCb) {
        currentPrev = findPrevFrag(frag, start, this.id);
        if (currentPrev !== targetPrev && (!currentPrev ||
        // optimization for moving a single item.
        // thanks to suggestions by @livoras in #1807
        findPrevFrag(currentPrev, start, this.id) !== targetPrev)) {
          this.move(frag, prevEl);
        }
      } else {
        // new instance, or still in stagger.
        // insert with updated stagger index.
        this.insert(frag, insertionIndex++, prevEl, inDocument);
      }
      frag.reused = frag.fresh = false;
    }
  },

  /**
   * Create a new fragment instance.
   *
   * @param {*} value
   * @param {String} alias
   * @param {Number} index
   * @param {String} [key]
   * @return {Fragment}
   */

  create: function create(value, alias, index, key) {
    var host = this._host;
    // create iteration scope
    var parentScope = this._scope || this.vm;
    var scope = Object.create(parentScope);
    // ref holder for the scope
    scope.$refs = Object.create(parentScope.$refs);
    scope.$els = Object.create(parentScope.$els);
    // make sure point $parent to parent scope
    scope.$parent = parentScope;
    // for two-way binding on alias
    scope.$forContext = this;
    // define scope properties
    defineReactive(scope, alias, value, true /* do not observe */);
    defineReactive(scope, '$index', index);
    if (key) {
      defineReactive(scope, '$key', key);
    } else if (scope.$key) {
      // avoid accidental fallback
      def(scope, '$key', null);
    }
    if (this.iterator) {
      defineReactive(scope, this.iterator, key !== null ? key : index);
    }
    var frag = this.factory.create(host, scope, this._frag);
    frag.forId = this.id;
    this.cacheFrag(value, frag, index, key);
    return frag;
  },

  /**
   * Update the v-ref on owner vm.
   */

  updateRef: function updateRef() {
    var ref = this.descriptor.ref;
    if (!ref) return;
    var hash = (this._scope || this.vm).$refs;
    var refs;
    if (!this.fromObject) {
      refs = this.frags.map(findVmFromFrag);
    } else {
      refs = {};
      this.frags.forEach(function (frag) {
        refs[frag.scope.$key] = findVmFromFrag(frag);
      });
    }
    hash[ref] = refs;
  },

  /**
   * For option lists, update the containing v-model on
   * parent <select>.
   */

  updateModel: function updateModel() {
    if (this.isOption) {
      var parent = this.start.parentNode;
      var model = parent && parent.__v_model;
      if (model) {
        model.forceUpdate();
      }
    }
  },

  /**
   * Insert a fragment. Handles staggering.
   *
   * @param {Fragment} frag
   * @param {Number} index
   * @param {Node} prevEl
   * @param {Boolean} inDocument
   */

  insert: function insert(frag, index, prevEl, inDocument) {
    if (frag.staggerCb) {
      frag.staggerCb.cancel();
      frag.staggerCb = null;
    }
    var staggerAmount = this.getStagger(frag, index, null, 'enter');
    if (inDocument && staggerAmount) {
      // create an anchor and insert it synchronously,
      // so that we can resolve the correct order without
      // worrying about some elements not inserted yet
      var anchor = frag.staggerAnchor;
      if (!anchor) {
        anchor = frag.staggerAnchor = createAnchor('stagger-anchor');
        anchor.__v_frag = frag;
      }
      after(anchor, prevEl);
      var op = frag.staggerCb = cancellable(function () {
        frag.staggerCb = null;
        frag.before(anchor);
        remove(anchor);
      });
      setTimeout(op, staggerAmount);
    } else {
      frag.before(prevEl.nextSibling);
    }
  },

  /**
   * Remove a fragment. Handles staggering.
   *
   * @param {Fragment} frag
   * @param {Number} index
   * @param {Number} total
   * @param {Boolean} inDocument
   */

  remove: function remove(frag, index, total, inDocument) {
    if (frag.staggerCb) {
      frag.staggerCb.cancel();
      frag.staggerCb = null;
      // it's not possible for the same frag to be removed
      // twice, so if we have a pending stagger callback,
      // it means this frag is queued for enter but removed
      // before its transition started. Since it is already
      // destroyed, we can just leave it in detached state.
      return;
    }
    var staggerAmount = this.getStagger(frag, index, total, 'leave');
    if (inDocument && staggerAmount) {
      var op = frag.staggerCb = cancellable(function () {
        frag.staggerCb = null;
        frag.remove();
      });
      setTimeout(op, staggerAmount);
    } else {
      frag.remove();
    }
  },

  /**
   * Move a fragment to a new position.
   * Force no transition.
   *
   * @param {Fragment} frag
   * @param {Node} prevEl
   */

  move: function move(frag, prevEl) {
    // fix a common issue with Sortable:
    // if prevEl doesn't have nextSibling, this means it's
    // been dragged after the end anchor. Just re-position
    // the end anchor to the end of the container.
    /* istanbul ignore if */
    if (!prevEl.nextSibling) {
      this.end.parentNode.appendChild(this.end);
    }
    frag.before(prevEl.nextSibling, false);
  },

  /**
   * Cache a fragment using track-by or the object key.
   *
   * @param {*} value
   * @param {Fragment} frag
   * @param {Number} index
   * @param {String} [key]
   */

  cacheFrag: function cacheFrag(value, frag, index, key) {
    var trackByKey = this.params.trackBy;
    var cache = this.cache;
    var primitive = !isObject(value);
    var id;
    if (key || trackByKey || primitive) {
      id = trackByKey ? trackByKey === '$index' ? index : value[trackByKey] : key || value;
      if (!cache[id]) {
        cache[id] = frag;
      } else if (trackByKey !== '$index') {
        process.env.NODE_ENV !== 'production' && this.warnDuplicate(value);
      }
    } else {
      id = this.id;
      if (hasOwn(value, id)) {
        if (value[id] === null) {
          value[id] = frag;
        } else {
          process.env.NODE_ENV !== 'production' && this.warnDuplicate(value);
        }
      } else {
        def(value, id, frag);
      }
    }
    frag.raw = value;
  },

  /**
   * Get a cached fragment from the value/index/key
   *
   * @param {*} value
   * @param {Number} index
   * @param {String} key
   * @return {Fragment}
   */

  getCachedFrag: function getCachedFrag(value, index, key) {
    var trackByKey = this.params.trackBy;
    var primitive = !isObject(value);
    var frag;
    if (key || trackByKey || primitive) {
      var id = trackByKey ? trackByKey === '$index' ? index : value[trackByKey] : key || value;
      frag = this.cache[id];
    } else {
      frag = value[this.id];
    }
    if (frag && (frag.reused || frag.fresh)) {
      process.env.NODE_ENV !== 'production' && this.warnDuplicate(value);
    }
    return frag;
  },

  /**
   * Delete a fragment from cache.
   *
   * @param {Fragment} frag
   */

  deleteCachedFrag: function deleteCachedFrag(frag) {
    var value = frag.raw;
    var trackByKey = this.params.trackBy;
    var scope = frag.scope;
    var index = scope.$index;
    // fix #948: avoid accidentally fall through to
    // a parent repeater which happens to have $key.
    var key = hasOwn(scope, '$key') && scope.$key;
    var primitive = !isObject(value);
    if (trackByKey || key || primitive) {
      var id = trackByKey ? trackByKey === '$index' ? index : value[trackByKey] : key || value;
      this.cache[id] = null;
    } else {
      value[this.id] = null;
      frag.raw = null;
    }
  },

  /**
   * Get the stagger amount for an insertion/removal.
   *
   * @param {Fragment} frag
   * @param {Number} index
   * @param {Number} total
   * @param {String} type
   */

  getStagger: function getStagger(frag, index, total, type) {
    type = type + 'Stagger';
    var trans = frag.node.__v_trans;
    var hooks = trans && trans.hooks;
    var hook = hooks && (hooks[type] || hooks.stagger);
    return hook ? hook.call(frag, index, total) : index * parseInt(this.params[type] || this.params.stagger, 10);
  },

  /**
   * Pre-process the value before piping it through the
   * filters. This is passed to and called by the watcher.
   */

  _preProcess: function _preProcess(value) {
    // regardless of type, store the un-filtered raw value.
    this.rawValue = value;
    return value;
  },

  /**
   * Post-process the value after it has been piped through
   * the filters. This is passed to and called by the watcher.
   *
   * It is necessary for this to be called during the
   * wathcer's dependency collection phase because we want
   * the v-for to update when the source Object is mutated.
   */

  _postProcess: function _postProcess(value) {
    if (isArray(value)) {
      return value;
    } else if (isPlainObject(value)) {
      // convert plain object to array.
      var keys = Object.keys(value);
      var i = keys.length;
      var res = new Array(i);
      var key;
      while (i--) {
        key = keys[i];
        res[i] = {
          $key: key,
          $value: value[key]
        };
      }
      return res;
    } else {
      if (typeof value === 'number' && !isNaN(value)) {
        value = range(value);
      }
      return value || [];
    }
  },

  unbind: function unbind() {
    if (this.descriptor.ref) {
      (this._scope || this.vm).$refs[this.descriptor.ref] = null;
    }
    if (this.frags) {
      var i = this.frags.length;
      var frag;
      while (i--) {
        frag = this.frags[i];
        this.deleteCachedFrag(frag);
        frag.destroy();
      }
    }
  }
};

/**
 * Helper to find the previous element that is a fragment
 * anchor. This is necessary because a destroyed frag's
 * element could still be lingering in the DOM before its
 * leaving transition finishes, but its inserted flag
 * should have been set to false so we can skip them.
 *
 * If this is a block repeat, we want to make sure we only
 * return frag that is bound to this v-for. (see #929)
 *
 * @param {Fragment} frag
 * @param {Comment|Text} anchor
 * @param {String} id
 * @return {Fragment}
 */

function findPrevFrag(frag, anchor, id) {
  var el = frag.node.previousSibling;
  /* istanbul ignore if */
  if (!el) return;
  frag = el.__v_frag;
  while ((!frag || frag.forId !== id || !frag.inserted) && el !== anchor) {
    el = el.previousSibling;
    /* istanbul ignore if */
    if (!el) return;
    frag = el.__v_frag;
  }
  return frag;
}

/**
 * Find a vm from a fragment.
 *
 * @param {Fragment} frag
 * @return {Vue|undefined}
 */

function findVmFromFrag(frag) {
  var node = frag.node;
  // handle multi-node frag
  if (frag.end) {
    while (!node.__vue__ && node !== frag.end && node.nextSibling) {
      node = node.nextSibling;
    }
  }
  return node.__vue__;
}

/**
 * Create a range array from given number.
 *
 * @param {Number} n
 * @return {Array}
 */

function range(n) {
  var i = -1;
  var ret = new Array(Math.floor(n));
  while (++i < n) {
    ret[i] = i;
  }
  return ret;
}

if (process.env.NODE_ENV !== 'production') {
  vFor.warnDuplicate = function (value) {
    warn('Duplicate value found in v-for="' + this.descriptor.raw + '": ' + JSON.stringify(value) + '. Use track-by="$index" if ' + 'you are expecting duplicate values.');
  };
}

var vIf = {

  priority: IF,

  bind: function bind() {
    var el = this.el;
    if (!el.__vue__) {
      // check else block
      var next = el.nextElementSibling;
      if (next && getAttr(next, 'v-else') !== null) {
        remove(next);
        this.elseEl = next;
      }
      // check main block
      this.anchor = createAnchor('v-if');
      replace(el, this.anchor);
    } else {
      process.env.NODE_ENV !== 'production' && warn('v-if="' + this.expression + '" cannot be ' + 'used on an instance root element.');
      this.invalid = true;
    }
  },

  update: function update(value) {
    if (this.invalid) return;
    if (value) {
      if (!this.frag) {
        this.insert();
      }
    } else {
      this.remove();
    }
  },

  insert: function insert() {
    if (this.elseFrag) {
      this.elseFrag.remove();
      this.elseFrag = null;
    }
    // lazy init factory
    if (!this.factory) {
      this.factory = new FragmentFactory(this.vm, this.el);
    }
    this.frag = this.factory.create(this._host, this._scope, this._frag);
    this.frag.before(this.anchor);
  },

  remove: function remove() {
    if (this.frag) {
      this.frag.remove();
      this.frag = null;
    }
    if (this.elseEl && !this.elseFrag) {
      if (!this.elseFactory) {
        this.elseFactory = new FragmentFactory(this.elseEl._context || this.vm, this.elseEl);
      }
      this.elseFrag = this.elseFactory.create(this._host, this._scope, this._frag);
      this.elseFrag.before(this.anchor);
    }
  },

  unbind: function unbind() {
    if (this.frag) {
      this.frag.destroy();
    }
    if (this.elseFrag) {
      this.elseFrag.destroy();
    }
  }
};

var show = {

  bind: function bind() {
    // check else block
    var next = this.el.nextElementSibling;
    if (next && getAttr(next, 'v-else') !== null) {
      this.elseEl = next;
    }
  },

  update: function update(value) {
    this.apply(this.el, value);
    if (this.elseEl) {
      this.apply(this.elseEl, !value);
    }
  },

  apply: function apply(el, value) {
    if (inDoc(el)) {
      applyTransition(el, value ? 1 : -1, toggle, this.vm);
    } else {
      toggle();
    }
    function toggle() {
      el.style.display = value ? '' : 'none';
    }
  }
};

var text$2 = {

  bind: function bind() {
    var self = this;
    var el = this.el;
    var isRange = el.type === 'range';
    var lazy = this.params.lazy;
    var number = this.params.number;
    var debounce = this.params.debounce;

    // handle composition events.
    //   http://blog.evanyou.me/2014/01/03/composition-event/
    // skip this for Android because it handles composition
    // events quite differently. Android doesn't trigger
    // composition events for language input methods e.g.
    // Chinese, but instead triggers them for spelling
    // suggestions... (see Discussion/#162)
    var composing = false;
    if (!isAndroid && !isRange) {
      this.on('compositionstart', function () {
        composing = true;
      });
      this.on('compositionend', function () {
        composing = false;
        // in IE11 the "compositionend" event fires AFTER
        // the "input" event, so the input handler is blocked
        // at the end... have to call it here.
        //
        // #1327: in lazy mode this is unecessary.
        if (!lazy) {
          self.listener();
        }
      });
    }

    // prevent messing with the input when user is typing,
    // and force update on blur.
    this.focused = false;
    if (!isRange && !lazy) {
      this.on('focus', function () {
        self.focused = true;
      });
      this.on('blur', function () {
        self.focused = false;
        // do not sync value after fragment removal (#2017)
        if (!self._frag || self._frag.inserted) {
          self.rawListener();
        }
      });
    }

    // Now attach the main listener
    this.listener = this.rawListener = function () {
      if (composing || !self._bound) {
        return;
      }
      var val = number || isRange ? toNumber(el.value) : el.value;
      self.set(val);
      // force update on next tick to avoid lock & same value
      // also only update when user is not typing
      nextTick(function () {
        if (self._bound && !self.focused) {
          self.update(self._watcher.value);
        }
      });
    };

    // apply debounce
    if (debounce) {
      this.listener = _debounce(this.listener, debounce);
    }

    // Support jQuery events, since jQuery.trigger() doesn't
    // trigger native events in some cases and some plugins
    // rely on $.trigger()
    //
    // We want to make sure if a listener is attached using
    // jQuery, it is also removed with jQuery, that's why
    // we do the check for each directive instance and
    // store that check result on itself. This also allows
    // easier test coverage control by unsetting the global
    // jQuery variable in tests.
    this.hasjQuery = typeof jQuery === 'function';
    if (this.hasjQuery) {
      var method = jQuery.fn.on ? 'on' : 'bind';
      jQuery(el)[method]('change', this.rawListener);
      if (!lazy) {
        jQuery(el)[method]('input', this.listener);
      }
    } else {
      this.on('change', this.rawListener);
      if (!lazy) {
        this.on('input', this.listener);
      }
    }

    // IE9 doesn't fire input event on backspace/del/cut
    if (!lazy && isIE9) {
      this.on('cut', function () {
        nextTick(self.listener);
      });
      this.on('keyup', function (e) {
        if (e.keyCode === 46 || e.keyCode === 8) {
          self.listener();
        }
      });
    }

    // set initial value if present
    if (el.hasAttribute('value') || el.tagName === 'TEXTAREA' && el.value.trim()) {
      this.afterBind = this.listener;
    }
  },

  update: function update(value) {
    this.el.value = _toString(value);
  },

  unbind: function unbind() {
    var el = this.el;
    if (this.hasjQuery) {
      var method = jQuery.fn.off ? 'off' : 'unbind';
      jQuery(el)[method]('change', this.listener);
      jQuery(el)[method]('input', this.listener);
    }
  }
};

var radio = {

  bind: function bind() {
    var self = this;
    var el = this.el;

    this.getValue = function () {
      // value overwrite via v-bind:value
      if (el.hasOwnProperty('_value')) {
        return el._value;
      }
      var val = el.value;
      if (self.params.number) {
        val = toNumber(val);
      }
      return val;
    };

    this.listener = function () {
      self.set(self.getValue());
    };
    this.on('change', this.listener);

    if (el.hasAttribute('checked')) {
      this.afterBind = this.listener;
    }
  },

  update: function update(value) {
    this.el.checked = looseEqual(value, this.getValue());
  }
};

var select = {

  bind: function bind() {
    var self = this;
    var el = this.el;

    // method to force update DOM using latest value.
    this.forceUpdate = function () {
      if (self._watcher) {
        self.update(self._watcher.get());
      }
    };

    // check if this is a multiple select
    var multiple = this.multiple = el.hasAttribute('multiple');

    // attach listener
    this.listener = function () {
      var value = getValue(el, multiple);
      value = self.params.number ? isArray(value) ? value.map(toNumber) : toNumber(value) : value;
      self.set(value);
    };
    this.on('change', this.listener);

    // if has initial value, set afterBind
    var initValue = getValue(el, multiple, true);
    if (multiple && initValue.length || !multiple && initValue !== null) {
      this.afterBind = this.listener;
    }

    // All major browsers except Firefox resets
    // selectedIndex with value -1 to 0 when the element
    // is appended to a new parent, therefore we have to
    // force a DOM update whenever that happens...
    this.vm.$on('hook:attached', this.forceUpdate);
  },

  update: function update(value) {
    var el = this.el;
    el.selectedIndex = -1;
    var multi = this.multiple && isArray(value);
    var options = el.options;
    var i = options.length;
    var op, val;
    while (i--) {
      op = options[i];
      val = op.hasOwnProperty('_value') ? op._value : op.value;
      /* eslint-disable eqeqeq */
      op.selected = multi ? indexOf$1(value, val) > -1 : looseEqual(value, val);
      /* eslint-enable eqeqeq */
    }
  },

  unbind: function unbind() {
    /* istanbul ignore next */
    this.vm.$off('hook:attached', this.forceUpdate);
  }
};

/**
 * Get select value
 *
 * @param {SelectElement} el
 * @param {Boolean} multi
 * @param {Boolean} init
 * @return {Array|*}
 */

function getValue(el, multi, init) {
  var res = multi ? [] : null;
  var op, val, selected;
  for (var i = 0, l = el.options.length; i < l; i++) {
    op = el.options[i];
    selected = init ? op.hasAttribute('selected') : op.selected;
    if (selected) {
      val = op.hasOwnProperty('_value') ? op._value : op.value;
      if (multi) {
        res.push(val);
      } else {
        return val;
      }
    }
  }
  return res;
}

/**
 * Native Array.indexOf uses strict equal, but in this
 * case we need to match string/numbers with custom equal.
 *
 * @param {Array} arr
 * @param {*} val
 */

function indexOf$1(arr, val) {
  var i = arr.length;
  while (i--) {
    if (looseEqual(arr[i], val)) {
      return i;
    }
  }
  return -1;
}

var checkbox = {

  bind: function bind() {
    var self = this;
    var el = this.el;

    this.getValue = function () {
      return el.hasOwnProperty('_value') ? el._value : self.params.number ? toNumber(el.value) : el.value;
    };

    function getBooleanValue() {
      var val = el.checked;
      if (val && el.hasOwnProperty('_trueValue')) {
        return el._trueValue;
      }
      if (!val && el.hasOwnProperty('_falseValue')) {
        return el._falseValue;
      }
      return val;
    }

    this.listener = function () {
      var model = self._watcher.value;
      if (isArray(model)) {
        var val = self.getValue();
        if (el.checked) {
          if (indexOf(model, val) < 0) {
            model.push(val);
          }
        } else {
          model.$remove(val);
        }
      } else {
        self.set(getBooleanValue());
      }
    };

    this.on('change', this.listener);
    if (el.hasAttribute('checked')) {
      this.afterBind = this.listener;
    }
  },

  update: function update(value) {
    var el = this.el;
    if (isArray(value)) {
      el.checked = indexOf(value, this.getValue()) > -1;
    } else {
      if (el.hasOwnProperty('_trueValue')) {
        el.checked = looseEqual(value, el._trueValue);
      } else {
        el.checked = !!value;
      }
    }
  }
};

var handlers = {
  text: text$2,
  radio: radio,
  select: select,
  checkbox: checkbox
};

var model = {

  priority: MODEL,
  twoWay: true,
  handlers: handlers,
  params: ['lazy', 'number', 'debounce'],

  /**
   * Possible elements:
   *   <select>
   *   <textarea>
   *   <input type="*">
   *     - text
   *     - checkbox
   *     - radio
   *     - number
   */

  bind: function bind() {
    // friendly warning...
    this.checkFilters();
    if (this.hasRead && !this.hasWrite) {
      process.env.NODE_ENV !== 'production' && warn('It seems you are using a read-only filter with ' + 'v-model. You might want to use a two-way filter ' + 'to ensure correct behavior.');
    }
    var el = this.el;
    var tag = el.tagName;
    var handler;
    if (tag === 'INPUT') {
      handler = handlers[el.type] || handlers.text;
    } else if (tag === 'SELECT') {
      handler = handlers.select;
    } else if (tag === 'TEXTAREA') {
      handler = handlers.text;
    } else {
      process.env.NODE_ENV !== 'production' && warn('v-model does not support element type: ' + tag);
      return;
    }
    el.__v_model = this;
    handler.bind.call(this);
    this.update = handler.update;
    this._unbind = handler.unbind;
  },

  /**
   * Check read/write filter stats.
   */

  checkFilters: function checkFilters() {
    var filters = this.filters;
    if (!filters) return;
    var i = filters.length;
    while (i--) {
      var filter = resolveAsset(this.vm.$options, 'filters', filters[i].name);
      if (typeof filter === 'function' || filter.read) {
        this.hasRead = true;
      }
      if (filter.write) {
        this.hasWrite = true;
      }
    }
  },

  unbind: function unbind() {
    this.el.__v_model = null;
    this._unbind && this._unbind();
  }
};

// keyCode aliases
var keyCodes = {
  esc: 27,
  tab: 9,
  enter: 13,
  space: 32,
  'delete': [8, 46],
  up: 38,
  left: 37,
  right: 39,
  down: 40
};

function keyFilter(handler, keys) {
  var codes = keys.map(function (key) {
    var charCode = key.charCodeAt(0);
    if (charCode > 47 && charCode < 58) {
      return parseInt(key, 10);
    }
    if (key.length === 1) {
      charCode = key.toUpperCase().charCodeAt(0);
      if (charCode > 64 && charCode < 91) {
        return charCode;
      }
    }
    return keyCodes[key];
  });
  codes = [].concat.apply([], codes);
  return function keyHandler(e) {
    if (codes.indexOf(e.keyCode) > -1) {
      return handler.call(this, e);
    }
  };
}

function stopFilter(handler) {
  return function stopHandler(e) {
    e.stopPropagation();
    return handler.call(this, e);
  };
}

function preventFilter(handler) {
  return function preventHandler(e) {
    e.preventDefault();
    return handler.call(this, e);
  };
}

function selfFilter(handler) {
  return function selfHandler(e) {
    if (e.target === e.currentTarget) {
      return handler.call(this, e);
    }
  };
}

var on$1 = {

  priority: ON,
  acceptStatement: true,
  keyCodes: keyCodes,

  bind: function bind() {
    // deal with iframes
    if (this.el.tagName === 'IFRAME' && this.arg !== 'load') {
      var self = this;
      this.iframeBind = function () {
        on(self.el.contentWindow, self.arg, self.handler, self.modifiers.capture);
      };
      this.on('load', this.iframeBind);
    }
  },

  update: function update(handler) {
    // stub a noop for v-on with no value,
    // e.g. @mousedown.prevent
    if (!this.descriptor.raw) {
      handler = function () {};
    }

    if (typeof handler !== 'function') {
      process.env.NODE_ENV !== 'production' && warn('v-on:' + this.arg + '="' + this.expression + '" expects a function value, ' + 'got ' + handler);
      return;
    }

    // apply modifiers
    if (this.modifiers.stop) {
      handler = stopFilter(handler);
    }
    if (this.modifiers.prevent) {
      handler = preventFilter(handler);
    }
    if (this.modifiers.self) {
      handler = selfFilter(handler);
    }
    // key filter
    var keys = Object.keys(this.modifiers).filter(function (key) {
      return key !== 'stop' && key !== 'prevent' && key !== 'self';
    });
    if (keys.length) {
      handler = keyFilter(handler, keys);
    }

    this.reset();
    this.handler = handler;

    if (this.iframeBind) {
      this.iframeBind();
    } else {
      on(this.el, this.arg, this.handler, this.modifiers.capture);
    }
  },

  reset: function reset() {
    var el = this.iframeBind ? this.el.contentWindow : this.el;
    if (this.handler) {
      off(el, this.arg, this.handler);
    }
  },

  unbind: function unbind() {
    this.reset();
  }
};

var prefixes = ['-webkit-', '-moz-', '-ms-'];
var camelPrefixes = ['Webkit', 'Moz', 'ms'];
var importantRE = /!important;?$/;
var propCache = Object.create(null);

var testEl = null;

var style = {

  deep: true,

  update: function update(value) {
    if (typeof value === 'string') {
      this.el.style.cssText = value;
    } else if (isArray(value)) {
      this.handleObject(value.reduce(extend, {}));
    } else {
      this.handleObject(value || {});
    }
  },

  handleObject: function handleObject(value) {
    // cache object styles so that only changed props
    // are actually updated.
    var cache = this.cache || (this.cache = {});
    var name, val;
    for (name in cache) {
      if (!(name in value)) {
        this.handleSingle(name, null);
        delete cache[name];
      }
    }
    for (name in value) {
      val = value[name];
      if (val !== cache[name]) {
        cache[name] = val;
        this.handleSingle(name, val);
      }
    }
  },

  handleSingle: function handleSingle(prop, value) {
    prop = normalize(prop);
    if (!prop) return; // unsupported prop
    // cast possible numbers/booleans into strings
    if (value != null) value += '';
    if (value) {
      var isImportant = importantRE.test(value) ? 'important' : '';
      if (isImportant) {
        value = value.replace(importantRE, '').trim();
      }
      this.el.style.setProperty(prop, value, isImportant);
    } else {
      this.el.style.removeProperty(prop);
    }
  }

};

/**
 * Normalize a CSS property name.
 * - cache result
 * - auto prefix
 * - camelCase -> dash-case
 *
 * @param {String} prop
 * @return {String}
 */

function normalize(prop) {
  if (propCache[prop]) {
    return propCache[prop];
  }
  var res = prefix(prop);
  propCache[prop] = propCache[res] = res;
  return res;
}

/**
 * Auto detect the appropriate prefix for a CSS property.
 * https://gist.github.com/paulirish/523692
 *
 * @param {String} prop
 * @return {String}
 */

function prefix(prop) {
  prop = hyphenate(prop);
  var camel = camelize(prop);
  var upper = camel.charAt(0).toUpperCase() + camel.slice(1);
  if (!testEl) {
    testEl = document.createElement('div');
  }
  var i = prefixes.length;
  var prefixed;
  while (i--) {
    prefixed = camelPrefixes[i] + upper;
    if (prefixed in testEl.style) {
      return prefixes[i] + prop;
    }
  }
  if (camel in testEl.style) {
    return prop;
  }
}

// xlink
var xlinkNS = 'http://www.w3.org/1999/xlink';
var xlinkRE = /^xlink:/;

// check for attributes that prohibit interpolations
var disallowedInterpAttrRE = /^v-|^:|^@|^(?:is|transition|transition-mode|debounce|track-by|stagger|enter-stagger|leave-stagger)$/;
// these attributes should also set their corresponding properties
// because they only affect the initial state of the element
var attrWithPropsRE = /^(?:value|checked|selected|muted)$/;
// these attributes expect enumrated values of "true" or "false"
// but are not boolean attributes
var enumeratedAttrRE = /^(?:draggable|contenteditable|spellcheck)$/;

// these attributes should set a hidden property for
// binding v-model to object values
var modelProps = {
  value: '_value',
  'true-value': '_trueValue',
  'false-value': '_falseValue'
};

var bind$1 = {

  priority: BIND,

  bind: function bind() {
    var attr = this.arg;
    var tag = this.el.tagName;
    // should be deep watch on object mode
    if (!attr) {
      this.deep = true;
    }
    // handle interpolation bindings
    var descriptor = this.descriptor;
    var tokens = descriptor.interp;
    if (tokens) {
      // handle interpolations with one-time tokens
      if (descriptor.hasOneTime) {
        this.expression = tokensToExp(tokens, this._scope || this.vm);
      }

      // only allow binding on native attributes
      if (disallowedInterpAttrRE.test(attr) || attr === 'name' && (tag === 'PARTIAL' || tag === 'SLOT')) {
        process.env.NODE_ENV !== 'production' && warn(attr + '="' + descriptor.raw + '": ' + 'attribute interpolation is not allowed in Vue.js ' + 'directives and special attributes.');
        this.el.removeAttribute(attr);
        this.invalid = true;
      }

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production') {
        var raw = attr + '="' + descriptor.raw + '": ';
        // warn src
        if (attr === 'src') {
          warn(raw + 'interpolation in "src" attribute will cause ' + 'a 404 request. Use v-bind:src instead.');
        }

        // warn style
        if (attr === 'style') {
          warn(raw + 'interpolation in "style" attribute will cause ' + 'the attribute to be discarded in Internet Explorer. ' + 'Use v-bind:style instead.');
        }
      }
    }
  },

  update: function update(value) {
    if (this.invalid) {
      return;
    }
    var attr = this.arg;
    if (this.arg) {
      this.handleSingle(attr, value);
    } else {
      this.handleObject(value || {});
    }
  },

  // share object handler with v-bind:class
  handleObject: style.handleObject,

  handleSingle: function handleSingle(attr, value) {
    var el = this.el;
    var interp = this.descriptor.interp;
    if (this.modifiers.camel) {
      attr = camelize(attr);
    }
    if (!interp && attrWithPropsRE.test(attr) && attr in el) {
      el[attr] = attr === 'value' ? value == null // IE9 will set input.value to "null" for null...
      ? '' : value : value;
    }
    // set model props
    var modelProp = modelProps[attr];
    if (!interp && modelProp) {
      el[modelProp] = value;
      // update v-model if present
      var model = el.__v_model;
      if (model) {
        model.listener();
      }
    }
    // do not set value attribute for textarea
    if (attr === 'value' && el.tagName === 'TEXTAREA') {
      el.removeAttribute(attr);
      return;
    }
    // update attribute
    if (enumeratedAttrRE.test(attr)) {
      el.setAttribute(attr, value ? 'true' : 'false');
    } else if (value != null && value !== false) {
      if (attr === 'class') {
        // handle edge case #1960:
        // class interpolation should not overwrite Vue transition class
        if (el.__v_trans) {
          value += ' ' + el.__v_trans.id + '-transition';
        }
        setClass(el, value);
      } else if (xlinkRE.test(attr)) {
        el.setAttributeNS(xlinkNS, attr, value === true ? '' : value);
      } else {
        el.setAttribute(attr, value === true ? '' : value);
      }
    } else {
      el.removeAttribute(attr);
    }
  }
};

var el = {

  priority: EL,

  bind: function bind() {
    /* istanbul ignore if */
    if (!this.arg) {
      return;
    }
    var id = this.id = camelize(this.arg);
    var refs = (this._scope || this.vm).$els;
    if (hasOwn(refs, id)) {
      refs[id] = this.el;
    } else {
      defineReactive(refs, id, this.el);
    }
  },

  unbind: function unbind() {
    var refs = (this._scope || this.vm).$els;
    if (refs[this.id] === this.el) {
      refs[this.id] = null;
    }
  }
};

var ref = {
  bind: function bind() {
    process.env.NODE_ENV !== 'production' && warn('v-ref:' + this.arg + ' must be used on a child ' + 'component. Found on <' + this.el.tagName.toLowerCase() + '>.');
  }
};

var cloak = {
  bind: function bind() {
    var el = this.el;
    this.vm.$once('pre-hook:compiled', function () {
      el.removeAttribute('v-cloak');
    });
  }
};

// must export plain object
var directives = {
  text: text$1,
  html: html,
  'for': vFor,
  'if': vIf,
  show: show,
  model: model,
  on: on$1,
  bind: bind$1,
  el: el,
  ref: ref,
  cloak: cloak
};

var vClass = {

  deep: true,

  update: function update(value) {
    if (value && typeof value === 'string') {
      this.handleObject(stringToObject(value));
    } else if (isPlainObject(value)) {
      this.handleObject(value);
    } else if (isArray(value)) {
      this.handleArray(value);
    } else {
      this.cleanup();
    }
  },

  handleObject: function handleObject(value) {
    this.cleanup(value);
    var keys = this.prevKeys = Object.keys(value);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      if (value[key]) {
        addClass(this.el, key);
      } else {
        removeClass(this.el, key);
      }
    }
  },

  handleArray: function handleArray(value) {
    this.cleanup(value);
    for (var i = 0, l = value.length; i < l; i++) {
      if (value[i]) {
        addClass(this.el, value[i]);
      }
    }
    this.prevKeys = value.slice();
  },

  cleanup: function cleanup(value) {
    if (this.prevKeys) {
      var i = this.prevKeys.length;
      while (i--) {
        var key = this.prevKeys[i];
        if (key && (!value || !contains(value, key))) {
          removeClass(this.el, key);
        }
      }
    }
  }
};

function stringToObject(value) {
  var res = {};
  var keys = value.trim().split(/\s+/);
  var i = keys.length;
  while (i--) {
    res[keys[i]] = true;
  }
  return res;
}

function contains(value, key) {
  return isArray(value) ? value.indexOf(key) > -1 : hasOwn(value, key);
}

var component = {

  priority: COMPONENT,

  params: ['keep-alive', 'transition-mode', 'inline-template'],

  /**
   * Setup. Two possible usages:
   *
   * - static:
   *   <comp> or <div v-component="comp">
   *
   * - dynamic:
   *   <component :is="view">
   */

  bind: function bind() {
    if (!this.el.__vue__) {
      // keep-alive cache
      this.keepAlive = this.params.keepAlive;
      if (this.keepAlive) {
        this.cache = {};
      }
      // check inline-template
      if (this.params.inlineTemplate) {
        // extract inline template as a DocumentFragment
        this.inlineTemplate = extractContent(this.el, true);
      }
      // component resolution related state
      this.pendingComponentCb = this.Component = null;
      // transition related state
      this.pendingRemovals = 0;
      this.pendingRemovalCb = null;
      // create a ref anchor
      this.anchor = createAnchor('v-component');
      replace(this.el, this.anchor);
      // remove is attribute.
      // this is removed during compilation, but because compilation is
      // cached, when the component is used elsewhere this attribute
      // will remain at link time.
      this.el.removeAttribute('is');
      // remove ref, same as above
      if (this.descriptor.ref) {
        this.el.removeAttribute('v-ref:' + hyphenate(this.descriptor.ref));
      }
      // if static, build right now.
      if (this.literal) {
        this.setComponent(this.expression);
      }
    } else {
      process.env.NODE_ENV !== 'production' && warn('cannot mount component "' + this.expression + '" ' + 'on already mounted element: ' + this.el);
    }
  },

  /**
   * Public update, called by the watcher in the dynamic
   * literal scenario, e.g. <component :is="view">
   */

  update: function update(value) {
    if (!this.literal) {
      this.setComponent(value);
    }
  },

  /**
   * Switch dynamic components. May resolve the component
   * asynchronously, and perform transition based on
   * specified transition mode. Accepts a few additional
   * arguments specifically for vue-router.
   *
   * The callback is called when the full transition is
   * finished.
   *
   * @param {String} value
   * @param {Function} [cb]
   */

  setComponent: function setComponent(value, cb) {
    this.invalidatePending();
    if (!value) {
      // just remove current
      this.unbuild(true);
      this.remove(this.childVM, cb);
      this.childVM = null;
    } else {
      var self = this;
      this.resolveComponent(value, function () {
        self.mountComponent(cb);
      });
    }
  },

  /**
   * Resolve the component constructor to use when creating
   * the child vm.
   */

  resolveComponent: function resolveComponent(id, cb) {
    var self = this;
    this.pendingComponentCb = cancellable(function (Component) {
      self.ComponentName = Component.options.name || id;
      self.Component = Component;
      cb();
    });
    this.vm._resolveComponent(id, this.pendingComponentCb);
  },

  /**
   * Create a new instance using the current constructor and
   * replace the existing instance. This method doesn't care
   * whether the new component and the old one are actually
   * the same.
   *
   * @param {Function} [cb]
   */

  mountComponent: function mountComponent(cb) {
    // actual mount
    this.unbuild(true);
    var self = this;
    var activateHooks = this.Component.options.activate;
    var cached = this.getCached();
    var newComponent = this.build();
    if (activateHooks && !cached) {
      this.waitingFor = newComponent;
      callActivateHooks(activateHooks, newComponent, function () {
        if (self.waitingFor !== newComponent) {
          return;
        }
        self.waitingFor = null;
        self.transition(newComponent, cb);
      });
    } else {
      // update ref for kept-alive component
      if (cached) {
        newComponent._updateRef();
      }
      this.transition(newComponent, cb);
    }
  },

  /**
   * When the component changes or unbinds before an async
   * constructor is resolved, we need to invalidate its
   * pending callback.
   */

  invalidatePending: function invalidatePending() {
    if (this.pendingComponentCb) {
      this.pendingComponentCb.cancel();
      this.pendingComponentCb = null;
    }
  },

  /**
   * Instantiate/insert a new child vm.
   * If keep alive and has cached instance, insert that
   * instance; otherwise build a new one and cache it.
   *
   * @param {Object} [extraOptions]
   * @return {Vue} - the created instance
   */

  build: function build(extraOptions) {
    var cached = this.getCached();
    if (cached) {
      return cached;
    }
    if (this.Component) {
      // default options
      var options = {
        name: this.ComponentName,
        el: cloneNode(this.el),
        template: this.inlineTemplate,
        // make sure to add the child with correct parent
        // if this is a transcluded component, its parent
        // should be the transclusion host.
        parent: this._host || this.vm,
        // if no inline-template, then the compiled
        // linker can be cached for better performance.
        _linkerCachable: !this.inlineTemplate,
        _ref: this.descriptor.ref,
        _asComponent: true,
        _isRouterView: this._isRouterView,
        // if this is a transcluded component, context
        // will be the common parent vm of this instance
        // and its host.
        _context: this.vm,
        // if this is inside an inline v-for, the scope
        // will be the intermediate scope created for this
        // repeat fragment. this is used for linking props
        // and container directives.
        _scope: this._scope,
        // pass in the owner fragment of this component.
        // this is necessary so that the fragment can keep
        // track of its contained components in order to
        // call attach/detach hooks for them.
        _frag: this._frag
      };
      // extra options
      // in 1.0.0 this is used by vue-router only
      /* istanbul ignore if */
      if (extraOptions) {
        extend(options, extraOptions);
      }
      var child = new this.Component(options);
      if (this.keepAlive) {
        this.cache[this.Component.cid] = child;
      }
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && this.el.hasAttribute('transition') && child._isFragment) {
        warn('Transitions will not work on a fragment instance. ' + 'Template: ' + child.$options.template);
      }
      return child;
    }
  },

  /**
   * Try to get a cached instance of the current component.
   *
   * @return {Vue|undefined}
   */

  getCached: function getCached() {
    return this.keepAlive && this.cache[this.Component.cid];
  },

  /**
   * Teardown the current child, but defers cleanup so
   * that we can separate the destroy and removal steps.
   *
   * @param {Boolean} defer
   */

  unbuild: function unbuild(defer) {
    if (this.waitingFor) {
      this.waitingFor.$destroy();
      this.waitingFor = null;
    }
    var child = this.childVM;
    if (!child || this.keepAlive) {
      if (child) {
        // remove ref
        child._inactive = true;
        child._updateRef(true);
      }
      return;
    }
    // the sole purpose of `deferCleanup` is so that we can
    // "deactivate" the vm right now and perform DOM removal
    // later.
    child.$destroy(false, defer);
  },

  /**
   * Remove current destroyed child and manually do
   * the cleanup after removal.
   *
   * @param {Function} cb
   */

  remove: function remove(child, cb) {
    var keepAlive = this.keepAlive;
    if (child) {
      // we may have a component switch when a previous
      // component is still being transitioned out.
      // we want to trigger only one lastest insertion cb
      // when the existing transition finishes. (#1119)
      this.pendingRemovals++;
      this.pendingRemovalCb = cb;
      var self = this;
      child.$remove(function () {
        self.pendingRemovals--;
        if (!keepAlive) child._cleanup();
        if (!self.pendingRemovals && self.pendingRemovalCb) {
          self.pendingRemovalCb();
          self.pendingRemovalCb = null;
        }
      });
    } else if (cb) {
      cb();
    }
  },

  /**
   * Actually swap the components, depending on the
   * transition mode. Defaults to simultaneous.
   *
   * @param {Vue} target
   * @param {Function} [cb]
   */

  transition: function transition(target, cb) {
    var self = this;
    var current = this.childVM;
    // for devtool inspection
    if (current) current._inactive = true;
    target._inactive = false;
    this.childVM = target;
    switch (self.params.transitionMode) {
      case 'in-out':
        target.$before(self.anchor, function () {
          self.remove(current, cb);
        });
        break;
      case 'out-in':
        self.remove(current, function () {
          target.$before(self.anchor, cb);
        });
        break;
      default:
        self.remove(current);
        target.$before(self.anchor, cb);
    }
  },

  /**
   * Unbind.
   */

  unbind: function unbind() {
    this.invalidatePending();
    // Do not defer cleanup when unbinding
    this.unbuild();
    // destroy all keep-alive cached instances
    if (this.cache) {
      for (var key in this.cache) {
        this.cache[key].$destroy();
      }
      this.cache = null;
    }
  }
};

/**
 * Call activate hooks in order (asynchronous)
 *
 * @param {Array} hooks
 * @param {Vue} vm
 * @param {Function} cb
 */

function callActivateHooks(hooks, vm, cb) {
  var total = hooks.length;
  var called = 0;
  hooks[0].call(vm, next);
  function next() {
    if (++called >= total) {
      cb();
    } else {
      hooks[called].call(vm, next);
    }
  }
}

var bindingModes = config._propBindingModes;

var propDef = {

  bind: function bind() {
    var child = this.vm;
    var parent = child._context;
    // passed in from compiler directly
    var prop = this.descriptor.prop;
    var childKey = prop.path;
    var parentKey = prop.parentPath;
    var twoWay = prop.mode === bindingModes.TWO_WAY;

    var parentWatcher = this.parentWatcher = new Watcher(parent, parentKey, function (val) {
      val = coerceProp(prop, val);
      if (assertProp(prop, val)) {
        child[childKey] = val;
      }
    }, {
      twoWay: twoWay,
      filters: prop.filters,
      // important: props need to be observed on the
      // v-for scope if present
      scope: this._scope
    });

    // set the child initial value.
    initProp(child, prop, parentWatcher.value);

    // setup two-way binding
    if (twoWay) {
      // important: defer the child watcher creation until
      // the created hook (after data observation)
      var self = this;
      child.$once('pre-hook:created', function () {
        self.childWatcher = new Watcher(child, childKey, function (val) {
          parentWatcher.set(val);
        }, {
          // ensure sync upward before parent sync down.
          // this is necessary in cases e.g. the child
          // mutates a prop array, then replaces it. (#1683)
          sync: true
        });
      });
    }
  },

  unbind: function unbind() {
    this.parentWatcher.teardown();
    if (this.childWatcher) {
      this.childWatcher.teardown();
    }
  }
};

var queue$1 = [];
var queued = false;

/**
 * Push a job into the queue.
 *
 * @param {Function} job
 */

function pushJob(job) {
  queue$1.push(job);
  if (!queued) {
    queued = true;
    nextTick(flush);
  }
}

/**
 * Flush the queue, and do one forced reflow before
 * triggering transitions.
 */

function flush() {
  // Force layout
  var f = document.documentElement.offsetHeight;
  for (var i = 0; i < queue$1.length; i++) {
    queue$1[i]();
  }
  queue$1 = [];
  queued = false;
  // dummy return, so js linters don't complain about
  // unused variable f
  return f;
}

var TYPE_TRANSITION = 'transition';
var TYPE_ANIMATION = 'animation';
var transDurationProp = transitionProp + 'Duration';
var animDurationProp = animationProp + 'Duration';

/**
 * A Transition object that encapsulates the state and logic
 * of the transition.
 *
 * @param {Element} el
 * @param {String} id
 * @param {Object} hooks
 * @param {Vue} vm
 */
function Transition(el, id, hooks, vm) {
  this.id = id;
  this.el = el;
  this.enterClass = hooks && hooks.enterClass || id + '-enter';
  this.leaveClass = hooks && hooks.leaveClass || id + '-leave';
  this.hooks = hooks;
  this.vm = vm;
  // async state
  this.pendingCssEvent = this.pendingCssCb = this.cancel = this.pendingJsCb = this.op = this.cb = null;
  this.justEntered = false;
  this.entered = this.left = false;
  this.typeCache = {};
  // check css transition type
  this.type = hooks && hooks.type;
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production') {
    if (this.type && this.type !== TYPE_TRANSITION && this.type !== TYPE_ANIMATION) {
      warn('invalid CSS transition type for transition="' + this.id + '": ' + this.type);
    }
  }
  // bind
  var self = this;['enterNextTick', 'enterDone', 'leaveNextTick', 'leaveDone'].forEach(function (m) {
    self[m] = bind(self[m], self);
  });
}

var p$1 = Transition.prototype;

/**
 * Start an entering transition.
 *
 * 1. enter transition triggered
 * 2. call beforeEnter hook
 * 3. add enter class
 * 4. insert/show element
 * 5. call enter hook (with possible explicit js callback)
 * 6. reflow
 * 7. based on transition type:
 *    - transition:
 *        remove class now, wait for transitionend,
 *        then done if there's no explicit js callback.
 *    - animation:
 *        wait for animationend, remove class,
 *        then done if there's no explicit js callback.
 *    - no css transition:
 *        done now if there's no explicit js callback.
 * 8. wait for either done or js callback, then call
 *    afterEnter hook.
 *
 * @param {Function} op - insert/show the element
 * @param {Function} [cb]
 */

p$1.enter = function (op, cb) {
  this.cancelPending();
  this.callHook('beforeEnter');
  this.cb = cb;
  addClass(this.el, this.enterClass);
  op();
  this.entered = false;
  this.callHookWithCb('enter');
  if (this.entered) {
    return; // user called done synchronously.
  }
  this.cancel = this.hooks && this.hooks.enterCancelled;
  pushJob(this.enterNextTick);
};

/**
 * The "nextTick" phase of an entering transition, which is
 * to be pushed into a queue and executed after a reflow so
 * that removing the class can trigger a CSS transition.
 */

p$1.enterNextTick = function () {
  // Important hack:
  // in Chrome, if a just-entered element is applied the
  // leave class while its interpolated property still has
  // a very small value (within one frame), Chrome will
  // skip the leave transition entirely and not firing the
  // transtionend event. Therefore we need to protected
  // against such cases using a one-frame timeout.
  this.justEntered = true;
  var self = this;
  setTimeout(function () {
    self.justEntered = false;
  }, 17);

  var enterDone = this.enterDone;
  var type = this.getCssTransitionType(this.enterClass);
  if (!this.pendingJsCb) {
    if (type === TYPE_TRANSITION) {
      // trigger transition by removing enter class now
      removeClass(this.el, this.enterClass);
      this.setupCssCb(transitionEndEvent, enterDone);
    } else if (type === TYPE_ANIMATION) {
      this.setupCssCb(animationEndEvent, enterDone);
    } else {
      enterDone();
    }
  } else if (type === TYPE_TRANSITION) {
    removeClass(this.el, this.enterClass);
  }
};

/**
 * The "cleanup" phase of an entering transition.
 */

p$1.enterDone = function () {
  this.entered = true;
  this.cancel = this.pendingJsCb = null;
  removeClass(this.el, this.enterClass);
  this.callHook('afterEnter');
  if (this.cb) this.cb();
};

/**
 * Start a leaving transition.
 *
 * 1. leave transition triggered.
 * 2. call beforeLeave hook
 * 3. add leave class (trigger css transition)
 * 4. call leave hook (with possible explicit js callback)
 * 5. reflow if no explicit js callback is provided
 * 6. based on transition type:
 *    - transition or animation:
 *        wait for end event, remove class, then done if
 *        there's no explicit js callback.
 *    - no css transition:
 *        done if there's no explicit js callback.
 * 7. wait for either done or js callback, then call
 *    afterLeave hook.
 *
 * @param {Function} op - remove/hide the element
 * @param {Function} [cb]
 */

p$1.leave = function (op, cb) {
  this.cancelPending();
  this.callHook('beforeLeave');
  this.op = op;
  this.cb = cb;
  addClass(this.el, this.leaveClass);
  this.left = false;
  this.callHookWithCb('leave');
  if (this.left) {
    return; // user called done synchronously.
  }
  this.cancel = this.hooks && this.hooks.leaveCancelled;
  // only need to handle leaveDone if
  // 1. the transition is already done (synchronously called
  //    by the user, which causes this.op set to null)
  // 2. there's no explicit js callback
  if (this.op && !this.pendingJsCb) {
    // if a CSS transition leaves immediately after enter,
    // the transitionend event never fires. therefore we
    // detect such cases and end the leave immediately.
    if (this.justEntered) {
      this.leaveDone();
    } else {
      pushJob(this.leaveNextTick);
    }
  }
};

/**
 * The "nextTick" phase of a leaving transition.
 */

p$1.leaveNextTick = function () {
  var type = this.getCssTransitionType(this.leaveClass);
  if (type) {
    var event = type === TYPE_TRANSITION ? transitionEndEvent : animationEndEvent;
    this.setupCssCb(event, this.leaveDone);
  } else {
    this.leaveDone();
  }
};

/**
 * The "cleanup" phase of a leaving transition.
 */

p$1.leaveDone = function () {
  this.left = true;
  this.cancel = this.pendingJsCb = null;
  this.op();
  removeClass(this.el, this.leaveClass);
  this.callHook('afterLeave');
  if (this.cb) this.cb();
  this.op = null;
};

/**
 * Cancel any pending callbacks from a previously running
 * but not finished transition.
 */

p$1.cancelPending = function () {
  this.op = this.cb = null;
  var hasPending = false;
  if (this.pendingCssCb) {
    hasPending = true;
    off(this.el, this.pendingCssEvent, this.pendingCssCb);
    this.pendingCssEvent = this.pendingCssCb = null;
  }
  if (this.pendingJsCb) {
    hasPending = true;
    this.pendingJsCb.cancel();
    this.pendingJsCb = null;
  }
  if (hasPending) {
    removeClass(this.el, this.enterClass);
    removeClass(this.el, this.leaveClass);
  }
  if (this.cancel) {
    this.cancel.call(this.vm, this.el);
    this.cancel = null;
  }
};

/**
 * Call a user-provided synchronous hook function.
 *
 * @param {String} type
 */

p$1.callHook = function (type) {
  if (this.hooks && this.hooks[type]) {
    this.hooks[type].call(this.vm, this.el);
  }
};

/**
 * Call a user-provided, potentially-async hook function.
 * We check for the length of arguments to see if the hook
 * expects a `done` callback. If true, the transition's end
 * will be determined by when the user calls that callback;
 * otherwise, the end is determined by the CSS transition or
 * animation.
 *
 * @param {String} type
 */

p$1.callHookWithCb = function (type) {
  var hook = this.hooks && this.hooks[type];
  if (hook) {
    if (hook.length > 1) {
      this.pendingJsCb = cancellable(this[type + 'Done']);
    }
    hook.call(this.vm, this.el, this.pendingJsCb);
  }
};

/**
 * Get an element's transition type based on the
 * calculated styles.
 *
 * @param {String} className
 * @return {Number}
 */

p$1.getCssTransitionType = function (className) {
  /* istanbul ignore if */
  if (!transitionEndEvent ||
  // skip CSS transitions if page is not visible -
  // this solves the issue of transitionend events not
  // firing until the page is visible again.
  // pageVisibility API is supported in IE10+, same as
  // CSS transitions.
  document.hidden ||
  // explicit js-only transition
  this.hooks && this.hooks.css === false ||
  // element is hidden
  isHidden(this.el)) {
    return;
  }
  var type = this.type || this.typeCache[className];
  if (type) return type;
  var inlineStyles = this.el.style;
  var computedStyles = window.getComputedStyle(this.el);
  var transDuration = inlineStyles[transDurationProp] || computedStyles[transDurationProp];
  if (transDuration && transDuration !== '0s') {
    type = TYPE_TRANSITION;
  } else {
    var animDuration = inlineStyles[animDurationProp] || computedStyles[animDurationProp];
    if (animDuration && animDuration !== '0s') {
      type = TYPE_ANIMATION;
    }
  }
  if (type) {
    this.typeCache[className] = type;
  }
  return type;
};

/**
 * Setup a CSS transitionend/animationend callback.
 *
 * @param {String} event
 * @param {Function} cb
 */

p$1.setupCssCb = function (event, cb) {
  this.pendingCssEvent = event;
  var self = this;
  var el = this.el;
  var onEnd = this.pendingCssCb = function (e) {
    if (e.target === el) {
      off(el, event, onEnd);
      self.pendingCssEvent = self.pendingCssCb = null;
      if (!self.pendingJsCb && cb) {
        cb();
      }
    }
  };
  on(el, event, onEnd);
};

/**
 * Check if an element is hidden - in that case we can just
 * skip the transition alltogether.
 *
 * @param {Element} el
 * @return {Boolean}
 */

function isHidden(el) {
  if (/svg$/.test(el.namespaceURI)) {
    // SVG elements do not have offset(Width|Height)
    // so we need to check the client rect
    var rect = el.getBoundingClientRect();
    return !(rect.width || rect.height);
  } else {
    return !(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }
}

var transition$1 = {

  priority: TRANSITION,

  update: function update(id, oldId) {
    var el = this.el;
    // resolve on owner vm
    var hooks = resolveAsset(this.vm.$options, 'transitions', id);
    id = id || 'v';
    el.__v_trans = new Transition(el, id, hooks, this.vm);
    if (oldId) {
      removeClass(el, oldId + '-transition');
    }
    addClass(el, id + '-transition');
  }
};

var internalDirectives = {
  style: style,
  'class': vClass,
  component: component,
  prop: propDef,
  transition: transition$1
};

var propBindingModes = config._propBindingModes;
var empty = {};

// regexes
var identRE$1 = /^[$_a-zA-Z]+[\w$]*$/;
var settablePathRE = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\[[^\[\]]+\])*$/;

/**
 * Compile props on a root element and return
 * a props link function.
 *
 * @param {Element|DocumentFragment} el
 * @param {Array} propOptions
 * @return {Function} propsLinkFn
 */

function compileProps(el, propOptions) {
  var props = [];
  var names = Object.keys(propOptions);
  var i = names.length;
  var options, name, attr, value, path, parsed, prop;
  while (i--) {
    name = names[i];
    options = propOptions[name] || empty;

    if (process.env.NODE_ENV !== 'production' && name === '$data') {
      warn('Do not use $data as prop.');
      continue;
    }

    // props could contain dashes, which will be
    // interpreted as minus calculations by the parser
    // so we need to camelize the path here
    path = camelize(name);
    if (!identRE$1.test(path)) {
      process.env.NODE_ENV !== 'production' && warn('Invalid prop key: "' + name + '". Prop keys ' + 'must be valid identifiers.');
      continue;
    }

    prop = {
      name: name,
      path: path,
      options: options,
      mode: propBindingModes.ONE_WAY,
      raw: null
    };

    attr = hyphenate(name);
    // first check dynamic version
    if ((value = getBindAttr(el, attr)) === null) {
      if ((value = getBindAttr(el, attr + '.sync')) !== null) {
        prop.mode = propBindingModes.TWO_WAY;
      } else if ((value = getBindAttr(el, attr + '.once')) !== null) {
        prop.mode = propBindingModes.ONE_TIME;
      }
    }
    if (value !== null) {
      // has dynamic binding!
      prop.raw = value;
      parsed = parseDirective(value);
      value = parsed.expression;
      prop.filters = parsed.filters;
      // check binding type
      if (isLiteral(value) && !parsed.filters) {
        // for expressions containing literal numbers and
        // booleans, there's no need to setup a prop binding,
        // so we can optimize them as a one-time set.
        prop.optimizedLiteral = true;
      } else {
        prop.dynamic = true;
        // check non-settable path for two-way bindings
        if (process.env.NODE_ENV !== 'production' && prop.mode === propBindingModes.TWO_WAY && !settablePathRE.test(value)) {
          prop.mode = propBindingModes.ONE_WAY;
          warn('Cannot bind two-way prop with non-settable ' + 'parent path: ' + value);
        }
      }
      prop.parentPath = value;

      // warn required two-way
      if (process.env.NODE_ENV !== 'production' && options.twoWay && prop.mode !== propBindingModes.TWO_WAY) {
        warn('Prop "' + name + '" expects a two-way binding type.');
      }
    } else if ((value = getAttr(el, attr)) !== null) {
      // has literal binding!
      prop.raw = value;
    } else if (process.env.NODE_ENV !== 'production') {
      // check possible camelCase prop usage
      var lowerCaseName = path.toLowerCase();
      value = /[A-Z\-]/.test(name) && (el.getAttribute(lowerCaseName) || el.getAttribute(':' + lowerCaseName) || el.getAttribute('v-bind:' + lowerCaseName) || el.getAttribute(':' + lowerCaseName + '.once') || el.getAttribute('v-bind:' + lowerCaseName + '.once') || el.getAttribute(':' + lowerCaseName + '.sync') || el.getAttribute('v-bind:' + lowerCaseName + '.sync'));
      if (value) {
        warn('Possible usage error for prop `' + lowerCaseName + '` - ' + 'did you mean `' + attr + '`? HTML is case-insensitive, remember to use ' + 'kebab-case for props in templates.');
      } else if (options.required) {
        // warn missing required
        warn('Missing required prop: ' + name);
      }
    }
    // push prop
    props.push(prop);
  }
  return makePropsLinkFn(props);
}

/**
 * Build a function that applies props to a vm.
 *
 * @param {Array} props
 * @return {Function} propsLinkFn
 */

function makePropsLinkFn(props) {
  return function propsLinkFn(vm, scope) {
    // store resolved props info
    vm._props = {};
    var i = props.length;
    var prop, path, options, value, raw;
    while (i--) {
      prop = props[i];
      raw = prop.raw;
      path = prop.path;
      options = prop.options;
      vm._props[path] = prop;
      if (raw === null) {
        // initialize absent prop
        initProp(vm, prop, undefined);
      } else if (prop.dynamic) {
        // dynamic prop
        if (prop.mode === propBindingModes.ONE_TIME) {
          // one time binding
          value = (scope || vm._context || vm).$get(prop.parentPath);
          initProp(vm, prop, value);
        } else {
          if (vm._context) {
            // dynamic binding
            vm._bindDir({
              name: 'prop',
              def: propDef,
              prop: prop
            }, null, null, scope); // el, host, scope
          } else {
              // root instance
              initProp(vm, prop, vm.$get(prop.parentPath));
            }
        }
      } else if (prop.optimizedLiteral) {
        // optimized literal, cast it and just set once
        var stripped = stripQuotes(raw);
        value = stripped === raw ? toBoolean(toNumber(raw)) : stripped;
        initProp(vm, prop, value);
      } else {
        // string literal, but we need to cater for
        // Boolean props with no value
        value = options.type === Boolean && raw === '' ? true : raw;
        initProp(vm, prop, value);
      }
    }
  };
}

// special binding prefixes
var bindRE = /^v-bind:|^:/;
var onRE = /^v-on:|^@/;
var dirAttrRE = /^v-([^:]+)(?:$|:(.*)$)/;
var modifierRE = /\.[^\.]+/g;
var transitionRE = /^(v-bind:|:)?transition$/;

// terminal directives
var terminalDirectives = ['for', 'if'];

// default directive priority
var DEFAULT_PRIORITY = 1000;

/**
 * Compile a template and return a reusable composite link
 * function, which recursively contains more link functions
 * inside. This top level compile function would normally
 * be called on instance root nodes, but can also be used
 * for partial compilation if the partial argument is true.
 *
 * The returned composite link function, when called, will
 * return an unlink function that tearsdown all directives
 * created during the linking phase.
 *
 * @param {Element|DocumentFragment} el
 * @param {Object} options
 * @param {Boolean} partial
 * @return {Function}
 */

function compile(el, options, partial) {
  // link function for the node itself.
  var nodeLinkFn = partial || !options._asComponent ? compileNode(el, options) : null;
  // link function for the childNodes
  var childLinkFn = !(nodeLinkFn && nodeLinkFn.terminal) && el.tagName !== 'SCRIPT' && el.hasChildNodes() ? compileNodeList(el.childNodes, options) : null;

  /**
   * A composite linker function to be called on a already
   * compiled piece of DOM, which instantiates all directive
   * instances.
   *
   * @param {Vue} vm
   * @param {Element|DocumentFragment} el
   * @param {Vue} [host] - host vm of transcluded content
   * @param {Object} [scope] - v-for scope
   * @param {Fragment} [frag] - link context fragment
   * @return {Function|undefined}
   */

  return function compositeLinkFn(vm, el, host, scope, frag) {
    // cache childNodes before linking parent, fix #657
    var childNodes = toArray(el.childNodes);
    // link
    var dirs = linkAndCapture(function compositeLinkCapturer() {
      if (nodeLinkFn) nodeLinkFn(vm, el, host, scope, frag);
      if (childLinkFn) childLinkFn(vm, childNodes, host, scope, frag);
    }, vm);
    return makeUnlinkFn(vm, dirs);
  };
}

/**
 * Apply a linker to a vm/element pair and capture the
 * directives created during the process.
 *
 * @param {Function} linker
 * @param {Vue} vm
 */

function linkAndCapture(linker, vm) {
  /* istanbul ignore if */
  if (process.env.NODE_ENV === 'production') {
    // reset directives before every capture in production
    // mode, so that when unlinking we don't need to splice
    // them out (which turns out to be a perf hit).
    // they are kept in development mode because they are
    // useful for Vue's own tests.
    vm._directives = [];
  }
  var originalDirCount = vm._directives.length;
  linker();
  var dirs = vm._directives.slice(originalDirCount);
  dirs.sort(directiveComparator);
  for (var i = 0, l = dirs.length; i < l; i++) {
    dirs[i]._bind();
  }
  return dirs;
}

/**
 * Directive priority sort comparator
 *
 * @param {Object} a
 * @param {Object} b
 */

function directiveComparator(a, b) {
  a = a.descriptor.def.priority || DEFAULT_PRIORITY;
  b = b.descriptor.def.priority || DEFAULT_PRIORITY;
  return a > b ? -1 : a === b ? 0 : 1;
}

/**
 * Linker functions return an unlink function that
 * tearsdown all directives instances generated during
 * the process.
 *
 * We create unlink functions with only the necessary
 * information to avoid retaining additional closures.
 *
 * @param {Vue} vm
 * @param {Array} dirs
 * @param {Vue} [context]
 * @param {Array} [contextDirs]
 * @return {Function}
 */

function makeUnlinkFn(vm, dirs, context, contextDirs) {
  function unlink(destroying) {
    teardownDirs(vm, dirs, destroying);
    if (context && contextDirs) {
      teardownDirs(context, contextDirs);
    }
  }
  // expose linked directives
  unlink.dirs = dirs;
  return unlink;
}

/**
 * Teardown partial linked directives.
 *
 * @param {Vue} vm
 * @param {Array} dirs
 * @param {Boolean} destroying
 */

function teardownDirs(vm, dirs, destroying) {
  var i = dirs.length;
  while (i--) {
    dirs[i]._teardown();
    if (process.env.NODE_ENV !== 'production' && !destroying) {
      vm._directives.$remove(dirs[i]);
    }
  }
}

/**
 * Compile link props on an instance.
 *
 * @param {Vue} vm
 * @param {Element} el
 * @param {Object} props
 * @param {Object} [scope]
 * @return {Function}
 */

function compileAndLinkProps(vm, el, props, scope) {
  var propsLinkFn = compileProps(el, props);
  var propDirs = linkAndCapture(function () {
    propsLinkFn(vm, scope);
  }, vm);
  return makeUnlinkFn(vm, propDirs);
}

/**
 * Compile the root element of an instance.
 *
 * 1. attrs on context container (context scope)
 * 2. attrs on the component template root node, if
 *    replace:true (child scope)
 *
 * If this is a fragment instance, we only need to compile 1.
 *
 * @param {Element} el
 * @param {Object} options
 * @param {Object} contextOptions
 * @return {Function}
 */

function compileRoot(el, options, contextOptions) {
  var containerAttrs = options._containerAttrs;
  var replacerAttrs = options._replacerAttrs;
  var contextLinkFn, replacerLinkFn;

  // only need to compile other attributes for
  // non-fragment instances
  if (el.nodeType !== 11) {
    // for components, container and replacer need to be
    // compiled separately and linked in different scopes.
    if (options._asComponent) {
      // 2. container attributes
      if (containerAttrs && contextOptions) {
        contextLinkFn = compileDirectives(containerAttrs, contextOptions);
      }
      if (replacerAttrs) {
        // 3. replacer attributes
        replacerLinkFn = compileDirectives(replacerAttrs, options);
      }
    } else {
      // non-component, just compile as a normal element.
      replacerLinkFn = compileDirectives(el.attributes, options);
    }
  } else if (process.env.NODE_ENV !== 'production' && containerAttrs) {
    // warn container directives for fragment instances
    var names = containerAttrs.filter(function (attr) {
      // allow vue-loader/vueify scoped css attributes
      return attr.name.indexOf('_v-') < 0 &&
      // allow event listeners
      !onRE.test(attr.name) &&
      // allow slots
      attr.name !== 'slot';
    }).map(function (attr) {
      return '"' + attr.name + '"';
    });
    if (names.length) {
      var plural = names.length > 1;
      warn('Attribute' + (plural ? 's ' : ' ') + names.join(', ') + (plural ? ' are' : ' is') + ' ignored on component ' + '<' + options.el.tagName.toLowerCase() + '> because ' + 'the component is a fragment instance: ' + 'http://vuejs.org/guide/components.html#Fragment_Instance');
    }
  }

  options._containerAttrs = options._replacerAttrs = null;
  return function rootLinkFn(vm, el, scope) {
    // link context scope dirs
    var context = vm._context;
    var contextDirs;
    if (context && contextLinkFn) {
      contextDirs = linkAndCapture(function () {
        contextLinkFn(context, el, null, scope);
      }, context);
    }

    // link self
    var selfDirs = linkAndCapture(function () {
      if (replacerLinkFn) replacerLinkFn(vm, el);
    }, vm);

    // return the unlink function that tearsdown context
    // container directives.
    return makeUnlinkFn(vm, selfDirs, context, contextDirs);
  };
}

/**
 * Compile a node and return a nodeLinkFn based on the
 * node type.
 *
 * @param {Node} node
 * @param {Object} options
 * @return {Function|null}
 */

function compileNode(node, options) {
  var type = node.nodeType;
  if (type === 1 && node.tagName !== 'SCRIPT') {
    return compileElement(node, options);
  } else if (type === 3 && node.data.trim()) {
    return compileTextNode(node, options);
  } else {
    return null;
  }
}

/**
 * Compile an element and return a nodeLinkFn.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Function|null}
 */

function compileElement(el, options) {
  // preprocess textareas.
  // textarea treats its text content as the initial value.
  // just bind it as an attr directive for value.
  if (el.tagName === 'TEXTAREA') {
    var tokens = parseText(el.value);
    if (tokens) {
      el.setAttribute(':value', tokensToExp(tokens));
      el.value = '';
    }
  }
  var linkFn;
  var hasAttrs = el.hasAttributes();
  // check terminal directives (for & if)
  if (hasAttrs) {
    linkFn = checkTerminalDirectives(el, options);
  }
  // check element directives
  if (!linkFn) {
    linkFn = checkElementDirectives(el, options);
  }
  // check component
  if (!linkFn) {
    linkFn = checkComponent(el, options);
  }
  // normal directives
  if (!linkFn && hasAttrs) {
    linkFn = compileDirectives(el.attributes, options);
  }
  return linkFn;
}

/**
 * Compile a textNode and return a nodeLinkFn.
 *
 * @param {TextNode} node
 * @param {Object} options
 * @return {Function|null} textNodeLinkFn
 */

function compileTextNode(node, options) {
  // skip marked text nodes
  if (node._skip) {
    return removeText;
  }

  var tokens = parseText(node.wholeText);
  if (!tokens) {
    return null;
  }

  // mark adjacent text nodes as skipped,
  // because we are using node.wholeText to compile
  // all adjacent text nodes together. This fixes
  // issues in IE where sometimes it splits up a single
  // text node into multiple ones.
  var next = node.nextSibling;
  while (next && next.nodeType === 3) {
    next._skip = true;
    next = next.nextSibling;
  }

  var frag = document.createDocumentFragment();
  var el, token;
  for (var i = 0, l = tokens.length; i < l; i++) {
    token = tokens[i];
    el = token.tag ? processTextToken(token, options) : document.createTextNode(token.value);
    frag.appendChild(el);
  }
  return makeTextNodeLinkFn(tokens, frag, options);
}

/**
 * Linker for an skipped text node.
 *
 * @param {Vue} vm
 * @param {Text} node
 */

function removeText(vm, node) {
  remove(node);
}

/**
 * Process a single text token.
 *
 * @param {Object} token
 * @param {Object} options
 * @return {Node}
 */

function processTextToken(token, options) {
  var el;
  if (token.oneTime) {
    el = document.createTextNode(token.value);
  } else {
    if (token.html) {
      el = document.createComment('v-html');
      setTokenType('html');
    } else {
      // IE will clean up empty textNodes during
      // frag.cloneNode(true), so we have to give it
      // something here...
      el = document.createTextNode(' ');
      setTokenType('text');
    }
  }
  function setTokenType(type) {
    if (token.descriptor) return;
    var parsed = parseDirective(token.value);
    token.descriptor = {
      name: type,
      def: directives[type],
      expression: parsed.expression,
      filters: parsed.filters
    };
  }
  return el;
}

/**
 * Build a function that processes a textNode.
 *
 * @param {Array<Object>} tokens
 * @param {DocumentFragment} frag
 */

function makeTextNodeLinkFn(tokens, frag) {
  return function textNodeLinkFn(vm, el, host, scope) {
    var fragClone = frag.cloneNode(true);
    var childNodes = toArray(fragClone.childNodes);
    var token, value, node;
    for (var i = 0, l = tokens.length; i < l; i++) {
      token = tokens[i];
      value = token.value;
      if (token.tag) {
        node = childNodes[i];
        if (token.oneTime) {
          value = (scope || vm).$eval(value);
          if (token.html) {
            replace(node, parseTemplate(value, true));
          } else {
            node.data = value;
          }
        } else {
          vm._bindDir(token.descriptor, node, host, scope);
        }
      }
    }
    replace(el, fragClone);
  };
}

/**
 * Compile a node list and return a childLinkFn.
 *
 * @param {NodeList} nodeList
 * @param {Object} options
 * @return {Function|undefined}
 */

function compileNodeList(nodeList, options) {
  var linkFns = [];
  var nodeLinkFn, childLinkFn, node;
  for (var i = 0, l = nodeList.length; i < l; i++) {
    node = nodeList[i];
    nodeLinkFn = compileNode(node, options);
    childLinkFn = !(nodeLinkFn && nodeLinkFn.terminal) && node.tagName !== 'SCRIPT' && node.hasChildNodes() ? compileNodeList(node.childNodes, options) : null;
    linkFns.push(nodeLinkFn, childLinkFn);
  }
  return linkFns.length ? makeChildLinkFn(linkFns) : null;
}

/**
 * Make a child link function for a node's childNodes.
 *
 * @param {Array<Function>} linkFns
 * @return {Function} childLinkFn
 */

function makeChildLinkFn(linkFns) {
  return function childLinkFn(vm, nodes, host, scope, frag) {
    var node, nodeLinkFn, childrenLinkFn;
    for (var i = 0, n = 0, l = linkFns.length; i < l; n++) {
      node = nodes[n];
      nodeLinkFn = linkFns[i++];
      childrenLinkFn = linkFns[i++];
      // cache childNodes before linking parent, fix #657
      var childNodes = toArray(node.childNodes);
      if (nodeLinkFn) {
        nodeLinkFn(vm, node, host, scope, frag);
      }
      if (childrenLinkFn) {
        childrenLinkFn(vm, childNodes, host, scope, frag);
      }
    }
  };
}

/**
 * Check for element directives (custom elements that should
 * be resovled as terminal directives).
 *
 * @param {Element} el
 * @param {Object} options
 */

function checkElementDirectives(el, options) {
  var tag = el.tagName.toLowerCase();
  if (commonTagRE.test(tag)) {
    return;
  }
  var def = resolveAsset(options, 'elementDirectives', tag);
  if (def) {
    return makeTerminalNodeLinkFn(el, tag, '', options, def);
  }
}

/**
 * Check if an element is a component. If yes, return
 * a component link function.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Function|undefined}
 */

function checkComponent(el, options) {
  var component = checkComponentAttr(el, options);
  if (component) {
    var ref = findRef(el);
    var descriptor = {
      name: 'component',
      ref: ref,
      expression: component.id,
      def: internalDirectives.component,
      modifiers: {
        literal: !component.dynamic
      }
    };
    var componentLinkFn = function componentLinkFn(vm, el, host, scope, frag) {
      if (ref) {
        defineReactive((scope || vm).$refs, ref, null);
      }
      vm._bindDir(descriptor, el, host, scope, frag);
    };
    componentLinkFn.terminal = true;
    return componentLinkFn;
  }
}

/**
 * Check an element for terminal directives in fixed order.
 * If it finds one, return a terminal link function.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Function} terminalLinkFn
 */

function checkTerminalDirectives(el, options) {
  // skip v-pre
  if (getAttr(el, 'v-pre') !== null) {
    return skip;
  }
  // skip v-else block, but only if following v-if
  if (el.hasAttribute('v-else')) {
    var prev = el.previousElementSibling;
    if (prev && prev.hasAttribute('v-if')) {
      return skip;
    }
  }
  var value, dirName;
  for (var i = 0, l = terminalDirectives.length; i < l; i++) {
    dirName = terminalDirectives[i];
    value = el.getAttribute('v-' + dirName);
    if (value != null) {
      return makeTerminalNodeLinkFn(el, dirName, value, options);
    }
  }
}

function skip() {}
skip.terminal = true;

/**
 * Build a node link function for a terminal directive.
 * A terminal link function terminates the current
 * compilation recursion and handles compilation of the
 * subtree in the directive.
 *
 * @param {Element} el
 * @param {String} dirName
 * @param {String} value
 * @param {Object} options
 * @param {Object} [def]
 * @return {Function} terminalLinkFn
 */

function makeTerminalNodeLinkFn(el, dirName, value, options, def) {
  var parsed = parseDirective(value);
  var descriptor = {
    name: dirName,
    expression: parsed.expression,
    filters: parsed.filters,
    raw: value,
    // either an element directive, or if/for
    // #2366 or custom terminal directive
    def: def || resolveAsset(options, 'directives', dirName)
  };
  // check ref for v-for and router-view
  if (dirName === 'for' || dirName === 'router-view') {
    descriptor.ref = findRef(el);
  }
  var fn = function terminalNodeLinkFn(vm, el, host, scope, frag) {
    if (descriptor.ref) {
      defineReactive((scope || vm).$refs, descriptor.ref, null);
    }
    vm._bindDir(descriptor, el, host, scope, frag);
  };
  fn.terminal = true;
  return fn;
}

/**
 * Compile the directives on an element and return a linker.
 *
 * @param {Array|NamedNodeMap} attrs
 * @param {Object} options
 * @return {Function}
 */

function compileDirectives(attrs, options) {
  var i = attrs.length;
  var dirs = [];
  var attr, name, value, rawName, rawValue, dirName, arg, modifiers, dirDef, tokens, matched;
  while (i--) {
    attr = attrs[i];
    name = rawName = attr.name;
    value = rawValue = attr.value;
    tokens = parseText(value);
    // reset arg
    arg = null;
    // check modifiers
    modifiers = parseModifiers(name);
    name = name.replace(modifierRE, '');

    // attribute interpolations
    if (tokens) {
      value = tokensToExp(tokens);
      arg = name;
      pushDir('bind', directives.bind, tokens);
      // warn against mixing mustaches with v-bind
      if (process.env.NODE_ENV !== 'production') {
        if (name === 'class' && Array.prototype.some.call(attrs, function (attr) {
          return attr.name === ':class' || attr.name === 'v-bind:class';
        })) {
          warn('class="' + rawValue + '": Do not mix mustache interpolation ' + 'and v-bind for "class" on the same element. Use one or the other.');
        }
      }
    } else

      // special attribute: transition
      if (transitionRE.test(name)) {
        modifiers.literal = !bindRE.test(name);
        pushDir('transition', internalDirectives.transition);
      } else

        // event handlers
        if (onRE.test(name)) {
          arg = name.replace(onRE, '');
          pushDir('on', directives.on);
        } else

          // attribute bindings
          if (bindRE.test(name)) {
            dirName = name.replace(bindRE, '');
            if (dirName === 'style' || dirName === 'class') {
              pushDir(dirName, internalDirectives[dirName]);
            } else {
              arg = dirName;
              pushDir('bind', directives.bind);
            }
          } else

            // normal directives
            if (matched = name.match(dirAttrRE)) {
              dirName = matched[1];
              arg = matched[2];

              // skip v-else (when used with v-show)
              if (dirName === 'else') {
                continue;
              }

              dirDef = resolveAsset(options, 'directives', dirName);

              if (process.env.NODE_ENV !== 'production') {
                assertAsset(dirDef, 'directive', dirName);
              }

              if (dirDef) {
                pushDir(dirName, dirDef);
              }
            }
  }

  /**
   * Push a directive.
   *
   * @param {String} dirName
   * @param {Object|Function} def
   * @param {Array} [interpTokens]
   */

  function pushDir(dirName, def, interpTokens) {
    var hasOneTimeToken = interpTokens && hasOneTime(interpTokens);
    var parsed = !hasOneTimeToken && parseDirective(value);
    dirs.push({
      name: dirName,
      attr: rawName,
      raw: rawValue,
      def: def,
      arg: arg,
      modifiers: modifiers,
      // conversion from interpolation strings with one-time token
      // to expression is differed until directive bind time so that we
      // have access to the actual vm context for one-time bindings.
      expression: parsed && parsed.expression,
      filters: parsed && parsed.filters,
      interp: interpTokens,
      hasOneTime: hasOneTimeToken
    });
  }

  if (dirs.length) {
    return makeNodeLinkFn(dirs);
  }
}

/**
 * Parse modifiers from directive attribute name.
 *
 * @param {String} name
 * @return {Object}
 */

function parseModifiers(name) {
  var res = Object.create(null);
  var match = name.match(modifierRE);
  if (match) {
    var i = match.length;
    while (i--) {
      res[match[i].slice(1)] = true;
    }
  }
  return res;
}

/**
 * Build a link function for all directives on a single node.
 *
 * @param {Array} directives
 * @return {Function} directivesLinkFn
 */

function makeNodeLinkFn(directives) {
  return function nodeLinkFn(vm, el, host, scope, frag) {
    // reverse apply because it's sorted low to high
    var i = directives.length;
    while (i--) {
      vm._bindDir(directives[i], el, host, scope, frag);
    }
  };
}

/**
 * Check if an interpolation string contains one-time tokens.
 *
 * @param {Array} tokens
 * @return {Boolean}
 */

function hasOneTime(tokens) {
  var i = tokens.length;
  while (i--) {
    if (tokens[i].oneTime) return true;
  }
}

var specialCharRE = /[^\w\-:\.]/;

/**
 * Process an element or a DocumentFragment based on a
 * instance option object. This allows us to transclude
 * a template node/fragment before the instance is created,
 * so the processed fragment can then be cloned and reused
 * in v-for.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Element|DocumentFragment}
 */

function transclude(el, options) {
  // extract container attributes to pass them down
  // to compiler, because they need to be compiled in
  // parent scope. we are mutating the options object here
  // assuming the same object will be used for compile
  // right after this.
  if (options) {
    options._containerAttrs = extractAttrs(el);
  }
  // for template tags, what we want is its content as
  // a documentFragment (for fragment instances)
  if (isTemplate(el)) {
    el = parseTemplate(el);
  }
  if (options) {
    if (options._asComponent && !options.template) {
      options.template = '<slot></slot>';
    }
    if (options.template) {
      options._content = extractContent(el);
      el = transcludeTemplate(el, options);
    }
  }
  if (isFragment(el)) {
    // anchors for fragment instance
    // passing in `persist: true` to avoid them being
    // discarded by IE during template cloning
    prepend(createAnchor('v-start', true), el);
    el.appendChild(createAnchor('v-end', true));
  }
  return el;
}

/**
 * Process the template option.
 * If the replace option is true this will swap the $el.
 *
 * @param {Element} el
 * @param {Object} options
 * @return {Element|DocumentFragment}
 */

function transcludeTemplate(el, options) {
  var template = options.template;
  var frag = parseTemplate(template, true);
  if (frag) {
    var replacer = frag.firstChild;
    var tag = replacer.tagName && replacer.tagName.toLowerCase();
    if (options.replace) {
      /* istanbul ignore if */
      if (el === document.body) {
        process.env.NODE_ENV !== 'production' && warn('You are mounting an instance with a template to ' + '<body>. This will replace <body> entirely. You ' + 'should probably use `replace: false` here.');
      }
      // there are many cases where the instance must
      // become a fragment instance: basically anything that
      // can create more than 1 root nodes.
      if (
      // multi-children template
      frag.childNodes.length > 1 ||
      // non-element template
      replacer.nodeType !== 1 ||
      // single nested component
      tag === 'component' || resolveAsset(options, 'components', tag) || hasBindAttr(replacer, 'is') ||
      // element directive
      resolveAsset(options, 'elementDirectives', tag) ||
      // for block
      replacer.hasAttribute('v-for') ||
      // if block
      replacer.hasAttribute('v-if')) {
        return frag;
      } else {
        options._replacerAttrs = extractAttrs(replacer);
        mergeAttrs(el, replacer);
        return replacer;
      }
    } else {
      el.appendChild(frag);
      return el;
    }
  } else {
    process.env.NODE_ENV !== 'production' && warn('Invalid template option: ' + template);
  }
}

/**
 * Helper to extract a component container's attributes
 * into a plain object array.
 *
 * @param {Element} el
 * @return {Array}
 */

function extractAttrs(el) {
  if (el.nodeType === 1 && el.hasAttributes()) {
    return toArray(el.attributes);
  }
}

/**
 * Merge the attributes of two elements, and make sure
 * the class names are merged properly.
 *
 * @param {Element} from
 * @param {Element} to
 */

function mergeAttrs(from, to) {
  var attrs = from.attributes;
  var i = attrs.length;
  var name, value;
  while (i--) {
    name = attrs[i].name;
    value = attrs[i].value;
    if (!to.hasAttribute(name) && !specialCharRE.test(name)) {
      to.setAttribute(name, value);
    } else if (name === 'class' && !parseText(value)) {
      value.trim().split(/\s+/).forEach(function (cls) {
        addClass(to, cls);
      });
    }
  }
}

/**
 * Scan and determine slot content distribution.
 * We do this during transclusion instead at compile time so that
 * the distribution is decoupled from the compilation order of
 * the slots.
 *
 * @param {Element|DocumentFragment} template
 * @param {Element} content
 * @param {Vue} vm
 */

function resolveSlots(vm, content) {
  if (!content) {
    return;
  }
  var contents = vm._slotContents = Object.create(null);
  var el, name;
  for (var i = 0, l = content.children.length; i < l; i++) {
    el = content.children[i];
    /* eslint-disable no-cond-assign */
    if (name = el.getAttribute('slot')) {
      (contents[name] || (contents[name] = [])).push(el);
    }
    /* eslint-enable no-cond-assign */
  }
  for (name in contents) {
    contents[name] = extractFragment(contents[name], content);
  }
  if (content.hasChildNodes()) {
    contents['default'] = extractFragment(content.childNodes, content);
  }
}

/**
 * Extract qualified content nodes from a node list.
 *
 * @param {NodeList} nodes
 * @return {DocumentFragment}
 */

function extractFragment(nodes, parent) {
  var frag = document.createDocumentFragment();
  nodes = toArray(nodes);
  for (var i = 0, l = nodes.length; i < l; i++) {
    var node = nodes[i];
    if (isTemplate(node) && !node.hasAttribute('v-if') && !node.hasAttribute('v-for')) {
      parent.removeChild(node);
      node = parseTemplate(node);
    }
    frag.appendChild(node);
  }
  return frag;
}



var compiler = Object.freeze({
	compile: compile,
	compileAndLinkProps: compileAndLinkProps,
	compileRoot: compileRoot,
	terminalDirectives: terminalDirectives,
	transclude: transclude,
	resolveSlots: resolveSlots
});

function stateMixin (Vue) {
  /**
   * Accessor for `$data` property, since setting $data
   * requires observing the new object and updating
   * proxied properties.
   */

  Object.defineProperty(Vue.prototype, '$data', {
    get: function get() {
      return this._data;
    },
    set: function set(newData) {
      if (newData !== this._data) {
        this._setData(newData);
      }
    }
  });

  /**
   * Setup the scope of an instance, which contains:
   * - observed data
   * - computed properties
   * - user methods
   * - meta properties
   */

  Vue.prototype._initState = function () {
    this._initProps();
    this._initMeta();
    this._initMethods();
    this._initData();
    this._initComputed();
  };

  /**
   * Initialize props.
   */

  Vue.prototype._initProps = function () {
    var options = this.$options;
    var el = options.el;
    var props = options.props;
    if (props && !el) {
      process.env.NODE_ENV !== 'production' && warn('Props will not be compiled if no `el` option is ' + 'provided at instantiation.');
    }
    // make sure to convert string selectors into element now
    el = options.el = query(el);
    this._propsUnlinkFn = el && el.nodeType === 1 && props
    // props must be linked in proper scope if inside v-for
    ? compileAndLinkProps(this, el, props, this._scope) : null;
  };

  /**
   * Initialize the data.
   */

  Vue.prototype._initData = function () {
    var dataFn = this.$options.data;
    var data = this._data = dataFn ? dataFn() : {};
    var props = this._props;
    var runtimeData = this._runtimeData ? typeof this._runtimeData === 'function' ? this._runtimeData() : this._runtimeData : null;
    // proxy data on instance
    var keys = Object.keys(data);
    var i, key;
    i = keys.length;
    while (i--) {
      key = keys[i];
      // there are two scenarios where we can proxy a data key:
      // 1. it's not already defined as a prop
      // 2. it's provided via a instantiation option AND there are no
      //    template prop present
      if (!props || !hasOwn(props, key) || runtimeData && hasOwn(runtimeData, key) && props[key].raw === null) {
        this._proxy(key);
      } else if (process.env.NODE_ENV !== 'production') {
        warn('Data field "' + key + '" is already defined ' + 'as a prop. Use prop default value instead.');
      }
    }
    // observe data
    observe(data, this);
  };

  /**
   * Swap the instance's $data. Called in $data's setter.
   *
   * @param {Object} newData
   */

  Vue.prototype._setData = function (newData) {
    newData = newData || {};
    var oldData = this._data;
    this._data = newData;
    var keys, key, i;
    // unproxy keys not present in new data
    keys = Object.keys(oldData);
    i = keys.length;
    while (i--) {
      key = keys[i];
      if (!(key in newData)) {
        this._unproxy(key);
      }
    }
    // proxy keys not already proxied,
    // and trigger change for changed values
    keys = Object.keys(newData);
    i = keys.length;
    while (i--) {
      key = keys[i];
      if (!hasOwn(this, key)) {
        // new property
        this._proxy(key);
      }
    }
    oldData.__ob__.removeVm(this);
    observe(newData, this);
    this._digest();
  };

  /**
   * Proxy a property, so that
   * vm.prop === vm._data.prop
   *
   * @param {String} key
   */

  Vue.prototype._proxy = function (key) {
    if (!isReserved(key)) {
      // need to store ref to self here
      // because these getter/setters might
      // be called by child scopes via
      // prototype inheritance.
      var self = this;
      Object.defineProperty(self, key, {
        configurable: true,
        enumerable: true,
        get: function proxyGetter() {
          return self._data[key];
        },
        set: function proxySetter(val) {
          self._data[key] = val;
        }
      });
    }
  };

  /**
   * Unproxy a property.
   *
   * @param {String} key
   */

  Vue.prototype._unproxy = function (key) {
    if (!isReserved(key)) {
      delete this[key];
    }
  };

  /**
   * Force update on every watcher in scope.
   */

  Vue.prototype._digest = function () {
    for (var i = 0, l = this._watchers.length; i < l; i++) {
      this._watchers[i].update(true); // shallow updates
    }
  };

  /**
   * Setup computed properties. They are essentially
   * special getter/setters
   */

  function noop() {}
  Vue.prototype._initComputed = function () {
    var computed = this.$options.computed;
    if (computed) {
      for (var key in computed) {
        var userDef = computed[key];
        var def = {
          enumerable: true,
          configurable: true
        };
        if (typeof userDef === 'function') {
          def.get = makeComputedGetter(userDef, this);
          def.set = noop;
        } else {
          def.get = userDef.get ? userDef.cache !== false ? makeComputedGetter(userDef.get, this) : bind(userDef.get, this) : noop;
          def.set = userDef.set ? bind(userDef.set, this) : noop;
        }
        Object.defineProperty(this, key, def);
      }
    }
  };

  function makeComputedGetter(getter, owner) {
    var watcher = new Watcher(owner, getter, null, {
      lazy: true
    });
    return function computedGetter() {
      if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      return watcher.value;
    };
  }

  /**
   * Setup instance methods. Methods must be bound to the
   * instance since they might be passed down as a prop to
   * child components.
   */

  Vue.prototype._initMethods = function () {
    var methods = this.$options.methods;
    if (methods) {
      for (var key in methods) {
        this[key] = bind(methods[key], this);
      }
    }
  };

  /**
   * Initialize meta information like $index, $key & $value.
   */

  Vue.prototype._initMeta = function () {
    var metas = this.$options._meta;
    if (metas) {
      for (var key in metas) {
        defineReactive(this, key, metas[key]);
      }
    }
  };
}

var eventRE = /^v-on:|^@/;

function eventsMixin (Vue) {
  /**
   * Setup the instance's option events & watchers.
   * If the value is a string, we pull it from the
   * instance's methods by name.
   */

  Vue.prototype._initEvents = function () {
    var options = this.$options;
    if (options._asComponent) {
      registerComponentEvents(this, options.el);
    }
    registerCallbacks(this, '$on', options.events);
    registerCallbacks(this, '$watch', options.watch);
  };

  /**
   * Register v-on events on a child component
   *
   * @param {Vue} vm
   * @param {Element} el
   */

  function registerComponentEvents(vm, el) {
    var attrs = el.attributes;
    var name, handler;
    for (var i = 0, l = attrs.length; i < l; i++) {
      name = attrs[i].name;
      if (eventRE.test(name)) {
        name = name.replace(eventRE, '');
        handler = (vm._scope || vm._context).$eval(attrs[i].value, true);
        if (typeof handler === 'function') {
          handler._fromParent = true;
          vm.$on(name.replace(eventRE), handler);
        } else if (process.env.NODE_ENV !== 'production') {
          warn('v-on:' + name + '="' + attrs[i].value + '"' + (vm.$options.name ? ' on component <' + vm.$options.name + '>' : '') + ' expects a function value, got ' + handler);
        }
      }
    }
  }

  /**
   * Register callbacks for option events and watchers.
   *
   * @param {Vue} vm
   * @param {String} action
   * @param {Object} hash
   */

  function registerCallbacks(vm, action, hash) {
    if (!hash) return;
    var handlers, key, i, j;
    for (key in hash) {
      handlers = hash[key];
      if (isArray(handlers)) {
        for (i = 0, j = handlers.length; i < j; i++) {
          register(vm, action, key, handlers[i]);
        }
      } else {
        register(vm, action, key, handlers);
      }
    }
  }

  /**
   * Helper to register an event/watch callback.
   *
   * @param {Vue} vm
   * @param {String} action
   * @param {String} key
   * @param {Function|String|Object} handler
   * @param {Object} [options]
   */

  function register(vm, action, key, handler, options) {
    var type = typeof handler;
    if (type === 'function') {
      vm[action](key, handler, options);
    } else if (type === 'string') {
      var methods = vm.$options.methods;
      var method = methods && methods[handler];
      if (method) {
        vm[action](key, method, options);
      } else {
        process.env.NODE_ENV !== 'production' && warn('Unknown method: "' + handler + '" when ' + 'registering callback for ' + action + ': "' + key + '".');
      }
    } else if (handler && type === 'object') {
      register(vm, action, key, handler.handler, handler);
    }
  }

  /**
   * Setup recursive attached/detached calls
   */

  Vue.prototype._initDOMHooks = function () {
    this.$on('hook:attached', onAttached);
    this.$on('hook:detached', onDetached);
  };

  /**
   * Callback to recursively call attached hook on children
   */

  function onAttached() {
    if (!this._isAttached) {
      this._isAttached = true;
      this.$children.forEach(callAttach);
    }
  }

  /**
   * Iterator to call attached hook
   *
   * @param {Vue} child
   */

  function callAttach(child) {
    if (!child._isAttached && inDoc(child.$el)) {
      child._callHook('attached');
    }
  }

  /**
   * Callback to recursively call detached hook on children
   */

  function onDetached() {
    if (this._isAttached) {
      this._isAttached = false;
      this.$children.forEach(callDetach);
    }
  }

  /**
   * Iterator to call detached hook
   *
   * @param {Vue} child
   */

  function callDetach(child) {
    if (child._isAttached && !inDoc(child.$el)) {
      child._callHook('detached');
    }
  }

  /**
   * Trigger all handlers for a hook
   *
   * @param {String} hook
   */

  Vue.prototype._callHook = function (hook) {
    this.$emit('pre-hook:' + hook);
    var handlers = this.$options[hook];
    if (handlers) {
      for (var i = 0, j = handlers.length; i < j; i++) {
        handlers[i].call(this);
      }
    }
    this.$emit('hook:' + hook);
  };
}

function noop() {}

/**
 * A directive links a DOM element with a piece of data,
 * which is the result of evaluating an expression.
 * It registers a watcher with the expression and calls
 * the DOM update function when a change is triggered.
 *
 * @param {String} name
 * @param {Node} el
 * @param {Vue} vm
 * @param {Object} descriptor
 *                 - {String} name
 *                 - {Object} def
 *                 - {String} expression
 *                 - {Array<Object>} [filters]
 *                 - {Boolean} literal
 *                 - {String} attr
 *                 - {String} raw
 * @param {Object} def - directive definition object
 * @param {Vue} [host] - transclusion host component
 * @param {Object} [scope] - v-for scope
 * @param {Fragment} [frag] - owner fragment
 * @constructor
 */
function Directive(descriptor, vm, el, host, scope, frag) {
  this.vm = vm;
  this.el = el;
  // copy descriptor properties
  this.descriptor = descriptor;
  this.name = descriptor.name;
  this.expression = descriptor.expression;
  this.arg = descriptor.arg;
  this.modifiers = descriptor.modifiers;
  this.filters = descriptor.filters;
  this.literal = this.modifiers && this.modifiers.literal;
  // private
  this._locked = false;
  this._bound = false;
  this._listeners = null;
  // link context
  this._host = host;
  this._scope = scope;
  this._frag = frag;
  // store directives on node in dev mode
  if (process.env.NODE_ENV !== 'production' && this.el) {
    this.el._vue_directives = this.el._vue_directives || [];
    this.el._vue_directives.push(this);
  }
}

/**
 * Initialize the directive, mixin definition properties,
 * setup the watcher, call definition bind() and update()
 * if present.
 *
 * @param {Object} def
 */

Directive.prototype._bind = function () {
  var name = this.name;
  var descriptor = this.descriptor;

  // remove attribute
  if ((name !== 'cloak' || this.vm._isCompiled) && this.el && this.el.removeAttribute) {
    var attr = descriptor.attr || 'v-' + name;
    this.el.removeAttribute(attr);
  }

  // copy def properties
  var def = descriptor.def;
  if (typeof def === 'function') {
    this.update = def;
  } else {
    extend(this, def);
  }

  // setup directive params
  this._setupParams();

  // initial bind
  if (this.bind) {
    this.bind();
  }
  this._bound = true;

  if (this.literal) {
    this.update && this.update(descriptor.raw);
  } else if ((this.expression || this.modifiers) && (this.update || this.twoWay) && !this._checkStatement()) {
    // wrapped updater for context
    var dir = this;
    if (this.update) {
      this._update = function (val, oldVal) {
        if (!dir._locked) {
          dir.update(val, oldVal);
        }
      };
    } else {
      this._update = noop;
    }
    var preProcess = this._preProcess ? bind(this._preProcess, this) : null;
    var postProcess = this._postProcess ? bind(this._postProcess, this) : null;
    var watcher = this._watcher = new Watcher(this.vm, this.expression, this._update, // callback
    {
      filters: this.filters,
      twoWay: this.twoWay,
      deep: this.deep,
      preProcess: preProcess,
      postProcess: postProcess,
      scope: this._scope
    });
    // v-model with inital inline value need to sync back to
    // model instead of update to DOM on init. They would
    // set the afterBind hook to indicate that.
    if (this.afterBind) {
      this.afterBind();
    } else if (this.update) {
      this.update(watcher.value);
    }
  }
};

/**
 * Setup all param attributes, e.g. track-by,
 * transition-mode, etc...
 */

Directive.prototype._setupParams = function () {
  if (!this.params) {
    return;
  }
  var params = this.params;
  // swap the params array with a fresh object.
  this.params = Object.create(null);
  var i = params.length;
  var key, val, mappedKey;
  while (i--) {
    key = params[i];
    mappedKey = camelize(key);
    val = getBindAttr(this.el, key);
    if (val != null) {
      // dynamic
      this._setupParamWatcher(mappedKey, val);
    } else {
      // static
      val = getAttr(this.el, key);
      if (val != null) {
        this.params[mappedKey] = val === '' ? true : val;
      }
    }
  }
};

/**
 * Setup a watcher for a dynamic param.
 *
 * @param {String} key
 * @param {String} expression
 */

Directive.prototype._setupParamWatcher = function (key, expression) {
  var self = this;
  var called = false;
  var unwatch = (this._scope || this.vm).$watch(expression, function (val, oldVal) {
    self.params[key] = val;
    // since we are in immediate mode,
    // only call the param change callbacks if this is not the first update.
    if (called) {
      var cb = self.paramWatchers && self.paramWatchers[key];
      if (cb) {
        cb.call(self, val, oldVal);
      }
    } else {
      called = true;
    }
  }, {
    immediate: true,
    user: false
  });(this._paramUnwatchFns || (this._paramUnwatchFns = [])).push(unwatch);
};

/**
 * Check if the directive is a function caller
 * and if the expression is a callable one. If both true,
 * we wrap up the expression and use it as the event
 * handler.
 *
 * e.g. on-click="a++"
 *
 * @return {Boolean}
 */

Directive.prototype._checkStatement = function () {
  var expression = this.expression;
  if (expression && this.acceptStatement && !isSimplePath(expression)) {
    var fn = parseExpression(expression).get;
    var scope = this._scope || this.vm;
    var handler = function handler(e) {
      scope.$event = e;
      fn.call(scope, scope);
      scope.$event = null;
    };
    if (this.filters) {
      handler = scope._applyFilters(handler, null, this.filters);
    }
    this.update(handler);
    return true;
  }
};

/**
 * Set the corresponding value with the setter.
 * This should only be used in two-way directives
 * e.g. v-model.
 *
 * @param {*} value
 * @public
 */

Directive.prototype.set = function (value) {
  /* istanbul ignore else */
  if (this.twoWay) {
    this._withLock(function () {
      this._watcher.set(value);
    });
  } else if (process.env.NODE_ENV !== 'production') {
    warn('Directive.set() can only be used inside twoWay' + 'directives.');
  }
};

/**
 * Execute a function while preventing that function from
 * triggering updates on this directive instance.
 *
 * @param {Function} fn
 */

Directive.prototype._withLock = function (fn) {
  var self = this;
  self._locked = true;
  fn.call(self);
  nextTick(function () {
    self._locked = false;
  });
};

/**
 * Convenience method that attaches a DOM event listener
 * to the directive element and autometically tears it down
 * during unbind.
 *
 * @param {String} event
 * @param {Function} handler
 * @param {Boolean} [useCapture]
 */

Directive.prototype.on = function (event, handler, useCapture) {
  on(this.el, event, handler, useCapture);(this._listeners || (this._listeners = [])).push([event, handler]);
};

/**
 * Teardown the watcher and call unbind.
 */

Directive.prototype._teardown = function () {
  if (this._bound) {
    this._bound = false;
    if (this.unbind) {
      this.unbind();
    }
    if (this._watcher) {
      this._watcher.teardown();
    }
    var listeners = this._listeners;
    var i;
    if (listeners) {
      i = listeners.length;
      while (i--) {
        off(this.el, listeners[i][0], listeners[i][1]);
      }
    }
    var unwatchFns = this._paramUnwatchFns;
    if (unwatchFns) {
      i = unwatchFns.length;
      while (i--) {
        unwatchFns[i]();
      }
    }
    if (process.env.NODE_ENV !== 'production' && this.el) {
      this.el._vue_directives.$remove(this);
    }
    this.vm = this.el = this._watcher = this._listeners = null;
  }
};

function lifecycleMixin (Vue) {
  /**
   * Update v-ref for component.
   *
   * @param {Boolean} remove
   */

  Vue.prototype._updateRef = function (remove) {
    var ref = this.$options._ref;
    if (ref) {
      var refs = (this._scope || this._context).$refs;
      if (remove) {
        if (refs[ref] === this) {
          refs[ref] = null;
        }
      } else {
        refs[ref] = this;
      }
    }
  };

  /**
   * Transclude, compile and link element.
   *
   * If a pre-compiled linker is available, that means the
   * passed in element will be pre-transcluded and compiled
   * as well - all we need to do is to call the linker.
   *
   * Otherwise we need to call transclude/compile/link here.
   *
   * @param {Element} el
   */

  Vue.prototype._compile = function (el) {
    var options = this.$options;

    // transclude and init element
    // transclude can potentially replace original
    // so we need to keep reference; this step also injects
    // the template and caches the original attributes
    // on the container node and replacer node.
    var original = el;
    el = transclude(el, options);
    this._initElement(el);

    // handle v-pre on root node (#2026)
    if (el.nodeType === 1 && getAttr(el, 'v-pre') !== null) {
      return;
    }

    // root is always compiled per-instance, because
    // container attrs and props can be different every time.
    var contextOptions = this._context && this._context.$options;
    var rootLinker = compileRoot(el, options, contextOptions);

    // resolve slot distribution
    resolveSlots(this, options._content);

    // compile and link the rest
    var contentLinkFn;
    var ctor = this.constructor;
    // component compilation can be cached
    // as long as it's not using inline-template
    if (options._linkerCachable) {
      contentLinkFn = ctor.linker;
      if (!contentLinkFn) {
        contentLinkFn = ctor.linker = compile(el, options);
      }
    }

    // link phase
    // make sure to link root with prop scope!
    var rootUnlinkFn = rootLinker(this, el, this._scope);
    var contentUnlinkFn = contentLinkFn ? contentLinkFn(this, el) : compile(el, options)(this, el);

    // register composite unlink function
    // to be called during instance destruction
    this._unlinkFn = function () {
      rootUnlinkFn();
      // passing destroying: true to avoid searching and
      // splicing the directives
      contentUnlinkFn(true);
    };

    // finally replace original
    if (options.replace) {
      replace(original, el);
    }

    this._isCompiled = true;
    this._callHook('compiled');
  };

  /**
   * Initialize instance element. Called in the public
   * $mount() method.
   *
   * @param {Element} el
   */

  Vue.prototype._initElement = function (el) {
    if (isFragment(el)) {
      this._isFragment = true;
      this.$el = this._fragmentStart = el.firstChild;
      this._fragmentEnd = el.lastChild;
      // set persisted text anchors to empty
      if (this._fragmentStart.nodeType === 3) {
        this._fragmentStart.data = this._fragmentEnd.data = '';
      }
      this._fragment = el;
    } else {
      this.$el = el;
    }
    this.$el.__vue__ = this;
    this._callHook('beforeCompile');
  };

  /**
   * Create and bind a directive to an element.
   *
   * @param {String} name - directive name
   * @param {Node} node   - target node
   * @param {Object} desc - parsed directive descriptor
   * @param {Object} def  - directive definition object
   * @param {Vue} [host] - transclusion host component
   * @param {Object} [scope] - v-for scope
   * @param {Fragment} [frag] - owner fragment
   */

  Vue.prototype._bindDir = function (descriptor, node, host, scope, frag) {
    this._directives.push(new Directive(descriptor, this, node, host, scope, frag));
  };

  /**
   * Teardown an instance, unobserves the data, unbind all the
   * directives, turn off all the event listeners, etc.
   *
   * @param {Boolean} remove - whether to remove the DOM node.
   * @param {Boolean} deferCleanup - if true, defer cleanup to
   *                                 be called later
   */

  Vue.prototype._destroy = function (remove, deferCleanup) {
    if (this._isBeingDestroyed) {
      if (!deferCleanup) {
        this._cleanup();
      }
      return;
    }

    var destroyReady;
    var pendingRemoval;

    var self = this;
    // Cleanup should be called either synchronously or asynchronoysly as
    // callback of this.$remove(), or if remove and deferCleanup are false.
    // In any case it should be called after all other removing, unbinding and
    // turning of is done
    var cleanupIfPossible = function cleanupIfPossible() {
      if (destroyReady && !pendingRemoval && !deferCleanup) {
        self._cleanup();
      }
    };

    // remove DOM element
    if (remove && this.$el) {
      pendingRemoval = true;
      this.$remove(function () {
        pendingRemoval = false;
        cleanupIfPossible();
      });
    }

    this._callHook('beforeDestroy');
    this._isBeingDestroyed = true;
    var i;
    // remove self from parent. only necessary
    // if parent is not being destroyed as well.
    var parent = this.$parent;
    if (parent && !parent._isBeingDestroyed) {
      parent.$children.$remove(this);
      // unregister ref (remove: true)
      this._updateRef(true);
    }
    // destroy all children.
    i = this.$children.length;
    while (i--) {
      this.$children[i].$destroy();
    }
    // teardown props
    if (this._propsUnlinkFn) {
      this._propsUnlinkFn();
    }
    // teardown all directives. this also tearsdown all
    // directive-owned watchers.
    if (this._unlinkFn) {
      this._unlinkFn();
    }
    i = this._watchers.length;
    while (i--) {
      this._watchers[i].teardown();
    }
    // remove reference to self on $el
    if (this.$el) {
      this.$el.__vue__ = null;
    }

    destroyReady = true;
    cleanupIfPossible();
  };

  /**
   * Clean up to ensure garbage collection.
   * This is called after the leave transition if there
   * is any.
   */

  Vue.prototype._cleanup = function () {
    if (this._isDestroyed) {
      return;
    }
    // remove self from owner fragment
    // do it in cleanup so that we can call $destroy with
    // defer right when a fragment is about to be removed.
    if (this._frag) {
      this._frag.children.$remove(this);
    }
    // remove reference from data ob
    // frozen object may not have observer.
    if (this._data.__ob__) {
      this._data.__ob__.removeVm(this);
    }
    // Clean up references to private properties and other
    // instances. preserve reference to _data so that proxy
    // accessors still work. The only potential side effect
    // here is that mutating the instance after it's destroyed
    // may affect the state of other components that are still
    // observing the same object, but that seems to be a
    // reasonable responsibility for the user rather than
    // always throwing an error on them.
    this.$el = this.$parent = this.$root = this.$children = this._watchers = this._context = this._scope = this._directives = null;
    // call the last hook...
    this._isDestroyed = true;
    this._callHook('destroyed');
    // turn off all instance listeners.
    this.$off();
  };
}

function miscMixin (Vue) {
  /**
   * Apply a list of filter (descriptors) to a value.
   * Using plain for loops here because this will be called in
   * the getter of any watcher with filters so it is very
   * performance sensitive.
   *
   * @param {*} value
   * @param {*} [oldValue]
   * @param {Array} filters
   * @param {Boolean} write
   * @return {*}
   */

  Vue.prototype._applyFilters = function (value, oldValue, filters, write) {
    var filter, fn, args, arg, offset, i, l, j, k;
    for (i = 0, l = filters.length; i < l; i++) {
      filter = filters[i];
      fn = resolveAsset(this.$options, 'filters', filter.name);
      if (process.env.NODE_ENV !== 'production') {
        assertAsset(fn, 'filter', filter.name);
      }
      if (!fn) continue;
      fn = write ? fn.write : fn.read || fn;
      if (typeof fn !== 'function') continue;
      args = write ? [value, oldValue] : [value];
      offset = write ? 2 : 1;
      if (filter.args) {
        for (j = 0, k = filter.args.length; j < k; j++) {
          arg = filter.args[j];
          args[j + offset] = arg.dynamic ? this.$get(arg.value) : arg.value;
        }
      }
      value = fn.apply(this, args);
    }
    return value;
  };

  /**
   * Resolve a component, depending on whether the component
   * is defined normally or using an async factory function.
   * Resolves synchronously if already resolved, otherwise
   * resolves asynchronously and caches the resolved
   * constructor on the factory.
   *
   * @param {String} id
   * @param {Function} cb
   */

  Vue.prototype._resolveComponent = function (id, cb) {
    var factory = resolveAsset(this.$options, 'components', id);
    if (process.env.NODE_ENV !== 'production') {
      assertAsset(factory, 'component', id);
    }
    if (!factory) {
      return;
    }
    // async component factory
    if (!factory.options) {
      if (factory.resolved) {
        // cached
        cb(factory.resolved);
      } else if (factory.requested) {
        // pool callbacks
        factory.pendingCallbacks.push(cb);
      } else {
        factory.requested = true;
        var cbs = factory.pendingCallbacks = [cb];
        factory.call(this, function resolve(res) {
          if (isPlainObject(res)) {
            res = Vue.extend(res);
          }
          // cache resolved
          factory.resolved = res;
          // invoke callbacks
          for (var i = 0, l = cbs.length; i < l; i++) {
            cbs[i](res);
          }
        }, function reject(reason) {
          process.env.NODE_ENV !== 'production' && warn('Failed to resolve async component: ' + id + '. ' + (reason ? '\nReason: ' + reason : ''));
        });
      }
    } else {
      // normal component
      cb(factory);
    }
  };
}

var filterRE$1 = /[^|]\|[^|]/;

function dataAPI (Vue) {
  /**
   * Get the value from an expression on this vm.
   *
   * @param {String} exp
   * @param {Boolean} [asStatement]
   * @return {*}
   */

  Vue.prototype.$get = function (exp, asStatement) {
    var res = parseExpression(exp);
    if (res) {
      if (asStatement && !isSimplePath(exp)) {
        var self = this;
        return function statementHandler() {
          self.$arguments = toArray(arguments);
          var result = res.get.call(self, self);
          self.$arguments = null;
          return result;
        };
      } else {
        try {
          return res.get.call(this, this);
        } catch (e) {}
      }
    }
  };

  /**
   * Set the value from an expression on this vm.
   * The expression must be a valid left-hand
   * expression in an assignment.
   *
   * @param {String} exp
   * @param {*} val
   */

  Vue.prototype.$set = function (exp, val) {
    var res = parseExpression(exp, true);
    if (res && res.set) {
      res.set.call(this, this, val);
    }
  };

  /**
   * Delete a property on the VM
   *
   * @param {String} key
   */

  Vue.prototype.$delete = function (key) {
    del(this._data, key);
  };

  /**
   * Watch an expression, trigger callback when its
   * value changes.
   *
   * @param {String|Function} expOrFn
   * @param {Function} cb
   * @param {Object} [options]
   *                 - {Boolean} deep
   *                 - {Boolean} immediate
   * @return {Function} - unwatchFn
   */

  Vue.prototype.$watch = function (expOrFn, cb, options) {
    var vm = this;
    var parsed;
    if (typeof expOrFn === 'string') {
      parsed = parseDirective(expOrFn);
      expOrFn = parsed.expression;
    }
    var watcher = new Watcher(vm, expOrFn, cb, {
      deep: options && options.deep,
      sync: options && options.sync,
      filters: parsed && parsed.filters,
      user: !options || options.user !== false
    });
    if (options && options.immediate) {
      cb.call(vm, watcher.value);
    }
    return function unwatchFn() {
      watcher.teardown();
    };
  };

  /**
   * Evaluate a text directive, including filters.
   *
   * @param {String} text
   * @param {Boolean} [asStatement]
   * @return {String}
   */

  Vue.prototype.$eval = function (text, asStatement) {
    // check for filters.
    if (filterRE$1.test(text)) {
      var dir = parseDirective(text);
      // the filter regex check might give false positive
      // for pipes inside strings, so it's possible that
      // we don't get any filters here
      var val = this.$get(dir.expression, asStatement);
      return dir.filters ? this._applyFilters(val, null, dir.filters) : val;
    } else {
      // no filter
      return this.$get(text, asStatement);
    }
  };

  /**
   * Interpolate a piece of template text.
   *
   * @param {String} text
   * @return {String}
   */

  Vue.prototype.$interpolate = function (text) {
    var tokens = parseText(text);
    var vm = this;
    if (tokens) {
      if (tokens.length === 1) {
        return vm.$eval(tokens[0].value) + '';
      } else {
        return tokens.map(function (token) {
          return token.tag ? vm.$eval(token.value) : token.value;
        }).join('');
      }
    } else {
      return text;
    }
  };

  /**
   * Log instance data as a plain JS object
   * so that it is easier to inspect in console.
   * This method assumes console is available.
   *
   * @param {String} [path]
   */

  Vue.prototype.$log = function (path) {
    var data = path ? getPath(this._data, path) : this._data;
    if (data) {
      data = clean(data);
    }
    // include computed fields
    if (!path) {
      var key;
      for (key in this.$options.computed) {
        data[key] = clean(this[key]);
      }
      if (this._props) {
        for (key in this._props) {
          data[key] = clean(this[key]);
        }
      }
    }
    console.log(data);
  };

  /**
   * "clean" a getter/setter converted object into a plain
   * object copy.
   *
   * @param {Object} - obj
   * @return {Object}
   */

  function clean(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

function domAPI (Vue) {
  /**
   * Convenience on-instance nextTick. The callback is
   * auto-bound to the instance, and this avoids component
   * modules having to rely on the global Vue.
   *
   * @param {Function} fn
   */

  Vue.prototype.$nextTick = function (fn) {
    nextTick(fn, this);
  };

  /**
   * Append instance to target
   *
   * @param {Node} target
   * @param {Function} [cb]
   * @param {Boolean} [withTransition] - defaults to true
   */

  Vue.prototype.$appendTo = function (target, cb, withTransition) {
    return insert(this, target, cb, withTransition, append, appendWithTransition);
  };

  /**
   * Prepend instance to target
   *
   * @param {Node} target
   * @param {Function} [cb]
   * @param {Boolean} [withTransition] - defaults to true
   */

  Vue.prototype.$prependTo = function (target, cb, withTransition) {
    target = query(target);
    if (target.hasChildNodes()) {
      this.$before(target.firstChild, cb, withTransition);
    } else {
      this.$appendTo(target, cb, withTransition);
    }
    return this;
  };

  /**
   * Insert instance before target
   *
   * @param {Node} target
   * @param {Function} [cb]
   * @param {Boolean} [withTransition] - defaults to true
   */

  Vue.prototype.$before = function (target, cb, withTransition) {
    return insert(this, target, cb, withTransition, beforeWithCb, beforeWithTransition);
  };

  /**
   * Insert instance after target
   *
   * @param {Node} target
   * @param {Function} [cb]
   * @param {Boolean} [withTransition] - defaults to true
   */

  Vue.prototype.$after = function (target, cb, withTransition) {
    target = query(target);
    if (target.nextSibling) {
      this.$before(target.nextSibling, cb, withTransition);
    } else {
      this.$appendTo(target.parentNode, cb, withTransition);
    }
    return this;
  };

  /**
   * Remove instance from DOM
   *
   * @param {Function} [cb]
   * @param {Boolean} [withTransition] - defaults to true
   */

  Vue.prototype.$remove = function (cb, withTransition) {
    if (!this.$el.parentNode) {
      return cb && cb();
    }
    var inDocument = this._isAttached && inDoc(this.$el);
    // if we are not in document, no need to check
    // for transitions
    if (!inDocument) withTransition = false;
    var self = this;
    var realCb = function realCb() {
      if (inDocument) self._callHook('detached');
      if (cb) cb();
    };
    if (this._isFragment) {
      removeNodeRange(this._fragmentStart, this._fragmentEnd, this, this._fragment, realCb);
    } else {
      var op = withTransition === false ? removeWithCb : removeWithTransition;
      op(this.$el, this, realCb);
    }
    return this;
  };

  /**
   * Shared DOM insertion function.
   *
   * @param {Vue} vm
   * @param {Element} target
   * @param {Function} [cb]
   * @param {Boolean} [withTransition]
   * @param {Function} op1 - op for non-transition insert
   * @param {Function} op2 - op for transition insert
   * @return vm
   */

  function insert(vm, target, cb, withTransition, op1, op2) {
    target = query(target);
    var targetIsDetached = !inDoc(target);
    var op = withTransition === false || targetIsDetached ? op1 : op2;
    var shouldCallHook = !targetIsDetached && !vm._isAttached && !inDoc(vm.$el);
    if (vm._isFragment) {
      mapNodeRange(vm._fragmentStart, vm._fragmentEnd, function (node) {
        op(node, target, vm);
      });
      cb && cb();
    } else {
      op(vm.$el, target, vm, cb);
    }
    if (shouldCallHook) {
      vm._callHook('attached');
    }
    return vm;
  }

  /**
   * Check for selectors
   *
   * @param {String|Element} el
   */

  function query(el) {
    return typeof el === 'string' ? document.querySelector(el) : el;
  }

  /**
   * Append operation that takes a callback.
   *
   * @param {Node} el
   * @param {Node} target
   * @param {Vue} vm - unused
   * @param {Function} [cb]
   */

  function append(el, target, vm, cb) {
    target.appendChild(el);
    if (cb) cb();
  }

  /**
   * InsertBefore operation that takes a callback.
   *
   * @param {Node} el
   * @param {Node} target
   * @param {Vue} vm - unused
   * @param {Function} [cb]
   */

  function beforeWithCb(el, target, vm, cb) {
    before(el, target);
    if (cb) cb();
  }

  /**
   * Remove operation that takes a callback.
   *
   * @param {Node} el
   * @param {Vue} vm - unused
   * @param {Function} [cb]
   */

  function removeWithCb(el, vm, cb) {
    remove(el);
    if (cb) cb();
  }
}

function eventsAPI (Vue) {
  /**
   * Listen on the given `event` with `fn`.
   *
   * @param {String} event
   * @param {Function} fn
   */

  Vue.prototype.$on = function (event, fn) {
    (this._events[event] || (this._events[event] = [])).push(fn);
    modifyListenerCount(this, event, 1);
    return this;
  };

  /**
   * Adds an `event` listener that will be invoked a single
   * time then automatically removed.
   *
   * @param {String} event
   * @param {Function} fn
   */

  Vue.prototype.$once = function (event, fn) {
    var self = this;
    function on() {
      self.$off(event, on);
      fn.apply(this, arguments);
    }
    on.fn = fn;
    this.$on(event, on);
    return this;
  };

  /**
   * Remove the given callback for `event` or all
   * registered callbacks.
   *
   * @param {String} event
   * @param {Function} fn
   */

  Vue.prototype.$off = function (event, fn) {
    var cbs;
    // all
    if (!arguments.length) {
      if (this.$parent) {
        for (event in this._events) {
          cbs = this._events[event];
          if (cbs) {
            modifyListenerCount(this, event, -cbs.length);
          }
        }
      }
      this._events = {};
      return this;
    }
    // specific event
    cbs = this._events[event];
    if (!cbs) {
      return this;
    }
    if (arguments.length === 1) {
      modifyListenerCount(this, event, -cbs.length);
      this._events[event] = null;
      return this;
    }
    // specific handler
    var cb;
    var i = cbs.length;
    while (i--) {
      cb = cbs[i];
      if (cb === fn || cb.fn === fn) {
        modifyListenerCount(this, event, -1);
        cbs.splice(i, 1);
        break;
      }
    }
    return this;
  };

  /**
   * Trigger an event on self.
   *
   * @param {String|Object} event
   * @return {Boolean} shouldPropagate
   */

  Vue.prototype.$emit = function (event) {
    var isSource = typeof event === 'string';
    event = isSource ? event : event.name;
    var cbs = this._events[event];
    var shouldPropagate = isSource || !cbs;
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs;
      // this is a somewhat hacky solution to the question raised
      // in #2102: for an inline component listener like <comp @test="doThis">,
      // the propagation handling is somewhat broken. Therefore we
      // need to treat these inline callbacks differently.
      var hasParentCbs = isSource && cbs.some(function (cb) {
        return cb._fromParent;
      });
      if (hasParentCbs) {
        shouldPropagate = false;
      }
      var args = toArray(arguments, 1);
      for (var i = 0, l = cbs.length; i < l; i++) {
        var cb = cbs[i];
        var res = cb.apply(this, args);
        if (res === true && (!hasParentCbs || cb._fromParent)) {
          shouldPropagate = true;
        }
      }
    }
    return shouldPropagate;
  };

  /**
   * Recursively broadcast an event to all children instances.
   *
   * @param {String|Object} event
   * @param {...*} additional arguments
   */

  Vue.prototype.$broadcast = function (event) {
    var isSource = typeof event === 'string';
    event = isSource ? event : event.name;
    // if no child has registered for this event,
    // then there's no need to broadcast.
    if (!this._eventsCount[event]) return;
    var children = this.$children;
    var args = toArray(arguments);
    if (isSource) {
      // use object event to indicate non-source emit
      // on children
      args[0] = { name: event, source: this };
    }
    for (var i = 0, l = children.length; i < l; i++) {
      var child = children[i];
      var shouldPropagate = child.$emit.apply(child, args);
      if (shouldPropagate) {
        child.$broadcast.apply(child, args);
      }
    }
    return this;
  };

  /**
   * Recursively propagate an event up the parent chain.
   *
   * @param {String} event
   * @param {...*} additional arguments
   */

  Vue.prototype.$dispatch = function (event) {
    var shouldPropagate = this.$emit.apply(this, arguments);
    if (!shouldPropagate) return;
    var parent = this.$parent;
    var args = toArray(arguments);
    // use object event to indicate non-source emit
    // on parents
    args[0] = { name: event, source: this };
    while (parent) {
      shouldPropagate = parent.$emit.apply(parent, args);
      parent = shouldPropagate ? parent.$parent : null;
    }
    return this;
  };

  /**
   * Modify the listener counts on all parents.
   * This bookkeeping allows $broadcast to return early when
   * no child has listened to a certain event.
   *
   * @param {Vue} vm
   * @param {String} event
   * @param {Number} count
   */

  var hookRE = /^hook:/;
  function modifyListenerCount(vm, event, count) {
    var parent = vm.$parent;
    // hooks do not get broadcasted so no need
    // to do bookkeeping for them
    if (!parent || !count || hookRE.test(event)) return;
    while (parent) {
      parent._eventsCount[event] = (parent._eventsCount[event] || 0) + count;
      parent = parent.$parent;
    }
  }
}

function lifecycleAPI (Vue) {
  /**
   * Set instance target element and kick off the compilation
   * process. The passed in `el` can be a selector string, an
   * existing Element, or a DocumentFragment (for block
   * instances).
   *
   * @param {Element|DocumentFragment|string} el
   * @public
   */

  Vue.prototype.$mount = function (el) {
    if (this._isCompiled) {
      process.env.NODE_ENV !== 'production' && warn('$mount() should be called only once.');
      return;
    }
    el = query(el);
    if (!el) {
      el = document.createElement('div');
    }
    this._compile(el);
    this._initDOMHooks();
    if (inDoc(this.$el)) {
      this._callHook('attached');
      ready.call(this);
    } else {
      this.$once('hook:attached', ready);
    }
    return this;
  };

  /**
   * Mark an instance as ready.
   */

  function ready() {
    this._isAttached = true;
    this._isReady = true;
    this._callHook('ready');
  }

  /**
   * Teardown the instance, simply delegate to the internal
   * _destroy.
   */

  Vue.prototype.$destroy = function (remove, deferCleanup) {
    this._destroy(remove, deferCleanup);
  };

  /**
   * Partially compile a piece of DOM and return a
   * decompile function.
   *
   * @param {Element|DocumentFragment} el
   * @param {Vue} [host]
   * @return {Function}
   */

  Vue.prototype.$compile = function (el, host, scope, frag) {
    return compile(el, this.$options, true)(this, el, host, scope, frag);
  };
}

/**
 * The exposed Vue constructor.
 *
 * API conventions:
 * - public API methods/properties are prefixed with `$`
 * - internal methods/properties are prefixed with `_`
 * - non-prefixed properties are assumed to be proxied user
 *   data.
 *
 * @constructor
 * @param {Object} [options]
 * @public
 */

function Vue(options) {
  this._init(options);
}

// install internals
initMixin(Vue);
stateMixin(Vue);
eventsMixin(Vue);
lifecycleMixin(Vue);
miscMixin(Vue);

// install instance APIs
dataAPI(Vue);
domAPI(Vue);
eventsAPI(Vue);
lifecycleAPI(Vue);

var slot = {

  priority: SLOT,
  params: ['name'],

  bind: function bind() {
    // this was resolved during component transclusion
    var name = this.params.name || 'default';
    var content = this.vm._slotContents && this.vm._slotContents[name];
    if (!content || !content.hasChildNodes()) {
      this.fallback();
    } else {
      this.compile(content.cloneNode(true), this.vm._context, this.vm);
    }
  },

  compile: function compile(content, context, host) {
    if (content && context) {
      if (this.el.hasChildNodes() && content.childNodes.length === 1 && content.childNodes[0].nodeType === 1 && content.childNodes[0].hasAttribute('v-if')) {
        // if the inserted slot has v-if
        // inject fallback content as the v-else
        var elseBlock = document.createElement('template');
        elseBlock.setAttribute('v-else', '');
        elseBlock.innerHTML = this.el.innerHTML;
        // the else block should be compiled in child scope
        elseBlock._context = this.vm;
        content.appendChild(elseBlock);
      }
      var scope = host ? host._scope : this._scope;
      this.unlink = context.$compile(content, host, scope, this._frag);
    }
    if (content) {
      replace(this.el, content);
    } else {
      remove(this.el);
    }
  },

  fallback: function fallback() {
    this.compile(extractContent(this.el, true), this.vm);
  },

  unbind: function unbind() {
    if (this.unlink) {
      this.unlink();
    }
  }
};

var partial = {

  priority: PARTIAL,

  params: ['name'],

  // watch changes to name for dynamic partials
  paramWatchers: {
    name: function name(value) {
      vIf.remove.call(this);
      if (value) {
        this.insert(value);
      }
    }
  },

  bind: function bind() {
    this.anchor = createAnchor('v-partial');
    replace(this.el, this.anchor);
    this.insert(this.params.name);
  },

  insert: function insert(id) {
    var partial = resolveAsset(this.vm.$options, 'partials', id);
    if (process.env.NODE_ENV !== 'production') {
      assertAsset(partial, 'partial', id);
    }
    if (partial) {
      this.factory = new FragmentFactory(this.vm, partial);
      vIf.insert.call(this);
    }
  },

  unbind: function unbind() {
    if (this.frag) {
      this.frag.destroy();
    }
  }
};

var elementDirectives = {
  slot: slot,
  partial: partial
};

var convertArray = vFor._postProcess;

/**
 * Limit filter for arrays
 *
 * @param {Number} n
 * @param {Number} offset (Decimal expected)
 */

function limitBy(arr, n, offset) {
  offset = offset ? parseInt(offset, 10) : 0;
  n = toNumber(n);
  return typeof n === 'number' ? arr.slice(offset, offset + n) : arr;
}

/**
 * Filter filter for arrays
 *
 * @param {String} search
 * @param {String} [delimiter]
 * @param {String} ...dataKeys
 */

function filterBy(arr, search, delimiter) {
  arr = convertArray(arr);
  if (search == null) {
    return arr;
  }
  if (typeof search === 'function') {
    return arr.filter(search);
  }
  // cast to lowercase string
  search = ('' + search).toLowerCase();
  // allow optional `in` delimiter
  // because why not
  var n = delimiter === 'in' ? 3 : 2;
  // extract and flatten keys
  var keys = toArray(arguments, n).reduce(function (prev, cur) {
    return prev.concat(cur);
  }, []);
  var res = [];
  var item, key, val, j;
  for (var i = 0, l = arr.length; i < l; i++) {
    item = arr[i];
    val = item && item.$value || item;
    j = keys.length;
    if (j) {
      while (j--) {
        key = keys[j];
        if (key === '$key' && contains$1(item.$key, search) || contains$1(getPath(val, key), search)) {
          res.push(item);
          break;
        }
      }
    } else if (contains$1(item, search)) {
      res.push(item);
    }
  }
  return res;
}

/**
 * Filter filter for arrays
 *
 * @param {String} sortKey
 * @param {String} reverse
 */

function orderBy(arr, sortKey, reverse) {
  arr = convertArray(arr);
  if (!sortKey) {
    return arr;
  }
  var order = reverse && reverse < 0 ? -1 : 1;
  // sort on a copy to avoid mutating original array
  return arr.slice().sort(function (a, b) {
    if (sortKey !== '$key') {
      if (isObject(a) && '$value' in a) a = a.$value;
      if (isObject(b) && '$value' in b) b = b.$value;
    }
    a = isObject(a) ? getPath(a, sortKey) : a;
    b = isObject(b) ? getPath(b, sortKey) : b;
    return a === b ? 0 : a > b ? order : -order;
  });
}

/**
 * String contain helper
 *
 * @param {*} val
 * @param {String} search
 */

function contains$1(val, search) {
  var i;
  if (isPlainObject(val)) {
    var keys = Object.keys(val);
    i = keys.length;
    while (i--) {
      if (contains$1(val[keys[i]], search)) {
        return true;
      }
    }
  } else if (isArray(val)) {
    i = val.length;
    while (i--) {
      if (contains$1(val[i], search)) {
        return true;
      }
    }
  } else if (val != null) {
    return val.toString().toLowerCase().indexOf(search) > -1;
  }
}

var digitsRE = /(\d{3})(?=\d)/g;

// asset collections must be a plain object.
var filters = {

  orderBy: orderBy,
  filterBy: filterBy,
  limitBy: limitBy,

  /**
   * Stringify value.
   *
   * @param {Number} indent
   */

  json: {
    read: function read(value, indent) {
      return typeof value === 'string' ? value : JSON.stringify(value, null, Number(indent) || 2);
    },
    write: function write(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
  },

  /**
   * 'abc' => 'Abc'
   */

  capitalize: function capitalize(value) {
    if (!value && value !== 0) return '';
    value = value.toString();
    return value.charAt(0).toUpperCase() + value.slice(1);
  },

  /**
   * 'abc' => 'ABC'
   */

  uppercase: function uppercase(value) {
    return value || value === 0 ? value.toString().toUpperCase() : '';
  },

  /**
   * 'AbC' => 'abc'
   */

  lowercase: function lowercase(value) {
    return value || value === 0 ? value.toString().toLowerCase() : '';
  },

  /**
   * 12345 => $12,345.00
   *
   * @param {String} sign
   */

  currency: function currency(value, _currency) {
    value = parseFloat(value);
    if (!isFinite(value) || !value && value !== 0) return '';
    _currency = _currency != null ? _currency : '$';
    var stringified = Math.abs(value).toFixed(2);
    var _int = stringified.slice(0, -3);
    var i = _int.length % 3;
    var head = i > 0 ? _int.slice(0, i) + (_int.length > 3 ? ',' : '') : '';
    var _float = stringified.slice(-3);
    var sign = value < 0 ? '-' : '';
    return sign + _currency + head + _int.slice(i).replace(digitsRE, '$1,') + _float;
  },

  /**
   * 'item' => 'items'
   *
   * @params
   *  an array of strings corresponding to
   *  the single, double, triple ... forms of the word to
   *  be pluralized. When the number to be pluralized
   *  exceeds the length of the args, it will use the last
   *  entry in the array.
   *
   *  e.g. ['single', 'double', 'triple', 'multiple']
   */

  pluralize: function pluralize(value) {
    var args = toArray(arguments, 1);
    return args.length > 1 ? args[value % 10 - 1] || args[args.length - 1] : args[0] + (value === 1 ? '' : 's');
  },

  /**
   * Debounce a handler function.
   *
   * @param {Function} handler
   * @param {Number} delay = 300
   * @return {Function}
   */

  debounce: function debounce(handler, delay) {
    if (!handler) return;
    if (!delay) {
      delay = 300;
    }
    return _debounce(handler, delay);
  }
};

function installGlobalAPI (Vue) {
  /**
   * Vue and every constructor that extends Vue has an
   * associated options object, which can be accessed during
   * compilation steps as `this.constructor.options`.
   *
   * These can be seen as the default options of every
   * Vue instance.
   */

  Vue.options = {
    directives: directives,
    elementDirectives: elementDirectives,
    filters: filters,
    transitions: {},
    components: {},
    partials: {},
    replace: true
  };

  /**
   * Expose useful internals
   */

  Vue.util = util;
  Vue.config = config;
  Vue.set = set;
  Vue['delete'] = del;
  Vue.nextTick = nextTick;

  /**
   * The following are exposed for advanced usage / plugins
   */

  Vue.compiler = compiler;
  Vue.FragmentFactory = FragmentFactory;
  Vue.internalDirectives = internalDirectives;
  Vue.parsers = {
    path: path,
    text: text,
    template: template,
    directive: directive,
    expression: expression
  };

  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */

  Vue.cid = 0;
  var cid = 1;

  /**
   * Class inheritance
   *
   * @param {Object} extendOptions
   */

  Vue.extend = function (extendOptions) {
    extendOptions = extendOptions || {};
    var Super = this;
    var isFirstExtend = Super.cid === 0;
    if (isFirstExtend && extendOptions._Ctor) {
      return extendOptions._Ctor;
    }
    var name = extendOptions.name || Super.options.name;
    if (process.env.NODE_ENV !== 'production') {
      if (!/^[a-zA-Z][\w-]*$/.test(name)) {
        warn('Invalid component name: "' + name + '". Component names ' + 'can only contain alphanumeric characaters and the hyphen.');
        name = null;
      }
    }
    var Sub = createClass(name || 'VueComponent');
    Sub.prototype = Object.create(Super.prototype);
    Sub.prototype.constructor = Sub;
    Sub.cid = cid++;
    Sub.options = mergeOptions(Super.options, extendOptions);
    Sub['super'] = Super;
    // allow further extension
    Sub.extend = Super.extend;
    // create asset registers, so extended classes
    // can have their private assets too.
    config._assetTypes.forEach(function (type) {
      Sub[type] = Super[type];
    });
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub;
    }
    // cache constructor
    if (isFirstExtend) {
      extendOptions._Ctor = Sub;
    }
    return Sub;
  };

  /**
   * A function that returns a sub-class constructor with the
   * given name. This gives us much nicer output when
   * logging instances in the console.
   *
   * @param {String} name
   * @return {Function}
   */

  function createClass(name) {
    /* eslint-disable no-new-func */
    return new Function('return function ' + classify(name) + ' (options) { this._init(options) }')();
    /* eslint-enable no-new-func */
  }

  /**
   * Plugin system
   *
   * @param {Object} plugin
   */

  Vue.use = function (plugin) {
    /* istanbul ignore if */
    if (plugin.installed) {
      return;
    }
    // additional parameters
    var args = toArray(arguments, 1);
    args.unshift(this);
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args);
    } else {
      plugin.apply(null, args);
    }
    plugin.installed = true;
    return this;
  };

  /**
   * Apply a global mixin by merging it into the default
   * options.
   */

  Vue.mixin = function (mixin) {
    Vue.options = mergeOptions(Vue.options, mixin);
  };

  /**
   * Create asset registration methods with the following
   * signature:
   *
   * @param {String} id
   * @param {*} definition
   */

  config._assetTypes.forEach(function (type) {
    Vue[type] = function (id, definition) {
      if (!definition) {
        return this.options[type + 's'][id];
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production') {
          if (type === 'component' && (commonTagRE.test(id) || reservedTagRE.test(id))) {
            warn('Do not use built-in or reserved HTML elements as component ' + 'id: ' + id);
          }
        }
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = id;
          definition = Vue.extend(definition);
        }
        this.options[type + 's'][id] = definition;
        return definition;
      }
    };
  });

  // expose internal transition API
  extend(Vue.transition, transition);
}

installGlobalAPI(Vue);

Vue.version = '1.0.18';

// devtools global hook
/* istanbul ignore next */
if (config.devtools) {
  if (devtools) {
    devtools.emit('init', Vue);
  } else if (process.env.NODE_ENV !== 'production' && inBrowser && /Chrome\/\d+/.test(window.navigator.userAgent)) {
    console.log('Download the Vue Devtools for a better development experience:\n' + 'https://github.com/vuejs/vue-devtools');
  }
}

module.exports = Vue;
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":"/usr/lib/node_modules/browserify/node_modules/process/browser.js"}],"/var/www/github/hack-it-challenge/master/src/components/app.vue":[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}Object.defineProperty(exports,"__esModule",{value:!0});var _secureLocalStorage=require("../lib/secure-local-storage.js"),_password=require("../lib/password.js"),_password2=_interopRequireDefault(_password);_secureLocalStorage.setPassword.call(_secureLocalStorage.secureStorage,_password2["default"]),exports["default"]={data:function(){return{username:_secureLocalStorage.secureStorage.get("namaUser")}},computed:{role:function(){return _secureLocalStorage.secureStorage.get("userRole")}}},module.exports.__esModule&&(module.exports=module.exports["default"]),("function"==typeof module.exports?module.exports.options:module.exports).template='\n<div>\n  <h1>Hack It Challenge</h1>\n  <p>You can use any way to change the role of the user to "admin". When you\'ve done, you will see my <b>Secret Messages!</b> Simple!</p>\n  <p>username: {{ username }}</p>\n  <p>role: {{ role }}</p>\n  <h1 v-if="role == \'admin\'">If you Find this, You should open an issue to my Github!</h1>\n</div>\n',module.hot&&!function(){module.hot.accept();var e=require("vue-hot-reload-api");if(e.install(require("vue"),!0),e.compatible){var o="/var/www/github/hack-it-challenge/master/src/components/app.vue";module.hot.data?e.update(o,module.exports,("function"==typeof module.exports?module.exports.options:module.exports).template):e.createRecord(o,module.exports)}}();

},{"../lib/password.js":"/var/www/github/hack-it-challenge/master/src/lib/password.js","../lib/secure-local-storage.js":"/var/www/github/hack-it-challenge/master/src/lib/secure-local-storage.js","vue":"/usr/lib/node_modules/vue/dist/vue.common.js","vue-hot-reload-api":"/usr/lib/node_modules/vue-hot-reload-api/index.js"}],"/var/www/github/hack-it-challenge/master/src/lib/password.js":[function(require,module,exports){
"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var rahasia="loPikirBisaNgeHackHuh";exports["default"]=rahasia;

},{}],"/var/www/github/hack-it-challenge/master/src/lib/secure-local-storage.js":[function(require,module,exports){
"use strict";var _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol?"symbol":typeof e};!function(){function e(){return window.localStorage.getItem(s)}function t(){var t=e(),r=t.substr(0,6),n=t.substr(8);return t=r+n}function r(){var t=e();if(null===t)_.__num1__=Math.floor(5*Math.random()),_.__num2__=Math.floor(7*Math.random());else{t=t.substr(6,2);for(var r=0;r<i.length;r++)i[r]==t.substr(0,1)&&(_.__num1__=r-c),i[r]==t.substr(1,1)&&(_.__num2__=r-l)}}function n(){return i[_.__num2__]+f+i[_.__num1__]}function o(){var e=S("decrypt",_.__SECURE_LOCAL_STORAGE_PASS__,n());return e}function u(e,t){for(var r=Object.keys(e),n=t?"decrypt":"encrypt",u=o(),a={},_=0;_<r.length;_++){var s=r[_];a[S(n,s,u)]=S(n,e[s],u)}return a}function a(e){var t=i[_.__num1__+c]+i[_.__num2__+l],r=encodeURIComponent(JSON.stringify(e)),n=r.substr(0,6),o=r.substr(6),u=n+t+o;return u}var _={__SECURE_LOCAL_STORAGE_PASS__:"",__num1__:null,__num2__:null,data:{}},s="secureLocalStorage",f="secureStorageInternalPassword",c=25,l=15,i=["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","0","1","2","3","4","5","6","7","8","9"],S=function g(e,t,r){for(var n=r.split(""),o=t.split(""),u=0,a=0;a<n.length;a++)for(var _=0;_<i.length;_++)n[a]==i[_]&&(u+=_);if("encrypt"==e){for(var s=function(e){for(var t=0;t<i.length;t++)if(e==i[t]){var r=function n(e){return e>i.length?(e-=i.length,n(e)):e};return i[r(t+u)]}return e},g=[],a=0;a<o.length;a++){var f=s(o[a]);g.push(f)}return g.join("")}if("decrypt"==e){for(var c=function(e){for(var t=0;t<i.length;t++)if(e==i[t]){var r=function n(e){return 0>e?(e+=i.length,n(e)):e};return i[r(t-u)]}return e},l=[],a=0;a<o.length;a++){var S=c(o[a]);l.push(S)}return l.join("")}},d=function(){if(r(),_.data={},null!==e()){var n=t();_.data=JSON.parse(decodeURIComponent(n))}return this},p=function(e){var e=S("encrypt",e,n());_.__SECURE_LOCAL_STORAGE_PASS__=e};d.prototype.set=function(e,t){if(""===_.__SECURE_LOCAL_STORAGE_PASS__)return console.warn("[Secure Local Storage]: You need to set the password"),!1;var r={};if("string"==typeof e){var n={};n[e]=JSON.stringify(t),console.log(n),r=u(n)}if("object"===("undefined"==typeof e?"undefined":_typeof(e))){for(var o=Object.keys(e),f=0;f<o.length;f++){var c=o[f];e[c]=JSON.stringify(e[c])}r=u(e)}for(var l=Object.keys(r),f=0;f<l.length;f++){var c=l[f];_.data[c]=r[c]}return window.localStorage.setItem(s,a(_.data))},d.prototype.get=function(r){if(null===e())return console.warn("[Secure Local Storage]: Your storage Is Empty!"),!1;if(""===_.__SECURE_LOCAL_STORAGE_PASS__)return console.warn("[Secure Local Storage]: You need to set the password"),!1;var n=t(),o=JSON.parse(decodeURIComponent(n)),a=u(o,!0);return JSON.parse(a[r])},d.prototype.remove=function(t){if(null===e())return console.warn("[Secure Local Storage]: Your storage Is Empty!"),!1;if(""===_.__SECURE_LOCAL_STORAGE_PASS__)return console.warn("[Secure Local Storage]: You need to set the password"),!1;var r=S("encrypt",t,o());return delete _.data[r],window.localStorage.setItem(s,a(_.data))},d.prototype.reset=function(){return _.data={},window.localStorage.removeItem(s)};var y=new d;"object"===("undefined"==typeof module?"undefined":_typeof(module))&&module.exports&&(module.exports={secureStorage:y,setPassword:p})}();

},{}],"/var/www/github/hack-it-challenge/master/src/lib/vue.min.js":[function(require,module,exports){
(function (global){
"use strict";var _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol?"symbol":typeof t};!function(t,e){"object"==("undefined"==typeof exports?"undefined":_typeof(exports))&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):t.Vue=e()}(void 0,function(){function t(e,n,r){if(i(e,n))return void(e[n]=r);if(e._isVue)return void t(e._data,n,r);var s=e.__ob__;if(!s)return void(e[n]=r);if(s.convert(n,r),s.dep.notify(),s.vms)for(var o=s.vms.length;o--;){var a=s.vms[o];a._proxy(n),a._digest()}return r}function e(t,e){if(i(t,e)){delete t[e];var n=t.__ob__;if(n&&(n.dep.notify(),n.vms))for(var r=n.vms.length;r--;){var s=n.vms[r];s._unproxy(e),s._digest()}}}function i(t,e){return bi.call(t,e)}function n(t){return wi.test(t)}function r(t){var e=(t+"").charCodeAt(0);return 36===e||95===e}function s(t){return null==t?"":t.toString()}function o(t){if("string"!=typeof t)return t;var e=Number(t);return isNaN(e)?t:e}function a(t){return"true"===t?!0:"false"===t?!1:t}function h(t){var e=t.charCodeAt(0),i=t.charCodeAt(t.length-1);return e!==i||34!==e&&39!==e?t:t.slice(1,-1)}function l(t){return t.replace(Ci,c)}function c(t,e){return e?e.toUpperCase():""}function u(t){return t.replace($i,"$1-$2").toLowerCase()}function f(t){return t.replace(ki,c)}function p(t,e){return function(i){var n=arguments.length;return n?n>1?t.apply(e,arguments):t.call(e,i):t.call(e)}}function d(t,e){e=e||0;for(var i=t.length-e,n=new Array(i);i--;)n[i]=t[i+e];return n}function v(t,e){for(var i=Object.keys(e),n=i.length;n--;)t[i[n]]=e[i[n]];return t}function m(t){return null!==t&&"object"==("undefined"==typeof t?"undefined":_typeof(t))}function g(t){return xi.call(t)===Ai}function _(t,e,i,n){Object.defineProperty(t,e,{value:i,enumerable:!!n,writable:!0,configurable:!0})}function y(t,e){var i,n,r,s,o,a=function h(){var a=Date.now()-s;e>a&&a>=0?i=setTimeout(h,e-a):(i=null,o=t.apply(r,n),i||(r=n=null))};return function(){return r=this,n=arguments,s=Date.now(),i||(i=setTimeout(a,e)),o}}function b(t,e){for(var i=t.length;i--;)if(t[i]===e)return i;return-1}function w(t){var e=function i(){return i.cancelled?void 0:t.apply(this,arguments)};return e.cancel=function(){e.cancelled=!0},e}function C(t,e){return t==e||(m(t)&&m(e)?JSON.stringify(t)===JSON.stringify(e):!1)}function $(t){this.size=0,this.limit=t,this.head=this.tail=void 0,this._keymap=Object.create(null)}function k(){var t,e=Bi.slice(Qi,Ji).trim();if(e){t={};var i=e.match(en);t.name=i[0],i.length>1&&(t.args=i.slice(1).map(x))}t&&(Vi.filters=Vi.filters||[]).push(t),Qi=Ji+1}function x(t){if(nn.test(t))return{value:o(t),dynamic:!1};var e=h(t),i=e===t;return{value:i?t:e,dynamic:i}}function A(t){var e=tn.get(t);if(e)return e;for(Bi=t,Gi=Ki=!1,Zi=Xi=Yi=0,Qi=0,Vi={},Ji=0,qi=Bi.length;qi>Ji;Ji++)if(Ui=zi,zi=Bi.charCodeAt(Ji),Gi)39===zi&&92!==Ui&&(Gi=!Gi);else if(Ki)34===zi&&92!==Ui&&(Ki=!Ki);else if(124===zi&&124!==Bi.charCodeAt(Ji+1)&&124!==Bi.charCodeAt(Ji-1))null==Vi.expression?(Qi=Ji+1,Vi.expression=Bi.slice(0,Ji).trim()):k();else switch(zi){case 34:Ki=!0;break;case 39:Gi=!0;break;case 40:Yi++;break;case 41:Yi--;break;case 91:Xi++;break;case 93:Xi--;break;case 123:Zi++;break;case 125:Zi--}return null==Vi.expression?Vi.expression=Bi.slice(0,Ji).trim():0!==Qi&&k(),tn.put(t,Vi),Vi}function O(t){return t.replace(sn,"\\$&")}function T(){var t=O(pn.delimiters[0]),e=O(pn.delimiters[1]),i=O(pn.unsafeDelimiters[0]),n=O(pn.unsafeDelimiters[1]);an=new RegExp(i+"(.+?)"+n+"|"+t+"(.+?)"+e,"g"),hn=new RegExp("^"+i+".*"+n+"$"),on=new $(1e3)}function N(t){on||T();var e=on.get(t);if(e)return e;if(t=t.replace(/\n/g,""),!an.test(t))return null;for(var i,n,r,s,o,a,h=[],l=an.lastIndex=0;i=an.exec(t);)n=i.index,n>l&&h.push({value:t.slice(l,n)}),r=hn.test(i[0]),s=r?i[1]:i[2],o=s.charCodeAt(0),a=42===o,s=a?s.slice(1):s,h.push({tag:!0,value:s.trim(),html:r,oneTime:a}),l=n+i[0].length;return l<t.length&&h.push({value:t.slice(l)}),on.put(t,h),h}function j(t,e){return t.length>1?t.map(function(t){return E(t,e)}).join("+"):E(t[0],e,!0)}function E(t,e,i){return t.tag?t.oneTime&&e?'"'+e.$eval(t.value)+'"':S(t.value,i):'"'+t.value+'"'}function S(t,e){if(ln.test(t)){var i=A(t);return i.filters?"this._applyFilters("+i.expression+",null,"+JSON.stringify(i.filters)+",false)":"("+t+")"}return e?t:"("+t+")"}function F(t,e,i,n){R(t,1,function(){e.appendChild(t)},i,n)}function D(t,e,i,n){R(t,1,function(){B(t,e)},i,n)}function P(t,e,i){R(t,-1,function(){z(t)},e,i)}function R(t,e,i,n,r){var s=t.__v_trans;if(!s||!s.hooks&&!Pi||!n._isCompiled||n.$parent&&!n.$parent._isCompiled)return i(),void(r&&r());var o=e>0?"enter":"leave";s[o](i,r)}function L(t){return"string"==typeof t&&(t=document.querySelector(t)),t}function H(t){var e=document.documentElement,i=t&&t.parentNode;return e===t||e===i||!(!i||1!==i.nodeType||!e.contains(i))}function M(t,e){var i=t.getAttribute(e);return null!==i&&t.removeAttribute(e),i}function W(t,e){var i=M(t,":"+e);return null===i&&(i=M(t,"v-bind:"+e)),i}function I(t,e){return t.hasAttribute(e)||t.hasAttribute(":"+e)||t.hasAttribute("v-bind:"+e)}function B(t,e){e.parentNode.insertBefore(t,e)}function V(t,e){e.nextSibling?B(t,e.nextSibling):e.parentNode.appendChild(t)}function z(t){t.parentNode.removeChild(t)}function U(t,e){e.firstChild?B(t,e.firstChild):e.appendChild(t)}function J(t,e){var i=t.parentNode;i&&i.replaceChild(e,t)}function q(t,e,i,n){t.addEventListener(e,i,n)}function Q(t,e,i){t.removeEventListener(e,i)}function G(t,e){Si&&!/svg$/.test(t.namespaceURI)?t.className=e:t.setAttribute("class",e)}function K(t,e){if(t.classList)t.classList.add(e);else{var i=" "+(t.getAttribute("class")||"")+" ";i.indexOf(" "+e+" ")<0&&G(t,(i+e).trim())}}function Z(t,e){if(t.classList)t.classList.remove(e);else{for(var i=" "+(t.getAttribute("class")||"")+" ",n=" "+e+" ";i.indexOf(n)>=0;)i=i.replace(n," ");G(t,i.trim())}t.className||t.removeAttribute("class")}function X(t,e){var i,n;if(et(t)&&ot(t.content)&&(t=t.content),t.hasChildNodes())for(Y(t),n=e?document.createDocumentFragment():document.createElement("div");i=t.firstChild;)n.appendChild(i);return n}function Y(t){for(var e;e=t.firstChild,tt(e);)t.removeChild(e);for(;e=t.lastChild,tt(e);)t.removeChild(e)}function tt(t){return t&&(3===t.nodeType&&!t.data.trim()||8===t.nodeType)}function et(t){return t.tagName&&"template"===t.tagName.toLowerCase()}function it(t,e){var i=pn.debug?document.createComment(t):document.createTextNode(e?" ":"");return i.__v_anchor=!0,i}function nt(t){if(t.hasAttributes())for(var e=t.attributes,i=0,n=e.length;n>i;i++){var r=e[i].name;if(mn.test(r))return l(r.replace(mn,""))}}function rt(t,e,i){for(var n;t!==e;)n=t.nextSibling,i(t),t=n;i(e)}function st(t,e,i,n,r){function s(){if(a++,o&&a>=h.length){for(var t=0;t<h.length;t++)n.appendChild(h[t]);r&&r()}}var o=!1,a=0,h=[];rt(t,e,function(t){t===e&&(o=!0),h.push(t),P(t,i,s)})}function ot(t){return t&&11===t.nodeType}function at(t){if(t.outerHTML)return t.outerHTML;var e=document.createElement("div");return e.appendChild(t.cloneNode(!0)),e.innerHTML}function ht(){this.id=gn++,this.subs=[]}function lt(t){if(this.value=t,this.dep=new ht,_(t,"__ob__",this),Oi(t)){var e=Ti?ct:ut;e(t,yn,bn),this.observeArray(t)}else this.walk(t)}function ct(t,e){t.__proto__=e}function ut(t,e,i){for(var n=0,r=i.length;r>n;n++){var s=i[n];_(t,s,e[s])}}function ft(t,e){if(t&&"object"==("undefined"==typeof t?"undefined":_typeof(t))){var n;return i(t,"__ob__")&&t.__ob__ instanceof lt?n=t.__ob__:(Oi(t)||g(t))&&Object.isExtensible(t)&&!t._isVue&&(n=new lt(t)),n&&e&&n.addVm(e),n}}function pt(t,e,i,n){var r=new ht,s=Object.getOwnPropertyDescriptor(t,e);if(!s||s.configurable!==!1){var o=s&&s.get,a=s&&s.set,h=n?m(i)&&i.__ob__:ft(i);Object.defineProperty(t,e,{enumerable:!0,configurable:!0,get:function(){var e=o?o.call(t):i;if(ht.target&&(r.depend(),h&&h.dep.depend(),Oi(e)))for(var n,s=0,a=e.length;a>s;s++)n=e[s],n&&n.__ob__&&n.__ob__.dep.depend();return e},set:function(e){var s=o?o.call(t):i;e!==s&&(a?a.call(t,e):i=e,h=n?m(e)&&e.__ob__:ft(e),r.notify())}})}}function dt(t,e){var i=t.tagName.toLowerCase(),n=t.hasAttributes();if(wn.test(i)||Cn.test(i)){if(n)return vt(t)}else{if(At(e,"components",i))return{id:i};var r=n&&vt(t);if(r)return r}}function vt(t){var e=M(t,"is");return null!=e?{id:e}:(e=W(t,"is"),null!=e?{id:e,dynamic:!0}:void 0)}function mt(t,e,i){var n=e.path;i=yt(e,i),void 0===i&&(i=gt(t,e.options)),_t(e,i)&&pt(t,n,i,!0)}function gt(t,e){if(!i(e,"default"))return e.type===Boolean?!1:void 0;var n=e["default"];return m(n),"function"==typeof n&&e.type!==Function?n.call(t):n}function _t(t,e){if(!t.options.required&&(null===t.raw||null==e))return!0;var i,n=t.options,r=n.type,s=!0;if(r&&(r===String?(i="string",s=("undefined"==typeof e?"undefined":_typeof(e))===i):r===Number?(i="number",s="number"==typeof e):r===Boolean?(i="boolean",s="boolean"==typeof e):r===Function?(i="function",s="function"==typeof e):r===Object?(i="object",s=g(e)):r===Array?(i="array",s=Oi(e)):s=e instanceof r),!s)return!1;var o=n.validator;return!o||o(e)}function yt(t,e){var i=t.options.coerce;return i?i(e):e}function bt(e,n){var r,s,o;for(r in n)s=e[r],o=n[r],i(e,r)?m(s)&&m(o)&&bt(s,o):t(e,r,o);return e}function wt(t,e){var i=Object.create(t);return e?v(i,kt(e)):i}function Ct(t){if(t.components)for(var e,i=t.components=kt(t.components),n=Object.keys(i),r=0,s=n.length;s>r;r++){var o=n[r];wn.test(o)||Cn.test(o)||(e=i[o],g(e)&&(i[o]=di.extend(e)))}}function $t(t){var e,i,n=t.props;if(Oi(n))for(t.props={},e=n.length;e--;)i=n[e],"string"==typeof i?t.props[i]=null:i.name&&(t.props[i.name]=i);else if(g(n)){var r=Object.keys(n);for(e=r.length;e--;)i=n[r[e]],"function"==typeof i&&(n[r[e]]={type:i})}}function kt(t){if(Oi(t)){for(var e,i={},n=t.length;n--;){e=t[n];var r="function"==typeof e?e.options&&e.options.name||e.id:e.name||e.id;r&&(i[r]=e)}return i}return t}function xt(t,e,n){function r(i){var r=$n[i]||kn;o[i]=r(t[i],e[i],n,i)}Ct(e),$t(e);var s,o={};if(e.mixins)for(var a=0,h=e.mixins.length;h>a;a++)t=xt(t,e.mixins[a],n);for(s in t)r(s);for(s in e)i(t,s)||r(s);return o}function At(t,e,i){if("string"==typeof i){var n,r=t[e];return r[i]||r[n=l(i)]||r[n.charAt(0).toUpperCase()+n.slice(1)]}}function Ot(t,e,i){}function Tt(t){t.prototype._init=function(t){t=t||{},this.$el=null,this.$parent=t.parent,this.$root=this.$parent?this.$parent.$root:this,this.$children=[],this.$refs={},this.$els={},this._watchers=[],this._directives=[],this._uid=An++,this._isVue=!0,this._events={},this._eventsCount={},this._isFragment=!1,this._fragment=this._fragmentStart=this._fragmentEnd=null,this._isCompiled=this._isDestroyed=this._isReady=this._isAttached=this._isBeingDestroyed=this._vForRemoving=!1,this._unlinkFn=null,this._context=t._context||this.$parent,this._scope=t._scope,this._frag=t._frag,this._frag&&this._frag.children.push(this),this.$parent&&this.$parent.$children.push(this),t=this.$options=xt(this.constructor.options,t,this),this._updateRef(),this._data={},this._runtimeData=t.data,this._callHook("init"),this._initState(),this._initEvents(),this._callHook("created"),t.el&&this.$mount(t.el)}}function Nt(t){if(void 0===t)return"eof";var e=t.charCodeAt(0);switch(e){case 91:case 93:case 46:case 34:case 39:case 48:return t;case 95:case 36:return"ident";case 32:case 9:case 10:case 13:case 160:case 65279:case 8232:case 8233:return"ws"}return e>=97&&122>=e||e>=65&&90>=e?"ident":e>=49&&57>=e?"number":"else"}function jt(t){var e=t.trim();return"0"===t.charAt(0)&&isNaN(t)?!1:n(e)?h(e):"*"+e}function Et(t){function e(){var e=t[c+1];return u===Ln&&"'"===e||u===Hn&&'"'===e?(c++,n="\\"+e,p[Tn](),!0):void 0}var i,n,r,s,o,a,h,l=[],c=-1,u=Sn,f=0,p=[];for(p[Nn]=function(){void 0!==r&&(l.push(r),r=void 0)},p[Tn]=function(){void 0===r?r=n:r+=n},p[jn]=function(){p[Tn](),f++},p[En]=function(){if(f>0)f--,u=Rn,p[Tn]();else{if(f=0,r=jt(r),r===!1)return!1;p[Nn]()}};null!=u;)if(c++,i=t[c],"\\"!==i||!e()){if(s=Nt(i),h=In[u],o=h[s]||h["else"]||Wn,o===Wn)return;if(u=o[0],a=p[o[1]],a&&(n=o[2],n=void 0===n?i:n,a()===!1))return;if(u===Mn)return l.raw=t,l}}function St(t){var e=On.get(t);return e||(e=Et(t),e&&On.put(t,e)),e}function Ft(t,e){return It(e).get(t)}function Dt(e,i,n){var r=e;if("string"==typeof i&&(i=Et(i)),!i||!m(e))return!1;for(var s,o,a=0,h=i.length;h>a;a++)s=e,o=i[a],"*"===o.charAt(0)&&(o=It(o.slice(1)).get.call(r,r)),h-1>a?(e=e[o],m(e)||(e={},t(s,o,e))):Oi(e)?e.$set(o,n):o in e?e[o]=n:t(e,o,n);return!0}function Pt(t,e){var i=ir.length;return ir[i]=e?t.replace(Kn,"\\n"):t,'"'+i+'"'}function Rt(t){var e=t.charAt(0),i=t.slice(1);return Jn.test(i)?t:(i=i.indexOf('"')>-1?i.replace(Xn,Lt):i,e+"scope."+i)}function Lt(t,e){return ir[e]}function Ht(t){Qn.test(t),ir.length=0;var e=t.replace(Zn,Pt).replace(Gn,"");return e=(" "+e).replace(tr,Rt).replace(Xn,Lt),Mt(e)}function Mt(t){try{return new Function("scope","return "+t+";")}catch(e){}}function Wt(t){var e=St(t);return e?function(t,i){Dt(t,e,i)}:void 0}function It(t,e){t=t.trim();var i=zn.get(t);if(i)return e&&!i.set&&(i.set=Wt(i.exp)),i;var n={exp:t};return n.get=Bt(t)&&t.indexOf("[")<0?Mt("scope."+t):Ht(t),e&&(n.set=Wt(t)),zn.put(t,n),n}function Bt(t){return Yn.test(t)&&!er.test(t)&&"Math."!==t.slice(0,5)}function Vt(){rr=[],sr=[],or={},ar={},hr=lr=!1}function zt(){Ut(rr),lr=!0,Ut(sr),ji&&pn.devtools&&ji.emit("flush"),Vt()}function Ut(t){for(Bn=0;Bn<t.length;Bn++){var e=t[Bn],i=e.id;or[i]=null,e.run()}}function Jt(t){var e=t.id;if(null==or[e])if(lr&&!t.user)sr.splice(Bn+1,0,t);else{var i=t.user?sr:rr;or[e]=i.length,i.push(t),hr||(hr=!0,Wi(zt))}}function qt(t,e,i,n){n&&v(this,n);var r="function"==typeof e;if(this.vm=t,t._watchers.push(this),this.expression=e,this.cb=i,this.id=++cr,this.active=!0,this.dirty=this.lazy,this.deps=[],this.newDeps=[],this.depIds=Object.create(null),this.newDepIds=null,this.prevError=null,r)this.getter=e,this.setter=void 0;else{var s=It(e,this.twoWay);this.getter=s.get,this.setter=s.set}this.value=this.lazy?void 0:this.get(),this.queued=this.shallow=!1}function Qt(t){var e,i;if(Oi(t))for(e=t.length;e--;)Qt(t[e]);else if(m(t))for(i=Object.keys(t),e=i.length;e--;)Qt(t[i[e]])}function Gt(t){return et(t)&&ot(t.content)}function Kt(t,e){var i=e?t:t.trim(),n=fr.get(i);if(n)return n;var r=document.createDocumentFragment(),s=t.match(vr),o=mr.test(t);if(s||o){var a=s&&s[1],h=dr[a]||dr.efault,l=h[0],c=h[1],u=h[2],f=document.createElement("div");for(f.innerHTML=c+t+u;l--;)f=f.lastChild;for(var p;p=f.firstChild;)r.appendChild(p)}else r.appendChild(document.createTextNode(t));return e||Y(r),fr.put(i,r),r}function Zt(t){if(Gt(t))return Y(t.content),t.content;if("SCRIPT"===t.tagName)return Kt(t.textContent);for(var e,i=Xt(t),n=document.createDocumentFragment();e=i.firstChild;)n.appendChild(e);return Y(n),n}function Xt(t){if(!t.querySelectorAll)return t.cloneNode();var e,i,n,r=t.cloneNode(!0);if(gr){var s=r;if(Gt(t)&&(t=t.content,s=r.content),i=t.querySelectorAll("template"),i.length)for(n=s.querySelectorAll("template"),e=n.length;e--;)n[e].parentNode.replaceChild(Xt(i[e]),n[e])}if(_r)if("TEXTAREA"===t.tagName)r.value=t.value;else if(i=t.querySelectorAll("textarea"),i.length)for(n=r.querySelectorAll("textarea"),e=n.length;e--;)n[e].value=i[e].value;return r}function Yt(t,e,i){var n,r;return ot(t)?(Y(t),e?Xt(t):t):("string"==typeof t?i||"#"!==t.charAt(0)?r=Kt(t,i):(r=pr.get(t),r||(n=document.getElementById(t.slice(1)),n&&(r=Zt(n),pr.put(t,r)))):t.nodeType&&(r=Zt(t)),r&&e?Xt(r):r)}function te(t,e,i,n,r,s){this.children=[],this.childFrags=[],this.vm=e,this.scope=r,this.inserted=!1,this.parentFrag=s,s&&s.childFrags.push(this),this.unlink=t(e,i,n,r,this);var o=this.single=1===i.childNodes.length&&!i.childNodes[0].__v_anchor;o?(this.node=i.childNodes[0],this.before=ee,this.remove=ie):(this.node=it("fragment-start"),this.end=it("fragment-end"),this.frag=i,U(this.node,i),i.appendChild(this.end),this.before=ne,this.remove=re),this.node.__v_frag=this}function ee(t,e){this.inserted=!0;var i=e!==!1?D:B;i(this.node,t,this.vm),H(this.node)&&this.callHook(se)}function ie(){this.inserted=!1;var t=H(this.node),e=this;this.beforeRemove(),P(this.node,this.vm,function(){t&&e.callHook(oe),e.destroy()})}function ne(t,e){this.inserted=!0;var i=this.vm,n=e!==!1?D:B;rt(this.node,this.end,function(e){n(e,t,i)}),H(this.node)&&this.callHook(se)}function re(){this.inserted=!1;var t=this,e=H(this.node);this.beforeRemove(),st(this.node,this.end,this.vm,this.frag,function(){e&&t.callHook(oe),t.destroy()})}function se(t){!t._isAttached&&H(t.$el)&&t._callHook("attached")}function oe(t){t._isAttached&&!H(t.$el)&&t._callHook("detached")}function ae(t,e){this.vm=t;var i,n="string"==typeof e;n||et(e)?i=Yt(e,!0):(i=document.createDocumentFragment(),i.appendChild(e)),this.template=i;var r,s=t.constructor.cid;if(s>0){var o=s+(n?e:at(e));r=wr.get(o),r||(r=Te(i,t.$options,!0),wr.put(o,r))}else r=Te(i,t.$options,!0);this.linker=r}function he(t,e,i){var n=t.node.previousSibling;if(n){for(t=n.__v_frag;!(t&&t.forId===i&&t.inserted||n===e);){if(n=n.previousSibling,!n)return;t=n.__v_frag}return t}}function le(t){var e=t.node;if(t.end)for(;!e.__vue__&&e!==t.end&&e.nextSibling;)e=e.nextSibling;return e.__vue__}function ce(t){for(var e=-1,i=new Array(Math.floor(t));++e<t;)i[e]=e;return i}function ue(t,e,i){for(var n,r,s,o=e?[]:null,a=0,h=t.options.length;h>a;a++)if(n=t.options[a],s=i?n.hasAttribute("selected"):n.selected){if(r=n.hasOwnProperty("_value")?n._value:n.value,!e)return r;o.push(r)}return o}function fe(t,e){for(var i=t.length;i--;)if(C(t[i],e))return i;return-1}function pe(t,e){var i=e.map(function(t){var e=t.charCodeAt(0);return e>47&&58>e?parseInt(t,10):1===t.length&&(e=t.toUpperCase().charCodeAt(0),e>64&&91>e)?e:Br[t]});return i=[].concat.apply([],i),function(e){return i.indexOf(e.keyCode)>-1?t.call(this,e):void 0}}function de(t){return function(e){return e.stopPropagation(),t.call(this,e)}}function ve(t){return function(e){return e.preventDefault(),t.call(this,e)}}function me(t){return function(e){return e.target===e.currentTarget?t.call(this,e):void 0}}function ge(t){if(qr[t])return qr[t];var e=_e(t);return qr[t]=qr[e]=e,e}function _e(t){t=u(t);var e=l(t),i=e.charAt(0).toUpperCase()+e.slice(1);Qr||(Qr=document.createElement("div"));for(var n,r=zr.length;r--;)if(n=Ur[r]+i,n in Qr.style)return zr[r]+t;return e in Qr.style?t:void 0}function ye(t){for(var e={},i=t.trim().split(/\s+/),n=i.length;n--;)e[i[n]]=!0;return e}function be(t,e){return Oi(t)?t.indexOf(e)>-1:i(t,e)}function we(t,e,i){function n(){++s>=r?i():t[s].call(e,n)}var r=t.length,s=0;t[0].call(e,n)}function Ce(t){us.push(t),fs||(fs=!0,Wi($e))}function $e(){for(var t=document.documentElement.offsetHeight,e=0;e<us.length;e++)us[e]();return us=[],fs=!1,t}function ke(t,e,i,n){this.id=e,this.el=t,this.enterClass=i&&i.enterClass||e+"-enter",this.leaveClass=i&&i.leaveClass||e+"-leave",this.hooks=i,this.vm=n,this.pendingCssEvent=this.pendingCssCb=this.cancel=this.pendingJsCb=this.op=this.cb=null,this.justEntered=!1,this.entered=this.left=!1,this.typeCache={},this.type=i&&i.type;var r=this;["enterNextTick","enterDone","leaveNextTick","leaveDone"].forEach(function(t){r[t]=p(r[t],r)})}function xe(t){if(/svg$/.test(t.namespaceURI)){var e=t.getBoundingClientRect();return!(e.width||e.height)}return!(t.offsetWidth||t.offsetHeight||t.getClientRects().length)}function Ae(t,e){for(var i,r,s,o,a,h,c,f=[],p=Object.keys(e),d=p.length;d--;)r=p[d],i=e[r]||ws,a=l(r),Cs.test(a)&&(c={name:r,path:a,options:i,mode:bs.ONE_WAY,raw:null},s=u(r),null===(o=W(t,s))&&(null!==(o=W(t,s+".sync"))?c.mode=bs.TWO_WAY:null!==(o=W(t,s+".once"))&&(c.mode=bs.ONE_TIME)),null!==o?(c.raw=o,h=A(o),o=h.expression,c.filters=h.filters,n(o)&&!h.filters?c.optimizedLiteral=!0:c.dynamic=!0,c.parentPath=o):null!==(o=M(t,s))&&(c.raw=o),f.push(c));return Oe(f)}function Oe(t){return function(e,i){e._props={};for(var n,r,s,l,c,u=t.length;u--;)if(n=t[u],c=n.raw,r=n.path,s=n.options,e._props[r]=n,null===c)mt(e,n,void 0);else if(n.dynamic)n.mode===bs.ONE_TIME?(l=(i||e._context||e).$get(n.parentPath),mt(e,n,l)):e._context?e._bindDir({name:"prop",def:cs,prop:n},null,null,i):mt(e,n,e.$get(n.parentPath));else if(n.optimizedLiteral){var f=h(c);l=f===c?a(o(c)):f,mt(e,n,l)}else l=s.type===Boolean&&""===c?!0:c,mt(e,n,l)}}function Te(t,e,i){var n=i||!e._asComponent?Pe(t,e):null,r=n&&n.terminal||"SCRIPT"===t.tagName||!t.hasChildNodes()?null:Ie(t.childNodes,e);return function(t,e,i,s,o){var a=d(e.childNodes),h=Ne(function(){n&&n(t,e,i,s,o),r&&r(t,a,i,s,o)},t);return Ee(t,h)}}function Ne(t,e){e._directives=[];var i=e._directives.length;t();var n=e._directives.slice(i);n.sort(je);for(var r=0,s=n.length;s>r;r++)n[r]._bind();return n}function je(t,e){return t=t.descriptor.def.priority||Ns,e=e.descriptor.def.priority||Ns,t>e?-1:t===e?0:1}function Ee(t,e,i,n){function r(r){Se(t,e,r),i&&n&&Se(i,n)}return r.dirs=e,r}function Se(t,e,i){for(var n=e.length;n--;)e[n]._teardown()}function Fe(t,e,i,n){var r=Ae(e,i),s=Ne(function(){r(t,n)},t);return Ee(t,s)}function De(t,e,i){var n,r,s=e._containerAttrs,o=e._replacerAttrs;return 11!==t.nodeType&&(e._asComponent?(s&&i&&(n=Qe(s,i)),o&&(r=Qe(o,e))):r=Qe(t.attributes,e)),e._containerAttrs=e._replacerAttrs=null,function(t,e,i){var s,o=t._context;o&&n&&(s=Ne(function(){n(o,e,null,i)},o));var a=Ne(function(){r&&r(t,e)},t);return Ee(t,a,o,s)}}function Pe(t,e){var i=t.nodeType;return 1===i&&"SCRIPT"!==t.tagName?Re(t,e):3===i&&t.data.trim()?Le(t,e):null}function Re(t,e){if("TEXTAREA"===t.tagName){var i=N(t.value);i&&(t.setAttribute(":value",j(i)),t.value="")}var n,r=t.hasAttributes();return r&&(n=Ue(t,e)),n||(n=Ve(t,e)),n||(n=ze(t,e)),!n&&r&&(n=Qe(t.attributes,e)),n}function Le(t,e){if(t._skip)return He;var i=N(t.wholeText);if(!i)return null;for(var n=t.nextSibling;n&&3===n.nodeType;)n._skip=!0,n=n.nextSibling;for(var r,s,o=document.createDocumentFragment(),a=0,h=i.length;h>a;a++)s=i[a],r=s.tag?Me(s,e):document.createTextNode(s.value),o.appendChild(r);return We(i,o,e)}function He(t,e){z(e)}function Me(t,e){function i(e){if(!t.descriptor){var i=A(t.value);t.descriptor={name:e,def:os[e],expression:i.expression,filters:i.filters}}}var n;return t.oneTime?n=document.createTextNode(t.value):t.html?(n=document.createComment("v-html"),i("html")):(n=document.createTextNode(" "),i("text")),n}function We(t,e){return function(i,n,r,s){for(var o,a,h,l=e.cloneNode(!0),c=d(l.childNodes),u=0,f=t.length;f>u;u++)o=t[u],a=o.value,o.tag&&(h=c[u],o.oneTime?(a=(s||i).$eval(a),o.html?J(h,Yt(a,!0)):h.data=a):i._bindDir(o.descriptor,h,r,s));J(n,l)}}function Ie(t,e){for(var i,n,r,s=[],o=0,a=t.length;a>o;o++)r=t[o],i=Pe(r,e),n=i&&i.terminal||"SCRIPT"===r.tagName||!r.hasChildNodes()?null:Ie(r.childNodes,e),s.push(i,n);return s.length?Be(s):null}function Be(t){return function(e,i,n,r,s){for(var o,a,h,l=0,c=0,u=t.length;u>l;c++){o=i[c],a=t[l++],h=t[l++];var f=d(o.childNodes);a&&a(e,o,n,r,s),h&&h(e,f,n,r,s)}}}function Ve(t,e){var i=t.tagName.toLowerCase();if(!wn.test(i)){var n=At(e,"elementDirectives",i);return n?qe(t,i,"",e,n):void 0}}function ze(t,e){var i=dt(t,e);if(i){var n=nt(t),r={name:"component",ref:n,expression:i.id,def:ys.component,modifiers:{literal:!i.dynamic}},s=function(t,e,i,s,o){n&&pt((s||t).$refs,n,null),t._bindDir(r,e,i,s,o)};return s.terminal=!0,s}}function Ue(t,e){if(null!==M(t,"v-pre"))return Je;if(t.hasAttribute("v-else")){var i=t.previousElementSibling;if(i&&i.hasAttribute("v-if"))return Je}for(var n,r,s=0,o=Ts.length;o>s;s++)if(r=Ts[s],n=t.getAttribute("v-"+r),null!=n)return qe(t,r,n,e)}function Je(){}function qe(t,e,i,n,r){var s=A(i),o={name:e,expression:s.expression,filters:s.filters,raw:i,def:r||At(n,"directives",e)};"for"!==e&&"router-view"!==e||(o.ref=nt(t));var a=function(t,e,i,n,r){o.ref&&pt((n||t).$refs,o.ref,null),t._bindDir(o,e,i,n,r)};return a.terminal=!0,a}function Qe(t,e){function i(t,e,i){var n=i&&Ze(i),r=!n&&A(s);v.push({name:t,attr:o,raw:a,def:e,arg:l,modifiers:c,expression:r&&r.expression,filters:r&&r.filters,interp:i,hasOneTime:n})}for(var n,r,s,o,a,h,l,c,u,f,p,d=t.length,v=[];d--;)if(n=t[d],r=o=n.name,s=a=n.value,f=N(s),l=null,c=Ge(r),r=r.replace(As,""),f)s=j(f),l=r,i("bind",os.bind,f);else if(Os.test(r))c.literal=!$s.test(r),i("transition",ys.transition);else if(ks.test(r))l=r.replace(ks,""),i("on",os.on);else if($s.test(r))h=r.replace($s,""),"style"===h||"class"===h?i(h,ys[h]):(l=h,i("bind",os.bind));else if(p=r.match(xs)){if(h=p[1],l=p[2],"else"===h)continue;u=At(e,"directives",h),u&&i(h,u)}return v.length?Ke(v):void 0}function Ge(t){var e=Object.create(null),i=t.match(As);if(i)for(var n=i.length;n--;)e[i[n].slice(1)]=!0;return e}function Ke(t){return function(e,i,n,r,s){for(var o=t.length;o--;)e._bindDir(t[o],i,n,r,s)}}function Ze(t){for(var e=t.length;e--;)if(t[e].oneTime)return!0}function Xe(t,e){return e&&(e._containerAttrs=ti(t)),et(t)&&(t=Yt(t)),e&&(e._asComponent&&!e.template&&(e.template="<slot></slot>"),e.template&&(e._content=X(t),t=Ye(t,e))),ot(t)&&(U(it("v-start",!0),t),t.appendChild(it("v-end",!0))),t}function Ye(t,e){var i=e.template,n=Yt(i,!0);if(n){var r=n.firstChild,s=r.tagName&&r.tagName.toLowerCase();return e.replace?(t===document.body,n.childNodes.length>1||1!==r.nodeType||"component"===s||At(e,"components",s)||I(r,"is")||At(e,"elementDirectives",s)||r.hasAttribute("v-for")||r.hasAttribute("v-if")?n:(e._replacerAttrs=ti(r),ei(t,r),r)):(t.appendChild(n),t)}}function ti(t){return 1===t.nodeType&&t.hasAttributes()?d(t.attributes):void 0}function ei(t,e){for(var i,n,r=t.attributes,s=r.length;s--;)i=r[s].name,n=r[s].value,e.hasAttribute(i)||js.test(i)?"class"!==i||N(n)||n.trim().split(/\s+/).forEach(function(t){K(e,t)}):e.setAttribute(i,n)}function ii(t,e){if(e){for(var i,n,r=t._slotContents=Object.create(null),s=0,o=e.children.length;o>s;s++)i=e.children[s],(n=i.getAttribute("slot"))&&(r[n]||(r[n]=[])).push(i);for(n in r)r[n]=ni(r[n],e);e.hasChildNodes()&&(r["default"]=ni(e.childNodes,e))}}function ni(t,e){var i=document.createDocumentFragment();t=d(t);for(var n=0,r=t.length;r>n;n++){var s=t[n];!et(s)||s.hasAttribute("v-if")||s.hasAttribute("v-for")||(e.removeChild(s),s=Yt(s)),i.appendChild(s)}return i}function ri(t){function e(){}function n(t,e){var i=new qt(e,t,null,{lazy:!0});return function(){return i.dirty&&i.evaluate(),ht.target&&i.depend(),i.value}}Object.defineProperty(t.prototype,"$data",{get:function(){return this._data},set:function(t){t!==this._data&&this._setData(t)}}),t.prototype._initState=function(){this._initProps(),this._initMeta(),this._initMethods(),this._initData(),this._initComputed()},t.prototype._initProps=function(){var t=this.$options,e=t.el,i=t.props;e=t.el=L(e),this._propsUnlinkFn=e&&1===e.nodeType&&i?Fe(this,e,i,this._scope):null},t.prototype._initData=function(){var t,e,n=this.$options.data,r=this._data=n?n():{},s=this._props,o=this._runtimeData?"function"==typeof this._runtimeData?this._runtimeData():this._runtimeData:null,a=Object.keys(r);for(t=a.length;t--;)e=a[t],(!s||!i(s,e)||o&&i(o,e)&&null===s[e].raw)&&this._proxy(e);ft(r,this)},t.prototype._setData=function(t){t=t||{};var e=this._data;this._data=t;var n,r,s;for(n=Object.keys(e),s=n.length;s--;)r=n[s],r in t||this._unproxy(r);for(n=Object.keys(t),s=n.length;s--;)r=n[s],i(this,r)||this._proxy(r);e.__ob__.removeVm(this),ft(t,this),this._digest()},t.prototype._proxy=function(t){if(!r(t)){var e=this;Object.defineProperty(e,t,{configurable:!0,enumerable:!0,get:function(){return e._data[t]},set:function(i){e._data[t]=i}})}},t.prototype._unproxy=function(t){r(t)||delete this[t]},t.prototype._digest=function(){for(var t=0,e=this._watchers.length;e>t;t++)this._watchers[t].update(!0)},t.prototype._initComputed=function(){var t=this.$options.computed;if(t)for(var i in t){var r=t[i],s={enumerable:!0,configurable:!0};"function"==typeof r?(s.get=n(r,this),s.set=e):(s.get=r.get?r.cache!==!1?n(r.get,this):p(r.get,this):e,s.set=r.set?p(r.set,this):e),Object.defineProperty(this,i,s)}},t.prototype._initMethods=function(){var t=this.$options.methods;if(t)for(var e in t)this[e]=p(t[e],this)},t.prototype._initMeta=function(){var t=this.$options._meta;if(t)for(var e in t)pt(this,e,t[e])}}function si(t){function e(t,e){for(var i,n,r=e.attributes,s=0,o=r.length;o>s;s++)i=r[s].name,Ss.test(i)&&(i=i.replace(Ss,""),n=(t._scope||t._context).$eval(r[s].value,!0),"function"==typeof n&&(n._fromParent=!0,t.$on(i.replace(Ss),n)))}function i(t,e,i){if(i){var r,s,o,a;for(s in i)if(r=i[s],Oi(r))for(o=0,a=r.length;a>o;o++)n(t,e,s,r[o]);else n(t,e,s,r)}}function n(t,e,i,r,s){var o="undefined"==typeof r?"undefined":_typeof(r);if("function"===o)t[e](i,r,s);else if("string"===o){var a=t.$options.methods,h=a&&a[r];h&&t[e](i,h,s)}else r&&"object"===o&&n(t,e,i,r.handler,r)}function r(){this._isAttached||(this._isAttached=!0,this.$children.forEach(s))}function s(t){!t._isAttached&&H(t.$el)&&t._callHook("attached")}function o(){this._isAttached&&(this._isAttached=!1,this.$children.forEach(a))}function a(t){t._isAttached&&!H(t.$el)&&t._callHook("detached")}t.prototype._initEvents=function(){var t=this.$options;t._asComponent&&e(this,t.el),i(this,"$on",t.events),i(this,"$watch",t.watch)},t.prototype._initDOMHooks=function(){this.$on("hook:attached",r),this.$on("hook:detached",o)},t.prototype._callHook=function(t){this.$emit("pre-hook:"+t);var e=this.$options[t];if(e)for(var i=0,n=e.length;n>i;i++)e[i].call(this);this.$emit("hook:"+t)}}function oi(){}function ai(t,e,i,n,r,s){this.vm=e,this.el=i,this.descriptor=t,this.name=t.name,this.expression=t.expression,this.arg=t.arg,this.modifiers=t.modifiers,this.filters=t.filters,this.literal=this.modifiers&&this.modifiers.literal,this._locked=!1,this._bound=!1,this._listeners=null,this._host=n,this._scope=r,this._frag=s}function hi(t){t.prototype._updateRef=function(t){var e=this.$options._ref;if(e){var i=(this._scope||this._context).$refs;t?i[e]===this&&(i[e]=null):i[e]=this}},t.prototype._compile=function(t){var e=this.$options,i=t;if(t=Xe(t,e),this._initElement(t),1!==t.nodeType||null===M(t,"v-pre")){var n=this._context&&this._context.$options,r=De(t,e,n);ii(this,e._content);var s,o=this.constructor;e._linkerCachable&&(s=o.linker,s||(s=o.linker=Te(t,e)));var a=r(this,t,this._scope),h=s?s(this,t):Te(t,e)(this,t);this._unlinkFn=function(){a(),h(!0)},e.replace&&J(i,t),this._isCompiled=!0,this._callHook("compiled")}},t.prototype._initElement=function(t){ot(t)?(this._isFragment=!0,this.$el=this._fragmentStart=t.firstChild,this._fragmentEnd=t.lastChild,3===this._fragmentStart.nodeType&&(this._fragmentStart.data=this._fragmentEnd.data=""),this._fragment=t):this.$el=t,this.$el.__vue__=this,this._callHook("beforeCompile")},t.prototype._bindDir=function(t,e,i,n,r){this._directives.push(new ai(t,this,e,i,n,r))},t.prototype._destroy=function(t,e){if(this._isBeingDestroyed)return void(e||this._cleanup());var i,n,r=this,s=function(){!i||n||e||r._cleanup()};t&&this.$el&&(n=!0,this.$remove(function(){n=!1,s()})),this._callHook("beforeDestroy"),this._isBeingDestroyed=!0;var o,a=this.$parent;for(a&&!a._isBeingDestroyed&&(a.$children.$remove(this),this._updateRef(!0)),o=this.$children.length;o--;)this.$children[o].$destroy();for(this._propsUnlinkFn&&this._propsUnlinkFn(),this._unlinkFn&&this._unlinkFn(),o=this._watchers.length;o--;)this._watchers[o].teardown();this.$el&&(this.$el.__vue__=null),i=!0,s()},t.prototype._cleanup=function(){this._isDestroyed||(this._frag&&this._frag.children.$remove(this),this._data.__ob__&&this._data.__ob__.removeVm(this),this.$el=this.$parent=this.$root=this.$children=this._watchers=this._context=this._scope=this._directives=null,this._isDestroyed=!0,this._callHook("destroyed"),this.$off())}}function li(t){t.prototype._applyFilters=function(t,e,i,n){var r,s,o,a,h,l,c,u,f;for(l=0,c=i.length;c>l;l++)if(r=i[l],s=At(this.$options,"filters",r.name),s&&(s=n?s.write:s.read||s,"function"==typeof s)){if(o=n?[t,e]:[t],h=n?2:1,r.args)for(u=0,f=r.args.length;f>u;u++)a=r.args[u],o[u+h]=a.dynamic?this.$get(a.value):a.value;t=s.apply(this,o)}return t},t.prototype._resolveComponent=function(e,i){
var n=At(this.$options,"components",e);if(n)if(n.options)i(n);else if(n.resolved)i(n.resolved);else if(n.requested)n.pendingCallbacks.push(i);else{n.requested=!0;var r=n.pendingCallbacks=[i];n.call(this,function(e){g(e)&&(e=t.extend(e)),n.resolved=e;for(var i=0,s=r.length;s>i;i++)r[i](e)},function(t){})}}}function ci(t){function i(t){return JSON.parse(JSON.stringify(t))}t.prototype.$get=function(t,e){var i=It(t);if(i){if(e&&!Bt(t)){var n=this;return function(){n.$arguments=d(arguments);var t=i.get.call(n,n);return n.$arguments=null,t}}try{return i.get.call(this,this)}catch(r){}}},t.prototype.$set=function(t,e){var i=It(t,!0);i&&i.set&&i.set.call(this,this,e)},t.prototype.$delete=function(t){e(this._data,t)},t.prototype.$watch=function(t,e,i){var n,r=this;"string"==typeof t&&(n=A(t),t=n.expression);var s=new qt(r,t,e,{deep:i&&i.deep,sync:i&&i.sync,filters:n&&n.filters,user:!i||i.user!==!1});return i&&i.immediate&&e.call(r,s.value),function(){s.teardown()}},t.prototype.$eval=function(t,e){if(Fs.test(t)){var i=A(t),n=this.$get(i.expression,e);return i.filters?this._applyFilters(n,null,i.filters):n}return this.$get(t,e)},t.prototype.$interpolate=function(t){var e=N(t),i=this;return e?1===e.length?i.$eval(e[0].value)+"":e.map(function(t){return t.tag?i.$eval(t.value):t.value}).join(""):t},t.prototype.$log=function(t){var e=t?Ft(this._data,t):this._data;if(e&&(e=i(e)),!t){var n;for(n in this.$options.computed)e[n]=i(this[n]);if(this._props)for(n in this._props)e[n]=i(this[n])}console.log(e)}}function ui(t){function e(t,e,n,r,s,o){e=i(e);var a=!H(e),h=r===!1||a?s:o,l=!a&&!t._isAttached&&!H(t.$el);return t._isFragment?(rt(t._fragmentStart,t._fragmentEnd,function(i){h(i,e,t)}),n&&n()):h(t.$el,e,t,n),l&&t._callHook("attached"),t}function i(t){return"string"==typeof t?document.querySelector(t):t}function n(t,e,i,n){e.appendChild(t),n&&n()}function r(t,e,i,n){B(t,e),n&&n()}function s(t,e,i){z(t),i&&i()}t.prototype.$nextTick=function(t){Wi(t,this)},t.prototype.$appendTo=function(t,i,r){return e(this,t,i,r,n,F)},t.prototype.$prependTo=function(t,e,n){return t=i(t),t.hasChildNodes()?this.$before(t.firstChild,e,n):this.$appendTo(t,e,n),this},t.prototype.$before=function(t,i,n){return e(this,t,i,n,r,D)},t.prototype.$after=function(t,e,n){return t=i(t),t.nextSibling?this.$before(t.nextSibling,e,n):this.$appendTo(t.parentNode,e,n),this},t.prototype.$remove=function(t,e){if(!this.$el.parentNode)return t&&t();var i=this._isAttached&&H(this.$el);i||(e=!1);var n=this,r=function(){i&&n._callHook("detached"),t&&t()};if(this._isFragment)st(this._fragmentStart,this._fragmentEnd,this,this._fragment,r);else{var o=e===!1?s:P;o(this.$el,this,r)}return this}}function fi(t){function e(t,e,n){var r=t.$parent;if(r&&n&&!i.test(e))for(;r;)r._eventsCount[e]=(r._eventsCount[e]||0)+n,r=r.$parent}t.prototype.$on=function(t,i){return(this._events[t]||(this._events[t]=[])).push(i),e(this,t,1),this},t.prototype.$once=function(t,e){function i(){n.$off(t,i),e.apply(this,arguments)}var n=this;return i.fn=e,this.$on(t,i),this},t.prototype.$off=function(t,i){var n;if(!arguments.length){if(this.$parent)for(t in this._events)n=this._events[t],n&&e(this,t,-n.length);return this._events={},this}if(n=this._events[t],!n)return this;if(1===arguments.length)return e(this,t,-n.length),this._events[t]=null,this;for(var r,s=n.length;s--;)if(r=n[s],r===i||r.fn===i){e(this,t,-1),n.splice(s,1);break}return this},t.prototype.$emit=function(t){var e="string"==typeof t;t=e?t:t.name;var i=this._events[t],n=e||!i;if(i){i=i.length>1?d(i):i;var r=e&&i.some(function(t){return t._fromParent});r&&(n=!1);for(var s=d(arguments,1),o=0,a=i.length;a>o;o++){var h=i[o],l=h.apply(this,s);l!==!0||r&&!h._fromParent||(n=!0)}}return n},t.prototype.$broadcast=function(t){var e="string"==typeof t;if(t=e?t:t.name,this._eventsCount[t]){var i=this.$children,n=d(arguments);e&&(n[0]={name:t,source:this});for(var r=0,s=i.length;s>r;r++){var o=i[r],a=o.$emit.apply(o,n);a&&o.$broadcast.apply(o,n)}return this}},t.prototype.$dispatch=function(t){var e=this.$emit.apply(this,arguments);if(e){var i=this.$parent,n=d(arguments);for(n[0]={name:t,source:this};i;)e=i.$emit.apply(i,n),i=e?i.$parent:null;return this}};var i=/^hook:/}function pi(t){function e(){this._isAttached=!0,this._isReady=!0,this._callHook("ready")}t.prototype.$mount=function(t){return this._isCompiled?void 0:(t=L(t),t||(t=document.createElement("div")),this._compile(t),this._initDOMHooks(),H(this.$el)?(this._callHook("attached"),e.call(this)):this.$once("hook:attached",e),this)},t.prototype.$destroy=function(t,e){this._destroy(t,e)},t.prototype.$compile=function(t,e,i,n){return Te(t,this.$options,!0)(this,t,e,i,n)}}function di(t){this._init(t)}function vi(t,e,i){return i=i?parseInt(i,10):0,e=o(e),"number"==typeof e?t.slice(i,i+e):t}function mi(t,e,i){if(t=Ls(t),null==e)return t;if("function"==typeof e)return t.filter(e);e=(""+e).toLowerCase();for(var n,r,s,o,a="in"===i?3:2,h=d(arguments,a).reduce(function(t,e){return t.concat(e)},[]),l=[],c=0,u=t.length;u>c;c++)if(n=t[c],s=n&&n.$value||n,o=h.length){for(;o--;)if(r=h[o],"$key"===r&&_i(n.$key,e)||_i(Ft(s,r),e)){l.push(n);break}}else _i(n,e)&&l.push(n);return l}function gi(t,e,i){if(t=Ls(t),!e)return t;var n=i&&0>i?-1:1;return t.slice().sort(function(t,i){return"$key"!==e&&(m(t)&&"$value"in t&&(t=t.$value),m(i)&&"$value"in i&&(i=i.$value)),t=m(t)?Ft(t,e):t,i=m(i)?Ft(i,e):i,t===i?0:t>i?n:-n})}function _i(t,e){var i;if(g(t)){var n=Object.keys(t);for(i=n.length;i--;)if(_i(t[n[i]],e))return!0}else if(Oi(t)){for(i=t.length;i--;)if(_i(t[i],e))return!0}else if(null!=t)return t.toString().toLowerCase().indexOf(e)>-1}function yi(i){function n(t){return new Function("return function "+f(t)+" (options) { this._init(options) }")()}i.options={directives:os,elementDirectives:Rs,filters:Ms,transitions:{},components:{},partials:{},replace:!0},i.util=xn,i.config=pn,i.set=t,i["delete"]=e,i.nextTick=Wi,i.compiler=Es,i.FragmentFactory=ae,i.internalDirectives=ys,i.parsers={path:Vn,text:cn,template:yr,directive:rn,expression:nr},i.cid=0;var r=1;i.extend=function(t){t=t||{};var e=this,i=0===e.cid;if(i&&t._Ctor)return t._Ctor;var s=t.name||e.options.name,o=n(s||"VueComponent");return o.prototype=Object.create(e.prototype),o.prototype.constructor=o,o.cid=r++,o.options=xt(e.options,t),o["super"]=e,o.extend=e.extend,pn._assetTypes.forEach(function(t){o[t]=e[t]}),s&&(o.options.components[s]=o),i&&(t._Ctor=o),o},i.use=function(t){if(!t.installed){var e=d(arguments,1);return e.unshift(this),"function"==typeof t.install?t.install.apply(t,e):t.apply(null,e),t.installed=!0,this}},i.mixin=function(t){i.options=xt(i.options,t)},pn._assetTypes.forEach(function(t){i[t]=function(e,n){return n?("component"===t&&g(n)&&(n.name=e,n=i.extend(n)),this.options[t+"s"][e]=n,n):this.options[t+"s"][e]}}),v(i.transition,vn)}var bi=Object.prototype.hasOwnProperty,wi=/^\s?(true|false|-?[\d\.]+|'[^']*'|"[^"]*")\s?$/,Ci=/-(\w)/g,$i=/([a-z\d])([A-Z])/g,ki=/(?:^|[-_\/])(\w)/g,xi=Object.prototype.toString,Ai="[object Object]",Oi=Array.isArray,Ti="__proto__"in{},Ni="undefined"!=typeof window&&"[object Object]"!==Object.prototype.toString.call(window),ji=Ni&&window.__VUE_DEVTOOLS_GLOBAL_HOOK__,Ei=Ni&&window.navigator.userAgent.toLowerCase(),Si=Ei&&Ei.indexOf("msie 9.0")>0,Fi=Ei&&Ei.indexOf("android")>0,Di=void 0,Pi=void 0,Ri=void 0,Li=void 0;if(Ni&&!Si){var Hi=void 0===window.ontransitionend&&void 0!==window.onwebkittransitionend,Mi=void 0===window.onanimationend&&void 0!==window.onwebkitanimationend;Di=Hi?"WebkitTransition":"transition",Pi=Hi?"webkitTransitionEnd":"transitionend",Ri=Mi?"WebkitAnimation":"animation",Li=Mi?"webkitAnimationEnd":"animationend"}var Wi=function(){function t(){n=!1;var t=i.slice(0);i=[];for(var e=0;e<t.length;e++)t[e]()}var e,i=[],n=!1;if("undefined"!=typeof MutationObserver){var r=1,s=new MutationObserver(t),o=document.createTextNode(r);s.observe(o,{characterData:!0}),e=function(){r=(r+1)%2,o.data=r}}else{var a=Ni?window:"undefined"!=typeof global?global:{};e=a.setImmediate||setTimeout}return function(r,s){var o=s?function(){r.call(s)}:r;i.push(o),n||(n=!0,e(t,0))}}(),Ii=$.prototype;Ii.put=function(t,e){var i;this.size===this.limit&&(i=this.shift());var n=this.get(t,!0);return n||(n={key:t},this._keymap[t]=n,this.tail?(this.tail.newer=n,n.older=this.tail):this.head=n,this.tail=n,this.size++),n.value=e,i},Ii.shift=function(){var t=this.head;return t&&(this.head=this.head.newer,this.head.older=void 0,t.newer=t.older=void 0,this._keymap[t.key]=void 0,this.size--),t},Ii.get=function(t,e){var i=this._keymap[t];return void 0!==i?i===this.tail?e?i:i.value:(i.newer&&(i===this.head&&(this.head=i.newer),i.newer.older=i.older),i.older&&(i.older.newer=i.newer),i.newer=void 0,i.older=this.tail,this.tail&&(this.tail.newer=i),this.tail=i,e?i:i.value):void 0};var Bi,Vi,zi,Ui,Ji,qi,Qi,Gi,Ki,Zi,Xi,Yi,tn=new $(1e3),en=/[^\s'"]+|'[^']*'|"[^"]*"/g,nn=/^in$|^-?\d+/,rn=Object.freeze({parseDirective:A}),sn=/[-.*+?^${}()|[\]\/\\]/g,on=void 0,an=void 0,hn=void 0,ln=/[^|]\|[^|]/,cn=Object.freeze({compileRegex:T,parseText:N,tokensToExp:j}),un=["{{","}}"],fn=["{{{","}}}"],pn=Object.defineProperties({debug:!1,silent:!1,async:!0,warnExpressionErrors:!0,devtools:!1,_delimitersChanged:!0,_assetTypes:["component","directive","elementDirective","filter","transition","partial"],_propBindingModes:{ONE_WAY:0,TWO_WAY:1,ONE_TIME:2},_maxUpdateCount:100},{delimiters:{get:function(){return un},set:function(t){un=t,T()},configurable:!0,enumerable:!0},unsafeDelimiters:{get:function(){return fn},set:function(t){fn=t,T()},configurable:!0,enumerable:!0}}),dn=void 0,vn=Object.freeze({appendWithTransition:F,beforeWithTransition:D,removeWithTransition:P,applyTransition:R}),mn=/^v-ref:/,gn=0;ht.target=null,ht.prototype.addSub=function(t){this.subs.push(t)},ht.prototype.removeSub=function(t){this.subs.$remove(t)},ht.prototype.depend=function(){ht.target.addDep(this)},ht.prototype.notify=function(){for(var t=d(this.subs),e=0,i=t.length;i>e;e++)t[e].update()};var _n=Array.prototype,yn=Object.create(_n);["push","pop","shift","unshift","splice","sort","reverse"].forEach(function(t){var e=_n[t];_(yn,t,function(){for(var i=arguments.length,n=new Array(i);i--;)n[i]=arguments[i];var r,s=e.apply(this,n),o=this.__ob__;switch(t){case"push":r=n;break;case"unshift":r=n;break;case"splice":r=n.slice(2)}return r&&o.observeArray(r),o.dep.notify(),s})}),_(_n,"$set",function(t,e){return t>=this.length&&(this.length=Number(t)+1),this.splice(t,1,e)[0]}),_(_n,"$remove",function(t){if(this.length){var e=b(this,t);return e>-1?this.splice(e,1):void 0}});var bn=Object.getOwnPropertyNames(yn);lt.prototype.walk=function(t){for(var e=Object.keys(t),i=0,n=e.length;n>i;i++)this.convert(e[i],t[e[i]])},lt.prototype.observeArray=function(t){for(var e=0,i=t.length;i>e;e++)ft(t[e])},lt.prototype.convert=function(t,e){pt(this.value,t,e)},lt.prototype.addVm=function(t){(this.vms||(this.vms=[])).push(t)},lt.prototype.removeVm=function(t){this.vms.$remove(t)};var wn=/^(div|p|span|img|a|b|i|br|ul|ol|li|h1|h2|h3|h4|h5|h6|code|pre|table|th|td|tr|form|label|input|select|option|nav|article|section|header|footer)$/i,Cn=/^(slot|partial|component)$/i,$n=pn.optionMergeStrategies=Object.create(null);$n.data=function(t,e,i){return i?t||e?function(){var n="function"==typeof e?e.call(i):e,r="function"==typeof t?t.call(i):void 0;return n?bt(n,r):r}:void 0:e?"function"!=typeof e?t:t?function(){return bt(e.call(this),t.call(this))}:e:t},$n.el=function(t,e,i){if(i||!e||"function"==typeof e){var n=e||t;return i&&"function"==typeof n?n.call(i):n}},$n.init=$n.created=$n.ready=$n.attached=$n.detached=$n.beforeCompile=$n.compiled=$n.beforeDestroy=$n.destroyed=$n.activate=function(t,e){return e?t?t.concat(e):Oi(e)?e:[e]:t},$n.paramAttributes=function(){},pn._assetTypes.forEach(function(t){$n[t+"s"]=wt}),$n.watch=$n.events=function(t,e){if(!e)return t;if(!t)return e;var i={};v(i,t);for(var n in e){var r=i[n],s=e[n];r&&!Oi(r)&&(r=[r]),i[n]=r?r.concat(s):[s]}return i},$n.props=$n.methods=$n.computed=function(t,e){if(!e)return t;if(!t)return e;var i=Object.create(null);return v(i,t),v(i,e),i};var kn=function(t,e){return void 0===e?t:e},xn=Object.freeze({defineReactive:pt,set:t,del:e,hasOwn:i,isLiteral:n,isReserved:r,_toString:s,toNumber:o,toBoolean:a,stripQuotes:h,camelize:l,hyphenate:u,classify:f,bind:p,toArray:d,extend:v,isObject:m,isPlainObject:g,def:_,debounce:y,indexOf:b,cancellable:w,looseEqual:C,isArray:Oi,hasProto:Ti,inBrowser:Ni,devtools:ji,isIE9:Si,isAndroid:Fi,get transitionProp(){return Di},get transitionEndEvent(){return Pi},get animationProp(){return Ri},get animationEndEvent(){return Li},nextTick:Wi,query:L,inDoc:H,getAttr:M,getBindAttr:W,hasBindAttr:I,before:B,after:V,remove:z,prepend:U,replace:J,on:q,off:Q,setClass:G,addClass:K,removeClass:Z,extractContent:X,trimNode:Y,isTemplate:et,createAnchor:it,findRef:nt,mapNodeRange:rt,removeNodeRange:st,isFragment:ot,getOuterHTML:at,mergeOptions:xt,resolveAsset:At,assertAsset:Ot,checkComponentAttr:dt,initProp:mt,assertProp:_t,coerceProp:yt,commonTagRE:wn,reservedTagRE:Cn,warn:dn}),An=0,On=new $(1e3),Tn=0,Nn=1,jn=2,En=3,Sn=0,Fn=1,Dn=2,Pn=3,Rn=4,Ln=5,Hn=6,Mn=7,Wn=8,In=[];In[Sn]={ws:[Sn],ident:[Pn,Tn],"[":[Rn],eof:[Mn]},In[Fn]={ws:[Fn],".":[Dn],"[":[Rn],eof:[Mn]},In[Dn]={ws:[Dn],ident:[Pn,Tn]},In[Pn]={ident:[Pn,Tn],0:[Pn,Tn],number:[Pn,Tn],ws:[Fn,Nn],".":[Dn,Nn],"[":[Rn,Nn],eof:[Mn,Nn]},In[Rn]={"'":[Ln,Tn],'"':[Hn,Tn],"[":[Rn,jn],"]":[Fn,En],eof:Wn,"else":[Rn,Tn]},In[Ln]={"'":[Rn,Tn],eof:Wn,"else":[Ln,Tn]},In[Hn]={'"':[Rn,Tn],eof:Wn,"else":[Hn,Tn]};var Bn,Vn=Object.freeze({parsePath:St,getPath:Ft,setPath:Dt}),zn=new $(1e3),Un="Math,Date,this,true,false,null,undefined,Infinity,NaN,isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,parseInt,parseFloat",Jn=new RegExp("^("+Un.replace(/,/g,"\\b|")+"\\b)"),qn="break,case,class,catch,const,continue,debugger,default,delete,do,else,export,extends,finally,for,function,if,import,in,instanceof,let,return,super,switch,throw,try,var,while,with,yield,enum,await,implements,package,protected,static,interface,private,public",Qn=new RegExp("^("+qn.replace(/,/g,"\\b|")+"\\b)"),Gn=/\s/g,Kn=/\n/g,Zn=/[\{,]\s*[\w\$_]+\s*:|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*\$\{|\}(?:[^`\\]|\\.)*`|`(?:[^`\\]|\\.)*`)|new |typeof |void /g,Xn=/"(\d+)"/g,Yn=/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\]|\[\d+\]|\[[A-Za-z_$][\w$]*\])*$/,tr=/[^\w$\.](?:[A-Za-z_$][\w$]*)/g,er=/^(?:true|false)$/,ir=[],nr=Object.freeze({parseExpression:It,isSimplePath:Bt}),rr=[],sr=[],or={},ar={},hr=!1,lr=!1,cr=0;qt.prototype.get=function(){this.beforeGet();var t,e=this.scope||this.vm;try{t=this.getter.call(e,e)}catch(i){}return this.deep&&Qt(t),this.preProcess&&(t=this.preProcess(t)),this.filters&&(t=e._applyFilters(t,null,this.filters,!1)),this.postProcess&&(t=this.postProcess(t)),this.afterGet(),t},qt.prototype.set=function(t){var e=this.scope||this.vm;this.filters&&(t=e._applyFilters(t,this.value,this.filters,!0));try{this.setter.call(e,e,t)}catch(i){}var n=e.$forContext;if(n&&n.alias===this.expression){if(n.filters)return;n._withLock(function(){e.$key?n.rawValue[e.$key]=t:n.rawValue.$set(e.$index,t)})}},qt.prototype.beforeGet=function(){ht.target=this,this.newDepIds=Object.create(null),this.newDeps.length=0},qt.prototype.addDep=function(t){var e=t.id;this.newDepIds[e]||(this.newDepIds[e]=!0,this.newDeps.push(t),this.depIds[e]||t.addSub(this))},qt.prototype.afterGet=function(){ht.target=null;for(var t=this.deps.length;t--;){var e=this.deps[t];this.newDepIds[e.id]||e.removeSub(this)}this.depIds=this.newDepIds;var i=this.deps;this.deps=this.newDeps,this.newDeps=i},qt.prototype.update=function(t){this.lazy?this.dirty=!0:this.sync||!pn.async?this.run():(this.shallow=this.queued?t?this.shallow:!1:!!t,this.queued=!0,Jt(this))},qt.prototype.run=function(){if(this.active){var t=this.get();if(t!==this.value||(m(t)||this.deep)&&!this.shallow){var e=this.value;this.value=t,this.prevError,this.cb.call(this.vm,t,e)}this.queued=this.shallow=!1}},qt.prototype.evaluate=function(){var t=ht.target;this.value=this.get(),this.dirty=!1,ht.target=t},qt.prototype.depend=function(){for(var t=this.deps.length;t--;)this.deps[t].depend()},qt.prototype.teardown=function(){if(this.active){this.vm._isBeingDestroyed||this.vm._vForRemoving||this.vm._watchers.$remove(this);for(var t=this.deps.length;t--;)this.deps[t].removeSub(this);this.active=!1,this.vm=this.cb=this.value=null}};var ur={bind:function(){this.attr=3===this.el.nodeType?"data":"textContent"},update:function(t){this.el[this.attr]=s(t)}},fr=new $(1e3),pr=new $(1e3),dr={efault:[0,"",""],legend:[1,"<fieldset>","</fieldset>"],tr:[2,"<table><tbody>","</tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"]};dr.td=dr.th=[3,"<table><tbody><tr>","</tr></tbody></table>"],dr.option=dr.optgroup=[1,'<select multiple="multiple">',"</select>"],dr.thead=dr.tbody=dr.colgroup=dr.caption=dr.tfoot=[1,"<table>","</table>"],dr.g=dr.defs=dr.symbol=dr.use=dr.image=dr.text=dr.circle=dr.ellipse=dr.line=dr.path=dr.polygon=dr.polyline=dr.rect=[1,'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:ev="http://www.w3.org/2001/xml-events"version="1.1">',"</svg>"];var vr=/<([\w:-]+)/,mr=/&#?\w+?;/,gr=function(){if(Ni){var t=document.createElement("div");return t.innerHTML="<template>1</template>",!t.cloneNode(!0).firstChild.innerHTML}return!1}(),_r=function(){if(Ni){var t=document.createElement("textarea");return t.placeholder="t","t"===t.cloneNode(!0).value}return!1}(),yr=Object.freeze({cloneNode:Xt,parseTemplate:Yt}),br={bind:function(){8===this.el.nodeType&&(this.nodes=[],this.anchor=it("v-html"),J(this.el,this.anchor))},update:function(t){t=s(t),this.nodes?this.swap(t):this.el.innerHTML=t},swap:function(t){for(var e=this.nodes.length;e--;)z(this.nodes[e]);var i=Yt(t,!0,!0);this.nodes=d(i.childNodes),B(i,this.anchor)}};te.prototype.callHook=function(t){var e,i;for(e=0,i=this.childFrags.length;i>e;e++)this.childFrags[e].callHook(t);for(e=0,i=this.children.length;i>e;e++)t(this.children[e])},te.prototype.beforeRemove=function(){var t,e;for(t=0,e=this.childFrags.length;e>t;t++)this.childFrags[t].beforeRemove(!1);for(t=0,e=this.children.length;e>t;t++)this.children[t].$destroy(!1,!0);var i=this.unlink.dirs;for(t=0,e=i.length;e>t;t++)i[t]._watcher&&i[t]._watcher.teardown()},te.prototype.destroy=function(){this.parentFrag&&this.parentFrag.childFrags.$remove(this),this.node.__v_frag=null,this.unlink()};var wr=new $(5e3);ae.prototype.create=function(t,e,i){var n=Xt(this.template);return new te(this.linker,this.vm,n,t,e,i)};var Cr=700,$r=800,kr=850,xr=1100,Ar=1500,Or=1500,Tr=1750,Nr=2e3,jr=2e3,Er=2100,Sr=0,Fr={priority:Nr,params:["track-by","stagger","enter-stagger","leave-stagger"],bind:function(){var t=this.expression.match(/(.*) (?:in|of) (.*)/);if(t){var e=t[1].match(/\((.*),(.*)\)/);e?(this.iterator=e[1].trim(),this.alias=e[2].trim()):this.alias=t[1].trim(),this.expression=t[2]}if(this.alias){this.id="__v-for__"+ ++Sr;var i=this.el.tagName;this.isOption=("OPTION"===i||"OPTGROUP"===i)&&"SELECT"===this.el.parentNode.tagName,this.start=it("v-for-start"),this.end=it("v-for-end"),J(this.el,this.end),B(this.start,this.end),this.cache=Object.create(null),this.factory=new ae(this.vm,this.el)}},update:function(t){this.diff(t),this.updateRef(),this.updateModel()},diff:function(t){var e,n,r,s,o,a,h=t[0],l=this.fromObject=m(h)&&i(h,"$key")&&i(h,"$value"),c=this.params.trackBy,u=this.frags,f=this.frags=new Array(t.length),p=this.alias,d=this.iterator,v=this.start,g=this.end,_=H(v),y=!u;for(e=0,n=t.length;n>e;e++)h=t[e],s=l?h.$key:null,o=l?h.$value:h,a=!m(o),r=!y&&this.getCachedFrag(o,e,s),r?(r.reused=!0,r.scope.$index=e,s&&(r.scope.$key=s),d&&(r.scope[d]=null!==s?s:e),(c||l||a)&&(r.scope[p]=o)):(r=this.create(o,p,e,s),r.fresh=!y),f[e]=r,y&&r.before(g);if(!y){var b=0,w=u.length-f.length;for(this.vm._vForRemoving=!0,e=0,n=u.length;n>e;e++)r=u[e],r.reused||(this.deleteCachedFrag(r),this.remove(r,b++,w,_));this.vm._vForRemoving=!1,b&&(this.vm._watchers=this.vm._watchers.filter(function(t){return t.active}));var C,$,k,x=0;for(e=0,n=f.length;n>e;e++)r=f[e],C=f[e-1],$=C?C.staggerCb?C.staggerAnchor:C.end||C.node:v,r.reused&&!r.staggerCb?(k=he(r,v,this.id),k===C||k&&he(k,v,this.id)===C||this.move(r,$)):this.insert(r,x++,$,_),r.reused=r.fresh=!1}},create:function(t,e,i,n){var r=this._host,s=this._scope||this.vm,o=Object.create(s);o.$refs=Object.create(s.$refs),o.$els=Object.create(s.$els),o.$parent=s,o.$forContext=this,pt(o,e,t,!0),pt(o,"$index",i),n?pt(o,"$key",n):o.$key&&_(o,"$key",null),this.iterator&&pt(o,this.iterator,null!==n?n:i);var a=this.factory.create(r,o,this._frag);return a.forId=this.id,this.cacheFrag(t,a,i,n),a},updateRef:function(){var t=this.descriptor.ref;if(t){var e,i=(this._scope||this.vm).$refs;this.fromObject?(e={},this.frags.forEach(function(t){e[t.scope.$key]=le(t)})):e=this.frags.map(le),i[t]=e}},updateModel:function(){if(this.isOption){var t=this.start.parentNode,e=t&&t.__v_model;e&&e.forceUpdate()}},insert:function(t,e,i,n){t.staggerCb&&(t.staggerCb.cancel(),t.staggerCb=null);var r=this.getStagger(t,e,null,"enter");if(n&&r){var s=t.staggerAnchor;s||(s=t.staggerAnchor=it("stagger-anchor"),s.__v_frag=t),V(s,i);var o=t.staggerCb=w(function(){t.staggerCb=null,t.before(s),z(s)});setTimeout(o,r)}else t.before(i.nextSibling)},remove:function(t,e,i,n){if(t.staggerCb)return t.staggerCb.cancel(),void(t.staggerCb=null);var r=this.getStagger(t,e,i,"leave");if(n&&r){var s=t.staggerCb=w(function(){t.staggerCb=null,t.remove()});setTimeout(s,r)}else t.remove()},move:function(t,e){e.nextSibling||this.end.parentNode.appendChild(this.end),t.before(e.nextSibling,!1)},cacheFrag:function(t,e,n,r){var s,o=this.params.trackBy,a=this.cache,h=!m(t);r||o||h?(s=o?"$index"===o?n:t[o]:r||t,a[s]||(a[s]=e)):(s=this.id,i(t,s)?null===t[s]&&(t[s]=e):_(t,s,e)),e.raw=t},getCachedFrag:function(t,e,i){var n,r=this.params.trackBy,s=!m(t);if(i||r||s){var o=r?"$index"===r?e:t[r]:i||t;n=this.cache[o]}else n=t[this.id];return n&&(n.reused||n.fresh),n},deleteCachedFrag:function(t){var e=t.raw,n=this.params.trackBy,r=t.scope,s=r.$index,o=i(r,"$key")&&r.$key,a=!m(e);if(n||o||a){var h=n?"$index"===n?s:e[n]:o||e;this.cache[h]=null}else e[this.id]=null,t.raw=null},getStagger:function(t,e,i,n){n+="Stagger";var r=t.node.__v_trans,s=r&&r.hooks,o=s&&(s[n]||s.stagger);return o?o.call(t,e,i):e*parseInt(this.params[n]||this.params.stagger,10)},_preProcess:function(t){return this.rawValue=t,t},_postProcess:function(t){if(Oi(t))return t;if(g(t)){for(var e,i=Object.keys(t),n=i.length,r=new Array(n);n--;)e=i[n],r[n]={$key:e,$value:t[e]};return r}return"number"!=typeof t||isNaN(t)||(t=ce(t)),t||[]},unbind:function(){if(this.descriptor.ref&&((this._scope||this.vm).$refs[this.descriptor.ref]=null),this.frags)for(var t,e=this.frags.length;e--;)t=this.frags[e],this.deleteCachedFrag(t),t.destroy()}},Dr={priority:jr,bind:function(){var t=this.el;if(t.__vue__)this.invalid=!0;else{var e=t.nextElementSibling;e&&null!==M(e,"v-else")&&(z(e),this.elseEl=e),this.anchor=it("v-if"),J(t,this.anchor)}},update:function(t){this.invalid||(t?this.frag||this.insert():this.remove())},insert:function(){this.elseFrag&&(this.elseFrag.remove(),this.elseFrag=null),this.factory||(this.factory=new ae(this.vm,this.el)),this.frag=this.factory.create(this._host,this._scope,this._frag),this.frag.before(this.anchor)},remove:function(){this.frag&&(this.frag.remove(),this.frag=null),this.elseEl&&!this.elseFrag&&(this.elseFactory||(this.elseFactory=new ae(this.elseEl._context||this.vm,this.elseEl)),this.elseFrag=this.elseFactory.create(this._host,this._scope,this._frag),this.elseFrag.before(this.anchor))},unbind:function(){this.frag&&this.frag.destroy(),this.elseFrag&&this.elseFrag.destroy()}},Pr={bind:function(){var t=this.el.nextElementSibling;t&&null!==M(t,"v-else")&&(this.elseEl=t)},update:function(t){this.apply(this.el,t),this.elseEl&&this.apply(this.elseEl,!t)},apply:function(t,e){function i(){t.style.display=e?"":"none"}H(t)?R(t,e?1:-1,i,this.vm):i()}},Rr={bind:function(){var t=this,e=this.el,i="range"===e.type,n=this.params.lazy,r=this.params.number,s=this.params.debounce,a=!1;if(Fi||i||(this.on("compositionstart",function(){a=!0}),this.on("compositionend",function(){a=!1,n||t.listener()})),this.focused=!1,i||n||(this.on("focus",function(){t.focused=!0}),this.on("blur",function(){t.focused=!1,t._frag&&!t._frag.inserted||t.rawListener()})),this.listener=this.rawListener=function(){if(!a&&t._bound){var n=r||i?o(e.value):e.value;t.set(n),Wi(function(){t._bound&&!t.focused&&t.update(t._watcher.value)})}},s&&(this.listener=y(this.listener,s)),this.hasjQuery="function"==typeof jQuery,this.hasjQuery){var h=jQuery.fn.on?"on":"bind";jQuery(e)[h]("change",this.rawListener),n||jQuery(e)[h]("input",this.listener)}else this.on("change",this.rawListener),n||this.on("input",this.listener);!n&&Si&&(this.on("cut",function(){Wi(t.listener)}),this.on("keyup",function(e){46!==e.keyCode&&8!==e.keyCode||t.listener()})),(e.hasAttribute("value")||"TEXTAREA"===e.tagName&&e.value.trim())&&(this.afterBind=this.listener)},update:function(t){this.el.value=s(t)},unbind:function(){var t=this.el;if(this.hasjQuery){var e=jQuery.fn.off?"off":"unbind";jQuery(t)[e]("change",this.listener),jQuery(t)[e]("input",this.listener)}}},Lr={bind:function(){var t=this,e=this.el;this.getValue=function(){if(e.hasOwnProperty("_value"))return e._value;var i=e.value;return t.params.number&&(i=o(i)),i},this.listener=function(){t.set(t.getValue())},this.on("change",this.listener),e.hasAttribute("checked")&&(this.afterBind=this.listener)},update:function(t){this.el.checked=C(t,this.getValue())}},Hr={bind:function(){var t=this,e=this.el;this.forceUpdate=function(){t._watcher&&t.update(t._watcher.get())};var i=this.multiple=e.hasAttribute("multiple");this.listener=function(){var n=ue(e,i);n=t.params.number?Oi(n)?n.map(o):o(n):n,t.set(n)},this.on("change",this.listener);var n=ue(e,i,!0);(i&&n.length||!i&&null!==n)&&(this.afterBind=this.listener),this.vm.$on("hook:attached",this.forceUpdate)},update:function(t){var e=this.el;e.selectedIndex=-1;for(var i,n,r=this.multiple&&Oi(t),s=e.options,o=s.length;o--;)i=s[o],n=i.hasOwnProperty("_value")?i._value:i.value,i.selected=r?fe(t,n)>-1:C(t,n)},unbind:function(){this.vm.$off("hook:attached",this.forceUpdate)}},Mr={bind:function(){function t(){var t=i.checked;return t&&i.hasOwnProperty("_trueValue")?i._trueValue:!t&&i.hasOwnProperty("_falseValue")?i._falseValue:t}var e=this,i=this.el;this.getValue=function(){return i.hasOwnProperty("_value")?i._value:e.params.number?o(i.value):i.value},this.listener=function(){var n=e._watcher.value;if(Oi(n)){var r=e.getValue();i.checked?b(n,r)<0&&n.push(r):n.$remove(r)}else e.set(t())},this.on("change",this.listener),i.hasAttribute("checked")&&(this.afterBind=this.listener)},update:function(t){var e=this.el;Oi(t)?e.checked=b(t,this.getValue())>-1:e.hasOwnProperty("_trueValue")?e.checked=C(t,e._trueValue):e.checked=!!t}},Wr={text:Rr,radio:Lr,select:Hr,checkbox:Mr},Ir={priority:$r,twoWay:!0,handlers:Wr,params:["lazy","number","debounce"],bind:function(){this.checkFilters(),this.hasRead&&!this.hasWrite;var t,e=this.el,i=e.tagName;if("INPUT"===i)t=Wr[e.type]||Wr.text;else if("SELECT"===i)t=Wr.select;else{if("TEXTAREA"!==i)return;t=Wr.text}e.__v_model=this,t.bind.call(this),this.update=t.update,this._unbind=t.unbind},checkFilters:function(){var t=this.filters;if(t)for(var e=t.length;e--;){var i=At(this.vm.$options,"filters",t[e].name);("function"==typeof i||i.read)&&(this.hasRead=!0),i.write&&(this.hasWrite=!0)}},unbind:function(){this.el.__v_model=null,this._unbind&&this._unbind()}},Br={esc:27,tab:9,enter:13,space:32,"delete":[8,46],up:38,left:37,right:39,down:40},Vr={priority:Cr,acceptStatement:!0,keyCodes:Br,bind:function(){if("IFRAME"===this.el.tagName&&"load"!==this.arg){var t=this;this.iframeBind=function(){q(t.el.contentWindow,t.arg,t.handler,t.modifiers.capture)},this.on("load",this.iframeBind)}},update:function(t){if(this.descriptor.raw||(t=function(){}),"function"==typeof t){this.modifiers.stop&&(t=de(t)),this.modifiers.prevent&&(t=ve(t)),this.modifiers.self&&(t=me(t));var e=Object.keys(this.modifiers).filter(function(t){return"stop"!==t&&"prevent"!==t&&"self"!==t});e.length&&(t=pe(t,e)),this.reset(),this.handler=t,this.iframeBind?this.iframeBind():q(this.el,this.arg,this.handler,this.modifiers.capture)}},reset:function(){var t=this.iframeBind?this.el.contentWindow:this.el;this.handler&&Q(t,this.arg,this.handler)},unbind:function(){this.reset()}},zr=["-webkit-","-moz-","-ms-"],Ur=["Webkit","Moz","ms"],Jr=/!important;?$/,qr=Object.create(null),Qr=null,Gr={deep:!0,update:function(t){"string"==typeof t?this.el.style.cssText=t:Oi(t)?this.handleObject(t.reduce(v,{})):this.handleObject(t||{})},handleObject:function(t){var e,i,n=this.cache||(this.cache={});for(e in n)e in t||(this.handleSingle(e,null),delete n[e]);for(e in t)i=t[e],i!==n[e]&&(n[e]=i,this.handleSingle(e,i))},handleSingle:function(t,e){if(t=ge(t))if(null!=e&&(e+=""),e){var i=Jr.test(e)?"important":"";i&&(e=e.replace(Jr,"").trim()),this.el.style.setProperty(t,e,i)}else this.el.style.removeProperty(t)}},Kr="http://www.w3.org/1999/xlink",Zr=/^xlink:/,Xr=/^v-|^:|^@|^(?:is|transition|transition-mode|debounce|track-by|stagger|enter-stagger|leave-stagger)$/,Yr=/^(?:value|checked|selected|muted)$/,ts=/^(?:draggable|contenteditable|spellcheck)$/,es={value:"_value","true-value":"_trueValue","false-value":"_falseValue"},is={priority:kr,bind:function(){var t=this.arg,e=this.el.tagName;t||(this.deep=!0);var i=this.descriptor,n=i.interp;n&&(i.hasOneTime&&(this.expression=j(n,this._scope||this.vm)),(Xr.test(t)||"name"===t&&("PARTIAL"===e||"SLOT"===e))&&(this.el.removeAttribute(t),this.invalid=!0))},update:function(t){if(!this.invalid){var e=this.arg;this.arg?this.handleSingle(e,t):this.handleObject(t||{})}},handleObject:Gr.handleObject,handleSingle:function(t,e){var i=this.el,n=this.descriptor.interp;this.modifiers.camel&&(t=l(t)),!n&&Yr.test(t)&&t in i&&(i[t]="value"===t&&null==e?"":e);var r=es[t];if(!n&&r){i[r]=e;var s=i.__v_model;s&&s.listener()}return"value"===t&&"TEXTAREA"===i.tagName?void i.removeAttribute(t):void(ts.test(t)?i.setAttribute(t,e?"true":"false"):null!=e&&e!==!1?"class"===t?(i.__v_trans&&(e+=" "+i.__v_trans.id+"-transition"),G(i,e)):Zr.test(t)?i.setAttributeNS(Kr,t,e===!0?"":e):i.setAttribute(t,e===!0?"":e):i.removeAttribute(t))}},ns={priority:Ar,bind:function(){if(this.arg){var t=this.id=l(this.arg),e=(this._scope||this.vm).$els;i(e,t)?e[t]=this.el:pt(e,t,this.el)}},unbind:function(){var t=(this._scope||this.vm).$els;t[this.id]===this.el&&(t[this.id]=null)}},rs={bind:function(){}},ss={bind:function(){var t=this.el;this.vm.$once("pre-hook:compiled",function(){t.removeAttribute("v-cloak")})}},os={text:ur,html:br,"for":Fr,"if":Dr,show:Pr,model:Ir,on:Vr,bind:is,el:ns,ref:rs,cloak:ss},as={deep:!0,update:function(t){t&&"string"==typeof t?this.handleObject(ye(t)):g(t)?this.handleObject(t):Oi(t)?this.handleArray(t):this.cleanup()},handleObject:function(t){this.cleanup(t);for(var e=this.prevKeys=Object.keys(t),i=0,n=e.length;n>i;i++){var r=e[i];t[r]?K(this.el,r):Z(this.el,r)}},handleArray:function(t){this.cleanup(t);for(var e=0,i=t.length;i>e;e++)t[e]&&K(this.el,t[e]);this.prevKeys=t.slice()},cleanup:function(t){if(this.prevKeys)for(var e=this.prevKeys.length;e--;){var i=this.prevKeys[e];!i||t&&be(t,i)||Z(this.el,i)}}},hs={priority:Or,params:["keep-alive","transition-mode","inline-template"],bind:function(){this.el.__vue__||(this.keepAlive=this.params.keepAlive,this.keepAlive&&(this.cache={}),this.params.inlineTemplate&&(this.inlineTemplate=X(this.el,!0)),this.pendingComponentCb=this.Component=null,this.pendingRemovals=0,this.pendingRemovalCb=null,this.anchor=it("v-component"),J(this.el,this.anchor),this.el.removeAttribute("is"),this.descriptor.ref&&this.el.removeAttribute("v-ref:"+u(this.descriptor.ref)),this.literal&&this.setComponent(this.expression))},update:function(t){
this.literal||this.setComponent(t)},setComponent:function(t,e){if(this.invalidatePending(),t){var i=this;this.resolveComponent(t,function(){i.mountComponent(e)})}else this.unbuild(!0),this.remove(this.childVM,e),this.childVM=null},resolveComponent:function(t,e){var i=this;this.pendingComponentCb=w(function(n){i.ComponentName=n.options.name||t,i.Component=n,e()}),this.vm._resolveComponent(t,this.pendingComponentCb)},mountComponent:function(t){this.unbuild(!0);var e=this,i=this.Component.options.activate,n=this.getCached(),r=this.build();i&&!n?(this.waitingFor=r,we(i,r,function(){e.waitingFor===r&&(e.waitingFor=null,e.transition(r,t))})):(n&&r._updateRef(),this.transition(r,t))},invalidatePending:function(){this.pendingComponentCb&&(this.pendingComponentCb.cancel(),this.pendingComponentCb=null)},build:function(t){var e=this.getCached();if(e)return e;if(this.Component){var i={name:this.ComponentName,el:Xt(this.el),template:this.inlineTemplate,parent:this._host||this.vm,_linkerCachable:!this.inlineTemplate,_ref:this.descriptor.ref,_asComponent:!0,_isRouterView:this._isRouterView,_context:this.vm,_scope:this._scope,_frag:this._frag};t&&v(i,t);var n=new this.Component(i);return this.keepAlive&&(this.cache[this.Component.cid]=n),n}},getCached:function(){return this.keepAlive&&this.cache[this.Component.cid]},unbuild:function(t){this.waitingFor&&(this.waitingFor.$destroy(),this.waitingFor=null);var e=this.childVM;return!e||this.keepAlive?void(e&&(e._inactive=!0,e._updateRef(!0))):void e.$destroy(!1,t)},remove:function(t,e){var i=this.keepAlive;if(t){this.pendingRemovals++,this.pendingRemovalCb=e;var n=this;t.$remove(function(){n.pendingRemovals--,i||t._cleanup(),!n.pendingRemovals&&n.pendingRemovalCb&&(n.pendingRemovalCb(),n.pendingRemovalCb=null)})}else e&&e()},transition:function(t,e){var i=this,n=this.childVM;switch(n&&(n._inactive=!0),t._inactive=!1,this.childVM=t,i.params.transitionMode){case"in-out":t.$before(i.anchor,function(){i.remove(n,e)});break;case"out-in":i.remove(n,function(){t.$before(i.anchor,e)});break;default:i.remove(n),t.$before(i.anchor,e)}},unbind:function(){if(this.invalidatePending(),this.unbuild(),this.cache){for(var t in this.cache)this.cache[t].$destroy();this.cache=null}}},ls=pn._propBindingModes,cs={bind:function(){var t=this.vm,e=t._context,i=this.descriptor.prop,n=i.path,r=i.parentPath,s=i.mode===ls.TWO_WAY,o=this.parentWatcher=new qt(e,r,function(e){e=yt(i,e),_t(i,e)&&(t[n]=e)},{twoWay:s,filters:i.filters,scope:this._scope});if(mt(t,i,o.value),s){var a=this;t.$once("pre-hook:created",function(){a.childWatcher=new qt(t,n,function(t){o.set(t)},{sync:!0})})}},unbind:function(){this.parentWatcher.teardown(),this.childWatcher&&this.childWatcher.teardown()}},us=[],fs=!1,ps="transition",ds="animation",vs=Di+"Duration",ms=Ri+"Duration",gs=ke.prototype;gs.enter=function(t,e){this.cancelPending(),this.callHook("beforeEnter"),this.cb=e,K(this.el,this.enterClass),t(),this.entered=!1,this.callHookWithCb("enter"),this.entered||(this.cancel=this.hooks&&this.hooks.enterCancelled,Ce(this.enterNextTick))},gs.enterNextTick=function(){this.justEntered=!0;var t=this;setTimeout(function(){t.justEntered=!1},17);var e=this.enterDone,i=this.getCssTransitionType(this.enterClass);this.pendingJsCb?i===ps&&Z(this.el,this.enterClass):i===ps?(Z(this.el,this.enterClass),this.setupCssCb(Pi,e)):i===ds?this.setupCssCb(Li,e):e()},gs.enterDone=function(){this.entered=!0,this.cancel=this.pendingJsCb=null,Z(this.el,this.enterClass),this.callHook("afterEnter"),this.cb&&this.cb()},gs.leave=function(t,e){this.cancelPending(),this.callHook("beforeLeave"),this.op=t,this.cb=e,K(this.el,this.leaveClass),this.left=!1,this.callHookWithCb("leave"),this.left||(this.cancel=this.hooks&&this.hooks.leaveCancelled,this.op&&!this.pendingJsCb&&(this.justEntered?this.leaveDone():Ce(this.leaveNextTick)))},gs.leaveNextTick=function(){var t=this.getCssTransitionType(this.leaveClass);if(t){var e=t===ps?Pi:Li;this.setupCssCb(e,this.leaveDone)}else this.leaveDone()},gs.leaveDone=function(){this.left=!0,this.cancel=this.pendingJsCb=null,this.op(),Z(this.el,this.leaveClass),this.callHook("afterLeave"),this.cb&&this.cb(),this.op=null},gs.cancelPending=function(){this.op=this.cb=null;var t=!1;this.pendingCssCb&&(t=!0,Q(this.el,this.pendingCssEvent,this.pendingCssCb),this.pendingCssEvent=this.pendingCssCb=null),this.pendingJsCb&&(t=!0,this.pendingJsCb.cancel(),this.pendingJsCb=null),t&&(Z(this.el,this.enterClass),Z(this.el,this.leaveClass)),this.cancel&&(this.cancel.call(this.vm,this.el),this.cancel=null)},gs.callHook=function(t){this.hooks&&this.hooks[t]&&this.hooks[t].call(this.vm,this.el)},gs.callHookWithCb=function(t){var e=this.hooks&&this.hooks[t];e&&(e.length>1&&(this.pendingJsCb=w(this[t+"Done"])),e.call(this.vm,this.el,this.pendingJsCb))},gs.getCssTransitionType=function(t){if(!(!Pi||document.hidden||this.hooks&&this.hooks.css===!1||xe(this.el))){var e=this.type||this.typeCache[t];if(e)return e;var i=this.el.style,n=window.getComputedStyle(this.el),r=i[vs]||n[vs];if(r&&"0s"!==r)e=ps;else{var s=i[ms]||n[ms];s&&"0s"!==s&&(e=ds)}return e&&(this.typeCache[t]=e),e}},gs.setupCssCb=function(t,e){this.pendingCssEvent=t;var i=this,n=this.el,r=this.pendingCssCb=function(s){s.target===n&&(Q(n,t,r),i.pendingCssEvent=i.pendingCssCb=null,!i.pendingJsCb&&e&&e())};q(n,t,r)};var _s={priority:xr,update:function(t,e){var i=this.el,n=At(this.vm.$options,"transitions",t);t=t||"v",i.__v_trans=new ke(i,t,n,this.vm),e&&Z(i,e+"-transition"),K(i,t+"-transition")}},ys={style:Gr,"class":as,component:hs,prop:cs,transition:_s},bs=pn._propBindingModes,ws={},Cs=/^[$_a-zA-Z]+[\w$]*$/,$s=/^v-bind:|^:/,ks=/^v-on:|^@/,xs=/^v-([^:]+)(?:$|:(.*)$)/,As=/\.[^\.]+/g,Os=/^(v-bind:|:)?transition$/,Ts=["for","if"],Ns=1e3;Je.terminal=!0;var js=/[^\w\-:\.]/,Es=Object.freeze({compile:Te,compileAndLinkProps:Fe,compileRoot:De,terminalDirectives:Ts,transclude:Xe,resolveSlots:ii}),Ss=/^v-on:|^@/;ai.prototype._bind=function(){var t=this.name,e=this.descriptor;if(("cloak"!==t||this.vm._isCompiled)&&this.el&&this.el.removeAttribute){var i=e.attr||"v-"+t;this.el.removeAttribute(i)}var n=e.def;if("function"==typeof n?this.update=n:v(this,n),this._setupParams(),this.bind&&this.bind(),this._bound=!0,this.literal)this.update&&this.update(e.raw);else if((this.expression||this.modifiers)&&(this.update||this.twoWay)&&!this._checkStatement()){var r=this;this.update?this._update=function(t,e){r._locked||r.update(t,e)}:this._update=oi;var s=this._preProcess?p(this._preProcess,this):null,o=this._postProcess?p(this._postProcess,this):null,a=this._watcher=new qt(this.vm,this.expression,this._update,{filters:this.filters,twoWay:this.twoWay,deep:this.deep,preProcess:s,postProcess:o,scope:this._scope});this.afterBind?this.afterBind():this.update&&this.update(a.value)}},ai.prototype._setupParams=function(){if(this.params){var t=this.params;this.params=Object.create(null);for(var e,i,n,r=t.length;r--;)e=t[r],n=l(e),i=W(this.el,e),null!=i?this._setupParamWatcher(n,i):(i=M(this.el,e),null!=i&&(this.params[n]=""===i?!0:i))}},ai.prototype._setupParamWatcher=function(t,e){var i=this,n=!1,r=(this._scope||this.vm).$watch(e,function(e,r){if(i.params[t]=e,n){var s=i.paramWatchers&&i.paramWatchers[t];s&&s.call(i,e,r)}else n=!0},{immediate:!0,user:!1});(this._paramUnwatchFns||(this._paramUnwatchFns=[])).push(r)},ai.prototype._checkStatement=function(){var t=this.expression;if(t&&this.acceptStatement&&!Bt(t)){var e=It(t).get,i=this._scope||this.vm,n=function(t){i.$event=t,e.call(i,i),i.$event=null};return this.filters&&(n=i._applyFilters(n,null,this.filters)),this.update(n),!0}},ai.prototype.set=function(t){this.twoWay&&this._withLock(function(){this._watcher.set(t)})},ai.prototype._withLock=function(t){var e=this;e._locked=!0,t.call(e),Wi(function(){e._locked=!1})},ai.prototype.on=function(t,e,i){q(this.el,t,e,i),(this._listeners||(this._listeners=[])).push([t,e])},ai.prototype._teardown=function(){if(this._bound){this._bound=!1,this.unbind&&this.unbind(),this._watcher&&this._watcher.teardown();var t,e=this._listeners;if(e)for(t=e.length;t--;)Q(this.el,e[t][0],e[t][1]);var i=this._paramUnwatchFns;if(i)for(t=i.length;t--;)i[t]();this.vm=this.el=this._watcher=this._listeners=null}};var Fs=/[^|]\|[^|]/;Tt(di),ri(di),si(di),hi(di),li(di),ci(di),ui(di),fi(di),pi(di);var Ds={priority:Er,params:["name"],bind:function(){var t=this.params.name||"default",e=this.vm._slotContents&&this.vm._slotContents[t];e&&e.hasChildNodes()?this.compile(e.cloneNode(!0),this.vm._context,this.vm):this.fallback()},compile:function(t,e,i){if(t&&e){if(this.el.hasChildNodes()&&1===t.childNodes.length&&1===t.childNodes[0].nodeType&&t.childNodes[0].hasAttribute("v-if")){var n=document.createElement("template");n.setAttribute("v-else",""),n.innerHTML=this.el.innerHTML,n._context=this.vm,t.appendChild(n)}var r=i?i._scope:this._scope;this.unlink=e.$compile(t,i,r,this._frag)}t?J(this.el,t):z(this.el)},fallback:function(){this.compile(X(this.el,!0),this.vm)},unbind:function(){this.unlink&&this.unlink()}},Ps={priority:Tr,params:["name"],paramWatchers:{name:function(t){Dr.remove.call(this),t&&this.insert(t)}},bind:function(){this.anchor=it("v-partial"),J(this.el,this.anchor),this.insert(this.params.name)},insert:function(t){var e=At(this.vm.$options,"partials",t);e&&(this.factory=new ae(this.vm,e),Dr.insert.call(this))},unbind:function(){this.frag&&this.frag.destroy()}},Rs={slot:Ds,partial:Ps},Ls=Fr._postProcess,Hs=/(\d{3})(?=\d)/g,Ms={orderBy:gi,filterBy:mi,limitBy:vi,json:{read:function(t,e){return"string"==typeof t?t:JSON.stringify(t,null,Number(e)||2)},write:function(t){try{return JSON.parse(t)}catch(e){return t}}},capitalize:function(t){return t||0===t?(t=t.toString(),t.charAt(0).toUpperCase()+t.slice(1)):""},uppercase:function(t){return t||0===t?t.toString().toUpperCase():""},lowercase:function(t){return t||0===t?t.toString().toLowerCase():""},currency:function(t,e){if(t=parseFloat(t),!isFinite(t)||!t&&0!==t)return"";e=null!=e?e:"$";var i=Math.abs(t).toFixed(2),n=i.slice(0,-3),r=n.length%3,s=r>0?n.slice(0,r)+(n.length>3?",":""):"",o=i.slice(-3),a=0>t?"-":"";return a+e+s+n.slice(r).replace(Hs,"$1,")+o},pluralize:function(t){var e=d(arguments,1);return e.length>1?e[t%10-1]||e[e.length-1]:e[0]+(1===t?"":"s")},debounce:function(t,e){return t?(e||(e=300),y(t,e)):void 0}};return yi(di),di.version="1.0.18",pn.devtools&&ji&&ji.emit("init",di),di});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],"/var/www/github/hack-it-challenge/master/src/main.js":[function(require,module,exports){
"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{"default":e}}var _vueMin=require("./lib/vue.min.js"),_vueMin2=_interopRequireDefault(_vueMin),_secureLocalStorage=require("./lib/secure-local-storage.js"),_password=require("./lib/password.js"),_password2=_interopRequireDefault(_password),_app=require("./components/app.vue"),_app2=_interopRequireDefault(_app);_vueMin2["default"].config.devtools=!1,_secureLocalStorage.setPassword.call(_secureLocalStorage.secureStorage,_password2["default"]),"admin"!==_secureLocalStorage.secureStorage.get("userRole")&&_secureLocalStorage.secureStorage.set({namaUser:"BosNaufal",userRole:"user"});var App=_vueMin2["default"].extend(_app2["default"]);new App({el:"#app",replace:!1});

},{"./components/app.vue":"/var/www/github/hack-it-challenge/master/src/components/app.vue","./lib/password.js":"/var/www/github/hack-it-challenge/master/src/lib/password.js","./lib/secure-local-storage.js":"/var/www/github/hack-it-challenge/master/src/lib/secure-local-storage.js","./lib/vue.min.js":"/var/www/github/hack-it-challenge/master/src/lib/vue.min.js"}]},{},["/var/www/github/hack-it-challenge/master/src/main.js"])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3Z1ZS1ob3QtcmVsb2FkLWFwaS9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uL3Vzci9saWIvbm9kZV9tb2R1bGVzL3Z1ZS9kaXN0L25vZGVfbW9kdWxlcy92dWUvZGlzdC92dWUuY29tbW9uLmpzIiwiL3Zhci93d3cvZ2l0aHViL2hhY2staXQtY2hhbGxlbmdlL21hc3Rlci9zcmMvY29tcG9uZW50cy9hcHAudnVlIiwiL3Zhci93d3cvZ2l0aHViL2hhY2staXQtY2hhbGxlbmdlL21hc3Rlci9zcmMvbGliL3Bhc3N3b3JkLmpzIiwiL3Zhci93d3cvZ2l0aHViL2hhY2staXQtY2hhbGxlbmdlL21hc3Rlci9zcmMvbGliL3NlY3VyZS1sb2NhbC1zdG9yYWdlLmpzIiwiL3Zhci93d3cvZ2l0aHViL2hhY2staXQtY2hhbGxlbmdlL21hc3Rlci9zcmMvbGliL3Z1ZS5taW4uanMiLCIvdmFyL3d3dy9naXRodWIvaGFjay1pdC1jaGFsbGVuZ2UvbWFzdGVyL3NyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdCtTQSxZQVlBLFNBQVMsd0JBQXVCLEdBQU8sTUFBTyxJQUFPLEVBQUksV0FBYSxHQUFRLFVBQVMsR0FWdkYsT0FBTyxlQUFlLFFBQVMsY0FDN0IsT0FBTyxHQUdULElBQUkscUJBQXNCLFFBQVEsa0NBRTlCLFVBQVksUUFBUSxz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LEVBQUUsR0FBRyxVQUFVLEVBQUUsRUFBRSxHQUFHLEtBQUssSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxNQUFNLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLFdBQVcsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLEdBQUcsRUFBRSxFQUFFLE1BQU0sS0FBSSxFQUFHLE1BQU0sRUFBRSxPQUFPLEtBQUssRUFBRSxRQUFRLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxNQUF4TyxPQUFzUCxHQUFFLEVBQUUsUUFBUSxFQUFFLE1BQU0sTUFBTSxFQUFFLE1BQU0sS0FBSyxHQUFHLElBQUksRUFBRSxHQUFHLEVBQTlZLFFBQXlaLEdBQUUsRUFBRSxHQUFHLE1BQU8sR0FBRSxPQUFPLEVBQUUsRUFBRSxJQUFJLFNBQVMsR0FBRyxNQUFPLEdBQUUsRUFBRSxLQUFLLEtBQUssS0FBSyxFQUFFLEVBQUUsR0FBRyxHQUFFLEdBQXZGLFFBQW9HLEdBQUUsRUFBRSxFQUFFLEdBQUcsTUFBTyxHQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLElBQUksRUFBRSxFQUFFLE1BQU0sR0FBRyxJQUFJLEVBQUUsTUFBTSxJQUE5RixRQUEyRyxHQUFFLEVBQUUsR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLENBQUMsR0FBSSxHQUFFLEVBQUUsRUFBVCxPQUFtQixHQUFFLFFBQVEsc0JBQXNCLEVBQUUsV0FBVyxTQUFTLEtBQUssVUFBVSxFQUFFLFNBQVMsVUFBVSxJQUFJLEVBQUUsSUFBakksTUFBNEksR0FBRSxFQUFFLElBQUksRUFBRSxJQUF0SyxRQUFtTCxHQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLFlBQVksSUFBSSxFQUFFLEdBQXpELFFBQXFFLEdBQUUsRUFBRSxFQUFFLEVB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LEVBQUUsRUFBeEIsR0FBNkIsTUFBTSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxXQUFXLEdBQUcsRUFBRSxXQUFXLFFBQVEsR0FBRyxFQUFFLFFBQVEsT0FBTyxFQUFFLFdBQVcsSUFBcEssSUFBNEssR0FBSSxHQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sS0FBSyxLQUFLLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsR0FBRyxFQUFFLEVBQUUsUUFBUSxHQUFHLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxPQUFPLEdBQUcsS0FBSyxPQUFRLElBQUcsR0FBRyxLQUFLLEdBQUcsRUFBRSxTQUFTLEdBQUcsS0FBSyxHQUFHLEVBQUUsYUFBYSxHQUFHLGdCQUFpQixJQUFHLEdBQUcsS0FBSyxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsSUFBSSxFQUFFLEtBQUssR0FBRyxRQUFTLElBQUcsR0FBRyxLQUFLLEdBQUcsRUFBRSxFQUFFLFFBQVEsR0FBRyxJQUFJLFVBQVUsR0FBRyxVQUFVLEVBQUUsRUFBRSxFQUFFLEdBQUcsS0FBSyxFQUFFLEVBQUUsRUFBRSxPQUFPLEdBQUcsV0FBWSxJQUFHLEVBQUUsRUFBRSxNQUFNLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLFNBQVMsRUFBRSxRQUE1QixHQUF1QyxHQUFHLEVBQUUsYUFBYSxHQUFHLEdBQUcsRUFBRSxFQUFFLEdBQXJkLE1BQStkLEdBQUUsT0FBTyxHQUFHLEdBQUcsT0FBdnFCLFFBQXVyQixJQUFHLEdBQUcsR0FBSSxHQUFFLE9BQU8sT0FBTyxNQUFNLEVBQUUsRUFBRSxNQUFNLEdBQXJDLElBQTRDLEVBQUUsSUFB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SyxLQUFLLFNBQVMsS0FBSyxLQUFLLE1BQU0sS0FBSyxTQUFTLEtBQUssV0FBVyxLQUFLLGNBQWMsS0FBSyxZQUFZLEdBQUksSUFBRyxLQUFLLE9BQU8sVUFBVSxLQUFLLEdBQUcsS0FBSyxTQUFTLEtBQUssU0FBUyxLQUFLLFlBQVksT0FBTyxLQUFLLE1BQU0sS0FBSyxPQUFPLEtBQUssT0FBTyxLQUFLLFNBQVMsT0FBTyxLQUFLLFVBQVUsT0FBTyxXQUFXLEtBQUssTUFBTSxLQUFLLEtBQUssVUFBVSxLQUFLLFVBQVUsS0FBSyxTQUFTLFlBQVksSUFBSSxLQUFLLFdBQVcsR0FBSSxHQUFFLEtBQUssR0FBRyxrQkFBZixJQUFxQyxPQUFPLEVBQUUsRUFBRSxZQUFZLEtBQUssT0FBTyxJQUFJLE9BQU8sU0FBUyxHQUFHLEtBQUssTUFBTSxLQUFLLEdBQUcsR0FBRyxLQUFLLFFBQVEsS0FBSyxNQUFNLEtBQUssUUFBUSxJQUFJLE1BQU0sU0FBUyxFQUFFLEdBQUcsUUFBUyxLQUFJLEVBQUUsTUFBTSxRQUFRLEVBQUUsR0FBRyxPQUFsQyxFQUEyQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssSUFBSSxNQUFNLElBQUksS0FBSyxXQUFXLEdBQUksR0FBRSxLQUFLLEVBQUUsS0FBSyxHQUFHLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLE9BQU8sS0FBSyxFQUFFLEtBQUssT0FBTyxPQUFPLEVBQUUsS0FBSyxPQUFPLFNBQVMsR0FBRSxDQUExRyxJQUFnSCxJQUFJLElBQUksS0FBSyxHQUFHLG1CQUFtQixXQUFXLEdBQUUsSUFBSyxLQUFLLEdBQUcsaUJBQWlCLFdBQVcsR0FBRSxFQUFHLEdBQUcsRUFBRSxjQUFjLEtBQUssU0FBUSxFQUFHLEdBQUcsSUFBSSxLQUFLLEdBQUcsUUFBUSxXQUFXLEVBQUUsU0FBUSxJQUFLLEtBQUssR0FBRyxPQUFPLFdBQVcsRUFBRSxTQUFRLEVBQUcsRUFBRSxRQUFRLEVBQUUsTUFBTSxVQUFVLEVBQUUsaUJBQWlCLEtBQUssU0FBUyxL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Q0EsVUFBQSxRQUFBLGtFQWNBLEtBQUEsUUFBQSwwREFaQSxVQUFBLFdBQUksT0FBTyxVQUFXLEVBR3RCLG9CQUFBLFlBQVksS0FBWixvQkFBQSxjQUFBLFdBQUEsWUFHc0MsVUFBbEMsb0JBQUEsY0FBYyxJQUFJLGFBQTBCLG9CQUFBLGNBQWMsS0FDNUQsU0FBVSxZQUNWLFNBQVUsUUFPWixJQUFJLEtBQU0sU0FBQSxXQUFJLE9BQUosTUFBQSxXQUdWLElBQUksTUFBTSxHQUFJLE9BQVEsU0FBUyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBWdWUgLy8gbGF0ZSBiaW5kXG52YXIgbWFwID0gT2JqZWN0LmNyZWF0ZShudWxsKVxudmFyIHNoaW1tZWQgPSBmYWxzZVxudmFyIGlzQnJvd3NlcmlmeSA9IGZhbHNlXG5cbi8qKlxuICogRGV0ZXJtaW5lIGNvbXBhdGliaWxpdHkgYW5kIGFwcGx5IHBhdGNoLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHZ1ZVxuICogQHBhcmFtIHtCb29sZWFufSBicm93c2VyaWZ5XG4gKi9cblxuZXhwb3J0cy5pbnN0YWxsID0gZnVuY3Rpb24gKHZ1ZSwgYnJvd3NlcmlmeSkge1xuICBpZiAoc2hpbW1lZCkgcmV0dXJuXG4gIHNoaW1tZWQgPSB0cnVlXG5cbiAgVnVlID0gdnVlXG4gIGlzQnJvd3NlcmlmeSA9IGJyb3dzZXJpZnlcblxuICBleHBvcnRzLmNvbXBhdGlibGUgPSAhIVZ1ZS5pbnRlcm5hbERpcmVjdGl2ZXNcbiAgaWYgKCFleHBvcnRzLmNvbXBhdGlibGUpIHtcbiAgICBjb25zb2xlLndhcm4oXG4gICAgICAnW0hNUl0gdnVlLWxvYWRlciBob3QgcmVsb2FkIGlzIG9ubHkgY29tcGF0aWJsZSB3aXRoICcgK1xuICAgICAgJ1Z1ZS5qcyAxLjAuMCsuJ1xuICAgIClcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIHBhdGNoIHZpZXcgZGlyZWN0aXZlXG4gIHBhdGNoVmlldyhWdWUuaW50ZXJuYWxEaXJlY3RpdmVzLmNvbXBvbmVudClcbiAgY29uc29sZS5sb2coJ1tITVJdIFZ1ZSBjb21wb25lbnQgaG90IHJlbG9hZCBzaGltIGFwcGxpZWQuJylcbiAgLy8gc2hpbSByb3V0ZXItdmlldyBpZiBwcmVzZW50XG4gIHZhciByb3V0ZXJWaWV3ID0gVnVlLmVsZW1lbnREaXJlY3RpdmUoJ3JvdXRlci12aWV3JylcbiAgaWYgKHJvdXRlclZpZXcpIHtcbiAgICBwYXRjaFZpZXcocm91dGVyVmlldylcbiAgICBjb25zb2xlLmxvZygnW0hNUl0gdnVlLXJvdXRlciA8cm91dGVyLXZpZXc+IGhvdCByZWxvYWQgc2hpbSBhcHBsaWVkLicpXG4gIH1cbn1cblxuLyoqXG4gKiBTaGltIHRoZSB2aWV3IGRpcmVjdGl2ZSAoY29tcG9uZW50IG9yIHJvdXRlci12aWV3KS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gVmlld1xuICovXG5cbmZ1bmN0aW9uIHBhdGNoVmlldyAoVmlldykge1xuICB2YXIgdW5idWlsZCA9IFZpZXcudW5idWlsZFxuICBWaWV3LnVuYnVpbGQgPSBmdW5jdGlvbiAoZGVmZXIpIHtcbiAgICBpZiAoIXRoaXMuaG90VXBkYXRpbmcpIHtcbiAgICAgIHZhciBwcmV2Q29tcG9uZW50ID0gdGhpcy5jaGlsZFZNICYmIHRoaXMuY2hpbGRWTS5jb25zdHJ1Y3RvclxuICAgICAgcmVtb3ZlVmlldyhwcmV2Q29tcG9uZW50LCB0aGlzKVxuICAgICAgLy8gZGVmZXIgPSB0cnVlIG1lYW5zIHdlIGFyZSB0cmFuc2l0aW9uaW5nIHRvIGEgbmV3XG4gICAgICAvLyBDb21wb25lbnQuIFJlZ2lzdGVyIHRoaXMgbmV3IGNvbXBvbmVudCB0byB0aGUgbGlzdC5cbiAgICAgIGlmIChkZWZlcikge1xuICAgICAgICBhZGRWaWV3KHRoaXMuQ29tcG9uZW50LCB0aGlzKVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBjYWxsIG9yaWdpbmFsXG4gICAgcmV0dXJuIHVuYnVpbGQuY2FsbCh0aGlzLCBkZWZlcilcbiAgfVxufVxuXG4vKipcbiAqIEFkZCBhIGNvbXBvbmVudCB2aWV3IHRvIGEgQ29tcG9uZW50J3MgaG90IGxpc3RcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBDb21wb25lbnRcbiAqIEBwYXJhbSB7RGlyZWN0aXZlfSB2aWV3IC0gdmlldyBkaXJlY3RpdmUgaW5zdGFuY2VcbiAqL1xuXG5mdW5jdGlvbiBhZGRWaWV3IChDb21wb25lbnQsIHZpZXcpIHtcbiAgdmFyIGlkID0gQ29tcG9uZW50ICYmIENvbXBvbmVudC5vcHRpb25zLmhvdElEXG4gIGlmIChpZCkge1xuICAgIGlmICghbWFwW2lkXSkge1xuICAgICAgbWFwW2lkXSA9IHtcbiAgICAgICAgQ29tcG9uZW50OiBDb21wb25lbnQsXG4gICAgICAgIHZpZXdzOiBbXSxcbiAgICAgICAgaW5zdGFuY2VzOiBbXVxuICAgICAgfVxuICAgIH1cbiAgICBtYXBbaWRdLnZpZXdzLnB1c2godmlldylcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZSBhIGNvbXBvbmVudCB2aWV3IGZyb20gYSBDb21wb25lbnQncyBob3QgbGlzdFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IENvbXBvbmVudFxuICogQHBhcmFtIHtEaXJlY3RpdmV9IHZpZXcgLSB2aWV3IGRpcmVjdGl2ZSBpbnN0YW5jZVxuICovXG5cbmZ1bmN0aW9uIHJlbW92ZVZpZXcgKENvbXBvbmVudCwgdmlldykge1xuICB2YXIgaWQgPSBDb21wb25lbnQgJiYgQ29tcG9uZW50Lm9wdGlvbnMuaG90SURcbiAgaWYgKGlkKSB7XG4gICAgbWFwW2lkXS52aWV3cy4kcmVtb3ZlKHZpZXcpXG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgYSByZWNvcmQgZm9yIGEgaG90IG1vZHVsZSwgd2hpY2gga2VlcHMgdHJhY2sgb2YgaXRzIGNvbnN0cnVjb3RyLFxuICogaW5zdG5hY2VzIGFuZCB2aWV3cyAoY29tcG9uZW50IGRpcmVjdGl2ZXMgb3Igcm91dGVyLXZpZXdzKS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKi9cblxuZXhwb3J0cy5jcmVhdGVSZWNvcmQgPSBmdW5jdGlvbiAoaWQsIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMub3B0aW9uc1xuICB9XG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5lbCAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIG9wdGlvbnMuZGF0YSAhPT0gJ29iamVjdCcpIHtcbiAgICBtYWtlT3B0aW9uc0hvdChpZCwgb3B0aW9ucylcbiAgICBtYXBbaWRdID0ge1xuICAgICAgQ29tcG9uZW50OiBudWxsLFxuICAgICAgdmlld3M6IFtdLFxuICAgICAgaW5zdGFuY2VzOiBbXVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIE1ha2UgYSBDb21wb25lbnQgb3B0aW9ucyBvYmplY3QgaG90LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpZFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqL1xuXG5mdW5jdGlvbiBtYWtlT3B0aW9uc0hvdCAoaWQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucy5ob3RJRCA9IGlkXG4gIGluamVjdEhvb2sob3B0aW9ucywgJ2NyZWF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlY29yZCA9IG1hcFtpZF1cbiAgICBpZiAoIXJlY29yZC5Db21wb25lbnQpIHtcbiAgICAgIHJlY29yZC5Db21wb25lbnQgPSB0aGlzLmNvbnN0cnVjdG9yXG4gICAgfVxuICAgIHJlY29yZC5pbnN0YW5jZXMucHVzaCh0aGlzKVxuICB9KVxuICBpbmplY3RIb29rKG9wdGlvbnMsICdiZWZvcmVEZXN0cm95JywgZnVuY3Rpb24gKCkge1xuICAgIG1hcFtpZF0uaW5zdGFuY2VzLiRyZW1vdmUodGhpcylcbiAgfSlcbn1cblxuLyoqXG4gKiBJbmplY3QgYSBob29rIHRvIGEgaG90IHJlbG9hZGFibGUgY29tcG9uZW50IHNvIHRoYXRcbiAqIHdlIGNhbiBrZWVwIHRyYWNrIG9mIGl0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gaG9va1xuICovXG5cbmZ1bmN0aW9uIGluamVjdEhvb2sgKG9wdGlvbnMsIG5hbWUsIGhvb2spIHtcbiAgdmFyIGV4aXN0aW5nID0gb3B0aW9uc1tuYW1lXVxuICBvcHRpb25zW25hbWVdID0gZXhpc3RpbmdcbiAgICA/IEFycmF5LmlzQXJyYXkoZXhpc3RpbmcpXG4gICAgICA/IGV4aXN0aW5nLmNvbmNhdChob29rKVxuICAgICAgOiBbZXhpc3RpbmcsIGhvb2tdXG4gICAgOiBbaG9va11cbn1cblxuLyoqXG4gKiBVcGRhdGUgYSBob3QgY29tcG9uZW50LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBpZFxuICogQHBhcmFtIHtPYmplY3R8bnVsbH0gbmV3T3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd8bnVsbH0gbmV3VGVtcGxhdGVcbiAqL1xuXG5leHBvcnRzLnVwZGF0ZSA9IGZ1bmN0aW9uIChpZCwgbmV3T3B0aW9ucywgbmV3VGVtcGxhdGUpIHtcbiAgdmFyIHJlY29yZCA9IG1hcFtpZF1cbiAgLy8gZm9yY2UgZnVsbC1yZWxvYWQgaWYgYW4gaW5zdGFuY2Ugb2YgdGhlIGNvbXBvbmVudCBpcyBhY3RpdmUgYnV0IGlzIG5vdFxuICAvLyBtYW5hZ2VkIGJ5IGEgdmlld1xuICBpZiAoIXJlY29yZCB8fCAocmVjb3JkLmluc3RhbmNlcy5sZW5ndGggJiYgIXJlY29yZC52aWV3cy5sZW5ndGgpKSB7XG4gICAgY29uc29sZS5sb2coJ1tITVJdIFJvb3Qgb3IgbWFudWFsbHktbW91bnRlZCBpbnN0YW5jZSBtb2RpZmllZC4gRnVsbCByZWxvYWQgbWF5IGJlIHJlcXVpcmVkLicpXG4gICAgaWYgKCFpc0Jyb3dzZXJpZnkpIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBicm93c2VyaWZ5LWhtciBzb21laG93IHNlbmRzIGluY29tcGxldGUgYnVuZGxlIGlmIHdlIHJlbG9hZCBoZXJlXG4gICAgICByZXR1cm5cbiAgICB9XG4gIH1cbiAgaWYgKCFpc0Jyb3dzZXJpZnkpIHtcbiAgICAvLyBicm93c2VyaWZ5LWhtciBhbHJlYWR5IGxvZ3MgdGhpc1xuICAgIGNvbnNvbGUubG9nKCdbSE1SXSBVcGRhdGluZyBjb21wb25lbnQ6ICcgKyBmb3JtYXQoaWQpKVxuICB9XG4gIHZhciBDb21wb25lbnQgPSByZWNvcmQuQ29tcG9uZW50XG4gIC8vIHVwZGF0ZSBjb25zdHJ1Y3RvclxuICBpZiAobmV3T3B0aW9ucykge1xuICAgIC8vIGluIGNhc2UgdGhlIHVzZXIgZXhwb3J0cyBhIGNvbnN0cnVjdG9yXG4gICAgQ29tcG9uZW50ID0gcmVjb3JkLkNvbXBvbmVudCA9IHR5cGVvZiBuZXdPcHRpb25zID09PSAnZnVuY3Rpb24nXG4gICAgICA/IG5ld09wdGlvbnNcbiAgICAgIDogVnVlLmV4dGVuZChuZXdPcHRpb25zKVxuICAgIG1ha2VPcHRpb25zSG90KGlkLCBDb21wb25lbnQub3B0aW9ucylcbiAgfVxuICBpZiAobmV3VGVtcGxhdGUpIHtcbiAgICBDb21wb25lbnQub3B0aW9ucy50ZW1wbGF0ZSA9IG5ld1RlbXBsYXRlXG4gIH1cbiAgLy8gaGFuZGxlIHJlY3Vyc2l2ZSBsb29rdXBcbiAgaWYgKENvbXBvbmVudC5vcHRpb25zLm5hbWUpIHtcbiAgICBDb21wb25lbnQub3B0aW9ucy5jb21wb25lbnRzW0NvbXBvbmVudC5vcHRpb25zLm5hbWVdID0gQ29tcG9uZW50XG4gIH1cbiAgLy8gcmVzZXQgY29uc3RydWN0b3IgY2FjaGVkIGxpbmtlclxuICBDb21wb25lbnQubGlua2VyID0gbnVsbFxuICAvLyByZWxvYWQgYWxsIHZpZXdzXG4gIHJlY29yZC52aWV3cy5mb3JFYWNoKGZ1bmN0aW9uICh2aWV3KSB7XG4gICAgdXBkYXRlVmlldyh2aWV3LCBDb21wb25lbnQpXG4gIH0pXG4gIC8vIGZsdXNoIGRldnRvb2xzXG4gIGlmICh3aW5kb3cuX19WVUVfREVWVE9PTFNfR0xPQkFMX0hPT0tfXykge1xuICAgIHdpbmRvdy5fX1ZVRV9ERVZUT09MU19HTE9CQUxfSE9PS19fLmVtaXQoJ2ZsdXNoJylcbiAgfVxufVxuXG4vKipcbiAqIFVwZGF0ZSBhIGNvbXBvbmVudCB2aWV3IGluc3RhbmNlXG4gKlxuICogQHBhcmFtIHtEaXJlY3RpdmV9IHZpZXdcbiAqIEBwYXJhbSB7RnVuY3Rpb259IENvbXBvbmVudFxuICovXG5cbmZ1bmN0aW9uIHVwZGF0ZVZpZXcgKHZpZXcsIENvbXBvbmVudCkge1xuICBpZiAoIXZpZXcuX2JvdW5kKSB7XG4gICAgcmV0dXJuXG4gIH1cbiAgdmlldy5Db21wb25lbnQgPSBDb21wb25lbnRcbiAgdmlldy5ob3RVcGRhdGluZyA9IHRydWVcbiAgLy8gZGlzYWJsZSB0cmFuc2l0aW9uc1xuICB2aWV3LnZtLl9pc0NvbXBpbGVkID0gZmFsc2VcbiAgLy8gc2F2ZSBzdGF0ZVxuICB2YXIgc3RhdGUgPSBleHRyYWN0U3RhdGUodmlldy5jaGlsZFZNKVxuICAvLyByZW1vdW50LCBtYWtlIHN1cmUgdG8gZGlzYWJsZSBrZWVwLWFsaXZlXG4gIHZhciBrZWVwQWxpdmUgPSB2aWV3LmtlZXBBbGl2ZVxuICB2aWV3LmtlZXBBbGl2ZSA9IGZhbHNlXG4gIHZpZXcubW91bnRDb21wb25lbnQoKVxuICB2aWV3LmtlZXBBbGl2ZSA9IGtlZXBBbGl2ZVxuICAvLyByZXN0b3JlIHN0YXRlXG4gIHJlc3RvcmVTdGF0ZSh2aWV3LmNoaWxkVk0sIHN0YXRlLCB0cnVlKVxuICAvLyByZS1lYW5ibGUgdHJhbnNpdGlvbnNcbiAgdmlldy52bS5faXNDb21waWxlZCA9IHRydWVcbiAgdmlldy5ob3RVcGRhdGluZyA9IGZhbHNlXG59XG5cbi8qKlxuICogRXh0cmFjdCBzdGF0ZSBmcm9tIGEgVnVlIGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG5cbmZ1bmN0aW9uIGV4dHJhY3RTdGF0ZSAodm0pIHtcbiAgcmV0dXJuIHtcbiAgICBjaWQ6IHZtLmNvbnN0cnVjdG9yLmNpZCxcbiAgICBkYXRhOiB2bS4kZGF0YSxcbiAgICBjaGlsZHJlbjogdm0uJGNoaWxkcmVuLm1hcChleHRyYWN0U3RhdGUpXG4gIH1cbn1cblxuLyoqXG4gKiBSZXN0b3JlIHN0YXRlIHRvIGEgcmVsb2FkZWQgVnVlIGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtPYmplY3R9IHN0YXRlXG4gKi9cblxuZnVuY3Rpb24gcmVzdG9yZVN0YXRlICh2bSwgc3RhdGUsIGlzUm9vdCkge1xuICB2YXIgb2xkQXN5bmNDb25maWdcbiAgaWYgKGlzUm9vdCkge1xuICAgIC8vIHNldCBWdWUgaW50byBzeW5jIG1vZGUgZHVyaW5nIHN0YXRlIHJlaHlkcmF0aW9uXG4gICAgb2xkQXN5bmNDb25maWcgPSBWdWUuY29uZmlnLmFzeW5jXG4gICAgVnVlLmNvbmZpZy5hc3luYyA9IGZhbHNlXG4gIH1cbiAgLy8gYWN0dWFsIHJlc3RvcmVcbiAgaWYgKGlzUm9vdCB8fCAhdm0uX3Byb3BzKSB7XG4gICAgdm0uJGRhdGEgPSBzdGF0ZS5kYXRhXG4gIH0gZWxzZSB7XG4gICAgT2JqZWN0LmtleXMoc3RhdGUuZGF0YSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICBpZiAoIXZtLl9wcm9wc1trZXldKSB7XG4gICAgICAgIC8vIGZvciBub24tcm9vdCwgb25seSByZXN0b3JlIG5vbi1wcm9wcyBmaWVsZHNcbiAgICAgICAgdm0uJGRhdGFba2V5XSA9IHN0YXRlLmRhdGFba2V5XVxuICAgICAgfVxuICAgIH0pXG4gIH1cbiAgLy8gdmVyaWZ5IGNoaWxkIGNvbnNpc3RlbmN5XG4gIHZhciBoYXNTYW1lQ2hpbGRyZW4gPSB2bS4kY2hpbGRyZW4uZXZlcnkoZnVuY3Rpb24gKGMsIGkpIHtcbiAgICByZXR1cm4gc3RhdGUuY2hpbGRyZW5baV0gJiYgc3RhdGUuY2hpbGRyZW5baV0uY2lkID09PSBjLmNvbnN0cnVjdG9yLmNpZFxuICB9KVxuICBpZiAoaGFzU2FtZUNoaWxkcmVuKSB7XG4gICAgLy8gcmVoeWRyYXRlIGNoaWxkcmVuXG4gICAgdm0uJGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGMsIGkpIHtcbiAgICAgIHJlc3RvcmVTdGF0ZShjLCBzdGF0ZS5jaGlsZHJlbltpXSlcbiAgICB9KVxuICB9XG4gIGlmIChpc1Jvb3QpIHtcbiAgICBWdWUuY29uZmlnLmFzeW5jID0gb2xkQXN5bmNDb25maWdcbiAgfVxufVxuXG5mdW5jdGlvbiBmb3JtYXQgKGlkKSB7XG4gIHJldHVybiBpZC5tYXRjaCgvW15cXC9dK1xcLnZ1ZSQvKVswXVxufVxuIiwiLyohXG4gKiBWdWUuanMgdjEuMC4xOFxuICogKGMpIDIwMTYgRXZhbiBZb3VcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBzZXQob2JqLCBrZXksIHZhbCkge1xuICBpZiAoaGFzT3duKG9iaiwga2V5KSkge1xuICAgIG9ialtrZXldID0gdmFsO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAob2JqLl9pc1Z1ZSkge1xuICAgIHNldChvYmouX2RhdGEsIGtleSwgdmFsKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG9iID0gb2JqLl9fb2JfXztcbiAgaWYgKCFvYikge1xuICAgIG9ialtrZXldID0gdmFsO1xuICAgIHJldHVybjtcbiAgfVxuICBvYi5jb252ZXJ0KGtleSwgdmFsKTtcbiAgb2IuZGVwLm5vdGlmeSgpO1xuICBpZiAob2Iudm1zKSB7XG4gICAgdmFyIGkgPSBvYi52bXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHZhciB2bSA9IG9iLnZtc1tpXTtcbiAgICAgIHZtLl9wcm94eShrZXkpO1xuICAgICAgdm0uX2RpZ2VzdCgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmFsO1xufVxuXG4vKipcbiAqIERlbGV0ZSBhIHByb3BlcnR5IGFuZCB0cmlnZ2VyIGNoYW5nZSBpZiBuZWNlc3NhcnkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICovXG5cbmZ1bmN0aW9uIGRlbChvYmosIGtleSkge1xuICBpZiAoIWhhc093bihvYmosIGtleSkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgZGVsZXRlIG9ialtrZXldO1xuICB2YXIgb2IgPSBvYmouX19vYl9fO1xuICBpZiAoIW9iKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIG9iLmRlcC5ub3RpZnkoKTtcbiAgaWYgKG9iLnZtcykge1xuICAgIHZhciBpID0gb2Iudm1zLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgdm0gPSBvYi52bXNbaV07XG4gICAgICB2bS5fdW5wcm94eShrZXkpO1xuICAgICAgdm0uX2RpZ2VzdCgpO1xuICAgIH1cbiAgfVxufVxuXG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBvYmplY3QgaGFzIHRoZSBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cbmZ1bmN0aW9uIGhhc093bihvYmosIGtleSkge1xuICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYW4gZXhwcmVzc2lvbiBpcyBhIGxpdGVyYWwgdmFsdWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV4cFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuXG52YXIgbGl0ZXJhbFZhbHVlUkUgPSAvXlxccz8odHJ1ZXxmYWxzZXwtP1tcXGRcXC5dK3wnW14nXSonfFwiW15cIl0qXCIpXFxzPyQvO1xuXG5mdW5jdGlvbiBpc0xpdGVyYWwoZXhwKSB7XG4gIHJldHVybiBsaXRlcmFsVmFsdWVSRS50ZXN0KGV4cCk7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBzdHJpbmcgc3RhcnRzIHdpdGggJCBvciBfXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuXG5mdW5jdGlvbiBpc1Jlc2VydmVkKHN0cikge1xuICB2YXIgYyA9IChzdHIgKyAnJykuY2hhckNvZGVBdCgwKTtcbiAgcmV0dXJuIGMgPT09IDB4MjQgfHwgYyA9PT0gMHg1Rjtcbn1cblxuLyoqXG4gKiBHdWFyZCB0ZXh0IG91dHB1dCwgbWFrZSBzdXJlIHVuZGVmaW5lZCBvdXRwdXRzXG4gKiBlbXB0eSBzdHJpbmdcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gX3RvU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PSBudWxsID8gJycgOiB2YWx1ZS50b1N0cmluZygpO1xufVxuXG4vKipcbiAqIENoZWNrIGFuZCBjb252ZXJ0IHBvc3NpYmxlIG51bWVyaWMgc3RyaW5ncyB0byBudW1iZXJzXG4gKiBiZWZvcmUgc2V0dGluZyBiYWNrIHRvIGRhdGFcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJuIHsqfE51bWJlcn1cbiAqL1xuXG5mdW5jdGlvbiB0b051bWJlcih2YWx1ZSkge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgcGFyc2VkID0gTnVtYmVyKHZhbHVlKTtcbiAgICByZXR1cm4gaXNOYU4ocGFyc2VkKSA/IHZhbHVlIDogcGFyc2VkO1xuICB9XG59XG5cbi8qKlxuICogQ29udmVydCBzdHJpbmcgYm9vbGVhbiBsaXRlcmFscyBpbnRvIHJlYWwgYm9vbGVhbnMuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHJldHVybiB7KnxCb29sZWFufVxuICovXG5cbmZ1bmN0aW9uIHRvQm9vbGVhbih2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT09ICd0cnVlJyA/IHRydWUgOiB2YWx1ZSA9PT0gJ2ZhbHNlJyA/IGZhbHNlIDogdmFsdWU7XG59XG5cbi8qKlxuICogU3RyaXAgcXVvdGVzIGZyb20gYSBzdHJpbmdcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtTdHJpbmcgfCBmYWxzZX1cbiAqL1xuXG5mdW5jdGlvbiBzdHJpcFF1b3RlcyhzdHIpIHtcbiAgdmFyIGEgPSBzdHIuY2hhckNvZGVBdCgwKTtcbiAgdmFyIGIgPSBzdHIuY2hhckNvZGVBdChzdHIubGVuZ3RoIC0gMSk7XG4gIHJldHVybiBhID09PSBiICYmIChhID09PSAweDIyIHx8IGEgPT09IDB4MjcpID8gc3RyLnNsaWNlKDEsIC0xKSA6IHN0cjtcbn1cblxuLyoqXG4gKiBDYW1lbGl6ZSBhIGh5cGhlbi1kZWxtaXRlZCBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbnZhciBjYW1lbGl6ZVJFID0gLy0oXFx3KS9nO1xuXG5mdW5jdGlvbiBjYW1lbGl6ZShzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKGNhbWVsaXplUkUsIHRvVXBwZXIpO1xufVxuXG5mdW5jdGlvbiB0b1VwcGVyKF8sIGMpIHtcbiAgcmV0dXJuIGMgPyBjLnRvVXBwZXJDYXNlKCkgOiAnJztcbn1cblxuLyoqXG4gKiBIeXBoZW5hdGUgYSBjYW1lbENhc2Ugc3RyaW5nLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG52YXIgaHlwaGVuYXRlUkUgPSAvKFthLXpcXGRdKShbQS1aXSkvZztcblxuZnVuY3Rpb24gaHlwaGVuYXRlKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoaHlwaGVuYXRlUkUsICckMS0kMicpLnRvTG93ZXJDYXNlKCk7XG59XG5cbi8qKlxuICogQ29udmVydHMgaHlwaGVuL3VuZGVyc2NvcmUvc2xhc2ggZGVsaW1pdGVyZWQgbmFtZXMgaW50b1xuICogY2FtZWxpemVkIGNsYXNzTmFtZXMuXG4gKlxuICogZS5nLiBteS1jb21wb25lbnQgPT4gTXlDb21wb25lbnRcbiAqICAgICAgc29tZV9lbHNlICAgID0+IFNvbWVFbHNlXG4gKiAgICAgIHNvbWUvY29tcCAgICA9PiBTb21lQ29tcFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG52YXIgY2xhc3NpZnlSRSA9IC8oPzpefFstX1xcL10pKFxcdykvZztcblxuZnVuY3Rpb24gY2xhc3NpZnkoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZShjbGFzc2lmeVJFLCB0b1VwcGVyKTtcbn1cblxuLyoqXG4gKiBTaW1wbGUgYmluZCwgZmFzdGVyIHRoYW4gbmF0aXZlXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEBwYXJhbSB7T2JqZWN0fSBjdHhcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5cbmZ1bmN0aW9uIGJpbmQoZm4sIGN0eCkge1xuICByZXR1cm4gZnVuY3Rpb24gKGEpIHtcbiAgICB2YXIgbCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgcmV0dXJuIGwgPyBsID4gMSA/IGZuLmFwcGx5KGN0eCwgYXJndW1lbnRzKSA6IGZuLmNhbGwoY3R4LCBhKSA6IGZuLmNhbGwoY3R4KTtcbiAgfTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIEFycmF5LWxpa2Ugb2JqZWN0IHRvIGEgcmVhbCBBcnJheS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5LWxpa2V9IGxpc3RcbiAqIEBwYXJhbSB7TnVtYmVyfSBbc3RhcnRdIC0gc3RhcnQgaW5kZXhcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5cbmZ1bmN0aW9uIHRvQXJyYXkobGlzdCwgc3RhcnQpIHtcbiAgc3RhcnQgPSBzdGFydCB8fCAwO1xuICB2YXIgaSA9IGxpc3QubGVuZ3RoIC0gc3RhcnQ7XG4gIHZhciByZXQgPSBuZXcgQXJyYXkoaSk7XG4gIHdoaWxlIChpLS0pIHtcbiAgICByZXRbaV0gPSBsaXN0W2kgKyBzdGFydF07XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBNaXggcHJvcGVydGllcyBpbnRvIHRhcmdldCBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHRvXG4gKiBAcGFyYW0ge09iamVjdH0gZnJvbVxuICovXG5cbmZ1bmN0aW9uIGV4dGVuZCh0bywgZnJvbSkge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGZyb20pO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgdG9ba2V5c1tpXV0gPSBmcm9tW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiB0bztcbn1cblxuLyoqXG4gKiBRdWljayBvYmplY3QgY2hlY2sgLSB0aGlzIGlzIHByaW1hcmlseSB1c2VkIHRvIHRlbGxcbiAqIE9iamVjdHMgZnJvbSBwcmltaXRpdmUgdmFsdWVzIHdoZW4gd2Uga25vdyB0aGUgdmFsdWVcbiAqIGlzIGEgSlNPTi1jb21wbGlhbnQgdHlwZS5cbiAqXG4gKiBAcGFyYW0geyp9IG9ialxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPT0gbnVsbCAmJiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBTdHJpY3Qgb2JqZWN0IHR5cGUgY2hlY2suIE9ubHkgcmV0dXJucyB0cnVlXG4gKiBmb3IgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3RzLlxuICpcbiAqIEBwYXJhbSB7Kn0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgT0JKRUNUX1NUUklORyA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5mdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSBPQkpFQ1RfU1RSSU5HO1xufVxuXG4vKipcbiAqIEFycmF5IHR5cGUgY2hlY2suXG4gKlxuICogQHBhcmFtIHsqfSBvYmpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIERlZmluZSBhIHByb3BlcnR5LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7Kn0gdmFsXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtlbnVtZXJhYmxlXVxuICovXG5cbmZ1bmN0aW9uIGRlZihvYmosIGtleSwgdmFsLCBlbnVtZXJhYmxlKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwge1xuICAgIHZhbHVlOiB2YWwsXG4gICAgZW51bWVyYWJsZTogISFlbnVtZXJhYmxlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9KTtcbn1cblxuLyoqXG4gKiBEZWJvdW5jZSBhIGZ1bmN0aW9uIHNvIGl0IG9ubHkgZ2V0cyBjYWxsZWQgYWZ0ZXIgdGhlXG4gKiBpbnB1dCBzdG9wcyBhcnJpdmluZyBhZnRlciB0aGUgZ2l2ZW4gd2FpdCBwZXJpb2QuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuY1xuICogQHBhcmFtIHtOdW1iZXJ9IHdhaXRcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSAtIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb25cbiAqL1xuXG5mdW5jdGlvbiBfZGVib3VuY2UoZnVuYywgd2FpdCkge1xuICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG4gIHZhciBsYXRlciA9IGZ1bmN0aW9uIGxhdGVyKCkge1xuICAgIHZhciBsYXN0ID0gRGF0ZS5ub3coKSAtIHRpbWVzdGFtcDtcbiAgICBpZiAobGFzdCA8IHdhaXQgJiYgbGFzdCA+PSAwKSB7XG4gICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCAtIGxhc3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICBpZiAoIXRpbWVvdXQpIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICB9XG4gIH07XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgY29udGV4dCA9IHRoaXM7XG4gICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgIGlmICghdGltZW91dCkge1xuICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG4vKipcbiAqIE1hbnVhbCBpbmRleE9mIGJlY2F1c2UgaXQncyBzbGlnaHRseSBmYXN0ZXIgdGhhblxuICogbmF0aXZlLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGFyclxuICogQHBhcmFtIHsqfSBvYmpcbiAqL1xuXG5mdW5jdGlvbiBpbmRleE9mKGFyciwgb2JqKSB7XG4gIHZhciBpID0gYXJyLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIGlmIChhcnJbaV0gPT09IG9iaikgcmV0dXJuIGk7XG4gIH1cbiAgcmV0dXJuIC0xO1xufVxuXG4vKipcbiAqIE1ha2UgYSBjYW5jZWxsYWJsZSB2ZXJzaW9uIG9mIGFuIGFzeW5jIGNhbGxiYWNrLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuXG5mdW5jdGlvbiBjYW5jZWxsYWJsZShmbikge1xuICB2YXIgY2IgPSBmdW5jdGlvbiBjYigpIHtcbiAgICBpZiAoIWNiLmNhbmNlbGxlZCkge1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9O1xuICBjYi5jYW5jZWwgPSBmdW5jdGlvbiAoKSB7XG4gICAgY2IuY2FuY2VsbGVkID0gdHJ1ZTtcbiAgfTtcbiAgcmV0dXJuIGNiO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIHR3byB2YWx1ZXMgYXJlIGxvb3NlbHkgZXF1YWwgLSB0aGF0IGlzLFxuICogaWYgdGhleSBhcmUgcGxhaW4gb2JqZWN0cywgZG8gdGhleSBoYXZlIHRoZSBzYW1lIHNoYXBlP1xuICpcbiAqIEBwYXJhbSB7Kn0gYVxuICogQHBhcmFtIHsqfSBiXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cbmZ1bmN0aW9uIGxvb3NlRXF1YWwoYSwgYikge1xuICAvKiBlc2xpbnQtZGlzYWJsZSBlcWVxZXEgKi9cbiAgcmV0dXJuIGEgPT0gYiB8fCAoaXNPYmplY3QoYSkgJiYgaXNPYmplY3QoYikgPyBKU09OLnN0cmluZ2lmeShhKSA9PT0gSlNPTi5zdHJpbmdpZnkoYikgOiBmYWxzZSk7XG4gIC8qIGVzbGludC1lbmFibGUgZXFlcWVxICovXG59XG5cbnZhciBoYXNQcm90byA9ICgnX19wcm90b19fJyBpbiB7fSk7XG5cbi8vIEJyb3dzZXIgZW52aXJvbm1lbnQgc25pZmZpbmdcbnZhciBpbkJyb3dzZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2luZG93KSAhPT0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbi8vIGRldGVjdCBkZXZ0b29sc1xudmFyIGRldnRvb2xzID0gaW5Ccm93c2VyICYmIHdpbmRvdy5fX1ZVRV9ERVZUT09MU19HTE9CQUxfSE9PS19fO1xuXG4vLyBVQSBzbmlmZmluZyBmb3Igd29ya2luZyBhcm91bmQgYnJvd3Nlci1zcGVjaWZpYyBxdWlya3NcbnZhciBVQSA9IGluQnJvd3NlciAmJiB3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudC50b0xvd2VyQ2FzZSgpO1xudmFyIGlzSUU5ID0gVUEgJiYgVUEuaW5kZXhPZignbXNpZSA5LjAnKSA+IDA7XG52YXIgaXNBbmRyb2lkID0gVUEgJiYgVUEuaW5kZXhPZignYW5kcm9pZCcpID4gMDtcblxudmFyIHRyYW5zaXRpb25Qcm9wID0gdW5kZWZpbmVkO1xudmFyIHRyYW5zaXRpb25FbmRFdmVudCA9IHVuZGVmaW5lZDtcbnZhciBhbmltYXRpb25Qcm9wID0gdW5kZWZpbmVkO1xudmFyIGFuaW1hdGlvbkVuZEV2ZW50ID0gdW5kZWZpbmVkO1xuXG4vLyBUcmFuc2l0aW9uIHByb3BlcnR5L2V2ZW50IHNuaWZmaW5nXG5pZiAoaW5Ccm93c2VyICYmICFpc0lFOSkge1xuICB2YXIgaXNXZWJraXRUcmFucyA9IHdpbmRvdy5vbnRyYW5zaXRpb25lbmQgPT09IHVuZGVmaW5lZCAmJiB3aW5kb3cub253ZWJraXR0cmFuc2l0aW9uZW5kICE9PSB1bmRlZmluZWQ7XG4gIHZhciBpc1dlYmtpdEFuaW0gPSB3aW5kb3cub25hbmltYXRpb25lbmQgPT09IHVuZGVmaW5lZCAmJiB3aW5kb3cub253ZWJraXRhbmltYXRpb25lbmQgIT09IHVuZGVmaW5lZDtcbiAgdHJhbnNpdGlvblByb3AgPSBpc1dlYmtpdFRyYW5zID8gJ1dlYmtpdFRyYW5zaXRpb24nIDogJ3RyYW5zaXRpb24nO1xuICB0cmFuc2l0aW9uRW5kRXZlbnQgPSBpc1dlYmtpdFRyYW5zID8gJ3dlYmtpdFRyYW5zaXRpb25FbmQnIDogJ3RyYW5zaXRpb25lbmQnO1xuICBhbmltYXRpb25Qcm9wID0gaXNXZWJraXRBbmltID8gJ1dlYmtpdEFuaW1hdGlvbicgOiAnYW5pbWF0aW9uJztcbiAgYW5pbWF0aW9uRW5kRXZlbnQgPSBpc1dlYmtpdEFuaW0gPyAnd2Via2l0QW5pbWF0aW9uRW5kJyA6ICdhbmltYXRpb25lbmQnO1xufVxuXG4vKipcbiAqIERlZmVyIGEgdGFzayB0byBleGVjdXRlIGl0IGFzeW5jaHJvbm91c2x5LiBJZGVhbGx5IHRoaXNcbiAqIHNob3VsZCBiZSBleGVjdXRlZCBhcyBhIG1pY3JvdGFzaywgc28gd2UgbGV2ZXJhZ2VcbiAqIE11dGF0aW9uT2JzZXJ2ZXIgaWYgaXQncyBhdmFpbGFibGUsIGFuZCBmYWxsYmFjayB0b1xuICogc2V0VGltZW91dCgwKS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYlxuICogQHBhcmFtIHtPYmplY3R9IGN0eFxuICovXG5cbnZhciBuZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBjYWxsYmFja3MgPSBbXTtcbiAgdmFyIHBlbmRpbmcgPSBmYWxzZTtcbiAgdmFyIHRpbWVyRnVuYztcbiAgZnVuY3Rpb24gbmV4dFRpY2tIYW5kbGVyKCkge1xuICAgIHBlbmRpbmcgPSBmYWxzZTtcbiAgICB2YXIgY29waWVzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xuICAgIGNhbGxiYWNrcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29waWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb3BpZXNbaV0oKTtcbiAgICB9XG4gIH1cblxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYgKHR5cGVvZiBNdXRhdGlvbk9ic2VydmVyICE9PSAndW5kZWZpbmVkJykge1xuICAgIHZhciBjb3VudGVyID0gMTtcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihuZXh0VGlja0hhbmRsZXIpO1xuICAgIHZhciB0ZXh0Tm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNvdW50ZXIpO1xuICAgIG9ic2VydmVyLm9ic2VydmUodGV4dE5vZGUsIHtcbiAgICAgIGNoYXJhY3RlckRhdGE6IHRydWVcbiAgICB9KTtcbiAgICB0aW1lckZ1bmMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBjb3VudGVyID0gKGNvdW50ZXIgKyAxKSAlIDI7XG4gICAgICB0ZXh0Tm9kZS5kYXRhID0gY291bnRlcjtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIC8vIHdlYnBhY2sgYXR0ZW1wdHMgdG8gaW5qZWN0IGEgc2hpbSBmb3Igc2V0SW1tZWRpYXRlXG4gICAgLy8gaWYgaXQgaXMgdXNlZCBhcyBhIGdsb2JhbCwgc28gd2UgaGF2ZSB0byB3b3JrIGFyb3VuZCB0aGF0IHRvXG4gICAgLy8gYXZvaWQgYnVuZGxpbmcgdW5uZWNlc3NhcnkgY29kZS5cbiAgICB2YXIgY29udGV4dCA9IGluQnJvd3NlciA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDoge307XG4gICAgdGltZXJGdW5jID0gY29udGV4dC5zZXRJbW1lZGlhdGUgfHwgc2V0VGltZW91dDtcbiAgfVxuICByZXR1cm4gZnVuY3Rpb24gKGNiLCBjdHgpIHtcbiAgICB2YXIgZnVuYyA9IGN0eCA/IGZ1bmN0aW9uICgpIHtcbiAgICAgIGNiLmNhbGwoY3R4KTtcbiAgICB9IDogY2I7XG4gICAgY2FsbGJhY2tzLnB1c2goZnVuYyk7XG4gICAgaWYgKHBlbmRpbmcpIHJldHVybjtcbiAgICBwZW5kaW5nID0gdHJ1ZTtcbiAgICB0aW1lckZ1bmMobmV4dFRpY2tIYW5kbGVyLCAwKTtcbiAgfTtcbn0pKCk7XG5cbmZ1bmN0aW9uIENhY2hlKGxpbWl0KSB7XG4gIHRoaXMuc2l6ZSA9IDA7XG4gIHRoaXMubGltaXQgPSBsaW1pdDtcbiAgdGhpcy5oZWFkID0gdGhpcy50YWlsID0gdW5kZWZpbmVkO1xuICB0aGlzLl9rZXltYXAgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xufVxuXG52YXIgcCA9IENhY2hlLnByb3RvdHlwZTtcblxuLyoqXG4gKiBQdXQgPHZhbHVlPiBpbnRvIHRoZSBjYWNoZSBhc3NvY2lhdGVkIHdpdGggPGtleT4uXG4gKiBSZXR1cm5zIHRoZSBlbnRyeSB3aGljaCB3YXMgcmVtb3ZlZCB0byBtYWtlIHJvb20gZm9yXG4gKiB0aGUgbmV3IGVudHJ5LiBPdGhlcndpc2UgdW5kZWZpbmVkIGlzIHJldHVybmVkLlxuICogKGkuZS4gaWYgdGhlcmUgd2FzIGVub3VnaCByb29tIGFscmVhZHkpLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqIEByZXR1cm4ge0VudHJ5fHVuZGVmaW5lZH1cbiAqL1xuXG5wLnB1dCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gIHZhciByZW1vdmVkO1xuICBpZiAodGhpcy5zaXplID09PSB0aGlzLmxpbWl0KSB7XG4gICAgcmVtb3ZlZCA9IHRoaXMuc2hpZnQoKTtcbiAgfVxuXG4gIHZhciBlbnRyeSA9IHRoaXMuZ2V0KGtleSwgdHJ1ZSk7XG4gIGlmICghZW50cnkpIHtcbiAgICBlbnRyeSA9IHtcbiAgICAgIGtleToga2V5XG4gICAgfTtcbiAgICB0aGlzLl9rZXltYXBba2V5XSA9IGVudHJ5O1xuICAgIGlmICh0aGlzLnRhaWwpIHtcbiAgICAgIHRoaXMudGFpbC5uZXdlciA9IGVudHJ5O1xuICAgICAgZW50cnkub2xkZXIgPSB0aGlzLnRhaWw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGVhZCA9IGVudHJ5O1xuICAgIH1cbiAgICB0aGlzLnRhaWwgPSBlbnRyeTtcbiAgICB0aGlzLnNpemUrKztcbiAgfVxuICBlbnRyeS52YWx1ZSA9IHZhbHVlO1xuXG4gIHJldHVybiByZW1vdmVkO1xufTtcblxuLyoqXG4gKiBQdXJnZSB0aGUgbGVhc3QgcmVjZW50bHkgdXNlZCAob2xkZXN0KSBlbnRyeSBmcm9tIHRoZVxuICogY2FjaGUuIFJldHVybnMgdGhlIHJlbW92ZWQgZW50cnkgb3IgdW5kZWZpbmVkIGlmIHRoZVxuICogY2FjaGUgd2FzIGVtcHR5LlxuICovXG5cbnAuc2hpZnQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBlbnRyeSA9IHRoaXMuaGVhZDtcbiAgaWYgKGVudHJ5KSB7XG4gICAgdGhpcy5oZWFkID0gdGhpcy5oZWFkLm5ld2VyO1xuICAgIHRoaXMuaGVhZC5vbGRlciA9IHVuZGVmaW5lZDtcbiAgICBlbnRyeS5uZXdlciA9IGVudHJ5Lm9sZGVyID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2tleW1hcFtlbnRyeS5rZXldID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuc2l6ZS0tO1xuICB9XG4gIHJldHVybiBlbnRyeTtcbn07XG5cbi8qKlxuICogR2V0IGFuZCByZWdpc3RlciByZWNlbnQgdXNlIG9mIDxrZXk+LiBSZXR1cm5zIHRoZSB2YWx1ZVxuICogYXNzb2NpYXRlZCB3aXRoIDxrZXk+IG9yIHVuZGVmaW5lZCBpZiBub3QgaW4gY2FjaGUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtCb29sZWFufSByZXR1cm5FbnRyeVxuICogQHJldHVybiB7RW50cnl8Kn1cbiAqL1xuXG5wLmdldCA9IGZ1bmN0aW9uIChrZXksIHJldHVybkVudHJ5KSB7XG4gIHZhciBlbnRyeSA9IHRoaXMuX2tleW1hcFtrZXldO1xuICBpZiAoZW50cnkgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICBpZiAoZW50cnkgPT09IHRoaXMudGFpbCkge1xuICAgIHJldHVybiByZXR1cm5FbnRyeSA/IGVudHJ5IDogZW50cnkudmFsdWU7XG4gIH1cbiAgLy8gSEVBRC0tLS0tLS0tLS0tLS0tVEFJTFxuICAvLyAgIDwub2xkZXIgICAubmV3ZXI+XG4gIC8vICA8LS0tIGFkZCBkaXJlY3Rpb24gLS1cbiAgLy8gICBBICBCICBDICA8RD4gIEVcbiAgaWYgKGVudHJ5Lm5ld2VyKSB7XG4gICAgaWYgKGVudHJ5ID09PSB0aGlzLmhlYWQpIHtcbiAgICAgIHRoaXMuaGVhZCA9IGVudHJ5Lm5ld2VyO1xuICAgIH1cbiAgICBlbnRyeS5uZXdlci5vbGRlciA9IGVudHJ5Lm9sZGVyOyAvLyBDIDwtLSBFLlxuICB9XG4gIGlmIChlbnRyeS5vbGRlcikge1xuICAgIGVudHJ5Lm9sZGVyLm5ld2VyID0gZW50cnkubmV3ZXI7IC8vIEMuIC0tPiBFXG4gIH1cbiAgZW50cnkubmV3ZXIgPSB1bmRlZmluZWQ7IC8vIEQgLS14XG4gIGVudHJ5Lm9sZGVyID0gdGhpcy50YWlsOyAvLyBELiAtLT4gRVxuICBpZiAodGhpcy50YWlsKSB7XG4gICAgdGhpcy50YWlsLm5ld2VyID0gZW50cnk7IC8vIEUuIDwtLSBEXG4gIH1cbiAgdGhpcy50YWlsID0gZW50cnk7XG4gIHJldHVybiByZXR1cm5FbnRyeSA/IGVudHJ5IDogZW50cnkudmFsdWU7XG59O1xuXG52YXIgY2FjaGUkMSA9IG5ldyBDYWNoZSgxMDAwKTtcbnZhciBmaWx0ZXJUb2tlblJFID0gL1teXFxzJ1wiXSt8J1teJ10qJ3xcIlteXCJdKlwiL2c7XG52YXIgcmVzZXJ2ZWRBcmdSRSA9IC9eaW4kfF4tP1xcZCsvO1xuXG4vKipcbiAqIFBhcnNlciBzdGF0ZVxuICovXG5cbnZhciBzdHI7XG52YXIgZGlyO1xudmFyIGM7XG52YXIgcHJldjtcbnZhciBpO1xudmFyIGw7XG52YXIgbGFzdEZpbHRlckluZGV4O1xudmFyIGluU2luZ2xlO1xudmFyIGluRG91YmxlO1xudmFyIGN1cmx5O1xudmFyIHNxdWFyZTtcbnZhciBwYXJlbjtcbi8qKlxuICogUHVzaCBhIGZpbHRlciB0byB0aGUgY3VycmVudCBkaXJlY3RpdmUgb2JqZWN0XG4gKi9cblxuZnVuY3Rpb24gcHVzaEZpbHRlcigpIHtcbiAgdmFyIGV4cCA9IHN0ci5zbGljZShsYXN0RmlsdGVySW5kZXgsIGkpLnRyaW0oKTtcbiAgdmFyIGZpbHRlcjtcbiAgaWYgKGV4cCkge1xuICAgIGZpbHRlciA9IHt9O1xuICAgIHZhciB0b2tlbnMgPSBleHAubWF0Y2goZmlsdGVyVG9rZW5SRSk7XG4gICAgZmlsdGVyLm5hbWUgPSB0b2tlbnNbMF07XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPiAxKSB7XG4gICAgICBmaWx0ZXIuYXJncyA9IHRva2Vucy5zbGljZSgxKS5tYXAocHJvY2Vzc0ZpbHRlckFyZyk7XG4gICAgfVxuICB9XG4gIGlmIChmaWx0ZXIpIHtcbiAgICAoZGlyLmZpbHRlcnMgPSBkaXIuZmlsdGVycyB8fCBbXSkucHVzaChmaWx0ZXIpO1xuICB9XG4gIGxhc3RGaWx0ZXJJbmRleCA9IGkgKyAxO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGFuIGFyZ3VtZW50IGlzIGR5bmFtaWMgYW5kIHN0cmlwIHF1b3Rlcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gYXJnXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuZnVuY3Rpb24gcHJvY2Vzc0ZpbHRlckFyZyhhcmcpIHtcbiAgaWYgKHJlc2VydmVkQXJnUkUudGVzdChhcmcpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlOiB0b051bWJlcihhcmcpLFxuICAgICAgZHluYW1pYzogZmFsc2VcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHZhciBzdHJpcHBlZCA9IHN0cmlwUXVvdGVzKGFyZyk7XG4gICAgdmFyIGR5bmFtaWMgPSBzdHJpcHBlZCA9PT0gYXJnO1xuICAgIHJldHVybiB7XG4gICAgICB2YWx1ZTogZHluYW1pYyA/IGFyZyA6IHN0cmlwcGVkLFxuICAgICAgZHluYW1pYzogZHluYW1pY1xuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBhIGRpcmVjdGl2ZSB2YWx1ZSBhbmQgZXh0cmFjdCB0aGUgZXhwcmVzc2lvblxuICogYW5kIGl0cyBmaWx0ZXJzIGludG8gYSBkZXNjcmlwdG9yLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogXCJhICsgMSB8IHVwcGVyY2FzZVwiIHdpbGwgeWllbGQ6XG4gKiB7XG4gKiAgIGV4cHJlc3Npb246ICdhICsgMScsXG4gKiAgIGZpbHRlcnM6IFtcbiAqICAgICB7IG5hbWU6ICd1cHBlcmNhc2UnLCBhcmdzOiBudWxsIH1cbiAqICAgXVxuICogfVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuXG5mdW5jdGlvbiBwYXJzZURpcmVjdGl2ZShzKSB7XG4gIHZhciBoaXQgPSBjYWNoZSQxLmdldChzKTtcbiAgaWYgKGhpdCkge1xuICAgIHJldHVybiBoaXQ7XG4gIH1cblxuICAvLyByZXNldCBwYXJzZXIgc3RhdGVcbiAgc3RyID0gcztcbiAgaW5TaW5nbGUgPSBpbkRvdWJsZSA9IGZhbHNlO1xuICBjdXJseSA9IHNxdWFyZSA9IHBhcmVuID0gMDtcbiAgbGFzdEZpbHRlckluZGV4ID0gMDtcbiAgZGlyID0ge307XG5cbiAgZm9yIChpID0gMCwgbCA9IHN0ci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBwcmV2ID0gYztcbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgaWYgKGluU2luZ2xlKSB7XG4gICAgICAvLyBjaGVjayBzaW5nbGUgcXVvdGVcbiAgICAgIGlmIChjID09PSAweDI3ICYmIHByZXYgIT09IDB4NUMpIGluU2luZ2xlID0gIWluU2luZ2xlO1xuICAgIH0gZWxzZSBpZiAoaW5Eb3VibGUpIHtcbiAgICAgIC8vIGNoZWNrIGRvdWJsZSBxdW90ZVxuICAgICAgaWYgKGMgPT09IDB4MjIgJiYgcHJldiAhPT0gMHg1QykgaW5Eb3VibGUgPSAhaW5Eb3VibGU7XG4gICAgfSBlbHNlIGlmIChjID09PSAweDdDICYmIC8vIHBpcGVcbiAgICBzdHIuY2hhckNvZGVBdChpICsgMSkgIT09IDB4N0MgJiYgc3RyLmNoYXJDb2RlQXQoaSAtIDEpICE9PSAweDdDKSB7XG4gICAgICBpZiAoZGlyLmV4cHJlc3Npb24gPT0gbnVsbCkge1xuICAgICAgICAvLyBmaXJzdCBmaWx0ZXIsIGVuZCBvZiBleHByZXNzaW9uXG4gICAgICAgIGxhc3RGaWx0ZXJJbmRleCA9IGkgKyAxO1xuICAgICAgICBkaXIuZXhwcmVzc2lvbiA9IHN0ci5zbGljZSgwLCBpKS50cmltKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBhbHJlYWR5IGhhcyBmaWx0ZXJcbiAgICAgICAgcHVzaEZpbHRlcigpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzd2l0Y2ggKGMpIHtcbiAgICAgICAgY2FzZSAweDIyOlxuICAgICAgICAgIGluRG91YmxlID0gdHJ1ZTticmVhazsgLy8gXCJcbiAgICAgICAgY2FzZSAweDI3OlxuICAgICAgICAgIGluU2luZ2xlID0gdHJ1ZTticmVhazsgLy8gJ1xuICAgICAgICBjYXNlIDB4Mjg6XG4gICAgICAgICAgcGFyZW4rKzticmVhazsgLy8gKFxuICAgICAgICBjYXNlIDB4Mjk6XG4gICAgICAgICAgcGFyZW4tLTticmVhazsgLy8gKVxuICAgICAgICBjYXNlIDB4NUI6XG4gICAgICAgICAgc3F1YXJlKys7YnJlYWs7IC8vIFtcbiAgICAgICAgY2FzZSAweDVEOlxuICAgICAgICAgIHNxdWFyZS0tO2JyZWFrOyAvLyBdXG4gICAgICAgIGNhc2UgMHg3QjpcbiAgICAgICAgICBjdXJseSsrO2JyZWFrOyAvLyB7XG4gICAgICAgIGNhc2UgMHg3RDpcbiAgICAgICAgICBjdXJseS0tO2JyZWFrOyAvLyB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGRpci5leHByZXNzaW9uID09IG51bGwpIHtcbiAgICBkaXIuZXhwcmVzc2lvbiA9IHN0ci5zbGljZSgwLCBpKS50cmltKCk7XG4gIH0gZWxzZSBpZiAobGFzdEZpbHRlckluZGV4ICE9PSAwKSB7XG4gICAgcHVzaEZpbHRlcigpO1xuICB9XG5cbiAgY2FjaGUkMS5wdXQocywgZGlyKTtcbiAgcmV0dXJuIGRpcjtcbn1cblxudmFyIGRpcmVjdGl2ZSA9IE9iamVjdC5mcmVlemUoe1xuICBwYXJzZURpcmVjdGl2ZTogcGFyc2VEaXJlY3RpdmVcbn0pO1xuXG52YXIgcmVnZXhFc2NhcGVSRSA9IC9bLS4qKz9eJHt9KCl8W1xcXVxcL1xcXFxdL2c7XG52YXIgY2FjaGUgPSB1bmRlZmluZWQ7XG52YXIgdGFnUkUgPSB1bmRlZmluZWQ7XG52YXIgaHRtbFJFID0gdW5kZWZpbmVkO1xuLyoqXG4gKiBFc2NhcGUgYSBzdHJpbmcgc28gaXQgY2FuIGJlIHVzZWQgaW4gYSBSZWdFeHBcbiAqIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqL1xuXG5mdW5jdGlvbiBlc2NhcGVSZWdleChzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKHJlZ2V4RXNjYXBlUkUsICdcXFxcJCYnKTtcbn1cblxuZnVuY3Rpb24gY29tcGlsZVJlZ2V4KCkge1xuICB2YXIgb3BlbiA9IGVzY2FwZVJlZ2V4KGNvbmZpZy5kZWxpbWl0ZXJzWzBdKTtcbiAgdmFyIGNsb3NlID0gZXNjYXBlUmVnZXgoY29uZmlnLmRlbGltaXRlcnNbMV0pO1xuICB2YXIgdW5zYWZlT3BlbiA9IGVzY2FwZVJlZ2V4KGNvbmZpZy51bnNhZmVEZWxpbWl0ZXJzWzBdKTtcbiAgdmFyIHVuc2FmZUNsb3NlID0gZXNjYXBlUmVnZXgoY29uZmlnLnVuc2FmZURlbGltaXRlcnNbMV0pO1xuICB0YWdSRSA9IG5ldyBSZWdFeHAodW5zYWZlT3BlbiArICcoLis/KScgKyB1bnNhZmVDbG9zZSArICd8JyArIG9wZW4gKyAnKC4rPyknICsgY2xvc2UsICdnJyk7XG4gIGh0bWxSRSA9IG5ldyBSZWdFeHAoJ14nICsgdW5zYWZlT3BlbiArICcuKicgKyB1bnNhZmVDbG9zZSArICckJyk7XG4gIC8vIHJlc2V0IGNhY2hlXG4gIGNhY2hlID0gbmV3IENhY2hlKDEwMDApO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgdGVtcGxhdGUgdGV4dCBzdHJpbmcgaW50byBhbiBhcnJheSBvZiB0b2tlbnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge0FycmF5PE9iamVjdD4gfCBudWxsfVxuICogICAgICAgICAgICAgICAtIHtTdHJpbmd9IHR5cGVcbiAqICAgICAgICAgICAgICAgLSB7U3RyaW5nfSB2YWx1ZVxuICogICAgICAgICAgICAgICAtIHtCb29sZWFufSBbaHRtbF1cbiAqICAgICAgICAgICAgICAgLSB7Qm9vbGVhbn0gW29uZVRpbWVdXG4gKi9cblxuZnVuY3Rpb24gcGFyc2VUZXh0KHRleHQpIHtcbiAgaWYgKCFjYWNoZSkge1xuICAgIGNvbXBpbGVSZWdleCgpO1xuICB9XG4gIHZhciBoaXQgPSBjYWNoZS5nZXQodGV4dCk7XG4gIGlmIChoaXQpIHtcbiAgICByZXR1cm4gaGl0O1xuICB9XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcbi9nLCAnJyk7XG4gIGlmICghdGFnUkUudGVzdCh0ZXh0KSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHZhciB0b2tlbnMgPSBbXTtcbiAgdmFyIGxhc3RJbmRleCA9IHRhZ1JFLmxhc3RJbmRleCA9IDA7XG4gIHZhciBtYXRjaCwgaW5kZXgsIGh0bWwsIHZhbHVlLCBmaXJzdCwgb25lVGltZTtcbiAgLyogZXNsaW50LWRpc2FibGUgbm8tY29uZC1hc3NpZ24gKi9cbiAgd2hpbGUgKG1hdGNoID0gdGFnUkUuZXhlYyh0ZXh0KSkge1xuICAgIC8qIGVzbGludC1lbmFibGUgbm8tY29uZC1hc3NpZ24gKi9cbiAgICBpbmRleCA9IG1hdGNoLmluZGV4O1xuICAgIC8vIHB1c2ggdGV4dCB0b2tlblxuICAgIGlmIChpbmRleCA+IGxhc3RJbmRleCkge1xuICAgICAgdG9rZW5zLnB1c2goe1xuICAgICAgICB2YWx1ZTogdGV4dC5zbGljZShsYXN0SW5kZXgsIGluZGV4KVxuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIHRhZyB0b2tlblxuICAgIGh0bWwgPSBodG1sUkUudGVzdChtYXRjaFswXSk7XG4gICAgdmFsdWUgPSBodG1sID8gbWF0Y2hbMV0gOiBtYXRjaFsyXTtcbiAgICBmaXJzdCA9IHZhbHVlLmNoYXJDb2RlQXQoMCk7XG4gICAgb25lVGltZSA9IGZpcnN0ID09PSA0MjsgLy8gKlxuICAgIHZhbHVlID0gb25lVGltZSA/IHZhbHVlLnNsaWNlKDEpIDogdmFsdWU7XG4gICAgdG9rZW5zLnB1c2goe1xuICAgICAgdGFnOiB0cnVlLFxuICAgICAgdmFsdWU6IHZhbHVlLnRyaW0oKSxcbiAgICAgIGh0bWw6IGh0bWwsXG4gICAgICBvbmVUaW1lOiBvbmVUaW1lXG4gICAgfSk7XG4gICAgbGFzdEluZGV4ID0gaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG4gIH1cbiAgaWYgKGxhc3RJbmRleCA8IHRleHQubGVuZ3RoKSB7XG4gICAgdG9rZW5zLnB1c2goe1xuICAgICAgdmFsdWU6IHRleHQuc2xpY2UobGFzdEluZGV4KVxuICAgIH0pO1xuICB9XG4gIGNhY2hlLnB1dCh0ZXh0LCB0b2tlbnMpO1xuICByZXR1cm4gdG9rZW5zO1xufVxuXG4vKipcbiAqIEZvcm1hdCBhIGxpc3Qgb2YgdG9rZW5zIGludG8gYW4gZXhwcmVzc2lvbi5cbiAqIGUuZy4gdG9rZW5zIHBhcnNlZCBmcm9tICdhIHt7Yn19IGMnIGNhbiBiZSBzZXJpYWxpemVkXG4gKiBpbnRvIG9uZSBzaW5nbGUgZXhwcmVzc2lvbiBhcyAnXCJhIFwiICsgYiArIFwiIGNcIicuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdG9rZW5zXG4gKiBAcGFyYW0ge1Z1ZX0gW3ZtXVxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIHRva2Vuc1RvRXhwKHRva2Vucywgdm0pIHtcbiAgaWYgKHRva2Vucy5sZW5ndGggPiAxKSB7XG4gICAgcmV0dXJuIHRva2Vucy5tYXAoZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgICByZXR1cm4gZm9ybWF0VG9rZW4odG9rZW4sIHZtKTtcbiAgICB9KS5qb2luKCcrJyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZvcm1hdFRva2VuKHRva2Vuc1swXSwgdm0sIHRydWUpO1xuICB9XG59XG5cbi8qKlxuICogRm9ybWF0IGEgc2luZ2xlIHRva2VuLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0b2tlblxuICogQHBhcmFtIHtWdWV9IFt2bV1cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gW3NpbmdsZV1cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiBmb3JtYXRUb2tlbih0b2tlbiwgdm0sIHNpbmdsZSkge1xuICByZXR1cm4gdG9rZW4udGFnID8gdG9rZW4ub25lVGltZSAmJiB2bSA/ICdcIicgKyB2bS4kZXZhbCh0b2tlbi52YWx1ZSkgKyAnXCInIDogaW5saW5lRmlsdGVycyh0b2tlbi52YWx1ZSwgc2luZ2xlKSA6ICdcIicgKyB0b2tlbi52YWx1ZSArICdcIic7XG59XG5cbi8qKlxuICogRm9yIGFuIGF0dHJpYnV0ZSB3aXRoIG11bHRpcGxlIGludGVycG9sYXRpb24gdGFncyxcbiAqIGUuZy4gYXR0cj1cInNvbWUte3t0aGluZyB8IGZpbHRlcn19XCIsIGluIG9yZGVyIHRvIGNvbWJpbmVcbiAqIHRoZSB3aG9sZSB0aGluZyBpbnRvIGEgc2luZ2xlIHdhdGNoYWJsZSBleHByZXNzaW9uLCB3ZVxuICogaGF2ZSB0byBpbmxpbmUgdGhvc2UgZmlsdGVycy4gVGhpcyBmdW5jdGlvbiBkb2VzIGV4YWN0bHlcbiAqIHRoYXQuIFRoaXMgaXMgYSBiaXQgaGFja3kgYnV0IGl0IGF2b2lkcyBoZWF2eSBjaGFuZ2VzXG4gKiB0byBkaXJlY3RpdmUgcGFyc2VyIGFuZCB3YXRjaGVyIG1lY2hhbmlzbS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXhwXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHNpbmdsZVxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbnZhciBmaWx0ZXJSRSA9IC9bXnxdXFx8W158XS87XG5mdW5jdGlvbiBpbmxpbmVGaWx0ZXJzKGV4cCwgc2luZ2xlKSB7XG4gIGlmICghZmlsdGVyUkUudGVzdChleHApKSB7XG4gICAgcmV0dXJuIHNpbmdsZSA/IGV4cCA6ICcoJyArIGV4cCArICcpJztcbiAgfSBlbHNlIHtcbiAgICB2YXIgZGlyID0gcGFyc2VEaXJlY3RpdmUoZXhwKTtcbiAgICBpZiAoIWRpci5maWx0ZXJzKSB7XG4gICAgICByZXR1cm4gJygnICsgZXhwICsgJyknO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJ3RoaXMuX2FwcGx5RmlsdGVycygnICsgZGlyLmV4cHJlc3Npb24gKyAvLyB2YWx1ZVxuICAgICAgJyxudWxsLCcgKyAvLyBvbGRWYWx1ZSAobnVsbCBmb3IgcmVhZClcbiAgICAgIEpTT04uc3RyaW5naWZ5KGRpci5maWx0ZXJzKSArIC8vIGZpbHRlciBkZXNjcmlwdG9yc1xuICAgICAgJyxmYWxzZSknOyAvLyB3cml0ZT9cbiAgICB9XG4gIH1cbn1cblxudmFyIHRleHQgPSBPYmplY3QuZnJlZXplKHtcbiAgY29tcGlsZVJlZ2V4OiBjb21waWxlUmVnZXgsXG4gIHBhcnNlVGV4dDogcGFyc2VUZXh0LFxuICB0b2tlbnNUb0V4cDogdG9rZW5zVG9FeHBcbn0pO1xuXG52YXIgZGVsaW1pdGVycyA9IFsne3snLCAnfX0nXTtcbnZhciB1bnNhZmVEZWxpbWl0ZXJzID0gWyd7e3snLCAnfX19J107XG5cbnZhciBjb25maWcgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gcHJpbnQgZGVidWcgbWVzc2FnZXMuXG4gICAqIEFsc28gZW5hYmxlcyBzdGFjayB0cmFjZSBmb3Igd2FybmluZ3MuXG4gICAqXG4gICAqIEB0eXBlIHtCb29sZWFufVxuICAgKi9cblxuICBkZWJ1ZzogZmFsc2UsXG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gc3VwcHJlc3Mgd2FybmluZ3MuXG4gICAqXG4gICAqIEB0eXBlIHtCb29sZWFufVxuICAgKi9cblxuICBzaWxlbnQ6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBhc3luYyByZW5kZXJpbmcuXG4gICAqL1xuXG4gIGFzeW5jOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHdhcm4gYWdhaW5zdCBlcnJvcnMgY2F1Z2h0IHdoZW4gZXZhbHVhdGluZ1xuICAgKiBleHByZXNzaW9ucy5cbiAgICovXG5cbiAgd2FybkV4cHJlc3Npb25FcnJvcnM6IHRydWUsXG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gYWxsb3cgZGV2dG9vbHMgaW5zcGVjdGlvbi5cbiAgICogRGlzYWJsZWQgYnkgZGVmYXVsdCBpbiBwcm9kdWN0aW9uIGJ1aWxkcy5cbiAgICovXG5cbiAgZGV2dG9vbHM6IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicsXG5cbiAgLyoqXG4gICAqIEludGVybmFsIGZsYWcgdG8gaW5kaWNhdGUgdGhlIGRlbGltaXRlcnMgaGF2ZSBiZWVuXG4gICAqIGNoYW5nZWQuXG4gICAqXG4gICAqIEB0eXBlIHtCb29sZWFufVxuICAgKi9cblxuICBfZGVsaW1pdGVyc0NoYW5nZWQ6IHRydWUsXG5cbiAgLyoqXG4gICAqIExpc3Qgb2YgYXNzZXQgdHlwZXMgdGhhdCBhIGNvbXBvbmVudCBjYW4gb3duLlxuICAgKlxuICAgKiBAdHlwZSB7QXJyYXl9XG4gICAqL1xuXG4gIF9hc3NldFR5cGVzOiBbJ2NvbXBvbmVudCcsICdkaXJlY3RpdmUnLCAnZWxlbWVudERpcmVjdGl2ZScsICdmaWx0ZXInLCAndHJhbnNpdGlvbicsICdwYXJ0aWFsJ10sXG5cbiAgLyoqXG4gICAqIHByb3AgYmluZGluZyBtb2Rlc1xuICAgKi9cblxuICBfcHJvcEJpbmRpbmdNb2Rlczoge1xuICAgIE9ORV9XQVk6IDAsXG4gICAgVFdPX1dBWTogMSxcbiAgICBPTkVfVElNRTogMlxuICB9LFxuXG4gIC8qKlxuICAgKiBNYXggY2lyY3VsYXIgdXBkYXRlcyBhbGxvd2VkIGluIGEgYmF0Y2hlciBmbHVzaCBjeWNsZS5cbiAgICovXG5cbiAgX21heFVwZGF0ZUNvdW50OiAxMDBcblxufSwge1xuICBkZWxpbWl0ZXJzOiB7IC8qKlxuICAgICAgICAgICAgICAgICAqIEludGVycG9sYXRpb24gZGVsaW1pdGVycy4gQ2hhbmdpbmcgdGhlc2Ugd291bGQgdHJpZ2dlclxuICAgICAgICAgICAgICAgICAqIHRoZSB0ZXh0IHBhcnNlciB0byByZS1jb21waWxlIHRoZSByZWd1bGFyIGV4cHJlc3Npb25zLlxuICAgICAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgICAgICogQHR5cGUge0FycmF5PFN0cmluZz59XG4gICAgICAgICAgICAgICAgICovXG5cbiAgICBnZXQ6IGZ1bmN0aW9uIGdldCgpIHtcbiAgICAgIHJldHVybiBkZWxpbWl0ZXJzO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbiBzZXQodmFsKSB7XG4gICAgICBkZWxpbWl0ZXJzID0gdmFsO1xuICAgICAgY29tcGlsZVJlZ2V4KCk7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZVxuICB9LFxuICB1bnNhZmVEZWxpbWl0ZXJzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiBnZXQoKSB7XG4gICAgICByZXR1cm4gdW5zYWZlRGVsaW1pdGVycztcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24gc2V0KHZhbCkge1xuICAgICAgdW5zYWZlRGVsaW1pdGVycyA9IHZhbDtcbiAgICAgIGNvbXBpbGVSZWdleCgpO1xuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWVcbiAgfVxufSk7XG5cbnZhciB3YXJuID0gdW5kZWZpbmVkO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBoYXNDb25zb2xlID0gdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnO1xuICAgIHdhcm4gPSBmdW5jdGlvbiAobXNnLCBlKSB7XG4gICAgICBpZiAoaGFzQ29uc29sZSAmJiAoIWNvbmZpZy5zaWxlbnQgfHwgY29uZmlnLmRlYnVnKSkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ1tWdWUgd2Fybl06ICcgKyBtc2cpO1xuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgICAgaWYgKGNvbmZpZy5kZWJ1Zykge1xuICAgICAgICAgIGlmIChlKSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4obmV3IEVycm9yKCdXYXJuaW5nIFN0YWNrIFRyYWNlJykuc3RhY2spO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0pKCk7XG59XG5cbi8qKlxuICogQXBwZW5kIHdpdGggdHJhbnNpdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFxuICogQHBhcmFtIHtWdWV9IHZtXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gKi9cblxuZnVuY3Rpb24gYXBwZW5kV2l0aFRyYW5zaXRpb24oZWwsIHRhcmdldCwgdm0sIGNiKSB7XG4gIGFwcGx5VHJhbnNpdGlvbihlbCwgMSwgZnVuY3Rpb24gKCkge1xuICAgIHRhcmdldC5hcHBlbmRDaGlsZChlbCk7XG4gIH0sIHZtLCBjYik7XG59XG5cbi8qKlxuICogSW5zZXJ0QmVmb3JlIHdpdGggdHJhbnNpdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFxuICogQHBhcmFtIHtWdWV9IHZtXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gKi9cblxuZnVuY3Rpb24gYmVmb3JlV2l0aFRyYW5zaXRpb24oZWwsIHRhcmdldCwgdm0sIGNiKSB7XG4gIGFwcGx5VHJhbnNpdGlvbihlbCwgMSwgZnVuY3Rpb24gKCkge1xuICAgIGJlZm9yZShlbCwgdGFyZ2V0KTtcbiAgfSwgdm0sIGNiKTtcbn1cblxuLyoqXG4gKiBSZW1vdmUgd2l0aCB0cmFuc2l0aW9uLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICovXG5cbmZ1bmN0aW9uIHJlbW92ZVdpdGhUcmFuc2l0aW9uKGVsLCB2bSwgY2IpIHtcbiAgYXBwbHlUcmFuc2l0aW9uKGVsLCAtMSwgZnVuY3Rpb24gKCkge1xuICAgIHJlbW92ZShlbCk7XG4gIH0sIHZtLCBjYik7XG59XG5cbi8qKlxuICogQXBwbHkgdHJhbnNpdGlvbnMgd2l0aCBhbiBvcGVyYXRpb24gY2FsbGJhY2suXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtOdW1iZXJ9IGRpcmVjdGlvblxuICogICAgICAgICAgICAgICAgICAxOiBlbnRlclxuICogICAgICAgICAgICAgICAgIC0xOiBsZWF2ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gb3AgLSB0aGUgYWN0dWFsIERPTSBvcGVyYXRpb25cbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICovXG5cbmZ1bmN0aW9uIGFwcGx5VHJhbnNpdGlvbihlbCwgZGlyZWN0aW9uLCBvcCwgdm0sIGNiKSB7XG4gIHZhciB0cmFuc2l0aW9uID0gZWwuX192X3RyYW5zO1xuICBpZiAoIXRyYW5zaXRpb24gfHxcbiAgLy8gc2tpcCBpZiB0aGVyZSBhcmUgbm8ganMgaG9va3MgYW5kIENTUyB0cmFuc2l0aW9uIGlzXG4gIC8vIG5vdCBzdXBwb3J0ZWRcbiAgIXRyYW5zaXRpb24uaG9va3MgJiYgIXRyYW5zaXRpb25FbmRFdmVudCB8fFxuICAvLyBza2lwIHRyYW5zaXRpb25zIGZvciBpbml0aWFsIGNvbXBpbGVcbiAgIXZtLl9pc0NvbXBpbGVkIHx8XG4gIC8vIGlmIHRoZSB2bSBpcyBiZWluZyBtYW5pcHVsYXRlZCBieSBhIHBhcmVudCBkaXJlY3RpdmVcbiAgLy8gZHVyaW5nIHRoZSBwYXJlbnQncyBjb21waWxhdGlvbiBwaGFzZSwgc2tpcCB0aGVcbiAgLy8gYW5pbWF0aW9uLlxuICB2bS4kcGFyZW50ICYmICF2bS4kcGFyZW50Ll9pc0NvbXBpbGVkKSB7XG4gICAgb3AoKTtcbiAgICBpZiAoY2IpIGNiKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBhY3Rpb24gPSBkaXJlY3Rpb24gPiAwID8gJ2VudGVyJyA6ICdsZWF2ZSc7XG4gIHRyYW5zaXRpb25bYWN0aW9uXShvcCwgY2IpO1xufVxuXG52YXIgdHJhbnNpdGlvbiA9IE9iamVjdC5mcmVlemUoe1xuICBhcHBlbmRXaXRoVHJhbnNpdGlvbjogYXBwZW5kV2l0aFRyYW5zaXRpb24sXG4gIGJlZm9yZVdpdGhUcmFuc2l0aW9uOiBiZWZvcmVXaXRoVHJhbnNpdGlvbixcbiAgcmVtb3ZlV2l0aFRyYW5zaXRpb246IHJlbW92ZVdpdGhUcmFuc2l0aW9uLFxuICBhcHBseVRyYW5zaXRpb246IGFwcGx5VHJhbnNpdGlvblxufSk7XG5cbi8qKlxuICogUXVlcnkgYW4gZWxlbWVudCBzZWxlY3RvciBpZiBpdCdzIG5vdCBhbiBlbGVtZW50IGFscmVhZHkuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8RWxlbWVudH0gZWxcbiAqIEByZXR1cm4ge0VsZW1lbnR9XG4gKi9cblxuZnVuY3Rpb24gcXVlcnkoZWwpIHtcbiAgaWYgKHR5cGVvZiBlbCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIgc2VsZWN0b3IgPSBlbDtcbiAgICBlbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWwpO1xuICAgIGlmICghZWwpIHtcbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgd2FybignQ2Fubm90IGZpbmQgZWxlbWVudDogJyArIHNlbGVjdG9yKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGVsO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGEgbm9kZSBpcyBpbiB0aGUgZG9jdW1lbnQuXG4gKiBOb3RlOiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY29udGFpbnMgc2hvdWxkIHdvcmsgaGVyZVxuICogYnV0IGFsd2F5cyByZXR1cm5zIGZhbHNlIGZvciBjb21tZW50IG5vZGVzIGluIHBoYW50b21qcyxcbiAqIG1ha2luZyB1bml0IHRlc3RzIGRpZmZpY3VsdC4gVGhpcyBpcyBmaXhlZCBieSBkb2luZyB0aGVcbiAqIGNvbnRhaW5zKCkgY2hlY2sgb24gdGhlIG5vZGUncyBwYXJlbnROb2RlIGluc3RlYWQgb2ZcbiAqIHRoZSBub2RlIGl0c2VsZi5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblxuZnVuY3Rpb24gaW5Eb2Mobm9kZSkge1xuICB2YXIgZG9jID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICB2YXIgcGFyZW50ID0gbm9kZSAmJiBub2RlLnBhcmVudE5vZGU7XG4gIHJldHVybiBkb2MgPT09IG5vZGUgfHwgZG9jID09PSBwYXJlbnQgfHwgISEocGFyZW50ICYmIHBhcmVudC5ub2RlVHlwZSA9PT0gMSAmJiBkb2MuY29udGFpbnMocGFyZW50KSk7XG59XG5cbi8qKlxuICogR2V0IGFuZCByZW1vdmUgYW4gYXR0cmlidXRlIGZyb20gYSBub2RlLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHBhcmFtIHtTdHJpbmd9IF9hdHRyXG4gKi9cblxuZnVuY3Rpb24gZ2V0QXR0cihub2RlLCBfYXR0cikge1xuICB2YXIgdmFsID0gbm9kZS5nZXRBdHRyaWJ1dGUoX2F0dHIpO1xuICBpZiAodmFsICE9PSBudWxsKSB7XG4gICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoX2F0dHIpO1xuICB9XG4gIHJldHVybiB2YWw7XG59XG5cbi8qKlxuICogR2V0IGFuIGF0dHJpYnV0ZSB3aXRoIGNvbG9uIG9yIHYtYmluZDogcHJlZml4LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge1N0cmluZ3xudWxsfVxuICovXG5cbmZ1bmN0aW9uIGdldEJpbmRBdHRyKG5vZGUsIG5hbWUpIHtcbiAgdmFyIHZhbCA9IGdldEF0dHIobm9kZSwgJzonICsgbmFtZSk7XG4gIGlmICh2YWwgPT09IG51bGwpIHtcbiAgICB2YWwgPSBnZXRBdHRyKG5vZGUsICd2LWJpbmQ6JyArIG5hbWUpO1xuICB9XG4gIHJldHVybiB2YWw7XG59XG5cbi8qKlxuICogQ2hlY2sgdGhlIHByZXNlbmNlIG9mIGEgYmluZCBhdHRyaWJ1dGUuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuXG5mdW5jdGlvbiBoYXNCaW5kQXR0cihub2RlLCBuYW1lKSB7XG4gIHJldHVybiBub2RlLmhhc0F0dHJpYnV0ZShuYW1lKSB8fCBub2RlLmhhc0F0dHJpYnV0ZSgnOicgKyBuYW1lKSB8fCBub2RlLmhhc0F0dHJpYnV0ZSgndi1iaW5kOicgKyBuYW1lKTtcbn1cblxuLyoqXG4gKiBJbnNlcnQgZWwgYmVmb3JlIHRhcmdldFxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7RWxlbWVudH0gdGFyZ2V0XG4gKi9cblxuZnVuY3Rpb24gYmVmb3JlKGVsLCB0YXJnZXQpIHtcbiAgdGFyZ2V0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGVsLCB0YXJnZXQpO1xufVxuXG4vKipcbiAqIEluc2VydCBlbCBhZnRlciB0YXJnZXRcbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFxuICovXG5cbmZ1bmN0aW9uIGFmdGVyKGVsLCB0YXJnZXQpIHtcbiAgaWYgKHRhcmdldC5uZXh0U2libGluZykge1xuICAgIGJlZm9yZShlbCwgdGFyZ2V0Lm5leHRTaWJsaW5nKTtcbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQucGFyZW50Tm9kZS5hcHBlbmRDaGlsZChlbCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmUgZWwgZnJvbSBET01cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKi9cblxuZnVuY3Rpb24gcmVtb3ZlKGVsKSB7XG4gIGVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWwpO1xufVxuXG4vKipcbiAqIFByZXBlbmQgZWwgdG8gdGFyZ2V0XG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtFbGVtZW50fSB0YXJnZXRcbiAqL1xuXG5mdW5jdGlvbiBwcmVwZW5kKGVsLCB0YXJnZXQpIHtcbiAgaWYgKHRhcmdldC5maXJzdENoaWxkKSB7XG4gICAgYmVmb3JlKGVsLCB0YXJnZXQuZmlyc3RDaGlsZCk7XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0LmFwcGVuZENoaWxkKGVsKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlcGxhY2UgdGFyZ2V0IHdpdGggZWxcbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICovXG5cbmZ1bmN0aW9uIHJlcGxhY2UodGFyZ2V0LCBlbCkge1xuICB2YXIgcGFyZW50ID0gdGFyZ2V0LnBhcmVudE5vZGU7XG4gIGlmIChwYXJlbnQpIHtcbiAgICBwYXJlbnQucmVwbGFjZUNoaWxkKGVsLCB0YXJnZXQpO1xuICB9XG59XG5cbi8qKlxuICogQWRkIGV2ZW50IGxpc3RlbmVyIHNob3J0aGFuZC5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFt1c2VDYXB0dXJlXVxuICovXG5cbmZ1bmN0aW9uIG9uKGVsLCBldmVudCwgY2IsIHVzZUNhcHR1cmUpIHtcbiAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgY2IsIHVzZUNhcHR1cmUpO1xufVxuXG4vKipcbiAqIFJlbW92ZSBldmVudCBsaXN0ZW5lciBzaG9ydGhhbmQuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYlxuICovXG5cbmZ1bmN0aW9uIG9mZihlbCwgZXZlbnQsIGNiKSB7XG4gIGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGNiKTtcbn1cblxuLyoqXG4gKiBJbiBJRTksIHNldEF0dHJpYnV0ZSgnY2xhc3MnKSB3aWxsIHJlc3VsdCBpbiBlbXB0eSBjbGFzc1xuICogaWYgdGhlIGVsZW1lbnQgYWxzbyBoYXMgdGhlIDpjbGFzcyBhdHRyaWJ1dGU7IEhvd2V2ZXIgaW5cbiAqIFBoYW50b21KUywgc2V0dGluZyBgY2xhc3NOYW1lYCBkb2VzIG5vdCB3b3JrIG9uIFNWRyBlbGVtZW50cy4uLlxuICogU28gd2UgaGF2ZSB0byBkbyBhIGNvbmRpdGlvbmFsIGNoZWNrIGhlcmUuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtTdHJpbmd9IGNsc1xuICovXG5cbmZ1bmN0aW9uIHNldENsYXNzKGVsLCBjbHMpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gIGlmIChpc0lFOSAmJiAhL3N2ZyQvLnRlc3QoZWwubmFtZXNwYWNlVVJJKSkge1xuICAgIGVsLmNsYXNzTmFtZSA9IGNscztcbiAgfSBlbHNlIHtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgY2xzKTtcbiAgfVxufVxuXG4vKipcbiAqIEFkZCBjbGFzcyB3aXRoIGNvbXBhdGliaWxpdHkgZm9yIElFICYgU1ZHXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtTdHJpbmd9IGNsc1xuICovXG5cbmZ1bmN0aW9uIGFkZENsYXNzKGVsLCBjbHMpIHtcbiAgaWYgKGVsLmNsYXNzTGlzdCkge1xuICAgIGVsLmNsYXNzTGlzdC5hZGQoY2xzKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgY3VyID0gJyAnICsgKGVsLmdldEF0dHJpYnV0ZSgnY2xhc3MnKSB8fCAnJykgKyAnICc7XG4gICAgaWYgKGN1ci5pbmRleE9mKCcgJyArIGNscyArICcgJykgPCAwKSB7XG4gICAgICBzZXRDbGFzcyhlbCwgKGN1ciArIGNscykudHJpbSgpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZW1vdmUgY2xhc3Mgd2l0aCBjb21wYXRpYmlsaXR5IGZvciBJRSAmIFNWR1xuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSBjbHNcbiAqL1xuXG5mdW5jdGlvbiByZW1vdmVDbGFzcyhlbCwgY2xzKSB7XG4gIGlmIChlbC5jbGFzc0xpc3QpIHtcbiAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKGNscyk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGN1ciA9ICcgJyArIChlbC5nZXRBdHRyaWJ1dGUoJ2NsYXNzJykgfHwgJycpICsgJyAnO1xuICAgIHZhciB0YXIgPSAnICcgKyBjbHMgKyAnICc7XG4gICAgd2hpbGUgKGN1ci5pbmRleE9mKHRhcikgPj0gMCkge1xuICAgICAgY3VyID0gY3VyLnJlcGxhY2UodGFyLCAnICcpO1xuICAgIH1cbiAgICBzZXRDbGFzcyhlbCwgY3VyLnRyaW0oKSk7XG4gIH1cbiAgaWYgKCFlbC5jbGFzc05hbWUpIHtcbiAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoJ2NsYXNzJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHRyYWN0IHJhdyBjb250ZW50IGluc2lkZSBhbiBlbGVtZW50IGludG8gYSB0ZW1wb3JhcnlcbiAqIGNvbnRhaW5lciBkaXZcbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGFzRnJhZ21lbnRcbiAqIEByZXR1cm4ge0VsZW1lbnR8RG9jdW1lbnRGcmFnbWVudH1cbiAqL1xuXG5mdW5jdGlvbiBleHRyYWN0Q29udGVudChlbCwgYXNGcmFnbWVudCkge1xuICB2YXIgY2hpbGQ7XG4gIHZhciByYXdDb250ZW50O1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYgKGlzVGVtcGxhdGUoZWwpICYmIGlzRnJhZ21lbnQoZWwuY29udGVudCkpIHtcbiAgICBlbCA9IGVsLmNvbnRlbnQ7XG4gIH1cbiAgaWYgKGVsLmhhc0NoaWxkTm9kZXMoKSkge1xuICAgIHRyaW1Ob2RlKGVsKTtcbiAgICByYXdDb250ZW50ID0gYXNGcmFnbWVudCA/IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLWNvbmQtYXNzaWduICovXG4gICAgd2hpbGUgKGNoaWxkID0gZWwuZmlyc3RDaGlsZCkge1xuICAgICAgLyogZXNsaW50LWVuYWJsZSBuby1jb25kLWFzc2lnbiAqL1xuICAgICAgcmF3Q29udGVudC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByYXdDb250ZW50O1xufVxuXG4vKipcbiAqIFRyaW0gcG9zc2libGUgZW1wdHkgaGVhZC90YWlsIHRleHQgYW5kIGNvbW1lbnRcbiAqIG5vZGVzIGluc2lkZSBhIHBhcmVudC5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqL1xuXG5mdW5jdGlvbiB0cmltTm9kZShub2RlKSB7XG4gIHZhciBjaGlsZDtcbiAgLyogZXNsaW50LWRpc2FibGUgbm8tc2VxdWVuY2VzICovXG4gIHdoaWxlICgoY2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQsIGlzVHJpbW1hYmxlKGNoaWxkKSkpIHtcbiAgICBub2RlLnJlbW92ZUNoaWxkKGNoaWxkKTtcbiAgfVxuICB3aGlsZSAoKGNoaWxkID0gbm9kZS5sYXN0Q2hpbGQsIGlzVHJpbW1hYmxlKGNoaWxkKSkpIHtcbiAgICBub2RlLnJlbW92ZUNoaWxkKGNoaWxkKTtcbiAgfVxuICAvKiBlc2xpbnQtZW5hYmxlIG5vLXNlcXVlbmNlcyAqL1xufVxuXG5mdW5jdGlvbiBpc1RyaW1tYWJsZShub2RlKSB7XG4gIHJldHVybiBub2RlICYmIChub2RlLm5vZGVUeXBlID09PSAzICYmICFub2RlLmRhdGEudHJpbSgpIHx8IG5vZGUubm9kZVR5cGUgPT09IDgpO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGFuIGVsZW1lbnQgaXMgYSB0ZW1wbGF0ZSB0YWcuXG4gKiBOb3RlIGlmIHRoZSB0ZW1wbGF0ZSBhcHBlYXJzIGluc2lkZSBhbiBTVkcgaXRzIHRhZ05hbWVcbiAqIHdpbGwgYmUgaW4gbG93ZXJjYXNlLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqL1xuXG5mdW5jdGlvbiBpc1RlbXBsYXRlKGVsKSB7XG4gIHJldHVybiBlbC50YWdOYW1lICYmIGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3RlbXBsYXRlJztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gXCJhbmNob3JcIiBmb3IgcGVyZm9ybWluZyBkb20gaW5zZXJ0aW9uL3JlbW92YWxzLlxuICogVGhpcyBpcyB1c2VkIGluIGEgbnVtYmVyIG9mIHNjZW5hcmlvczpcbiAqIC0gZnJhZ21lbnQgaW5zdGFuY2VcbiAqIC0gdi1odG1sXG4gKiAtIHYtaWZcbiAqIC0gdi1mb3JcbiAqIC0gY29tcG9uZW50XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlbnRcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcGVyc2lzdCAtIElFIHRyYXNoZXMgZW1wdHkgdGV4dE5vZGVzIG9uXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9uZU5vZGUodHJ1ZSksIHNvIGluIGNlcnRhaW5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2VzIHRoZSBhbmNob3IgbmVlZHMgdG8gYmVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vbi1lbXB0eSB0byBiZSBwZXJzaXN0ZWQgaW5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlcy5cbiAqIEByZXR1cm4ge0NvbW1lbnR8VGV4dH1cbiAqL1xuXG5mdW5jdGlvbiBjcmVhdGVBbmNob3IoY29udGVudCwgcGVyc2lzdCkge1xuICB2YXIgYW5jaG9yID0gY29uZmlnLmRlYnVnID8gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChjb250ZW50KSA6IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBlcnNpc3QgPyAnICcgOiAnJyk7XG4gIGFuY2hvci5fX3ZfYW5jaG9yID0gdHJ1ZTtcbiAgcmV0dXJuIGFuY2hvcjtcbn1cblxuLyoqXG4gKiBGaW5kIGEgY29tcG9uZW50IHJlZiBhdHRyaWJ1dGUgdGhhdCBzdGFydHMgd2l0aCAkLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gbm9kZVxuICogQHJldHVybiB7U3RyaW5nfHVuZGVmaW5lZH1cbiAqL1xuXG52YXIgcmVmUkUgPSAvXnYtcmVmOi87XG5cbmZ1bmN0aW9uIGZpbmRSZWYobm9kZSkge1xuICBpZiAobm9kZS5oYXNBdHRyaWJ1dGVzKCkpIHtcbiAgICB2YXIgYXR0cnMgPSBub2RlLmF0dHJpYnV0ZXM7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0gYXR0cnNbaV0ubmFtZTtcbiAgICAgIGlmIChyZWZSRS50ZXN0KG5hbWUpKSB7XG4gICAgICAgIHJldHVybiBjYW1lbGl6ZShuYW1lLnJlcGxhY2UocmVmUkUsICcnKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogTWFwIGEgZnVuY3Rpb24gdG8gYSByYW5nZSBvZiBub2RlcyAuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlXG4gKiBAcGFyYW0ge05vZGV9IGVuZFxuICogQHBhcmFtIHtGdW5jdGlvbn0gb3BcbiAqL1xuXG5mdW5jdGlvbiBtYXBOb2RlUmFuZ2Uobm9kZSwgZW5kLCBvcCkge1xuICB2YXIgbmV4dDtcbiAgd2hpbGUgKG5vZGUgIT09IGVuZCkge1xuICAgIG5leHQgPSBub2RlLm5leHRTaWJsaW5nO1xuICAgIG9wKG5vZGUpO1xuICAgIG5vZGUgPSBuZXh0O1xuICB9XG4gIG9wKGVuZCk7XG59XG5cbi8qKlxuICogUmVtb3ZlIGEgcmFuZ2Ugb2Ygbm9kZXMgd2l0aCB0cmFuc2l0aW9uLCBzdG9yZVxuICogdGhlIG5vZGVzIGluIGEgZnJhZ21lbnQgd2l0aCBjb3JyZWN0IG9yZGVyaW5nLFxuICogYW5kIGNhbGwgY2FsbGJhY2sgd2hlbiBkb25lLlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gc3RhcnRcbiAqIEBwYXJhbSB7Tm9kZX0gZW5kXG4gKiBAcGFyYW0ge1Z1ZX0gdm1cbiAqIEBwYXJhbSB7RG9jdW1lbnRGcmFnbWVudH0gZnJhZ1xuICogQHBhcmFtIHtGdW5jdGlvbn0gY2JcbiAqL1xuXG5mdW5jdGlvbiByZW1vdmVOb2RlUmFuZ2Uoc3RhcnQsIGVuZCwgdm0sIGZyYWcsIGNiKSB7XG4gIHZhciBkb25lID0gZmFsc2U7XG4gIHZhciByZW1vdmVkID0gMDtcbiAgdmFyIG5vZGVzID0gW107XG4gIG1hcE5vZGVSYW5nZShzdGFydCwgZW5kLCBmdW5jdGlvbiAobm9kZSkge1xuICAgIGlmIChub2RlID09PSBlbmQpIGRvbmUgPSB0cnVlO1xuICAgIG5vZGVzLnB1c2gobm9kZSk7XG4gICAgcmVtb3ZlV2l0aFRyYW5zaXRpb24obm9kZSwgdm0sIG9uUmVtb3ZlZCk7XG4gIH0pO1xuICBmdW5jdGlvbiBvblJlbW92ZWQoKSB7XG4gICAgcmVtb3ZlZCsrO1xuICAgIGlmIChkb25lICYmIHJlbW92ZWQgPj0gbm9kZXMubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGZyYWcuYXBwZW5kQ2hpbGQobm9kZXNbaV0pO1xuICAgICAgfVxuICAgICAgY2IgJiYgY2IoKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIG5vZGUgaXMgYSBEb2N1bWVudEZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuXG5mdW5jdGlvbiBpc0ZyYWdtZW50KG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUgJiYgbm9kZS5ub2RlVHlwZSA9PT0gMTE7XG59XG5cbi8qKlxuICogR2V0IG91dGVySFRNTCBvZiBlbGVtZW50cywgdGFraW5nIGNhcmVcbiAqIG9mIFNWRyBlbGVtZW50cyBpbiBJRSBhcyB3ZWxsLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiBnZXRPdXRlckhUTUwoZWwpIHtcbiAgaWYgKGVsLm91dGVySFRNTCkge1xuICAgIHJldHVybiBlbC5vdXRlckhUTUw7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChlbC5jbG9uZU5vZGUodHJ1ZSkpO1xuICAgIHJldHVybiBjb250YWluZXIuaW5uZXJIVE1MO1xuICB9XG59XG5cbnZhciB1aWQkMSA9IDA7XG5cbi8qKlxuICogQSBkZXAgaXMgYW4gb2JzZXJ2YWJsZSB0aGF0IGNhbiBoYXZlIG11bHRpcGxlXG4gKiBkaXJlY3RpdmVzIHN1YnNjcmliaW5nIHRvIGl0LlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBEZXAoKSB7XG4gIHRoaXMuaWQgPSB1aWQkMSsrO1xuICB0aGlzLnN1YnMgPSBbXTtcbn1cblxuLy8gdGhlIGN1cnJlbnQgdGFyZ2V0IHdhdGNoZXIgYmVpbmcgZXZhbHVhdGVkLlxuLy8gdGhpcyBpcyBnbG9iYWxseSB1bmlxdWUgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBvbmx5IG9uZVxuLy8gd2F0Y2hlciBiZWluZyBldmFsdWF0ZWQgYXQgYW55IHRpbWUuXG5EZXAudGFyZ2V0ID0gbnVsbDtcblxuLyoqXG4gKiBBZGQgYSBkaXJlY3RpdmUgc3Vic2NyaWJlci5cbiAqXG4gKiBAcGFyYW0ge0RpcmVjdGl2ZX0gc3ViXG4gKi9cblxuRGVwLnByb3RvdHlwZS5hZGRTdWIgPSBmdW5jdGlvbiAoc3ViKSB7XG4gIHRoaXMuc3Vicy5wdXNoKHN1Yik7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhIGRpcmVjdGl2ZSBzdWJzY3JpYmVyLlxuICpcbiAqIEBwYXJhbSB7RGlyZWN0aXZlfSBzdWJcbiAqL1xuXG5EZXAucHJvdG90eXBlLnJlbW92ZVN1YiA9IGZ1bmN0aW9uIChzdWIpIHtcbiAgdGhpcy5zdWJzLiRyZW1vdmUoc3ViKTtcbn07XG5cbi8qKlxuICogQWRkIHNlbGYgYXMgYSBkZXBlbmRlbmN5IHRvIHRoZSB0YXJnZXQgd2F0Y2hlci5cbiAqL1xuXG5EZXAucHJvdG90eXBlLmRlcGVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgRGVwLnRhcmdldC5hZGREZXAodGhpcyk7XG59O1xuXG4vKipcbiAqIE5vdGlmeSBhbGwgc3Vic2NyaWJlcnMgb2YgYSBuZXcgdmFsdWUuXG4gKi9cblxuRGVwLnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIHN0YWJsaXplIHRoZSBzdWJzY3JpYmVyIGxpc3QgZmlyc3RcbiAgdmFyIHN1YnMgPSB0b0FycmF5KHRoaXMuc3Vicyk7XG4gIGZvciAodmFyIGkgPSAwLCBsID0gc3Vicy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBzdWJzW2ldLnVwZGF0ZSgpO1xuICB9XG59O1xuXG52YXIgYXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZTtcbnZhciBhcnJheU1ldGhvZHMgPSBPYmplY3QuY3JlYXRlKGFycmF5UHJvdG8pXG5cbi8qKlxuICogSW50ZXJjZXB0IG11dGF0aW5nIG1ldGhvZHMgYW5kIGVtaXQgZXZlbnRzXG4gKi9cblxuO1sncHVzaCcsICdwb3AnLCAnc2hpZnQnLCAndW5zaGlmdCcsICdzcGxpY2UnLCAnc29ydCcsICdyZXZlcnNlJ10uZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gIC8vIGNhY2hlIG9yaWdpbmFsIG1ldGhvZFxuICB2YXIgb3JpZ2luYWwgPSBhcnJheVByb3RvW21ldGhvZF07XG4gIGRlZihhcnJheU1ldGhvZHMsIG1ldGhvZCwgZnVuY3Rpb24gbXV0YXRvcigpIHtcbiAgICAvLyBhdm9pZCBsZWFraW5nIGFyZ3VtZW50czpcbiAgICAvLyBodHRwOi8vanNwZXJmLmNvbS9jbG9zdXJlLXdpdGgtYXJndW1lbnRzXG4gICAgdmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGkpO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSBvcmlnaW5hbC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB2YXIgb2IgPSB0aGlzLl9fb2JfXztcbiAgICB2YXIgaW5zZXJ0ZWQ7XG4gICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgIGNhc2UgJ3B1c2gnOlxuICAgICAgICBpbnNlcnRlZCA9IGFyZ3M7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndW5zaGlmdCc6XG4gICAgICAgIGluc2VydGVkID0gYXJncztcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdzcGxpY2UnOlxuICAgICAgICBpbnNlcnRlZCA9IGFyZ3Muc2xpY2UoMik7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBpZiAoaW5zZXJ0ZWQpIG9iLm9ic2VydmVBcnJheShpbnNlcnRlZCk7XG4gICAgLy8gbm90aWZ5IGNoYW5nZVxuICAgIG9iLmRlcC5ub3RpZnkoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn0pO1xuXG4vKipcbiAqIFN3YXAgdGhlIGVsZW1lbnQgYXQgdGhlIGdpdmVuIGluZGV4IHdpdGggYSBuZXcgdmFsdWVcbiAqIGFuZCBlbWl0cyBjb3JyZXNwb25kaW5nIGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleFxuICogQHBhcmFtIHsqfSB2YWxcbiAqIEByZXR1cm4geyp9IC0gcmVwbGFjZWQgZWxlbWVudFxuICovXG5cbmRlZihhcnJheVByb3RvLCAnJHNldCcsIGZ1bmN0aW9uICRzZXQoaW5kZXgsIHZhbCkge1xuICBpZiAoaW5kZXggPj0gdGhpcy5sZW5ndGgpIHtcbiAgICB0aGlzLmxlbmd0aCA9IE51bWJlcihpbmRleCkgKyAxO1xuICB9XG4gIHJldHVybiB0aGlzLnNwbGljZShpbmRleCwgMSwgdmFsKVswXTtcbn0pO1xuXG4vKipcbiAqIENvbnZlbmllbmNlIG1ldGhvZCB0byByZW1vdmUgdGhlIGVsZW1lbnQgYXQgZ2l2ZW4gaW5kZXguXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4XG4gKiBAcGFyYW0geyp9IHZhbFxuICovXG5cbmRlZihhcnJheVByb3RvLCAnJHJlbW92ZScsIGZ1bmN0aW9uICRyZW1vdmUoaXRlbSkge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYgKCF0aGlzLmxlbmd0aCkgcmV0dXJuO1xuICB2YXIgaW5kZXggPSBpbmRleE9mKHRoaXMsIGl0ZW0pO1xuICBpZiAoaW5kZXggPiAtMSkge1xuICAgIHJldHVybiB0aGlzLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbn0pO1xuXG52YXIgYXJyYXlLZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYXJyYXlNZXRob2RzKTtcblxuLyoqXG4gKiBPYnNlcnZlciBjbGFzcyB0aGF0IGFyZSBhdHRhY2hlZCB0byBlYWNoIG9ic2VydmVkXG4gKiBvYmplY3QuIE9uY2UgYXR0YWNoZWQsIHRoZSBvYnNlcnZlciBjb252ZXJ0cyB0YXJnZXRcbiAqIG9iamVjdCdzIHByb3BlcnR5IGtleXMgaW50byBnZXR0ZXIvc2V0dGVycyB0aGF0XG4gKiBjb2xsZWN0IGRlcGVuZGVuY2llcyBhbmQgZGlzcGF0Y2hlcyB1cGRhdGVzLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSB2YWx1ZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cblxuZnVuY3Rpb24gT2JzZXJ2ZXIodmFsdWUpIHtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlO1xuICB0aGlzLmRlcCA9IG5ldyBEZXAoKTtcbiAgZGVmKHZhbHVlLCAnX19vYl9fJywgdGhpcyk7XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIHZhciBhdWdtZW50ID0gaGFzUHJvdG8gPyBwcm90b0F1Z21lbnQgOiBjb3B5QXVnbWVudDtcbiAgICBhdWdtZW50KHZhbHVlLCBhcnJheU1ldGhvZHMsIGFycmF5S2V5cyk7XG4gICAgdGhpcy5vYnNlcnZlQXJyYXkodmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMud2Fsayh2YWx1ZSk7XG4gIH1cbn1cblxuLy8gSW5zdGFuY2UgbWV0aG9kc1xuXG4vKipcbiAqIFdhbGsgdGhyb3VnaCBlYWNoIHByb3BlcnR5IGFuZCBjb252ZXJ0IHRoZW0gaW50b1xuICogZ2V0dGVyL3NldHRlcnMuIFRoaXMgbWV0aG9kIHNob3VsZCBvbmx5IGJlIGNhbGxlZCB3aGVuXG4gKiB2YWx1ZSB0eXBlIGlzIE9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKi9cblxuT2JzZXJ2ZXIucHJvdG90eXBlLndhbGsgPSBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHRoaXMuY29udmVydChrZXlzW2ldLCBvYmpba2V5c1tpXV0pO1xuICB9XG59O1xuXG4vKipcbiAqIE9ic2VydmUgYSBsaXN0IG9mIEFycmF5IGl0ZW1zLlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGl0ZW1zXG4gKi9cblxuT2JzZXJ2ZXIucHJvdG90eXBlLm9ic2VydmVBcnJheSA9IGZ1bmN0aW9uIChpdGVtcykge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGl0ZW1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIG9ic2VydmUoaXRlbXNbaV0pO1xuICB9XG59O1xuXG4vKipcbiAqIENvbnZlcnQgYSBwcm9wZXJ0eSBpbnRvIGdldHRlci9zZXR0ZXIgc28gd2UgY2FuIGVtaXRcbiAqIHRoZSBldmVudHMgd2hlbiB0aGUgcHJvcGVydHkgaXMgYWNjZXNzZWQvY2hhbmdlZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0geyp9IHZhbFxuICovXG5cbk9ic2VydmVyLnByb3RvdHlwZS5jb252ZXJ0ID0gZnVuY3Rpb24gKGtleSwgdmFsKSB7XG4gIGRlZmluZVJlYWN0aXZlKHRoaXMudmFsdWUsIGtleSwgdmFsKTtcbn07XG5cbi8qKlxuICogQWRkIGFuIG93bmVyIHZtLCBzbyB0aGF0IHdoZW4gJHNldC8kZGVsZXRlIG11dGF0aW9uc1xuICogaGFwcGVuIHdlIGNhbiBub3RpZnkgb3duZXIgdm1zIHRvIHByb3h5IHRoZSBrZXlzIGFuZFxuICogZGlnZXN0IHRoZSB3YXRjaGVycy4gVGhpcyBpcyBvbmx5IGNhbGxlZCB3aGVuIHRoZSBvYmplY3RcbiAqIGlzIG9ic2VydmVkIGFzIGFuIGluc3RhbmNlJ3Mgcm9vdCAkZGF0YS5cbiAqXG4gKiBAcGFyYW0ge1Z1ZX0gdm1cbiAqL1xuXG5PYnNlcnZlci5wcm90b3R5cGUuYWRkVm0gPSBmdW5jdGlvbiAodm0pIHtcbiAgKHRoaXMudm1zIHx8ICh0aGlzLnZtcyA9IFtdKSkucHVzaCh2bSk7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBvd25lciB2bS4gVGhpcyBpcyBjYWxsZWQgd2hlbiB0aGUgb2JqZWN0IGlzXG4gKiBzd2FwcGVkIG91dCBhcyBhbiBpbnN0YW5jZSdzICRkYXRhIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge1Z1ZX0gdm1cbiAqL1xuXG5PYnNlcnZlci5wcm90b3R5cGUucmVtb3ZlVm0gPSBmdW5jdGlvbiAodm0pIHtcbiAgdGhpcy52bXMuJHJlbW92ZSh2bSk7XG59O1xuXG4vLyBoZWxwZXJzXG5cbi8qKlxuICogQXVnbWVudCBhbiB0YXJnZXQgT2JqZWN0IG9yIEFycmF5IGJ5IGludGVyY2VwdGluZ1xuICogdGhlIHByb3RvdHlwZSBjaGFpbiB1c2luZyBfX3Byb3RvX19cbiAqXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gdGFyZ2V0XG4gKiBAcGFyYW0ge09iamVjdH0gcHJvdG9cbiAqL1xuXG5mdW5jdGlvbiBwcm90b0F1Z21lbnQodGFyZ2V0LCBzcmMpIHtcbiAgLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cbiAgdGFyZ2V0Ll9fcHJvdG9fXyA9IHNyYztcbiAgLyogZXNsaW50LWVuYWJsZSBuby1wcm90byAqL1xufVxuXG4vKipcbiAqIEF1Z21lbnQgYW4gdGFyZ2V0IE9iamVjdCBvciBBcnJheSBieSBkZWZpbmluZ1xuICogaGlkZGVuIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R8QXJyYXl9IHRhcmdldFxuICogQHBhcmFtIHtPYmplY3R9IHByb3RvXG4gKi9cblxuZnVuY3Rpb24gY29weUF1Z21lbnQodGFyZ2V0LCBzcmMsIGtleXMpIHtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgIGRlZih0YXJnZXQsIGtleSwgc3JjW2tleV0pO1xuICB9XG59XG5cbi8qKlxuICogQXR0ZW1wdCB0byBjcmVhdGUgYW4gb2JzZXJ2ZXIgaW5zdGFuY2UgZm9yIGEgdmFsdWUsXG4gKiByZXR1cm5zIHRoZSBuZXcgb2JzZXJ2ZXIgaWYgc3VjY2Vzc2Z1bGx5IG9ic2VydmVkLFxuICogb3IgdGhlIGV4aXN0aW5nIG9ic2VydmVyIGlmIHRoZSB2YWx1ZSBhbHJlYWR5IGhhcyBvbmUuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHBhcmFtIHtWdWV9IFt2bV1cbiAqIEByZXR1cm4ge09ic2VydmVyfHVuZGVmaW5lZH1cbiAqIEBzdGF0aWNcbiAqL1xuXG5mdW5jdGlvbiBvYnNlcnZlKHZhbHVlLCB2bSkge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIG9iO1xuICBpZiAoaGFzT3duKHZhbHVlLCAnX19vYl9fJykgJiYgdmFsdWUuX19vYl9fIGluc3RhbmNlb2YgT2JzZXJ2ZXIpIHtcbiAgICBvYiA9IHZhbHVlLl9fb2JfXztcbiAgfSBlbHNlIGlmICgoaXNBcnJheSh2YWx1ZSkgfHwgaXNQbGFpbk9iamVjdCh2YWx1ZSkpICYmIE9iamVjdC5pc0V4dGVuc2libGUodmFsdWUpICYmICF2YWx1ZS5faXNWdWUpIHtcbiAgICBvYiA9IG5ldyBPYnNlcnZlcih2YWx1ZSk7XG4gIH1cbiAgaWYgKG9iICYmIHZtKSB7XG4gICAgb2IuYWRkVm0odm0pO1xuICB9XG4gIHJldHVybiBvYjtcbn1cblxuLyoqXG4gKiBEZWZpbmUgYSByZWFjdGl2ZSBwcm9wZXJ0eSBvbiBhbiBPYmplY3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHsqfSB2YWxcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZG9Ob3RPYnNlcnZlXG4gKi9cblxuZnVuY3Rpb24gZGVmaW5lUmVhY3RpdmUob2JqLCBrZXksIHZhbCwgZG9Ob3RPYnNlcnZlKSB7XG4gIHZhciBkZXAgPSBuZXcgRGVwKCk7XG5cbiAgdmFyIHByb3BlcnR5ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmosIGtleSk7XG4gIGlmIChwcm9wZXJ0eSAmJiBwcm9wZXJ0eS5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gY2F0ZXIgZm9yIHByZS1kZWZpbmVkIGdldHRlci9zZXR0ZXJzXG4gIHZhciBnZXR0ZXIgPSBwcm9wZXJ0eSAmJiBwcm9wZXJ0eS5nZXQ7XG4gIHZhciBzZXR0ZXIgPSBwcm9wZXJ0eSAmJiBwcm9wZXJ0eS5zZXQ7XG5cbiAgLy8gaWYgZG9Ob3RPYnNlcnZlIGlzIHRydWUsIG9ubHkgdXNlIHRoZSBjaGlsZCB2YWx1ZSBvYnNlcnZlclxuICAvLyBpZiBpdCBhbHJlYWR5IGV4aXN0cywgYW5kIGRvIG5vdCBhdHRlbXB0IHRvIGNyZWF0ZSBpdC5cbiAgLy8gdGhpcyBhbGxvd3MgZnJlZXppbmcgYSBsYXJnZSBvYmplY3QgZnJvbSB0aGUgcm9vdCBhbmRcbiAgLy8gYXZvaWQgdW5uZWNlc3Nhcnkgb2JzZXJ2YXRpb24gaW5zaWRlIHYtZm9yIGZyYWdtZW50cy5cbiAgdmFyIGNoaWxkT2IgPSBkb05vdE9ic2VydmUgPyBpc09iamVjdCh2YWwpICYmIHZhbC5fX29iX18gOiBvYnNlcnZlKHZhbCk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIGtleSwge1xuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24gcmVhY3RpdmVHZXR0ZXIoKSB7XG4gICAgICB2YXIgdmFsdWUgPSBnZXR0ZXIgPyBnZXR0ZXIuY2FsbChvYmopIDogdmFsO1xuICAgICAgaWYgKERlcC50YXJnZXQpIHtcbiAgICAgICAgZGVwLmRlcGVuZCgpO1xuICAgICAgICBpZiAoY2hpbGRPYikge1xuICAgICAgICAgIGNoaWxkT2IuZGVwLmRlcGVuZCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgIGZvciAodmFyIGUsIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBlID0gdmFsdWVbaV07XG4gICAgICAgICAgICBlICYmIGUuX19vYl9fICYmIGUuX19vYl9fLmRlcC5kZXBlbmQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24gcmVhY3RpdmVTZXR0ZXIobmV3VmFsKSB7XG4gICAgICB2YXIgdmFsdWUgPSBnZXR0ZXIgPyBnZXR0ZXIuY2FsbChvYmopIDogdmFsO1xuICAgICAgaWYgKG5ld1ZhbCA9PT0gdmFsdWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHNldHRlcikge1xuICAgICAgICBzZXR0ZXIuY2FsbChvYmosIG5ld1ZhbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWwgPSBuZXdWYWw7XG4gICAgICB9XG4gICAgICBjaGlsZE9iID0gZG9Ob3RPYnNlcnZlID8gaXNPYmplY3QobmV3VmFsKSAmJiBuZXdWYWwuX19vYl9fIDogb2JzZXJ2ZShuZXdWYWwpO1xuICAgICAgZGVwLm5vdGlmeSgpO1xuICAgIH1cbiAgfSk7XG59XG5cbnZhciBjb21tb25UYWdSRSA9IC9eKGRpdnxwfHNwYW58aW1nfGF8YnxpfGJyfHVsfG9sfGxpfGgxfGgyfGgzfGg0fGg1fGg2fGNvZGV8cHJlfHRhYmxlfHRofHRkfHRyfGZvcm18bGFiZWx8aW5wdXR8c2VsZWN0fG9wdGlvbnxuYXZ8YXJ0aWNsZXxzZWN0aW9ufGhlYWRlcnxmb290ZXIpJC9pO1xudmFyIHJlc2VydmVkVGFnUkUgPSAvXihzbG90fHBhcnRpYWx8Y29tcG9uZW50KSQvaTtcblxudmFyIGlzVW5rbm93bkVsZW1lbnQgPSB1bmRlZmluZWQ7XG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICBpc1Vua25vd25FbGVtZW50ID0gZnVuY3Rpb24gKGVsLCB0YWcpIHtcbiAgICBpZiAodGFnLmluZGV4T2YoJy0nKSA+IC0xKSB7XG4gICAgICAvLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yODIxMDM2NC8xMDcwMjQ0XG4gICAgICByZXR1cm4gZWwuY29uc3RydWN0b3IgPT09IHdpbmRvdy5IVE1MVW5rbm93bkVsZW1lbnQgfHwgZWwuY29uc3RydWN0b3IgPT09IHdpbmRvdy5IVE1MRWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICgvSFRNTFVua25vd25FbGVtZW50Ly50ZXN0KGVsLnRvU3RyaW5nKCkpICYmXG4gICAgICAgIC8vIENocm9tZSByZXR1cm5zIHVua25vd24gZm9yIHNldmVyYWwgSFRNTDUgZWxlbWVudHMuXG4gICAgICAgIC8vIGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD01NDA1MjZcbiAgICAgICAgIS9eKGRhdGF8dGltZXxydGN8cmIpJC8udGVzdCh0YWcpXG4gICAgICApO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhbiBlbGVtZW50IGlzIGEgY29tcG9uZW50LCBpZiB5ZXMgcmV0dXJuIGl0c1xuICogY29tcG9uZW50IGlkLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R8dW5kZWZpbmVkfVxuICovXG5cbmZ1bmN0aW9uIGNoZWNrQ29tcG9uZW50QXR0cihlbCwgb3B0aW9ucykge1xuICB2YXIgdGFnID0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICB2YXIgaGFzQXR0cnMgPSBlbC5oYXNBdHRyaWJ1dGVzKCk7XG4gIGlmICghY29tbW9uVGFnUkUudGVzdCh0YWcpICYmICFyZXNlcnZlZFRhZ1JFLnRlc3QodGFnKSkge1xuICAgIGlmIChyZXNvbHZlQXNzZXQob3B0aW9ucywgJ2NvbXBvbmVudHMnLCB0YWcpKSB7XG4gICAgICByZXR1cm4geyBpZDogdGFnIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBpcyA9IGhhc0F0dHJzICYmIGdldElzQmluZGluZyhlbCk7XG4gICAgICBpZiAoaXMpIHtcbiAgICAgICAgcmV0dXJuIGlzO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICAgIHZhciBleHBlY3RlZFRhZyA9IG9wdGlvbnMuX2NvbXBvbmVudE5hbWVNYXAgJiYgb3B0aW9ucy5fY29tcG9uZW50TmFtZU1hcFt0YWddO1xuICAgICAgICBpZiAoZXhwZWN0ZWRUYWcpIHtcbiAgICAgICAgICB3YXJuKCdVbmtub3duIGN1c3RvbSBlbGVtZW50OiA8JyArIHRhZyArICc+IC0gJyArICdkaWQgeW91IG1lYW4gPCcgKyBleHBlY3RlZFRhZyArICc+PyAnICsgJ0hUTUwgaXMgY2FzZS1pbnNlbnNpdGl2ZSwgcmVtZW1iZXIgdG8gdXNlIGtlYmFiLWNhc2UgaW4gdGVtcGxhdGVzLicpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzVW5rbm93bkVsZW1lbnQoZWwsIHRhZykpIHtcbiAgICAgICAgICB3YXJuKCdVbmtub3duIGN1c3RvbSBlbGVtZW50OiA8JyArIHRhZyArICc+IC0gZGlkIHlvdSAnICsgJ3JlZ2lzdGVyIHRoZSBjb21wb25lbnQgY29ycmVjdGx5PyBGb3IgcmVjdXJzaXZlIGNvbXBvbmVudHMsICcgKyAnbWFrZSBzdXJlIHRvIHByb3ZpZGUgdGhlIFwibmFtZVwiIG9wdGlvbi4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChoYXNBdHRycykge1xuICAgIHJldHVybiBnZXRJc0JpbmRpbmcoZWwpO1xuICB9XG59XG5cbi8qKlxuICogR2V0IFwiaXNcIiBiaW5kaW5nIGZyb20gYW4gZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtPYmplY3R8dW5kZWZpbmVkfVxuICovXG5cbmZ1bmN0aW9uIGdldElzQmluZGluZyhlbCkge1xuICAvLyBkeW5hbWljIHN5bnRheFxuICB2YXIgZXhwID0gZ2V0QXR0cihlbCwgJ2lzJyk7XG4gIGlmIChleHAgIT0gbnVsbCkge1xuICAgIHJldHVybiB7IGlkOiBleHAgfTtcbiAgfSBlbHNlIHtcbiAgICBleHAgPSBnZXRCaW5kQXR0cihlbCwgJ2lzJyk7XG4gICAgaWYgKGV4cCAhPSBudWxsKSB7XG4gICAgICByZXR1cm4geyBpZDogZXhwLCBkeW5hbWljOiB0cnVlIH07XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2V0IGEgcHJvcCdzIGluaXRpYWwgdmFsdWUgb24gYSB2bSBhbmQgaXRzIGRhdGEgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtPYmplY3R9IHByb3BcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAqL1xuXG5mdW5jdGlvbiBpbml0UHJvcCh2bSwgcHJvcCwgdmFsdWUpIHtcbiAgdmFyIGtleSA9IHByb3AucGF0aDtcbiAgdmFsdWUgPSBjb2VyY2VQcm9wKHByb3AsIHZhbHVlKTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICB2YWx1ZSA9IGdldFByb3BEZWZhdWx0VmFsdWUodm0sIHByb3Aub3B0aW9ucyk7XG4gIH1cbiAgaWYgKGFzc2VydFByb3AocHJvcCwgdmFsdWUpKSB7XG4gICAgZGVmaW5lUmVhY3RpdmUodm0sIGtleSwgdmFsdWUsIHRydWUgLyogZG9Ob3RPYnNlcnZlICovKTtcbiAgfVxufVxuXG4vKipcbiAqIEdldCB0aGUgZGVmYXVsdCB2YWx1ZSBvZiBhIHByb3AuXG4gKlxuICogQHBhcmFtIHtWdWV9IHZtXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7Kn1cbiAqL1xuXG5mdW5jdGlvbiBnZXRQcm9wRGVmYXVsdFZhbHVlKHZtLCBvcHRpb25zKSB7XG4gIC8vIG5vIGRlZmF1bHQsIHJldHVybiB1bmRlZmluZWRcbiAgaWYgKCFoYXNPd24ob3B0aW9ucywgJ2RlZmF1bHQnKSkge1xuICAgIC8vIGFic2VudCBib29sZWFuIHZhbHVlIGRlZmF1bHRzIHRvIGZhbHNlXG4gICAgcmV0dXJuIG9wdGlvbnMudHlwZSA9PT0gQm9vbGVhbiA/IGZhbHNlIDogdW5kZWZpbmVkO1xuICB9XG4gIHZhciBkZWYgPSBvcHRpb25zWydkZWZhdWx0J107XG4gIC8vIHdhcm4gYWdhaW5zdCBub24tZmFjdG9yeSBkZWZhdWx0cyBmb3IgT2JqZWN0ICYgQXJyYXlcbiAgaWYgKGlzT2JqZWN0KGRlZikpIHtcbiAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ09iamVjdC9BcnJheSBhcyBkZWZhdWx0IHByb3AgdmFsdWVzIHdpbGwgYmUgc2hhcmVkICcgKyAnYWNyb3NzIG11bHRpcGxlIGluc3RhbmNlcy4gVXNlIGEgZmFjdG9yeSBmdW5jdGlvbiAnICsgJ3RvIHJldHVybiB0aGUgZGVmYXVsdCB2YWx1ZSBpbnN0ZWFkLicpO1xuICB9XG4gIC8vIGNhbGwgZmFjdG9yeSBmdW5jdGlvbiBmb3Igbm9uLUZ1bmN0aW9uIHR5cGVzXG4gIHJldHVybiB0eXBlb2YgZGVmID09PSAnZnVuY3Rpb24nICYmIG9wdGlvbnMudHlwZSAhPT0gRnVuY3Rpb24gPyBkZWYuY2FsbCh2bSkgOiBkZWY7XG59XG5cbi8qKlxuICogQXNzZXJ0IHdoZXRoZXIgYSBwcm9wIGlzIHZhbGlkLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwcm9wXG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKi9cblxuZnVuY3Rpb24gYXNzZXJ0UHJvcChwcm9wLCB2YWx1ZSkge1xuICBpZiAoIXByb3Aub3B0aW9ucy5yZXF1aXJlZCAmJiAoIC8vIG5vbi1yZXF1aXJlZFxuICBwcm9wLnJhdyA9PT0gbnVsbCB8fCAvLyBhYnNjZW50XG4gIHZhbHVlID09IG51bGwpIC8vIG51bGwgb3IgdW5kZWZpbmVkXG4gICkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB2YXIgb3B0aW9ucyA9IHByb3Aub3B0aW9ucztcbiAgdmFyIHR5cGUgPSBvcHRpb25zLnR5cGU7XG4gIHZhciB2YWxpZCA9IHRydWU7XG4gIHZhciBleHBlY3RlZFR5cGU7XG4gIGlmICh0eXBlKSB7XG4gICAgaWYgKHR5cGUgPT09IFN0cmluZykge1xuICAgICAgZXhwZWN0ZWRUeXBlID0gJ3N0cmluZyc7XG4gICAgICB2YWxpZCA9IHR5cGVvZiB2YWx1ZSA9PT0gZXhwZWN0ZWRUeXBlO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gTnVtYmVyKSB7XG4gICAgICBleHBlY3RlZFR5cGUgPSAnbnVtYmVyJztcbiAgICAgIHZhbGlkID0gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJztcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09IEJvb2xlYW4pIHtcbiAgICAgIGV4cGVjdGVkVHlwZSA9ICdib29sZWFuJztcbiAgICAgIHZhbGlkID0gdHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbic7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBGdW5jdGlvbikge1xuICAgICAgZXhwZWN0ZWRUeXBlID0gJ2Z1bmN0aW9uJztcbiAgICAgIHZhbGlkID0gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gT2JqZWN0KSB7XG4gICAgICBleHBlY3RlZFR5cGUgPSAnb2JqZWN0JztcbiAgICAgIHZhbGlkID0gaXNQbGFpbk9iamVjdCh2YWx1ZSk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSBBcnJheSkge1xuICAgICAgZXhwZWN0ZWRUeXBlID0gJ2FycmF5JztcbiAgICAgIHZhbGlkID0gaXNBcnJheSh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbGlkID0gdmFsdWUgaW5zdGFuY2VvZiB0eXBlO1xuICAgIH1cbiAgfVxuICBpZiAoIXZhbGlkKSB7XG4gICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiB3YXJuKCdJbnZhbGlkIHByb3A6IHR5cGUgY2hlY2sgZmFpbGVkIGZvciAnICsgcHJvcC5wYXRoICsgJz1cIicgKyBwcm9wLnJhdyArICdcIi4nICsgJyBFeHBlY3RlZCAnICsgZm9ybWF0VHlwZShleHBlY3RlZFR5cGUpICsgJywgZ290ICcgKyBmb3JtYXRWYWx1ZSh2YWx1ZSkgKyAnLicpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICB2YXIgdmFsaWRhdG9yID0gb3B0aW9ucy52YWxpZGF0b3I7XG4gIGlmICh2YWxpZGF0b3IpIHtcbiAgICBpZiAoIXZhbGlkYXRvcih2YWx1ZSkpIHtcbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgd2FybignSW52YWxpZCBwcm9wOiBjdXN0b20gdmFsaWRhdG9yIGNoZWNrIGZhaWxlZCBmb3IgJyArIHByb3AucGF0aCArICc9XCInICsgcHJvcC5yYXcgKyAnXCInKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogRm9yY2UgcGFyc2luZyB2YWx1ZSB3aXRoIGNvZXJjZSBvcHRpb24uXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4geyp9XG4gKi9cblxuZnVuY3Rpb24gY29lcmNlUHJvcChwcm9wLCB2YWx1ZSkge1xuICB2YXIgY29lcmNlID0gcHJvcC5vcHRpb25zLmNvZXJjZTtcbiAgaWYgKCFjb2VyY2UpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgLy8gY29lcmNlIGlzIGEgZnVuY3Rpb25cbiAgcmV0dXJuIGNvZXJjZSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFR5cGUodmFsKSB7XG4gIHJldHVybiB2YWwgPyB2YWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YWwuc2xpY2UoMSkgOiAnY3VzdG9tIHR5cGUnO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZSh2YWwpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWwpLnNsaWNlKDgsIC0xKTtcbn1cblxuLyoqXG4gKiBPcHRpb24gb3ZlcndyaXRpbmcgc3RyYXRlZ2llcyBhcmUgZnVuY3Rpb25zIHRoYXQgaGFuZGxlXG4gKiBob3cgdG8gbWVyZ2UgYSBwYXJlbnQgb3B0aW9uIHZhbHVlIGFuZCBhIGNoaWxkIG9wdGlvblxuICogdmFsdWUgaW50byB0aGUgZmluYWwgdmFsdWUuXG4gKlxuICogQWxsIHN0cmF0ZWd5IGZ1bmN0aW9ucyBmb2xsb3cgdGhlIHNhbWUgc2lnbmF0dXJlOlxuICpcbiAqIEBwYXJhbSB7Kn0gcGFyZW50VmFsXG4gKiBAcGFyYW0geyp9IGNoaWxkVmFsXG4gKiBAcGFyYW0ge1Z1ZX0gW3ZtXVxuICovXG5cbnZhciBzdHJhdHMgPSBjb25maWcub3B0aW9uTWVyZ2VTdHJhdGVnaWVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuLyoqXG4gKiBIZWxwZXIgdGhhdCByZWN1cnNpdmVseSBtZXJnZXMgdHdvIGRhdGEgb2JqZWN0cyB0b2dldGhlci5cbiAqL1xuXG5mdW5jdGlvbiBtZXJnZURhdGEodG8sIGZyb20pIHtcbiAgdmFyIGtleSwgdG9WYWwsIGZyb21WYWw7XG4gIGZvciAoa2V5IGluIGZyb20pIHtcbiAgICB0b1ZhbCA9IHRvW2tleV07XG4gICAgZnJvbVZhbCA9IGZyb21ba2V5XTtcbiAgICBpZiAoIWhhc093bih0bywga2V5KSkge1xuICAgICAgc2V0KHRvLCBrZXksIGZyb21WYWwpO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodG9WYWwpICYmIGlzT2JqZWN0KGZyb21WYWwpKSB7XG4gICAgICBtZXJnZURhdGEodG9WYWwsIGZyb21WYWwpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdG87XG59XG5cbi8qKlxuICogRGF0YVxuICovXG5cbnN0cmF0cy5kYXRhID0gZnVuY3Rpb24gKHBhcmVudFZhbCwgY2hpbGRWYWwsIHZtKSB7XG4gIGlmICghdm0pIHtcbiAgICAvLyBpbiBhIFZ1ZS5leHRlbmQgbWVyZ2UsIGJvdGggc2hvdWxkIGJlIGZ1bmN0aW9uc1xuICAgIGlmICghY2hpbGRWYWwpIHtcbiAgICAgIHJldHVybiBwYXJlbnRWYWw7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgY2hpbGRWYWwgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgd2FybignVGhlIFwiZGF0YVwiIG9wdGlvbiBzaG91bGQgYmUgYSBmdW5jdGlvbiAnICsgJ3RoYXQgcmV0dXJucyBhIHBlci1pbnN0YW5jZSB2YWx1ZSBpbiBjb21wb25lbnQgJyArICdkZWZpbml0aW9ucy4nKTtcbiAgICAgIHJldHVybiBwYXJlbnRWYWw7XG4gICAgfVxuICAgIGlmICghcGFyZW50VmFsKSB7XG4gICAgICByZXR1cm4gY2hpbGRWYWw7XG4gICAgfVxuICAgIC8vIHdoZW4gcGFyZW50VmFsICYgY2hpbGRWYWwgYXJlIGJvdGggcHJlc2VudCxcbiAgICAvLyB3ZSBuZWVkIHRvIHJldHVybiBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgICAvLyBtZXJnZWQgcmVzdWx0IG9mIGJvdGggZnVuY3Rpb25zLi4uIG5vIG5lZWQgdG9cbiAgICAvLyBjaGVjayBpZiBwYXJlbnRWYWwgaXMgYSBmdW5jdGlvbiBoZXJlIGJlY2F1c2VcbiAgICAvLyBpdCBoYXMgdG8gYmUgYSBmdW5jdGlvbiB0byBwYXNzIHByZXZpb3VzIG1lcmdlcy5cbiAgICByZXR1cm4gZnVuY3Rpb24gbWVyZ2VkRGF0YUZuKCkge1xuICAgICAgcmV0dXJuIG1lcmdlRGF0YShjaGlsZFZhbC5jYWxsKHRoaXMpLCBwYXJlbnRWYWwuY2FsbCh0aGlzKSk7XG4gICAgfTtcbiAgfSBlbHNlIGlmIChwYXJlbnRWYWwgfHwgY2hpbGRWYWwpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gbWVyZ2VkSW5zdGFuY2VEYXRhRm4oKSB7XG4gICAgICAvLyBpbnN0YW5jZSBtZXJnZVxuICAgICAgdmFyIGluc3RhbmNlRGF0YSA9IHR5cGVvZiBjaGlsZFZhbCA9PT0gJ2Z1bmN0aW9uJyA/IGNoaWxkVmFsLmNhbGwodm0pIDogY2hpbGRWYWw7XG4gICAgICB2YXIgZGVmYXVsdERhdGEgPSB0eXBlb2YgcGFyZW50VmFsID09PSAnZnVuY3Rpb24nID8gcGFyZW50VmFsLmNhbGwodm0pIDogdW5kZWZpbmVkO1xuICAgICAgaWYgKGluc3RhbmNlRGF0YSkge1xuICAgICAgICByZXR1cm4gbWVyZ2VEYXRhKGluc3RhbmNlRGF0YSwgZGVmYXVsdERhdGEpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHREYXRhO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn07XG5cbi8qKlxuICogRWxcbiAqL1xuXG5zdHJhdHMuZWwgPSBmdW5jdGlvbiAocGFyZW50VmFsLCBjaGlsZFZhbCwgdm0pIHtcbiAgaWYgKCF2bSAmJiBjaGlsZFZhbCAmJiB0eXBlb2YgY2hpbGRWYWwgIT09ICdmdW5jdGlvbicpIHtcbiAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ1RoZSBcImVsXCIgb3B0aW9uIHNob3VsZCBiZSBhIGZ1bmN0aW9uICcgKyAndGhhdCByZXR1cm5zIGEgcGVyLWluc3RhbmNlIHZhbHVlIGluIGNvbXBvbmVudCAnICsgJ2RlZmluaXRpb25zLicpO1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgcmV0ID0gY2hpbGRWYWwgfHwgcGFyZW50VmFsO1xuICAvLyBpbnZva2UgdGhlIGVsZW1lbnQgZmFjdG9yeSBpZiB0aGlzIGlzIGluc3RhbmNlIG1lcmdlXG4gIHJldHVybiB2bSAmJiB0eXBlb2YgcmV0ID09PSAnZnVuY3Rpb24nID8gcmV0LmNhbGwodm0pIDogcmV0O1xufTtcblxuLyoqXG4gKiBIb29rcyBhbmQgcGFyYW0gYXR0cmlidXRlcyBhcmUgbWVyZ2VkIGFzIGFycmF5cy5cbiAqL1xuXG5zdHJhdHMuaW5pdCA9IHN0cmF0cy5jcmVhdGVkID0gc3RyYXRzLnJlYWR5ID0gc3RyYXRzLmF0dGFjaGVkID0gc3RyYXRzLmRldGFjaGVkID0gc3RyYXRzLmJlZm9yZUNvbXBpbGUgPSBzdHJhdHMuY29tcGlsZWQgPSBzdHJhdHMuYmVmb3JlRGVzdHJveSA9IHN0cmF0cy5kZXN0cm95ZWQgPSBzdHJhdHMuYWN0aXZhdGUgPSBmdW5jdGlvbiAocGFyZW50VmFsLCBjaGlsZFZhbCkge1xuICByZXR1cm4gY2hpbGRWYWwgPyBwYXJlbnRWYWwgPyBwYXJlbnRWYWwuY29uY2F0KGNoaWxkVmFsKSA6IGlzQXJyYXkoY2hpbGRWYWwpID8gY2hpbGRWYWwgOiBbY2hpbGRWYWxdIDogcGFyZW50VmFsO1xufTtcblxuLyoqXG4gKiAwLjExIGRlcHJlY2F0aW9uIHdhcm5pbmdcbiAqL1xuXG5zdHJhdHMucGFyYW1BdHRyaWJ1dGVzID0gZnVuY3Rpb24gKCkge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ1wicGFyYW1BdHRyaWJ1dGVzXCIgb3B0aW9uIGhhcyBiZWVuIGRlcHJlY2F0ZWQgaW4gMC4xMi4gJyArICdVc2UgXCJwcm9wc1wiIGluc3RlYWQuJyk7XG59O1xuXG4vKipcbiAqIEFzc2V0c1xuICpcbiAqIFdoZW4gYSB2bSBpcyBwcmVzZW50IChpbnN0YW5jZSBjcmVhdGlvbiksIHdlIG5lZWQgdG8gZG9cbiAqIGEgdGhyZWUtd2F5IG1lcmdlIGJldHdlZW4gY29uc3RydWN0b3Igb3B0aW9ucywgaW5zdGFuY2VcbiAqIG9wdGlvbnMgYW5kIHBhcmVudCBvcHRpb25zLlxuICovXG5cbmZ1bmN0aW9uIG1lcmdlQXNzZXRzKHBhcmVudFZhbCwgY2hpbGRWYWwpIHtcbiAgdmFyIHJlcyA9IE9iamVjdC5jcmVhdGUocGFyZW50VmFsKTtcbiAgcmV0dXJuIGNoaWxkVmFsID8gZXh0ZW5kKHJlcywgZ3VhcmRBcnJheUFzc2V0cyhjaGlsZFZhbCkpIDogcmVzO1xufVxuXG5jb25maWcuX2Fzc2V0VHlwZXMuZm9yRWFjaChmdW5jdGlvbiAodHlwZSkge1xuICBzdHJhdHNbdHlwZSArICdzJ10gPSBtZXJnZUFzc2V0cztcbn0pO1xuXG4vKipcbiAqIEV2ZW50cyAmIFdhdGNoZXJzLlxuICpcbiAqIEV2ZW50cyAmIHdhdGNoZXJzIGhhc2hlcyBzaG91bGQgbm90IG92ZXJ3cml0ZSBvbmVcbiAqIGFub3RoZXIsIHNvIHdlIG1lcmdlIHRoZW0gYXMgYXJyYXlzLlxuICovXG5cbnN0cmF0cy53YXRjaCA9IHN0cmF0cy5ldmVudHMgPSBmdW5jdGlvbiAocGFyZW50VmFsLCBjaGlsZFZhbCkge1xuICBpZiAoIWNoaWxkVmFsKSByZXR1cm4gcGFyZW50VmFsO1xuICBpZiAoIXBhcmVudFZhbCkgcmV0dXJuIGNoaWxkVmFsO1xuICB2YXIgcmV0ID0ge307XG4gIGV4dGVuZChyZXQsIHBhcmVudFZhbCk7XG4gIGZvciAodmFyIGtleSBpbiBjaGlsZFZhbCkge1xuICAgIHZhciBwYXJlbnQgPSByZXRba2V5XTtcbiAgICB2YXIgY2hpbGQgPSBjaGlsZFZhbFtrZXldO1xuICAgIGlmIChwYXJlbnQgJiYgIWlzQXJyYXkocGFyZW50KSkge1xuICAgICAgcGFyZW50ID0gW3BhcmVudF07XG4gICAgfVxuICAgIHJldFtrZXldID0gcGFyZW50ID8gcGFyZW50LmNvbmNhdChjaGlsZCkgOiBbY2hpbGRdO1xuICB9XG4gIHJldHVybiByZXQ7XG59O1xuXG4vKipcbiAqIE90aGVyIG9iamVjdCBoYXNoZXMuXG4gKi9cblxuc3RyYXRzLnByb3BzID0gc3RyYXRzLm1ldGhvZHMgPSBzdHJhdHMuY29tcHV0ZWQgPSBmdW5jdGlvbiAocGFyZW50VmFsLCBjaGlsZFZhbCkge1xuICBpZiAoIWNoaWxkVmFsKSByZXR1cm4gcGFyZW50VmFsO1xuICBpZiAoIXBhcmVudFZhbCkgcmV0dXJuIGNoaWxkVmFsO1xuICB2YXIgcmV0ID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgZXh0ZW5kKHJldCwgcGFyZW50VmFsKTtcbiAgZXh0ZW5kKHJldCwgY2hpbGRWYWwpO1xuICByZXR1cm4gcmV0O1xufTtcblxuLyoqXG4gKiBEZWZhdWx0IHN0cmF0ZWd5LlxuICovXG5cbnZhciBkZWZhdWx0U3RyYXQgPSBmdW5jdGlvbiBkZWZhdWx0U3RyYXQocGFyZW50VmFsLCBjaGlsZFZhbCkge1xuICByZXR1cm4gY2hpbGRWYWwgPT09IHVuZGVmaW5lZCA/IHBhcmVudFZhbCA6IGNoaWxkVmFsO1xufTtcblxuLyoqXG4gKiBNYWtlIHN1cmUgY29tcG9uZW50IG9wdGlvbnMgZ2V0IGNvbnZlcnRlZCB0byBhY3R1YWxcbiAqIGNvbnN0cnVjdG9ycy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICovXG5cbmZ1bmN0aW9uIGd1YXJkQ29tcG9uZW50cyhvcHRpb25zKSB7XG4gIGlmIChvcHRpb25zLmNvbXBvbmVudHMpIHtcbiAgICB2YXIgY29tcG9uZW50cyA9IG9wdGlvbnMuY29tcG9uZW50cyA9IGd1YXJkQXJyYXlBc3NldHMob3B0aW9ucy5jb21wb25lbnRzKTtcbiAgICB2YXIgaWRzID0gT2JqZWN0LmtleXMoY29tcG9uZW50cyk7XG4gICAgdmFyIGRlZjtcbiAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgICAgdmFyIG1hcCA9IG9wdGlvbnMuX2NvbXBvbmVudE5hbWVNYXAgPSB7fTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBpZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0gaWRzW2ldO1xuICAgICAgaWYgKGNvbW1vblRhZ1JFLnRlc3Qoa2V5KSB8fCByZXNlcnZlZFRhZ1JFLnRlc3Qoa2V5KSkge1xuICAgICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ0RvIG5vdCB1c2UgYnVpbHQtaW4gb3IgcmVzZXJ2ZWQgSFRNTCBlbGVtZW50cyBhcyBjb21wb25lbnQgJyArICdpZDogJyArIGtleSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gcmVjb3JkIGEgYWxsIGxvd2VyY2FzZSA8LT4ga2ViYWItY2FzZSBtYXBwaW5nIGZvclxuICAgICAgLy8gcG9zc2libGUgY3VzdG9tIGVsZW1lbnQgY2FzZSBlcnJvciB3YXJuaW5nXG4gICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgICAgICBtYXBba2V5LnJlcGxhY2UoLy0vZywgJycpLnRvTG93ZXJDYXNlKCldID0gaHlwaGVuYXRlKGtleSk7XG4gICAgICB9XG4gICAgICBkZWYgPSBjb21wb25lbnRzW2tleV07XG4gICAgICBpZiAoaXNQbGFpbk9iamVjdChkZWYpKSB7XG4gICAgICAgIGNvbXBvbmVudHNba2V5XSA9IFZ1ZS5leHRlbmQoZGVmKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBFbnN1cmUgYWxsIHByb3BzIG9wdGlvbiBzeW50YXggYXJlIG5vcm1hbGl6ZWQgaW50byB0aGVcbiAqIE9iamVjdC1iYXNlZCBmb3JtYXQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqL1xuXG5mdW5jdGlvbiBndWFyZFByb3BzKG9wdGlvbnMpIHtcbiAgdmFyIHByb3BzID0gb3B0aW9ucy5wcm9wcztcbiAgdmFyIGksIHZhbDtcbiAgaWYgKGlzQXJyYXkocHJvcHMpKSB7XG4gICAgb3B0aW9ucy5wcm9wcyA9IHt9O1xuICAgIGkgPSBwcm9wcy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgdmFsID0gcHJvcHNbaV07XG4gICAgICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgb3B0aW9ucy5wcm9wc1t2YWxdID0gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAodmFsLm5hbWUpIHtcbiAgICAgICAgb3B0aW9ucy5wcm9wc1t2YWwubmFtZV0gPSB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzUGxhaW5PYmplY3QocHJvcHMpKSB7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wcyk7XG4gICAgaSA9IGtleXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHZhbCA9IHByb3BzW2tleXNbaV1dO1xuICAgICAgaWYgKHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcHJvcHNba2V5c1tpXV0gPSB7IHR5cGU6IHZhbCB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEd1YXJkIGFuIEFycmF5LWZvcm1hdCBhc3NldHMgb3B0aW9uIGFuZCBjb252ZXJ0ZWQgaXRcbiAqIGludG8gdGhlIGtleS12YWx1ZSBPYmplY3QgZm9ybWF0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBhc3NldHNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuXG5mdW5jdGlvbiBndWFyZEFycmF5QXNzZXRzKGFzc2V0cykge1xuICBpZiAoaXNBcnJheShhc3NldHMpKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIHZhciBpID0gYXNzZXRzLmxlbmd0aDtcbiAgICB2YXIgYXNzZXQ7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgYXNzZXQgPSBhc3NldHNbaV07XG4gICAgICB2YXIgaWQgPSB0eXBlb2YgYXNzZXQgPT09ICdmdW5jdGlvbicgPyBhc3NldC5vcHRpb25zICYmIGFzc2V0Lm9wdGlvbnMubmFtZSB8fCBhc3NldC5pZCA6IGFzc2V0Lm5hbWUgfHwgYXNzZXQuaWQ7XG4gICAgICBpZiAoIWlkKSB7XG4gICAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgd2FybignQXJyYXktc3ludGF4IGFzc2V0cyBtdXN0IHByb3ZpZGUgYSBcIm5hbWVcIiBvciBcImlkXCIgZmllbGQuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNbaWRdID0gYXNzZXQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cbiAgcmV0dXJuIGFzc2V0cztcbn1cblxuLyoqXG4gKiBNZXJnZSB0d28gb3B0aW9uIG9iamVjdHMgaW50byBhIG5ldyBvbmUuXG4gKiBDb3JlIHV0aWxpdHkgdXNlZCBpbiBib3RoIGluc3RhbnRpYXRpb24gYW5kIGluaGVyaXRhbmNlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnRcbiAqIEBwYXJhbSB7T2JqZWN0fSBjaGlsZFxuICogQHBhcmFtIHtWdWV9IFt2bV0gLSBpZiB2bSBpcyBwcmVzZW50LCBpbmRpY2F0ZXMgdGhpcyBpc1xuICogICAgICAgICAgICAgICAgICAgICBhbiBpbnN0YW50aWF0aW9uIG1lcmdlLlxuICovXG5cbmZ1bmN0aW9uIG1lcmdlT3B0aW9ucyhwYXJlbnQsIGNoaWxkLCB2bSkge1xuICBndWFyZENvbXBvbmVudHMoY2hpbGQpO1xuICBndWFyZFByb3BzKGNoaWxkKTtcbiAgdmFyIG9wdGlvbnMgPSB7fTtcbiAgdmFyIGtleTtcbiAgaWYgKGNoaWxkLm1peGlucykge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gY2hpbGQubWl4aW5zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgcGFyZW50ID0gbWVyZ2VPcHRpb25zKHBhcmVudCwgY2hpbGQubWl4aW5zW2ldLCB2bSk7XG4gICAgfVxuICB9XG4gIGZvciAoa2V5IGluIHBhcmVudCkge1xuICAgIG1lcmdlRmllbGQoa2V5KTtcbiAgfVxuICBmb3IgKGtleSBpbiBjaGlsZCkge1xuICAgIGlmICghaGFzT3duKHBhcmVudCwga2V5KSkge1xuICAgICAgbWVyZ2VGaWVsZChrZXkpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBtZXJnZUZpZWxkKGtleSkge1xuICAgIHZhciBzdHJhdCA9IHN0cmF0c1trZXldIHx8IGRlZmF1bHRTdHJhdDtcbiAgICBvcHRpb25zW2tleV0gPSBzdHJhdChwYXJlbnRba2V5XSwgY2hpbGRba2V5XSwgdm0sIGtleSk7XG4gIH1cbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhbiBhc3NldC5cbiAqIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCBiZWNhdXNlIGNoaWxkIGluc3RhbmNlcyBuZWVkIGFjY2Vzc1xuICogdG8gYXNzZXRzIGRlZmluZWQgaW4gaXRzIGFuY2VzdG9yIGNoYWluLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICogQHBhcmFtIHtTdHJpbmd9IGlkXG4gKiBAcmV0dXJuIHtPYmplY3R8RnVuY3Rpb259XG4gKi9cblxuZnVuY3Rpb24gcmVzb2x2ZUFzc2V0KG9wdGlvbnMsIHR5cGUsIGlkKSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICBpZiAodHlwZW9mIGlkICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgYXNzZXRzID0gb3B0aW9uc1t0eXBlXTtcbiAgdmFyIGNhbWVsaXplZElkO1xuICByZXR1cm4gYXNzZXRzW2lkXSB8fFxuICAvLyBjYW1lbENhc2UgSURcbiAgYXNzZXRzW2NhbWVsaXplZElkID0gY2FtZWxpemUoaWQpXSB8fFxuICAvLyBQYXNjYWwgQ2FzZSBJRFxuICBhc3NldHNbY2FtZWxpemVkSWQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjYW1lbGl6ZWRJZC5zbGljZSgxKV07XG59XG5cbi8qKlxuICogQXNzZXJ0IGFzc2V0IGV4aXN0c1xuICovXG5cbmZ1bmN0aW9uIGFzc2VydEFzc2V0KHZhbCwgdHlwZSwgaWQpIHtcbiAgaWYgKCF2YWwpIHtcbiAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ0ZhaWxlZCB0byByZXNvbHZlICcgKyB0eXBlICsgJzogJyArIGlkKTtcbiAgfVxufVxuXG5cblxudmFyIHV0aWwgPSBPYmplY3QuZnJlZXplKHtcblx0ZGVmaW5lUmVhY3RpdmU6IGRlZmluZVJlYWN0aXZlLFxuXHRzZXQ6IHNldCxcblx0ZGVsOiBkZWwsXG5cdGhhc093bjogaGFzT3duLFxuXHRpc0xpdGVyYWw6IGlzTGl0ZXJhbCxcblx0aXNSZXNlcnZlZDogaXNSZXNlcnZlZCxcblx0X3RvU3RyaW5nOiBfdG9TdHJpbmcsXG5cdHRvTnVtYmVyOiB0b051bWJlcixcblx0dG9Cb29sZWFuOiB0b0Jvb2xlYW4sXG5cdHN0cmlwUXVvdGVzOiBzdHJpcFF1b3Rlcyxcblx0Y2FtZWxpemU6IGNhbWVsaXplLFxuXHRoeXBoZW5hdGU6IGh5cGhlbmF0ZSxcblx0Y2xhc3NpZnk6IGNsYXNzaWZ5LFxuXHRiaW5kOiBiaW5kLFxuXHR0b0FycmF5OiB0b0FycmF5LFxuXHRleHRlbmQ6IGV4dGVuZCxcblx0aXNPYmplY3Q6IGlzT2JqZWN0LFxuXHRpc1BsYWluT2JqZWN0OiBpc1BsYWluT2JqZWN0LFxuXHRkZWY6IGRlZixcblx0ZGVib3VuY2U6IF9kZWJvdW5jZSxcblx0aW5kZXhPZjogaW5kZXhPZixcblx0Y2FuY2VsbGFibGU6IGNhbmNlbGxhYmxlLFxuXHRsb29zZUVxdWFsOiBsb29zZUVxdWFsLFxuXHRpc0FycmF5OiBpc0FycmF5LFxuXHRoYXNQcm90bzogaGFzUHJvdG8sXG5cdGluQnJvd3NlcjogaW5Ccm93c2VyLFxuXHRkZXZ0b29sczogZGV2dG9vbHMsXG5cdGlzSUU5OiBpc0lFOSxcblx0aXNBbmRyb2lkOiBpc0FuZHJvaWQsXG5cdGdldCB0cmFuc2l0aW9uUHJvcCAoKSB7IHJldHVybiB0cmFuc2l0aW9uUHJvcDsgfSxcblx0Z2V0IHRyYW5zaXRpb25FbmRFdmVudCAoKSB7IHJldHVybiB0cmFuc2l0aW9uRW5kRXZlbnQ7IH0sXG5cdGdldCBhbmltYXRpb25Qcm9wICgpIHsgcmV0dXJuIGFuaW1hdGlvblByb3A7IH0sXG5cdGdldCBhbmltYXRpb25FbmRFdmVudCAoKSB7IHJldHVybiBhbmltYXRpb25FbmRFdmVudDsgfSxcblx0bmV4dFRpY2s6IG5leHRUaWNrLFxuXHRxdWVyeTogcXVlcnksXG5cdGluRG9jOiBpbkRvYyxcblx0Z2V0QXR0cjogZ2V0QXR0cixcblx0Z2V0QmluZEF0dHI6IGdldEJpbmRBdHRyLFxuXHRoYXNCaW5kQXR0cjogaGFzQmluZEF0dHIsXG5cdGJlZm9yZTogYmVmb3JlLFxuXHRhZnRlcjogYWZ0ZXIsXG5cdHJlbW92ZTogcmVtb3ZlLFxuXHRwcmVwZW5kOiBwcmVwZW5kLFxuXHRyZXBsYWNlOiByZXBsYWNlLFxuXHRvbjogb24sXG5cdG9mZjogb2ZmLFxuXHRzZXRDbGFzczogc2V0Q2xhc3MsXG5cdGFkZENsYXNzOiBhZGRDbGFzcyxcblx0cmVtb3ZlQ2xhc3M6IHJlbW92ZUNsYXNzLFxuXHRleHRyYWN0Q29udGVudDogZXh0cmFjdENvbnRlbnQsXG5cdHRyaW1Ob2RlOiB0cmltTm9kZSxcblx0aXNUZW1wbGF0ZTogaXNUZW1wbGF0ZSxcblx0Y3JlYXRlQW5jaG9yOiBjcmVhdGVBbmNob3IsXG5cdGZpbmRSZWY6IGZpbmRSZWYsXG5cdG1hcE5vZGVSYW5nZTogbWFwTm9kZVJhbmdlLFxuXHRyZW1vdmVOb2RlUmFuZ2U6IHJlbW92ZU5vZGVSYW5nZSxcblx0aXNGcmFnbWVudDogaXNGcmFnbWVudCxcblx0Z2V0T3V0ZXJIVE1MOiBnZXRPdXRlckhUTUwsXG5cdG1lcmdlT3B0aW9uczogbWVyZ2VPcHRpb25zLFxuXHRyZXNvbHZlQXNzZXQ6IHJlc29sdmVBc3NldCxcblx0YXNzZXJ0QXNzZXQ6IGFzc2VydEFzc2V0LFxuXHRjaGVja0NvbXBvbmVudEF0dHI6IGNoZWNrQ29tcG9uZW50QXR0cixcblx0aW5pdFByb3A6IGluaXRQcm9wLFxuXHRhc3NlcnRQcm9wOiBhc3NlcnRQcm9wLFxuXHRjb2VyY2VQcm9wOiBjb2VyY2VQcm9wLFxuXHRjb21tb25UYWdSRTogY29tbW9uVGFnUkUsXG5cdHJlc2VydmVkVGFnUkU6IHJlc2VydmVkVGFnUkUsXG5cdGdldCB3YXJuICgpIHsgcmV0dXJuIHdhcm47IH1cbn0pO1xuXG52YXIgdWlkID0gMDtcblxuZnVuY3Rpb24gaW5pdE1peGluIChWdWUpIHtcbiAgLyoqXG4gICAqIFRoZSBtYWluIGluaXQgc2VxdWVuY2UuIFRoaXMgaXMgY2FsbGVkIGZvciBldmVyeVxuICAgKiBpbnN0YW5jZSwgaW5jbHVkaW5nIG9uZXMgdGhhdCBhcmUgY3JlYXRlZCBmcm9tIGV4dGVuZGVkXG4gICAqIGNvbnN0cnVjdG9ycy5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSB0aGlzIG9wdGlvbnMgb2JqZWN0IHNob3VsZCBiZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSByZXN1bHQgb2YgbWVyZ2luZyBjbGFzc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgYW5kIHRoZSBvcHRpb25zIHBhc3NlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIGluIHRvIHRoZSBjb25zdHJ1Y3Rvci5cbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICB0aGlzLiRlbCA9IG51bGw7XG4gICAgdGhpcy4kcGFyZW50ID0gb3B0aW9ucy5wYXJlbnQ7XG4gICAgdGhpcy4kcm9vdCA9IHRoaXMuJHBhcmVudCA/IHRoaXMuJHBhcmVudC4kcm9vdCA6IHRoaXM7XG4gICAgdGhpcy4kY2hpbGRyZW4gPSBbXTtcbiAgICB0aGlzLiRyZWZzID0ge307IC8vIGNoaWxkIHZtIHJlZmVyZW5jZXNcbiAgICB0aGlzLiRlbHMgPSB7fTsgLy8gZWxlbWVudCByZWZlcmVuY2VzXG4gICAgdGhpcy5fd2F0Y2hlcnMgPSBbXTsgLy8gYWxsIHdhdGNoZXJzIGFzIGFuIGFycmF5XG4gICAgdGhpcy5fZGlyZWN0aXZlcyA9IFtdOyAvLyBhbGwgZGlyZWN0aXZlc1xuXG4gICAgLy8gYSB1aWRcbiAgICB0aGlzLl91aWQgPSB1aWQrKztcblxuICAgIC8vIGEgZmxhZyB0byBhdm9pZCB0aGlzIGJlaW5nIG9ic2VydmVkXG4gICAgdGhpcy5faXNWdWUgPSB0cnVlO1xuXG4gICAgLy8gZXZlbnRzIGJvb2trZWVwaW5nXG4gICAgdGhpcy5fZXZlbnRzID0ge307IC8vIHJlZ2lzdGVyZWQgY2FsbGJhY2tzXG4gICAgdGhpcy5fZXZlbnRzQ291bnQgPSB7fTsgLy8gZm9yICRicm9hZGNhc3Qgb3B0aW1pemF0aW9uXG5cbiAgICAvLyBmcmFnbWVudCBpbnN0YW5jZSBwcm9wZXJ0aWVzXG4gICAgdGhpcy5faXNGcmFnbWVudCA9IGZhbHNlO1xuICAgIHRoaXMuX2ZyYWdtZW50ID0gLy8gQHR5cGUge0RvY3VtZW50RnJhZ21lbnR9XG4gICAgdGhpcy5fZnJhZ21lbnRTdGFydCA9IC8vIEB0eXBlIHtUZXh0fENvbW1lbnR9XG4gICAgdGhpcy5fZnJhZ21lbnRFbmQgPSBudWxsOyAvLyBAdHlwZSB7VGV4dHxDb21tZW50fVxuXG4gICAgLy8gbGlmZWN5Y2xlIHN0YXRlXG4gICAgdGhpcy5faXNDb21waWxlZCA9IHRoaXMuX2lzRGVzdHJveWVkID0gdGhpcy5faXNSZWFkeSA9IHRoaXMuX2lzQXR0YWNoZWQgPSB0aGlzLl9pc0JlaW5nRGVzdHJveWVkID0gdGhpcy5fdkZvclJlbW92aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fdW5saW5rRm4gPSBudWxsO1xuXG4gICAgLy8gY29udGV4dDpcbiAgICAvLyBpZiB0aGlzIGlzIGEgdHJhbnNjbHVkZWQgY29tcG9uZW50LCBjb250ZXh0XG4gICAgLy8gd2lsbCBiZSB0aGUgY29tbW9uIHBhcmVudCB2bSBvZiB0aGlzIGluc3RhbmNlXG4gICAgLy8gYW5kIGl0cyBob3N0LlxuICAgIHRoaXMuX2NvbnRleHQgPSBvcHRpb25zLl9jb250ZXh0IHx8IHRoaXMuJHBhcmVudDtcblxuICAgIC8vIHNjb3BlOlxuICAgIC8vIGlmIHRoaXMgaXMgaW5zaWRlIGFuIGlubGluZSB2LWZvciwgdGhlIHNjb3BlXG4gICAgLy8gd2lsbCBiZSB0aGUgaW50ZXJtZWRpYXRlIHNjb3BlIGNyZWF0ZWQgZm9yIHRoaXNcbiAgICAvLyByZXBlYXQgZnJhZ21lbnQuIHRoaXMgaXMgdXNlZCBmb3IgbGlua2luZyBwcm9wc1xuICAgIC8vIGFuZCBjb250YWluZXIgZGlyZWN0aXZlcy5cbiAgICB0aGlzLl9zY29wZSA9IG9wdGlvbnMuX3Njb3BlO1xuXG4gICAgLy8gZnJhZ21lbnQ6XG4gICAgLy8gaWYgdGhpcyBpbnN0YW5jZSBpcyBjb21waWxlZCBpbnNpZGUgYSBGcmFnbWVudCwgaXRcbiAgICAvLyBuZWVkcyB0byByZWlnc3RlciBpdHNlbGYgYXMgYSBjaGlsZCBvZiB0aGF0IGZyYWdtZW50XG4gICAgLy8gZm9yIGF0dGFjaC9kZXRhY2ggdG8gd29yayBwcm9wZXJseS5cbiAgICB0aGlzLl9mcmFnID0gb3B0aW9ucy5fZnJhZztcbiAgICBpZiAodGhpcy5fZnJhZykge1xuICAgICAgdGhpcy5fZnJhZy5jaGlsZHJlbi5wdXNoKHRoaXMpO1xuICAgIH1cblxuICAgIC8vIHB1c2ggc2VsZiBpbnRvIHBhcmVudCAvIHRyYW5zY2x1c2lvbiBob3N0XG4gICAgaWYgKHRoaXMuJHBhcmVudCkge1xuICAgICAgdGhpcy4kcGFyZW50LiRjaGlsZHJlbi5wdXNoKHRoaXMpO1xuICAgIH1cblxuICAgIC8vIG1lcmdlIG9wdGlvbnMuXG4gICAgb3B0aW9ucyA9IHRoaXMuJG9wdGlvbnMgPSBtZXJnZU9wdGlvbnModGhpcy5jb25zdHJ1Y3Rvci5vcHRpb25zLCBvcHRpb25zLCB0aGlzKTtcblxuICAgIC8vIHNldCByZWZcbiAgICB0aGlzLl91cGRhdGVSZWYoKTtcblxuICAgIC8vIGluaXRpYWxpemUgZGF0YSBhcyBlbXB0eSBvYmplY3QuXG4gICAgLy8gaXQgd2lsbCBiZSBmaWxsZWQgdXAgaW4gX2luaXRTY29wZSgpLlxuICAgIHRoaXMuX2RhdGEgPSB7fTtcblxuICAgIC8vIHNhdmUgcmF3IGNvbnN0cnVjdG9yIGRhdGEgYmVmb3JlIG1lcmdlXG4gICAgLy8gc28gdGhhdCB3ZSBrbm93IHdoaWNoIHByb3BlcnRpZXMgYXJlIHByb3ZpZGVkIGF0XG4gICAgLy8gaW5zdGFudGlhdGlvbi5cbiAgICB0aGlzLl9ydW50aW1lRGF0YSA9IG9wdGlvbnMuZGF0YTtcblxuICAgIC8vIGNhbGwgaW5pdCBob29rXG4gICAgdGhpcy5fY2FsbEhvb2soJ2luaXQnKTtcblxuICAgIC8vIGluaXRpYWxpemUgZGF0YSBvYnNlcnZhdGlvbiBhbmQgc2NvcGUgaW5oZXJpdGFuY2UuXG4gICAgdGhpcy5faW5pdFN0YXRlKCk7XG5cbiAgICAvLyBzZXR1cCBldmVudCBzeXN0ZW0gYW5kIG9wdGlvbiBldmVudHMuXG4gICAgdGhpcy5faW5pdEV2ZW50cygpO1xuXG4gICAgLy8gY2FsbCBjcmVhdGVkIGhvb2tcbiAgICB0aGlzLl9jYWxsSG9vaygnY3JlYXRlZCcpO1xuXG4gICAgLy8gaWYgYGVsYCBvcHRpb24gaXMgcGFzc2VkLCBzdGFydCBjb21waWxhdGlvbi5cbiAgICBpZiAob3B0aW9ucy5lbCkge1xuICAgICAgdGhpcy4kbW91bnQob3B0aW9ucy5lbCk7XG4gICAgfVxuICB9O1xufVxuXG52YXIgcGF0aENhY2hlID0gbmV3IENhY2hlKDEwMDApO1xuXG4vLyBhY3Rpb25zXG52YXIgQVBQRU5EID0gMDtcbnZhciBQVVNIID0gMTtcbnZhciBJTkNfU1VCX1BBVEhfREVQVEggPSAyO1xudmFyIFBVU0hfU1VCX1BBVEggPSAzO1xuXG4vLyBzdGF0ZXNcbnZhciBCRUZPUkVfUEFUSCA9IDA7XG52YXIgSU5fUEFUSCA9IDE7XG52YXIgQkVGT1JFX0lERU5UID0gMjtcbnZhciBJTl9JREVOVCA9IDM7XG52YXIgSU5fU1VCX1BBVEggPSA0O1xudmFyIElOX1NJTkdMRV9RVU9URSA9IDU7XG52YXIgSU5fRE9VQkxFX1FVT1RFID0gNjtcbnZhciBBRlRFUl9QQVRIID0gNztcbnZhciBFUlJPUiA9IDg7XG5cbnZhciBwYXRoU3RhdGVNYWNoaW5lID0gW107XG5cbnBhdGhTdGF0ZU1hY2hpbmVbQkVGT1JFX1BBVEhdID0ge1xuICAnd3MnOiBbQkVGT1JFX1BBVEhdLFxuICAnaWRlbnQnOiBbSU5fSURFTlQsIEFQUEVORF0sXG4gICdbJzogW0lOX1NVQl9QQVRIXSxcbiAgJ2VvZic6IFtBRlRFUl9QQVRIXVxufTtcblxucGF0aFN0YXRlTWFjaGluZVtJTl9QQVRIXSA9IHtcbiAgJ3dzJzogW0lOX1BBVEhdLFxuICAnLic6IFtCRUZPUkVfSURFTlRdLFxuICAnWyc6IFtJTl9TVUJfUEFUSF0sXG4gICdlb2YnOiBbQUZURVJfUEFUSF1cbn07XG5cbnBhdGhTdGF0ZU1hY2hpbmVbQkVGT1JFX0lERU5UXSA9IHtcbiAgJ3dzJzogW0JFRk9SRV9JREVOVF0sXG4gICdpZGVudCc6IFtJTl9JREVOVCwgQVBQRU5EXVxufTtcblxucGF0aFN0YXRlTWFjaGluZVtJTl9JREVOVF0gPSB7XG4gICdpZGVudCc6IFtJTl9JREVOVCwgQVBQRU5EXSxcbiAgJzAnOiBbSU5fSURFTlQsIEFQUEVORF0sXG4gICdudW1iZXInOiBbSU5fSURFTlQsIEFQUEVORF0sXG4gICd3cyc6IFtJTl9QQVRILCBQVVNIXSxcbiAgJy4nOiBbQkVGT1JFX0lERU5ULCBQVVNIXSxcbiAgJ1snOiBbSU5fU1VCX1BBVEgsIFBVU0hdLFxuICAnZW9mJzogW0FGVEVSX1BBVEgsIFBVU0hdXG59O1xuXG5wYXRoU3RhdGVNYWNoaW5lW0lOX1NVQl9QQVRIXSA9IHtcbiAgXCInXCI6IFtJTl9TSU5HTEVfUVVPVEUsIEFQUEVORF0sXG4gICdcIic6IFtJTl9ET1VCTEVfUVVPVEUsIEFQUEVORF0sXG4gICdbJzogW0lOX1NVQl9QQVRILCBJTkNfU1VCX1BBVEhfREVQVEhdLFxuICAnXSc6IFtJTl9QQVRILCBQVVNIX1NVQl9QQVRIXSxcbiAgJ2VvZic6IEVSUk9SLFxuICAnZWxzZSc6IFtJTl9TVUJfUEFUSCwgQVBQRU5EXVxufTtcblxucGF0aFN0YXRlTWFjaGluZVtJTl9TSU5HTEVfUVVPVEVdID0ge1xuICBcIidcIjogW0lOX1NVQl9QQVRILCBBUFBFTkRdLFxuICAnZW9mJzogRVJST1IsXG4gICdlbHNlJzogW0lOX1NJTkdMRV9RVU9URSwgQVBQRU5EXVxufTtcblxucGF0aFN0YXRlTWFjaGluZVtJTl9ET1VCTEVfUVVPVEVdID0ge1xuICAnXCInOiBbSU5fU1VCX1BBVEgsIEFQUEVORF0sXG4gICdlb2YnOiBFUlJPUixcbiAgJ2Vsc2UnOiBbSU5fRE9VQkxFX1FVT1RFLCBBUFBFTkRdXG59O1xuXG4vKipcbiAqIERldGVybWluZSB0aGUgdHlwZSBvZiBhIGNoYXJhY3RlciBpbiBhIGtleXBhdGguXG4gKlxuICogQHBhcmFtIHtDaGFyfSBjaFxuICogQHJldHVybiB7U3RyaW5nfSB0eXBlXG4gKi9cblxuZnVuY3Rpb24gZ2V0UGF0aENoYXJUeXBlKGNoKSB7XG4gIGlmIChjaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuICdlb2YnO1xuICB9XG5cbiAgdmFyIGNvZGUgPSBjaC5jaGFyQ29kZUF0KDApO1xuXG4gIHN3aXRjaCAoY29kZSkge1xuICAgIGNhc2UgMHg1QjogLy8gW1xuICAgIGNhc2UgMHg1RDogLy8gXVxuICAgIGNhc2UgMHgyRTogLy8gLlxuICAgIGNhc2UgMHgyMjogLy8gXCJcbiAgICBjYXNlIDB4Mjc6IC8vICdcbiAgICBjYXNlIDB4MzA6XG4gICAgICAvLyAwXG4gICAgICByZXR1cm4gY2g7XG5cbiAgICBjYXNlIDB4NUY6IC8vIF9cbiAgICBjYXNlIDB4MjQ6XG4gICAgICAvLyAkXG4gICAgICByZXR1cm4gJ2lkZW50JztcblxuICAgIGNhc2UgMHgyMDogLy8gU3BhY2VcbiAgICBjYXNlIDB4MDk6IC8vIFRhYlxuICAgIGNhc2UgMHgwQTogLy8gTmV3bGluZVxuICAgIGNhc2UgMHgwRDogLy8gUmV0dXJuXG4gICAgY2FzZSAweEEwOiAvLyBOby1icmVhayBzcGFjZVxuICAgIGNhc2UgMHhGRUZGOiAvLyBCeXRlIE9yZGVyIE1hcmtcbiAgICBjYXNlIDB4MjAyODogLy8gTGluZSBTZXBhcmF0b3JcbiAgICBjYXNlIDB4MjAyOTpcbiAgICAgIC8vIFBhcmFncmFwaCBTZXBhcmF0b3JcbiAgICAgIHJldHVybiAnd3MnO1xuICB9XG5cbiAgLy8gYS16LCBBLVpcbiAgaWYgKGNvZGUgPj0gMHg2MSAmJiBjb2RlIDw9IDB4N0EgfHwgY29kZSA+PSAweDQxICYmIGNvZGUgPD0gMHg1QSkge1xuICAgIHJldHVybiAnaWRlbnQnO1xuICB9XG5cbiAgLy8gMS05XG4gIGlmIChjb2RlID49IDB4MzEgJiYgY29kZSA8PSAweDM5KSB7XG4gICAgcmV0dXJuICdudW1iZXInO1xuICB9XG5cbiAgcmV0dXJuICdlbHNlJztcbn1cblxuLyoqXG4gKiBGb3JtYXQgYSBzdWJQYXRoLCByZXR1cm4gaXRzIHBsYWluIGZvcm0gaWYgaXQgaXNcbiAqIGEgbGl0ZXJhbCBzdHJpbmcgb3IgbnVtYmVyLiBPdGhlcndpc2UgcHJlcGVuZCB0aGVcbiAqIGR5bmFtaWMgaW5kaWNhdG9yICgqKS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIGZvcm1hdFN1YlBhdGgocGF0aCkge1xuICB2YXIgdHJpbW1lZCA9IHBhdGgudHJpbSgpO1xuICAvLyBpbnZhbGlkIGxlYWRpbmcgMFxuICBpZiAocGF0aC5jaGFyQXQoMCkgPT09ICcwJyAmJiBpc05hTihwYXRoKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gaXNMaXRlcmFsKHRyaW1tZWQpID8gc3RyaXBRdW90ZXModHJpbW1lZCkgOiAnKicgKyB0cmltbWVkO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgc3RyaW5nIHBhdGggaW50byBhbiBhcnJheSBvZiBzZWdtZW50c1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtBcnJheXx1bmRlZmluZWR9XG4gKi9cblxuZnVuY3Rpb24gcGFyc2UocGF0aCkge1xuICB2YXIga2V5cyA9IFtdO1xuICB2YXIgaW5kZXggPSAtMTtcbiAgdmFyIG1vZGUgPSBCRUZPUkVfUEFUSDtcbiAgdmFyIHN1YlBhdGhEZXB0aCA9IDA7XG4gIHZhciBjLCBuZXdDaGFyLCBrZXksIHR5cGUsIHRyYW5zaXRpb24sIGFjdGlvbiwgdHlwZU1hcDtcblxuICB2YXIgYWN0aW9ucyA9IFtdO1xuXG4gIGFjdGlvbnNbUFVTSF0gPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICAgIGtleSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH07XG5cbiAgYWN0aW9uc1tBUFBFTkRdID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCkge1xuICAgICAga2V5ID0gbmV3Q2hhcjtcbiAgICB9IGVsc2Uge1xuICAgICAga2V5ICs9IG5ld0NoYXI7XG4gICAgfVxuICB9O1xuXG4gIGFjdGlvbnNbSU5DX1NVQl9QQVRIX0RFUFRIXSA9IGZ1bmN0aW9uICgpIHtcbiAgICBhY3Rpb25zW0FQUEVORF0oKTtcbiAgICBzdWJQYXRoRGVwdGgrKztcbiAgfTtcblxuICBhY3Rpb25zW1BVU0hfU1VCX1BBVEhdID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChzdWJQYXRoRGVwdGggPiAwKSB7XG4gICAgICBzdWJQYXRoRGVwdGgtLTtcbiAgICAgIG1vZGUgPSBJTl9TVUJfUEFUSDtcbiAgICAgIGFjdGlvbnNbQVBQRU5EXSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWJQYXRoRGVwdGggPSAwO1xuICAgICAga2V5ID0gZm9ybWF0U3ViUGF0aChrZXkpO1xuICAgICAgaWYgKGtleSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWN0aW9uc1tQVVNIXSgpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBtYXliZVVuZXNjYXBlUXVvdGUoKSB7XG4gICAgdmFyIG5leHRDaGFyID0gcGF0aFtpbmRleCArIDFdO1xuICAgIGlmIChtb2RlID09PSBJTl9TSU5HTEVfUVVPVEUgJiYgbmV4dENoYXIgPT09IFwiJ1wiIHx8IG1vZGUgPT09IElOX0RPVUJMRV9RVU9URSAmJiBuZXh0Q2hhciA9PT0gJ1wiJykge1xuICAgICAgaW5kZXgrKztcbiAgICAgIG5ld0NoYXIgPSAnXFxcXCcgKyBuZXh0Q2hhcjtcbiAgICAgIGFjdGlvbnNbQVBQRU5EXSgpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgd2hpbGUgKG1vZGUgIT0gbnVsbCkge1xuICAgIGluZGV4Kys7XG4gICAgYyA9IHBhdGhbaW5kZXhdO1xuXG4gICAgaWYgKGMgPT09ICdcXFxcJyAmJiBtYXliZVVuZXNjYXBlUXVvdGUoKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgdHlwZSA9IGdldFBhdGhDaGFyVHlwZShjKTtcbiAgICB0eXBlTWFwID0gcGF0aFN0YXRlTWFjaGluZVttb2RlXTtcbiAgICB0cmFuc2l0aW9uID0gdHlwZU1hcFt0eXBlXSB8fCB0eXBlTWFwWydlbHNlJ10gfHwgRVJST1I7XG5cbiAgICBpZiAodHJhbnNpdGlvbiA9PT0gRVJST1IpIHtcbiAgICAgIHJldHVybjsgLy8gcGFyc2UgZXJyb3JcbiAgICB9XG5cbiAgICBtb2RlID0gdHJhbnNpdGlvblswXTtcbiAgICBhY3Rpb24gPSBhY3Rpb25zW3RyYW5zaXRpb25bMV1dO1xuICAgIGlmIChhY3Rpb24pIHtcbiAgICAgIG5ld0NoYXIgPSB0cmFuc2l0aW9uWzJdO1xuICAgICAgbmV3Q2hhciA9IG5ld0NoYXIgPT09IHVuZGVmaW5lZCA/IGMgOiBuZXdDaGFyO1xuICAgICAgaWYgKGFjdGlvbigpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1vZGUgPT09IEFGVEVSX1BBVEgpIHtcbiAgICAgIGtleXMucmF3ID0gcGF0aDtcbiAgICAgIHJldHVybiBrZXlzO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEV4dGVybmFsIHBhcnNlIHRoYXQgY2hlY2sgZm9yIGEgY2FjaGUgaGl0IGZpcnN0XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAqIEByZXR1cm4ge0FycmF5fHVuZGVmaW5lZH1cbiAqL1xuXG5mdW5jdGlvbiBwYXJzZVBhdGgocGF0aCkge1xuICB2YXIgaGl0ID0gcGF0aENhY2hlLmdldChwYXRoKTtcbiAgaWYgKCFoaXQpIHtcbiAgICBoaXQgPSBwYXJzZShwYXRoKTtcbiAgICBpZiAoaGl0KSB7XG4gICAgICBwYXRoQ2FjaGUucHV0KHBhdGgsIGhpdCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBoaXQ7XG59XG5cbi8qKlxuICogR2V0IGZyb20gYW4gb2JqZWN0IGZyb20gYSBwYXRoIHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKi9cblxuZnVuY3Rpb24gZ2V0UGF0aChvYmosIHBhdGgpIHtcbiAgcmV0dXJuIHBhcnNlRXhwcmVzc2lvbihwYXRoKS5nZXQob2JqKTtcbn1cblxuLyoqXG4gKiBXYXJuIGFnYWluc3Qgc2V0dGluZyBub24tZXhpc3RlbnQgcm9vdCBwYXRoIG9uIGEgdm0uXG4gKi9cblxudmFyIHdhcm5Ob25FeGlzdGVudDtcbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gIHdhcm5Ob25FeGlzdGVudCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgd2FybignWW91IGFyZSBzZXR0aW5nIGEgbm9uLWV4aXN0ZW50IHBhdGggXCInICsgcGF0aC5yYXcgKyAnXCIgJyArICdvbiBhIHZtIGluc3RhbmNlLiBDb25zaWRlciBwcmUtaW5pdGlhbGl6aW5nIHRoZSBwcm9wZXJ0eSAnICsgJ3dpdGggdGhlIFwiZGF0YVwiIG9wdGlvbiBmb3IgbW9yZSByZWxpYWJsZSByZWFjdGl2aXR5ICcgKyAnYW5kIGJldHRlciBwZXJmb3JtYW5jZS4nKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBTZXQgb24gYW4gb2JqZWN0IGZyb20gYSBwYXRoXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtTdHJpbmcgfCBBcnJheX0gcGF0aFxuICogQHBhcmFtIHsqfSB2YWxcbiAqL1xuXG5mdW5jdGlvbiBzZXRQYXRoKG9iaiwgcGF0aCwgdmFsKSB7XG4gIHZhciBvcmlnaW5hbCA9IG9iajtcbiAgaWYgKHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJykge1xuICAgIHBhdGggPSBwYXJzZShwYXRoKTtcbiAgfVxuICBpZiAoIXBhdGggfHwgIWlzT2JqZWN0KG9iaikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgdmFyIGxhc3QsIGtleTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBwYXRoLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGxhc3QgPSBvYmo7XG4gICAga2V5ID0gcGF0aFtpXTtcbiAgICBpZiAoa2V5LmNoYXJBdCgwKSA9PT0gJyonKSB7XG4gICAgICBrZXkgPSBwYXJzZUV4cHJlc3Npb24oa2V5LnNsaWNlKDEpKS5nZXQuY2FsbChvcmlnaW5hbCwgb3JpZ2luYWwpO1xuICAgIH1cbiAgICBpZiAoaSA8IGwgLSAxKSB7XG4gICAgICBvYmogPSBvYmpba2V5XTtcbiAgICAgIGlmICghaXNPYmplY3Qob2JqKSkge1xuICAgICAgICBvYmogPSB7fTtcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgbGFzdC5faXNWdWUpIHtcbiAgICAgICAgICB3YXJuTm9uRXhpc3RlbnQocGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgc2V0KGxhc3QsIGtleSwgb2JqKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICBvYmouJHNldChrZXksIHZhbCk7XG4gICAgICB9IGVsc2UgaWYgKGtleSBpbiBvYmopIHtcbiAgICAgICAgb2JqW2tleV0gPSB2YWw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiBvYmouX2lzVnVlKSB7XG4gICAgICAgICAgd2Fybk5vbkV4aXN0ZW50KHBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHNldChvYmosIGtleSwgdmFsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBwYXRoID0gT2JqZWN0LmZyZWV6ZSh7XG4gIHBhcnNlUGF0aDogcGFyc2VQYXRoLFxuICBnZXRQYXRoOiBnZXRQYXRoLFxuICBzZXRQYXRoOiBzZXRQYXRoXG59KTtcblxudmFyIGV4cHJlc3Npb25DYWNoZSA9IG5ldyBDYWNoZSgxMDAwKTtcblxudmFyIGFsbG93ZWRLZXl3b3JkcyA9ICdNYXRoLERhdGUsdGhpcyx0cnVlLGZhbHNlLG51bGwsdW5kZWZpbmVkLEluZmluaXR5LE5hTiwnICsgJ2lzTmFOLGlzRmluaXRlLGRlY29kZVVSSSxkZWNvZGVVUklDb21wb25lbnQsZW5jb2RlVVJJLCcgKyAnZW5jb2RlVVJJQ29tcG9uZW50LHBhcnNlSW50LHBhcnNlRmxvYXQnO1xudmFyIGFsbG93ZWRLZXl3b3Jkc1JFID0gbmV3IFJlZ0V4cCgnXignICsgYWxsb3dlZEtleXdvcmRzLnJlcGxhY2UoLywvZywgJ1xcXFxifCcpICsgJ1xcXFxiKScpO1xuXG4vLyBrZXl3b3JkcyB0aGF0IGRvbid0IG1ha2Ugc2Vuc2UgaW5zaWRlIGV4cHJlc3Npb25zXG52YXIgaW1wcm9wZXJLZXl3b3JkcyA9ICdicmVhayxjYXNlLGNsYXNzLGNhdGNoLGNvbnN0LGNvbnRpbnVlLGRlYnVnZ2VyLGRlZmF1bHQsJyArICdkZWxldGUsZG8sZWxzZSxleHBvcnQsZXh0ZW5kcyxmaW5hbGx5LGZvcixmdW5jdGlvbixpZiwnICsgJ2ltcG9ydCxpbixpbnN0YW5jZW9mLGxldCxyZXR1cm4sc3VwZXIsc3dpdGNoLHRocm93LHRyeSwnICsgJ3Zhcix3aGlsZSx3aXRoLHlpZWxkLGVudW0sYXdhaXQsaW1wbGVtZW50cyxwYWNrYWdlLCcgKyAncHJvdGVjdGVkLHN0YXRpYyxpbnRlcmZhY2UscHJpdmF0ZSxwdWJsaWMnO1xudmFyIGltcHJvcGVyS2V5d29yZHNSRSA9IG5ldyBSZWdFeHAoJ14oJyArIGltcHJvcGVyS2V5d29yZHMucmVwbGFjZSgvLC9nLCAnXFxcXGJ8JykgKyAnXFxcXGIpJyk7XG5cbnZhciB3c1JFID0gL1xccy9nO1xudmFyIG5ld2xpbmVSRSA9IC9cXG4vZztcbnZhciBzYXZlUkUgPSAvW1xceyxdXFxzKltcXHdcXCRfXStcXHMqOnwoJyg/OlteJ1xcXFxdfFxcXFwuKSonfFwiKD86W15cIlxcXFxdfFxcXFwuKSpcInxgKD86W15gXFxcXF18XFxcXC4pKlxcJFxce3xcXH0oPzpbXmBcXFxcXXxcXFxcLikqYHxgKD86W15gXFxcXF18XFxcXC4pKmApfG5ldyB8dHlwZW9mIHx2b2lkIC9nO1xudmFyIHJlc3RvcmVSRSA9IC9cIihcXGQrKVwiL2c7XG52YXIgcGF0aFRlc3RSRSA9IC9eW0EtWmEtel8kXVtcXHckXSooPzpcXC5bQS1aYS16XyRdW1xcdyRdKnxcXFsnLio/J1xcXXxcXFtcIi4qP1wiXFxdfFxcW1xcZCtcXF18XFxbW0EtWmEtel8kXVtcXHckXSpcXF0pKiQvO1xudmFyIGlkZW50UkUgPSAvW15cXHckXFwuXSg/OltBLVphLXpfJF1bXFx3JF0qKS9nO1xudmFyIGJvb2xlYW5MaXRlcmFsUkUgPSAvXig/OnRydWV8ZmFsc2UpJC87XG5cbi8qKlxuICogU2F2ZSAvIFJld3JpdGUgLyBSZXN0b3JlXG4gKlxuICogV2hlbiByZXdyaXRpbmcgcGF0aHMgZm91bmQgaW4gYW4gZXhwcmVzc2lvbiwgaXQgaXNcbiAqIHBvc3NpYmxlIGZvciB0aGUgc2FtZSBsZXR0ZXIgc2VxdWVuY2VzIHRvIGJlIGZvdW5kIGluXG4gKiBzdHJpbmdzIGFuZCBPYmplY3QgbGl0ZXJhbCBwcm9wZXJ0eSBrZXlzLiBUaGVyZWZvcmUgd2VcbiAqIHJlbW92ZSBhbmQgc3RvcmUgdGhlc2UgcGFydHMgaW4gYSB0ZW1wb3JhcnkgYXJyYXksIGFuZFxuICogcmVzdG9yZSB0aGVtIGFmdGVyIHRoZSBwYXRoIHJld3JpdGUuXG4gKi9cblxudmFyIHNhdmVkID0gW107XG5cbi8qKlxuICogU2F2ZSByZXBsYWNlclxuICpcbiAqIFRoZSBzYXZlIHJlZ2V4IGNhbiBtYXRjaCB0d28gcG9zc2libGUgY2FzZXM6XG4gKiAxLiBBbiBvcGVuaW5nIG9iamVjdCBsaXRlcmFsXG4gKiAyLiBBIHN0cmluZ1xuICogSWYgbWF0Y2hlZCBhcyBhIHBsYWluIHN0cmluZywgd2UgbmVlZCB0byBlc2NhcGUgaXRzXG4gKiBuZXdsaW5lcywgc2luY2UgdGhlIHN0cmluZyBuZWVkcyB0byBiZSBwcmVzZXJ2ZWQgd2hlblxuICogZ2VuZXJhdGluZyB0aGUgZnVuY3Rpb24gYm9keS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcGFyYW0ge1N0cmluZ30gaXNTdHJpbmcgLSBzdHIgaWYgbWF0Y2hlZCBhcyBhIHN0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfSAtIHBsYWNlaG9sZGVyIHdpdGggaW5kZXhcbiAqL1xuXG5mdW5jdGlvbiBzYXZlKHN0ciwgaXNTdHJpbmcpIHtcbiAgdmFyIGkgPSBzYXZlZC5sZW5ndGg7XG4gIHNhdmVkW2ldID0gaXNTdHJpbmcgPyBzdHIucmVwbGFjZShuZXdsaW5lUkUsICdcXFxcbicpIDogc3RyO1xuICByZXR1cm4gJ1wiJyArIGkgKyAnXCInO1xufVxuXG4vKipcbiAqIFBhdGggcmV3cml0ZSByZXBsYWNlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSByYXdcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiByZXdyaXRlKHJhdykge1xuICB2YXIgYyA9IHJhdy5jaGFyQXQoMCk7XG4gIHZhciBwYXRoID0gcmF3LnNsaWNlKDEpO1xuICBpZiAoYWxsb3dlZEtleXdvcmRzUkUudGVzdChwYXRoKSkge1xuICAgIHJldHVybiByYXc7XG4gIH0gZWxzZSB7XG4gICAgcGF0aCA9IHBhdGguaW5kZXhPZignXCInKSA+IC0xID8gcGF0aC5yZXBsYWNlKHJlc3RvcmVSRSwgcmVzdG9yZSkgOiBwYXRoO1xuICAgIHJldHVybiBjICsgJ3Njb3BlLicgKyBwYXRoO1xuICB9XG59XG5cbi8qKlxuICogUmVzdG9yZSByZXBsYWNlclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBpIC0gbWF0Y2hlZCBzYXZlIGluZGV4XG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gcmVzdG9yZShzdHIsIGkpIHtcbiAgcmV0dXJuIHNhdmVkW2ldO1xufVxuXG4vKipcbiAqIFJld3JpdGUgYW4gZXhwcmVzc2lvbiwgcHJlZml4aW5nIGFsbCBwYXRoIGFjY2Vzc29ycyB3aXRoXG4gKiBgc2NvcGUuYCBhbmQgZ2VuZXJhdGUgZ2V0dGVyL3NldHRlciBmdW5jdGlvbnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV4cFxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblxuZnVuY3Rpb24gY29tcGlsZUdldHRlcihleHApIHtcbiAgaWYgKGltcHJvcGVyS2V5d29yZHNSRS50ZXN0KGV4cCkpIHtcbiAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ0F2b2lkIHVzaW5nIHJlc2VydmVkIGtleXdvcmRzIGluIGV4cHJlc3Npb246ICcgKyBleHApO1xuICB9XG4gIC8vIHJlc2V0IHN0YXRlXG4gIHNhdmVkLmxlbmd0aCA9IDA7XG4gIC8vIHNhdmUgc3RyaW5ncyBhbmQgb2JqZWN0IGxpdGVyYWwga2V5c1xuICB2YXIgYm9keSA9IGV4cC5yZXBsYWNlKHNhdmVSRSwgc2F2ZSkucmVwbGFjZSh3c1JFLCAnJyk7XG4gIC8vIHJld3JpdGUgYWxsIHBhdGhzXG4gIC8vIHBhZCAxIHNwYWNlIGhlcmUgYmVjYXVlIHRoZSByZWdleCBtYXRjaGVzIDEgZXh0cmEgY2hhclxuICBib2R5ID0gKCcgJyArIGJvZHkpLnJlcGxhY2UoaWRlbnRSRSwgcmV3cml0ZSkucmVwbGFjZShyZXN0b3JlUkUsIHJlc3RvcmUpO1xuICByZXR1cm4gbWFrZUdldHRlckZuKGJvZHkpO1xufVxuXG4vKipcbiAqIEJ1aWxkIGEgZ2V0dGVyIGZ1bmN0aW9uLiBSZXF1aXJlcyBldmFsLlxuICpcbiAqIFdlIGlzb2xhdGUgdGhlIHRyeS9jYXRjaCBzbyBpdCBkb2Vzbid0IGFmZmVjdCB0aGVcbiAqIG9wdGltaXphdGlvbiBvZiB0aGUgcGFyc2UgZnVuY3Rpb24gd2hlbiBpdCBpcyBub3QgY2FsbGVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBib2R5XG4gKiBAcmV0dXJuIHtGdW5jdGlvbnx1bmRlZmluZWR9XG4gKi9cblxuZnVuY3Rpb24gbWFrZUdldHRlckZuKGJvZHkpIHtcbiAgdHJ5IHtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1uZXctZnVuYyAqL1xuICAgIHJldHVybiBuZXcgRnVuY3Rpb24oJ3Njb3BlJywgJ3JldHVybiAnICsgYm9keSArICc7Jyk7XG4gICAgLyogZXNsaW50LWVuYWJsZSBuby1uZXctZnVuYyAqL1xuICB9IGNhdGNoIChlKSB7XG4gICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiB3YXJuKCdJbnZhbGlkIGV4cHJlc3Npb24uICcgKyAnR2VuZXJhdGVkIGZ1bmN0aW9uIGJvZHk6ICcgKyBib2R5KTtcbiAgfVxufVxuXG4vKipcbiAqIENvbXBpbGUgYSBzZXR0ZXIgZnVuY3Rpb24gZm9yIHRoZSBleHByZXNzaW9uLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBleHBcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufHVuZGVmaW5lZH1cbiAqL1xuXG5mdW5jdGlvbiBjb21waWxlU2V0dGVyKGV4cCkge1xuICB2YXIgcGF0aCA9IHBhcnNlUGF0aChleHApO1xuICBpZiAocGF0aCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoc2NvcGUsIHZhbCkge1xuICAgICAgc2V0UGF0aChzY29wZSwgcGF0aCwgdmFsKTtcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgd2FybignSW52YWxpZCBzZXR0ZXIgZXhwcmVzc2lvbjogJyArIGV4cCk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBhbiBleHByZXNzaW9uIGludG8gcmUtd3JpdHRlbiBnZXR0ZXIvc2V0dGVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXhwXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG5lZWRTZXRcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbihleHAsIG5lZWRTZXQpIHtcbiAgZXhwID0gZXhwLnRyaW0oKTtcbiAgLy8gdHJ5IGNhY2hlXG4gIHZhciBoaXQgPSBleHByZXNzaW9uQ2FjaGUuZ2V0KGV4cCk7XG4gIGlmIChoaXQpIHtcbiAgICBpZiAobmVlZFNldCAmJiAhaGl0LnNldCkge1xuICAgICAgaGl0LnNldCA9IGNvbXBpbGVTZXR0ZXIoaGl0LmV4cCk7XG4gICAgfVxuICAgIHJldHVybiBoaXQ7XG4gIH1cbiAgdmFyIHJlcyA9IHsgZXhwOiBleHAgfTtcbiAgcmVzLmdldCA9IGlzU2ltcGxlUGF0aChleHApICYmIGV4cC5pbmRleE9mKCdbJykgPCAwXG4gIC8vIG9wdGltaXplZCBzdXBlciBzaW1wbGUgZ2V0dGVyXG4gID8gbWFrZUdldHRlckZuKCdzY29wZS4nICsgZXhwKVxuICAvLyBkeW5hbWljIGdldHRlclxuICA6IGNvbXBpbGVHZXR0ZXIoZXhwKTtcbiAgaWYgKG5lZWRTZXQpIHtcbiAgICByZXMuc2V0ID0gY29tcGlsZVNldHRlcihleHApO1xuICB9XG4gIGV4cHJlc3Npb25DYWNoZS5wdXQoZXhwLCByZXMpO1xuICByZXR1cm4gcmVzO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGFuIGV4cHJlc3Npb24gaXMgYSBzaW1wbGUgcGF0aC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXhwXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cbmZ1bmN0aW9uIGlzU2ltcGxlUGF0aChleHApIHtcbiAgcmV0dXJuIHBhdGhUZXN0UkUudGVzdChleHApICYmXG4gIC8vIGRvbid0IHRyZWF0IHRydWUvZmFsc2UgYXMgcGF0aHNcbiAgIWJvb2xlYW5MaXRlcmFsUkUudGVzdChleHApICYmXG4gIC8vIE1hdGggY29uc3RhbnRzIGUuZy4gTWF0aC5QSSwgTWF0aC5FIGV0Yy5cbiAgZXhwLnNsaWNlKDAsIDUpICE9PSAnTWF0aC4nO1xufVxuXG52YXIgZXhwcmVzc2lvbiA9IE9iamVjdC5mcmVlemUoe1xuICBwYXJzZUV4cHJlc3Npb246IHBhcnNlRXhwcmVzc2lvbixcbiAgaXNTaW1wbGVQYXRoOiBpc1NpbXBsZVBhdGhcbn0pO1xuXG4vLyB3ZSBoYXZlIHR3byBzZXBhcmF0ZSBxdWV1ZXM6IG9uZSBmb3IgZGlyZWN0aXZlIHVwZGF0ZXNcbi8vIGFuZCBvbmUgZm9yIHVzZXIgd2F0Y2hlciByZWdpc3RlcmVkIHZpYSAkd2F0Y2goKS5cbi8vIHdlIHdhbnQgdG8gZ3VhcmFudGVlIGRpcmVjdGl2ZSB1cGRhdGVzIHRvIGJlIGNhbGxlZFxuLy8gYmVmb3JlIHVzZXIgd2F0Y2hlcnMgc28gdGhhdCB3aGVuIHVzZXIgd2F0Y2hlcnMgYXJlXG4vLyB0cmlnZ2VyZWQsIHRoZSBET00gd291bGQgaGF2ZSBhbHJlYWR5IGJlZW4gaW4gdXBkYXRlZFxuLy8gc3RhdGUuXG5cbnZhciBxdWV1ZUluZGV4O1xudmFyIHF1ZXVlID0gW107XG52YXIgdXNlclF1ZXVlID0gW107XG52YXIgaGFzID0ge307XG52YXIgY2lyY3VsYXIgPSB7fTtcbnZhciB3YWl0aW5nID0gZmFsc2U7XG52YXIgaW50ZXJuYWxRdWV1ZURlcGxldGVkID0gZmFsc2U7XG5cbi8qKlxuICogUmVzZXQgdGhlIGJhdGNoZXIncyBzdGF0ZS5cbiAqL1xuXG5mdW5jdGlvbiByZXNldEJhdGNoZXJTdGF0ZSgpIHtcbiAgcXVldWUgPSBbXTtcbiAgdXNlclF1ZXVlID0gW107XG4gIGhhcyA9IHt9O1xuICBjaXJjdWxhciA9IHt9O1xuICB3YWl0aW5nID0gaW50ZXJuYWxRdWV1ZURlcGxldGVkID0gZmFsc2U7XG59XG5cbi8qKlxuICogRmx1c2ggYm90aCBxdWV1ZXMgYW5kIHJ1biB0aGUgd2F0Y2hlcnMuXG4gKi9cblxuZnVuY3Rpb24gZmx1c2hCYXRjaGVyUXVldWUoKSB7XG4gIHJ1bkJhdGNoZXJRdWV1ZShxdWV1ZSk7XG4gIGludGVybmFsUXVldWVEZXBsZXRlZCA9IHRydWU7XG4gIHJ1bkJhdGNoZXJRdWV1ZSh1c2VyUXVldWUpO1xuICAvLyBkZXYgdG9vbCBob29rXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICBpZiAoZGV2dG9vbHMgJiYgY29uZmlnLmRldnRvb2xzKSB7XG4gICAgZGV2dG9vbHMuZW1pdCgnZmx1c2gnKTtcbiAgfVxuICByZXNldEJhdGNoZXJTdGF0ZSgpO1xufVxuXG4vKipcbiAqIFJ1biB0aGUgd2F0Y2hlcnMgaW4gYSBzaW5nbGUgcXVldWUuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gcXVldWVcbiAqL1xuXG5mdW5jdGlvbiBydW5CYXRjaGVyUXVldWUocXVldWUpIHtcbiAgLy8gZG8gbm90IGNhY2hlIGxlbmd0aCBiZWNhdXNlIG1vcmUgd2F0Y2hlcnMgbWlnaHQgYmUgcHVzaGVkXG4gIC8vIGFzIHdlIHJ1biBleGlzdGluZyB3YXRjaGVyc1xuICBmb3IgKHF1ZXVlSW5kZXggPSAwOyBxdWV1ZUluZGV4IDwgcXVldWUubGVuZ3RoOyBxdWV1ZUluZGV4KyspIHtcbiAgICB2YXIgd2F0Y2hlciA9IHF1ZXVlW3F1ZXVlSW5kZXhdO1xuICAgIHZhciBpZCA9IHdhdGNoZXIuaWQ7XG4gICAgaGFzW2lkXSA9IG51bGw7XG4gICAgd2F0Y2hlci5ydW4oKTtcbiAgICAvLyBpbiBkZXYgYnVpbGQsIGNoZWNrIGFuZCBzdG9wIGNpcmN1bGFyIHVwZGF0ZXMuXG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgaGFzW2lkXSAhPSBudWxsKSB7XG4gICAgICBjaXJjdWxhcltpZF0gPSAoY2lyY3VsYXJbaWRdIHx8IDApICsgMTtcbiAgICAgIGlmIChjaXJjdWxhcltpZF0gPiBjb25maWcuX21heFVwZGF0ZUNvdW50KSB7XG4gICAgICAgIHF1ZXVlLnNwbGljZShoYXNbaWRdLCAxKTtcbiAgICAgICAgd2FybignWW91IG1heSBoYXZlIGFuIGluZmluaXRlIHVwZGF0ZSBsb29wIGZvciB3YXRjaGVyICcgKyAnd2l0aCBleHByZXNzaW9uOiAnICsgd2F0Y2hlci5leHByZXNzaW9uKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBQdXNoIGEgd2F0Y2hlciBpbnRvIHRoZSB3YXRjaGVyIHF1ZXVlLlxuICogSm9icyB3aXRoIGR1cGxpY2F0ZSBJRHMgd2lsbCBiZSBza2lwcGVkIHVubGVzcyBpdCdzXG4gKiBwdXNoZWQgd2hlbiB0aGUgcXVldWUgaXMgYmVpbmcgZmx1c2hlZC5cbiAqXG4gKiBAcGFyYW0ge1dhdGNoZXJ9IHdhdGNoZXJcbiAqICAgcHJvcGVydGllczpcbiAqICAgLSB7TnVtYmVyfSBpZFxuICogICAtIHtGdW5jdGlvbn0gcnVuXG4gKi9cblxuZnVuY3Rpb24gcHVzaFdhdGNoZXIod2F0Y2hlcikge1xuICB2YXIgaWQgPSB3YXRjaGVyLmlkO1xuICBpZiAoaGFzW2lkXSA9PSBudWxsKSB7XG4gICAgaWYgKGludGVybmFsUXVldWVEZXBsZXRlZCAmJiAhd2F0Y2hlci51c2VyKSB7XG4gICAgICAvLyBhbiBpbnRlcm5hbCB3YXRjaGVyIHRyaWdnZXJlZCBieSBhIHVzZXIgd2F0Y2hlci4uLlxuICAgICAgLy8gbGV0J3MgcnVuIGl0IGltbWVkaWF0ZWx5IGFmdGVyIGN1cnJlbnQgdXNlciB3YXRjaGVyIGlzIGRvbmUuXG4gICAgICB1c2VyUXVldWUuc3BsaWNlKHF1ZXVlSW5kZXggKyAxLCAwLCB3YXRjaGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gcHVzaCB3YXRjaGVyIGludG8gYXBwcm9wcmlhdGUgcXVldWVcbiAgICAgIHZhciBxID0gd2F0Y2hlci51c2VyID8gdXNlclF1ZXVlIDogcXVldWU7XG4gICAgICBoYXNbaWRdID0gcS5sZW5ndGg7XG4gICAgICBxLnB1c2god2F0Y2hlcik7XG4gICAgICAvLyBxdWV1ZSB0aGUgZmx1c2hcbiAgICAgIGlmICghd2FpdGluZykge1xuICAgICAgICB3YWl0aW5nID0gdHJ1ZTtcbiAgICAgICAgbmV4dFRpY2soZmx1c2hCYXRjaGVyUXVldWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG52YXIgdWlkJDIgPSAwO1xuXG4vKipcbiAqIEEgd2F0Y2hlciBwYXJzZXMgYW4gZXhwcmVzc2lvbiwgY29sbGVjdHMgZGVwZW5kZW5jaWVzLFxuICogYW5kIGZpcmVzIGNhbGxiYWNrIHdoZW4gdGhlIGV4cHJlc3Npb24gdmFsdWUgY2hhbmdlcy5cbiAqIFRoaXMgaXMgdXNlZCBmb3IgYm90aCB0aGUgJHdhdGNoKCkgYXBpIGFuZCBkaXJlY3RpdmVzLlxuICpcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtTdHJpbmd9IGV4cHJlc3Npb25cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogICAgICAgICAgICAgICAgIC0ge0FycmF5fSBmaWx0ZXJzXG4gKiAgICAgICAgICAgICAgICAgLSB7Qm9vbGVhbn0gdHdvV2F5XG4gKiAgICAgICAgICAgICAgICAgLSB7Qm9vbGVhbn0gZGVlcFxuICogICAgICAgICAgICAgICAgIC0ge0Jvb2xlYW59IHVzZXJcbiAqICAgICAgICAgICAgICAgICAtIHtCb29sZWFufSBzeW5jXG4gKiAgICAgICAgICAgICAgICAgLSB7Qm9vbGVhbn0gbGF6eVxuICogICAgICAgICAgICAgICAgIC0ge0Z1bmN0aW9ufSBbcHJlUHJvY2Vzc11cbiAqICAgICAgICAgICAgICAgICAtIHtGdW5jdGlvbn0gW3Bvc3RQcm9jZXNzXVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIFdhdGNoZXIodm0sIGV4cE9yRm4sIGNiLCBvcHRpb25zKSB7XG4gIC8vIG1peCBpbiBvcHRpb25zXG4gIGlmIChvcHRpb25zKSB7XG4gICAgZXh0ZW5kKHRoaXMsIG9wdGlvbnMpO1xuICB9XG4gIHZhciBpc0ZuID0gdHlwZW9mIGV4cE9yRm4gPT09ICdmdW5jdGlvbic7XG4gIHRoaXMudm0gPSB2bTtcbiAgdm0uX3dhdGNoZXJzLnB1c2godGhpcyk7XG4gIHRoaXMuZXhwcmVzc2lvbiA9IGV4cE9yRm47XG4gIHRoaXMuY2IgPSBjYjtcbiAgdGhpcy5pZCA9ICsrdWlkJDI7IC8vIHVpZCBmb3IgYmF0Y2hpbmdcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICB0aGlzLmRpcnR5ID0gdGhpcy5sYXp5OyAvLyBmb3IgbGF6eSB3YXRjaGVyc1xuICB0aGlzLmRlcHMgPSBbXTtcbiAgdGhpcy5uZXdEZXBzID0gW107XG4gIHRoaXMuZGVwSWRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgdGhpcy5uZXdEZXBJZHMgPSBudWxsO1xuICB0aGlzLnByZXZFcnJvciA9IG51bGw7IC8vIGZvciBhc3luYyBlcnJvciBzdGFja3NcbiAgLy8gcGFyc2UgZXhwcmVzc2lvbiBmb3IgZ2V0dGVyL3NldHRlclxuICBpZiAoaXNGbikge1xuICAgIHRoaXMuZ2V0dGVyID0gZXhwT3JGbjtcbiAgICB0aGlzLnNldHRlciA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB2YXIgcmVzID0gcGFyc2VFeHByZXNzaW9uKGV4cE9yRm4sIHRoaXMudHdvV2F5KTtcbiAgICB0aGlzLmdldHRlciA9IHJlcy5nZXQ7XG4gICAgdGhpcy5zZXR0ZXIgPSByZXMuc2V0O1xuICB9XG4gIHRoaXMudmFsdWUgPSB0aGlzLmxhenkgPyB1bmRlZmluZWQgOiB0aGlzLmdldCgpO1xuICAvLyBzdGF0ZSBmb3IgYXZvaWRpbmcgZmFsc2UgdHJpZ2dlcnMgZm9yIGRlZXAgYW5kIEFycmF5XG4gIC8vIHdhdGNoZXJzIGR1cmluZyB2bS5fZGlnZXN0KClcbiAgdGhpcy5xdWV1ZWQgPSB0aGlzLnNoYWxsb3cgPSBmYWxzZTtcbn1cblxuLyoqXG4gKiBFdmFsdWF0ZSB0aGUgZ2V0dGVyLCBhbmQgcmUtY29sbGVjdCBkZXBlbmRlbmNpZXMuXG4gKi9cblxuV2F0Y2hlci5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmJlZm9yZUdldCgpO1xuICB2YXIgc2NvcGUgPSB0aGlzLnNjb3BlIHx8IHRoaXMudm07XG4gIHZhciB2YWx1ZTtcbiAgdHJ5IHtcbiAgICB2YWx1ZSA9IHRoaXMuZ2V0dGVyLmNhbGwoc2NvcGUsIHNjb3BlKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIGNvbmZpZy53YXJuRXhwcmVzc2lvbkVycm9ycykge1xuICAgICAgd2FybignRXJyb3Igd2hlbiBldmFsdWF0aW5nIGV4cHJlc3Npb24gXCInICsgdGhpcy5leHByZXNzaW9uICsgJ1wiLiAnICsgKGNvbmZpZy5kZWJ1ZyA/ICcnIDogJ1R1cm4gb24gZGVidWcgbW9kZSB0byBzZWUgc3RhY2sgdHJhY2UuJyksIGUpO1xuICAgIH1cbiAgfVxuICAvLyBcInRvdWNoXCIgZXZlcnkgcHJvcGVydHkgc28gdGhleSBhcmUgYWxsIHRyYWNrZWQgYXNcbiAgLy8gZGVwZW5kZW5jaWVzIGZvciBkZWVwIHdhdGNoaW5nXG4gIGlmICh0aGlzLmRlZXApIHtcbiAgICB0cmF2ZXJzZSh2YWx1ZSk7XG4gIH1cbiAgaWYgKHRoaXMucHJlUHJvY2Vzcykge1xuICAgIHZhbHVlID0gdGhpcy5wcmVQcm9jZXNzKHZhbHVlKTtcbiAgfVxuICBpZiAodGhpcy5maWx0ZXJzKSB7XG4gICAgdmFsdWUgPSBzY29wZS5fYXBwbHlGaWx0ZXJzKHZhbHVlLCBudWxsLCB0aGlzLmZpbHRlcnMsIGZhbHNlKTtcbiAgfVxuICBpZiAodGhpcy5wb3N0UHJvY2Vzcykge1xuICAgIHZhbHVlID0gdGhpcy5wb3N0UHJvY2Vzcyh2YWx1ZSk7XG4gIH1cbiAgdGhpcy5hZnRlckdldCgpO1xuICByZXR1cm4gdmFsdWU7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZSB3aXRoIHRoZSBzZXR0ZXIuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICovXG5cbldhdGNoZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICB2YXIgc2NvcGUgPSB0aGlzLnNjb3BlIHx8IHRoaXMudm07XG4gIGlmICh0aGlzLmZpbHRlcnMpIHtcbiAgICB2YWx1ZSA9IHNjb3BlLl9hcHBseUZpbHRlcnModmFsdWUsIHRoaXMudmFsdWUsIHRoaXMuZmlsdGVycywgdHJ1ZSk7XG4gIH1cbiAgdHJ5IHtcbiAgICB0aGlzLnNldHRlci5jYWxsKHNjb3BlLCBzY29wZSwgdmFsdWUpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgY29uZmlnLndhcm5FeHByZXNzaW9uRXJyb3JzKSB7XG4gICAgICB3YXJuKCdFcnJvciB3aGVuIGV2YWx1YXRpbmcgc2V0dGVyIFwiJyArIHRoaXMuZXhwcmVzc2lvbiArICdcIicsIGUpO1xuICAgIH1cbiAgfVxuICAvLyB0d28td2F5IHN5bmMgZm9yIHYtZm9yIGFsaWFzXG4gIHZhciBmb3JDb250ZXh0ID0gc2NvcGUuJGZvckNvbnRleHQ7XG4gIGlmIChmb3JDb250ZXh0ICYmIGZvckNvbnRleHQuYWxpYXMgPT09IHRoaXMuZXhwcmVzc2lvbikge1xuICAgIGlmIChmb3JDb250ZXh0LmZpbHRlcnMpIHtcbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgd2FybignSXQgc2VlbXMgeW91IGFyZSB1c2luZyB0d28td2F5IGJpbmRpbmcgb24gJyArICdhIHYtZm9yIGFsaWFzICgnICsgdGhpcy5leHByZXNzaW9uICsgJyksIGFuZCB0aGUgJyArICd2LWZvciBoYXMgZmlsdGVycy4gVGhpcyB3aWxsIG5vdCB3b3JrIHByb3Blcmx5LiAnICsgJ0VpdGhlciByZW1vdmUgdGhlIGZpbHRlcnMgb3IgdXNlIGFuIGFycmF5IG9mICcgKyAnb2JqZWN0cyBhbmQgYmluZCB0byBvYmplY3QgcHJvcGVydGllcyBpbnN0ZWFkLicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3JDb250ZXh0Ll93aXRoTG9jayhmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2NvcGUuJGtleSkge1xuICAgICAgICAvLyBvcmlnaW5hbCBpcyBhbiBvYmplY3RcbiAgICAgICAgZm9yQ29udGV4dC5yYXdWYWx1ZVtzY29wZS4ka2V5XSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yQ29udGV4dC5yYXdWYWx1ZS4kc2V0KHNjb3BlLiRpbmRleCwgdmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuXG4vKipcbiAqIFByZXBhcmUgZm9yIGRlcGVuZGVuY3kgY29sbGVjdGlvbi5cbiAqL1xuXG5XYXRjaGVyLnByb3RvdHlwZS5iZWZvcmVHZXQgPSBmdW5jdGlvbiAoKSB7XG4gIERlcC50YXJnZXQgPSB0aGlzO1xuICB0aGlzLm5ld0RlcElkcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHRoaXMubmV3RGVwcy5sZW5ndGggPSAwO1xufTtcblxuLyoqXG4gKiBBZGQgYSBkZXBlbmRlbmN5IHRvIHRoaXMgZGlyZWN0aXZlLlxuICpcbiAqIEBwYXJhbSB7RGVwfSBkZXBcbiAqL1xuXG5XYXRjaGVyLnByb3RvdHlwZS5hZGREZXAgPSBmdW5jdGlvbiAoZGVwKSB7XG4gIHZhciBpZCA9IGRlcC5pZDtcbiAgaWYgKCF0aGlzLm5ld0RlcElkc1tpZF0pIHtcbiAgICB0aGlzLm5ld0RlcElkc1tpZF0gPSB0cnVlO1xuICAgIHRoaXMubmV3RGVwcy5wdXNoKGRlcCk7XG4gICAgaWYgKCF0aGlzLmRlcElkc1tpZF0pIHtcbiAgICAgIGRlcC5hZGRTdWIodGhpcyk7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIENsZWFuIHVwIGZvciBkZXBlbmRlbmN5IGNvbGxlY3Rpb24uXG4gKi9cblxuV2F0Y2hlci5wcm90b3R5cGUuYWZ0ZXJHZXQgPSBmdW5jdGlvbiAoKSB7XG4gIERlcC50YXJnZXQgPSBudWxsO1xuICB2YXIgaSA9IHRoaXMuZGVwcy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICB2YXIgZGVwID0gdGhpcy5kZXBzW2ldO1xuICAgIGlmICghdGhpcy5uZXdEZXBJZHNbZGVwLmlkXSkge1xuICAgICAgZGVwLnJlbW92ZVN1Yih0aGlzKTtcbiAgICB9XG4gIH1cbiAgdGhpcy5kZXBJZHMgPSB0aGlzLm5ld0RlcElkcztcbiAgdmFyIHRtcCA9IHRoaXMuZGVwcztcbiAgdGhpcy5kZXBzID0gdGhpcy5uZXdEZXBzO1xuICB0aGlzLm5ld0RlcHMgPSB0bXA7XG59O1xuXG4vKipcbiAqIFN1YnNjcmliZXIgaW50ZXJmYWNlLlxuICogV2lsbCBiZSBjYWxsZWQgd2hlbiBhIGRlcGVuZGVuY3kgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHNoYWxsb3dcbiAqL1xuXG5XYXRjaGVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoc2hhbGxvdykge1xuICBpZiAodGhpcy5sYXp5KSB7XG4gICAgdGhpcy5kaXJ0eSA9IHRydWU7XG4gIH0gZWxzZSBpZiAodGhpcy5zeW5jIHx8ICFjb25maWcuYXN5bmMpIHtcbiAgICB0aGlzLnJ1bigpO1xuICB9IGVsc2Uge1xuICAgIC8vIGlmIHF1ZXVlZCwgb25seSBvdmVyd3JpdGUgc2hhbGxvdyB3aXRoIG5vbi1zaGFsbG93LFxuICAgIC8vIGJ1dCBub3QgdGhlIG90aGVyIHdheSBhcm91bmQuXG4gICAgdGhpcy5zaGFsbG93ID0gdGhpcy5xdWV1ZWQgPyBzaGFsbG93ID8gdGhpcy5zaGFsbG93IDogZmFsc2UgOiAhIXNoYWxsb3c7XG4gICAgdGhpcy5xdWV1ZWQgPSB0cnVlO1xuICAgIC8vIHJlY29yZCBiZWZvcmUtcHVzaCBlcnJvciBzdGFjayBpbiBkZWJ1ZyBtb2RlXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgY29uZmlnLmRlYnVnKSB7XG4gICAgICB0aGlzLnByZXZFcnJvciA9IG5ldyBFcnJvcignW3Z1ZV0gYXN5bmMgc3RhY2sgdHJhY2UnKTtcbiAgICB9XG4gICAgcHVzaFdhdGNoZXIodGhpcyk7XG4gIH1cbn07XG5cbi8qKlxuICogQmF0Y2hlciBqb2IgaW50ZXJmYWNlLlxuICogV2lsbCBiZSBjYWxsZWQgYnkgdGhlIGJhdGNoZXIuXG4gKi9cblxuV2F0Y2hlci5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5hY3RpdmUpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmdldCgpO1xuICAgIGlmICh2YWx1ZSAhPT0gdGhpcy52YWx1ZSB8fFxuICAgIC8vIERlZXAgd2F0Y2hlcnMgYW5kIHdhdGNoZXJzIG9uIE9iamVjdC9BcnJheXMgc2hvdWxkIGZpcmUgZXZlblxuICAgIC8vIHdoZW4gdGhlIHZhbHVlIGlzIHRoZSBzYW1lLCBiZWNhdXNlIHRoZSB2YWx1ZSBtYXlcbiAgICAvLyBoYXZlIG11dGF0ZWQ7IGJ1dCBvbmx5IGRvIHNvIGlmIHRoaXMgaXMgYVxuICAgIC8vIG5vbi1zaGFsbG93IHVwZGF0ZSAoY2F1c2VkIGJ5IGEgdm0gZGlnZXN0KS5cbiAgICAoaXNPYmplY3QodmFsdWUpIHx8IHRoaXMuZGVlcCkgJiYgIXRoaXMuc2hhbGxvdykge1xuICAgICAgLy8gc2V0IG5ldyB2YWx1ZVxuICAgICAgdmFyIG9sZFZhbHVlID0gdGhpcy52YWx1ZTtcbiAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgIC8vIGluIGRlYnVnICsgYXN5bmMgbW9kZSwgd2hlbiBhIHdhdGNoZXIgY2FsbGJhY2tzXG4gICAgICAvLyB0aHJvd3MsIHdlIGFsc28gdGhyb3cgdGhlIHNhdmVkIGJlZm9yZS1wdXNoIGVycm9yXG4gICAgICAvLyBzbyB0aGUgZnVsbCBjcm9zcy10aWNrIHN0YWNrIHRyYWNlIGlzIGF2YWlsYWJsZS5cbiAgICAgIHZhciBwcmV2RXJyb3IgPSB0aGlzLnByZXZFcnJvcjtcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgY29uZmlnLmRlYnVnICYmIHByZXZFcnJvcikge1xuICAgICAgICB0aGlzLnByZXZFcnJvciA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhpcy5jYi5jYWxsKHRoaXMudm0sIHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aHJvdyBwcmV2RXJyb3I7XG4gICAgICAgICAgfSwgMCk7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jYi5jYWxsKHRoaXMudm0sIHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucXVldWVkID0gdGhpcy5zaGFsbG93ID0gZmFsc2U7XG4gIH1cbn07XG5cbi8qKlxuICogRXZhbHVhdGUgdGhlIHZhbHVlIG9mIHRoZSB3YXRjaGVyLlxuICogVGhpcyBvbmx5IGdldHMgY2FsbGVkIGZvciBsYXp5IHdhdGNoZXJzLlxuICovXG5cbldhdGNoZXIucHJvdG90eXBlLmV2YWx1YXRlID0gZnVuY3Rpb24gKCkge1xuICAvLyBhdm9pZCBvdmVyd3JpdGluZyBhbm90aGVyIHdhdGNoZXIgdGhhdCBpcyBiZWluZ1xuICAvLyBjb2xsZWN0ZWQuXG4gIHZhciBjdXJyZW50ID0gRGVwLnRhcmdldDtcbiAgdGhpcy52YWx1ZSA9IHRoaXMuZ2V0KCk7XG4gIHRoaXMuZGlydHkgPSBmYWxzZTtcbiAgRGVwLnRhcmdldCA9IGN1cnJlbnQ7XG59O1xuXG4vKipcbiAqIERlcGVuZCBvbiBhbGwgZGVwcyBjb2xsZWN0ZWQgYnkgdGhpcyB3YXRjaGVyLlxuICovXG5cbldhdGNoZXIucHJvdG90eXBlLmRlcGVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGkgPSB0aGlzLmRlcHMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgdGhpcy5kZXBzW2ldLmRlcGVuZCgpO1xuICB9XG59O1xuXG4vKipcbiAqIFJlbW92ZSBzZWxmIGZyb20gYWxsIGRlcGVuZGVuY2llcycgc3ViY3JpYmVyIGxpc3QuXG4gKi9cblxuV2F0Y2hlci5wcm90b3R5cGUudGVhcmRvd24gPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmFjdGl2ZSkge1xuICAgIC8vIHJlbW92ZSBzZWxmIGZyb20gdm0ncyB3YXRjaGVyIGxpc3RcbiAgICAvLyB0aGlzIGlzIGEgc29tZXdoYXQgZXhwZW5zaXZlIG9wZXJhdGlvbiBzbyB3ZSBza2lwIGl0XG4gICAgLy8gaWYgdGhlIHZtIGlzIGJlaW5nIGRlc3Ryb3llZCBvciBpcyBwZXJmb3JtaW5nIGEgdi1mb3JcbiAgICAvLyByZS1yZW5kZXIgKHRoZSB3YXRjaGVyIGxpc3QgaXMgdGhlbiBmaWx0ZXJlZCBieSB2LWZvcikuXG4gICAgaWYgKCF0aGlzLnZtLl9pc0JlaW5nRGVzdHJveWVkICYmICF0aGlzLnZtLl92Rm9yUmVtb3ZpbmcpIHtcbiAgICAgIHRoaXMudm0uX3dhdGNoZXJzLiRyZW1vdmUodGhpcyk7XG4gICAgfVxuICAgIHZhciBpID0gdGhpcy5kZXBzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB0aGlzLmRlcHNbaV0ucmVtb3ZlU3ViKHRoaXMpO1xuICAgIH1cbiAgICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMudm0gPSB0aGlzLmNiID0gdGhpcy52YWx1ZSA9IG51bGw7XG4gIH1cbn07XG5cbi8qKlxuICogUmVjcnVzaXZlbHkgdHJhdmVyc2UgYW4gb2JqZWN0IHRvIGV2b2tlIGFsbCBjb252ZXJ0ZWRcbiAqIGdldHRlcnMsIHNvIHRoYXQgZXZlcnkgbmVzdGVkIHByb3BlcnR5IGluc2lkZSB0aGUgb2JqZWN0XG4gKiBpcyBjb2xsZWN0ZWQgYXMgYSBcImRlZXBcIiBkZXBlbmRlbmN5LlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsXG4gKi9cblxuZnVuY3Rpb24gdHJhdmVyc2UodmFsKSB7XG4gIHZhciBpLCBrZXlzO1xuICBpZiAoaXNBcnJheSh2YWwpKSB7XG4gICAgaSA9IHZhbC5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgdHJhdmVyc2UodmFsW2ldKTtcbiAgfSBlbHNlIGlmIChpc09iamVjdCh2YWwpKSB7XG4gICAga2V5cyA9IE9iamVjdC5rZXlzKHZhbCk7XG4gICAgaSA9IGtleXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHRyYXZlcnNlKHZhbFtrZXlzW2ldXSk7XG4gIH1cbn1cblxudmFyIHRleHQkMSA9IHtcblxuICBiaW5kOiBmdW5jdGlvbiBiaW5kKCkge1xuICAgIHRoaXMuYXR0ciA9IHRoaXMuZWwubm9kZVR5cGUgPT09IDMgPyAnZGF0YScgOiAndGV4dENvbnRlbnQnO1xuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKHZhbHVlKSB7XG4gICAgdGhpcy5lbFt0aGlzLmF0dHJdID0gX3RvU3RyaW5nKHZhbHVlKTtcbiAgfVxufTtcblxudmFyIHRlbXBsYXRlQ2FjaGUgPSBuZXcgQ2FjaGUoMTAwMCk7XG52YXIgaWRTZWxlY3RvckNhY2hlID0gbmV3IENhY2hlKDEwMDApO1xuXG52YXIgbWFwID0ge1xuICBlZmF1bHQ6IFswLCAnJywgJyddLFxuICBsZWdlbmQ6IFsxLCAnPGZpZWxkc2V0PicsICc8L2ZpZWxkc2V0PiddLFxuICB0cjogWzIsICc8dGFibGU+PHRib2R5PicsICc8L3Rib2R5PjwvdGFibGU+J10sXG4gIGNvbDogWzIsICc8dGFibGU+PHRib2R5PjwvdGJvZHk+PGNvbGdyb3VwPicsICc8L2NvbGdyb3VwPjwvdGFibGU+J11cbn07XG5cbm1hcC50ZCA9IG1hcC50aCA9IFszLCAnPHRhYmxlPjx0Ym9keT48dHI+JywgJzwvdHI+PC90Ym9keT48L3RhYmxlPiddO1xuXG5tYXAub3B0aW9uID0gbWFwLm9wdGdyb3VwID0gWzEsICc8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj4nLCAnPC9zZWxlY3Q+J107XG5cbm1hcC50aGVhZCA9IG1hcC50Ym9keSA9IG1hcC5jb2xncm91cCA9IG1hcC5jYXB0aW9uID0gbWFwLnRmb290ID0gWzEsICc8dGFibGU+JywgJzwvdGFibGU+J107XG5cbm1hcC5nID0gbWFwLmRlZnMgPSBtYXAuc3ltYm9sID0gbWFwLnVzZSA9IG1hcC5pbWFnZSA9IG1hcC50ZXh0ID0gbWFwLmNpcmNsZSA9IG1hcC5lbGxpcHNlID0gbWFwLmxpbmUgPSBtYXAucGF0aCA9IG1hcC5wb2x5Z29uID0gbWFwLnBvbHlsaW5lID0gbWFwLnJlY3QgPSBbMSwgJzxzdmcgJyArICd4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgJyArICd4bWxuczp4bGluaz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIiAnICsgJ3htbG5zOmV2PVwiaHR0cDovL3d3dy53My5vcmcvMjAwMS94bWwtZXZlbnRzXCInICsgJ3ZlcnNpb249XCIxLjFcIj4nLCAnPC9zdmc+J107XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBub2RlIGlzIGEgc3VwcG9ydGVkIHRlbXBsYXRlIG5vZGUgd2l0aCBhXG4gKiBEb2N1bWVudEZyYWdtZW50IGNvbnRlbnQuXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5cbmZ1bmN0aW9uIGlzUmVhbFRlbXBsYXRlKG5vZGUpIHtcbiAgcmV0dXJuIGlzVGVtcGxhdGUobm9kZSkgJiYgaXNGcmFnbWVudChub2RlLmNvbnRlbnQpO1xufVxuXG52YXIgdGFnUkUkMSA9IC88KFtcXHc6LV0rKS87XG52YXIgZW50aXR5UkUgPSAvJiM/XFx3Kz87LztcblxuLyoqXG4gKiBDb252ZXJ0IGEgc3RyaW5nIHRlbXBsYXRlIHRvIGEgRG9jdW1lbnRGcmFnbWVudC5cbiAqIERldGVybWluZXMgY29ycmVjdCB3cmFwcGluZyBieSB0YWcgdHlwZXMuIFdyYXBwaW5nXG4gKiBzdHJhdGVneSBmb3VuZCBpbiBqUXVlcnkgJiBjb21wb25lbnQvZG9taWZ5LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZW1wbGF0ZVN0cmluZ1xuICogQHBhcmFtIHtCb29sZWFufSByYXdcbiAqIEByZXR1cm4ge0RvY3VtZW50RnJhZ21lbnR9XG4gKi9cblxuZnVuY3Rpb24gc3RyaW5nVG9GcmFnbWVudCh0ZW1wbGF0ZVN0cmluZywgcmF3KSB7XG4gIC8vIHRyeSBhIGNhY2hlIGhpdCBmaXJzdFxuICB2YXIgY2FjaGVLZXkgPSByYXcgPyB0ZW1wbGF0ZVN0cmluZyA6IHRlbXBsYXRlU3RyaW5nLnRyaW0oKTtcbiAgdmFyIGhpdCA9IHRlbXBsYXRlQ2FjaGUuZ2V0KGNhY2hlS2V5KTtcbiAgaWYgKGhpdCkge1xuICAgIHJldHVybiBoaXQ7XG4gIH1cblxuICB2YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgdmFyIHRhZ01hdGNoID0gdGVtcGxhdGVTdHJpbmcubWF0Y2godGFnUkUkMSk7XG4gIHZhciBlbnRpdHlNYXRjaCA9IGVudGl0eVJFLnRlc3QodGVtcGxhdGVTdHJpbmcpO1xuXG4gIGlmICghdGFnTWF0Y2ggJiYgIWVudGl0eU1hdGNoKSB7XG4gICAgLy8gdGV4dCBvbmx5LCByZXR1cm4gYSBzaW5nbGUgdGV4dCBub2RlLlxuICAgIGZyYWcuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGVtcGxhdGVTdHJpbmcpKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgdGFnID0gdGFnTWF0Y2ggJiYgdGFnTWF0Y2hbMV07XG4gICAgdmFyIHdyYXAgPSBtYXBbdGFnXSB8fCBtYXAuZWZhdWx0O1xuICAgIHZhciBkZXB0aCA9IHdyYXBbMF07XG4gICAgdmFyIHByZWZpeCA9IHdyYXBbMV07XG4gICAgdmFyIHN1ZmZpeCA9IHdyYXBbMl07XG4gICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgIG5vZGUuaW5uZXJIVE1MID0gcHJlZml4ICsgdGVtcGxhdGVTdHJpbmcgKyBzdWZmaXg7XG4gICAgd2hpbGUgKGRlcHRoLS0pIHtcbiAgICAgIG5vZGUgPSBub2RlLmxhc3RDaGlsZDtcbiAgICB9XG5cbiAgICB2YXIgY2hpbGQ7XG4gICAgLyogZXNsaW50LWRpc2FibGUgbm8tY29uZC1hc3NpZ24gKi9cbiAgICB3aGlsZSAoY2hpbGQgPSBub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgIC8qIGVzbGludC1lbmFibGUgbm8tY29uZC1hc3NpZ24gKi9cbiAgICAgIGZyYWcuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICAgIH1cbiAgfVxuICBpZiAoIXJhdykge1xuICAgIHRyaW1Ob2RlKGZyYWcpO1xuICB9XG4gIHRlbXBsYXRlQ2FjaGUucHV0KGNhY2hlS2V5LCBmcmFnKTtcbiAgcmV0dXJuIGZyYWc7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHRlbXBsYXRlIG5vZGUgdG8gYSBEb2N1bWVudEZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZVxuICogQHJldHVybiB7RG9jdW1lbnRGcmFnbWVudH1cbiAqL1xuXG5mdW5jdGlvbiBub2RlVG9GcmFnbWVudChub2RlKSB7XG4gIC8vIGlmIGl0cyBhIHRlbXBsYXRlIHRhZyBhbmQgdGhlIGJyb3dzZXIgc3VwcG9ydHMgaXQsXG4gIC8vIGl0cyBjb250ZW50IGlzIGFscmVhZHkgYSBkb2N1bWVudCBmcmFnbWVudC5cbiAgaWYgKGlzUmVhbFRlbXBsYXRlKG5vZGUpKSB7XG4gICAgdHJpbU5vZGUobm9kZS5jb250ZW50KTtcbiAgICByZXR1cm4gbm9kZS5jb250ZW50O1xuICB9XG4gIC8vIHNjcmlwdCB0ZW1wbGF0ZVxuICBpZiAobm9kZS50YWdOYW1lID09PSAnU0NSSVBUJykge1xuICAgIHJldHVybiBzdHJpbmdUb0ZyYWdtZW50KG5vZGUudGV4dENvbnRlbnQpO1xuICB9XG4gIC8vIG5vcm1hbCBub2RlLCBjbG9uZSBpdCB0byBhdm9pZCBtdXRhdGluZyB0aGUgb3JpZ2luYWxcbiAgdmFyIGNsb25lZE5vZGUgPSBjbG9uZU5vZGUobm9kZSk7XG4gIHZhciBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICB2YXIgY2hpbGQ7XG4gIC8qIGVzbGludC1kaXNhYmxlIG5vLWNvbmQtYXNzaWduICovXG4gIHdoaWxlIChjaGlsZCA9IGNsb25lZE5vZGUuZmlyc3RDaGlsZCkge1xuICAgIC8qIGVzbGludC1lbmFibGUgbm8tY29uZC1hc3NpZ24gKi9cbiAgICBmcmFnLmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgfVxuICB0cmltTm9kZShmcmFnKTtcbiAgcmV0dXJuIGZyYWc7XG59XG5cbi8vIFRlc3QgZm9yIHRoZSBwcmVzZW5jZSBvZiB0aGUgU2FmYXJpIHRlbXBsYXRlIGNsb25pbmcgYnVnXG4vLyBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93dWcuY2dpP2lkPTEzNzc1NVxudmFyIGhhc0Jyb2tlblRlbXBsYXRlID0gKGZ1bmN0aW9uICgpIHtcbiAgLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cbiAgaWYgKGluQnJvd3Nlcikge1xuICAgIHZhciBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgYS5pbm5lckhUTUwgPSAnPHRlbXBsYXRlPjE8L3RlbXBsYXRlPic7XG4gICAgcmV0dXJuICFhLmNsb25lTm9kZSh0cnVlKS5maXJzdENoaWxkLmlubmVySFRNTDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pKCk7XG5cbi8vIFRlc3QgZm9yIElFMTAvMTEgdGV4dGFyZWEgcGxhY2Vob2xkZXIgY2xvbmUgYnVnXG52YXIgaGFzVGV4dGFyZWFDbG9uZUJ1ZyA9IChmdW5jdGlvbiAoKSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmIChpbkJyb3dzZXIpIHtcbiAgICB2YXIgdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJyk7XG4gICAgdC5wbGFjZWhvbGRlciA9ICd0JztcbiAgICByZXR1cm4gdC5jbG9uZU5vZGUodHJ1ZSkudmFsdWUgPT09ICd0JztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pKCk7XG5cbi8qKlxuICogMS4gRGVhbCB3aXRoIFNhZmFyaSBjbG9uaW5nIG5lc3RlZCA8dGVtcGxhdGU+IGJ1ZyBieVxuICogICAgbWFudWFsbHkgY2xvbmluZyBhbGwgdGVtcGxhdGUgaW5zdGFuY2VzLlxuICogMi4gRGVhbCB3aXRoIElFMTAvMTEgdGV4dGFyZWEgcGxhY2Vob2xkZXIgYnVnIGJ5IHNldHRpbmdcbiAqICAgIHRoZSBjb3JyZWN0IHZhbHVlIGFmdGVyIGNsb25pbmcuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fERvY3VtZW50RnJhZ21lbnR9IG5vZGVcbiAqIEByZXR1cm4ge0VsZW1lbnR8RG9jdW1lbnRGcmFnbWVudH1cbiAqL1xuXG5mdW5jdGlvbiBjbG9uZU5vZGUobm9kZSkge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYgKCFub2RlLnF1ZXJ5U2VsZWN0b3JBbGwpIHtcbiAgICByZXR1cm4gbm9kZS5jbG9uZU5vZGUoKTtcbiAgfVxuICB2YXIgcmVzID0gbm9kZS5jbG9uZU5vZGUodHJ1ZSk7XG4gIHZhciBpLCBvcmlnaW5hbCwgY2xvbmVkO1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYgKGhhc0Jyb2tlblRlbXBsYXRlKSB7XG4gICAgdmFyIHRlbXBDbG9uZSA9IHJlcztcbiAgICBpZiAoaXNSZWFsVGVtcGxhdGUobm9kZSkpIHtcbiAgICAgIG5vZGUgPSBub2RlLmNvbnRlbnQ7XG4gICAgICB0ZW1wQ2xvbmUgPSByZXMuY29udGVudDtcbiAgICB9XG4gICAgb3JpZ2luYWwgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ3RlbXBsYXRlJyk7XG4gICAgaWYgKG9yaWdpbmFsLmxlbmd0aCkge1xuICAgICAgY2xvbmVkID0gdGVtcENsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoJ3RlbXBsYXRlJyk7XG4gICAgICBpID0gY2xvbmVkLmxlbmd0aDtcbiAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgY2xvbmVkW2ldLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGNsb25lTm9kZShvcmlnaW5hbFtpXSksIGNsb25lZFtpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICBpZiAoaGFzVGV4dGFyZWFDbG9uZUJ1Zykge1xuICAgIGlmIChub2RlLnRhZ05hbWUgPT09ICdURVhUQVJFQScpIHtcbiAgICAgIHJlcy52YWx1ZSA9IG5vZGUudmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9yaWdpbmFsID0gbm9kZS5xdWVyeVNlbGVjdG9yQWxsKCd0ZXh0YXJlYScpO1xuICAgICAgaWYgKG9yaWdpbmFsLmxlbmd0aCkge1xuICAgICAgICBjbG9uZWQgPSByZXMucXVlcnlTZWxlY3RvckFsbCgndGV4dGFyZWEnKTtcbiAgICAgICAgaSA9IGNsb25lZC5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICBjbG9uZWRbaV0udmFsdWUgPSBvcmlnaW5hbFtpXS52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG4vKipcbiAqIFByb2Nlc3MgdGhlIHRlbXBsYXRlIG9wdGlvbiBhbmQgbm9ybWFsaXplcyBpdCBpbnRvIGFcbiAqIGEgRG9jdW1lbnRGcmFnbWVudCB0aGF0IGNhbiBiZSB1c2VkIGFzIGEgcGFydGlhbCBvciBhXG4gKiBpbnN0YW5jZSB0ZW1wbGF0ZS5cbiAqXG4gKiBAcGFyYW0geyp9IHRlbXBsYXRlXG4gKiAgICAgICAgUG9zc2libGUgdmFsdWVzIGluY2x1ZGU6XG4gKiAgICAgICAgLSBEb2N1bWVudEZyYWdtZW50IG9iamVjdFxuICogICAgICAgIC0gTm9kZSBvYmplY3Qgb2YgdHlwZSBUZW1wbGF0ZVxuICogICAgICAgIC0gaWQgc2VsZWN0b3I6ICcjc29tZS10ZW1wbGF0ZS1pZCdcbiAqICAgICAgICAtIHRlbXBsYXRlIHN0cmluZzogJzxkaXY+PHNwYW4+e3ttc2d9fTwvc3Bhbj48L2Rpdj4nXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHNob3VsZENsb25lXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHJhd1xuICogICAgICAgIGlubGluZSBIVE1MIGludGVycG9sYXRpb24uIERvIG5vdCBjaGVjayBmb3IgaWRcbiAqICAgICAgICBzZWxlY3RvciBhbmQga2VlcCB3aGl0ZXNwYWNlIGluIHRoZSBzdHJpbmcuXG4gKiBAcmV0dXJuIHtEb2N1bWVudEZyYWdtZW50fHVuZGVmaW5lZH1cbiAqL1xuXG5mdW5jdGlvbiBwYXJzZVRlbXBsYXRlKHRlbXBsYXRlLCBzaG91bGRDbG9uZSwgcmF3KSB7XG4gIHZhciBub2RlLCBmcmFnO1xuXG4gIC8vIGlmIHRoZSB0ZW1wbGF0ZSBpcyBhbHJlYWR5IGEgZG9jdW1lbnQgZnJhZ21lbnQsXG4gIC8vIGRvIG5vdGhpbmdcbiAgaWYgKGlzRnJhZ21lbnQodGVtcGxhdGUpKSB7XG4gICAgdHJpbU5vZGUodGVtcGxhdGUpO1xuICAgIHJldHVybiBzaG91bGRDbG9uZSA/IGNsb25lTm9kZSh0ZW1wbGF0ZSkgOiB0ZW1wbGF0ZTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdGVtcGxhdGUgPT09ICdzdHJpbmcnKSB7XG4gICAgLy8gaWQgc2VsZWN0b3JcbiAgICBpZiAoIXJhdyAmJiB0ZW1wbGF0ZS5jaGFyQXQoMCkgPT09ICcjJykge1xuICAgICAgLy8gaWQgc2VsZWN0b3IgY2FuIGJlIGNhY2hlZCB0b29cbiAgICAgIGZyYWcgPSBpZFNlbGVjdG9yQ2FjaGUuZ2V0KHRlbXBsYXRlKTtcbiAgICAgIGlmICghZnJhZykge1xuICAgICAgICBub2RlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGVtcGxhdGUuc2xpY2UoMSkpO1xuICAgICAgICBpZiAobm9kZSkge1xuICAgICAgICAgIGZyYWcgPSBub2RlVG9GcmFnbWVudChub2RlKTtcbiAgICAgICAgICAvLyBzYXZlIHNlbGVjdG9yIHRvIGNhY2hlXG4gICAgICAgICAgaWRTZWxlY3RvckNhY2hlLnB1dCh0ZW1wbGF0ZSwgZnJhZyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbm9ybWFsIHN0cmluZyB0ZW1wbGF0ZVxuICAgICAgZnJhZyA9IHN0cmluZ1RvRnJhZ21lbnQodGVtcGxhdGUsIHJhdyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHRlbXBsYXRlLm5vZGVUeXBlKSB7XG4gICAgLy8gYSBkaXJlY3Qgbm9kZVxuICAgIGZyYWcgPSBub2RlVG9GcmFnbWVudCh0ZW1wbGF0ZSk7XG4gIH1cblxuICByZXR1cm4gZnJhZyAmJiBzaG91bGRDbG9uZSA/IGNsb25lTm9kZShmcmFnKSA6IGZyYWc7XG59XG5cbnZhciB0ZW1wbGF0ZSA9IE9iamVjdC5mcmVlemUoe1xuICBjbG9uZU5vZGU6IGNsb25lTm9kZSxcbiAgcGFyc2VUZW1wbGF0ZTogcGFyc2VUZW1wbGF0ZVxufSk7XG5cbnZhciBodG1sID0ge1xuXG4gIGJpbmQ6IGZ1bmN0aW9uIGJpbmQoKSB7XG4gICAgLy8gYSBjb21tZW50IG5vZGUgbWVhbnMgdGhpcyBpcyBhIGJpbmRpbmcgZm9yXG4gICAgLy8ge3t7IGlubGluZSB1bmVzY2FwZWQgaHRtbCB9fX1cbiAgICBpZiAodGhpcy5lbC5ub2RlVHlwZSA9PT0gOCkge1xuICAgICAgLy8gaG9sZCBub2Rlc1xuICAgICAgdGhpcy5ub2RlcyA9IFtdO1xuICAgICAgLy8gcmVwbGFjZSB0aGUgcGxhY2Vob2xkZXIgd2l0aCBwcm9wZXIgYW5jaG9yXG4gICAgICB0aGlzLmFuY2hvciA9IGNyZWF0ZUFuY2hvcigndi1odG1sJyk7XG4gICAgICByZXBsYWNlKHRoaXMuZWwsIHRoaXMuYW5jaG9yKTtcbiAgICB9XG4gIH0sXG5cbiAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUodmFsdWUpIHtcbiAgICB2YWx1ZSA9IF90b1N0cmluZyh2YWx1ZSk7XG4gICAgaWYgKHRoaXMubm9kZXMpIHtcbiAgICAgIHRoaXMuc3dhcCh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWwuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgfVxuICB9LFxuXG4gIHN3YXA6IGZ1bmN0aW9uIHN3YXAodmFsdWUpIHtcbiAgICAvLyByZW1vdmUgb2xkIG5vZGVzXG4gICAgdmFyIGkgPSB0aGlzLm5vZGVzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICByZW1vdmUodGhpcy5ub2Rlc1tpXSk7XG4gICAgfVxuICAgIC8vIGNvbnZlcnQgbmV3IHZhbHVlIHRvIGEgZnJhZ21lbnRcbiAgICAvLyBkbyBub3QgYXR0ZW1wdCB0byByZXRyaWV2ZSBmcm9tIGlkIHNlbGVjdG9yXG4gICAgdmFyIGZyYWcgPSBwYXJzZVRlbXBsYXRlKHZhbHVlLCB0cnVlLCB0cnVlKTtcbiAgICAvLyBzYXZlIGEgcmVmZXJlbmNlIHRvIHRoZXNlIG5vZGVzIHNvIHdlIGNhbiByZW1vdmUgbGF0ZXJcbiAgICB0aGlzLm5vZGVzID0gdG9BcnJheShmcmFnLmNoaWxkTm9kZXMpO1xuICAgIGJlZm9yZShmcmFnLCB0aGlzLmFuY2hvcik7XG4gIH1cbn07XG5cbi8qKlxuICogQWJzdHJhY3Rpb24gZm9yIGEgcGFydGlhbGx5LWNvbXBpbGVkIGZyYWdtZW50LlxuICogQ2FuIG9wdGlvbmFsbHkgY29tcGlsZSBjb250ZW50IHdpdGggYSBjaGlsZCBzY29wZS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaW5rZXJcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtEb2N1bWVudEZyYWdtZW50fSBmcmFnXG4gKiBAcGFyYW0ge1Z1ZX0gW2hvc3RdXG4gKiBAcGFyYW0ge09iamVjdH0gW3Njb3BlXVxuICovXG5mdW5jdGlvbiBGcmFnbWVudChsaW5rZXIsIHZtLCBmcmFnLCBob3N0LCBzY29wZSwgcGFyZW50RnJhZykge1xuICB0aGlzLmNoaWxkcmVuID0gW107XG4gIHRoaXMuY2hpbGRGcmFncyA9IFtdO1xuICB0aGlzLnZtID0gdm07XG4gIHRoaXMuc2NvcGUgPSBzY29wZTtcbiAgdGhpcy5pbnNlcnRlZCA9IGZhbHNlO1xuICB0aGlzLnBhcmVudEZyYWcgPSBwYXJlbnRGcmFnO1xuICBpZiAocGFyZW50RnJhZykge1xuICAgIHBhcmVudEZyYWcuY2hpbGRGcmFncy5wdXNoKHRoaXMpO1xuICB9XG4gIHRoaXMudW5saW5rID0gbGlua2VyKHZtLCBmcmFnLCBob3N0LCBzY29wZSwgdGhpcyk7XG4gIHZhciBzaW5nbGUgPSB0aGlzLnNpbmdsZSA9IGZyYWcuY2hpbGROb2Rlcy5sZW5ndGggPT09IDEgJiZcbiAgLy8gZG8gbm90IGdvIHNpbmdsZSBtb2RlIGlmIHRoZSBvbmx5IG5vZGUgaXMgYW4gYW5jaG9yXG4gICFmcmFnLmNoaWxkTm9kZXNbMF0uX192X2FuY2hvcjtcbiAgaWYgKHNpbmdsZSkge1xuICAgIHRoaXMubm9kZSA9IGZyYWcuY2hpbGROb2Rlc1swXTtcbiAgICB0aGlzLmJlZm9yZSA9IHNpbmdsZUJlZm9yZTtcbiAgICB0aGlzLnJlbW92ZSA9IHNpbmdsZVJlbW92ZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm5vZGUgPSBjcmVhdGVBbmNob3IoJ2ZyYWdtZW50LXN0YXJ0Jyk7XG4gICAgdGhpcy5lbmQgPSBjcmVhdGVBbmNob3IoJ2ZyYWdtZW50LWVuZCcpO1xuICAgIHRoaXMuZnJhZyA9IGZyYWc7XG4gICAgcHJlcGVuZCh0aGlzLm5vZGUsIGZyYWcpO1xuICAgIGZyYWcuYXBwZW5kQ2hpbGQodGhpcy5lbmQpO1xuICAgIHRoaXMuYmVmb3JlID0gbXVsdGlCZWZvcmU7XG4gICAgdGhpcy5yZW1vdmUgPSBtdWx0aVJlbW92ZTtcbiAgfVxuICB0aGlzLm5vZGUuX192X2ZyYWcgPSB0aGlzO1xufVxuXG4vKipcbiAqIENhbGwgYXR0YWNoL2RldGFjaCBmb3IgYWxsIGNvbXBvbmVudHMgY29udGFpbmVkIHdpdGhpblxuICogdGhpcyBmcmFnbWVudC4gQWxzbyBkbyBzbyByZWN1cnNpdmVseSBmb3IgYWxsIGNoaWxkXG4gKiBmcmFnbWVudHMuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gaG9va1xuICovXG5cbkZyYWdtZW50LnByb3RvdHlwZS5jYWxsSG9vayA9IGZ1bmN0aW9uIChob29rKSB7XG4gIHZhciBpLCBsO1xuICBmb3IgKGkgPSAwLCBsID0gdGhpcy5jaGlsZEZyYWdzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIHRoaXMuY2hpbGRGcmFnc1tpXS5jYWxsSG9vayhob29rKTtcbiAgfVxuICBmb3IgKGkgPSAwLCBsID0gdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBob29rKHRoaXMuY2hpbGRyZW5baV0pO1xuICB9XG59O1xuXG4vKipcbiAqIEluc2VydCBmcmFnbWVudCBiZWZvcmUgdGFyZ2V0LCBzaW5nbGUgbm9kZSB2ZXJzaW9uXG4gKlxuICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gd2l0aFRyYW5zaXRpb25cbiAqL1xuXG5mdW5jdGlvbiBzaW5nbGVCZWZvcmUodGFyZ2V0LCB3aXRoVHJhbnNpdGlvbikge1xuICB0aGlzLmluc2VydGVkID0gdHJ1ZTtcbiAgdmFyIG1ldGhvZCA9IHdpdGhUcmFuc2l0aW9uICE9PSBmYWxzZSA/IGJlZm9yZVdpdGhUcmFuc2l0aW9uIDogYmVmb3JlO1xuICBtZXRob2QodGhpcy5ub2RlLCB0YXJnZXQsIHRoaXMudm0pO1xuICBpZiAoaW5Eb2ModGhpcy5ub2RlKSkge1xuICAgIHRoaXMuY2FsbEhvb2soYXR0YWNoKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbW92ZSBmcmFnbWVudCwgc2luZ2xlIG5vZGUgdmVyc2lvblxuICovXG5cbmZ1bmN0aW9uIHNpbmdsZVJlbW92ZSgpIHtcbiAgdGhpcy5pbnNlcnRlZCA9IGZhbHNlO1xuICB2YXIgc2hvdWxkQ2FsbFJlbW92ZSA9IGluRG9jKHRoaXMubm9kZSk7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5iZWZvcmVSZW1vdmUoKTtcbiAgcmVtb3ZlV2l0aFRyYW5zaXRpb24odGhpcy5ub2RlLCB0aGlzLnZtLCBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHNob3VsZENhbGxSZW1vdmUpIHtcbiAgICAgIHNlbGYuY2FsbEhvb2soZGV0YWNoKTtcbiAgICB9XG4gICAgc2VsZi5kZXN0cm95KCk7XG4gIH0pO1xufVxuXG4vKipcbiAqIEluc2VydCBmcmFnbWVudCBiZWZvcmUgdGFyZ2V0LCBtdWx0aS1ub2RlcyB2ZXJzaW9uXG4gKlxuICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gd2l0aFRyYW5zaXRpb25cbiAqL1xuXG5mdW5jdGlvbiBtdWx0aUJlZm9yZSh0YXJnZXQsIHdpdGhUcmFuc2l0aW9uKSB7XG4gIHRoaXMuaW5zZXJ0ZWQgPSB0cnVlO1xuICB2YXIgdm0gPSB0aGlzLnZtO1xuICB2YXIgbWV0aG9kID0gd2l0aFRyYW5zaXRpb24gIT09IGZhbHNlID8gYmVmb3JlV2l0aFRyYW5zaXRpb24gOiBiZWZvcmU7XG4gIG1hcE5vZGVSYW5nZSh0aGlzLm5vZGUsIHRoaXMuZW5kLCBmdW5jdGlvbiAobm9kZSkge1xuICAgIG1ldGhvZChub2RlLCB0YXJnZXQsIHZtKTtcbiAgfSk7XG4gIGlmIChpbkRvYyh0aGlzLm5vZGUpKSB7XG4gICAgdGhpcy5jYWxsSG9vayhhdHRhY2gpO1xuICB9XG59XG5cbi8qKlxuICogUmVtb3ZlIGZyYWdtZW50LCBtdWx0aS1ub2RlcyB2ZXJzaW9uXG4gKi9cblxuZnVuY3Rpb24gbXVsdGlSZW1vdmUoKSB7XG4gIHRoaXMuaW5zZXJ0ZWQgPSBmYWxzZTtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgc2hvdWxkQ2FsbFJlbW92ZSA9IGluRG9jKHRoaXMubm9kZSk7XG4gIHRoaXMuYmVmb3JlUmVtb3ZlKCk7XG4gIHJlbW92ZU5vZGVSYW5nZSh0aGlzLm5vZGUsIHRoaXMuZW5kLCB0aGlzLnZtLCB0aGlzLmZyYWcsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoc2hvdWxkQ2FsbFJlbW92ZSkge1xuICAgICAgc2VsZi5jYWxsSG9vayhkZXRhY2gpO1xuICAgIH1cbiAgICBzZWxmLmRlc3Ryb3koKTtcbiAgfSk7XG59XG5cbi8qKlxuICogUHJlcGFyZSB0aGUgZnJhZ21lbnQgZm9yIHJlbW92YWwuXG4gKi9cblxuRnJhZ21lbnQucHJvdG90eXBlLmJlZm9yZVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGksIGw7XG4gIGZvciAoaSA9IDAsIGwgPSB0aGlzLmNoaWxkRnJhZ3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgLy8gY2FsbCB0aGUgc2FtZSBtZXRob2QgcmVjdXJzaXZlbHkgb24gY2hpbGRcbiAgICAvLyBmcmFnbWVudHMsIGRlcHRoLWZpcnN0XG4gICAgdGhpcy5jaGlsZEZyYWdzW2ldLmJlZm9yZVJlbW92ZShmYWxzZSk7XG4gIH1cbiAgZm9yIChpID0gMCwgbCA9IHRoaXMuY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgLy8gQ2FsbCBkZXN0cm95IGZvciBhbGwgY29udGFpbmVkIGluc3RhbmNlcyxcbiAgICAvLyB3aXRoIHJlbW92ZTpmYWxzZSBhbmQgZGVmZXI6dHJ1ZS5cbiAgICAvLyBEZWZlciBpcyBuZWNlc3NhcnkgYmVjYXVzZSB3ZSBuZWVkIHRvXG4gICAgLy8ga2VlcCB0aGUgY2hpbGRyZW4gdG8gY2FsbCBkZXRhY2ggaG9va3NcbiAgICAvLyBvbiB0aGVtLlxuICAgIHRoaXMuY2hpbGRyZW5baV0uJGRlc3Ryb3koZmFsc2UsIHRydWUpO1xuICB9XG4gIHZhciBkaXJzID0gdGhpcy51bmxpbmsuZGlycztcbiAgZm9yIChpID0gMCwgbCA9IGRpcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgLy8gZGlzYWJsZSB0aGUgd2F0Y2hlcnMgb24gYWxsIHRoZSBkaXJlY3RpdmVzXG4gICAgLy8gc28gdGhhdCB0aGUgcmVuZGVyZWQgY29udGVudCBzdGF5cyB0aGUgc2FtZVxuICAgIC8vIGR1cmluZyByZW1vdmFsLlxuICAgIGRpcnNbaV0uX3dhdGNoZXIgJiYgZGlyc1tpXS5fd2F0Y2hlci50ZWFyZG93bigpO1xuICB9XG59O1xuXG4vKipcbiAqIERlc3Ryb3kgdGhlIGZyYWdtZW50LlxuICovXG5cbkZyYWdtZW50LnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5wYXJlbnRGcmFnKSB7XG4gICAgdGhpcy5wYXJlbnRGcmFnLmNoaWxkRnJhZ3MuJHJlbW92ZSh0aGlzKTtcbiAgfVxuICB0aGlzLm5vZGUuX192X2ZyYWcgPSBudWxsO1xuICB0aGlzLnVubGluaygpO1xufTtcblxuLyoqXG4gKiBDYWxsIGF0dGFjaCBob29rIGZvciBhIFZ1ZSBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0ge1Z1ZX0gY2hpbGRcbiAqL1xuXG5mdW5jdGlvbiBhdHRhY2goY2hpbGQpIHtcbiAgaWYgKCFjaGlsZC5faXNBdHRhY2hlZCAmJiBpbkRvYyhjaGlsZC4kZWwpKSB7XG4gICAgY2hpbGQuX2NhbGxIb29rKCdhdHRhY2hlZCcpO1xuICB9XG59XG5cbi8qKlxuICogQ2FsbCBkZXRhY2ggaG9vayBmb3IgYSBWdWUgaW5zdGFuY2UuXG4gKlxuICogQHBhcmFtIHtWdWV9IGNoaWxkXG4gKi9cblxuZnVuY3Rpb24gZGV0YWNoKGNoaWxkKSB7XG4gIGlmIChjaGlsZC5faXNBdHRhY2hlZCAmJiAhaW5Eb2MoY2hpbGQuJGVsKSkge1xuICAgIGNoaWxkLl9jYWxsSG9vaygnZGV0YWNoZWQnKTtcbiAgfVxufVxuXG52YXIgbGlua2VyQ2FjaGUgPSBuZXcgQ2FjaGUoNTAwMCk7XG5cbi8qKlxuICogQSBmYWN0b3J5IHRoYXQgY2FuIGJlIHVzZWQgdG8gY3JlYXRlIGluc3RhbmNlcyBvZiBhXG4gKiBmcmFnbWVudC4gQ2FjaGVzIHRoZSBjb21waWxlZCBsaW5rZXIgaWYgcG9zc2libGUuXG4gKlxuICogQHBhcmFtIHtWdWV9IHZtXG4gKiBAcGFyYW0ge0VsZW1lbnR8U3RyaW5nfSBlbFxuICovXG5mdW5jdGlvbiBGcmFnbWVudEZhY3Rvcnkodm0sIGVsKSB7XG4gIHRoaXMudm0gPSB2bTtcbiAgdmFyIHRlbXBsYXRlO1xuICB2YXIgaXNTdHJpbmcgPSB0eXBlb2YgZWwgPT09ICdzdHJpbmcnO1xuICBpZiAoaXNTdHJpbmcgfHwgaXNUZW1wbGF0ZShlbCkpIHtcbiAgICB0ZW1wbGF0ZSA9IHBhcnNlVGVtcGxhdGUoZWwsIHRydWUpO1xuICB9IGVsc2Uge1xuICAgIHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIHRlbXBsYXRlLmFwcGVuZENoaWxkKGVsKTtcbiAgfVxuICB0aGlzLnRlbXBsYXRlID0gdGVtcGxhdGU7XG4gIC8vIGxpbmtlciBjYW4gYmUgY2FjaGVkLCBidXQgb25seSBmb3IgY29tcG9uZW50c1xuICB2YXIgbGlua2VyO1xuICB2YXIgY2lkID0gdm0uY29uc3RydWN0b3IuY2lkO1xuICBpZiAoY2lkID4gMCkge1xuICAgIHZhciBjYWNoZUlkID0gY2lkICsgKGlzU3RyaW5nID8gZWwgOiBnZXRPdXRlckhUTUwoZWwpKTtcbiAgICBsaW5rZXIgPSBsaW5rZXJDYWNoZS5nZXQoY2FjaGVJZCk7XG4gICAgaWYgKCFsaW5rZXIpIHtcbiAgICAgIGxpbmtlciA9IGNvbXBpbGUodGVtcGxhdGUsIHZtLiRvcHRpb25zLCB0cnVlKTtcbiAgICAgIGxpbmtlckNhY2hlLnB1dChjYWNoZUlkLCBsaW5rZXIpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsaW5rZXIgPSBjb21waWxlKHRlbXBsYXRlLCB2bS4kb3B0aW9ucywgdHJ1ZSk7XG4gIH1cbiAgdGhpcy5saW5rZXIgPSBsaW5rZXI7XG59XG5cbi8qKlxuICogQ3JlYXRlIGEgZnJhZ21lbnQgaW5zdGFuY2Ugd2l0aCBnaXZlbiBob3N0IGFuZCBzY29wZS5cbiAqXG4gKiBAcGFyYW0ge1Z1ZX0gaG9zdFxuICogQHBhcmFtIHtPYmplY3R9IHNjb3BlXG4gKiBAcGFyYW0ge0ZyYWdtZW50fSBwYXJlbnRGcmFnXG4gKi9cblxuRnJhZ21lbnRGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAoaG9zdCwgc2NvcGUsIHBhcmVudEZyYWcpIHtcbiAgdmFyIGZyYWcgPSBjbG9uZU5vZGUodGhpcy50ZW1wbGF0ZSk7XG4gIHJldHVybiBuZXcgRnJhZ21lbnQodGhpcy5saW5rZXIsIHRoaXMudm0sIGZyYWcsIGhvc3QsIHNjb3BlLCBwYXJlbnRGcmFnKTtcbn07XG5cbnZhciBPTiA9IDcwMDtcbnZhciBNT0RFTCA9IDgwMDtcbnZhciBCSU5EID0gODUwO1xudmFyIFRSQU5TSVRJT04gPSAxMTAwO1xudmFyIEVMID0gMTUwMDtcbnZhciBDT01QT05FTlQgPSAxNTAwO1xudmFyIFBBUlRJQUwgPSAxNzUwO1xudmFyIEZPUiA9IDIwMDA7XG52YXIgSUYgPSAyMDAwO1xudmFyIFNMT1QgPSAyMTAwO1xuXG52YXIgdWlkJDMgPSAwO1xuXG52YXIgdkZvciA9IHtcblxuICBwcmlvcml0eTogRk9SLFxuXG4gIHBhcmFtczogWyd0cmFjay1ieScsICdzdGFnZ2VyJywgJ2VudGVyLXN0YWdnZXInLCAnbGVhdmUtc3RhZ2dlciddLFxuXG4gIGJpbmQ6IGZ1bmN0aW9uIGJpbmQoKSB7XG4gICAgLy8gc3VwcG9ydCBcIml0ZW0gaW4vb2YgaXRlbXNcIiBzeW50YXhcbiAgICB2YXIgaW5NYXRjaCA9IHRoaXMuZXhwcmVzc2lvbi5tYXRjaCgvKC4qKSAoPzppbnxvZikgKC4qKS8pO1xuICAgIGlmIChpbk1hdGNoKSB7XG4gICAgICB2YXIgaXRNYXRjaCA9IGluTWF0Y2hbMV0ubWF0Y2goL1xcKCguKiksKC4qKVxcKS8pO1xuICAgICAgaWYgKGl0TWF0Y2gpIHtcbiAgICAgICAgdGhpcy5pdGVyYXRvciA9IGl0TWF0Y2hbMV0udHJpbSgpO1xuICAgICAgICB0aGlzLmFsaWFzID0gaXRNYXRjaFsyXS50cmltKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFsaWFzID0gaW5NYXRjaFsxXS50cmltKCk7XG4gICAgICB9XG4gICAgICB0aGlzLmV4cHJlc3Npb24gPSBpbk1hdGNoWzJdO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5hbGlhcykge1xuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiB3YXJuKCdBbGlhcyBpcyByZXF1aXJlZCBpbiB2LWZvci4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyB1aWQgYXMgYSBjYWNoZSBpZGVudGlmaWVyXG4gICAgdGhpcy5pZCA9ICdfX3YtZm9yX18nICsgKyt1aWQkMztcblxuICAgIC8vIGNoZWNrIGlmIHRoaXMgaXMgYW4gb3B0aW9uIGxpc3QsXG4gICAgLy8gc28gdGhhdCB3ZSBrbm93IGlmIHdlIG5lZWQgdG8gdXBkYXRlIHRoZSA8c2VsZWN0PidzXG4gICAgLy8gdi1tb2RlbCB3aGVuIHRoZSBvcHRpb24gbGlzdCBoYXMgY2hhbmdlZC5cbiAgICAvLyBiZWNhdXNlIHYtbW9kZWwgaGFzIGEgbG93ZXIgcHJpb3JpdHkgdGhhbiB2LWZvcixcbiAgICAvLyB0aGUgdi1tb2RlbCBpcyBub3QgYm91bmQgaGVyZSB5ZXQsIHNvIHdlIGhhdmUgdG9cbiAgICAvLyByZXRyaXZlIGl0IGluIHRoZSBhY3R1YWwgdXBkYXRlTW9kZWwoKSBmdW5jdGlvbi5cbiAgICB2YXIgdGFnID0gdGhpcy5lbC50YWdOYW1lO1xuICAgIHRoaXMuaXNPcHRpb24gPSAodGFnID09PSAnT1BUSU9OJyB8fCB0YWcgPT09ICdPUFRHUk9VUCcpICYmIHRoaXMuZWwucGFyZW50Tm9kZS50YWdOYW1lID09PSAnU0VMRUNUJztcblxuICAgIC8vIHNldHVwIGFuY2hvciBub2Rlc1xuICAgIHRoaXMuc3RhcnQgPSBjcmVhdGVBbmNob3IoJ3YtZm9yLXN0YXJ0Jyk7XG4gICAgdGhpcy5lbmQgPSBjcmVhdGVBbmNob3IoJ3YtZm9yLWVuZCcpO1xuICAgIHJlcGxhY2UodGhpcy5lbCwgdGhpcy5lbmQpO1xuICAgIGJlZm9yZSh0aGlzLnN0YXJ0LCB0aGlzLmVuZCk7XG5cbiAgICAvLyBjYWNoZVxuICAgIHRoaXMuY2FjaGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgLy8gZnJhZ21lbnQgZmFjdG9yeVxuICAgIHRoaXMuZmFjdG9yeSA9IG5ldyBGcmFnbWVudEZhY3RvcnkodGhpcy52bSwgdGhpcy5lbCk7XG4gIH0sXG5cbiAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUoZGF0YSkge1xuICAgIHRoaXMuZGlmZihkYXRhKTtcbiAgICB0aGlzLnVwZGF0ZVJlZigpO1xuICAgIHRoaXMudXBkYXRlTW9kZWwoKTtcbiAgfSxcblxuICAvKipcbiAgICogRGlmZiwgYmFzZWQgb24gbmV3IGRhdGEgYW5kIG9sZCBkYXRhLCBkZXRlcm1pbmUgdGhlXG4gICAqIG1pbmltdW0gYW1vdW50IG9mIERPTSBtYW5pcHVsYXRpb25zIG5lZWRlZCB0byBtYWtlIHRoZVxuICAgKiBET00gcmVmbGVjdCB0aGUgbmV3IGRhdGEgQXJyYXkuXG4gICAqXG4gICAqIFRoZSBhbGdvcml0aG0gZGlmZnMgdGhlIG5ldyBkYXRhIEFycmF5IGJ5IHN0b3JpbmcgYVxuICAgKiBoaWRkZW4gcmVmZXJlbmNlIHRvIGFuIG93bmVyIHZtIGluc3RhbmNlIG9uIHByZXZpb3VzbHlcbiAgICogc2VlbiBkYXRhLiBUaGlzIGFsbG93cyB1cyB0byBhY2hpZXZlIE8obikgd2hpY2ggaXNcbiAgICogYmV0dGVyIHRoYW4gYSBsZXZlbnNodGVpbiBkaXN0YW5jZSBiYXNlZCBhbGdvcml0aG0sXG4gICAqIHdoaWNoIGlzIE8obSAqIG4pLlxuICAgKlxuICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhXG4gICAqL1xuXG4gIGRpZmY6IGZ1bmN0aW9uIGRpZmYoZGF0YSkge1xuICAgIC8vIGNoZWNrIGlmIHRoZSBBcnJheSB3YXMgY29udmVydGVkIGZyb20gYW4gT2JqZWN0XG4gICAgdmFyIGl0ZW0gPSBkYXRhWzBdO1xuICAgIHZhciBjb252ZXJ0ZWRGcm9tT2JqZWN0ID0gdGhpcy5mcm9tT2JqZWN0ID0gaXNPYmplY3QoaXRlbSkgJiYgaGFzT3duKGl0ZW0sICcka2V5JykgJiYgaGFzT3duKGl0ZW0sICckdmFsdWUnKTtcblxuICAgIHZhciB0cmFja0J5S2V5ID0gdGhpcy5wYXJhbXMudHJhY2tCeTtcbiAgICB2YXIgb2xkRnJhZ3MgPSB0aGlzLmZyYWdzO1xuICAgIHZhciBmcmFncyA9IHRoaXMuZnJhZ3MgPSBuZXcgQXJyYXkoZGF0YS5sZW5ndGgpO1xuICAgIHZhciBhbGlhcyA9IHRoaXMuYWxpYXM7XG4gICAgdmFyIGl0ZXJhdG9yID0gdGhpcy5pdGVyYXRvcjtcbiAgICB2YXIgc3RhcnQgPSB0aGlzLnN0YXJ0O1xuICAgIHZhciBlbmQgPSB0aGlzLmVuZDtcbiAgICB2YXIgaW5Eb2N1bWVudCA9IGluRG9jKHN0YXJ0KTtcbiAgICB2YXIgaW5pdCA9ICFvbGRGcmFncztcbiAgICB2YXIgaSwgbCwgZnJhZywga2V5LCB2YWx1ZSwgcHJpbWl0aXZlO1xuXG4gICAgLy8gRmlyc3QgcGFzcywgZ28gdGhyb3VnaCB0aGUgbmV3IEFycmF5IGFuZCBmaWxsIHVwXG4gICAgLy8gdGhlIG5ldyBmcmFncyBhcnJheS4gSWYgYSBwaWVjZSBvZiBkYXRhIGhhcyBhIGNhY2hlZFxuICAgIC8vIGluc3RhbmNlIGZvciBpdCwgd2UgcmV1c2UgaXQuIE90aGVyd2lzZSBidWlsZCBhIG5ld1xuICAgIC8vIGluc3RhbmNlLlxuICAgIGZvciAoaSA9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgaXRlbSA9IGRhdGFbaV07XG4gICAgICBrZXkgPSBjb252ZXJ0ZWRGcm9tT2JqZWN0ID8gaXRlbS4ka2V5IDogbnVsbDtcbiAgICAgIHZhbHVlID0gY29udmVydGVkRnJvbU9iamVjdCA/IGl0ZW0uJHZhbHVlIDogaXRlbTtcbiAgICAgIHByaW1pdGl2ZSA9ICFpc09iamVjdCh2YWx1ZSk7XG4gICAgICBmcmFnID0gIWluaXQgJiYgdGhpcy5nZXRDYWNoZWRGcmFnKHZhbHVlLCBpLCBrZXkpO1xuICAgICAgaWYgKGZyYWcpIHtcbiAgICAgICAgLy8gcmV1c2FibGUgZnJhZ21lbnRcbiAgICAgICAgZnJhZy5yZXVzZWQgPSB0cnVlO1xuICAgICAgICAvLyB1cGRhdGUgJGluZGV4XG4gICAgICAgIGZyYWcuc2NvcGUuJGluZGV4ID0gaTtcbiAgICAgICAgLy8gdXBkYXRlICRrZXlcbiAgICAgICAgaWYgKGtleSkge1xuICAgICAgICAgIGZyYWcuc2NvcGUuJGtleSA9IGtleTtcbiAgICAgICAgfVxuICAgICAgICAvLyB1cGRhdGUgaXRlcmF0b3JcbiAgICAgICAgaWYgKGl0ZXJhdG9yKSB7XG4gICAgICAgICAgZnJhZy5zY29wZVtpdGVyYXRvcl0gPSBrZXkgIT09IG51bGwgPyBrZXkgOiBpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHVwZGF0ZSBkYXRhIGZvciB0cmFjay1ieSwgb2JqZWN0IHJlcGVhdCAmXG4gICAgICAgIC8vIHByaW1pdGl2ZSB2YWx1ZXMuXG4gICAgICAgIGlmICh0cmFja0J5S2V5IHx8IGNvbnZlcnRlZEZyb21PYmplY3QgfHwgcHJpbWl0aXZlKSB7XG4gICAgICAgICAgZnJhZy5zY29wZVthbGlhc10gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbmV3IGlzbnRhbmNlXG4gICAgICAgIGZyYWcgPSB0aGlzLmNyZWF0ZSh2YWx1ZSwgYWxpYXMsIGksIGtleSk7XG4gICAgICAgIGZyYWcuZnJlc2ggPSAhaW5pdDtcbiAgICAgIH1cbiAgICAgIGZyYWdzW2ldID0gZnJhZztcbiAgICAgIGlmIChpbml0KSB7XG4gICAgICAgIGZyYWcuYmVmb3JlKGVuZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gd2UncmUgZG9uZSBmb3IgdGhlIGluaXRpYWwgcmVuZGVyLlxuICAgIGlmIChpbml0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gU2Vjb25kIHBhc3MsIGdvIHRocm91Z2ggdGhlIG9sZCBmcmFnbWVudHMgYW5kXG4gICAgLy8gZGVzdHJveSB0aG9zZSB3aG8gYXJlIG5vdCByZXVzZWQgKGFuZCByZW1vdmUgdGhlbVxuICAgIC8vIGZyb20gY2FjaGUpXG4gICAgdmFyIHJlbW92YWxJbmRleCA9IDA7XG4gICAgdmFyIHRvdGFsUmVtb3ZlZCA9IG9sZEZyYWdzLmxlbmd0aCAtIGZyYWdzLmxlbmd0aDtcbiAgICAvLyB3aGVuIHJlbW92aW5nIGEgbGFyZ2UgbnVtYmVyIG9mIGZyYWdtZW50cywgd2F0Y2hlciByZW1vdmFsXG4gICAgLy8gdHVybnMgb3V0IHRvIGJlIGEgcGVyZiBib3R0bGVuZWNrLCBzbyB3ZSBiYXRjaCB0aGUgd2F0Y2hlclxuICAgIC8vIHJlbW92YWxzIGludG8gYSBzaW5nbGUgZmlsdGVyIGNhbGwhXG4gICAgdGhpcy52bS5fdkZvclJlbW92aW5nID0gdHJ1ZTtcbiAgICBmb3IgKGkgPSAwLCBsID0gb2xkRnJhZ3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBmcmFnID0gb2xkRnJhZ3NbaV07XG4gICAgICBpZiAoIWZyYWcucmV1c2VkKSB7XG4gICAgICAgIHRoaXMuZGVsZXRlQ2FjaGVkRnJhZyhmcmFnKTtcbiAgICAgICAgdGhpcy5yZW1vdmUoZnJhZywgcmVtb3ZhbEluZGV4KyssIHRvdGFsUmVtb3ZlZCwgaW5Eb2N1bWVudCk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMudm0uX3ZGb3JSZW1vdmluZyA9IGZhbHNlO1xuICAgIGlmIChyZW1vdmFsSW5kZXgpIHtcbiAgICAgIHRoaXMudm0uX3dhdGNoZXJzID0gdGhpcy52bS5fd2F0Y2hlcnMuZmlsdGVyKGZ1bmN0aW9uICh3KSB7XG4gICAgICAgIHJldHVybiB3LmFjdGl2ZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEZpbmFsIHBhc3MsIG1vdmUvaW5zZXJ0IG5ldyBmcmFnbWVudHMgaW50byB0aGVcbiAgICAvLyByaWdodCBwbGFjZS5cbiAgICB2YXIgdGFyZ2V0UHJldiwgcHJldkVsLCBjdXJyZW50UHJldjtcbiAgICB2YXIgaW5zZXJ0aW9uSW5kZXggPSAwO1xuICAgIGZvciAoaSA9IDAsIGwgPSBmcmFncy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGZyYWcgPSBmcmFnc1tpXTtcbiAgICAgIC8vIHRoaXMgaXMgdGhlIGZyYWcgdGhhdCB3ZSBzaG91bGQgYmUgYWZ0ZXJcbiAgICAgIHRhcmdldFByZXYgPSBmcmFnc1tpIC0gMV07XG4gICAgICBwcmV2RWwgPSB0YXJnZXRQcmV2ID8gdGFyZ2V0UHJldi5zdGFnZ2VyQ2IgPyB0YXJnZXRQcmV2LnN0YWdnZXJBbmNob3IgOiB0YXJnZXRQcmV2LmVuZCB8fCB0YXJnZXRQcmV2Lm5vZGUgOiBzdGFydDtcbiAgICAgIGlmIChmcmFnLnJldXNlZCAmJiAhZnJhZy5zdGFnZ2VyQ2IpIHtcbiAgICAgICAgY3VycmVudFByZXYgPSBmaW5kUHJldkZyYWcoZnJhZywgc3RhcnQsIHRoaXMuaWQpO1xuICAgICAgICBpZiAoY3VycmVudFByZXYgIT09IHRhcmdldFByZXYgJiYgKCFjdXJyZW50UHJldiB8fFxuICAgICAgICAvLyBvcHRpbWl6YXRpb24gZm9yIG1vdmluZyBhIHNpbmdsZSBpdGVtLlxuICAgICAgICAvLyB0aGFua3MgdG8gc3VnZ2VzdGlvbnMgYnkgQGxpdm9yYXMgaW4gIzE4MDdcbiAgICAgICAgZmluZFByZXZGcmFnKGN1cnJlbnRQcmV2LCBzdGFydCwgdGhpcy5pZCkgIT09IHRhcmdldFByZXYpKSB7XG4gICAgICAgICAgdGhpcy5tb3ZlKGZyYWcsIHByZXZFbCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG5ldyBpbnN0YW5jZSwgb3Igc3RpbGwgaW4gc3RhZ2dlci5cbiAgICAgICAgLy8gaW5zZXJ0IHdpdGggdXBkYXRlZCBzdGFnZ2VyIGluZGV4LlxuICAgICAgICB0aGlzLmluc2VydChmcmFnLCBpbnNlcnRpb25JbmRleCsrLCBwcmV2RWwsIGluRG9jdW1lbnQpO1xuICAgICAgfVxuICAgICAgZnJhZy5yZXVzZWQgPSBmcmFnLmZyZXNoID0gZmFsc2U7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgZnJhZ21lbnQgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGFsaWFzXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleFxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2tleV1cbiAgICogQHJldHVybiB7RnJhZ21lbnR9XG4gICAqL1xuXG4gIGNyZWF0ZTogZnVuY3Rpb24gY3JlYXRlKHZhbHVlLCBhbGlhcywgaW5kZXgsIGtleSkge1xuICAgIHZhciBob3N0ID0gdGhpcy5faG9zdDtcbiAgICAvLyBjcmVhdGUgaXRlcmF0aW9uIHNjb3BlXG4gICAgdmFyIHBhcmVudFNjb3BlID0gdGhpcy5fc2NvcGUgfHwgdGhpcy52bTtcbiAgICB2YXIgc2NvcGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudFNjb3BlKTtcbiAgICAvLyByZWYgaG9sZGVyIGZvciB0aGUgc2NvcGVcbiAgICBzY29wZS4kcmVmcyA9IE9iamVjdC5jcmVhdGUocGFyZW50U2NvcGUuJHJlZnMpO1xuICAgIHNjb3BlLiRlbHMgPSBPYmplY3QuY3JlYXRlKHBhcmVudFNjb3BlLiRlbHMpO1xuICAgIC8vIG1ha2Ugc3VyZSBwb2ludCAkcGFyZW50IHRvIHBhcmVudCBzY29wZVxuICAgIHNjb3BlLiRwYXJlbnQgPSBwYXJlbnRTY29wZTtcbiAgICAvLyBmb3IgdHdvLXdheSBiaW5kaW5nIG9uIGFsaWFzXG4gICAgc2NvcGUuJGZvckNvbnRleHQgPSB0aGlzO1xuICAgIC8vIGRlZmluZSBzY29wZSBwcm9wZXJ0aWVzXG4gICAgZGVmaW5lUmVhY3RpdmUoc2NvcGUsIGFsaWFzLCB2YWx1ZSwgdHJ1ZSAvKiBkbyBub3Qgb2JzZXJ2ZSAqLyk7XG4gICAgZGVmaW5lUmVhY3RpdmUoc2NvcGUsICckaW5kZXgnLCBpbmRleCk7XG4gICAgaWYgKGtleSkge1xuICAgICAgZGVmaW5lUmVhY3RpdmUoc2NvcGUsICcka2V5Jywga2V5KTtcbiAgICB9IGVsc2UgaWYgKHNjb3BlLiRrZXkpIHtcbiAgICAgIC8vIGF2b2lkIGFjY2lkZW50YWwgZmFsbGJhY2tcbiAgICAgIGRlZihzY29wZSwgJyRrZXknLCBudWxsKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaXRlcmF0b3IpIHtcbiAgICAgIGRlZmluZVJlYWN0aXZlKHNjb3BlLCB0aGlzLml0ZXJhdG9yLCBrZXkgIT09IG51bGwgPyBrZXkgOiBpbmRleCk7XG4gICAgfVxuICAgIHZhciBmcmFnID0gdGhpcy5mYWN0b3J5LmNyZWF0ZShob3N0LCBzY29wZSwgdGhpcy5fZnJhZyk7XG4gICAgZnJhZy5mb3JJZCA9IHRoaXMuaWQ7XG4gICAgdGhpcy5jYWNoZUZyYWcodmFsdWUsIGZyYWcsIGluZGV4LCBrZXkpO1xuICAgIHJldHVybiBmcmFnO1xuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIHYtcmVmIG9uIG93bmVyIHZtLlxuICAgKi9cblxuICB1cGRhdGVSZWY6IGZ1bmN0aW9uIHVwZGF0ZVJlZigpIHtcbiAgICB2YXIgcmVmID0gdGhpcy5kZXNjcmlwdG9yLnJlZjtcbiAgICBpZiAoIXJlZikgcmV0dXJuO1xuICAgIHZhciBoYXNoID0gKHRoaXMuX3Njb3BlIHx8IHRoaXMudm0pLiRyZWZzO1xuICAgIHZhciByZWZzO1xuICAgIGlmICghdGhpcy5mcm9tT2JqZWN0KSB7XG4gICAgICByZWZzID0gdGhpcy5mcmFncy5tYXAoZmluZFZtRnJvbUZyYWcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWZzID0ge307XG4gICAgICB0aGlzLmZyYWdzLmZvckVhY2goZnVuY3Rpb24gKGZyYWcpIHtcbiAgICAgICAgcmVmc1tmcmFnLnNjb3BlLiRrZXldID0gZmluZFZtRnJvbUZyYWcoZnJhZyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgaGFzaFtyZWZdID0gcmVmcztcbiAgfSxcblxuICAvKipcbiAgICogRm9yIG9wdGlvbiBsaXN0cywgdXBkYXRlIHRoZSBjb250YWluaW5nIHYtbW9kZWwgb25cbiAgICogcGFyZW50IDxzZWxlY3Q+LlxuICAgKi9cblxuICB1cGRhdGVNb2RlbDogZnVuY3Rpb24gdXBkYXRlTW9kZWwoKSB7XG4gICAgaWYgKHRoaXMuaXNPcHRpb24pIHtcbiAgICAgIHZhciBwYXJlbnQgPSB0aGlzLnN0YXJ0LnBhcmVudE5vZGU7XG4gICAgICB2YXIgbW9kZWwgPSBwYXJlbnQgJiYgcGFyZW50Ll9fdl9tb2RlbDtcbiAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICBtb2RlbC5mb3JjZVVwZGF0ZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogSW5zZXJ0IGEgZnJhZ21lbnQuIEhhbmRsZXMgc3RhZ2dlcmluZy5cbiAgICpcbiAgICogQHBhcmFtIHtGcmFnbWVudH0gZnJhZ1xuICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXhcbiAgICogQHBhcmFtIHtOb2RlfSBwcmV2RWxcbiAgICogQHBhcmFtIHtCb29sZWFufSBpbkRvY3VtZW50XG4gICAqL1xuXG4gIGluc2VydDogZnVuY3Rpb24gaW5zZXJ0KGZyYWcsIGluZGV4LCBwcmV2RWwsIGluRG9jdW1lbnQpIHtcbiAgICBpZiAoZnJhZy5zdGFnZ2VyQ2IpIHtcbiAgICAgIGZyYWcuc3RhZ2dlckNiLmNhbmNlbCgpO1xuICAgICAgZnJhZy5zdGFnZ2VyQ2IgPSBudWxsO1xuICAgIH1cbiAgICB2YXIgc3RhZ2dlckFtb3VudCA9IHRoaXMuZ2V0U3RhZ2dlcihmcmFnLCBpbmRleCwgbnVsbCwgJ2VudGVyJyk7XG4gICAgaWYgKGluRG9jdW1lbnQgJiYgc3RhZ2dlckFtb3VudCkge1xuICAgICAgLy8gY3JlYXRlIGFuIGFuY2hvciBhbmQgaW5zZXJ0IGl0IHN5bmNocm9ub3VzbHksXG4gICAgICAvLyBzbyB0aGF0IHdlIGNhbiByZXNvbHZlIHRoZSBjb3JyZWN0IG9yZGVyIHdpdGhvdXRcbiAgICAgIC8vIHdvcnJ5aW5nIGFib3V0IHNvbWUgZWxlbWVudHMgbm90IGluc2VydGVkIHlldFxuICAgICAgdmFyIGFuY2hvciA9IGZyYWcuc3RhZ2dlckFuY2hvcjtcbiAgICAgIGlmICghYW5jaG9yKSB7XG4gICAgICAgIGFuY2hvciA9IGZyYWcuc3RhZ2dlckFuY2hvciA9IGNyZWF0ZUFuY2hvcignc3RhZ2dlci1hbmNob3InKTtcbiAgICAgICAgYW5jaG9yLl9fdl9mcmFnID0gZnJhZztcbiAgICAgIH1cbiAgICAgIGFmdGVyKGFuY2hvciwgcHJldkVsKTtcbiAgICAgIHZhciBvcCA9IGZyYWcuc3RhZ2dlckNiID0gY2FuY2VsbGFibGUoZnVuY3Rpb24gKCkge1xuICAgICAgICBmcmFnLnN0YWdnZXJDYiA9IG51bGw7XG4gICAgICAgIGZyYWcuYmVmb3JlKGFuY2hvcik7XG4gICAgICAgIHJlbW92ZShhbmNob3IpO1xuICAgICAgfSk7XG4gICAgICBzZXRUaW1lb3V0KG9wLCBzdGFnZ2VyQW1vdW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZnJhZy5iZWZvcmUocHJldkVsLm5leHRTaWJsaW5nKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhIGZyYWdtZW50LiBIYW5kbGVzIHN0YWdnZXJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7RnJhZ21lbnR9IGZyYWdcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4XG4gICAqIEBwYXJhbSB7TnVtYmVyfSB0b3RhbFxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGluRG9jdW1lbnRcbiAgICovXG5cbiAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUoZnJhZywgaW5kZXgsIHRvdGFsLCBpbkRvY3VtZW50KSB7XG4gICAgaWYgKGZyYWcuc3RhZ2dlckNiKSB7XG4gICAgICBmcmFnLnN0YWdnZXJDYi5jYW5jZWwoKTtcbiAgICAgIGZyYWcuc3RhZ2dlckNiID0gbnVsbDtcbiAgICAgIC8vIGl0J3Mgbm90IHBvc3NpYmxlIGZvciB0aGUgc2FtZSBmcmFnIHRvIGJlIHJlbW92ZWRcbiAgICAgIC8vIHR3aWNlLCBzbyBpZiB3ZSBoYXZlIGEgcGVuZGluZyBzdGFnZ2VyIGNhbGxiYWNrLFxuICAgICAgLy8gaXQgbWVhbnMgdGhpcyBmcmFnIGlzIHF1ZXVlZCBmb3IgZW50ZXIgYnV0IHJlbW92ZWRcbiAgICAgIC8vIGJlZm9yZSBpdHMgdHJhbnNpdGlvbiBzdGFydGVkLiBTaW5jZSBpdCBpcyBhbHJlYWR5XG4gICAgICAvLyBkZXN0cm95ZWQsIHdlIGNhbiBqdXN0IGxlYXZlIGl0IGluIGRldGFjaGVkIHN0YXRlLlxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgc3RhZ2dlckFtb3VudCA9IHRoaXMuZ2V0U3RhZ2dlcihmcmFnLCBpbmRleCwgdG90YWwsICdsZWF2ZScpO1xuICAgIGlmIChpbkRvY3VtZW50ICYmIHN0YWdnZXJBbW91bnQpIHtcbiAgICAgIHZhciBvcCA9IGZyYWcuc3RhZ2dlckNiID0gY2FuY2VsbGFibGUoZnVuY3Rpb24gKCkge1xuICAgICAgICBmcmFnLnN0YWdnZXJDYiA9IG51bGw7XG4gICAgICAgIGZyYWcucmVtb3ZlKCk7XG4gICAgICB9KTtcbiAgICAgIHNldFRpbWVvdXQob3AsIHN0YWdnZXJBbW91bnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmcmFnLnJlbW92ZSgpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogTW92ZSBhIGZyYWdtZW50IHRvIGEgbmV3IHBvc2l0aW9uLlxuICAgKiBGb3JjZSBubyB0cmFuc2l0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge0ZyYWdtZW50fSBmcmFnXG4gICAqIEBwYXJhbSB7Tm9kZX0gcHJldkVsXG4gICAqL1xuXG4gIG1vdmU6IGZ1bmN0aW9uIG1vdmUoZnJhZywgcHJldkVsKSB7XG4gICAgLy8gZml4IGEgY29tbW9uIGlzc3VlIHdpdGggU29ydGFibGU6XG4gICAgLy8gaWYgcHJldkVsIGRvZXNuJ3QgaGF2ZSBuZXh0U2libGluZywgdGhpcyBtZWFucyBpdCdzXG4gICAgLy8gYmVlbiBkcmFnZ2VkIGFmdGVyIHRoZSBlbmQgYW5jaG9yLiBKdXN0IHJlLXBvc2l0aW9uXG4gICAgLy8gdGhlIGVuZCBhbmNob3IgdG8gdGhlIGVuZCBvZiB0aGUgY29udGFpbmVyLlxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmICghcHJldkVsLm5leHRTaWJsaW5nKSB7XG4gICAgICB0aGlzLmVuZC5wYXJlbnROb2RlLmFwcGVuZENoaWxkKHRoaXMuZW5kKTtcbiAgICB9XG4gICAgZnJhZy5iZWZvcmUocHJldkVsLm5leHRTaWJsaW5nLCBmYWxzZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENhY2hlIGEgZnJhZ21lbnQgdXNpbmcgdHJhY2stYnkgb3IgdGhlIG9iamVjdCBrZXkuXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAgICogQHBhcmFtIHtGcmFnbWVudH0gZnJhZ1xuICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXhcbiAgICogQHBhcmFtIHtTdHJpbmd9IFtrZXldXG4gICAqL1xuXG4gIGNhY2hlRnJhZzogZnVuY3Rpb24gY2FjaGVGcmFnKHZhbHVlLCBmcmFnLCBpbmRleCwga2V5KSB7XG4gICAgdmFyIHRyYWNrQnlLZXkgPSB0aGlzLnBhcmFtcy50cmFja0J5O1xuICAgIHZhciBjYWNoZSA9IHRoaXMuY2FjaGU7XG4gICAgdmFyIHByaW1pdGl2ZSA9ICFpc09iamVjdCh2YWx1ZSk7XG4gICAgdmFyIGlkO1xuICAgIGlmIChrZXkgfHwgdHJhY2tCeUtleSB8fCBwcmltaXRpdmUpIHtcbiAgICAgIGlkID0gdHJhY2tCeUtleSA/IHRyYWNrQnlLZXkgPT09ICckaW5kZXgnID8gaW5kZXggOiB2YWx1ZVt0cmFja0J5S2V5XSA6IGtleSB8fCB2YWx1ZTtcbiAgICAgIGlmICghY2FjaGVbaWRdKSB7XG4gICAgICAgIGNhY2hlW2lkXSA9IGZyYWc7XG4gICAgICB9IGVsc2UgaWYgKHRyYWNrQnlLZXkgIT09ICckaW5kZXgnKSB7XG4gICAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgdGhpcy53YXJuRHVwbGljYXRlKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWQgPSB0aGlzLmlkO1xuICAgICAgaWYgKGhhc093bih2YWx1ZSwgaWQpKSB7XG4gICAgICAgIGlmICh2YWx1ZVtpZF0gPT09IG51bGwpIHtcbiAgICAgICAgICB2YWx1ZVtpZF0gPSBmcmFnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgdGhpcy53YXJuRHVwbGljYXRlKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVmKHZhbHVlLCBpZCwgZnJhZyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZyYWcucmF3ID0gdmFsdWU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBhIGNhY2hlZCBmcmFnbWVudCBmcm9tIHRoZSB2YWx1ZS9pbmRleC9rZXlcbiAgICpcbiAgICogQHBhcmFtIHsqfSB2YWx1ZVxuICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZXhcbiAgICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICAgKiBAcmV0dXJuIHtGcmFnbWVudH1cbiAgICovXG5cbiAgZ2V0Q2FjaGVkRnJhZzogZnVuY3Rpb24gZ2V0Q2FjaGVkRnJhZyh2YWx1ZSwgaW5kZXgsIGtleSkge1xuICAgIHZhciB0cmFja0J5S2V5ID0gdGhpcy5wYXJhbXMudHJhY2tCeTtcbiAgICB2YXIgcHJpbWl0aXZlID0gIWlzT2JqZWN0KHZhbHVlKTtcbiAgICB2YXIgZnJhZztcbiAgICBpZiAoa2V5IHx8IHRyYWNrQnlLZXkgfHwgcHJpbWl0aXZlKSB7XG4gICAgICB2YXIgaWQgPSB0cmFja0J5S2V5ID8gdHJhY2tCeUtleSA9PT0gJyRpbmRleCcgPyBpbmRleCA6IHZhbHVlW3RyYWNrQnlLZXldIDoga2V5IHx8IHZhbHVlO1xuICAgICAgZnJhZyA9IHRoaXMuY2FjaGVbaWRdO1xuICAgIH0gZWxzZSB7XG4gICAgICBmcmFnID0gdmFsdWVbdGhpcy5pZF07XG4gICAgfVxuICAgIGlmIChmcmFnICYmIChmcmFnLnJldXNlZCB8fCBmcmFnLmZyZXNoKSkge1xuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiB0aGlzLndhcm5EdXBsaWNhdGUodmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gZnJhZztcbiAgfSxcblxuICAvKipcbiAgICogRGVsZXRlIGEgZnJhZ21lbnQgZnJvbSBjYWNoZS5cbiAgICpcbiAgICogQHBhcmFtIHtGcmFnbWVudH0gZnJhZ1xuICAgKi9cblxuICBkZWxldGVDYWNoZWRGcmFnOiBmdW5jdGlvbiBkZWxldGVDYWNoZWRGcmFnKGZyYWcpIHtcbiAgICB2YXIgdmFsdWUgPSBmcmFnLnJhdztcbiAgICB2YXIgdHJhY2tCeUtleSA9IHRoaXMucGFyYW1zLnRyYWNrQnk7XG4gICAgdmFyIHNjb3BlID0gZnJhZy5zY29wZTtcbiAgICB2YXIgaW5kZXggPSBzY29wZS4kaW5kZXg7XG4gICAgLy8gZml4ICM5NDg6IGF2b2lkIGFjY2lkZW50YWxseSBmYWxsIHRocm91Z2ggdG9cbiAgICAvLyBhIHBhcmVudCByZXBlYXRlciB3aGljaCBoYXBwZW5zIHRvIGhhdmUgJGtleS5cbiAgICB2YXIga2V5ID0gaGFzT3duKHNjb3BlLCAnJGtleScpICYmIHNjb3BlLiRrZXk7XG4gICAgdmFyIHByaW1pdGl2ZSA9ICFpc09iamVjdCh2YWx1ZSk7XG4gICAgaWYgKHRyYWNrQnlLZXkgfHwga2V5IHx8IHByaW1pdGl2ZSkge1xuICAgICAgdmFyIGlkID0gdHJhY2tCeUtleSA/IHRyYWNrQnlLZXkgPT09ICckaW5kZXgnID8gaW5kZXggOiB2YWx1ZVt0cmFja0J5S2V5XSA6IGtleSB8fCB2YWx1ZTtcbiAgICAgIHRoaXMuY2FjaGVbaWRdID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWVbdGhpcy5pZF0gPSBudWxsO1xuICAgICAgZnJhZy5yYXcgPSBudWxsO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogR2V0IHRoZSBzdGFnZ2VyIGFtb3VudCBmb3IgYW4gaW5zZXJ0aW9uL3JlbW92YWwuXG4gICAqXG4gICAqIEBwYXJhbSB7RnJhZ21lbnR9IGZyYWdcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4XG4gICAqIEBwYXJhbSB7TnVtYmVyfSB0b3RhbFxuICAgKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICAgKi9cblxuICBnZXRTdGFnZ2VyOiBmdW5jdGlvbiBnZXRTdGFnZ2VyKGZyYWcsIGluZGV4LCB0b3RhbCwgdHlwZSkge1xuICAgIHR5cGUgPSB0eXBlICsgJ1N0YWdnZXInO1xuICAgIHZhciB0cmFucyA9IGZyYWcubm9kZS5fX3ZfdHJhbnM7XG4gICAgdmFyIGhvb2tzID0gdHJhbnMgJiYgdHJhbnMuaG9va3M7XG4gICAgdmFyIGhvb2sgPSBob29rcyAmJiAoaG9va3NbdHlwZV0gfHwgaG9va3Muc3RhZ2dlcik7XG4gICAgcmV0dXJuIGhvb2sgPyBob29rLmNhbGwoZnJhZywgaW5kZXgsIHRvdGFsKSA6IGluZGV4ICogcGFyc2VJbnQodGhpcy5wYXJhbXNbdHlwZV0gfHwgdGhpcy5wYXJhbXMuc3RhZ2dlciwgMTApO1xuICB9LFxuXG4gIC8qKlxuICAgKiBQcmUtcHJvY2VzcyB0aGUgdmFsdWUgYmVmb3JlIHBpcGluZyBpdCB0aHJvdWdoIHRoZVxuICAgKiBmaWx0ZXJzLiBUaGlzIGlzIHBhc3NlZCB0byBhbmQgY2FsbGVkIGJ5IHRoZSB3YXRjaGVyLlxuICAgKi9cblxuICBfcHJlUHJvY2VzczogZnVuY3Rpb24gX3ByZVByb2Nlc3ModmFsdWUpIHtcbiAgICAvLyByZWdhcmRsZXNzIG9mIHR5cGUsIHN0b3JlIHRoZSB1bi1maWx0ZXJlZCByYXcgdmFsdWUuXG4gICAgdGhpcy5yYXdWYWx1ZSA9IHZhbHVlO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcblxuICAvKipcbiAgICogUG9zdC1wcm9jZXNzIHRoZSB2YWx1ZSBhZnRlciBpdCBoYXMgYmVlbiBwaXBlZCB0aHJvdWdoXG4gICAqIHRoZSBmaWx0ZXJzLiBUaGlzIGlzIHBhc3NlZCB0byBhbmQgY2FsbGVkIGJ5IHRoZSB3YXRjaGVyLlxuICAgKlxuICAgKiBJdCBpcyBuZWNlc3NhcnkgZm9yIHRoaXMgdG8gYmUgY2FsbGVkIGR1cmluZyB0aGVcbiAgICogd2F0aGNlcidzIGRlcGVuZGVuY3kgY29sbGVjdGlvbiBwaGFzZSBiZWNhdXNlIHdlIHdhbnRcbiAgICogdGhlIHYtZm9yIHRvIHVwZGF0ZSB3aGVuIHRoZSBzb3VyY2UgT2JqZWN0IGlzIG11dGF0ZWQuXG4gICAqL1xuXG4gIF9wb3N0UHJvY2VzczogZnVuY3Rpb24gX3Bvc3RQcm9jZXNzKHZhbHVlKSB7XG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSBlbHNlIGlmIChpc1BsYWluT2JqZWN0KHZhbHVlKSkge1xuICAgICAgLy8gY29udmVydCBwbGFpbiBvYmplY3QgdG8gYXJyYXkuXG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgICAgIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gICAgICB2YXIgcmVzID0gbmV3IEFycmF5KGkpO1xuICAgICAgdmFyIGtleTtcbiAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgcmVzW2ldID0ge1xuICAgICAgICAgICRrZXk6IGtleSxcbiAgICAgICAgICAkdmFsdWU6IHZhbHVlW2tleV1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmICFpc05hTih2YWx1ZSkpIHtcbiAgICAgICAgdmFsdWUgPSByYW5nZSh2YWx1ZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWUgfHwgW107XG4gICAgfVxuICB9LFxuXG4gIHVuYmluZDogZnVuY3Rpb24gdW5iaW5kKCkge1xuICAgIGlmICh0aGlzLmRlc2NyaXB0b3IucmVmKSB7XG4gICAgICAodGhpcy5fc2NvcGUgfHwgdGhpcy52bSkuJHJlZnNbdGhpcy5kZXNjcmlwdG9yLnJlZl0gPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5mcmFncykge1xuICAgICAgdmFyIGkgPSB0aGlzLmZyYWdzLmxlbmd0aDtcbiAgICAgIHZhciBmcmFnO1xuICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICBmcmFnID0gdGhpcy5mcmFnc1tpXTtcbiAgICAgICAgdGhpcy5kZWxldGVDYWNoZWRGcmFnKGZyYWcpO1xuICAgICAgICBmcmFnLmRlc3Ryb3koKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogSGVscGVyIHRvIGZpbmQgdGhlIHByZXZpb3VzIGVsZW1lbnQgdGhhdCBpcyBhIGZyYWdtZW50XG4gKiBhbmNob3IuIFRoaXMgaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYSBkZXN0cm95ZWQgZnJhZydzXG4gKiBlbGVtZW50IGNvdWxkIHN0aWxsIGJlIGxpbmdlcmluZyBpbiB0aGUgRE9NIGJlZm9yZSBpdHNcbiAqIGxlYXZpbmcgdHJhbnNpdGlvbiBmaW5pc2hlcywgYnV0IGl0cyBpbnNlcnRlZCBmbGFnXG4gKiBzaG91bGQgaGF2ZSBiZWVuIHNldCB0byBmYWxzZSBzbyB3ZSBjYW4gc2tpcCB0aGVtLlxuICpcbiAqIElmIHRoaXMgaXMgYSBibG9jayByZXBlYXQsIHdlIHdhbnQgdG8gbWFrZSBzdXJlIHdlIG9ubHlcbiAqIHJldHVybiBmcmFnIHRoYXQgaXMgYm91bmQgdG8gdGhpcyB2LWZvci4gKHNlZSAjOTI5KVxuICpcbiAqIEBwYXJhbSB7RnJhZ21lbnR9IGZyYWdcbiAqIEBwYXJhbSB7Q29tbWVudHxUZXh0fSBhbmNob3JcbiAqIEBwYXJhbSB7U3RyaW5nfSBpZFxuICogQHJldHVybiB7RnJhZ21lbnR9XG4gKi9cblxuZnVuY3Rpb24gZmluZFByZXZGcmFnKGZyYWcsIGFuY2hvciwgaWQpIHtcbiAgdmFyIGVsID0gZnJhZy5ub2RlLnByZXZpb3VzU2libGluZztcbiAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gIGlmICghZWwpIHJldHVybjtcbiAgZnJhZyA9IGVsLl9fdl9mcmFnO1xuICB3aGlsZSAoKCFmcmFnIHx8IGZyYWcuZm9ySWQgIT09IGlkIHx8ICFmcmFnLmluc2VydGVkKSAmJiBlbCAhPT0gYW5jaG9yKSB7XG4gICAgZWwgPSBlbC5wcmV2aW91c1NpYmxpbmc7XG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXG4gICAgaWYgKCFlbCkgcmV0dXJuO1xuICAgIGZyYWcgPSBlbC5fX3ZfZnJhZztcbiAgfVxuICByZXR1cm4gZnJhZztcbn1cblxuLyoqXG4gKiBGaW5kIGEgdm0gZnJvbSBhIGZyYWdtZW50LlxuICpcbiAqIEBwYXJhbSB7RnJhZ21lbnR9IGZyYWdcbiAqIEByZXR1cm4ge1Z1ZXx1bmRlZmluZWR9XG4gKi9cblxuZnVuY3Rpb24gZmluZFZtRnJvbUZyYWcoZnJhZykge1xuICB2YXIgbm9kZSA9IGZyYWcubm9kZTtcbiAgLy8gaGFuZGxlIG11bHRpLW5vZGUgZnJhZ1xuICBpZiAoZnJhZy5lbmQpIHtcbiAgICB3aGlsZSAoIW5vZGUuX192dWVfXyAmJiBub2RlICE9PSBmcmFnLmVuZCAmJiBub2RlLm5leHRTaWJsaW5nKSB7XG4gICAgICBub2RlID0gbm9kZS5uZXh0U2libGluZztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5vZGUuX192dWVfXztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSByYW5nZSBhcnJheSBmcm9tIGdpdmVuIG51bWJlci5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gblxuICogQHJldHVybiB7QXJyYXl9XG4gKi9cblxuZnVuY3Rpb24gcmFuZ2Uobikge1xuICB2YXIgaSA9IC0xO1xuICB2YXIgcmV0ID0gbmV3IEFycmF5KE1hdGguZmxvb3IobikpO1xuICB3aGlsZSAoKytpIDwgbikge1xuICAgIHJldFtpXSA9IGk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgdkZvci53YXJuRHVwbGljYXRlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgd2FybignRHVwbGljYXRlIHZhbHVlIGZvdW5kIGluIHYtZm9yPVwiJyArIHRoaXMuZGVzY3JpcHRvci5yYXcgKyAnXCI6ICcgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgKyAnLiBVc2UgdHJhY2stYnk9XCIkaW5kZXhcIiBpZiAnICsgJ3lvdSBhcmUgZXhwZWN0aW5nIGR1cGxpY2F0ZSB2YWx1ZXMuJyk7XG4gIH07XG59XG5cbnZhciB2SWYgPSB7XG5cbiAgcHJpb3JpdHk6IElGLFxuXG4gIGJpbmQ6IGZ1bmN0aW9uIGJpbmQoKSB7XG4gICAgdmFyIGVsID0gdGhpcy5lbDtcbiAgICBpZiAoIWVsLl9fdnVlX18pIHtcbiAgICAgIC8vIGNoZWNrIGVsc2UgYmxvY2tcbiAgICAgIHZhciBuZXh0ID0gZWwubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgICAgaWYgKG5leHQgJiYgZ2V0QXR0cihuZXh0LCAndi1lbHNlJykgIT09IG51bGwpIHtcbiAgICAgICAgcmVtb3ZlKG5leHQpO1xuICAgICAgICB0aGlzLmVsc2VFbCA9IG5leHQ7XG4gICAgICB9XG4gICAgICAvLyBjaGVjayBtYWluIGJsb2NrXG4gICAgICB0aGlzLmFuY2hvciA9IGNyZWF0ZUFuY2hvcigndi1pZicpO1xuICAgICAgcmVwbGFjZShlbCwgdGhpcy5hbmNob3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ3YtaWY9XCInICsgdGhpcy5leHByZXNzaW9uICsgJ1wiIGNhbm5vdCBiZSAnICsgJ3VzZWQgb24gYW4gaW5zdGFuY2Ugcm9vdCBlbGVtZW50LicpO1xuICAgICAgdGhpcy5pbnZhbGlkID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cbiAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUodmFsdWUpIHtcbiAgICBpZiAodGhpcy5pbnZhbGlkKSByZXR1cm47XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICBpZiAoIXRoaXMuZnJhZykge1xuICAgICAgICB0aGlzLmluc2VydCgpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbW92ZSgpO1xuICAgIH1cbiAgfSxcblxuICBpbnNlcnQ6IGZ1bmN0aW9uIGluc2VydCgpIHtcbiAgICBpZiAodGhpcy5lbHNlRnJhZykge1xuICAgICAgdGhpcy5lbHNlRnJhZy5yZW1vdmUoKTtcbiAgICAgIHRoaXMuZWxzZUZyYWcgPSBudWxsO1xuICAgIH1cbiAgICAvLyBsYXp5IGluaXQgZmFjdG9yeVxuICAgIGlmICghdGhpcy5mYWN0b3J5KSB7XG4gICAgICB0aGlzLmZhY3RvcnkgPSBuZXcgRnJhZ21lbnRGYWN0b3J5KHRoaXMudm0sIHRoaXMuZWwpO1xuICAgIH1cbiAgICB0aGlzLmZyYWcgPSB0aGlzLmZhY3RvcnkuY3JlYXRlKHRoaXMuX2hvc3QsIHRoaXMuX3Njb3BlLCB0aGlzLl9mcmFnKTtcbiAgICB0aGlzLmZyYWcuYmVmb3JlKHRoaXMuYW5jaG9yKTtcbiAgfSxcblxuICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZSgpIHtcbiAgICBpZiAodGhpcy5mcmFnKSB7XG4gICAgICB0aGlzLmZyYWcucmVtb3ZlKCk7XG4gICAgICB0aGlzLmZyYWcgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbHNlRWwgJiYgIXRoaXMuZWxzZUZyYWcpIHtcbiAgICAgIGlmICghdGhpcy5lbHNlRmFjdG9yeSkge1xuICAgICAgICB0aGlzLmVsc2VGYWN0b3J5ID0gbmV3IEZyYWdtZW50RmFjdG9yeSh0aGlzLmVsc2VFbC5fY29udGV4dCB8fCB0aGlzLnZtLCB0aGlzLmVsc2VFbCk7XG4gICAgICB9XG4gICAgICB0aGlzLmVsc2VGcmFnID0gdGhpcy5lbHNlRmFjdG9yeS5jcmVhdGUodGhpcy5faG9zdCwgdGhpcy5fc2NvcGUsIHRoaXMuX2ZyYWcpO1xuICAgICAgdGhpcy5lbHNlRnJhZy5iZWZvcmUodGhpcy5hbmNob3IpO1xuICAgIH1cbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uIHVuYmluZCgpIHtcbiAgICBpZiAodGhpcy5mcmFnKSB7XG4gICAgICB0aGlzLmZyYWcuZGVzdHJveSgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5lbHNlRnJhZykge1xuICAgICAgdGhpcy5lbHNlRnJhZy5kZXN0cm95KCk7XG4gICAgfVxuICB9XG59O1xuXG52YXIgc2hvdyA9IHtcblxuICBiaW5kOiBmdW5jdGlvbiBiaW5kKCkge1xuICAgIC8vIGNoZWNrIGVsc2UgYmxvY2tcbiAgICB2YXIgbmV4dCA9IHRoaXMuZWwubmV4dEVsZW1lbnRTaWJsaW5nO1xuICAgIGlmIChuZXh0ICYmIGdldEF0dHIobmV4dCwgJ3YtZWxzZScpICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmVsc2VFbCA9IG5leHQ7XG4gICAgfVxuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKHZhbHVlKSB7XG4gICAgdGhpcy5hcHBseSh0aGlzLmVsLCB2YWx1ZSk7XG4gICAgaWYgKHRoaXMuZWxzZUVsKSB7XG4gICAgICB0aGlzLmFwcGx5KHRoaXMuZWxzZUVsLCAhdmFsdWUpO1xuICAgIH1cbiAgfSxcblxuICBhcHBseTogZnVuY3Rpb24gYXBwbHkoZWwsIHZhbHVlKSB7XG4gICAgaWYgKGluRG9jKGVsKSkge1xuICAgICAgYXBwbHlUcmFuc2l0aW9uKGVsLCB2YWx1ZSA/IDEgOiAtMSwgdG9nZ2xlLCB0aGlzLnZtKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdG9nZ2xlKCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHRvZ2dsZSgpIHtcbiAgICAgIGVsLnN0eWxlLmRpc3BsYXkgPSB2YWx1ZSA/ICcnIDogJ25vbmUnO1xuICAgIH1cbiAgfVxufTtcblxudmFyIHRleHQkMiA9IHtcblxuICBiaW5kOiBmdW5jdGlvbiBiaW5kKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZWwgPSB0aGlzLmVsO1xuICAgIHZhciBpc1JhbmdlID0gZWwudHlwZSA9PT0gJ3JhbmdlJztcbiAgICB2YXIgbGF6eSA9IHRoaXMucGFyYW1zLmxhenk7XG4gICAgdmFyIG51bWJlciA9IHRoaXMucGFyYW1zLm51bWJlcjtcbiAgICB2YXIgZGVib3VuY2UgPSB0aGlzLnBhcmFtcy5kZWJvdW5jZTtcblxuICAgIC8vIGhhbmRsZSBjb21wb3NpdGlvbiBldmVudHMuXG4gICAgLy8gICBodHRwOi8vYmxvZy5ldmFueW91Lm1lLzIwMTQvMDEvMDMvY29tcG9zaXRpb24tZXZlbnQvXG4gICAgLy8gc2tpcCB0aGlzIGZvciBBbmRyb2lkIGJlY2F1c2UgaXQgaGFuZGxlcyBjb21wb3NpdGlvblxuICAgIC8vIGV2ZW50cyBxdWl0ZSBkaWZmZXJlbnRseS4gQW5kcm9pZCBkb2Vzbid0IHRyaWdnZXJcbiAgICAvLyBjb21wb3NpdGlvbiBldmVudHMgZm9yIGxhbmd1YWdlIGlucHV0IG1ldGhvZHMgZS5nLlxuICAgIC8vIENoaW5lc2UsIGJ1dCBpbnN0ZWFkIHRyaWdnZXJzIHRoZW0gZm9yIHNwZWxsaW5nXG4gICAgLy8gc3VnZ2VzdGlvbnMuLi4gKHNlZSBEaXNjdXNzaW9uLyMxNjIpXG4gICAgdmFyIGNvbXBvc2luZyA9IGZhbHNlO1xuICAgIGlmICghaXNBbmRyb2lkICYmICFpc1JhbmdlKSB7XG4gICAgICB0aGlzLm9uKCdjb21wb3NpdGlvbnN0YXJ0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb21wb3NpbmcgPSB0cnVlO1xuICAgICAgfSk7XG4gICAgICB0aGlzLm9uKCdjb21wb3NpdGlvbmVuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29tcG9zaW5nID0gZmFsc2U7XG4gICAgICAgIC8vIGluIElFMTEgdGhlIFwiY29tcG9zaXRpb25lbmRcIiBldmVudCBmaXJlcyBBRlRFUlxuICAgICAgICAvLyB0aGUgXCJpbnB1dFwiIGV2ZW50LCBzbyB0aGUgaW5wdXQgaGFuZGxlciBpcyBibG9ja2VkXG4gICAgICAgIC8vIGF0IHRoZSBlbmQuLi4gaGF2ZSB0byBjYWxsIGl0IGhlcmUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vICMxMzI3OiBpbiBsYXp5IG1vZGUgdGhpcyBpcyB1bmVjZXNzYXJ5LlxuICAgICAgICBpZiAoIWxhenkpIHtcbiAgICAgICAgICBzZWxmLmxpc3RlbmVyKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHByZXZlbnQgbWVzc2luZyB3aXRoIHRoZSBpbnB1dCB3aGVuIHVzZXIgaXMgdHlwaW5nLFxuICAgIC8vIGFuZCBmb3JjZSB1cGRhdGUgb24gYmx1ci5cbiAgICB0aGlzLmZvY3VzZWQgPSBmYWxzZTtcbiAgICBpZiAoIWlzUmFuZ2UgJiYgIWxhenkpIHtcbiAgICAgIHRoaXMub24oJ2ZvY3VzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLmZvY3VzZWQgPSB0cnVlO1xuICAgICAgfSk7XG4gICAgICB0aGlzLm9uKCdibHVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLmZvY3VzZWQgPSBmYWxzZTtcbiAgICAgICAgLy8gZG8gbm90IHN5bmMgdmFsdWUgYWZ0ZXIgZnJhZ21lbnQgcmVtb3ZhbCAoIzIwMTcpXG4gICAgICAgIGlmICghc2VsZi5fZnJhZyB8fCBzZWxmLl9mcmFnLmluc2VydGVkKSB7XG4gICAgICAgICAgc2VsZi5yYXdMaXN0ZW5lcigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBOb3cgYXR0YWNoIHRoZSBtYWluIGxpc3RlbmVyXG4gICAgdGhpcy5saXN0ZW5lciA9IHRoaXMucmF3TGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoY29tcG9zaW5nIHx8ICFzZWxmLl9ib3VuZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB2YXIgdmFsID0gbnVtYmVyIHx8IGlzUmFuZ2UgPyB0b051bWJlcihlbC52YWx1ZSkgOiBlbC52YWx1ZTtcbiAgICAgIHNlbGYuc2V0KHZhbCk7XG4gICAgICAvLyBmb3JjZSB1cGRhdGUgb24gbmV4dCB0aWNrIHRvIGF2b2lkIGxvY2sgJiBzYW1lIHZhbHVlXG4gICAgICAvLyBhbHNvIG9ubHkgdXBkYXRlIHdoZW4gdXNlciBpcyBub3QgdHlwaW5nXG4gICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzZWxmLl9ib3VuZCAmJiAhc2VsZi5mb2N1c2VkKSB7XG4gICAgICAgICAgc2VsZi51cGRhdGUoc2VsZi5fd2F0Y2hlci52YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBhcHBseSBkZWJvdW5jZVxuICAgIGlmIChkZWJvdW5jZSkge1xuICAgICAgdGhpcy5saXN0ZW5lciA9IF9kZWJvdW5jZSh0aGlzLmxpc3RlbmVyLCBkZWJvdW5jZSk7XG4gICAgfVxuXG4gICAgLy8gU3VwcG9ydCBqUXVlcnkgZXZlbnRzLCBzaW5jZSBqUXVlcnkudHJpZ2dlcigpIGRvZXNuJ3RcbiAgICAvLyB0cmlnZ2VyIG5hdGl2ZSBldmVudHMgaW4gc29tZSBjYXNlcyBhbmQgc29tZSBwbHVnaW5zXG4gICAgLy8gcmVseSBvbiAkLnRyaWdnZXIoKVxuICAgIC8vXG4gICAgLy8gV2Ugd2FudCB0byBtYWtlIHN1cmUgaWYgYSBsaXN0ZW5lciBpcyBhdHRhY2hlZCB1c2luZ1xuICAgIC8vIGpRdWVyeSwgaXQgaXMgYWxzbyByZW1vdmVkIHdpdGggalF1ZXJ5LCB0aGF0J3Mgd2h5XG4gICAgLy8gd2UgZG8gdGhlIGNoZWNrIGZvciBlYWNoIGRpcmVjdGl2ZSBpbnN0YW5jZSBhbmRcbiAgICAvLyBzdG9yZSB0aGF0IGNoZWNrIHJlc3VsdCBvbiBpdHNlbGYuIFRoaXMgYWxzbyBhbGxvd3NcbiAgICAvLyBlYXNpZXIgdGVzdCBjb3ZlcmFnZSBjb250cm9sIGJ5IHVuc2V0dGluZyB0aGUgZ2xvYmFsXG4gICAgLy8galF1ZXJ5IHZhcmlhYmxlIGluIHRlc3RzLlxuICAgIHRoaXMuaGFzalF1ZXJ5ID0gdHlwZW9mIGpRdWVyeSA9PT0gJ2Z1bmN0aW9uJztcbiAgICBpZiAodGhpcy5oYXNqUXVlcnkpIHtcbiAgICAgIHZhciBtZXRob2QgPSBqUXVlcnkuZm4ub24gPyAnb24nIDogJ2JpbmQnO1xuICAgICAgalF1ZXJ5KGVsKVttZXRob2RdKCdjaGFuZ2UnLCB0aGlzLnJhd0xpc3RlbmVyKTtcbiAgICAgIGlmICghbGF6eSkge1xuICAgICAgICBqUXVlcnkoZWwpW21ldGhvZF0oJ2lucHV0JywgdGhpcy5saXN0ZW5lcik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub24oJ2NoYW5nZScsIHRoaXMucmF3TGlzdGVuZXIpO1xuICAgICAgaWYgKCFsYXp5KSB7XG4gICAgICAgIHRoaXMub24oJ2lucHV0JywgdGhpcy5saXN0ZW5lcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSUU5IGRvZXNuJ3QgZmlyZSBpbnB1dCBldmVudCBvbiBiYWNrc3BhY2UvZGVsL2N1dFxuICAgIGlmICghbGF6eSAmJiBpc0lFOSkge1xuICAgICAgdGhpcy5vbignY3V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBuZXh0VGljayhzZWxmLmxpc3RlbmVyKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5vbigna2V5dXAnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZiAoZS5rZXlDb2RlID09PSA0NiB8fCBlLmtleUNvZGUgPT09IDgpIHtcbiAgICAgICAgICBzZWxmLmxpc3RlbmVyKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHNldCBpbml0aWFsIHZhbHVlIGlmIHByZXNlbnRcbiAgICBpZiAoZWwuaGFzQXR0cmlidXRlKCd2YWx1ZScpIHx8IGVsLnRhZ05hbWUgPT09ICdURVhUQVJFQScgJiYgZWwudmFsdWUudHJpbSgpKSB7XG4gICAgICB0aGlzLmFmdGVyQmluZCA9IHRoaXMubGlzdGVuZXI7XG4gICAgfVxuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKHZhbHVlKSB7XG4gICAgdGhpcy5lbC52YWx1ZSA9IF90b1N0cmluZyh2YWx1ZSk7XG4gIH0sXG5cbiAgdW5iaW5kOiBmdW5jdGlvbiB1bmJpbmQoKSB7XG4gICAgdmFyIGVsID0gdGhpcy5lbDtcbiAgICBpZiAodGhpcy5oYXNqUXVlcnkpIHtcbiAgICAgIHZhciBtZXRob2QgPSBqUXVlcnkuZm4ub2ZmID8gJ29mZicgOiAndW5iaW5kJztcbiAgICAgIGpRdWVyeShlbClbbWV0aG9kXSgnY2hhbmdlJywgdGhpcy5saXN0ZW5lcik7XG4gICAgICBqUXVlcnkoZWwpW21ldGhvZF0oJ2lucHV0JywgdGhpcy5saXN0ZW5lcik7XG4gICAgfVxuICB9XG59O1xuXG52YXIgcmFkaW8gPSB7XG5cbiAgYmluZDogZnVuY3Rpb24gYmluZCgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGVsID0gdGhpcy5lbDtcblxuICAgIHRoaXMuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyB2YWx1ZSBvdmVyd3JpdGUgdmlhIHYtYmluZDp2YWx1ZVxuICAgICAgaWYgKGVsLmhhc093blByb3BlcnR5KCdfdmFsdWUnKSkge1xuICAgICAgICByZXR1cm4gZWwuX3ZhbHVlO1xuICAgICAgfVxuICAgICAgdmFyIHZhbCA9IGVsLnZhbHVlO1xuICAgICAgaWYgKHNlbGYucGFyYW1zLm51bWJlcikge1xuICAgICAgICB2YWwgPSB0b051bWJlcih2YWwpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbDtcbiAgICB9O1xuXG4gICAgdGhpcy5saXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuc2V0KHNlbGYuZ2V0VmFsdWUoKSk7XG4gICAgfTtcbiAgICB0aGlzLm9uKCdjaGFuZ2UnLCB0aGlzLmxpc3RlbmVyKTtcblxuICAgIGlmIChlbC5oYXNBdHRyaWJ1dGUoJ2NoZWNrZWQnKSkge1xuICAgICAgdGhpcy5hZnRlckJpbmQgPSB0aGlzLmxpc3RlbmVyO1xuICAgIH1cbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZSh2YWx1ZSkge1xuICAgIHRoaXMuZWwuY2hlY2tlZCA9IGxvb3NlRXF1YWwodmFsdWUsIHRoaXMuZ2V0VmFsdWUoKSk7XG4gIH1cbn07XG5cbnZhciBzZWxlY3QgPSB7XG5cbiAgYmluZDogZnVuY3Rpb24gYmluZCgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGVsID0gdGhpcy5lbDtcblxuICAgIC8vIG1ldGhvZCB0byBmb3JjZSB1cGRhdGUgRE9NIHVzaW5nIGxhdGVzdCB2YWx1ZS5cbiAgICB0aGlzLmZvcmNlVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3dhdGNoZXIpIHtcbiAgICAgICAgc2VsZi51cGRhdGUoc2VsZi5fd2F0Y2hlci5nZXQoKSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIGNoZWNrIGlmIHRoaXMgaXMgYSBtdWx0aXBsZSBzZWxlY3RcbiAgICB2YXIgbXVsdGlwbGUgPSB0aGlzLm11bHRpcGxlID0gZWwuaGFzQXR0cmlidXRlKCdtdWx0aXBsZScpO1xuXG4gICAgLy8gYXR0YWNoIGxpc3RlbmVyXG4gICAgdGhpcy5saXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciB2YWx1ZSA9IGdldFZhbHVlKGVsLCBtdWx0aXBsZSk7XG4gICAgICB2YWx1ZSA9IHNlbGYucGFyYW1zLm51bWJlciA/IGlzQXJyYXkodmFsdWUpID8gdmFsdWUubWFwKHRvTnVtYmVyKSA6IHRvTnVtYmVyKHZhbHVlKSA6IHZhbHVlO1xuICAgICAgc2VsZi5zZXQodmFsdWUpO1xuICAgIH07XG4gICAgdGhpcy5vbignY2hhbmdlJywgdGhpcy5saXN0ZW5lcik7XG5cbiAgICAvLyBpZiBoYXMgaW5pdGlhbCB2YWx1ZSwgc2V0IGFmdGVyQmluZFxuICAgIHZhciBpbml0VmFsdWUgPSBnZXRWYWx1ZShlbCwgbXVsdGlwbGUsIHRydWUpO1xuICAgIGlmIChtdWx0aXBsZSAmJiBpbml0VmFsdWUubGVuZ3RoIHx8ICFtdWx0aXBsZSAmJiBpbml0VmFsdWUgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuYWZ0ZXJCaW5kID0gdGhpcy5saXN0ZW5lcjtcbiAgICB9XG5cbiAgICAvLyBBbGwgbWFqb3IgYnJvd3NlcnMgZXhjZXB0IEZpcmVmb3ggcmVzZXRzXG4gICAgLy8gc2VsZWN0ZWRJbmRleCB3aXRoIHZhbHVlIC0xIHRvIDAgd2hlbiB0aGUgZWxlbWVudFxuICAgIC8vIGlzIGFwcGVuZGVkIHRvIGEgbmV3IHBhcmVudCwgdGhlcmVmb3JlIHdlIGhhdmUgdG9cbiAgICAvLyBmb3JjZSBhIERPTSB1cGRhdGUgd2hlbmV2ZXIgdGhhdCBoYXBwZW5zLi4uXG4gICAgdGhpcy52bS4kb24oJ2hvb2s6YXR0YWNoZWQnLCB0aGlzLmZvcmNlVXBkYXRlKTtcbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZSh2YWx1ZSkge1xuICAgIHZhciBlbCA9IHRoaXMuZWw7XG4gICAgZWwuc2VsZWN0ZWRJbmRleCA9IC0xO1xuICAgIHZhciBtdWx0aSA9IHRoaXMubXVsdGlwbGUgJiYgaXNBcnJheSh2YWx1ZSk7XG4gICAgdmFyIG9wdGlvbnMgPSBlbC5vcHRpb25zO1xuICAgIHZhciBpID0gb3B0aW9ucy5sZW5ndGg7XG4gICAgdmFyIG9wLCB2YWw7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgb3AgPSBvcHRpb25zW2ldO1xuICAgICAgdmFsID0gb3AuaGFzT3duUHJvcGVydHkoJ192YWx1ZScpID8gb3AuX3ZhbHVlIDogb3AudmFsdWU7XG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSBlcWVxZXEgKi9cbiAgICAgIG9wLnNlbGVjdGVkID0gbXVsdGkgPyBpbmRleE9mJDEodmFsdWUsIHZhbCkgPiAtMSA6IGxvb3NlRXF1YWwodmFsdWUsIHZhbCk7XG4gICAgICAvKiBlc2xpbnQtZW5hYmxlIGVxZXFlcSAqL1xuICAgIH1cbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uIHVuYmluZCgpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAgIHRoaXMudm0uJG9mZignaG9vazphdHRhY2hlZCcsIHRoaXMuZm9yY2VVcGRhdGUpO1xuICB9XG59O1xuXG4vKipcbiAqIEdldCBzZWxlY3QgdmFsdWVcbiAqXG4gKiBAcGFyYW0ge1NlbGVjdEVsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG11bHRpXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGluaXRcbiAqIEByZXR1cm4ge0FycmF5fCp9XG4gKi9cblxuZnVuY3Rpb24gZ2V0VmFsdWUoZWwsIG11bHRpLCBpbml0KSB7XG4gIHZhciByZXMgPSBtdWx0aSA/IFtdIDogbnVsbDtcbiAgdmFyIG9wLCB2YWwsIHNlbGVjdGVkO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGVsLm9wdGlvbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgb3AgPSBlbC5vcHRpb25zW2ldO1xuICAgIHNlbGVjdGVkID0gaW5pdCA/IG9wLmhhc0F0dHJpYnV0ZSgnc2VsZWN0ZWQnKSA6IG9wLnNlbGVjdGVkO1xuICAgIGlmIChzZWxlY3RlZCkge1xuICAgICAgdmFsID0gb3AuaGFzT3duUHJvcGVydHkoJ192YWx1ZScpID8gb3AuX3ZhbHVlIDogb3AudmFsdWU7XG4gICAgICBpZiAobXVsdGkpIHtcbiAgICAgICAgcmVzLnB1c2godmFsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiByZXM7XG59XG5cbi8qKlxuICogTmF0aXZlIEFycmF5LmluZGV4T2YgdXNlcyBzdHJpY3QgZXF1YWwsIGJ1dCBpbiB0aGlzXG4gKiBjYXNlIHdlIG5lZWQgdG8gbWF0Y2ggc3RyaW5nL251bWJlcnMgd2l0aCBjdXN0b20gZXF1YWwuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gYXJyXG4gKiBAcGFyYW0geyp9IHZhbFxuICovXG5cbmZ1bmN0aW9uIGluZGV4T2YkMShhcnIsIHZhbCkge1xuICB2YXIgaSA9IGFyci5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBpZiAobG9vc2VFcXVhbChhcnJbaV0sIHZhbCkpIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbnZhciBjaGVja2JveCA9IHtcblxuICBiaW5kOiBmdW5jdGlvbiBiaW5kKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgZWwgPSB0aGlzLmVsO1xuXG4gICAgdGhpcy5nZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBlbC5oYXNPd25Qcm9wZXJ0eSgnX3ZhbHVlJykgPyBlbC5fdmFsdWUgOiBzZWxmLnBhcmFtcy5udW1iZXIgPyB0b051bWJlcihlbC52YWx1ZSkgOiBlbC52YWx1ZTtcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZ2V0Qm9vbGVhblZhbHVlKCkge1xuICAgICAgdmFyIHZhbCA9IGVsLmNoZWNrZWQ7XG4gICAgICBpZiAodmFsICYmIGVsLmhhc093blByb3BlcnR5KCdfdHJ1ZVZhbHVlJykpIHtcbiAgICAgICAgcmV0dXJuIGVsLl90cnVlVmFsdWU7XG4gICAgICB9XG4gICAgICBpZiAoIXZhbCAmJiBlbC5oYXNPd25Qcm9wZXJ0eSgnX2ZhbHNlVmFsdWUnKSkge1xuICAgICAgICByZXR1cm4gZWwuX2ZhbHNlVmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsO1xuICAgIH1cblxuICAgIHRoaXMubGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbW9kZWwgPSBzZWxmLl93YXRjaGVyLnZhbHVlO1xuICAgICAgaWYgKGlzQXJyYXkobW9kZWwpKSB7XG4gICAgICAgIHZhciB2YWwgPSBzZWxmLmdldFZhbHVlKCk7XG4gICAgICAgIGlmIChlbC5jaGVja2VkKSB7XG4gICAgICAgICAgaWYgKGluZGV4T2YobW9kZWwsIHZhbCkgPCAwKSB7XG4gICAgICAgICAgICBtb2RlbC5wdXNoKHZhbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1vZGVsLiRyZW1vdmUodmFsKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5zZXQoZ2V0Qm9vbGVhblZhbHVlKCkpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLm9uKCdjaGFuZ2UnLCB0aGlzLmxpc3RlbmVyKTtcbiAgICBpZiAoZWwuaGFzQXR0cmlidXRlKCdjaGVja2VkJykpIHtcbiAgICAgIHRoaXMuYWZ0ZXJCaW5kID0gdGhpcy5saXN0ZW5lcjtcbiAgICB9XG4gIH0sXG5cbiAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUodmFsdWUpIHtcbiAgICB2YXIgZWwgPSB0aGlzLmVsO1xuICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgZWwuY2hlY2tlZCA9IGluZGV4T2YodmFsdWUsIHRoaXMuZ2V0VmFsdWUoKSkgPiAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGVsLmhhc093blByb3BlcnR5KCdfdHJ1ZVZhbHVlJykpIHtcbiAgICAgICAgZWwuY2hlY2tlZCA9IGxvb3NlRXF1YWwodmFsdWUsIGVsLl90cnVlVmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwuY2hlY2tlZCA9ICEhdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG52YXIgaGFuZGxlcnMgPSB7XG4gIHRleHQ6IHRleHQkMixcbiAgcmFkaW86IHJhZGlvLFxuICBzZWxlY3Q6IHNlbGVjdCxcbiAgY2hlY2tib3g6IGNoZWNrYm94XG59O1xuXG52YXIgbW9kZWwgPSB7XG5cbiAgcHJpb3JpdHk6IE1PREVMLFxuICB0d29XYXk6IHRydWUsXG4gIGhhbmRsZXJzOiBoYW5kbGVycyxcbiAgcGFyYW1zOiBbJ2xhenknLCAnbnVtYmVyJywgJ2RlYm91bmNlJ10sXG5cbiAgLyoqXG4gICAqIFBvc3NpYmxlIGVsZW1lbnRzOlxuICAgKiAgIDxzZWxlY3Q+XG4gICAqICAgPHRleHRhcmVhPlxuICAgKiAgIDxpbnB1dCB0eXBlPVwiKlwiPlxuICAgKiAgICAgLSB0ZXh0XG4gICAqICAgICAtIGNoZWNrYm94XG4gICAqICAgICAtIHJhZGlvXG4gICAqICAgICAtIG51bWJlclxuICAgKi9cblxuICBiaW5kOiBmdW5jdGlvbiBiaW5kKCkge1xuICAgIC8vIGZyaWVuZGx5IHdhcm5pbmcuLi5cbiAgICB0aGlzLmNoZWNrRmlsdGVycygpO1xuICAgIGlmICh0aGlzLmhhc1JlYWQgJiYgIXRoaXMuaGFzV3JpdGUpIHtcbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgd2FybignSXQgc2VlbXMgeW91IGFyZSB1c2luZyBhIHJlYWQtb25seSBmaWx0ZXIgd2l0aCAnICsgJ3YtbW9kZWwuIFlvdSBtaWdodCB3YW50IHRvIHVzZSBhIHR3by13YXkgZmlsdGVyICcgKyAndG8gZW5zdXJlIGNvcnJlY3QgYmVoYXZpb3IuJyk7XG4gICAgfVxuICAgIHZhciBlbCA9IHRoaXMuZWw7XG4gICAgdmFyIHRhZyA9IGVsLnRhZ05hbWU7XG4gICAgdmFyIGhhbmRsZXI7XG4gICAgaWYgKHRhZyA9PT0gJ0lOUFVUJykge1xuICAgICAgaGFuZGxlciA9IGhhbmRsZXJzW2VsLnR5cGVdIHx8IGhhbmRsZXJzLnRleHQ7XG4gICAgfSBlbHNlIGlmICh0YWcgPT09ICdTRUxFQ1QnKSB7XG4gICAgICBoYW5kbGVyID0gaGFuZGxlcnMuc2VsZWN0O1xuICAgIH0gZWxzZSBpZiAodGFnID09PSAnVEVYVEFSRUEnKSB7XG4gICAgICBoYW5kbGVyID0gaGFuZGxlcnMudGV4dDtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiB3YXJuKCd2LW1vZGVsIGRvZXMgbm90IHN1cHBvcnQgZWxlbWVudCB0eXBlOiAnICsgdGFnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZWwuX192X21vZGVsID0gdGhpcztcbiAgICBoYW5kbGVyLmJpbmQuY2FsbCh0aGlzKTtcbiAgICB0aGlzLnVwZGF0ZSA9IGhhbmRsZXIudXBkYXRlO1xuICAgIHRoaXMuX3VuYmluZCA9IGhhbmRsZXIudW5iaW5kO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayByZWFkL3dyaXRlIGZpbHRlciBzdGF0cy5cbiAgICovXG5cbiAgY2hlY2tGaWx0ZXJzOiBmdW5jdGlvbiBjaGVja0ZpbHRlcnMoKSB7XG4gICAgdmFyIGZpbHRlcnMgPSB0aGlzLmZpbHRlcnM7XG4gICAgaWYgKCFmaWx0ZXJzKSByZXR1cm47XG4gICAgdmFyIGkgPSBmaWx0ZXJzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICB2YXIgZmlsdGVyID0gcmVzb2x2ZUFzc2V0KHRoaXMudm0uJG9wdGlvbnMsICdmaWx0ZXJzJywgZmlsdGVyc1tpXS5uYW1lKTtcbiAgICAgIGlmICh0eXBlb2YgZmlsdGVyID09PSAnZnVuY3Rpb24nIHx8IGZpbHRlci5yZWFkKSB7XG4gICAgICAgIHRoaXMuaGFzUmVhZCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoZmlsdGVyLndyaXRlKSB7XG4gICAgICAgIHRoaXMuaGFzV3JpdGUgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uIHVuYmluZCgpIHtcbiAgICB0aGlzLmVsLl9fdl9tb2RlbCA9IG51bGw7XG4gICAgdGhpcy5fdW5iaW5kICYmIHRoaXMuX3VuYmluZCgpO1xuICB9XG59O1xuXG4vLyBrZXlDb2RlIGFsaWFzZXNcbnZhciBrZXlDb2RlcyA9IHtcbiAgZXNjOiAyNyxcbiAgdGFiOiA5LFxuICBlbnRlcjogMTMsXG4gIHNwYWNlOiAzMixcbiAgJ2RlbGV0ZSc6IFs4LCA0Nl0sXG4gIHVwOiAzOCxcbiAgbGVmdDogMzcsXG4gIHJpZ2h0OiAzOSxcbiAgZG93bjogNDBcbn07XG5cbmZ1bmN0aW9uIGtleUZpbHRlcihoYW5kbGVyLCBrZXlzKSB7XG4gIHZhciBjb2RlcyA9IGtleXMubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIgY2hhckNvZGUgPSBrZXkuY2hhckNvZGVBdCgwKTtcbiAgICBpZiAoY2hhckNvZGUgPiA0NyAmJiBjaGFyQ29kZSA8IDU4KSB7XG4gICAgICByZXR1cm4gcGFyc2VJbnQoa2V5LCAxMCk7XG4gICAgfVxuICAgIGlmIChrZXkubGVuZ3RoID09PSAxKSB7XG4gICAgICBjaGFyQ29kZSA9IGtleS50b1VwcGVyQ2FzZSgpLmNoYXJDb2RlQXQoMCk7XG4gICAgICBpZiAoY2hhckNvZGUgPiA2NCAmJiBjaGFyQ29kZSA8IDkxKSB7XG4gICAgICAgIHJldHVybiBjaGFyQ29kZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGtleUNvZGVzW2tleV07XG4gIH0pO1xuICBjb2RlcyA9IFtdLmNvbmNhdC5hcHBseShbXSwgY29kZXMpO1xuICByZXR1cm4gZnVuY3Rpb24ga2V5SGFuZGxlcihlKSB7XG4gICAgaWYgKGNvZGVzLmluZGV4T2YoZS5rZXlDb2RlKSA+IC0xKSB7XG4gICAgICByZXR1cm4gaGFuZGxlci5jYWxsKHRoaXMsIGUpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gc3RvcEZpbHRlcihoYW5kbGVyKSB7XG4gIHJldHVybiBmdW5jdGlvbiBzdG9wSGFuZGxlcihlKSB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICByZXR1cm4gaGFuZGxlci5jYWxsKHRoaXMsIGUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBwcmV2ZW50RmlsdGVyKGhhbmRsZXIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHByZXZlbnRIYW5kbGVyKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgcmV0dXJuIGhhbmRsZXIuY2FsbCh0aGlzLCBlKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2VsZkZpbHRlcihoYW5kbGVyKSB7XG4gIHJldHVybiBmdW5jdGlvbiBzZWxmSGFuZGxlcihlKSB7XG4gICAgaWYgKGUudGFyZ2V0ID09PSBlLmN1cnJlbnRUYXJnZXQpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLmNhbGwodGhpcywgZSk7XG4gICAgfVxuICB9O1xufVxuXG52YXIgb24kMSA9IHtcblxuICBwcmlvcml0eTogT04sXG4gIGFjY2VwdFN0YXRlbWVudDogdHJ1ZSxcbiAga2V5Q29kZXM6IGtleUNvZGVzLFxuXG4gIGJpbmQ6IGZ1bmN0aW9uIGJpbmQoKSB7XG4gICAgLy8gZGVhbCB3aXRoIGlmcmFtZXNcbiAgICBpZiAodGhpcy5lbC50YWdOYW1lID09PSAnSUZSQU1FJyAmJiB0aGlzLmFyZyAhPT0gJ2xvYWQnKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB0aGlzLmlmcmFtZUJpbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uKHNlbGYuZWwuY29udGVudFdpbmRvdywgc2VsZi5hcmcsIHNlbGYuaGFuZGxlciwgc2VsZi5tb2RpZmllcnMuY2FwdHVyZSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5vbignbG9hZCcsIHRoaXMuaWZyYW1lQmluZCk7XG4gICAgfVxuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKGhhbmRsZXIpIHtcbiAgICAvLyBzdHViIGEgbm9vcCBmb3Igdi1vbiB3aXRoIG5vIHZhbHVlLFxuICAgIC8vIGUuZy4gQG1vdXNlZG93bi5wcmV2ZW50XG4gICAgaWYgKCF0aGlzLmRlc2NyaXB0b3IucmF3KSB7XG4gICAgICBoYW5kbGVyID0gZnVuY3Rpb24gKCkge307XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ3Ytb246JyArIHRoaXMuYXJnICsgJz1cIicgKyB0aGlzLmV4cHJlc3Npb24gKyAnXCIgZXhwZWN0cyBhIGZ1bmN0aW9uIHZhbHVlLCAnICsgJ2dvdCAnICsgaGFuZGxlcik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gYXBwbHkgbW9kaWZpZXJzXG4gICAgaWYgKHRoaXMubW9kaWZpZXJzLnN0b3ApIHtcbiAgICAgIGhhbmRsZXIgPSBzdG9wRmlsdGVyKGhhbmRsZXIpO1xuICAgIH1cbiAgICBpZiAodGhpcy5tb2RpZmllcnMucHJldmVudCkge1xuICAgICAgaGFuZGxlciA9IHByZXZlbnRGaWx0ZXIoaGFuZGxlcik7XG4gICAgfVxuICAgIGlmICh0aGlzLm1vZGlmaWVycy5zZWxmKSB7XG4gICAgICBoYW5kbGVyID0gc2VsZkZpbHRlcihoYW5kbGVyKTtcbiAgICB9XG4gICAgLy8ga2V5IGZpbHRlclxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5tb2RpZmllcnMpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICByZXR1cm4ga2V5ICE9PSAnc3RvcCcgJiYga2V5ICE9PSAncHJldmVudCcgJiYga2V5ICE9PSAnc2VsZic7XG4gICAgfSk7XG4gICAgaWYgKGtleXMubGVuZ3RoKSB7XG4gICAgICBoYW5kbGVyID0ga2V5RmlsdGVyKGhhbmRsZXIsIGtleXMpO1xuICAgIH1cblxuICAgIHRoaXMucmVzZXQoKTtcbiAgICB0aGlzLmhhbmRsZXIgPSBoYW5kbGVyO1xuXG4gICAgaWYgKHRoaXMuaWZyYW1lQmluZCkge1xuICAgICAgdGhpcy5pZnJhbWVCaW5kKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9uKHRoaXMuZWwsIHRoaXMuYXJnLCB0aGlzLmhhbmRsZXIsIHRoaXMubW9kaWZpZXJzLmNhcHR1cmUpO1xuICAgIH1cbiAgfSxcblxuICByZXNldDogZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgdmFyIGVsID0gdGhpcy5pZnJhbWVCaW5kID8gdGhpcy5lbC5jb250ZW50V2luZG93IDogdGhpcy5lbDtcbiAgICBpZiAodGhpcy5oYW5kbGVyKSB7XG4gICAgICBvZmYoZWwsIHRoaXMuYXJnLCB0aGlzLmhhbmRsZXIpO1xuICAgIH1cbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uIHVuYmluZCgpIHtcbiAgICB0aGlzLnJlc2V0KCk7XG4gIH1cbn07XG5cbnZhciBwcmVmaXhlcyA9IFsnLXdlYmtpdC0nLCAnLW1vei0nLCAnLW1zLSddO1xudmFyIGNhbWVsUHJlZml4ZXMgPSBbJ1dlYmtpdCcsICdNb3onLCAnbXMnXTtcbnZhciBpbXBvcnRhbnRSRSA9IC8haW1wb3J0YW50Oz8kLztcbnZhciBwcm9wQ2FjaGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG52YXIgdGVzdEVsID0gbnVsbDtcblxudmFyIHN0eWxlID0ge1xuXG4gIGRlZXA6IHRydWUsXG5cbiAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5lbC5zdHlsZS5jc3NUZXh0ID0gdmFsdWU7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgdGhpcy5oYW5kbGVPYmplY3QodmFsdWUucmVkdWNlKGV4dGVuZCwge30pKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oYW5kbGVPYmplY3QodmFsdWUgfHwge30pO1xuICAgIH1cbiAgfSxcblxuICBoYW5kbGVPYmplY3Q6IGZ1bmN0aW9uIGhhbmRsZU9iamVjdCh2YWx1ZSkge1xuICAgIC8vIGNhY2hlIG9iamVjdCBzdHlsZXMgc28gdGhhdCBvbmx5IGNoYW5nZWQgcHJvcHNcbiAgICAvLyBhcmUgYWN0dWFsbHkgdXBkYXRlZC5cbiAgICB2YXIgY2FjaGUgPSB0aGlzLmNhY2hlIHx8ICh0aGlzLmNhY2hlID0ge30pO1xuICAgIHZhciBuYW1lLCB2YWw7XG4gICAgZm9yIChuYW1lIGluIGNhY2hlKSB7XG4gICAgICBpZiAoIShuYW1lIGluIHZhbHVlKSkge1xuICAgICAgICB0aGlzLmhhbmRsZVNpbmdsZShuYW1lLCBudWxsKTtcbiAgICAgICAgZGVsZXRlIGNhY2hlW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKG5hbWUgaW4gdmFsdWUpIHtcbiAgICAgIHZhbCA9IHZhbHVlW25hbWVdO1xuICAgICAgaWYgKHZhbCAhPT0gY2FjaGVbbmFtZV0pIHtcbiAgICAgICAgY2FjaGVbbmFtZV0gPSB2YWw7XG4gICAgICAgIHRoaXMuaGFuZGxlU2luZ2xlKG5hbWUsIHZhbCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGhhbmRsZVNpbmdsZTogZnVuY3Rpb24gaGFuZGxlU2luZ2xlKHByb3AsIHZhbHVlKSB7XG4gICAgcHJvcCA9IG5vcm1hbGl6ZShwcm9wKTtcbiAgICBpZiAoIXByb3ApIHJldHVybjsgLy8gdW5zdXBwb3J0ZWQgcHJvcFxuICAgIC8vIGNhc3QgcG9zc2libGUgbnVtYmVycy9ib29sZWFucyBpbnRvIHN0cmluZ3NcbiAgICBpZiAodmFsdWUgIT0gbnVsbCkgdmFsdWUgKz0gJyc7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICB2YXIgaXNJbXBvcnRhbnQgPSBpbXBvcnRhbnRSRS50ZXN0KHZhbHVlKSA/ICdpbXBvcnRhbnQnIDogJyc7XG4gICAgICBpZiAoaXNJbXBvcnRhbnQpIHtcbiAgICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKGltcG9ydGFudFJFLCAnJykudHJpbSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5lbC5zdHlsZS5zZXRQcm9wZXJ0eShwcm9wLCB2YWx1ZSwgaXNJbXBvcnRhbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KHByb3ApO1xuICAgIH1cbiAgfVxuXG59O1xuXG4vKipcbiAqIE5vcm1hbGl6ZSBhIENTUyBwcm9wZXJ0eSBuYW1lLlxuICogLSBjYWNoZSByZXN1bHRcbiAqIC0gYXV0byBwcmVmaXhcbiAqIC0gY2FtZWxDYXNlIC0+IGRhc2gtY2FzZVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gbm9ybWFsaXplKHByb3ApIHtcbiAgaWYgKHByb3BDYWNoZVtwcm9wXSkge1xuICAgIHJldHVybiBwcm9wQ2FjaGVbcHJvcF07XG4gIH1cbiAgdmFyIHJlcyA9IHByZWZpeChwcm9wKTtcbiAgcHJvcENhY2hlW3Byb3BdID0gcHJvcENhY2hlW3Jlc10gPSByZXM7XG4gIHJldHVybiByZXM7XG59XG5cbi8qKlxuICogQXV0byBkZXRlY3QgdGhlIGFwcHJvcHJpYXRlIHByZWZpeCBmb3IgYSBDU1MgcHJvcGVydHkuXG4gKiBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9wYXVsaXJpc2gvNTIzNjkyXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHByb3BcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuXG5mdW5jdGlvbiBwcmVmaXgocHJvcCkge1xuICBwcm9wID0gaHlwaGVuYXRlKHByb3ApO1xuICB2YXIgY2FtZWwgPSBjYW1lbGl6ZShwcm9wKTtcbiAgdmFyIHVwcGVyID0gY2FtZWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBjYW1lbC5zbGljZSgxKTtcbiAgaWYgKCF0ZXN0RWwpIHtcbiAgICB0ZXN0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgfVxuICB2YXIgaSA9IHByZWZpeGVzLmxlbmd0aDtcbiAgdmFyIHByZWZpeGVkO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgcHJlZml4ZWQgPSBjYW1lbFByZWZpeGVzW2ldICsgdXBwZXI7XG4gICAgaWYgKHByZWZpeGVkIGluIHRlc3RFbC5zdHlsZSkge1xuICAgICAgcmV0dXJuIHByZWZpeGVzW2ldICsgcHJvcDtcbiAgICB9XG4gIH1cbiAgaWYgKGNhbWVsIGluIHRlc3RFbC5zdHlsZSkge1xuICAgIHJldHVybiBwcm9wO1xuICB9XG59XG5cbi8vIHhsaW5rXG52YXIgeGxpbmtOUyA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJztcbnZhciB4bGlua1JFID0gL154bGluazovO1xuXG4vLyBjaGVjayBmb3IgYXR0cmlidXRlcyB0aGF0IHByb2hpYml0IGludGVycG9sYXRpb25zXG52YXIgZGlzYWxsb3dlZEludGVycEF0dHJSRSA9IC9edi18Xjp8XkB8Xig/OmlzfHRyYW5zaXRpb258dHJhbnNpdGlvbi1tb2RlfGRlYm91bmNlfHRyYWNrLWJ5fHN0YWdnZXJ8ZW50ZXItc3RhZ2dlcnxsZWF2ZS1zdGFnZ2VyKSQvO1xuLy8gdGhlc2UgYXR0cmlidXRlcyBzaG91bGQgYWxzbyBzZXQgdGhlaXIgY29ycmVzcG9uZGluZyBwcm9wZXJ0aWVzXG4vLyBiZWNhdXNlIHRoZXkgb25seSBhZmZlY3QgdGhlIGluaXRpYWwgc3RhdGUgb2YgdGhlIGVsZW1lbnRcbnZhciBhdHRyV2l0aFByb3BzUkUgPSAvXig/OnZhbHVlfGNoZWNrZWR8c2VsZWN0ZWR8bXV0ZWQpJC87XG4vLyB0aGVzZSBhdHRyaWJ1dGVzIGV4cGVjdCBlbnVtcmF0ZWQgdmFsdWVzIG9mIFwidHJ1ZVwiIG9yIFwiZmFsc2VcIlxuLy8gYnV0IGFyZSBub3QgYm9vbGVhbiBhdHRyaWJ1dGVzXG52YXIgZW51bWVyYXRlZEF0dHJSRSA9IC9eKD86ZHJhZ2dhYmxlfGNvbnRlbnRlZGl0YWJsZXxzcGVsbGNoZWNrKSQvO1xuXG4vLyB0aGVzZSBhdHRyaWJ1dGVzIHNob3VsZCBzZXQgYSBoaWRkZW4gcHJvcGVydHkgZm9yXG4vLyBiaW5kaW5nIHYtbW9kZWwgdG8gb2JqZWN0IHZhbHVlc1xudmFyIG1vZGVsUHJvcHMgPSB7XG4gIHZhbHVlOiAnX3ZhbHVlJyxcbiAgJ3RydWUtdmFsdWUnOiAnX3RydWVWYWx1ZScsXG4gICdmYWxzZS12YWx1ZSc6ICdfZmFsc2VWYWx1ZSdcbn07XG5cbnZhciBiaW5kJDEgPSB7XG5cbiAgcHJpb3JpdHk6IEJJTkQsXG5cbiAgYmluZDogZnVuY3Rpb24gYmluZCgpIHtcbiAgICB2YXIgYXR0ciA9IHRoaXMuYXJnO1xuICAgIHZhciB0YWcgPSB0aGlzLmVsLnRhZ05hbWU7XG4gICAgLy8gc2hvdWxkIGJlIGRlZXAgd2F0Y2ggb24gb2JqZWN0IG1vZGVcbiAgICBpZiAoIWF0dHIpIHtcbiAgICAgIHRoaXMuZGVlcCA9IHRydWU7XG4gICAgfVxuICAgIC8vIGhhbmRsZSBpbnRlcnBvbGF0aW9uIGJpbmRpbmdzXG4gICAgdmFyIGRlc2NyaXB0b3IgPSB0aGlzLmRlc2NyaXB0b3I7XG4gICAgdmFyIHRva2VucyA9IGRlc2NyaXB0b3IuaW50ZXJwO1xuICAgIGlmICh0b2tlbnMpIHtcbiAgICAgIC8vIGhhbmRsZSBpbnRlcnBvbGF0aW9ucyB3aXRoIG9uZS10aW1lIHRva2Vuc1xuICAgICAgaWYgKGRlc2NyaXB0b3IuaGFzT25lVGltZSkge1xuICAgICAgICB0aGlzLmV4cHJlc3Npb24gPSB0b2tlbnNUb0V4cCh0b2tlbnMsIHRoaXMuX3Njb3BlIHx8IHRoaXMudm0pO1xuICAgICAgfVxuXG4gICAgICAvLyBvbmx5IGFsbG93IGJpbmRpbmcgb24gbmF0aXZlIGF0dHJpYnV0ZXNcbiAgICAgIGlmIChkaXNhbGxvd2VkSW50ZXJwQXR0clJFLnRlc3QoYXR0cikgfHwgYXR0ciA9PT0gJ25hbWUnICYmICh0YWcgPT09ICdQQVJUSUFMJyB8fCB0YWcgPT09ICdTTE9UJykpIHtcbiAgICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiB3YXJuKGF0dHIgKyAnPVwiJyArIGRlc2NyaXB0b3IucmF3ICsgJ1wiOiAnICsgJ2F0dHJpYnV0ZSBpbnRlcnBvbGF0aW9uIGlzIG5vdCBhbGxvd2VkIGluIFZ1ZS5qcyAnICsgJ2RpcmVjdGl2ZXMgYW5kIHNwZWNpYWwgYXR0cmlidXRlcy4nKTtcbiAgICAgICAgdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7XG4gICAgICAgIHRoaXMuaW52YWxpZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgICAgdmFyIHJhdyA9IGF0dHIgKyAnPVwiJyArIGRlc2NyaXB0b3IucmF3ICsgJ1wiOiAnO1xuICAgICAgICAvLyB3YXJuIHNyY1xuICAgICAgICBpZiAoYXR0ciA9PT0gJ3NyYycpIHtcbiAgICAgICAgICB3YXJuKHJhdyArICdpbnRlcnBvbGF0aW9uIGluIFwic3JjXCIgYXR0cmlidXRlIHdpbGwgY2F1c2UgJyArICdhIDQwNCByZXF1ZXN0LiBVc2Ugdi1iaW5kOnNyYyBpbnN0ZWFkLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gd2FybiBzdHlsZVxuICAgICAgICBpZiAoYXR0ciA9PT0gJ3N0eWxlJykge1xuICAgICAgICAgIHdhcm4ocmF3ICsgJ2ludGVycG9sYXRpb24gaW4gXCJzdHlsZVwiIGF0dHJpYnV0ZSB3aWxsIGNhdXNlICcgKyAndGhlIGF0dHJpYnV0ZSB0byBiZSBkaXNjYXJkZWQgaW4gSW50ZXJuZXQgRXhwbG9yZXIuICcgKyAnVXNlIHYtYmluZDpzdHlsZSBpbnN0ZWFkLicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMuaW52YWxpZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgYXR0ciA9IHRoaXMuYXJnO1xuICAgIGlmICh0aGlzLmFyZykge1xuICAgICAgdGhpcy5oYW5kbGVTaW5nbGUoYXR0ciwgdmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmhhbmRsZU9iamVjdCh2YWx1ZSB8fCB7fSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIHNoYXJlIG9iamVjdCBoYW5kbGVyIHdpdGggdi1iaW5kOmNsYXNzXG4gIGhhbmRsZU9iamVjdDogc3R5bGUuaGFuZGxlT2JqZWN0LFxuXG4gIGhhbmRsZVNpbmdsZTogZnVuY3Rpb24gaGFuZGxlU2luZ2xlKGF0dHIsIHZhbHVlKSB7XG4gICAgdmFyIGVsID0gdGhpcy5lbDtcbiAgICB2YXIgaW50ZXJwID0gdGhpcy5kZXNjcmlwdG9yLmludGVycDtcbiAgICBpZiAodGhpcy5tb2RpZmllcnMuY2FtZWwpIHtcbiAgICAgIGF0dHIgPSBjYW1lbGl6ZShhdHRyKTtcbiAgICB9XG4gICAgaWYgKCFpbnRlcnAgJiYgYXR0cldpdGhQcm9wc1JFLnRlc3QoYXR0cikgJiYgYXR0ciBpbiBlbCkge1xuICAgICAgZWxbYXR0cl0gPSBhdHRyID09PSAndmFsdWUnID8gdmFsdWUgPT0gbnVsbCAvLyBJRTkgd2lsbCBzZXQgaW5wdXQudmFsdWUgdG8gXCJudWxsXCIgZm9yIG51bGwuLi5cbiAgICAgID8gJycgOiB2YWx1ZSA6IHZhbHVlO1xuICAgIH1cbiAgICAvLyBzZXQgbW9kZWwgcHJvcHNcbiAgICB2YXIgbW9kZWxQcm9wID0gbW9kZWxQcm9wc1thdHRyXTtcbiAgICBpZiAoIWludGVycCAmJiBtb2RlbFByb3ApIHtcbiAgICAgIGVsW21vZGVsUHJvcF0gPSB2YWx1ZTtcbiAgICAgIC8vIHVwZGF0ZSB2LW1vZGVsIGlmIHByZXNlbnRcbiAgICAgIHZhciBtb2RlbCA9IGVsLl9fdl9tb2RlbDtcbiAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICBtb2RlbC5saXN0ZW5lcigpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkbyBub3Qgc2V0IHZhbHVlIGF0dHJpYnV0ZSBmb3IgdGV4dGFyZWFcbiAgICBpZiAoYXR0ciA9PT0gJ3ZhbHVlJyAmJiBlbC50YWdOYW1lID09PSAnVEVYVEFSRUEnKSB7XG4gICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHVwZGF0ZSBhdHRyaWJ1dGVcbiAgICBpZiAoZW51bWVyYXRlZEF0dHJSRS50ZXN0KGF0dHIpKSB7XG4gICAgICBlbC5zZXRBdHRyaWJ1dGUoYXR0ciwgdmFsdWUgPyAndHJ1ZScgOiAnZmFsc2UnKTtcbiAgICB9IGVsc2UgaWYgKHZhbHVlICE9IG51bGwgJiYgdmFsdWUgIT09IGZhbHNlKSB7XG4gICAgICBpZiAoYXR0ciA9PT0gJ2NsYXNzJykge1xuICAgICAgICAvLyBoYW5kbGUgZWRnZSBjYXNlICMxOTYwOlxuICAgICAgICAvLyBjbGFzcyBpbnRlcnBvbGF0aW9uIHNob3VsZCBub3Qgb3ZlcndyaXRlIFZ1ZSB0cmFuc2l0aW9uIGNsYXNzXG4gICAgICAgIGlmIChlbC5fX3ZfdHJhbnMpIHtcbiAgICAgICAgICB2YWx1ZSArPSAnICcgKyBlbC5fX3ZfdHJhbnMuaWQgKyAnLXRyYW5zaXRpb24nO1xuICAgICAgICB9XG4gICAgICAgIHNldENsYXNzKGVsLCB2YWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKHhsaW5rUkUudGVzdChhdHRyKSkge1xuICAgICAgICBlbC5zZXRBdHRyaWJ1dGVOUyh4bGlua05TLCBhdHRyLCB2YWx1ZSA9PT0gdHJ1ZSA/ICcnIDogdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKGF0dHIsIHZhbHVlID09PSB0cnVlID8gJycgOiB2YWx1ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBlbCA9IHtcblxuICBwcmlvcml0eTogRUwsXG5cbiAgYmluZDogZnVuY3Rpb24gYmluZCgpIHtcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICBpZiAoIXRoaXMuYXJnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBpZCA9IHRoaXMuaWQgPSBjYW1lbGl6ZSh0aGlzLmFyZyk7XG4gICAgdmFyIHJlZnMgPSAodGhpcy5fc2NvcGUgfHwgdGhpcy52bSkuJGVscztcbiAgICBpZiAoaGFzT3duKHJlZnMsIGlkKSkge1xuICAgICAgcmVmc1tpZF0gPSB0aGlzLmVsO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWZpbmVSZWFjdGl2ZShyZWZzLCBpZCwgdGhpcy5lbCk7XG4gICAgfVxuICB9LFxuXG4gIHVuYmluZDogZnVuY3Rpb24gdW5iaW5kKCkge1xuICAgIHZhciByZWZzID0gKHRoaXMuX3Njb3BlIHx8IHRoaXMudm0pLiRlbHM7XG4gICAgaWYgKHJlZnNbdGhpcy5pZF0gPT09IHRoaXMuZWwpIHtcbiAgICAgIHJlZnNbdGhpcy5pZF0gPSBudWxsO1xuICAgIH1cbiAgfVxufTtcblxudmFyIHJlZiA9IHtcbiAgYmluZDogZnVuY3Rpb24gYmluZCgpIHtcbiAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ3YtcmVmOicgKyB0aGlzLmFyZyArICcgbXVzdCBiZSB1c2VkIG9uIGEgY2hpbGQgJyArICdjb21wb25lbnQuIEZvdW5kIG9uIDwnICsgdGhpcy5lbC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgKyAnPi4nKTtcbiAgfVxufTtcblxudmFyIGNsb2FrID0ge1xuICBiaW5kOiBmdW5jdGlvbiBiaW5kKCkge1xuICAgIHZhciBlbCA9IHRoaXMuZWw7XG4gICAgdGhpcy52bS4kb25jZSgncHJlLWhvb2s6Y29tcGlsZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoJ3YtY2xvYWsnKTtcbiAgICB9KTtcbiAgfVxufTtcblxuLy8gbXVzdCBleHBvcnQgcGxhaW4gb2JqZWN0XG52YXIgZGlyZWN0aXZlcyA9IHtcbiAgdGV4dDogdGV4dCQxLFxuICBodG1sOiBodG1sLFxuICAnZm9yJzogdkZvcixcbiAgJ2lmJzogdklmLFxuICBzaG93OiBzaG93LFxuICBtb2RlbDogbW9kZWwsXG4gIG9uOiBvbiQxLFxuICBiaW5kOiBiaW5kJDEsXG4gIGVsOiBlbCxcbiAgcmVmOiByZWYsXG4gIGNsb2FrOiBjbG9ha1xufTtcblxudmFyIHZDbGFzcyA9IHtcblxuICBkZWVwOiB0cnVlLFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuaGFuZGxlT2JqZWN0KHN0cmluZ1RvT2JqZWN0KHZhbHVlKSk7XG4gICAgfSBlbHNlIGlmIChpc1BsYWluT2JqZWN0KHZhbHVlKSkge1xuICAgICAgdGhpcy5oYW5kbGVPYmplY3QodmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHRoaXMuaGFuZGxlQXJyYXkodmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNsZWFudXAoKTtcbiAgICB9XG4gIH0sXG5cbiAgaGFuZGxlT2JqZWN0OiBmdW5jdGlvbiBoYW5kbGVPYmplY3QodmFsdWUpIHtcbiAgICB0aGlzLmNsZWFudXAodmFsdWUpO1xuICAgIHZhciBrZXlzID0gdGhpcy5wcmV2S2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgIGlmICh2YWx1ZVtrZXldKSB7XG4gICAgICAgIGFkZENsYXNzKHRoaXMuZWwsIGtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZW1vdmVDbGFzcyh0aGlzLmVsLCBrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBoYW5kbGVBcnJheTogZnVuY3Rpb24gaGFuZGxlQXJyYXkodmFsdWUpIHtcbiAgICB0aGlzLmNsZWFudXAodmFsdWUpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAodmFsdWVbaV0pIHtcbiAgICAgICAgYWRkQ2xhc3ModGhpcy5lbCwgdmFsdWVbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLnByZXZLZXlzID0gdmFsdWUuc2xpY2UoKTtcbiAgfSxcblxuICBjbGVhbnVwOiBmdW5jdGlvbiBjbGVhbnVwKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMucHJldktleXMpIHtcbiAgICAgIHZhciBpID0gdGhpcy5wcmV2S2V5cy5sZW5ndGg7XG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIHZhciBrZXkgPSB0aGlzLnByZXZLZXlzW2ldO1xuICAgICAgICBpZiAoa2V5ICYmICghdmFsdWUgfHwgIWNvbnRhaW5zKHZhbHVlLCBrZXkpKSkge1xuICAgICAgICAgIHJlbW92ZUNsYXNzKHRoaXMuZWwsIGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHN0cmluZ1RvT2JqZWN0KHZhbHVlKSB7XG4gIHZhciByZXMgPSB7fTtcbiAgdmFyIGtleXMgPSB2YWx1ZS50cmltKCkuc3BsaXQoL1xccysvKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIHJlc1trZXlzW2ldXSA9IHRydWU7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZnVuY3Rpb24gY29udGFpbnModmFsdWUsIGtleSkge1xuICByZXR1cm4gaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZS5pbmRleE9mKGtleSkgPiAtMSA6IGhhc093bih2YWx1ZSwga2V5KTtcbn1cblxudmFyIGNvbXBvbmVudCA9IHtcblxuICBwcmlvcml0eTogQ09NUE9ORU5ULFxuXG4gIHBhcmFtczogWydrZWVwLWFsaXZlJywgJ3RyYW5zaXRpb24tbW9kZScsICdpbmxpbmUtdGVtcGxhdGUnXSxcblxuICAvKipcbiAgICogU2V0dXAuIFR3byBwb3NzaWJsZSB1c2FnZXM6XG4gICAqXG4gICAqIC0gc3RhdGljOlxuICAgKiAgIDxjb21wPiBvciA8ZGl2IHYtY29tcG9uZW50PVwiY29tcFwiPlxuICAgKlxuICAgKiAtIGR5bmFtaWM6XG4gICAqICAgPGNvbXBvbmVudCA6aXM9XCJ2aWV3XCI+XG4gICAqL1xuXG4gIGJpbmQ6IGZ1bmN0aW9uIGJpbmQoKSB7XG4gICAgaWYgKCF0aGlzLmVsLl9fdnVlX18pIHtcbiAgICAgIC8vIGtlZXAtYWxpdmUgY2FjaGVcbiAgICAgIHRoaXMua2VlcEFsaXZlID0gdGhpcy5wYXJhbXMua2VlcEFsaXZlO1xuICAgICAgaWYgKHRoaXMua2VlcEFsaXZlKSB7XG4gICAgICAgIHRoaXMuY2FjaGUgPSB7fTtcbiAgICAgIH1cbiAgICAgIC8vIGNoZWNrIGlubGluZS10ZW1wbGF0ZVxuICAgICAgaWYgKHRoaXMucGFyYW1zLmlubGluZVRlbXBsYXRlKSB7XG4gICAgICAgIC8vIGV4dHJhY3QgaW5saW5lIHRlbXBsYXRlIGFzIGEgRG9jdW1lbnRGcmFnbWVudFxuICAgICAgICB0aGlzLmlubGluZVRlbXBsYXRlID0gZXh0cmFjdENvbnRlbnQodGhpcy5lbCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICAvLyBjb21wb25lbnQgcmVzb2x1dGlvbiByZWxhdGVkIHN0YXRlXG4gICAgICB0aGlzLnBlbmRpbmdDb21wb25lbnRDYiA9IHRoaXMuQ29tcG9uZW50ID0gbnVsbDtcbiAgICAgIC8vIHRyYW5zaXRpb24gcmVsYXRlZCBzdGF0ZVxuICAgICAgdGhpcy5wZW5kaW5nUmVtb3ZhbHMgPSAwO1xuICAgICAgdGhpcy5wZW5kaW5nUmVtb3ZhbENiID0gbnVsbDtcbiAgICAgIC8vIGNyZWF0ZSBhIHJlZiBhbmNob3JcbiAgICAgIHRoaXMuYW5jaG9yID0gY3JlYXRlQW5jaG9yKCd2LWNvbXBvbmVudCcpO1xuICAgICAgcmVwbGFjZSh0aGlzLmVsLCB0aGlzLmFuY2hvcik7XG4gICAgICAvLyByZW1vdmUgaXMgYXR0cmlidXRlLlxuICAgICAgLy8gdGhpcyBpcyByZW1vdmVkIGR1cmluZyBjb21waWxhdGlvbiwgYnV0IGJlY2F1c2UgY29tcGlsYXRpb24gaXNcbiAgICAgIC8vIGNhY2hlZCwgd2hlbiB0aGUgY29tcG9uZW50IGlzIHVzZWQgZWxzZXdoZXJlIHRoaXMgYXR0cmlidXRlXG4gICAgICAvLyB3aWxsIHJlbWFpbiBhdCBsaW5rIHRpbWUuXG4gICAgICB0aGlzLmVsLnJlbW92ZUF0dHJpYnV0ZSgnaXMnKTtcbiAgICAgIC8vIHJlbW92ZSByZWYsIHNhbWUgYXMgYWJvdmVcbiAgICAgIGlmICh0aGlzLmRlc2NyaXB0b3IucmVmKSB7XG4gICAgICAgIHRoaXMuZWwucmVtb3ZlQXR0cmlidXRlKCd2LXJlZjonICsgaHlwaGVuYXRlKHRoaXMuZGVzY3JpcHRvci5yZWYpKTtcbiAgICAgIH1cbiAgICAgIC8vIGlmIHN0YXRpYywgYnVpbGQgcmlnaHQgbm93LlxuICAgICAgaWYgKHRoaXMubGl0ZXJhbCkge1xuICAgICAgICB0aGlzLnNldENvbXBvbmVudCh0aGlzLmV4cHJlc3Npb24pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ2Nhbm5vdCBtb3VudCBjb21wb25lbnQgXCInICsgdGhpcy5leHByZXNzaW9uICsgJ1wiICcgKyAnb24gYWxyZWFkeSBtb3VudGVkIGVsZW1lbnQ6ICcgKyB0aGlzLmVsKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFB1YmxpYyB1cGRhdGUsIGNhbGxlZCBieSB0aGUgd2F0Y2hlciBpbiB0aGUgZHluYW1pY1xuICAgKiBsaXRlcmFsIHNjZW5hcmlvLCBlLmcuIDxjb21wb25lbnQgOmlzPVwidmlld1wiPlxuICAgKi9cblxuICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZSh2YWx1ZSkge1xuICAgIGlmICghdGhpcy5saXRlcmFsKSB7XG4gICAgICB0aGlzLnNldENvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBTd2l0Y2ggZHluYW1pYyBjb21wb25lbnRzLiBNYXkgcmVzb2x2ZSB0aGUgY29tcG9uZW50XG4gICAqIGFzeW5jaHJvbm91c2x5LCBhbmQgcGVyZm9ybSB0cmFuc2l0aW9uIGJhc2VkIG9uXG4gICAqIHNwZWNpZmllZCB0cmFuc2l0aW9uIG1vZGUuIEFjY2VwdHMgYSBmZXcgYWRkaXRpb25hbFxuICAgKiBhcmd1bWVudHMgc3BlY2lmaWNhbGx5IGZvciB2dWUtcm91dGVyLlxuICAgKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIGZ1bGwgdHJhbnNpdGlvbiBpc1xuICAgKiBmaW5pc2hlZC5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl1cbiAgICovXG5cbiAgc2V0Q29tcG9uZW50OiBmdW5jdGlvbiBzZXRDb21wb25lbnQodmFsdWUsIGNiKSB7XG4gICAgdGhpcy5pbnZhbGlkYXRlUGVuZGluZygpO1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIC8vIGp1c3QgcmVtb3ZlIGN1cnJlbnRcbiAgICAgIHRoaXMudW5idWlsZCh0cnVlKTtcbiAgICAgIHRoaXMucmVtb3ZlKHRoaXMuY2hpbGRWTSwgY2IpO1xuICAgICAgdGhpcy5jaGlsZFZNID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdGhpcy5yZXNvbHZlQ29tcG9uZW50KHZhbHVlLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYubW91bnRDb21wb25lbnQoY2IpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBSZXNvbHZlIHRoZSBjb21wb25lbnQgY29uc3RydWN0b3IgdG8gdXNlIHdoZW4gY3JlYXRpbmdcbiAgICogdGhlIGNoaWxkIHZtLlxuICAgKi9cblxuICByZXNvbHZlQ29tcG9uZW50OiBmdW5jdGlvbiByZXNvbHZlQ29tcG9uZW50KGlkLCBjYikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLnBlbmRpbmdDb21wb25lbnRDYiA9IGNhbmNlbGxhYmxlKGZ1bmN0aW9uIChDb21wb25lbnQpIHtcbiAgICAgIHNlbGYuQ29tcG9uZW50TmFtZSA9IENvbXBvbmVudC5vcHRpb25zLm5hbWUgfHwgaWQ7XG4gICAgICBzZWxmLkNvbXBvbmVudCA9IENvbXBvbmVudDtcbiAgICAgIGNiKCk7XG4gICAgfSk7XG4gICAgdGhpcy52bS5fcmVzb2x2ZUNvbXBvbmVudChpZCwgdGhpcy5wZW5kaW5nQ29tcG9uZW50Q2IpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgaW5zdGFuY2UgdXNpbmcgdGhlIGN1cnJlbnQgY29uc3RydWN0b3IgYW5kXG4gICAqIHJlcGxhY2UgdGhlIGV4aXN0aW5nIGluc3RhbmNlLiBUaGlzIG1ldGhvZCBkb2Vzbid0IGNhcmVcbiAgICogd2hldGhlciB0aGUgbmV3IGNvbXBvbmVudCBhbmQgdGhlIG9sZCBvbmUgYXJlIGFjdHVhbGx5XG4gICAqIHRoZSBzYW1lLlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gICAqL1xuXG4gIG1vdW50Q29tcG9uZW50OiBmdW5jdGlvbiBtb3VudENvbXBvbmVudChjYikge1xuICAgIC8vIGFjdHVhbCBtb3VudFxuICAgIHRoaXMudW5idWlsZCh0cnVlKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGFjdGl2YXRlSG9va3MgPSB0aGlzLkNvbXBvbmVudC5vcHRpb25zLmFjdGl2YXRlO1xuICAgIHZhciBjYWNoZWQgPSB0aGlzLmdldENhY2hlZCgpO1xuICAgIHZhciBuZXdDb21wb25lbnQgPSB0aGlzLmJ1aWxkKCk7XG4gICAgaWYgKGFjdGl2YXRlSG9va3MgJiYgIWNhY2hlZCkge1xuICAgICAgdGhpcy53YWl0aW5nRm9yID0gbmV3Q29tcG9uZW50O1xuICAgICAgY2FsbEFjdGl2YXRlSG9va3MoYWN0aXZhdGVIb29rcywgbmV3Q29tcG9uZW50LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChzZWxmLndhaXRpbmdGb3IgIT09IG5ld0NvbXBvbmVudCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLndhaXRpbmdGb3IgPSBudWxsO1xuICAgICAgICBzZWxmLnRyYW5zaXRpb24obmV3Q29tcG9uZW50LCBjYik7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdXBkYXRlIHJlZiBmb3Iga2VwdC1hbGl2ZSBjb21wb25lbnRcbiAgICAgIGlmIChjYWNoZWQpIHtcbiAgICAgICAgbmV3Q29tcG9uZW50Ll91cGRhdGVSZWYoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudHJhbnNpdGlvbihuZXdDb21wb25lbnQsIGNiKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFdoZW4gdGhlIGNvbXBvbmVudCBjaGFuZ2VzIG9yIHVuYmluZHMgYmVmb3JlIGFuIGFzeW5jXG4gICAqIGNvbnN0cnVjdG9yIGlzIHJlc29sdmVkLCB3ZSBuZWVkIHRvIGludmFsaWRhdGUgaXRzXG4gICAqIHBlbmRpbmcgY2FsbGJhY2suXG4gICAqL1xuXG4gIGludmFsaWRhdGVQZW5kaW5nOiBmdW5jdGlvbiBpbnZhbGlkYXRlUGVuZGluZygpIHtcbiAgICBpZiAodGhpcy5wZW5kaW5nQ29tcG9uZW50Q2IpIHtcbiAgICAgIHRoaXMucGVuZGluZ0NvbXBvbmVudENiLmNhbmNlbCgpO1xuICAgICAgdGhpcy5wZW5kaW5nQ29tcG9uZW50Q2IgPSBudWxsO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogSW5zdGFudGlhdGUvaW5zZXJ0IGEgbmV3IGNoaWxkIHZtLlxuICAgKiBJZiBrZWVwIGFsaXZlIGFuZCBoYXMgY2FjaGVkIGluc3RhbmNlLCBpbnNlcnQgdGhhdFxuICAgKiBpbnN0YW5jZTsgb3RoZXJ3aXNlIGJ1aWxkIGEgbmV3IG9uZSBhbmQgY2FjaGUgaXQuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbZXh0cmFPcHRpb25zXVxuICAgKiBAcmV0dXJuIHtWdWV9IC0gdGhlIGNyZWF0ZWQgaW5zdGFuY2VcbiAgICovXG5cbiAgYnVpbGQ6IGZ1bmN0aW9uIGJ1aWxkKGV4dHJhT3B0aW9ucykge1xuICAgIHZhciBjYWNoZWQgPSB0aGlzLmdldENhY2hlZCgpO1xuICAgIGlmIChjYWNoZWQpIHtcbiAgICAgIHJldHVybiBjYWNoZWQ7XG4gICAgfVxuICAgIGlmICh0aGlzLkNvbXBvbmVudCkge1xuICAgICAgLy8gZGVmYXVsdCBvcHRpb25zXG4gICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgbmFtZTogdGhpcy5Db21wb25lbnROYW1lLFxuICAgICAgICBlbDogY2xvbmVOb2RlKHRoaXMuZWwpLFxuICAgICAgICB0ZW1wbGF0ZTogdGhpcy5pbmxpbmVUZW1wbGF0ZSxcbiAgICAgICAgLy8gbWFrZSBzdXJlIHRvIGFkZCB0aGUgY2hpbGQgd2l0aCBjb3JyZWN0IHBhcmVudFxuICAgICAgICAvLyBpZiB0aGlzIGlzIGEgdHJhbnNjbHVkZWQgY29tcG9uZW50LCBpdHMgcGFyZW50XG4gICAgICAgIC8vIHNob3VsZCBiZSB0aGUgdHJhbnNjbHVzaW9uIGhvc3QuXG4gICAgICAgIHBhcmVudDogdGhpcy5faG9zdCB8fCB0aGlzLnZtLFxuICAgICAgICAvLyBpZiBubyBpbmxpbmUtdGVtcGxhdGUsIHRoZW4gdGhlIGNvbXBpbGVkXG4gICAgICAgIC8vIGxpbmtlciBjYW4gYmUgY2FjaGVkIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2UuXG4gICAgICAgIF9saW5rZXJDYWNoYWJsZTogIXRoaXMuaW5saW5lVGVtcGxhdGUsXG4gICAgICAgIF9yZWY6IHRoaXMuZGVzY3JpcHRvci5yZWYsXG4gICAgICAgIF9hc0NvbXBvbmVudDogdHJ1ZSxcbiAgICAgICAgX2lzUm91dGVyVmlldzogdGhpcy5faXNSb3V0ZXJWaWV3LFxuICAgICAgICAvLyBpZiB0aGlzIGlzIGEgdHJhbnNjbHVkZWQgY29tcG9uZW50LCBjb250ZXh0XG4gICAgICAgIC8vIHdpbGwgYmUgdGhlIGNvbW1vbiBwYXJlbnQgdm0gb2YgdGhpcyBpbnN0YW5jZVxuICAgICAgICAvLyBhbmQgaXRzIGhvc3QuXG4gICAgICAgIF9jb250ZXh0OiB0aGlzLnZtLFxuICAgICAgICAvLyBpZiB0aGlzIGlzIGluc2lkZSBhbiBpbmxpbmUgdi1mb3IsIHRoZSBzY29wZVxuICAgICAgICAvLyB3aWxsIGJlIHRoZSBpbnRlcm1lZGlhdGUgc2NvcGUgY3JlYXRlZCBmb3IgdGhpc1xuICAgICAgICAvLyByZXBlYXQgZnJhZ21lbnQuIHRoaXMgaXMgdXNlZCBmb3IgbGlua2luZyBwcm9wc1xuICAgICAgICAvLyBhbmQgY29udGFpbmVyIGRpcmVjdGl2ZXMuXG4gICAgICAgIF9zY29wZTogdGhpcy5fc2NvcGUsXG4gICAgICAgIC8vIHBhc3MgaW4gdGhlIG93bmVyIGZyYWdtZW50IG9mIHRoaXMgY29tcG9uZW50LlxuICAgICAgICAvLyB0aGlzIGlzIG5lY2Vzc2FyeSBzbyB0aGF0IHRoZSBmcmFnbWVudCBjYW4ga2VlcFxuICAgICAgICAvLyB0cmFjayBvZiBpdHMgY29udGFpbmVkIGNvbXBvbmVudHMgaW4gb3JkZXIgdG9cbiAgICAgICAgLy8gY2FsbCBhdHRhY2gvZGV0YWNoIGhvb2tzIGZvciB0aGVtLlxuICAgICAgICBfZnJhZzogdGhpcy5fZnJhZ1xuICAgICAgfTtcbiAgICAgIC8vIGV4dHJhIG9wdGlvbnNcbiAgICAgIC8vIGluIDEuMC4wIHRoaXMgaXMgdXNlZCBieSB2dWUtcm91dGVyIG9ubHlcbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKGV4dHJhT3B0aW9ucykge1xuICAgICAgICBleHRlbmQob3B0aW9ucywgZXh0cmFPcHRpb25zKTtcbiAgICAgIH1cbiAgICAgIHZhciBjaGlsZCA9IG5ldyB0aGlzLkNvbXBvbmVudChvcHRpb25zKTtcbiAgICAgIGlmICh0aGlzLmtlZXBBbGl2ZSkge1xuICAgICAgICB0aGlzLmNhY2hlW3RoaXMuQ29tcG9uZW50LmNpZF0gPSBjaGlsZDtcbiAgICAgIH1cbiAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgdGhpcy5lbC5oYXNBdHRyaWJ1dGUoJ3RyYW5zaXRpb24nKSAmJiBjaGlsZC5faXNGcmFnbWVudCkge1xuICAgICAgICB3YXJuKCdUcmFuc2l0aW9ucyB3aWxsIG5vdCB3b3JrIG9uIGEgZnJhZ21lbnQgaW5zdGFuY2UuICcgKyAnVGVtcGxhdGU6ICcgKyBjaGlsZC4kb3B0aW9ucy50ZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gY2hpbGQ7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBUcnkgdG8gZ2V0IGEgY2FjaGVkIGluc3RhbmNlIG9mIHRoZSBjdXJyZW50IGNvbXBvbmVudC5cbiAgICpcbiAgICogQHJldHVybiB7VnVlfHVuZGVmaW5lZH1cbiAgICovXG5cbiAgZ2V0Q2FjaGVkOiBmdW5jdGlvbiBnZXRDYWNoZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMua2VlcEFsaXZlICYmIHRoaXMuY2FjaGVbdGhpcy5Db21wb25lbnQuY2lkXTtcbiAgfSxcblxuICAvKipcbiAgICogVGVhcmRvd24gdGhlIGN1cnJlbnQgY2hpbGQsIGJ1dCBkZWZlcnMgY2xlYW51cCBzb1xuICAgKiB0aGF0IHdlIGNhbiBzZXBhcmF0ZSB0aGUgZGVzdHJveSBhbmQgcmVtb3ZhbCBzdGVwcy5cbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufSBkZWZlclxuICAgKi9cblxuICB1bmJ1aWxkOiBmdW5jdGlvbiB1bmJ1aWxkKGRlZmVyKSB7XG4gICAgaWYgKHRoaXMud2FpdGluZ0Zvcikge1xuICAgICAgdGhpcy53YWl0aW5nRm9yLiRkZXN0cm95KCk7XG4gICAgICB0aGlzLndhaXRpbmdGb3IgPSBudWxsO1xuICAgIH1cbiAgICB2YXIgY2hpbGQgPSB0aGlzLmNoaWxkVk07XG4gICAgaWYgKCFjaGlsZCB8fCB0aGlzLmtlZXBBbGl2ZSkge1xuICAgICAgaWYgKGNoaWxkKSB7XG4gICAgICAgIC8vIHJlbW92ZSByZWZcbiAgICAgICAgY2hpbGQuX2luYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgY2hpbGQuX3VwZGF0ZVJlZih0cnVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gdGhlIHNvbGUgcHVycG9zZSBvZiBgZGVmZXJDbGVhbnVwYCBpcyBzbyB0aGF0IHdlIGNhblxuICAgIC8vIFwiZGVhY3RpdmF0ZVwiIHRoZSB2bSByaWdodCBub3cgYW5kIHBlcmZvcm0gRE9NIHJlbW92YWxcbiAgICAvLyBsYXRlci5cbiAgICBjaGlsZC4kZGVzdHJveShmYWxzZSwgZGVmZXIpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmUgY3VycmVudCBkZXN0cm95ZWQgY2hpbGQgYW5kIG1hbnVhbGx5IGRvXG4gICAqIHRoZSBjbGVhbnVwIGFmdGVyIHJlbW92YWwuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gICAqL1xuXG4gIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKGNoaWxkLCBjYikge1xuICAgIHZhciBrZWVwQWxpdmUgPSB0aGlzLmtlZXBBbGl2ZTtcbiAgICBpZiAoY2hpbGQpIHtcbiAgICAgIC8vIHdlIG1heSBoYXZlIGEgY29tcG9uZW50IHN3aXRjaCB3aGVuIGEgcHJldmlvdXNcbiAgICAgIC8vIGNvbXBvbmVudCBpcyBzdGlsbCBiZWluZyB0cmFuc2l0aW9uZWQgb3V0LlxuICAgICAgLy8gd2Ugd2FudCB0byB0cmlnZ2VyIG9ubHkgb25lIGxhc3Rlc3QgaW5zZXJ0aW9uIGNiXG4gICAgICAvLyB3aGVuIHRoZSBleGlzdGluZyB0cmFuc2l0aW9uIGZpbmlzaGVzLiAoIzExMTkpXG4gICAgICB0aGlzLnBlbmRpbmdSZW1vdmFscysrO1xuICAgICAgdGhpcy5wZW5kaW5nUmVtb3ZhbENiID0gY2I7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBjaGlsZC4kcmVtb3ZlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5wZW5kaW5nUmVtb3ZhbHMtLTtcbiAgICAgICAgaWYgKCFrZWVwQWxpdmUpIGNoaWxkLl9jbGVhbnVwKCk7XG4gICAgICAgIGlmICghc2VsZi5wZW5kaW5nUmVtb3ZhbHMgJiYgc2VsZi5wZW5kaW5nUmVtb3ZhbENiKSB7XG4gICAgICAgICAgc2VsZi5wZW5kaW5nUmVtb3ZhbENiKCk7XG4gICAgICAgICAgc2VsZi5wZW5kaW5nUmVtb3ZhbENiID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChjYikge1xuICAgICAgY2IoKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFjdHVhbGx5IHN3YXAgdGhlIGNvbXBvbmVudHMsIGRlcGVuZGluZyBvbiB0aGVcbiAgICogdHJhbnNpdGlvbiBtb2RlLiBEZWZhdWx0cyB0byBzaW11bHRhbmVvdXMuXG4gICAqXG4gICAqIEBwYXJhbSB7VnVlfSB0YXJnZXRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICAgKi9cblxuICB0cmFuc2l0aW9uOiBmdW5jdGlvbiB0cmFuc2l0aW9uKHRhcmdldCwgY2IpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGN1cnJlbnQgPSB0aGlzLmNoaWxkVk07XG4gICAgLy8gZm9yIGRldnRvb2wgaW5zcGVjdGlvblxuICAgIGlmIChjdXJyZW50KSBjdXJyZW50Ll9pbmFjdGl2ZSA9IHRydWU7XG4gICAgdGFyZ2V0Ll9pbmFjdGl2ZSA9IGZhbHNlO1xuICAgIHRoaXMuY2hpbGRWTSA9IHRhcmdldDtcbiAgICBzd2l0Y2ggKHNlbGYucGFyYW1zLnRyYW5zaXRpb25Nb2RlKSB7XG4gICAgICBjYXNlICdpbi1vdXQnOlxuICAgICAgICB0YXJnZXQuJGJlZm9yZShzZWxmLmFuY2hvciwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHNlbGYucmVtb3ZlKGN1cnJlbnQsIGNiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnb3V0LWluJzpcbiAgICAgICAgc2VsZi5yZW1vdmUoY3VycmVudCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRhcmdldC4kYmVmb3JlKHNlbGYuYW5jaG9yLCBjYik7XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHNlbGYucmVtb3ZlKGN1cnJlbnQpO1xuICAgICAgICB0YXJnZXQuJGJlZm9yZShzZWxmLmFuY2hvciwgY2IpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogVW5iaW5kLlxuICAgKi9cblxuICB1bmJpbmQ6IGZ1bmN0aW9uIHVuYmluZCgpIHtcbiAgICB0aGlzLmludmFsaWRhdGVQZW5kaW5nKCk7XG4gICAgLy8gRG8gbm90IGRlZmVyIGNsZWFudXAgd2hlbiB1bmJpbmRpbmdcbiAgICB0aGlzLnVuYnVpbGQoKTtcbiAgICAvLyBkZXN0cm95IGFsbCBrZWVwLWFsaXZlIGNhY2hlZCBpbnN0YW5jZXNcbiAgICBpZiAodGhpcy5jYWNoZSkge1xuICAgICAgZm9yICh2YXIga2V5IGluIHRoaXMuY2FjaGUpIHtcbiAgICAgICAgdGhpcy5jYWNoZVtrZXldLiRkZXN0cm95KCk7XG4gICAgICB9XG4gICAgICB0aGlzLmNhY2hlID0gbnVsbDtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogQ2FsbCBhY3RpdmF0ZSBob29rcyBpbiBvcmRlciAoYXN5bmNocm9ub3VzKVxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGhvb2tzXG4gKiBAcGFyYW0ge1Z1ZX0gdm1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gKi9cblxuZnVuY3Rpb24gY2FsbEFjdGl2YXRlSG9va3MoaG9va3MsIHZtLCBjYikge1xuICB2YXIgdG90YWwgPSBob29rcy5sZW5ndGg7XG4gIHZhciBjYWxsZWQgPSAwO1xuICBob29rc1swXS5jYWxsKHZtLCBuZXh0KTtcbiAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICBpZiAoKytjYWxsZWQgPj0gdG90YWwpIHtcbiAgICAgIGNiKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGhvb2tzW2NhbGxlZF0uY2FsbCh2bSwgbmV4dCk7XG4gICAgfVxuICB9XG59XG5cbnZhciBiaW5kaW5nTW9kZXMgPSBjb25maWcuX3Byb3BCaW5kaW5nTW9kZXM7XG5cbnZhciBwcm9wRGVmID0ge1xuXG4gIGJpbmQ6IGZ1bmN0aW9uIGJpbmQoKSB7XG4gICAgdmFyIGNoaWxkID0gdGhpcy52bTtcbiAgICB2YXIgcGFyZW50ID0gY2hpbGQuX2NvbnRleHQ7XG4gICAgLy8gcGFzc2VkIGluIGZyb20gY29tcGlsZXIgZGlyZWN0bHlcbiAgICB2YXIgcHJvcCA9IHRoaXMuZGVzY3JpcHRvci5wcm9wO1xuICAgIHZhciBjaGlsZEtleSA9IHByb3AucGF0aDtcbiAgICB2YXIgcGFyZW50S2V5ID0gcHJvcC5wYXJlbnRQYXRoO1xuICAgIHZhciB0d29XYXkgPSBwcm9wLm1vZGUgPT09IGJpbmRpbmdNb2Rlcy5UV09fV0FZO1xuXG4gICAgdmFyIHBhcmVudFdhdGNoZXIgPSB0aGlzLnBhcmVudFdhdGNoZXIgPSBuZXcgV2F0Y2hlcihwYXJlbnQsIHBhcmVudEtleSwgZnVuY3Rpb24gKHZhbCkge1xuICAgICAgdmFsID0gY29lcmNlUHJvcChwcm9wLCB2YWwpO1xuICAgICAgaWYgKGFzc2VydFByb3AocHJvcCwgdmFsKSkge1xuICAgICAgICBjaGlsZFtjaGlsZEtleV0gPSB2YWw7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAgdHdvV2F5OiB0d29XYXksXG4gICAgICBmaWx0ZXJzOiBwcm9wLmZpbHRlcnMsXG4gICAgICAvLyBpbXBvcnRhbnQ6IHByb3BzIG5lZWQgdG8gYmUgb2JzZXJ2ZWQgb24gdGhlXG4gICAgICAvLyB2LWZvciBzY29wZSBpZiBwcmVzZW50XG4gICAgICBzY29wZTogdGhpcy5fc2NvcGVcbiAgICB9KTtcblxuICAgIC8vIHNldCB0aGUgY2hpbGQgaW5pdGlhbCB2YWx1ZS5cbiAgICBpbml0UHJvcChjaGlsZCwgcHJvcCwgcGFyZW50V2F0Y2hlci52YWx1ZSk7XG5cbiAgICAvLyBzZXR1cCB0d28td2F5IGJpbmRpbmdcbiAgICBpZiAodHdvV2F5KSB7XG4gICAgICAvLyBpbXBvcnRhbnQ6IGRlZmVyIHRoZSBjaGlsZCB3YXRjaGVyIGNyZWF0aW9uIHVudGlsXG4gICAgICAvLyB0aGUgY3JlYXRlZCBob29rIChhZnRlciBkYXRhIG9ic2VydmF0aW9uKVxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgY2hpbGQuJG9uY2UoJ3ByZS1ob29rOmNyZWF0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuY2hpbGRXYXRjaGVyID0gbmV3IFdhdGNoZXIoY2hpbGQsIGNoaWxkS2V5LCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgcGFyZW50V2F0Y2hlci5zZXQodmFsKTtcbiAgICAgICAgfSwge1xuICAgICAgICAgIC8vIGVuc3VyZSBzeW5jIHVwd2FyZCBiZWZvcmUgcGFyZW50IHN5bmMgZG93bi5cbiAgICAgICAgICAvLyB0aGlzIGlzIG5lY2Vzc2FyeSBpbiBjYXNlcyBlLmcuIHRoZSBjaGlsZFxuICAgICAgICAgIC8vIG11dGF0ZXMgYSBwcm9wIGFycmF5LCB0aGVuIHJlcGxhY2VzIGl0LiAoIzE2ODMpXG4gICAgICAgICAgc3luYzogdHJ1ZVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uIHVuYmluZCgpIHtcbiAgICB0aGlzLnBhcmVudFdhdGNoZXIudGVhcmRvd24oKTtcbiAgICBpZiAodGhpcy5jaGlsZFdhdGNoZXIpIHtcbiAgICAgIHRoaXMuY2hpbGRXYXRjaGVyLnRlYXJkb3duKCk7XG4gICAgfVxuICB9XG59O1xuXG52YXIgcXVldWUkMSA9IFtdO1xudmFyIHF1ZXVlZCA9IGZhbHNlO1xuXG4vKipcbiAqIFB1c2ggYSBqb2IgaW50byB0aGUgcXVldWUuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gam9iXG4gKi9cblxuZnVuY3Rpb24gcHVzaEpvYihqb2IpIHtcbiAgcXVldWUkMS5wdXNoKGpvYik7XG4gIGlmICghcXVldWVkKSB7XG4gICAgcXVldWVkID0gdHJ1ZTtcbiAgICBuZXh0VGljayhmbHVzaCk7XG4gIH1cbn1cblxuLyoqXG4gKiBGbHVzaCB0aGUgcXVldWUsIGFuZCBkbyBvbmUgZm9yY2VkIHJlZmxvdyBiZWZvcmVcbiAqIHRyaWdnZXJpbmcgdHJhbnNpdGlvbnMuXG4gKi9cblxuZnVuY3Rpb24gZmx1c2goKSB7XG4gIC8vIEZvcmNlIGxheW91dFxuICB2YXIgZiA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5vZmZzZXRIZWlnaHQ7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcXVldWUkMS5sZW5ndGg7IGkrKykge1xuICAgIHF1ZXVlJDFbaV0oKTtcbiAgfVxuICBxdWV1ZSQxID0gW107XG4gIHF1ZXVlZCA9IGZhbHNlO1xuICAvLyBkdW1teSByZXR1cm4sIHNvIGpzIGxpbnRlcnMgZG9uJ3QgY29tcGxhaW4gYWJvdXRcbiAgLy8gdW51c2VkIHZhcmlhYmxlIGZcbiAgcmV0dXJuIGY7XG59XG5cbnZhciBUWVBFX1RSQU5TSVRJT04gPSAndHJhbnNpdGlvbic7XG52YXIgVFlQRV9BTklNQVRJT04gPSAnYW5pbWF0aW9uJztcbnZhciB0cmFuc0R1cmF0aW9uUHJvcCA9IHRyYW5zaXRpb25Qcm9wICsgJ0R1cmF0aW9uJztcbnZhciBhbmltRHVyYXRpb25Qcm9wID0gYW5pbWF0aW9uUHJvcCArICdEdXJhdGlvbic7XG5cbi8qKlxuICogQSBUcmFuc2l0aW9uIG9iamVjdCB0aGF0IGVuY2Fwc3VsYXRlcyB0aGUgc3RhdGUgYW5kIGxvZ2ljXG4gKiBvZiB0aGUgdHJhbnNpdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge1N0cmluZ30gaWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBob29rc1xuICogQHBhcmFtIHtWdWV9IHZtXG4gKi9cbmZ1bmN0aW9uIFRyYW5zaXRpb24oZWwsIGlkLCBob29rcywgdm0pIHtcbiAgdGhpcy5pZCA9IGlkO1xuICB0aGlzLmVsID0gZWw7XG4gIHRoaXMuZW50ZXJDbGFzcyA9IGhvb2tzICYmIGhvb2tzLmVudGVyQ2xhc3MgfHwgaWQgKyAnLWVudGVyJztcbiAgdGhpcy5sZWF2ZUNsYXNzID0gaG9va3MgJiYgaG9va3MubGVhdmVDbGFzcyB8fCBpZCArICctbGVhdmUnO1xuICB0aGlzLmhvb2tzID0gaG9va3M7XG4gIHRoaXMudm0gPSB2bTtcbiAgLy8gYXN5bmMgc3RhdGVcbiAgdGhpcy5wZW5kaW5nQ3NzRXZlbnQgPSB0aGlzLnBlbmRpbmdDc3NDYiA9IHRoaXMuY2FuY2VsID0gdGhpcy5wZW5kaW5nSnNDYiA9IHRoaXMub3AgPSB0aGlzLmNiID0gbnVsbDtcbiAgdGhpcy5qdXN0RW50ZXJlZCA9IGZhbHNlO1xuICB0aGlzLmVudGVyZWQgPSB0aGlzLmxlZnQgPSBmYWxzZTtcbiAgdGhpcy50eXBlQ2FjaGUgPSB7fTtcbiAgLy8gY2hlY2sgY3NzIHRyYW5zaXRpb24gdHlwZVxuICB0aGlzLnR5cGUgPSBob29rcyAmJiBob29rcy50eXBlO1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICBpZiAodGhpcy50eXBlICYmIHRoaXMudHlwZSAhPT0gVFlQRV9UUkFOU0lUSU9OICYmIHRoaXMudHlwZSAhPT0gVFlQRV9BTklNQVRJT04pIHtcbiAgICAgIHdhcm4oJ2ludmFsaWQgQ1NTIHRyYW5zaXRpb24gdHlwZSBmb3IgdHJhbnNpdGlvbj1cIicgKyB0aGlzLmlkICsgJ1wiOiAnICsgdGhpcy50eXBlKTtcbiAgICB9XG4gIH1cbiAgLy8gYmluZFxuICB2YXIgc2VsZiA9IHRoaXM7WydlbnRlck5leHRUaWNrJywgJ2VudGVyRG9uZScsICdsZWF2ZU5leHRUaWNrJywgJ2xlYXZlRG9uZSddLmZvckVhY2goZnVuY3Rpb24gKG0pIHtcbiAgICBzZWxmW21dID0gYmluZChzZWxmW21dLCBzZWxmKTtcbiAgfSk7XG59XG5cbnZhciBwJDEgPSBUcmFuc2l0aW9uLnByb3RvdHlwZTtcblxuLyoqXG4gKiBTdGFydCBhbiBlbnRlcmluZyB0cmFuc2l0aW9uLlxuICpcbiAqIDEuIGVudGVyIHRyYW5zaXRpb24gdHJpZ2dlcmVkXG4gKiAyLiBjYWxsIGJlZm9yZUVudGVyIGhvb2tcbiAqIDMuIGFkZCBlbnRlciBjbGFzc1xuICogNC4gaW5zZXJ0L3Nob3cgZWxlbWVudFxuICogNS4gY2FsbCBlbnRlciBob29rICh3aXRoIHBvc3NpYmxlIGV4cGxpY2l0IGpzIGNhbGxiYWNrKVxuICogNi4gcmVmbG93XG4gKiA3LiBiYXNlZCBvbiB0cmFuc2l0aW9uIHR5cGU6XG4gKiAgICAtIHRyYW5zaXRpb246XG4gKiAgICAgICAgcmVtb3ZlIGNsYXNzIG5vdywgd2FpdCBmb3IgdHJhbnNpdGlvbmVuZCxcbiAqICAgICAgICB0aGVuIGRvbmUgaWYgdGhlcmUncyBubyBleHBsaWNpdCBqcyBjYWxsYmFjay5cbiAqICAgIC0gYW5pbWF0aW9uOlxuICogICAgICAgIHdhaXQgZm9yIGFuaW1hdGlvbmVuZCwgcmVtb3ZlIGNsYXNzLFxuICogICAgICAgIHRoZW4gZG9uZSBpZiB0aGVyZSdzIG5vIGV4cGxpY2l0IGpzIGNhbGxiYWNrLlxuICogICAgLSBubyBjc3MgdHJhbnNpdGlvbjpcbiAqICAgICAgICBkb25lIG5vdyBpZiB0aGVyZSdzIG5vIGV4cGxpY2l0IGpzIGNhbGxiYWNrLlxuICogOC4gd2FpdCBmb3IgZWl0aGVyIGRvbmUgb3IganMgY2FsbGJhY2ssIHRoZW4gY2FsbFxuICogICAgYWZ0ZXJFbnRlciBob29rLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wIC0gaW5zZXJ0L3Nob3cgdGhlIGVsZW1lbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl1cbiAqL1xuXG5wJDEuZW50ZXIgPSBmdW5jdGlvbiAob3AsIGNiKSB7XG4gIHRoaXMuY2FuY2VsUGVuZGluZygpO1xuICB0aGlzLmNhbGxIb29rKCdiZWZvcmVFbnRlcicpO1xuICB0aGlzLmNiID0gY2I7XG4gIGFkZENsYXNzKHRoaXMuZWwsIHRoaXMuZW50ZXJDbGFzcyk7XG4gIG9wKCk7XG4gIHRoaXMuZW50ZXJlZCA9IGZhbHNlO1xuICB0aGlzLmNhbGxIb29rV2l0aENiKCdlbnRlcicpO1xuICBpZiAodGhpcy5lbnRlcmVkKSB7XG4gICAgcmV0dXJuOyAvLyB1c2VyIGNhbGxlZCBkb25lIHN5bmNocm9ub3VzbHkuXG4gIH1cbiAgdGhpcy5jYW5jZWwgPSB0aGlzLmhvb2tzICYmIHRoaXMuaG9va3MuZW50ZXJDYW5jZWxsZWQ7XG4gIHB1c2hKb2IodGhpcy5lbnRlck5leHRUaWNrKTtcbn07XG5cbi8qKlxuICogVGhlIFwibmV4dFRpY2tcIiBwaGFzZSBvZiBhbiBlbnRlcmluZyB0cmFuc2l0aW9uLCB3aGljaCBpc1xuICogdG8gYmUgcHVzaGVkIGludG8gYSBxdWV1ZSBhbmQgZXhlY3V0ZWQgYWZ0ZXIgYSByZWZsb3cgc29cbiAqIHRoYXQgcmVtb3ZpbmcgdGhlIGNsYXNzIGNhbiB0cmlnZ2VyIGEgQ1NTIHRyYW5zaXRpb24uXG4gKi9cblxucCQxLmVudGVyTmV4dFRpY2sgPSBmdW5jdGlvbiAoKSB7XG4gIC8vIEltcG9ydGFudCBoYWNrOlxuICAvLyBpbiBDaHJvbWUsIGlmIGEganVzdC1lbnRlcmVkIGVsZW1lbnQgaXMgYXBwbGllZCB0aGVcbiAgLy8gbGVhdmUgY2xhc3Mgd2hpbGUgaXRzIGludGVycG9sYXRlZCBwcm9wZXJ0eSBzdGlsbCBoYXNcbiAgLy8gYSB2ZXJ5IHNtYWxsIHZhbHVlICh3aXRoaW4gb25lIGZyYW1lKSwgQ2hyb21lIHdpbGxcbiAgLy8gc2tpcCB0aGUgbGVhdmUgdHJhbnNpdGlvbiBlbnRpcmVseSBhbmQgbm90IGZpcmluZyB0aGVcbiAgLy8gdHJhbnN0aW9uZW5kIGV2ZW50LiBUaGVyZWZvcmUgd2UgbmVlZCB0byBwcm90ZWN0ZWRcbiAgLy8gYWdhaW5zdCBzdWNoIGNhc2VzIHVzaW5nIGEgb25lLWZyYW1lIHRpbWVvdXQuXG4gIHRoaXMuanVzdEVudGVyZWQgPSB0cnVlO1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuanVzdEVudGVyZWQgPSBmYWxzZTtcbiAgfSwgMTcpO1xuXG4gIHZhciBlbnRlckRvbmUgPSB0aGlzLmVudGVyRG9uZTtcbiAgdmFyIHR5cGUgPSB0aGlzLmdldENzc1RyYW5zaXRpb25UeXBlKHRoaXMuZW50ZXJDbGFzcyk7XG4gIGlmICghdGhpcy5wZW5kaW5nSnNDYikge1xuICAgIGlmICh0eXBlID09PSBUWVBFX1RSQU5TSVRJT04pIHtcbiAgICAgIC8vIHRyaWdnZXIgdHJhbnNpdGlvbiBieSByZW1vdmluZyBlbnRlciBjbGFzcyBub3dcbiAgICAgIHJlbW92ZUNsYXNzKHRoaXMuZWwsIHRoaXMuZW50ZXJDbGFzcyk7XG4gICAgICB0aGlzLnNldHVwQ3NzQ2IodHJhbnNpdGlvbkVuZEV2ZW50LCBlbnRlckRvbmUpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gVFlQRV9BTklNQVRJT04pIHtcbiAgICAgIHRoaXMuc2V0dXBDc3NDYihhbmltYXRpb25FbmRFdmVudCwgZW50ZXJEb25lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZW50ZXJEb25lKCk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT09IFRZUEVfVFJBTlNJVElPTikge1xuICAgIHJlbW92ZUNsYXNzKHRoaXMuZWwsIHRoaXMuZW50ZXJDbGFzcyk7XG4gIH1cbn07XG5cbi8qKlxuICogVGhlIFwiY2xlYW51cFwiIHBoYXNlIG9mIGFuIGVudGVyaW5nIHRyYW5zaXRpb24uXG4gKi9cblxucCQxLmVudGVyRG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5lbnRlcmVkID0gdHJ1ZTtcbiAgdGhpcy5jYW5jZWwgPSB0aGlzLnBlbmRpbmdKc0NiID0gbnVsbDtcbiAgcmVtb3ZlQ2xhc3ModGhpcy5lbCwgdGhpcy5lbnRlckNsYXNzKTtcbiAgdGhpcy5jYWxsSG9vaygnYWZ0ZXJFbnRlcicpO1xuICBpZiAodGhpcy5jYikgdGhpcy5jYigpO1xufTtcblxuLyoqXG4gKiBTdGFydCBhIGxlYXZpbmcgdHJhbnNpdGlvbi5cbiAqXG4gKiAxLiBsZWF2ZSB0cmFuc2l0aW9uIHRyaWdnZXJlZC5cbiAqIDIuIGNhbGwgYmVmb3JlTGVhdmUgaG9va1xuICogMy4gYWRkIGxlYXZlIGNsYXNzICh0cmlnZ2VyIGNzcyB0cmFuc2l0aW9uKVxuICogNC4gY2FsbCBsZWF2ZSBob29rICh3aXRoIHBvc3NpYmxlIGV4cGxpY2l0IGpzIGNhbGxiYWNrKVxuICogNS4gcmVmbG93IGlmIG5vIGV4cGxpY2l0IGpzIGNhbGxiYWNrIGlzIHByb3ZpZGVkXG4gKiA2LiBiYXNlZCBvbiB0cmFuc2l0aW9uIHR5cGU6XG4gKiAgICAtIHRyYW5zaXRpb24gb3IgYW5pbWF0aW9uOlxuICogICAgICAgIHdhaXQgZm9yIGVuZCBldmVudCwgcmVtb3ZlIGNsYXNzLCB0aGVuIGRvbmUgaWZcbiAqICAgICAgICB0aGVyZSdzIG5vIGV4cGxpY2l0IGpzIGNhbGxiYWNrLlxuICogICAgLSBubyBjc3MgdHJhbnNpdGlvbjpcbiAqICAgICAgICBkb25lIGlmIHRoZXJlJ3Mgbm8gZXhwbGljaXQganMgY2FsbGJhY2suXG4gKiA3LiB3YWl0IGZvciBlaXRoZXIgZG9uZSBvciBqcyBjYWxsYmFjaywgdGhlbiBjYWxsXG4gKiAgICBhZnRlckxlYXZlIGhvb2suXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gb3AgLSByZW1vdmUvaGlkZSB0aGUgZWxlbWVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICovXG5cbnAkMS5sZWF2ZSA9IGZ1bmN0aW9uIChvcCwgY2IpIHtcbiAgdGhpcy5jYW5jZWxQZW5kaW5nKCk7XG4gIHRoaXMuY2FsbEhvb2soJ2JlZm9yZUxlYXZlJyk7XG4gIHRoaXMub3AgPSBvcDtcbiAgdGhpcy5jYiA9IGNiO1xuICBhZGRDbGFzcyh0aGlzLmVsLCB0aGlzLmxlYXZlQ2xhc3MpO1xuICB0aGlzLmxlZnQgPSBmYWxzZTtcbiAgdGhpcy5jYWxsSG9va1dpdGhDYignbGVhdmUnKTtcbiAgaWYgKHRoaXMubGVmdCkge1xuICAgIHJldHVybjsgLy8gdXNlciBjYWxsZWQgZG9uZSBzeW5jaHJvbm91c2x5LlxuICB9XG4gIHRoaXMuY2FuY2VsID0gdGhpcy5ob29rcyAmJiB0aGlzLmhvb2tzLmxlYXZlQ2FuY2VsbGVkO1xuICAvLyBvbmx5IG5lZWQgdG8gaGFuZGxlIGxlYXZlRG9uZSBpZlxuICAvLyAxLiB0aGUgdHJhbnNpdGlvbiBpcyBhbHJlYWR5IGRvbmUgKHN5bmNocm9ub3VzbHkgY2FsbGVkXG4gIC8vICAgIGJ5IHRoZSB1c2VyLCB3aGljaCBjYXVzZXMgdGhpcy5vcCBzZXQgdG8gbnVsbClcbiAgLy8gMi4gdGhlcmUncyBubyBleHBsaWNpdCBqcyBjYWxsYmFja1xuICBpZiAodGhpcy5vcCAmJiAhdGhpcy5wZW5kaW5nSnNDYikge1xuICAgIC8vIGlmIGEgQ1NTIHRyYW5zaXRpb24gbGVhdmVzIGltbWVkaWF0ZWx5IGFmdGVyIGVudGVyLFxuICAgIC8vIHRoZSB0cmFuc2l0aW9uZW5kIGV2ZW50IG5ldmVyIGZpcmVzLiB0aGVyZWZvcmUgd2VcbiAgICAvLyBkZXRlY3Qgc3VjaCBjYXNlcyBhbmQgZW5kIHRoZSBsZWF2ZSBpbW1lZGlhdGVseS5cbiAgICBpZiAodGhpcy5qdXN0RW50ZXJlZCkge1xuICAgICAgdGhpcy5sZWF2ZURvbmUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHVzaEpvYih0aGlzLmxlYXZlTmV4dFRpY2spO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBUaGUgXCJuZXh0VGlja1wiIHBoYXNlIG9mIGEgbGVhdmluZyB0cmFuc2l0aW9uLlxuICovXG5cbnAkMS5sZWF2ZU5leHRUaWNrID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdHlwZSA9IHRoaXMuZ2V0Q3NzVHJhbnNpdGlvblR5cGUodGhpcy5sZWF2ZUNsYXNzKTtcbiAgaWYgKHR5cGUpIHtcbiAgICB2YXIgZXZlbnQgPSB0eXBlID09PSBUWVBFX1RSQU5TSVRJT04gPyB0cmFuc2l0aW9uRW5kRXZlbnQgOiBhbmltYXRpb25FbmRFdmVudDtcbiAgICB0aGlzLnNldHVwQ3NzQ2IoZXZlbnQsIHRoaXMubGVhdmVEb25lKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmxlYXZlRG9uZSgpO1xuICB9XG59O1xuXG4vKipcbiAqIFRoZSBcImNsZWFudXBcIiBwaGFzZSBvZiBhIGxlYXZpbmcgdHJhbnNpdGlvbi5cbiAqL1xuXG5wJDEubGVhdmVEb25lID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmxlZnQgPSB0cnVlO1xuICB0aGlzLmNhbmNlbCA9IHRoaXMucGVuZGluZ0pzQ2IgPSBudWxsO1xuICB0aGlzLm9wKCk7XG4gIHJlbW92ZUNsYXNzKHRoaXMuZWwsIHRoaXMubGVhdmVDbGFzcyk7XG4gIHRoaXMuY2FsbEhvb2soJ2FmdGVyTGVhdmUnKTtcbiAgaWYgKHRoaXMuY2IpIHRoaXMuY2IoKTtcbiAgdGhpcy5vcCA9IG51bGw7XG59O1xuXG4vKipcbiAqIENhbmNlbCBhbnkgcGVuZGluZyBjYWxsYmFja3MgZnJvbSBhIHByZXZpb3VzbHkgcnVubmluZ1xuICogYnV0IG5vdCBmaW5pc2hlZCB0cmFuc2l0aW9uLlxuICovXG5cbnAkMS5jYW5jZWxQZW5kaW5nID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLm9wID0gdGhpcy5jYiA9IG51bGw7XG4gIHZhciBoYXNQZW5kaW5nID0gZmFsc2U7XG4gIGlmICh0aGlzLnBlbmRpbmdDc3NDYikge1xuICAgIGhhc1BlbmRpbmcgPSB0cnVlO1xuICAgIG9mZih0aGlzLmVsLCB0aGlzLnBlbmRpbmdDc3NFdmVudCwgdGhpcy5wZW5kaW5nQ3NzQ2IpO1xuICAgIHRoaXMucGVuZGluZ0Nzc0V2ZW50ID0gdGhpcy5wZW5kaW5nQ3NzQ2IgPSBudWxsO1xuICB9XG4gIGlmICh0aGlzLnBlbmRpbmdKc0NiKSB7XG4gICAgaGFzUGVuZGluZyA9IHRydWU7XG4gICAgdGhpcy5wZW5kaW5nSnNDYi5jYW5jZWwoKTtcbiAgICB0aGlzLnBlbmRpbmdKc0NiID0gbnVsbDtcbiAgfVxuICBpZiAoaGFzUGVuZGluZykge1xuICAgIHJlbW92ZUNsYXNzKHRoaXMuZWwsIHRoaXMuZW50ZXJDbGFzcyk7XG4gICAgcmVtb3ZlQ2xhc3ModGhpcy5lbCwgdGhpcy5sZWF2ZUNsYXNzKTtcbiAgfVxuICBpZiAodGhpcy5jYW5jZWwpIHtcbiAgICB0aGlzLmNhbmNlbC5jYWxsKHRoaXMudm0sIHRoaXMuZWwpO1xuICAgIHRoaXMuY2FuY2VsID0gbnVsbDtcbiAgfVxufTtcblxuLyoqXG4gKiBDYWxsIGEgdXNlci1wcm92aWRlZCBzeW5jaHJvbm91cyBob29rIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKi9cblxucCQxLmNhbGxIb29rID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgaWYgKHRoaXMuaG9va3MgJiYgdGhpcy5ob29rc1t0eXBlXSkge1xuICAgIHRoaXMuaG9va3NbdHlwZV0uY2FsbCh0aGlzLnZtLCB0aGlzLmVsKTtcbiAgfVxufTtcblxuLyoqXG4gKiBDYWxsIGEgdXNlci1wcm92aWRlZCwgcG90ZW50aWFsbHktYXN5bmMgaG9vayBmdW5jdGlvbi5cbiAqIFdlIGNoZWNrIGZvciB0aGUgbGVuZ3RoIG9mIGFyZ3VtZW50cyB0byBzZWUgaWYgdGhlIGhvb2tcbiAqIGV4cGVjdHMgYSBgZG9uZWAgY2FsbGJhY2suIElmIHRydWUsIHRoZSB0cmFuc2l0aW9uJ3MgZW5kXG4gKiB3aWxsIGJlIGRldGVybWluZWQgYnkgd2hlbiB0aGUgdXNlciBjYWxscyB0aGF0IGNhbGxiYWNrO1xuICogb3RoZXJ3aXNlLCB0aGUgZW5kIGlzIGRldGVybWluZWQgYnkgdGhlIENTUyB0cmFuc2l0aW9uIG9yXG4gKiBhbmltYXRpb24uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAqL1xuXG5wJDEuY2FsbEhvb2tXaXRoQ2IgPSBmdW5jdGlvbiAodHlwZSkge1xuICB2YXIgaG9vayA9IHRoaXMuaG9va3MgJiYgdGhpcy5ob29rc1t0eXBlXTtcbiAgaWYgKGhvb2spIHtcbiAgICBpZiAoaG9vay5sZW5ndGggPiAxKSB7XG4gICAgICB0aGlzLnBlbmRpbmdKc0NiID0gY2FuY2VsbGFibGUodGhpc1t0eXBlICsgJ0RvbmUnXSk7XG4gICAgfVxuICAgIGhvb2suY2FsbCh0aGlzLnZtLCB0aGlzLmVsLCB0aGlzLnBlbmRpbmdKc0NiKTtcbiAgfVxufTtcblxuLyoqXG4gKiBHZXQgYW4gZWxlbWVudCdzIHRyYW5zaXRpb24gdHlwZSBiYXNlZCBvbiB0aGVcbiAqIGNhbGN1bGF0ZWQgc3R5bGVzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjbGFzc05hbWVcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuXG5wJDEuZ2V0Q3NzVHJhbnNpdGlvblR5cGUgPSBmdW5jdGlvbiAoY2xhc3NOYW1lKSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICBpZiAoIXRyYW5zaXRpb25FbmRFdmVudCB8fFxuICAvLyBza2lwIENTUyB0cmFuc2l0aW9ucyBpZiBwYWdlIGlzIG5vdCB2aXNpYmxlIC1cbiAgLy8gdGhpcyBzb2x2ZXMgdGhlIGlzc3VlIG9mIHRyYW5zaXRpb25lbmQgZXZlbnRzIG5vdFxuICAvLyBmaXJpbmcgdW50aWwgdGhlIHBhZ2UgaXMgdmlzaWJsZSBhZ2Fpbi5cbiAgLy8gcGFnZVZpc2liaWxpdHkgQVBJIGlzIHN1cHBvcnRlZCBpbiBJRTEwKywgc2FtZSBhc1xuICAvLyBDU1MgdHJhbnNpdGlvbnMuXG4gIGRvY3VtZW50LmhpZGRlbiB8fFxuICAvLyBleHBsaWNpdCBqcy1vbmx5IHRyYW5zaXRpb25cbiAgdGhpcy5ob29rcyAmJiB0aGlzLmhvb2tzLmNzcyA9PT0gZmFsc2UgfHxcbiAgLy8gZWxlbWVudCBpcyBoaWRkZW5cbiAgaXNIaWRkZW4odGhpcy5lbCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHR5cGUgPSB0aGlzLnR5cGUgfHwgdGhpcy50eXBlQ2FjaGVbY2xhc3NOYW1lXTtcbiAgaWYgKHR5cGUpIHJldHVybiB0eXBlO1xuICB2YXIgaW5saW5lU3R5bGVzID0gdGhpcy5lbC5zdHlsZTtcbiAgdmFyIGNvbXB1dGVkU3R5bGVzID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5lbCk7XG4gIHZhciB0cmFuc0R1cmF0aW9uID0gaW5saW5lU3R5bGVzW3RyYW5zRHVyYXRpb25Qcm9wXSB8fCBjb21wdXRlZFN0eWxlc1t0cmFuc0R1cmF0aW9uUHJvcF07XG4gIGlmICh0cmFuc0R1cmF0aW9uICYmIHRyYW5zRHVyYXRpb24gIT09ICcwcycpIHtcbiAgICB0eXBlID0gVFlQRV9UUkFOU0lUSU9OO1xuICB9IGVsc2Uge1xuICAgIHZhciBhbmltRHVyYXRpb24gPSBpbmxpbmVTdHlsZXNbYW5pbUR1cmF0aW9uUHJvcF0gfHwgY29tcHV0ZWRTdHlsZXNbYW5pbUR1cmF0aW9uUHJvcF07XG4gICAgaWYgKGFuaW1EdXJhdGlvbiAmJiBhbmltRHVyYXRpb24gIT09ICcwcycpIHtcbiAgICAgIHR5cGUgPSBUWVBFX0FOSU1BVElPTjtcbiAgICB9XG4gIH1cbiAgaWYgKHR5cGUpIHtcbiAgICB0aGlzLnR5cGVDYWNoZVtjbGFzc05hbWVdID0gdHlwZTtcbiAgfVxuICByZXR1cm4gdHlwZTtcbn07XG5cbi8qKlxuICogU2V0dXAgYSBDU1MgdHJhbnNpdGlvbmVuZC9hbmltYXRpb25lbmQgY2FsbGJhY2suXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYlxuICovXG5cbnAkMS5zZXR1cENzc0NiID0gZnVuY3Rpb24gKGV2ZW50LCBjYikge1xuICB0aGlzLnBlbmRpbmdDc3NFdmVudCA9IGV2ZW50O1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBlbCA9IHRoaXMuZWw7XG4gIHZhciBvbkVuZCA9IHRoaXMucGVuZGluZ0Nzc0NiID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoZS50YXJnZXQgPT09IGVsKSB7XG4gICAgICBvZmYoZWwsIGV2ZW50LCBvbkVuZCk7XG4gICAgICBzZWxmLnBlbmRpbmdDc3NFdmVudCA9IHNlbGYucGVuZGluZ0Nzc0NiID0gbnVsbDtcbiAgICAgIGlmICghc2VsZi5wZW5kaW5nSnNDYiAmJiBjYikge1xuICAgICAgICBjYigpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgb24oZWwsIGV2ZW50LCBvbkVuZCk7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIGFuIGVsZW1lbnQgaXMgaGlkZGVuIC0gaW4gdGhhdCBjYXNlIHdlIGNhbiBqdXN0XG4gKiBza2lwIHRoZSB0cmFuc2l0aW9uIGFsbHRvZ2V0aGVyLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblxuZnVuY3Rpb24gaXNIaWRkZW4oZWwpIHtcbiAgaWYgKC9zdmckLy50ZXN0KGVsLm5hbWVzcGFjZVVSSSkpIHtcbiAgICAvLyBTVkcgZWxlbWVudHMgZG8gbm90IGhhdmUgb2Zmc2V0KFdpZHRofEhlaWdodClcbiAgICAvLyBzbyB3ZSBuZWVkIHRvIGNoZWNrIHRoZSBjbGllbnQgcmVjdFxuICAgIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcmV0dXJuICEocmVjdC53aWR0aCB8fCByZWN0LmhlaWdodCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICEoZWwub2Zmc2V0V2lkdGggfHwgZWwub2Zmc2V0SGVpZ2h0IHx8IGVsLmdldENsaWVudFJlY3RzKCkubGVuZ3RoKTtcbiAgfVxufVxuXG52YXIgdHJhbnNpdGlvbiQxID0ge1xuXG4gIHByaW9yaXR5OiBUUkFOU0lUSU9OLFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24gdXBkYXRlKGlkLCBvbGRJZCkge1xuICAgIHZhciBlbCA9IHRoaXMuZWw7XG4gICAgLy8gcmVzb2x2ZSBvbiBvd25lciB2bVxuICAgIHZhciBob29rcyA9IHJlc29sdmVBc3NldCh0aGlzLnZtLiRvcHRpb25zLCAndHJhbnNpdGlvbnMnLCBpZCk7XG4gICAgaWQgPSBpZCB8fCAndic7XG4gICAgZWwuX192X3RyYW5zID0gbmV3IFRyYW5zaXRpb24oZWwsIGlkLCBob29rcywgdGhpcy52bSk7XG4gICAgaWYgKG9sZElkKSB7XG4gICAgICByZW1vdmVDbGFzcyhlbCwgb2xkSWQgKyAnLXRyYW5zaXRpb24nKTtcbiAgICB9XG4gICAgYWRkQ2xhc3MoZWwsIGlkICsgJy10cmFuc2l0aW9uJyk7XG4gIH1cbn07XG5cbnZhciBpbnRlcm5hbERpcmVjdGl2ZXMgPSB7XG4gIHN0eWxlOiBzdHlsZSxcbiAgJ2NsYXNzJzogdkNsYXNzLFxuICBjb21wb25lbnQ6IGNvbXBvbmVudCxcbiAgcHJvcDogcHJvcERlZixcbiAgdHJhbnNpdGlvbjogdHJhbnNpdGlvbiQxXG59O1xuXG52YXIgcHJvcEJpbmRpbmdNb2RlcyA9IGNvbmZpZy5fcHJvcEJpbmRpbmdNb2RlcztcbnZhciBlbXB0eSA9IHt9O1xuXG4vLyByZWdleGVzXG52YXIgaWRlbnRSRSQxID0gL15bJF9hLXpBLVpdK1tcXHckXSokLztcbnZhciBzZXR0YWJsZVBhdGhSRSA9IC9eW0EtWmEtel8kXVtcXHckXSooXFwuW0EtWmEtel8kXVtcXHckXSp8XFxbW15cXFtcXF1dK1xcXSkqJC87XG5cbi8qKlxuICogQ29tcGlsZSBwcm9wcyBvbiBhIHJvb3QgZWxlbWVudCBhbmQgcmV0dXJuXG4gKiBhIHByb3BzIGxpbmsgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fERvY3VtZW50RnJhZ21lbnR9IGVsXG4gKiBAcGFyYW0ge0FycmF5fSBwcm9wT3B0aW9uc1xuICogQHJldHVybiB7RnVuY3Rpb259IHByb3BzTGlua0ZuXG4gKi9cblxuZnVuY3Rpb24gY29tcGlsZVByb3BzKGVsLCBwcm9wT3B0aW9ucykge1xuICB2YXIgcHJvcHMgPSBbXTtcbiAgdmFyIG5hbWVzID0gT2JqZWN0LmtleXMocHJvcE9wdGlvbnMpO1xuICB2YXIgaSA9IG5hbWVzLmxlbmd0aDtcbiAgdmFyIG9wdGlvbnMsIG5hbWUsIGF0dHIsIHZhbHVlLCBwYXRoLCBwYXJzZWQsIHByb3A7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgb3B0aW9ucyA9IHByb3BPcHRpb25zW25hbWVdIHx8IGVtcHR5O1xuXG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgbmFtZSA9PT0gJyRkYXRhJykge1xuICAgICAgd2FybignRG8gbm90IHVzZSAkZGF0YSBhcyBwcm9wLicpO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gcHJvcHMgY291bGQgY29udGFpbiBkYXNoZXMsIHdoaWNoIHdpbGwgYmVcbiAgICAvLyBpbnRlcnByZXRlZCBhcyBtaW51cyBjYWxjdWxhdGlvbnMgYnkgdGhlIHBhcnNlclxuICAgIC8vIHNvIHdlIG5lZWQgdG8gY2FtZWxpemUgdGhlIHBhdGggaGVyZVxuICAgIHBhdGggPSBjYW1lbGl6ZShuYW1lKTtcbiAgICBpZiAoIWlkZW50UkUkMS50ZXN0KHBhdGgpKSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ0ludmFsaWQgcHJvcCBrZXk6IFwiJyArIG5hbWUgKyAnXCIuIFByb3Aga2V5cyAnICsgJ211c3QgYmUgdmFsaWQgaWRlbnRpZmllcnMuJyk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBwcm9wID0ge1xuICAgICAgbmFtZTogbmFtZSxcbiAgICAgIHBhdGg6IHBhdGgsXG4gICAgICBvcHRpb25zOiBvcHRpb25zLFxuICAgICAgbW9kZTogcHJvcEJpbmRpbmdNb2Rlcy5PTkVfV0FZLFxuICAgICAgcmF3OiBudWxsXG4gICAgfTtcblxuICAgIGF0dHIgPSBoeXBoZW5hdGUobmFtZSk7XG4gICAgLy8gZmlyc3QgY2hlY2sgZHluYW1pYyB2ZXJzaW9uXG4gICAgaWYgKCh2YWx1ZSA9IGdldEJpbmRBdHRyKGVsLCBhdHRyKSkgPT09IG51bGwpIHtcbiAgICAgIGlmICgodmFsdWUgPSBnZXRCaW5kQXR0cihlbCwgYXR0ciArICcuc3luYycpKSAhPT0gbnVsbCkge1xuICAgICAgICBwcm9wLm1vZGUgPSBwcm9wQmluZGluZ01vZGVzLlRXT19XQVk7XG4gICAgICB9IGVsc2UgaWYgKCh2YWx1ZSA9IGdldEJpbmRBdHRyKGVsLCBhdHRyICsgJy5vbmNlJykpICE9PSBudWxsKSB7XG4gICAgICAgIHByb3AubW9kZSA9IHByb3BCaW5kaW5nTW9kZXMuT05FX1RJTUU7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgLy8gaGFzIGR5bmFtaWMgYmluZGluZyFcbiAgICAgIHByb3AucmF3ID0gdmFsdWU7XG4gICAgICBwYXJzZWQgPSBwYXJzZURpcmVjdGl2ZSh2YWx1ZSk7XG4gICAgICB2YWx1ZSA9IHBhcnNlZC5leHByZXNzaW9uO1xuICAgICAgcHJvcC5maWx0ZXJzID0gcGFyc2VkLmZpbHRlcnM7XG4gICAgICAvLyBjaGVjayBiaW5kaW5nIHR5cGVcbiAgICAgIGlmIChpc0xpdGVyYWwodmFsdWUpICYmICFwYXJzZWQuZmlsdGVycykge1xuICAgICAgICAvLyBmb3IgZXhwcmVzc2lvbnMgY29udGFpbmluZyBsaXRlcmFsIG51bWJlcnMgYW5kXG4gICAgICAgIC8vIGJvb2xlYW5zLCB0aGVyZSdzIG5vIG5lZWQgdG8gc2V0dXAgYSBwcm9wIGJpbmRpbmcsXG4gICAgICAgIC8vIHNvIHdlIGNhbiBvcHRpbWl6ZSB0aGVtIGFzIGEgb25lLXRpbWUgc2V0LlxuICAgICAgICBwcm9wLm9wdGltaXplZExpdGVyYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJvcC5keW5hbWljID0gdHJ1ZTtcbiAgICAgICAgLy8gY2hlY2sgbm9uLXNldHRhYmxlIHBhdGggZm9yIHR3by13YXkgYmluZGluZ3NcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgcHJvcC5tb2RlID09PSBwcm9wQmluZGluZ01vZGVzLlRXT19XQVkgJiYgIXNldHRhYmxlUGF0aFJFLnRlc3QodmFsdWUpKSB7XG4gICAgICAgICAgcHJvcC5tb2RlID0gcHJvcEJpbmRpbmdNb2Rlcy5PTkVfV0FZO1xuICAgICAgICAgIHdhcm4oJ0Nhbm5vdCBiaW5kIHR3by13YXkgcHJvcCB3aXRoIG5vbi1zZXR0YWJsZSAnICsgJ3BhcmVudCBwYXRoOiAnICsgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBwcm9wLnBhcmVudFBhdGggPSB2YWx1ZTtcblxuICAgICAgLy8gd2FybiByZXF1aXJlZCB0d28td2F5XG4gICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiBvcHRpb25zLnR3b1dheSAmJiBwcm9wLm1vZGUgIT09IHByb3BCaW5kaW5nTW9kZXMuVFdPX1dBWSkge1xuICAgICAgICB3YXJuKCdQcm9wIFwiJyArIG5hbWUgKyAnXCIgZXhwZWN0cyBhIHR3by13YXkgYmluZGluZyB0eXBlLicpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoKHZhbHVlID0gZ2V0QXR0cihlbCwgYXR0cikpICE9PSBudWxsKSB7XG4gICAgICAvLyBoYXMgbGl0ZXJhbCBiaW5kaW5nIVxuICAgICAgcHJvcC5yYXcgPSB2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgIC8vIGNoZWNrIHBvc3NpYmxlIGNhbWVsQ2FzZSBwcm9wIHVzYWdlXG4gICAgICB2YXIgbG93ZXJDYXNlTmFtZSA9IHBhdGgudG9Mb3dlckNhc2UoKTtcbiAgICAgIHZhbHVlID0gL1tBLVpcXC1dLy50ZXN0KG5hbWUpICYmIChlbC5nZXRBdHRyaWJ1dGUobG93ZXJDYXNlTmFtZSkgfHwgZWwuZ2V0QXR0cmlidXRlKCc6JyArIGxvd2VyQ2FzZU5hbWUpIHx8IGVsLmdldEF0dHJpYnV0ZSgndi1iaW5kOicgKyBsb3dlckNhc2VOYW1lKSB8fCBlbC5nZXRBdHRyaWJ1dGUoJzonICsgbG93ZXJDYXNlTmFtZSArICcub25jZScpIHx8IGVsLmdldEF0dHJpYnV0ZSgndi1iaW5kOicgKyBsb3dlckNhc2VOYW1lICsgJy5vbmNlJykgfHwgZWwuZ2V0QXR0cmlidXRlKCc6JyArIGxvd2VyQ2FzZU5hbWUgKyAnLnN5bmMnKSB8fCBlbC5nZXRBdHRyaWJ1dGUoJ3YtYmluZDonICsgbG93ZXJDYXNlTmFtZSArICcuc3luYycpKTtcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICB3YXJuKCdQb3NzaWJsZSB1c2FnZSBlcnJvciBmb3IgcHJvcCBgJyArIGxvd2VyQ2FzZU5hbWUgKyAnYCAtICcgKyAnZGlkIHlvdSBtZWFuIGAnICsgYXR0ciArICdgPyBIVE1MIGlzIGNhc2UtaW5zZW5zaXRpdmUsIHJlbWVtYmVyIHRvIHVzZSAnICsgJ2tlYmFiLWNhc2UgZm9yIHByb3BzIGluIHRlbXBsYXRlcy4nKTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5yZXF1aXJlZCkge1xuICAgICAgICAvLyB3YXJuIG1pc3NpbmcgcmVxdWlyZWRcbiAgICAgICAgd2FybignTWlzc2luZyByZXF1aXJlZCBwcm9wOiAnICsgbmFtZSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIHB1c2ggcHJvcFxuICAgIHByb3BzLnB1c2gocHJvcCk7XG4gIH1cbiAgcmV0dXJuIG1ha2VQcm9wc0xpbmtGbihwcm9wcyk7XG59XG5cbi8qKlxuICogQnVpbGQgYSBmdW5jdGlvbiB0aGF0IGFwcGxpZXMgcHJvcHMgdG8gYSB2bS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBwcm9wc1xuICogQHJldHVybiB7RnVuY3Rpb259IHByb3BzTGlua0ZuXG4gKi9cblxuZnVuY3Rpb24gbWFrZVByb3BzTGlua0ZuKHByb3BzKSB7XG4gIHJldHVybiBmdW5jdGlvbiBwcm9wc0xpbmtGbih2bSwgc2NvcGUpIHtcbiAgICAvLyBzdG9yZSByZXNvbHZlZCBwcm9wcyBpbmZvXG4gICAgdm0uX3Byb3BzID0ge307XG4gICAgdmFyIGkgPSBwcm9wcy5sZW5ndGg7XG4gICAgdmFyIHByb3AsIHBhdGgsIG9wdGlvbnMsIHZhbHVlLCByYXc7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgcHJvcCA9IHByb3BzW2ldO1xuICAgICAgcmF3ID0gcHJvcC5yYXc7XG4gICAgICBwYXRoID0gcHJvcC5wYXRoO1xuICAgICAgb3B0aW9ucyA9IHByb3Aub3B0aW9ucztcbiAgICAgIHZtLl9wcm9wc1twYXRoXSA9IHByb3A7XG4gICAgICBpZiAocmF3ID09PSBudWxsKSB7XG4gICAgICAgIC8vIGluaXRpYWxpemUgYWJzZW50IHByb3BcbiAgICAgICAgaW5pdFByb3Aodm0sIHByb3AsIHVuZGVmaW5lZCk7XG4gICAgICB9IGVsc2UgaWYgKHByb3AuZHluYW1pYykge1xuICAgICAgICAvLyBkeW5hbWljIHByb3BcbiAgICAgICAgaWYgKHByb3AubW9kZSA9PT0gcHJvcEJpbmRpbmdNb2Rlcy5PTkVfVElNRSkge1xuICAgICAgICAgIC8vIG9uZSB0aW1lIGJpbmRpbmdcbiAgICAgICAgICB2YWx1ZSA9IChzY29wZSB8fCB2bS5fY29udGV4dCB8fCB2bSkuJGdldChwcm9wLnBhcmVudFBhdGgpO1xuICAgICAgICAgIGluaXRQcm9wKHZtLCBwcm9wLCB2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHZtLl9jb250ZXh0KSB7XG4gICAgICAgICAgICAvLyBkeW5hbWljIGJpbmRpbmdcbiAgICAgICAgICAgIHZtLl9iaW5kRGlyKHtcbiAgICAgICAgICAgICAgbmFtZTogJ3Byb3AnLFxuICAgICAgICAgICAgICBkZWY6IHByb3BEZWYsXG4gICAgICAgICAgICAgIHByb3A6IHByb3BcbiAgICAgICAgICAgIH0sIG51bGwsIG51bGwsIHNjb3BlKTsgLy8gZWwsIGhvc3QsIHNjb3BlXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gcm9vdCBpbnN0YW5jZVxuICAgICAgICAgICAgICBpbml0UHJvcCh2bSwgcHJvcCwgdm0uJGdldChwcm9wLnBhcmVudFBhdGgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChwcm9wLm9wdGltaXplZExpdGVyYWwpIHtcbiAgICAgICAgLy8gb3B0aW1pemVkIGxpdGVyYWwsIGNhc3QgaXQgYW5kIGp1c3Qgc2V0IG9uY2VcbiAgICAgICAgdmFyIHN0cmlwcGVkID0gc3RyaXBRdW90ZXMocmF3KTtcbiAgICAgICAgdmFsdWUgPSBzdHJpcHBlZCA9PT0gcmF3ID8gdG9Cb29sZWFuKHRvTnVtYmVyKHJhdykpIDogc3RyaXBwZWQ7XG4gICAgICAgIGluaXRQcm9wKHZtLCBwcm9wLCB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzdHJpbmcgbGl0ZXJhbCwgYnV0IHdlIG5lZWQgdG8gY2F0ZXIgZm9yXG4gICAgICAgIC8vIEJvb2xlYW4gcHJvcHMgd2l0aCBubyB2YWx1ZVxuICAgICAgICB2YWx1ZSA9IG9wdGlvbnMudHlwZSA9PT0gQm9vbGVhbiAmJiByYXcgPT09ICcnID8gdHJ1ZSA6IHJhdztcbiAgICAgICAgaW5pdFByb3Aodm0sIHByb3AsIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cbi8vIHNwZWNpYWwgYmluZGluZyBwcmVmaXhlc1xudmFyIGJpbmRSRSA9IC9edi1iaW5kOnxeOi87XG52YXIgb25SRSA9IC9edi1vbjp8XkAvO1xudmFyIGRpckF0dHJSRSA9IC9edi0oW146XSspKD86JHw6KC4qKSQpLztcbnZhciBtb2RpZmllclJFID0gL1xcLlteXFwuXSsvZztcbnZhciB0cmFuc2l0aW9uUkUgPSAvXih2LWJpbmQ6fDopP3RyYW5zaXRpb24kLztcblxuLy8gdGVybWluYWwgZGlyZWN0aXZlc1xudmFyIHRlcm1pbmFsRGlyZWN0aXZlcyA9IFsnZm9yJywgJ2lmJ107XG5cbi8vIGRlZmF1bHQgZGlyZWN0aXZlIHByaW9yaXR5XG52YXIgREVGQVVMVF9QUklPUklUWSA9IDEwMDA7XG5cbi8qKlxuICogQ29tcGlsZSBhIHRlbXBsYXRlIGFuZCByZXR1cm4gYSByZXVzYWJsZSBjb21wb3NpdGUgbGlua1xuICogZnVuY3Rpb24sIHdoaWNoIHJlY3Vyc2l2ZWx5IGNvbnRhaW5zIG1vcmUgbGluayBmdW5jdGlvbnNcbiAqIGluc2lkZS4gVGhpcyB0b3AgbGV2ZWwgY29tcGlsZSBmdW5jdGlvbiB3b3VsZCBub3JtYWxseVxuICogYmUgY2FsbGVkIG9uIGluc3RhbmNlIHJvb3Qgbm9kZXMsIGJ1dCBjYW4gYWxzbyBiZSB1c2VkXG4gKiBmb3IgcGFydGlhbCBjb21waWxhdGlvbiBpZiB0aGUgcGFydGlhbCBhcmd1bWVudCBpcyB0cnVlLlxuICpcbiAqIFRoZSByZXR1cm5lZCBjb21wb3NpdGUgbGluayBmdW5jdGlvbiwgd2hlbiBjYWxsZWQsIHdpbGxcbiAqIHJldHVybiBhbiB1bmxpbmsgZnVuY3Rpb24gdGhhdCB0ZWFyc2Rvd24gYWxsIGRpcmVjdGl2ZXNcbiAqIGNyZWF0ZWQgZHVyaW5nIHRoZSBsaW5raW5nIHBoYXNlLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudHxEb2N1bWVudEZyYWdtZW50fSBlbFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcGFydGlhbFxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cblxuZnVuY3Rpb24gY29tcGlsZShlbCwgb3B0aW9ucywgcGFydGlhbCkge1xuICAvLyBsaW5rIGZ1bmN0aW9uIGZvciB0aGUgbm9kZSBpdHNlbGYuXG4gIHZhciBub2RlTGlua0ZuID0gcGFydGlhbCB8fCAhb3B0aW9ucy5fYXNDb21wb25lbnQgPyBjb21waWxlTm9kZShlbCwgb3B0aW9ucykgOiBudWxsO1xuICAvLyBsaW5rIGZ1bmN0aW9uIGZvciB0aGUgY2hpbGROb2Rlc1xuICB2YXIgY2hpbGRMaW5rRm4gPSAhKG5vZGVMaW5rRm4gJiYgbm9kZUxpbmtGbi50ZXJtaW5hbCkgJiYgZWwudGFnTmFtZSAhPT0gJ1NDUklQVCcgJiYgZWwuaGFzQ2hpbGROb2RlcygpID8gY29tcGlsZU5vZGVMaXN0KGVsLmNoaWxkTm9kZXMsIG9wdGlvbnMpIDogbnVsbDtcblxuICAvKipcbiAgICogQSBjb21wb3NpdGUgbGlua2VyIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBhIGFscmVhZHlcbiAgICogY29tcGlsZWQgcGllY2Ugb2YgRE9NLCB3aGljaCBpbnN0YW50aWF0ZXMgYWxsIGRpcmVjdGl2ZVxuICAgKiBpbnN0YW5jZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7VnVlfSB2bVxuICAgKiBAcGFyYW0ge0VsZW1lbnR8RG9jdW1lbnRGcmFnbWVudH0gZWxcbiAgICogQHBhcmFtIHtWdWV9IFtob3N0XSAtIGhvc3Qgdm0gb2YgdHJhbnNjbHVkZWQgY29udGVudFxuICAgKiBAcGFyYW0ge09iamVjdH0gW3Njb3BlXSAtIHYtZm9yIHNjb3BlXG4gICAqIEBwYXJhbSB7RnJhZ21lbnR9IFtmcmFnXSAtIGxpbmsgY29udGV4dCBmcmFnbWVudFxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbnx1bmRlZmluZWR9XG4gICAqL1xuXG4gIHJldHVybiBmdW5jdGlvbiBjb21wb3NpdGVMaW5rRm4odm0sIGVsLCBob3N0LCBzY29wZSwgZnJhZykge1xuICAgIC8vIGNhY2hlIGNoaWxkTm9kZXMgYmVmb3JlIGxpbmtpbmcgcGFyZW50LCBmaXggIzY1N1xuICAgIHZhciBjaGlsZE5vZGVzID0gdG9BcnJheShlbC5jaGlsZE5vZGVzKTtcbiAgICAvLyBsaW5rXG4gICAgdmFyIGRpcnMgPSBsaW5rQW5kQ2FwdHVyZShmdW5jdGlvbiBjb21wb3NpdGVMaW5rQ2FwdHVyZXIoKSB7XG4gICAgICBpZiAobm9kZUxpbmtGbikgbm9kZUxpbmtGbih2bSwgZWwsIGhvc3QsIHNjb3BlLCBmcmFnKTtcbiAgICAgIGlmIChjaGlsZExpbmtGbikgY2hpbGRMaW5rRm4odm0sIGNoaWxkTm9kZXMsIGhvc3QsIHNjb3BlLCBmcmFnKTtcbiAgICB9LCB2bSk7XG4gICAgcmV0dXJuIG1ha2VVbmxpbmtGbih2bSwgZGlycyk7XG4gIH07XG59XG5cbi8qKlxuICogQXBwbHkgYSBsaW5rZXIgdG8gYSB2bS9lbGVtZW50IHBhaXIgYW5kIGNhcHR1cmUgdGhlXG4gKiBkaXJlY3RpdmVzIGNyZWF0ZWQgZHVyaW5nIHRoZSBwcm9jZXNzLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGxpbmtlclxuICogQHBhcmFtIHtWdWV9IHZtXG4gKi9cblxuZnVuY3Rpb24gbGlua0FuZENhcHR1cmUobGlua2VyLCB2bSkge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicpIHtcbiAgICAvLyByZXNldCBkaXJlY3RpdmVzIGJlZm9yZSBldmVyeSBjYXB0dXJlIGluIHByb2R1Y3Rpb25cbiAgICAvLyBtb2RlLCBzbyB0aGF0IHdoZW4gdW5saW5raW5nIHdlIGRvbid0IG5lZWQgdG8gc3BsaWNlXG4gICAgLy8gdGhlbSBvdXQgKHdoaWNoIHR1cm5zIG91dCB0byBiZSBhIHBlcmYgaGl0KS5cbiAgICAvLyB0aGV5IGFyZSBrZXB0IGluIGRldmVsb3BtZW50IG1vZGUgYmVjYXVzZSB0aGV5IGFyZVxuICAgIC8vIHVzZWZ1bCBmb3IgVnVlJ3Mgb3duIHRlc3RzLlxuICAgIHZtLl9kaXJlY3RpdmVzID0gW107XG4gIH1cbiAgdmFyIG9yaWdpbmFsRGlyQ291bnQgPSB2bS5fZGlyZWN0aXZlcy5sZW5ndGg7XG4gIGxpbmtlcigpO1xuICB2YXIgZGlycyA9IHZtLl9kaXJlY3RpdmVzLnNsaWNlKG9yaWdpbmFsRGlyQ291bnQpO1xuICBkaXJzLnNvcnQoZGlyZWN0aXZlQ29tcGFyYXRvcik7XG4gIGZvciAodmFyIGkgPSAwLCBsID0gZGlycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBkaXJzW2ldLl9iaW5kKCk7XG4gIH1cbiAgcmV0dXJuIGRpcnM7XG59XG5cbi8qKlxuICogRGlyZWN0aXZlIHByaW9yaXR5IHNvcnQgY29tcGFyYXRvclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhXG4gKiBAcGFyYW0ge09iamVjdH0gYlxuICovXG5cbmZ1bmN0aW9uIGRpcmVjdGl2ZUNvbXBhcmF0b3IoYSwgYikge1xuICBhID0gYS5kZXNjcmlwdG9yLmRlZi5wcmlvcml0eSB8fCBERUZBVUxUX1BSSU9SSVRZO1xuICBiID0gYi5kZXNjcmlwdG9yLmRlZi5wcmlvcml0eSB8fCBERUZBVUxUX1BSSU9SSVRZO1xuICByZXR1cm4gYSA+IGIgPyAtMSA6IGEgPT09IGIgPyAwIDogMTtcbn1cblxuLyoqXG4gKiBMaW5rZXIgZnVuY3Rpb25zIHJldHVybiBhbiB1bmxpbmsgZnVuY3Rpb24gdGhhdFxuICogdGVhcnNkb3duIGFsbCBkaXJlY3RpdmVzIGluc3RhbmNlcyBnZW5lcmF0ZWQgZHVyaW5nXG4gKiB0aGUgcHJvY2Vzcy5cbiAqXG4gKiBXZSBjcmVhdGUgdW5saW5rIGZ1bmN0aW9ucyB3aXRoIG9ubHkgdGhlIG5lY2Vzc2FyeVxuICogaW5mb3JtYXRpb24gdG8gYXZvaWQgcmV0YWluaW5nIGFkZGl0aW9uYWwgY2xvc3VyZXMuXG4gKlxuICogQHBhcmFtIHtWdWV9IHZtXG4gKiBAcGFyYW0ge0FycmF5fSBkaXJzXG4gKiBAcGFyYW0ge1Z1ZX0gW2NvbnRleHRdXG4gKiBAcGFyYW0ge0FycmF5fSBbY29udGV4dERpcnNdXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuXG5mdW5jdGlvbiBtYWtlVW5saW5rRm4odm0sIGRpcnMsIGNvbnRleHQsIGNvbnRleHREaXJzKSB7XG4gIGZ1bmN0aW9uIHVubGluayhkZXN0cm95aW5nKSB7XG4gICAgdGVhcmRvd25EaXJzKHZtLCBkaXJzLCBkZXN0cm95aW5nKTtcbiAgICBpZiAoY29udGV4dCAmJiBjb250ZXh0RGlycykge1xuICAgICAgdGVhcmRvd25EaXJzKGNvbnRleHQsIGNvbnRleHREaXJzKTtcbiAgICB9XG4gIH1cbiAgLy8gZXhwb3NlIGxpbmtlZCBkaXJlY3RpdmVzXG4gIHVubGluay5kaXJzID0gZGlycztcbiAgcmV0dXJuIHVubGluaztcbn1cblxuLyoqXG4gKiBUZWFyZG93biBwYXJ0aWFsIGxpbmtlZCBkaXJlY3RpdmVzLlxuICpcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtBcnJheX0gZGlyc1xuICogQHBhcmFtIHtCb29sZWFufSBkZXN0cm95aW5nXG4gKi9cblxuZnVuY3Rpb24gdGVhcmRvd25EaXJzKHZtLCBkaXJzLCBkZXN0cm95aW5nKSB7XG4gIHZhciBpID0gZGlycy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBkaXJzW2ldLl90ZWFyZG93bigpO1xuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmICFkZXN0cm95aW5nKSB7XG4gICAgICB2bS5fZGlyZWN0aXZlcy4kcmVtb3ZlKGRpcnNbaV0pO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIENvbXBpbGUgbGluayBwcm9wcyBvbiBhbiBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0ge1Z1ZX0gdm1cbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBwcm9wc1xuICogQHBhcmFtIHtPYmplY3R9IFtzY29wZV1cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5cbmZ1bmN0aW9uIGNvbXBpbGVBbmRMaW5rUHJvcHModm0sIGVsLCBwcm9wcywgc2NvcGUpIHtcbiAgdmFyIHByb3BzTGlua0ZuID0gY29tcGlsZVByb3BzKGVsLCBwcm9wcyk7XG4gIHZhciBwcm9wRGlycyA9IGxpbmtBbmRDYXB0dXJlKGZ1bmN0aW9uICgpIHtcbiAgICBwcm9wc0xpbmtGbih2bSwgc2NvcGUpO1xuICB9LCB2bSk7XG4gIHJldHVybiBtYWtlVW5saW5rRm4odm0sIHByb3BEaXJzKTtcbn1cblxuLyoqXG4gKiBDb21waWxlIHRoZSByb290IGVsZW1lbnQgb2YgYW4gaW5zdGFuY2UuXG4gKlxuICogMS4gYXR0cnMgb24gY29udGV4dCBjb250YWluZXIgKGNvbnRleHQgc2NvcGUpXG4gKiAyLiBhdHRycyBvbiB0aGUgY29tcG9uZW50IHRlbXBsYXRlIHJvb3Qgbm9kZSwgaWZcbiAqICAgIHJlcGxhY2U6dHJ1ZSAoY2hpbGQgc2NvcGUpXG4gKlxuICogSWYgdGhpcyBpcyBhIGZyYWdtZW50IGluc3RhbmNlLCB3ZSBvbmx5IG5lZWQgdG8gY29tcGlsZSAxLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge09iamVjdH0gY29udGV4dE9wdGlvbnNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICovXG5cbmZ1bmN0aW9uIGNvbXBpbGVSb290KGVsLCBvcHRpb25zLCBjb250ZXh0T3B0aW9ucykge1xuICB2YXIgY29udGFpbmVyQXR0cnMgPSBvcHRpb25zLl9jb250YWluZXJBdHRycztcbiAgdmFyIHJlcGxhY2VyQXR0cnMgPSBvcHRpb25zLl9yZXBsYWNlckF0dHJzO1xuICB2YXIgY29udGV4dExpbmtGbiwgcmVwbGFjZXJMaW5rRm47XG5cbiAgLy8gb25seSBuZWVkIHRvIGNvbXBpbGUgb3RoZXIgYXR0cmlidXRlcyBmb3JcbiAgLy8gbm9uLWZyYWdtZW50IGluc3RhbmNlc1xuICBpZiAoZWwubm9kZVR5cGUgIT09IDExKSB7XG4gICAgLy8gZm9yIGNvbXBvbmVudHMsIGNvbnRhaW5lciBhbmQgcmVwbGFjZXIgbmVlZCB0byBiZVxuICAgIC8vIGNvbXBpbGVkIHNlcGFyYXRlbHkgYW5kIGxpbmtlZCBpbiBkaWZmZXJlbnQgc2NvcGVzLlxuICAgIGlmIChvcHRpb25zLl9hc0NvbXBvbmVudCkge1xuICAgICAgLy8gMi4gY29udGFpbmVyIGF0dHJpYnV0ZXNcbiAgICAgIGlmIChjb250YWluZXJBdHRycyAmJiBjb250ZXh0T3B0aW9ucykge1xuICAgICAgICBjb250ZXh0TGlua0ZuID0gY29tcGlsZURpcmVjdGl2ZXMoY29udGFpbmVyQXR0cnMsIGNvbnRleHRPcHRpb25zKTtcbiAgICAgIH1cbiAgICAgIGlmIChyZXBsYWNlckF0dHJzKSB7XG4gICAgICAgIC8vIDMuIHJlcGxhY2VyIGF0dHJpYnV0ZXNcbiAgICAgICAgcmVwbGFjZXJMaW5rRm4gPSBjb21waWxlRGlyZWN0aXZlcyhyZXBsYWNlckF0dHJzLCBvcHRpb25zKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbm9uLWNvbXBvbmVudCwganVzdCBjb21waWxlIGFzIGEgbm9ybWFsIGVsZW1lbnQuXG4gICAgICByZXBsYWNlckxpbmtGbiA9IGNvbXBpbGVEaXJlY3RpdmVzKGVsLmF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIGNvbnRhaW5lckF0dHJzKSB7XG4gICAgLy8gd2FybiBjb250YWluZXIgZGlyZWN0aXZlcyBmb3IgZnJhZ21lbnQgaW5zdGFuY2VzXG4gICAgdmFyIG5hbWVzID0gY29udGFpbmVyQXR0cnMuZmlsdGVyKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAvLyBhbGxvdyB2dWUtbG9hZGVyL3Z1ZWlmeSBzY29wZWQgY3NzIGF0dHJpYnV0ZXNcbiAgICAgIHJldHVybiBhdHRyLm5hbWUuaW5kZXhPZignX3YtJykgPCAwICYmXG4gICAgICAvLyBhbGxvdyBldmVudCBsaXN0ZW5lcnNcbiAgICAgICFvblJFLnRlc3QoYXR0ci5uYW1lKSAmJlxuICAgICAgLy8gYWxsb3cgc2xvdHNcbiAgICAgIGF0dHIubmFtZSAhPT0gJ3Nsb3QnO1xuICAgIH0pLm1hcChmdW5jdGlvbiAoYXR0cikge1xuICAgICAgcmV0dXJuICdcIicgKyBhdHRyLm5hbWUgKyAnXCInO1xuICAgIH0pO1xuICAgIGlmIChuYW1lcy5sZW5ndGgpIHtcbiAgICAgIHZhciBwbHVyYWwgPSBuYW1lcy5sZW5ndGggPiAxO1xuICAgICAgd2FybignQXR0cmlidXRlJyArIChwbHVyYWwgPyAncyAnIDogJyAnKSArIG5hbWVzLmpvaW4oJywgJykgKyAocGx1cmFsID8gJyBhcmUnIDogJyBpcycpICsgJyBpZ25vcmVkIG9uIGNvbXBvbmVudCAnICsgJzwnICsgb3B0aW9ucy5lbC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgKyAnPiBiZWNhdXNlICcgKyAndGhlIGNvbXBvbmVudCBpcyBhIGZyYWdtZW50IGluc3RhbmNlOiAnICsgJ2h0dHA6Ly92dWVqcy5vcmcvZ3VpZGUvY29tcG9uZW50cy5odG1sI0ZyYWdtZW50X0luc3RhbmNlJyk7XG4gICAgfVxuICB9XG5cbiAgb3B0aW9ucy5fY29udGFpbmVyQXR0cnMgPSBvcHRpb25zLl9yZXBsYWNlckF0dHJzID0gbnVsbDtcbiAgcmV0dXJuIGZ1bmN0aW9uIHJvb3RMaW5rRm4odm0sIGVsLCBzY29wZSkge1xuICAgIC8vIGxpbmsgY29udGV4dCBzY29wZSBkaXJzXG4gICAgdmFyIGNvbnRleHQgPSB2bS5fY29udGV4dDtcbiAgICB2YXIgY29udGV4dERpcnM7XG4gICAgaWYgKGNvbnRleHQgJiYgY29udGV4dExpbmtGbikge1xuICAgICAgY29udGV4dERpcnMgPSBsaW5rQW5kQ2FwdHVyZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnRleHRMaW5rRm4oY29udGV4dCwgZWwsIG51bGwsIHNjb3BlKTtcbiAgICAgIH0sIGNvbnRleHQpO1xuICAgIH1cblxuICAgIC8vIGxpbmsgc2VsZlxuICAgIHZhciBzZWxmRGlycyA9IGxpbmtBbmRDYXB0dXJlKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChyZXBsYWNlckxpbmtGbikgcmVwbGFjZXJMaW5rRm4odm0sIGVsKTtcbiAgICB9LCB2bSk7XG5cbiAgICAvLyByZXR1cm4gdGhlIHVubGluayBmdW5jdGlvbiB0aGF0IHRlYXJzZG93biBjb250ZXh0XG4gICAgLy8gY29udGFpbmVyIGRpcmVjdGl2ZXMuXG4gICAgcmV0dXJuIG1ha2VVbmxpbmtGbih2bSwgc2VsZkRpcnMsIGNvbnRleHQsIGNvbnRleHREaXJzKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBDb21waWxlIGEgbm9kZSBhbmQgcmV0dXJuIGEgbm9kZUxpbmtGbiBiYXNlZCBvbiB0aGVcbiAqIG5vZGUgdHlwZS5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtGdW5jdGlvbnxudWxsfVxuICovXG5cbmZ1bmN0aW9uIGNvbXBpbGVOb2RlKG5vZGUsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSBub2RlLm5vZGVUeXBlO1xuICBpZiAodHlwZSA9PT0gMSAmJiBub2RlLnRhZ05hbWUgIT09ICdTQ1JJUFQnKSB7XG4gICAgcmV0dXJuIGNvbXBpbGVFbGVtZW50KG5vZGUsIG9wdGlvbnMpO1xuICB9IGVsc2UgaWYgKHR5cGUgPT09IDMgJiYgbm9kZS5kYXRhLnRyaW0oKSkge1xuICAgIHJldHVybiBjb21waWxlVGV4dE5vZGUobm9kZSwgb3B0aW9ucyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21waWxlIGFuIGVsZW1lbnQgYW5kIHJldHVybiBhIG5vZGVMaW5rRm4uXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufG51bGx9XG4gKi9cblxuZnVuY3Rpb24gY29tcGlsZUVsZW1lbnQoZWwsIG9wdGlvbnMpIHtcbiAgLy8gcHJlcHJvY2VzcyB0ZXh0YXJlYXMuXG4gIC8vIHRleHRhcmVhIHRyZWF0cyBpdHMgdGV4dCBjb250ZW50IGFzIHRoZSBpbml0aWFsIHZhbHVlLlxuICAvLyBqdXN0IGJpbmQgaXQgYXMgYW4gYXR0ciBkaXJlY3RpdmUgZm9yIHZhbHVlLlxuICBpZiAoZWwudGFnTmFtZSA9PT0gJ1RFWFRBUkVBJykge1xuICAgIHZhciB0b2tlbnMgPSBwYXJzZVRleHQoZWwudmFsdWUpO1xuICAgIGlmICh0b2tlbnMpIHtcbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgnOnZhbHVlJywgdG9rZW5zVG9FeHAodG9rZW5zKSk7XG4gICAgICBlbC52YWx1ZSA9ICcnO1xuICAgIH1cbiAgfVxuICB2YXIgbGlua0ZuO1xuICB2YXIgaGFzQXR0cnMgPSBlbC5oYXNBdHRyaWJ1dGVzKCk7XG4gIC8vIGNoZWNrIHRlcm1pbmFsIGRpcmVjdGl2ZXMgKGZvciAmIGlmKVxuICBpZiAoaGFzQXR0cnMpIHtcbiAgICBsaW5rRm4gPSBjaGVja1Rlcm1pbmFsRGlyZWN0aXZlcyhlbCwgb3B0aW9ucyk7XG4gIH1cbiAgLy8gY2hlY2sgZWxlbWVudCBkaXJlY3RpdmVzXG4gIGlmICghbGlua0ZuKSB7XG4gICAgbGlua0ZuID0gY2hlY2tFbGVtZW50RGlyZWN0aXZlcyhlbCwgb3B0aW9ucyk7XG4gIH1cbiAgLy8gY2hlY2sgY29tcG9uZW50XG4gIGlmICghbGlua0ZuKSB7XG4gICAgbGlua0ZuID0gY2hlY2tDb21wb25lbnQoZWwsIG9wdGlvbnMpO1xuICB9XG4gIC8vIG5vcm1hbCBkaXJlY3RpdmVzXG4gIGlmICghbGlua0ZuICYmIGhhc0F0dHJzKSB7XG4gICAgbGlua0ZuID0gY29tcGlsZURpcmVjdGl2ZXMoZWwuYXR0cmlidXRlcywgb3B0aW9ucyk7XG4gIH1cbiAgcmV0dXJuIGxpbmtGbjtcbn1cblxuLyoqXG4gKiBDb21waWxlIGEgdGV4dE5vZGUgYW5kIHJldHVybiBhIG5vZGVMaW5rRm4uXG4gKlxuICogQHBhcmFtIHtUZXh0Tm9kZX0gbm9kZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufG51bGx9IHRleHROb2RlTGlua0ZuXG4gKi9cblxuZnVuY3Rpb24gY29tcGlsZVRleHROb2RlKG5vZGUsIG9wdGlvbnMpIHtcbiAgLy8gc2tpcCBtYXJrZWQgdGV4dCBub2Rlc1xuICBpZiAobm9kZS5fc2tpcCkge1xuICAgIHJldHVybiByZW1vdmVUZXh0O1xuICB9XG5cbiAgdmFyIHRva2VucyA9IHBhcnNlVGV4dChub2RlLndob2xlVGV4dCk7XG4gIGlmICghdG9rZW5zKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBtYXJrIGFkamFjZW50IHRleHQgbm9kZXMgYXMgc2tpcHBlZCxcbiAgLy8gYmVjYXVzZSB3ZSBhcmUgdXNpbmcgbm9kZS53aG9sZVRleHQgdG8gY29tcGlsZVxuICAvLyBhbGwgYWRqYWNlbnQgdGV4dCBub2RlcyB0b2dldGhlci4gVGhpcyBmaXhlc1xuICAvLyBpc3N1ZXMgaW4gSUUgd2hlcmUgc29tZXRpbWVzIGl0IHNwbGl0cyB1cCBhIHNpbmdsZVxuICAvLyB0ZXh0IG5vZGUgaW50byBtdWx0aXBsZSBvbmVzLlxuICB2YXIgbmV4dCA9IG5vZGUubmV4dFNpYmxpbmc7XG4gIHdoaWxlIChuZXh0ICYmIG5leHQubm9kZVR5cGUgPT09IDMpIHtcbiAgICBuZXh0Ll9za2lwID0gdHJ1ZTtcbiAgICBuZXh0ID0gbmV4dC5uZXh0U2libGluZztcbiAgfVxuXG4gIHZhciBmcmFnID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICB2YXIgZWwsIHRva2VuO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHRva2Vucy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICBlbCA9IHRva2VuLnRhZyA/IHByb2Nlc3NUZXh0VG9rZW4odG9rZW4sIG9wdGlvbnMpIDogZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodG9rZW4udmFsdWUpO1xuICAgIGZyYWcuYXBwZW5kQ2hpbGQoZWwpO1xuICB9XG4gIHJldHVybiBtYWtlVGV4dE5vZGVMaW5rRm4odG9rZW5zLCBmcmFnLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBMaW5rZXIgZm9yIGFuIHNraXBwZWQgdGV4dCBub2RlLlxuICpcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtUZXh0fSBub2RlXG4gKi9cblxuZnVuY3Rpb24gcmVtb3ZlVGV4dCh2bSwgbm9kZSkge1xuICByZW1vdmUobm9kZSk7XG59XG5cbi8qKlxuICogUHJvY2VzcyBhIHNpbmdsZSB0ZXh0IHRva2VuLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB0b2tlblxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge05vZGV9XG4gKi9cblxuZnVuY3Rpb24gcHJvY2Vzc1RleHRUb2tlbih0b2tlbiwgb3B0aW9ucykge1xuICB2YXIgZWw7XG4gIGlmICh0b2tlbi5vbmVUaW1lKSB7XG4gICAgZWwgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0b2tlbi52YWx1ZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHRva2VuLmh0bWwpIHtcbiAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgndi1odG1sJyk7XG4gICAgICBzZXRUb2tlblR5cGUoJ2h0bWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSUUgd2lsbCBjbGVhbiB1cCBlbXB0eSB0ZXh0Tm9kZXMgZHVyaW5nXG4gICAgICAvLyBmcmFnLmNsb25lTm9kZSh0cnVlKSwgc28gd2UgaGF2ZSB0byBnaXZlIGl0XG4gICAgICAvLyBzb21ldGhpbmcgaGVyZS4uLlxuICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnICcpO1xuICAgICAgc2V0VG9rZW5UeXBlKCd0ZXh0Jyk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIHNldFRva2VuVHlwZSh0eXBlKSB7XG4gICAgaWYgKHRva2VuLmRlc2NyaXB0b3IpIHJldHVybjtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VEaXJlY3RpdmUodG9rZW4udmFsdWUpO1xuICAgIHRva2VuLmRlc2NyaXB0b3IgPSB7XG4gICAgICBuYW1lOiB0eXBlLFxuICAgICAgZGVmOiBkaXJlY3RpdmVzW3R5cGVdLFxuICAgICAgZXhwcmVzc2lvbjogcGFyc2VkLmV4cHJlc3Npb24sXG4gICAgICBmaWx0ZXJzOiBwYXJzZWQuZmlsdGVyc1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIGVsO1xufVxuXG4vKipcbiAqIEJ1aWxkIGEgZnVuY3Rpb24gdGhhdCBwcm9jZXNzZXMgYSB0ZXh0Tm9kZS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5PE9iamVjdD59IHRva2Vuc1xuICogQHBhcmFtIHtEb2N1bWVudEZyYWdtZW50fSBmcmFnXG4gKi9cblxuZnVuY3Rpb24gbWFrZVRleHROb2RlTGlua0ZuKHRva2VucywgZnJhZykge1xuICByZXR1cm4gZnVuY3Rpb24gdGV4dE5vZGVMaW5rRm4odm0sIGVsLCBob3N0LCBzY29wZSkge1xuICAgIHZhciBmcmFnQ2xvbmUgPSBmcmFnLmNsb25lTm9kZSh0cnVlKTtcbiAgICB2YXIgY2hpbGROb2RlcyA9IHRvQXJyYXkoZnJhZ0Nsb25lLmNoaWxkTm9kZXMpO1xuICAgIHZhciB0b2tlbiwgdmFsdWUsIG5vZGU7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0b2tlbnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgIHZhbHVlID0gdG9rZW4udmFsdWU7XG4gICAgICBpZiAodG9rZW4udGFnKSB7XG4gICAgICAgIG5vZGUgPSBjaGlsZE5vZGVzW2ldO1xuICAgICAgICBpZiAodG9rZW4ub25lVGltZSkge1xuICAgICAgICAgIHZhbHVlID0gKHNjb3BlIHx8IHZtKS4kZXZhbCh2YWx1ZSk7XG4gICAgICAgICAgaWYgKHRva2VuLmh0bWwpIHtcbiAgICAgICAgICAgIHJlcGxhY2Uobm9kZSwgcGFyc2VUZW1wbGF0ZSh2YWx1ZSwgdHJ1ZSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub2RlLmRhdGEgPSB2YWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdm0uX2JpbmREaXIodG9rZW4uZGVzY3JpcHRvciwgbm9kZSwgaG9zdCwgc2NvcGUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJlcGxhY2UoZWwsIGZyYWdDbG9uZSk7XG4gIH07XG59XG5cbi8qKlxuICogQ29tcGlsZSBhIG5vZGUgbGlzdCBhbmQgcmV0dXJuIGEgY2hpbGRMaW5rRm4uXG4gKlxuICogQHBhcmFtIHtOb2RlTGlzdH0gbm9kZUxpc3RcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtGdW5jdGlvbnx1bmRlZmluZWR9XG4gKi9cblxuZnVuY3Rpb24gY29tcGlsZU5vZGVMaXN0KG5vZGVMaXN0LCBvcHRpb25zKSB7XG4gIHZhciBsaW5rRm5zID0gW107XG4gIHZhciBub2RlTGlua0ZuLCBjaGlsZExpbmtGbiwgbm9kZTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2RlTGlzdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBub2RlID0gbm9kZUxpc3RbaV07XG4gICAgbm9kZUxpbmtGbiA9IGNvbXBpbGVOb2RlKG5vZGUsIG9wdGlvbnMpO1xuICAgIGNoaWxkTGlua0ZuID0gIShub2RlTGlua0ZuICYmIG5vZGVMaW5rRm4udGVybWluYWwpICYmIG5vZGUudGFnTmFtZSAhPT0gJ1NDUklQVCcgJiYgbm9kZS5oYXNDaGlsZE5vZGVzKCkgPyBjb21waWxlTm9kZUxpc3Qobm9kZS5jaGlsZE5vZGVzLCBvcHRpb25zKSA6IG51bGw7XG4gICAgbGlua0Zucy5wdXNoKG5vZGVMaW5rRm4sIGNoaWxkTGlua0ZuKTtcbiAgfVxuICByZXR1cm4gbGlua0Zucy5sZW5ndGggPyBtYWtlQ2hpbGRMaW5rRm4obGlua0ZucykgOiBudWxsO1xufVxuXG4vKipcbiAqIE1ha2UgYSBjaGlsZCBsaW5rIGZ1bmN0aW9uIGZvciBhIG5vZGUncyBjaGlsZE5vZGVzLlxuICpcbiAqIEBwYXJhbSB7QXJyYXk8RnVuY3Rpb24+fSBsaW5rRm5zXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gY2hpbGRMaW5rRm5cbiAqL1xuXG5mdW5jdGlvbiBtYWtlQ2hpbGRMaW5rRm4obGlua0Zucykge1xuICByZXR1cm4gZnVuY3Rpb24gY2hpbGRMaW5rRm4odm0sIG5vZGVzLCBob3N0LCBzY29wZSwgZnJhZykge1xuICAgIHZhciBub2RlLCBub2RlTGlua0ZuLCBjaGlsZHJlbkxpbmtGbjtcbiAgICBmb3IgKHZhciBpID0gMCwgbiA9IDAsIGwgPSBsaW5rRm5zLmxlbmd0aDsgaSA8IGw7IG4rKykge1xuICAgICAgbm9kZSA9IG5vZGVzW25dO1xuICAgICAgbm9kZUxpbmtGbiA9IGxpbmtGbnNbaSsrXTtcbiAgICAgIGNoaWxkcmVuTGlua0ZuID0gbGlua0Zuc1tpKytdO1xuICAgICAgLy8gY2FjaGUgY2hpbGROb2RlcyBiZWZvcmUgbGlua2luZyBwYXJlbnQsIGZpeCAjNjU3XG4gICAgICB2YXIgY2hpbGROb2RlcyA9IHRvQXJyYXkobm9kZS5jaGlsZE5vZGVzKTtcbiAgICAgIGlmIChub2RlTGlua0ZuKSB7XG4gICAgICAgIG5vZGVMaW5rRm4odm0sIG5vZGUsIGhvc3QsIHNjb3BlLCBmcmFnKTtcbiAgICAgIH1cbiAgICAgIGlmIChjaGlsZHJlbkxpbmtGbikge1xuICAgICAgICBjaGlsZHJlbkxpbmtGbih2bSwgY2hpbGROb2RlcywgaG9zdCwgc2NvcGUsIGZyYWcpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBDaGVjayBmb3IgZWxlbWVudCBkaXJlY3RpdmVzIChjdXN0b20gZWxlbWVudHMgdGhhdCBzaG91bGRcbiAqIGJlIHJlc292bGVkIGFzIHRlcm1pbmFsIGRpcmVjdGl2ZXMpLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKi9cblxuZnVuY3Rpb24gY2hlY2tFbGVtZW50RGlyZWN0aXZlcyhlbCwgb3B0aW9ucykge1xuICB2YXIgdGFnID0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICBpZiAoY29tbW9uVGFnUkUudGVzdCh0YWcpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBkZWYgPSByZXNvbHZlQXNzZXQob3B0aW9ucywgJ2VsZW1lbnREaXJlY3RpdmVzJywgdGFnKTtcbiAgaWYgKGRlZikge1xuICAgIHJldHVybiBtYWtlVGVybWluYWxOb2RlTGlua0ZuKGVsLCB0YWcsICcnLCBvcHRpb25zLCBkZWYpO1xuICB9XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYW4gZWxlbWVudCBpcyBhIGNvbXBvbmVudC4gSWYgeWVzLCByZXR1cm5cbiAqIGEgY29tcG9uZW50IGxpbmsgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge0Z1bmN0aW9ufHVuZGVmaW5lZH1cbiAqL1xuXG5mdW5jdGlvbiBjaGVja0NvbXBvbmVudChlbCwgb3B0aW9ucykge1xuICB2YXIgY29tcG9uZW50ID0gY2hlY2tDb21wb25lbnRBdHRyKGVsLCBvcHRpb25zKTtcbiAgaWYgKGNvbXBvbmVudCkge1xuICAgIHZhciByZWYgPSBmaW5kUmVmKGVsKTtcbiAgICB2YXIgZGVzY3JpcHRvciA9IHtcbiAgICAgIG5hbWU6ICdjb21wb25lbnQnLFxuICAgICAgcmVmOiByZWYsXG4gICAgICBleHByZXNzaW9uOiBjb21wb25lbnQuaWQsXG4gICAgICBkZWY6IGludGVybmFsRGlyZWN0aXZlcy5jb21wb25lbnQsXG4gICAgICBtb2RpZmllcnM6IHtcbiAgICAgICAgbGl0ZXJhbDogIWNvbXBvbmVudC5keW5hbWljXG4gICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29tcG9uZW50TGlua0ZuID0gZnVuY3Rpb24gY29tcG9uZW50TGlua0ZuKHZtLCBlbCwgaG9zdCwgc2NvcGUsIGZyYWcpIHtcbiAgICAgIGlmIChyZWYpIHtcbiAgICAgICAgZGVmaW5lUmVhY3RpdmUoKHNjb3BlIHx8IHZtKS4kcmVmcywgcmVmLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIHZtLl9iaW5kRGlyKGRlc2NyaXB0b3IsIGVsLCBob3N0LCBzY29wZSwgZnJhZyk7XG4gICAgfTtcbiAgICBjb21wb25lbnRMaW5rRm4udGVybWluYWwgPSB0cnVlO1xuICAgIHJldHVybiBjb21wb25lbnRMaW5rRm47XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayBhbiBlbGVtZW50IGZvciB0ZXJtaW5hbCBkaXJlY3RpdmVzIGluIGZpeGVkIG9yZGVyLlxuICogSWYgaXQgZmluZHMgb25lLCByZXR1cm4gYSB0ZXJtaW5hbCBsaW5rIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn0gdGVybWluYWxMaW5rRm5cbiAqL1xuXG5mdW5jdGlvbiBjaGVja1Rlcm1pbmFsRGlyZWN0aXZlcyhlbCwgb3B0aW9ucykge1xuICAvLyBza2lwIHYtcHJlXG4gIGlmIChnZXRBdHRyKGVsLCAndi1wcmUnKSAhPT0gbnVsbCkge1xuICAgIHJldHVybiBza2lwO1xuICB9XG4gIC8vIHNraXAgdi1lbHNlIGJsb2NrLCBidXQgb25seSBpZiBmb2xsb3dpbmcgdi1pZlxuICBpZiAoZWwuaGFzQXR0cmlidXRlKCd2LWVsc2UnKSkge1xuICAgIHZhciBwcmV2ID0gZWwucHJldmlvdXNFbGVtZW50U2libGluZztcbiAgICBpZiAocHJldiAmJiBwcmV2Lmhhc0F0dHJpYnV0ZSgndi1pZicpKSB7XG4gICAgICByZXR1cm4gc2tpcDtcbiAgICB9XG4gIH1cbiAgdmFyIHZhbHVlLCBkaXJOYW1lO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHRlcm1pbmFsRGlyZWN0aXZlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBkaXJOYW1lID0gdGVybWluYWxEaXJlY3RpdmVzW2ldO1xuICAgIHZhbHVlID0gZWwuZ2V0QXR0cmlidXRlKCd2LScgKyBkaXJOYW1lKTtcbiAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG1ha2VUZXJtaW5hbE5vZGVMaW5rRm4oZWwsIGRpck5hbWUsIHZhbHVlLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gc2tpcCgpIHt9XG5za2lwLnRlcm1pbmFsID0gdHJ1ZTtcblxuLyoqXG4gKiBCdWlsZCBhIG5vZGUgbGluayBmdW5jdGlvbiBmb3IgYSB0ZXJtaW5hbCBkaXJlY3RpdmUuXG4gKiBBIHRlcm1pbmFsIGxpbmsgZnVuY3Rpb24gdGVybWluYXRlcyB0aGUgY3VycmVudFxuICogY29tcGlsYXRpb24gcmVjdXJzaW9uIGFuZCBoYW5kbGVzIGNvbXBpbGF0aW9uIG9mIHRoZVxuICogc3VidHJlZSBpbiB0aGUgZGlyZWN0aXZlLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7U3RyaW5nfSBkaXJOYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge09iamVjdH0gW2RlZl1cbiAqIEByZXR1cm4ge0Z1bmN0aW9ufSB0ZXJtaW5hbExpbmtGblxuICovXG5cbmZ1bmN0aW9uIG1ha2VUZXJtaW5hbE5vZGVMaW5rRm4oZWwsIGRpck5hbWUsIHZhbHVlLCBvcHRpb25zLCBkZWYpIHtcbiAgdmFyIHBhcnNlZCA9IHBhcnNlRGlyZWN0aXZlKHZhbHVlKTtcbiAgdmFyIGRlc2NyaXB0b3IgPSB7XG4gICAgbmFtZTogZGlyTmFtZSxcbiAgICBleHByZXNzaW9uOiBwYXJzZWQuZXhwcmVzc2lvbixcbiAgICBmaWx0ZXJzOiBwYXJzZWQuZmlsdGVycyxcbiAgICByYXc6IHZhbHVlLFxuICAgIC8vIGVpdGhlciBhbiBlbGVtZW50IGRpcmVjdGl2ZSwgb3IgaWYvZm9yXG4gICAgLy8gIzIzNjYgb3IgY3VzdG9tIHRlcm1pbmFsIGRpcmVjdGl2ZVxuICAgIGRlZjogZGVmIHx8IHJlc29sdmVBc3NldChvcHRpb25zLCAnZGlyZWN0aXZlcycsIGRpck5hbWUpXG4gIH07XG4gIC8vIGNoZWNrIHJlZiBmb3Igdi1mb3IgYW5kIHJvdXRlci12aWV3XG4gIGlmIChkaXJOYW1lID09PSAnZm9yJyB8fCBkaXJOYW1lID09PSAncm91dGVyLXZpZXcnKSB7XG4gICAgZGVzY3JpcHRvci5yZWYgPSBmaW5kUmVmKGVsKTtcbiAgfVxuICB2YXIgZm4gPSBmdW5jdGlvbiB0ZXJtaW5hbE5vZGVMaW5rRm4odm0sIGVsLCBob3N0LCBzY29wZSwgZnJhZykge1xuICAgIGlmIChkZXNjcmlwdG9yLnJlZikge1xuICAgICAgZGVmaW5lUmVhY3RpdmUoKHNjb3BlIHx8IHZtKS4kcmVmcywgZGVzY3JpcHRvci5yZWYsIG51bGwpO1xuICAgIH1cbiAgICB2bS5fYmluZERpcihkZXNjcmlwdG9yLCBlbCwgaG9zdCwgc2NvcGUsIGZyYWcpO1xuICB9O1xuICBmbi50ZXJtaW5hbCA9IHRydWU7XG4gIHJldHVybiBmbjtcbn1cblxuLyoqXG4gKiBDb21waWxlIHRoZSBkaXJlY3RpdmVzIG9uIGFuIGVsZW1lbnQgYW5kIHJldHVybiBhIGxpbmtlci5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fE5hbWVkTm9kZU1hcH0gYXR0cnNcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqL1xuXG5mdW5jdGlvbiBjb21waWxlRGlyZWN0aXZlcyhhdHRycywgb3B0aW9ucykge1xuICB2YXIgaSA9IGF0dHJzLmxlbmd0aDtcbiAgdmFyIGRpcnMgPSBbXTtcbiAgdmFyIGF0dHIsIG5hbWUsIHZhbHVlLCByYXdOYW1lLCByYXdWYWx1ZSwgZGlyTmFtZSwgYXJnLCBtb2RpZmllcnMsIGRpckRlZiwgdG9rZW5zLCBtYXRjaGVkO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgYXR0ciA9IGF0dHJzW2ldO1xuICAgIG5hbWUgPSByYXdOYW1lID0gYXR0ci5uYW1lO1xuICAgIHZhbHVlID0gcmF3VmFsdWUgPSBhdHRyLnZhbHVlO1xuICAgIHRva2VucyA9IHBhcnNlVGV4dCh2YWx1ZSk7XG4gICAgLy8gcmVzZXQgYXJnXG4gICAgYXJnID0gbnVsbDtcbiAgICAvLyBjaGVjayBtb2RpZmllcnNcbiAgICBtb2RpZmllcnMgPSBwYXJzZU1vZGlmaWVycyhuYW1lKTtcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKG1vZGlmaWVyUkUsICcnKTtcblxuICAgIC8vIGF0dHJpYnV0ZSBpbnRlcnBvbGF0aW9uc1xuICAgIGlmICh0b2tlbnMpIHtcbiAgICAgIHZhbHVlID0gdG9rZW5zVG9FeHAodG9rZW5zKTtcbiAgICAgIGFyZyA9IG5hbWU7XG4gICAgICBwdXNoRGlyKCdiaW5kJywgZGlyZWN0aXZlcy5iaW5kLCB0b2tlbnMpO1xuICAgICAgLy8gd2FybiBhZ2FpbnN0IG1peGluZyBtdXN0YWNoZXMgd2l0aCB2LWJpbmRcbiAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICAgIGlmIChuYW1lID09PSAnY2xhc3MnICYmIEFycmF5LnByb3RvdHlwZS5zb21lLmNhbGwoYXR0cnMsIGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgICAgcmV0dXJuIGF0dHIubmFtZSA9PT0gJzpjbGFzcycgfHwgYXR0ci5uYW1lID09PSAndi1iaW5kOmNsYXNzJztcbiAgICAgICAgfSkpIHtcbiAgICAgICAgICB3YXJuKCdjbGFzcz1cIicgKyByYXdWYWx1ZSArICdcIjogRG8gbm90IG1peCBtdXN0YWNoZSBpbnRlcnBvbGF0aW9uICcgKyAnYW5kIHYtYmluZCBmb3IgXCJjbGFzc1wiIG9uIHRoZSBzYW1lIGVsZW1lbnQuIFVzZSBvbmUgb3IgdGhlIG90aGVyLicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlXG5cbiAgICAgIC8vIHNwZWNpYWwgYXR0cmlidXRlOiB0cmFuc2l0aW9uXG4gICAgICBpZiAodHJhbnNpdGlvblJFLnRlc3QobmFtZSkpIHtcbiAgICAgICAgbW9kaWZpZXJzLmxpdGVyYWwgPSAhYmluZFJFLnRlc3QobmFtZSk7XG4gICAgICAgIHB1c2hEaXIoJ3RyYW5zaXRpb24nLCBpbnRlcm5hbERpcmVjdGl2ZXMudHJhbnNpdGlvbik7XG4gICAgICB9IGVsc2VcblxuICAgICAgICAvLyBldmVudCBoYW5kbGVyc1xuICAgICAgICBpZiAob25SRS50ZXN0KG5hbWUpKSB7XG4gICAgICAgICAgYXJnID0gbmFtZS5yZXBsYWNlKG9uUkUsICcnKTtcbiAgICAgICAgICBwdXNoRGlyKCdvbicsIGRpcmVjdGl2ZXMub24pO1xuICAgICAgICB9IGVsc2VcblxuICAgICAgICAgIC8vIGF0dHJpYnV0ZSBiaW5kaW5nc1xuICAgICAgICAgIGlmIChiaW5kUkUudGVzdChuYW1lKSkge1xuICAgICAgICAgICAgZGlyTmFtZSA9IG5hbWUucmVwbGFjZShiaW5kUkUsICcnKTtcbiAgICAgICAgICAgIGlmIChkaXJOYW1lID09PSAnc3R5bGUnIHx8IGRpck5hbWUgPT09ICdjbGFzcycpIHtcbiAgICAgICAgICAgICAgcHVzaERpcihkaXJOYW1lLCBpbnRlcm5hbERpcmVjdGl2ZXNbZGlyTmFtZV0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYXJnID0gZGlyTmFtZTtcbiAgICAgICAgICAgICAgcHVzaERpcignYmluZCcsIGRpcmVjdGl2ZXMuYmluZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlXG5cbiAgICAgICAgICAgIC8vIG5vcm1hbCBkaXJlY3RpdmVzXG4gICAgICAgICAgICBpZiAobWF0Y2hlZCA9IG5hbWUubWF0Y2goZGlyQXR0clJFKSkge1xuICAgICAgICAgICAgICBkaXJOYW1lID0gbWF0Y2hlZFsxXTtcbiAgICAgICAgICAgICAgYXJnID0gbWF0Y2hlZFsyXTtcblxuICAgICAgICAgICAgICAvLyBza2lwIHYtZWxzZSAod2hlbiB1c2VkIHdpdGggdi1zaG93KVxuICAgICAgICAgICAgICBpZiAoZGlyTmFtZSA9PT0gJ2Vsc2UnKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBkaXJEZWYgPSByZXNvbHZlQXNzZXQob3B0aW9ucywgJ2RpcmVjdGl2ZXMnLCBkaXJOYW1lKTtcblxuICAgICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgICAgICAgICAgICAgIGFzc2VydEFzc2V0KGRpckRlZiwgJ2RpcmVjdGl2ZScsIGRpck5hbWUpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKGRpckRlZikge1xuICAgICAgICAgICAgICAgIHB1c2hEaXIoZGlyTmFtZSwgZGlyRGVmKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFB1c2ggYSBkaXJlY3RpdmUuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBkaXJOYW1lXG4gICAqIEBwYXJhbSB7T2JqZWN0fEZ1bmN0aW9ufSBkZWZcbiAgICogQHBhcmFtIHtBcnJheX0gW2ludGVycFRva2Vuc11cbiAgICovXG5cbiAgZnVuY3Rpb24gcHVzaERpcihkaXJOYW1lLCBkZWYsIGludGVycFRva2Vucykge1xuICAgIHZhciBoYXNPbmVUaW1lVG9rZW4gPSBpbnRlcnBUb2tlbnMgJiYgaGFzT25lVGltZShpbnRlcnBUb2tlbnMpO1xuICAgIHZhciBwYXJzZWQgPSAhaGFzT25lVGltZVRva2VuICYmIHBhcnNlRGlyZWN0aXZlKHZhbHVlKTtcbiAgICBkaXJzLnB1c2goe1xuICAgICAgbmFtZTogZGlyTmFtZSxcbiAgICAgIGF0dHI6IHJhd05hbWUsXG4gICAgICByYXc6IHJhd1ZhbHVlLFxuICAgICAgZGVmOiBkZWYsXG4gICAgICBhcmc6IGFyZyxcbiAgICAgIG1vZGlmaWVyczogbW9kaWZpZXJzLFxuICAgICAgLy8gY29udmVyc2lvbiBmcm9tIGludGVycG9sYXRpb24gc3RyaW5ncyB3aXRoIG9uZS10aW1lIHRva2VuXG4gICAgICAvLyB0byBleHByZXNzaW9uIGlzIGRpZmZlcmVkIHVudGlsIGRpcmVjdGl2ZSBiaW5kIHRpbWUgc28gdGhhdCB3ZVxuICAgICAgLy8gaGF2ZSBhY2Nlc3MgdG8gdGhlIGFjdHVhbCB2bSBjb250ZXh0IGZvciBvbmUtdGltZSBiaW5kaW5ncy5cbiAgICAgIGV4cHJlc3Npb246IHBhcnNlZCAmJiBwYXJzZWQuZXhwcmVzc2lvbixcbiAgICAgIGZpbHRlcnM6IHBhcnNlZCAmJiBwYXJzZWQuZmlsdGVycyxcbiAgICAgIGludGVycDogaW50ZXJwVG9rZW5zLFxuICAgICAgaGFzT25lVGltZTogaGFzT25lVGltZVRva2VuXG4gICAgfSk7XG4gIH1cblxuICBpZiAoZGlycy5sZW5ndGgpIHtcbiAgICByZXR1cm4gbWFrZU5vZGVMaW5rRm4oZGlycyk7XG4gIH1cbn1cblxuLyoqXG4gKiBQYXJzZSBtb2RpZmllcnMgZnJvbSBkaXJlY3RpdmUgYXR0cmlidXRlIG5hbWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuXG5mdW5jdGlvbiBwYXJzZU1vZGlmaWVycyhuYW1lKSB7XG4gIHZhciByZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgbWF0Y2ggPSBuYW1lLm1hdGNoKG1vZGlmaWVyUkUpO1xuICBpZiAobWF0Y2gpIHtcbiAgICB2YXIgaSA9IG1hdGNoLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICByZXNbbWF0Y2hbaV0uc2xpY2UoMSldID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuLyoqXG4gKiBCdWlsZCBhIGxpbmsgZnVuY3Rpb24gZm9yIGFsbCBkaXJlY3RpdmVzIG9uIGEgc2luZ2xlIG5vZGUuXG4gKlxuICogQHBhcmFtIHtBcnJheX0gZGlyZWN0aXZlc1xuICogQHJldHVybiB7RnVuY3Rpb259IGRpcmVjdGl2ZXNMaW5rRm5cbiAqL1xuXG5mdW5jdGlvbiBtYWtlTm9kZUxpbmtGbihkaXJlY3RpdmVzKSB7XG4gIHJldHVybiBmdW5jdGlvbiBub2RlTGlua0ZuKHZtLCBlbCwgaG9zdCwgc2NvcGUsIGZyYWcpIHtcbiAgICAvLyByZXZlcnNlIGFwcGx5IGJlY2F1c2UgaXQncyBzb3J0ZWQgbG93IHRvIGhpZ2hcbiAgICB2YXIgaSA9IGRpcmVjdGl2ZXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHZtLl9iaW5kRGlyKGRpcmVjdGl2ZXNbaV0sIGVsLCBob3N0LCBzY29wZSwgZnJhZyk7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGFuIGludGVycG9sYXRpb24gc3RyaW5nIGNvbnRhaW5zIG9uZS10aW1lIHRva2Vucy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB0b2tlbnNcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblxuZnVuY3Rpb24gaGFzT25lVGltZSh0b2tlbnMpIHtcbiAgdmFyIGkgPSB0b2tlbnMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgaWYgKHRva2Vuc1tpXS5vbmVUaW1lKSByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG52YXIgc3BlY2lhbENoYXJSRSA9IC9bXlxcd1xcLTpcXC5dLztcblxuLyoqXG4gKiBQcm9jZXNzIGFuIGVsZW1lbnQgb3IgYSBEb2N1bWVudEZyYWdtZW50IGJhc2VkIG9uIGFcbiAqIGluc3RhbmNlIG9wdGlvbiBvYmplY3QuIFRoaXMgYWxsb3dzIHVzIHRvIHRyYW5zY2x1ZGVcbiAqIGEgdGVtcGxhdGUgbm9kZS9mcmFnbWVudCBiZWZvcmUgdGhlIGluc3RhbmNlIGlzIGNyZWF0ZWQsXG4gKiBzbyB0aGUgcHJvY2Vzc2VkIGZyYWdtZW50IGNhbiB0aGVuIGJlIGNsb25lZCBhbmQgcmV1c2VkXG4gKiBpbiB2LWZvci5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7RWxlbWVudHxEb2N1bWVudEZyYWdtZW50fVxuICovXG5cbmZ1bmN0aW9uIHRyYW5zY2x1ZGUoZWwsIG9wdGlvbnMpIHtcbiAgLy8gZXh0cmFjdCBjb250YWluZXIgYXR0cmlidXRlcyB0byBwYXNzIHRoZW0gZG93blxuICAvLyB0byBjb21waWxlciwgYmVjYXVzZSB0aGV5IG5lZWQgdG8gYmUgY29tcGlsZWQgaW5cbiAgLy8gcGFyZW50IHNjb3BlLiB3ZSBhcmUgbXV0YXRpbmcgdGhlIG9wdGlvbnMgb2JqZWN0IGhlcmVcbiAgLy8gYXNzdW1pbmcgdGhlIHNhbWUgb2JqZWN0IHdpbGwgYmUgdXNlZCBmb3IgY29tcGlsZVxuICAvLyByaWdodCBhZnRlciB0aGlzLlxuICBpZiAob3B0aW9ucykge1xuICAgIG9wdGlvbnMuX2NvbnRhaW5lckF0dHJzID0gZXh0cmFjdEF0dHJzKGVsKTtcbiAgfVxuICAvLyBmb3IgdGVtcGxhdGUgdGFncywgd2hhdCB3ZSB3YW50IGlzIGl0cyBjb250ZW50IGFzXG4gIC8vIGEgZG9jdW1lbnRGcmFnbWVudCAoZm9yIGZyYWdtZW50IGluc3RhbmNlcylcbiAgaWYgKGlzVGVtcGxhdGUoZWwpKSB7XG4gICAgZWwgPSBwYXJzZVRlbXBsYXRlKGVsKTtcbiAgfVxuICBpZiAob3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zLl9hc0NvbXBvbmVudCAmJiAhb3B0aW9ucy50ZW1wbGF0ZSkge1xuICAgICAgb3B0aW9ucy50ZW1wbGF0ZSA9ICc8c2xvdD48L3Nsb3Q+JztcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMudGVtcGxhdGUpIHtcbiAgICAgIG9wdGlvbnMuX2NvbnRlbnQgPSBleHRyYWN0Q29udGVudChlbCk7XG4gICAgICBlbCA9IHRyYW5zY2x1ZGVUZW1wbGF0ZShlbCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG4gIGlmIChpc0ZyYWdtZW50KGVsKSkge1xuICAgIC8vIGFuY2hvcnMgZm9yIGZyYWdtZW50IGluc3RhbmNlXG4gICAgLy8gcGFzc2luZyBpbiBgcGVyc2lzdDogdHJ1ZWAgdG8gYXZvaWQgdGhlbSBiZWluZ1xuICAgIC8vIGRpc2NhcmRlZCBieSBJRSBkdXJpbmcgdGVtcGxhdGUgY2xvbmluZ1xuICAgIHByZXBlbmQoY3JlYXRlQW5jaG9yKCd2LXN0YXJ0JywgdHJ1ZSksIGVsKTtcbiAgICBlbC5hcHBlbmRDaGlsZChjcmVhdGVBbmNob3IoJ3YtZW5kJywgdHJ1ZSkpO1xuICB9XG4gIHJldHVybiBlbDtcbn1cblxuLyoqXG4gKiBQcm9jZXNzIHRoZSB0ZW1wbGF0ZSBvcHRpb24uXG4gKiBJZiB0aGUgcmVwbGFjZSBvcHRpb24gaXMgdHJ1ZSB0aGlzIHdpbGwgc3dhcCB0aGUgJGVsLlxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtFbGVtZW50fERvY3VtZW50RnJhZ21lbnR9XG4gKi9cblxuZnVuY3Rpb24gdHJhbnNjbHVkZVRlbXBsYXRlKGVsLCBvcHRpb25zKSB7XG4gIHZhciB0ZW1wbGF0ZSA9IG9wdGlvbnMudGVtcGxhdGU7XG4gIHZhciBmcmFnID0gcGFyc2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgdHJ1ZSk7XG4gIGlmIChmcmFnKSB7XG4gICAgdmFyIHJlcGxhY2VyID0gZnJhZy5maXJzdENoaWxkO1xuICAgIHZhciB0YWcgPSByZXBsYWNlci50YWdOYW1lICYmIHJlcGxhY2VyLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAob3B0aW9ucy5yZXBsYWNlKSB7XG4gICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cbiAgICAgIGlmIChlbCA9PT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ1lvdSBhcmUgbW91bnRpbmcgYW4gaW5zdGFuY2Ugd2l0aCBhIHRlbXBsYXRlIHRvICcgKyAnPGJvZHk+LiBUaGlzIHdpbGwgcmVwbGFjZSA8Ym9keT4gZW50aXJlbHkuIFlvdSAnICsgJ3Nob3VsZCBwcm9iYWJseSB1c2UgYHJlcGxhY2U6IGZhbHNlYCBoZXJlLicpO1xuICAgICAgfVxuICAgICAgLy8gdGhlcmUgYXJlIG1hbnkgY2FzZXMgd2hlcmUgdGhlIGluc3RhbmNlIG11c3RcbiAgICAgIC8vIGJlY29tZSBhIGZyYWdtZW50IGluc3RhbmNlOiBiYXNpY2FsbHkgYW55dGhpbmcgdGhhdFxuICAgICAgLy8gY2FuIGNyZWF0ZSBtb3JlIHRoYW4gMSByb290IG5vZGVzLlxuICAgICAgaWYgKFxuICAgICAgLy8gbXVsdGktY2hpbGRyZW4gdGVtcGxhdGVcbiAgICAgIGZyYWcuY2hpbGROb2Rlcy5sZW5ndGggPiAxIHx8XG4gICAgICAvLyBub24tZWxlbWVudCB0ZW1wbGF0ZVxuICAgICAgcmVwbGFjZXIubm9kZVR5cGUgIT09IDEgfHxcbiAgICAgIC8vIHNpbmdsZSBuZXN0ZWQgY29tcG9uZW50XG4gICAgICB0YWcgPT09ICdjb21wb25lbnQnIHx8IHJlc29sdmVBc3NldChvcHRpb25zLCAnY29tcG9uZW50cycsIHRhZykgfHwgaGFzQmluZEF0dHIocmVwbGFjZXIsICdpcycpIHx8XG4gICAgICAvLyBlbGVtZW50IGRpcmVjdGl2ZVxuICAgICAgcmVzb2x2ZUFzc2V0KG9wdGlvbnMsICdlbGVtZW50RGlyZWN0aXZlcycsIHRhZykgfHxcbiAgICAgIC8vIGZvciBibG9ja1xuICAgICAgcmVwbGFjZXIuaGFzQXR0cmlidXRlKCd2LWZvcicpIHx8XG4gICAgICAvLyBpZiBibG9ja1xuICAgICAgcmVwbGFjZXIuaGFzQXR0cmlidXRlKCd2LWlmJykpIHtcbiAgICAgICAgcmV0dXJuIGZyYWc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zLl9yZXBsYWNlckF0dHJzID0gZXh0cmFjdEF0dHJzKHJlcGxhY2VyKTtcbiAgICAgICAgbWVyZ2VBdHRycyhlbCwgcmVwbGFjZXIpO1xuICAgICAgICByZXR1cm4gcmVwbGFjZXI7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmFwcGVuZENoaWxkKGZyYWcpO1xuICAgICAgcmV0dXJuIGVsO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ0ludmFsaWQgdGVtcGxhdGUgb3B0aW9uOiAnICsgdGVtcGxhdGUpO1xuICB9XG59XG5cbi8qKlxuICogSGVscGVyIHRvIGV4dHJhY3QgYSBjb21wb25lbnQgY29udGFpbmVyJ3MgYXR0cmlidXRlc1xuICogaW50byBhIHBsYWluIG9iamVjdCBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuXG5mdW5jdGlvbiBleHRyYWN0QXR0cnMoZWwpIHtcbiAgaWYgKGVsLm5vZGVUeXBlID09PSAxICYmIGVsLmhhc0F0dHJpYnV0ZXMoKSkge1xuICAgIHJldHVybiB0b0FycmF5KGVsLmF0dHJpYnV0ZXMpO1xuICB9XG59XG5cbi8qKlxuICogTWVyZ2UgdGhlIGF0dHJpYnV0ZXMgb2YgdHdvIGVsZW1lbnRzLCBhbmQgbWFrZSBzdXJlXG4gKiB0aGUgY2xhc3MgbmFtZXMgYXJlIG1lcmdlZCBwcm9wZXJseS5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGZyb21cbiAqIEBwYXJhbSB7RWxlbWVudH0gdG9cbiAqL1xuXG5mdW5jdGlvbiBtZXJnZUF0dHJzKGZyb20sIHRvKSB7XG4gIHZhciBhdHRycyA9IGZyb20uYXR0cmlidXRlcztcbiAgdmFyIGkgPSBhdHRycy5sZW5ndGg7XG4gIHZhciBuYW1lLCB2YWx1ZTtcbiAgd2hpbGUgKGktLSkge1xuICAgIG5hbWUgPSBhdHRyc1tpXS5uYW1lO1xuICAgIHZhbHVlID0gYXR0cnNbaV0udmFsdWU7XG4gICAgaWYgKCF0by5oYXNBdHRyaWJ1dGUobmFtZSkgJiYgIXNwZWNpYWxDaGFyUkUudGVzdChuYW1lKSkge1xuICAgICAgdG8uc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdjbGFzcycgJiYgIXBhcnNlVGV4dCh2YWx1ZSkpIHtcbiAgICAgIHZhbHVlLnRyaW0oKS5zcGxpdCgvXFxzKy8pLmZvckVhY2goZnVuY3Rpb24gKGNscykge1xuICAgICAgICBhZGRDbGFzcyh0bywgY2xzKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFNjYW4gYW5kIGRldGVybWluZSBzbG90IGNvbnRlbnQgZGlzdHJpYnV0aW9uLlxuICogV2UgZG8gdGhpcyBkdXJpbmcgdHJhbnNjbHVzaW9uIGluc3RlYWQgYXQgY29tcGlsZSB0aW1lIHNvIHRoYXRcbiAqIHRoZSBkaXN0cmlidXRpb24gaXMgZGVjb3VwbGVkIGZyb20gdGhlIGNvbXBpbGF0aW9uIG9yZGVyIG9mXG4gKiB0aGUgc2xvdHMuXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fERvY3VtZW50RnJhZ21lbnR9IHRlbXBsYXRlXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGNvbnRlbnRcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICovXG5cbmZ1bmN0aW9uIHJlc29sdmVTbG90cyh2bSwgY29udGVudCkge1xuICBpZiAoIWNvbnRlbnQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGNvbnRlbnRzID0gdm0uX3Nsb3RDb250ZW50cyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHZhciBlbCwgbmFtZTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBjb250ZW50LmNoaWxkcmVuLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGVsID0gY29udGVudC5jaGlsZHJlbltpXTtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25kLWFzc2lnbiAqL1xuICAgIGlmIChuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCdzbG90JykpIHtcbiAgICAgIChjb250ZW50c1tuYW1lXSB8fCAoY29udGVudHNbbmFtZV0gPSBbXSkpLnB1c2goZWwpO1xuICAgIH1cbiAgICAvKiBlc2xpbnQtZW5hYmxlIG5vLWNvbmQtYXNzaWduICovXG4gIH1cbiAgZm9yIChuYW1lIGluIGNvbnRlbnRzKSB7XG4gICAgY29udGVudHNbbmFtZV0gPSBleHRyYWN0RnJhZ21lbnQoY29udGVudHNbbmFtZV0sIGNvbnRlbnQpO1xuICB9XG4gIGlmIChjb250ZW50Lmhhc0NoaWxkTm9kZXMoKSkge1xuICAgIGNvbnRlbnRzWydkZWZhdWx0J10gPSBleHRyYWN0RnJhZ21lbnQoY29udGVudC5jaGlsZE5vZGVzLCBjb250ZW50KTtcbiAgfVxufVxuXG4vKipcbiAqIEV4dHJhY3QgcXVhbGlmaWVkIGNvbnRlbnQgbm9kZXMgZnJvbSBhIG5vZGUgbGlzdC5cbiAqXG4gKiBAcGFyYW0ge05vZGVMaXN0fSBub2Rlc1xuICogQHJldHVybiB7RG9jdW1lbnRGcmFnbWVudH1cbiAqL1xuXG5mdW5jdGlvbiBleHRyYWN0RnJhZ21lbnQobm9kZXMsIHBhcmVudCkge1xuICB2YXIgZnJhZyA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcbiAgbm9kZXMgPSB0b0FycmF5KG5vZGVzKTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgbm9kZSA9IG5vZGVzW2ldO1xuICAgIGlmIChpc1RlbXBsYXRlKG5vZGUpICYmICFub2RlLmhhc0F0dHJpYnV0ZSgndi1pZicpICYmICFub2RlLmhhc0F0dHJpYnV0ZSgndi1mb3InKSkge1xuICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgbm9kZSA9IHBhcnNlVGVtcGxhdGUobm9kZSk7XG4gICAgfVxuICAgIGZyYWcuYXBwZW5kQ2hpbGQobm9kZSk7XG4gIH1cbiAgcmV0dXJuIGZyYWc7XG59XG5cblxuXG52YXIgY29tcGlsZXIgPSBPYmplY3QuZnJlZXplKHtcblx0Y29tcGlsZTogY29tcGlsZSxcblx0Y29tcGlsZUFuZExpbmtQcm9wczogY29tcGlsZUFuZExpbmtQcm9wcyxcblx0Y29tcGlsZVJvb3Q6IGNvbXBpbGVSb290LFxuXHR0ZXJtaW5hbERpcmVjdGl2ZXM6IHRlcm1pbmFsRGlyZWN0aXZlcyxcblx0dHJhbnNjbHVkZTogdHJhbnNjbHVkZSxcblx0cmVzb2x2ZVNsb3RzOiByZXNvbHZlU2xvdHNcbn0pO1xuXG5mdW5jdGlvbiBzdGF0ZU1peGluIChWdWUpIHtcbiAgLyoqXG4gICAqIEFjY2Vzc29yIGZvciBgJGRhdGFgIHByb3BlcnR5LCBzaW5jZSBzZXR0aW5nICRkYXRhXG4gICAqIHJlcXVpcmVzIG9ic2VydmluZyB0aGUgbmV3IG9iamVjdCBhbmQgdXBkYXRpbmdcbiAgICogcHJveGllZCBwcm9wZXJ0aWVzLlxuICAgKi9cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoVnVlLnByb3RvdHlwZSwgJyRkYXRhJywge1xuICAgIGdldDogZnVuY3Rpb24gZ2V0KCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uIHNldChuZXdEYXRhKSB7XG4gICAgICBpZiAobmV3RGF0YSAhPT0gdGhpcy5fZGF0YSkge1xuICAgICAgICB0aGlzLl9zZXREYXRhKG5ld0RhdGEpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLyoqXG4gICAqIFNldHVwIHRoZSBzY29wZSBvZiBhbiBpbnN0YW5jZSwgd2hpY2ggY29udGFpbnM6XG4gICAqIC0gb2JzZXJ2ZWQgZGF0YVxuICAgKiAtIGNvbXB1dGVkIHByb3BlcnRpZXNcbiAgICogLSB1c2VyIG1ldGhvZHNcbiAgICogLSBtZXRhIHByb3BlcnRpZXNcbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS5faW5pdFN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2luaXRQcm9wcygpO1xuICAgIHRoaXMuX2luaXRNZXRhKCk7XG4gICAgdGhpcy5faW5pdE1ldGhvZHMoKTtcbiAgICB0aGlzLl9pbml0RGF0YSgpO1xuICAgIHRoaXMuX2luaXRDb21wdXRlZCgpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHByb3BzLlxuICAgKi9cblxuICBWdWUucHJvdG90eXBlLl9pbml0UHJvcHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLiRvcHRpb25zO1xuICAgIHZhciBlbCA9IG9wdGlvbnMuZWw7XG4gICAgdmFyIHByb3BzID0gb3B0aW9ucy5wcm9wcztcbiAgICBpZiAocHJvcHMgJiYgIWVsKSB7XG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHdhcm4oJ1Byb3BzIHdpbGwgbm90IGJlIGNvbXBpbGVkIGlmIG5vIGBlbGAgb3B0aW9uIGlzICcgKyAncHJvdmlkZWQgYXQgaW5zdGFudGlhdGlvbi4nKTtcbiAgICB9XG4gICAgLy8gbWFrZSBzdXJlIHRvIGNvbnZlcnQgc3RyaW5nIHNlbGVjdG9ycyBpbnRvIGVsZW1lbnQgbm93XG4gICAgZWwgPSBvcHRpb25zLmVsID0gcXVlcnkoZWwpO1xuICAgIHRoaXMuX3Byb3BzVW5saW5rRm4gPSBlbCAmJiBlbC5ub2RlVHlwZSA9PT0gMSAmJiBwcm9wc1xuICAgIC8vIHByb3BzIG11c3QgYmUgbGlua2VkIGluIHByb3BlciBzY29wZSBpZiBpbnNpZGUgdi1mb3JcbiAgICA/IGNvbXBpbGVBbmRMaW5rUHJvcHModGhpcywgZWwsIHByb3BzLCB0aGlzLl9zY29wZSkgOiBudWxsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHRoZSBkYXRhLlxuICAgKi9cblxuICBWdWUucHJvdG90eXBlLl9pbml0RGF0YSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZGF0YUZuID0gdGhpcy4kb3B0aW9ucy5kYXRhO1xuICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YSA9IGRhdGFGbiA/IGRhdGFGbigpIDoge307XG4gICAgdmFyIHByb3BzID0gdGhpcy5fcHJvcHM7XG4gICAgdmFyIHJ1bnRpbWVEYXRhID0gdGhpcy5fcnVudGltZURhdGEgPyB0eXBlb2YgdGhpcy5fcnVudGltZURhdGEgPT09ICdmdW5jdGlvbicgPyB0aGlzLl9ydW50aW1lRGF0YSgpIDogdGhpcy5fcnVudGltZURhdGEgOiBudWxsO1xuICAgIC8vIHByb3h5IGRhdGEgb24gaW5zdGFuY2VcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpO1xuICAgIHZhciBpLCBrZXk7XG4gICAgaSA9IGtleXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICAvLyB0aGVyZSBhcmUgdHdvIHNjZW5hcmlvcyB3aGVyZSB3ZSBjYW4gcHJveHkgYSBkYXRhIGtleTpcbiAgICAgIC8vIDEuIGl0J3Mgbm90IGFscmVhZHkgZGVmaW5lZCBhcyBhIHByb3BcbiAgICAgIC8vIDIuIGl0J3MgcHJvdmlkZWQgdmlhIGEgaW5zdGFudGlhdGlvbiBvcHRpb24gQU5EIHRoZXJlIGFyZSBub1xuICAgICAgLy8gICAgdGVtcGxhdGUgcHJvcCBwcmVzZW50XG4gICAgICBpZiAoIXByb3BzIHx8ICFoYXNPd24ocHJvcHMsIGtleSkgfHwgcnVudGltZURhdGEgJiYgaGFzT3duKHJ1bnRpbWVEYXRhLCBrZXkpICYmIHByb3BzW2tleV0ucmF3ID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMuX3Byb3h5KGtleSk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgICAgd2FybignRGF0YSBmaWVsZCBcIicgKyBrZXkgKyAnXCIgaXMgYWxyZWFkeSBkZWZpbmVkICcgKyAnYXMgYSBwcm9wLiBVc2UgcHJvcCBkZWZhdWx0IHZhbHVlIGluc3RlYWQuJyk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIG9ic2VydmUgZGF0YVxuICAgIG9ic2VydmUoZGF0YSwgdGhpcyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFN3YXAgdGhlIGluc3RhbmNlJ3MgJGRhdGEuIENhbGxlZCBpbiAkZGF0YSdzIHNldHRlci5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG5ld0RhdGFcbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS5fc2V0RGF0YSA9IGZ1bmN0aW9uIChuZXdEYXRhKSB7XG4gICAgbmV3RGF0YSA9IG5ld0RhdGEgfHwge307XG4gICAgdmFyIG9sZERhdGEgPSB0aGlzLl9kYXRhO1xuICAgIHRoaXMuX2RhdGEgPSBuZXdEYXRhO1xuICAgIHZhciBrZXlzLCBrZXksIGk7XG4gICAgLy8gdW5wcm94eSBrZXlzIG5vdCBwcmVzZW50IGluIG5ldyBkYXRhXG4gICAga2V5cyA9IE9iamVjdC5rZXlzKG9sZERhdGEpO1xuICAgIGkgPSBrZXlzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgaWYgKCEoa2V5IGluIG5ld0RhdGEpKSB7XG4gICAgICAgIHRoaXMuX3VucHJveHkoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gcHJveHkga2V5cyBub3QgYWxyZWFkeSBwcm94aWVkLFxuICAgIC8vIGFuZCB0cmlnZ2VyIGNoYW5nZSBmb3IgY2hhbmdlZCB2YWx1ZXNcbiAgICBrZXlzID0gT2JqZWN0LmtleXMobmV3RGF0YSk7XG4gICAgaSA9IGtleXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICBpZiAoIWhhc093bih0aGlzLCBrZXkpKSB7XG4gICAgICAgIC8vIG5ldyBwcm9wZXJ0eVxuICAgICAgICB0aGlzLl9wcm94eShrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgICBvbGREYXRhLl9fb2JfXy5yZW1vdmVWbSh0aGlzKTtcbiAgICBvYnNlcnZlKG5ld0RhdGEsIHRoaXMpO1xuICAgIHRoaXMuX2RpZ2VzdCgpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBQcm94eSBhIHByb3BlcnR5LCBzbyB0aGF0XG4gICAqIHZtLnByb3AgPT09IHZtLl9kYXRhLnByb3BcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICAgKi9cblxuICBWdWUucHJvdG90eXBlLl9wcm94eSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBpZiAoIWlzUmVzZXJ2ZWQoa2V5KSkge1xuICAgICAgLy8gbmVlZCB0byBzdG9yZSByZWYgdG8gc2VsZiBoZXJlXG4gICAgICAvLyBiZWNhdXNlIHRoZXNlIGdldHRlci9zZXR0ZXJzIG1pZ2h0XG4gICAgICAvLyBiZSBjYWxsZWQgYnkgY2hpbGQgc2NvcGVzIHZpYVxuICAgICAgLy8gcHJvdG90eXBlIGluaGVyaXRhbmNlLlxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHNlbGYsIGtleSwge1xuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGdldDogZnVuY3Rpb24gcHJveHlHZXR0ZXIoKSB7XG4gICAgICAgICAgcmV0dXJuIHNlbGYuX2RhdGFba2V5XTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiBwcm94eVNldHRlcih2YWwpIHtcbiAgICAgICAgICBzZWxmLl9kYXRhW2tleV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogVW5wcm94eSBhIHByb3BlcnR5LlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuX3VucHJveHkgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgaWYgKCFpc1Jlc2VydmVkKGtleSkpIHtcbiAgICAgIGRlbGV0ZSB0aGlzW2tleV07XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBGb3JjZSB1cGRhdGUgb24gZXZlcnkgd2F0Y2hlciBpbiBzY29wZS5cbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS5fZGlnZXN0ID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5fd2F0Y2hlcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0aGlzLl93YXRjaGVyc1tpXS51cGRhdGUodHJ1ZSk7IC8vIHNoYWxsb3cgdXBkYXRlc1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogU2V0dXAgY29tcHV0ZWQgcHJvcGVydGllcy4gVGhleSBhcmUgZXNzZW50aWFsbHlcbiAgICogc3BlY2lhbCBnZXR0ZXIvc2V0dGVyc1xuICAgKi9cblxuICBmdW5jdGlvbiBub29wKCkge31cbiAgVnVlLnByb3RvdHlwZS5faW5pdENvbXB1dGVkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb21wdXRlZCA9IHRoaXMuJG9wdGlvbnMuY29tcHV0ZWQ7XG4gICAgaWYgKGNvbXB1dGVkKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gY29tcHV0ZWQpIHtcbiAgICAgICAgdmFyIHVzZXJEZWYgPSBjb21wdXRlZFtrZXldO1xuICAgICAgICB2YXIgZGVmID0ge1xuICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGlmICh0eXBlb2YgdXNlckRlZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGRlZi5nZXQgPSBtYWtlQ29tcHV0ZWRHZXR0ZXIodXNlckRlZiwgdGhpcyk7XG4gICAgICAgICAgZGVmLnNldCA9IG5vb3A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVmLmdldCA9IHVzZXJEZWYuZ2V0ID8gdXNlckRlZi5jYWNoZSAhPT0gZmFsc2UgPyBtYWtlQ29tcHV0ZWRHZXR0ZXIodXNlckRlZi5nZXQsIHRoaXMpIDogYmluZCh1c2VyRGVmLmdldCwgdGhpcykgOiBub29wO1xuICAgICAgICAgIGRlZi5zZXQgPSB1c2VyRGVmLnNldCA/IGJpbmQodXNlckRlZi5zZXQsIHRoaXMpIDogbm9vcDtcbiAgICAgICAgfVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywga2V5LCBkZWYpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBmdW5jdGlvbiBtYWtlQ29tcHV0ZWRHZXR0ZXIoZ2V0dGVyLCBvd25lcikge1xuICAgIHZhciB3YXRjaGVyID0gbmV3IFdhdGNoZXIob3duZXIsIGdldHRlciwgbnVsbCwge1xuICAgICAgbGF6eTogdHJ1ZVxuICAgIH0pO1xuICAgIHJldHVybiBmdW5jdGlvbiBjb21wdXRlZEdldHRlcigpIHtcbiAgICAgIGlmICh3YXRjaGVyLmRpcnR5KSB7XG4gICAgICAgIHdhdGNoZXIuZXZhbHVhdGUoKTtcbiAgICAgIH1cbiAgICAgIGlmIChEZXAudGFyZ2V0KSB7XG4gICAgICAgIHdhdGNoZXIuZGVwZW5kKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gd2F0Y2hlci52YWx1ZTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHVwIGluc3RhbmNlIG1ldGhvZHMuIE1ldGhvZHMgbXVzdCBiZSBib3VuZCB0byB0aGVcbiAgICogaW5zdGFuY2Ugc2luY2UgdGhleSBtaWdodCBiZSBwYXNzZWQgZG93biBhcyBhIHByb3AgdG9cbiAgICogY2hpbGQgY29tcG9uZW50cy5cbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS5faW5pdE1ldGhvZHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1ldGhvZHMgPSB0aGlzLiRvcHRpb25zLm1ldGhvZHM7XG4gICAgaWYgKG1ldGhvZHMpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBtZXRob2RzKSB7XG4gICAgICAgIHRoaXNba2V5XSA9IGJpbmQobWV0aG9kc1trZXldLCB0aGlzKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgbWV0YSBpbmZvcm1hdGlvbiBsaWtlICRpbmRleCwgJGtleSAmICR2YWx1ZS5cbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS5faW5pdE1ldGEgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG1ldGFzID0gdGhpcy4kb3B0aW9ucy5fbWV0YTtcbiAgICBpZiAobWV0YXMpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBtZXRhcykge1xuICAgICAgICBkZWZpbmVSZWFjdGl2ZSh0aGlzLCBrZXksIG1ldGFzW2tleV0pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxudmFyIGV2ZW50UkUgPSAvXnYtb246fF5ALztcblxuZnVuY3Rpb24gZXZlbnRzTWl4aW4gKFZ1ZSkge1xuICAvKipcbiAgICogU2V0dXAgdGhlIGluc3RhbmNlJ3Mgb3B0aW9uIGV2ZW50cyAmIHdhdGNoZXJzLlxuICAgKiBJZiB0aGUgdmFsdWUgaXMgYSBzdHJpbmcsIHdlIHB1bGwgaXQgZnJvbSB0aGVcbiAgICogaW5zdGFuY2UncyBtZXRob2RzIGJ5IG5hbWUuXG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuX2luaXRFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLiRvcHRpb25zO1xuICAgIGlmIChvcHRpb25zLl9hc0NvbXBvbmVudCkge1xuICAgICAgcmVnaXN0ZXJDb21wb25lbnRFdmVudHModGhpcywgb3B0aW9ucy5lbCk7XG4gICAgfVxuICAgIHJlZ2lzdGVyQ2FsbGJhY2tzKHRoaXMsICckb24nLCBvcHRpb25zLmV2ZW50cyk7XG4gICAgcmVnaXN0ZXJDYWxsYmFja3ModGhpcywgJyR3YXRjaCcsIG9wdGlvbnMud2F0Y2gpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB2LW9uIGV2ZW50cyBvbiBhIGNoaWxkIGNvbXBvbmVudFxuICAgKlxuICAgKiBAcGFyYW0ge1Z1ZX0gdm1cbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICAgKi9cblxuICBmdW5jdGlvbiByZWdpc3RlckNvbXBvbmVudEV2ZW50cyh2bSwgZWwpIHtcbiAgICB2YXIgYXR0cnMgPSBlbC5hdHRyaWJ1dGVzO1xuICAgIHZhciBuYW1lLCBoYW5kbGVyO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gYXR0cnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBuYW1lID0gYXR0cnNbaV0ubmFtZTtcbiAgICAgIGlmIChldmVudFJFLnRlc3QobmFtZSkpIHtcbiAgICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZShldmVudFJFLCAnJyk7XG4gICAgICAgIGhhbmRsZXIgPSAodm0uX3Njb3BlIHx8IHZtLl9jb250ZXh0KS4kZXZhbChhdHRyc1tpXS52YWx1ZSwgdHJ1ZSk7XG4gICAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGhhbmRsZXIuX2Zyb21QYXJlbnQgPSB0cnVlO1xuICAgICAgICAgIHZtLiRvbihuYW1lLnJlcGxhY2UoZXZlbnRSRSksIGhhbmRsZXIpO1xuICAgICAgICB9IGVsc2UgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgICAgICB3YXJuKCd2LW9uOicgKyBuYW1lICsgJz1cIicgKyBhdHRyc1tpXS52YWx1ZSArICdcIicgKyAodm0uJG9wdGlvbnMubmFtZSA/ICcgb24gY29tcG9uZW50IDwnICsgdm0uJG9wdGlvbnMubmFtZSArICc+JyA6ICcnKSArICcgZXhwZWN0cyBhIGZ1bmN0aW9uIHZhbHVlLCBnb3QgJyArIGhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGNhbGxiYWNrcyBmb3Igb3B0aW9uIGV2ZW50cyBhbmQgd2F0Y2hlcnMuXG4gICAqXG4gICAqIEBwYXJhbSB7VnVlfSB2bVxuICAgKiBAcGFyYW0ge1N0cmluZ30gYWN0aW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBoYXNoXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyQ2FsbGJhY2tzKHZtLCBhY3Rpb24sIGhhc2gpIHtcbiAgICBpZiAoIWhhc2gpIHJldHVybjtcbiAgICB2YXIgaGFuZGxlcnMsIGtleSwgaSwgajtcbiAgICBmb3IgKGtleSBpbiBoYXNoKSB7XG4gICAgICBoYW5kbGVycyA9IGhhc2hba2V5XTtcbiAgICAgIGlmIChpc0FycmF5KGhhbmRsZXJzKSkge1xuICAgICAgICBmb3IgKGkgPSAwLCBqID0gaGFuZGxlcnMubGVuZ3RoOyBpIDwgajsgaSsrKSB7XG4gICAgICAgICAgcmVnaXN0ZXIodm0sIGFjdGlvbiwga2V5LCBoYW5kbGVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlZ2lzdGVyKHZtLCBhY3Rpb24sIGtleSwgaGFuZGxlcnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIZWxwZXIgdG8gcmVnaXN0ZXIgYW4gZXZlbnQvd2F0Y2ggY2FsbGJhY2suXG4gICAqXG4gICAqIEBwYXJhbSB7VnVlfSB2bVxuICAgKiBAcGFyYW0ge1N0cmluZ30gYWN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAgICogQHBhcmFtIHtGdW5jdGlvbnxTdHJpbmd8T2JqZWN0fSBoYW5kbGVyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICovXG5cbiAgZnVuY3Rpb24gcmVnaXN0ZXIodm0sIGFjdGlvbiwga2V5LCBoYW5kbGVyLCBvcHRpb25zKSB7XG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgaGFuZGxlcjtcbiAgICBpZiAodHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdm1bYWN0aW9uXShrZXksIGhhbmRsZXIsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHZhciBtZXRob2RzID0gdm0uJG9wdGlvbnMubWV0aG9kcztcbiAgICAgIHZhciBtZXRob2QgPSBtZXRob2RzICYmIG1ldGhvZHNbaGFuZGxlcl07XG4gICAgICBpZiAobWV0aG9kKSB7XG4gICAgICAgIHZtW2FjdGlvbl0oa2V5LCBtZXRob2QsIG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiB3YXJuKCdVbmtub3duIG1ldGhvZDogXCInICsgaGFuZGxlciArICdcIiB3aGVuICcgKyAncmVnaXN0ZXJpbmcgY2FsbGJhY2sgZm9yICcgKyBhY3Rpb24gKyAnOiBcIicgKyBrZXkgKyAnXCIuJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChoYW5kbGVyICYmIHR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICByZWdpc3Rlcih2bSwgYWN0aW9uLCBrZXksIGhhbmRsZXIuaGFuZGxlciwgaGFuZGxlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldHVwIHJlY3Vyc2l2ZSBhdHRhY2hlZC9kZXRhY2hlZCBjYWxsc1xuICAgKi9cblxuICBWdWUucHJvdG90eXBlLl9pbml0RE9NSG9va3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy4kb24oJ2hvb2s6YXR0YWNoZWQnLCBvbkF0dGFjaGVkKTtcbiAgICB0aGlzLiRvbignaG9vazpkZXRhY2hlZCcsIG9uRGV0YWNoZWQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsYmFjayB0byByZWN1cnNpdmVseSBjYWxsIGF0dGFjaGVkIGhvb2sgb24gY2hpbGRyZW5cbiAgICovXG5cbiAgZnVuY3Rpb24gb25BdHRhY2hlZCgpIHtcbiAgICBpZiAoIXRoaXMuX2lzQXR0YWNoZWQpIHtcbiAgICAgIHRoaXMuX2lzQXR0YWNoZWQgPSB0cnVlO1xuICAgICAgdGhpcy4kY2hpbGRyZW4uZm9yRWFjaChjYWxsQXR0YWNoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0b3IgdG8gY2FsbCBhdHRhY2hlZCBob29rXG4gICAqXG4gICAqIEBwYXJhbSB7VnVlfSBjaGlsZFxuICAgKi9cblxuICBmdW5jdGlvbiBjYWxsQXR0YWNoKGNoaWxkKSB7XG4gICAgaWYgKCFjaGlsZC5faXNBdHRhY2hlZCAmJiBpbkRvYyhjaGlsZC4kZWwpKSB7XG4gICAgICBjaGlsZC5fY2FsbEhvb2soJ2F0dGFjaGVkJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrIHRvIHJlY3Vyc2l2ZWx5IGNhbGwgZGV0YWNoZWQgaG9vayBvbiBjaGlsZHJlblxuICAgKi9cblxuICBmdW5jdGlvbiBvbkRldGFjaGVkKCkge1xuICAgIGlmICh0aGlzLl9pc0F0dGFjaGVkKSB7XG4gICAgICB0aGlzLl9pc0F0dGFjaGVkID0gZmFsc2U7XG4gICAgICB0aGlzLiRjaGlsZHJlbi5mb3JFYWNoKGNhbGxEZXRhY2gpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRvciB0byBjYWxsIGRldGFjaGVkIGhvb2tcbiAgICpcbiAgICogQHBhcmFtIHtWdWV9IGNoaWxkXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGNhbGxEZXRhY2goY2hpbGQpIHtcbiAgICBpZiAoY2hpbGQuX2lzQXR0YWNoZWQgJiYgIWluRG9jKGNoaWxkLiRlbCkpIHtcbiAgICAgIGNoaWxkLl9jYWxsSG9vaygnZGV0YWNoZWQnKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVHJpZ2dlciBhbGwgaGFuZGxlcnMgZm9yIGEgaG9va1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaG9va1xuICAgKi9cblxuICBWdWUucHJvdG90eXBlLl9jYWxsSG9vayA9IGZ1bmN0aW9uIChob29rKSB7XG4gICAgdGhpcy4kZW1pdCgncHJlLWhvb2s6JyArIGhvb2spO1xuICAgIHZhciBoYW5kbGVycyA9IHRoaXMuJG9wdGlvbnNbaG9va107XG4gICAgaWYgKGhhbmRsZXJzKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgaiA9IGhhbmRsZXJzLmxlbmd0aDsgaSA8IGo7IGkrKykge1xuICAgICAgICBoYW5kbGVyc1tpXS5jYWxsKHRoaXMpO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLiRlbWl0KCdob29rOicgKyBob29rKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbi8qKlxuICogQSBkaXJlY3RpdmUgbGlua3MgYSBET00gZWxlbWVudCB3aXRoIGEgcGllY2Ugb2YgZGF0YSxcbiAqIHdoaWNoIGlzIHRoZSByZXN1bHQgb2YgZXZhbHVhdGluZyBhbiBleHByZXNzaW9uLlxuICogSXQgcmVnaXN0ZXJzIGEgd2F0Y2hlciB3aXRoIHRoZSBleHByZXNzaW9uIGFuZCBjYWxsc1xuICogdGhlIERPTSB1cGRhdGUgZnVuY3Rpb24gd2hlbiBhIGNoYW5nZSBpcyB0cmlnZ2VyZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAqIEBwYXJhbSB7VnVlfSB2bVxuICogQHBhcmFtIHtPYmplY3R9IGRlc2NyaXB0b3JcbiAqICAgICAgICAgICAgICAgICAtIHtTdHJpbmd9IG5hbWVcbiAqICAgICAgICAgICAgICAgICAtIHtPYmplY3R9IGRlZlxuICogICAgICAgICAgICAgICAgIC0ge1N0cmluZ30gZXhwcmVzc2lvblxuICogICAgICAgICAgICAgICAgIC0ge0FycmF5PE9iamVjdD59IFtmaWx0ZXJzXVxuICogICAgICAgICAgICAgICAgIC0ge0Jvb2xlYW59IGxpdGVyYWxcbiAqICAgICAgICAgICAgICAgICAtIHtTdHJpbmd9IGF0dHJcbiAqICAgICAgICAgICAgICAgICAtIHtTdHJpbmd9IHJhd1xuICogQHBhcmFtIHtPYmplY3R9IGRlZiAtIGRpcmVjdGl2ZSBkZWZpbml0aW9uIG9iamVjdFxuICogQHBhcmFtIHtWdWV9IFtob3N0XSAtIHRyYW5zY2x1c2lvbiBob3N0IGNvbXBvbmVudFxuICogQHBhcmFtIHtPYmplY3R9IFtzY29wZV0gLSB2LWZvciBzY29wZVxuICogQHBhcmFtIHtGcmFnbWVudH0gW2ZyYWddIC0gb3duZXIgZnJhZ21lbnRcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBEaXJlY3RpdmUoZGVzY3JpcHRvciwgdm0sIGVsLCBob3N0LCBzY29wZSwgZnJhZykge1xuICB0aGlzLnZtID0gdm07XG4gIHRoaXMuZWwgPSBlbDtcbiAgLy8gY29weSBkZXNjcmlwdG9yIHByb3BlcnRpZXNcbiAgdGhpcy5kZXNjcmlwdG9yID0gZGVzY3JpcHRvcjtcbiAgdGhpcy5uYW1lID0gZGVzY3JpcHRvci5uYW1lO1xuICB0aGlzLmV4cHJlc3Npb24gPSBkZXNjcmlwdG9yLmV4cHJlc3Npb247XG4gIHRoaXMuYXJnID0gZGVzY3JpcHRvci5hcmc7XG4gIHRoaXMubW9kaWZpZXJzID0gZGVzY3JpcHRvci5tb2RpZmllcnM7XG4gIHRoaXMuZmlsdGVycyA9IGRlc2NyaXB0b3IuZmlsdGVycztcbiAgdGhpcy5saXRlcmFsID0gdGhpcy5tb2RpZmllcnMgJiYgdGhpcy5tb2RpZmllcnMubGl0ZXJhbDtcbiAgLy8gcHJpdmF0ZVxuICB0aGlzLl9sb2NrZWQgPSBmYWxzZTtcbiAgdGhpcy5fYm91bmQgPSBmYWxzZTtcbiAgdGhpcy5fbGlzdGVuZXJzID0gbnVsbDtcbiAgLy8gbGluayBjb250ZXh0XG4gIHRoaXMuX2hvc3QgPSBob3N0O1xuICB0aGlzLl9zY29wZSA9IHNjb3BlO1xuICB0aGlzLl9mcmFnID0gZnJhZztcbiAgLy8gc3RvcmUgZGlyZWN0aXZlcyBvbiBub2RlIGluIGRldiBtb2RlXG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHRoaXMuZWwpIHtcbiAgICB0aGlzLmVsLl92dWVfZGlyZWN0aXZlcyA9IHRoaXMuZWwuX3Z1ZV9kaXJlY3RpdmVzIHx8IFtdO1xuICAgIHRoaXMuZWwuX3Z1ZV9kaXJlY3RpdmVzLnB1c2godGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHRoZSBkaXJlY3RpdmUsIG1peGluIGRlZmluaXRpb24gcHJvcGVydGllcyxcbiAqIHNldHVwIHRoZSB3YXRjaGVyLCBjYWxsIGRlZmluaXRpb24gYmluZCgpIGFuZCB1cGRhdGUoKVxuICogaWYgcHJlc2VudC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZGVmXG4gKi9cblxuRGlyZWN0aXZlLnByb3RvdHlwZS5fYmluZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG5hbWUgPSB0aGlzLm5hbWU7XG4gIHZhciBkZXNjcmlwdG9yID0gdGhpcy5kZXNjcmlwdG9yO1xuXG4gIC8vIHJlbW92ZSBhdHRyaWJ1dGVcbiAgaWYgKChuYW1lICE9PSAnY2xvYWsnIHx8IHRoaXMudm0uX2lzQ29tcGlsZWQpICYmIHRoaXMuZWwgJiYgdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUpIHtcbiAgICB2YXIgYXR0ciA9IGRlc2NyaXB0b3IuYXR0ciB8fCAndi0nICsgbmFtZTtcbiAgICB0aGlzLmVsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKTtcbiAgfVxuXG4gIC8vIGNvcHkgZGVmIHByb3BlcnRpZXNcbiAgdmFyIGRlZiA9IGRlc2NyaXB0b3IuZGVmO1xuICBpZiAodHlwZW9mIGRlZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRoaXMudXBkYXRlID0gZGVmO1xuICB9IGVsc2Uge1xuICAgIGV4dGVuZCh0aGlzLCBkZWYpO1xuICB9XG5cbiAgLy8gc2V0dXAgZGlyZWN0aXZlIHBhcmFtc1xuICB0aGlzLl9zZXR1cFBhcmFtcygpO1xuXG4gIC8vIGluaXRpYWwgYmluZFxuICBpZiAodGhpcy5iaW5kKSB7XG4gICAgdGhpcy5iaW5kKCk7XG4gIH1cbiAgdGhpcy5fYm91bmQgPSB0cnVlO1xuXG4gIGlmICh0aGlzLmxpdGVyYWwpIHtcbiAgICB0aGlzLnVwZGF0ZSAmJiB0aGlzLnVwZGF0ZShkZXNjcmlwdG9yLnJhdyk7XG4gIH0gZWxzZSBpZiAoKHRoaXMuZXhwcmVzc2lvbiB8fCB0aGlzLm1vZGlmaWVycykgJiYgKHRoaXMudXBkYXRlIHx8IHRoaXMudHdvV2F5KSAmJiAhdGhpcy5fY2hlY2tTdGF0ZW1lbnQoKSkge1xuICAgIC8vIHdyYXBwZWQgdXBkYXRlciBmb3IgY29udGV4dFxuICAgIHZhciBkaXIgPSB0aGlzO1xuICAgIGlmICh0aGlzLnVwZGF0ZSkge1xuICAgICAgdGhpcy5fdXBkYXRlID0gZnVuY3Rpb24gKHZhbCwgb2xkVmFsKSB7XG4gICAgICAgIGlmICghZGlyLl9sb2NrZWQpIHtcbiAgICAgICAgICBkaXIudXBkYXRlKHZhbCwgb2xkVmFsKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdXBkYXRlID0gbm9vcDtcbiAgICB9XG4gICAgdmFyIHByZVByb2Nlc3MgPSB0aGlzLl9wcmVQcm9jZXNzID8gYmluZCh0aGlzLl9wcmVQcm9jZXNzLCB0aGlzKSA6IG51bGw7XG4gICAgdmFyIHBvc3RQcm9jZXNzID0gdGhpcy5fcG9zdFByb2Nlc3MgPyBiaW5kKHRoaXMuX3Bvc3RQcm9jZXNzLCB0aGlzKSA6IG51bGw7XG4gICAgdmFyIHdhdGNoZXIgPSB0aGlzLl93YXRjaGVyID0gbmV3IFdhdGNoZXIodGhpcy52bSwgdGhpcy5leHByZXNzaW9uLCB0aGlzLl91cGRhdGUsIC8vIGNhbGxiYWNrXG4gICAge1xuICAgICAgZmlsdGVyczogdGhpcy5maWx0ZXJzLFxuICAgICAgdHdvV2F5OiB0aGlzLnR3b1dheSxcbiAgICAgIGRlZXA6IHRoaXMuZGVlcCxcbiAgICAgIHByZVByb2Nlc3M6IHByZVByb2Nlc3MsXG4gICAgICBwb3N0UHJvY2VzczogcG9zdFByb2Nlc3MsXG4gICAgICBzY29wZTogdGhpcy5fc2NvcGVcbiAgICB9KTtcbiAgICAvLyB2LW1vZGVsIHdpdGggaW5pdGFsIGlubGluZSB2YWx1ZSBuZWVkIHRvIHN5bmMgYmFjayB0b1xuICAgIC8vIG1vZGVsIGluc3RlYWQgb2YgdXBkYXRlIHRvIERPTSBvbiBpbml0LiBUaGV5IHdvdWxkXG4gICAgLy8gc2V0IHRoZSBhZnRlckJpbmQgaG9vayB0byBpbmRpY2F0ZSB0aGF0LlxuICAgIGlmICh0aGlzLmFmdGVyQmluZCkge1xuICAgICAgdGhpcy5hZnRlckJpbmQoKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMudXBkYXRlKSB7XG4gICAgICB0aGlzLnVwZGF0ZSh3YXRjaGVyLnZhbHVlKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogU2V0dXAgYWxsIHBhcmFtIGF0dHJpYnV0ZXMsIGUuZy4gdHJhY2stYnksXG4gKiB0cmFuc2l0aW9uLW1vZGUsIGV0Yy4uLlxuICovXG5cbkRpcmVjdGl2ZS5wcm90b3R5cGUuX3NldHVwUGFyYW1zID0gZnVuY3Rpb24gKCkge1xuICBpZiAoIXRoaXMucGFyYW1zKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBwYXJhbXMgPSB0aGlzLnBhcmFtcztcbiAgLy8gc3dhcCB0aGUgcGFyYW1zIGFycmF5IHdpdGggYSBmcmVzaCBvYmplY3QuXG4gIHRoaXMucGFyYW1zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgdmFyIGkgPSBwYXJhbXMubGVuZ3RoO1xuICB2YXIga2V5LCB2YWwsIG1hcHBlZEtleTtcbiAgd2hpbGUgKGktLSkge1xuICAgIGtleSA9IHBhcmFtc1tpXTtcbiAgICBtYXBwZWRLZXkgPSBjYW1lbGl6ZShrZXkpO1xuICAgIHZhbCA9IGdldEJpbmRBdHRyKHRoaXMuZWwsIGtleSk7XG4gICAgaWYgKHZhbCAhPSBudWxsKSB7XG4gICAgICAvLyBkeW5hbWljXG4gICAgICB0aGlzLl9zZXR1cFBhcmFtV2F0Y2hlcihtYXBwZWRLZXksIHZhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHN0YXRpY1xuICAgICAgdmFsID0gZ2V0QXR0cih0aGlzLmVsLCBrZXkpO1xuICAgICAgaWYgKHZhbCAhPSBudWxsKSB7XG4gICAgICAgIHRoaXMucGFyYW1zW21hcHBlZEtleV0gPSB2YWwgPT09ICcnID8gdHJ1ZSA6IHZhbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogU2V0dXAgYSB3YXRjaGVyIGZvciBhIGR5bmFtaWMgcGFyYW0uXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtTdHJpbmd9IGV4cHJlc3Npb25cbiAqL1xuXG5EaXJlY3RpdmUucHJvdG90eXBlLl9zZXR1cFBhcmFtV2F0Y2hlciA9IGZ1bmN0aW9uIChrZXksIGV4cHJlc3Npb24pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgY2FsbGVkID0gZmFsc2U7XG4gIHZhciB1bndhdGNoID0gKHRoaXMuX3Njb3BlIHx8IHRoaXMudm0pLiR3YXRjaChleHByZXNzaW9uLCBmdW5jdGlvbiAodmFsLCBvbGRWYWwpIHtcbiAgICBzZWxmLnBhcmFtc1trZXldID0gdmFsO1xuICAgIC8vIHNpbmNlIHdlIGFyZSBpbiBpbW1lZGlhdGUgbW9kZSxcbiAgICAvLyBvbmx5IGNhbGwgdGhlIHBhcmFtIGNoYW5nZSBjYWxsYmFja3MgaWYgdGhpcyBpcyBub3QgdGhlIGZpcnN0IHVwZGF0ZS5cbiAgICBpZiAoY2FsbGVkKSB7XG4gICAgICB2YXIgY2IgPSBzZWxmLnBhcmFtV2F0Y2hlcnMgJiYgc2VsZi5wYXJhbVdhdGNoZXJzW2tleV07XG4gICAgICBpZiAoY2IpIHtcbiAgICAgICAgY2IuY2FsbChzZWxmLCB2YWwsIG9sZFZhbCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxlZCA9IHRydWU7XG4gICAgfVxuICB9LCB7XG4gICAgaW1tZWRpYXRlOiB0cnVlLFxuICAgIHVzZXI6IGZhbHNlXG4gIH0pOyh0aGlzLl9wYXJhbVVud2F0Y2hGbnMgfHwgKHRoaXMuX3BhcmFtVW53YXRjaEZucyA9IFtdKSkucHVzaCh1bndhdGNoKTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIGRpcmVjdGl2ZSBpcyBhIGZ1bmN0aW9uIGNhbGxlclxuICogYW5kIGlmIHRoZSBleHByZXNzaW9uIGlzIGEgY2FsbGFibGUgb25lLiBJZiBib3RoIHRydWUsXG4gKiB3ZSB3cmFwIHVwIHRoZSBleHByZXNzaW9uIGFuZCB1c2UgaXQgYXMgdGhlIGV2ZW50XG4gKiBoYW5kbGVyLlxuICpcbiAqIGUuZy4gb24tY2xpY2s9XCJhKytcIlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cblxuRGlyZWN0aXZlLnByb3RvdHlwZS5fY2hlY2tTdGF0ZW1lbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBleHByZXNzaW9uID0gdGhpcy5leHByZXNzaW9uO1xuICBpZiAoZXhwcmVzc2lvbiAmJiB0aGlzLmFjY2VwdFN0YXRlbWVudCAmJiAhaXNTaW1wbGVQYXRoKGV4cHJlc3Npb24pKSB7XG4gICAgdmFyIGZuID0gcGFyc2VFeHByZXNzaW9uKGV4cHJlc3Npb24pLmdldDtcbiAgICB2YXIgc2NvcGUgPSB0aGlzLl9zY29wZSB8fCB0aGlzLnZtO1xuICAgIHZhciBoYW5kbGVyID0gZnVuY3Rpb24gaGFuZGxlcihlKSB7XG4gICAgICBzY29wZS4kZXZlbnQgPSBlO1xuICAgICAgZm4uY2FsbChzY29wZSwgc2NvcGUpO1xuICAgICAgc2NvcGUuJGV2ZW50ID0gbnVsbDtcbiAgICB9O1xuICAgIGlmICh0aGlzLmZpbHRlcnMpIHtcbiAgICAgIGhhbmRsZXIgPSBzY29wZS5fYXBwbHlGaWx0ZXJzKGhhbmRsZXIsIG51bGwsIHRoaXMuZmlsdGVycyk7XG4gICAgfVxuICAgIHRoaXMudXBkYXRlKGhhbmRsZXIpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZSB3aXRoIHRoZSBzZXR0ZXIuXG4gKiBUaGlzIHNob3VsZCBvbmx5IGJlIHVzZWQgaW4gdHdvLXdheSBkaXJlY3RpdmVzXG4gKiBlLmcuIHYtbW9kZWwuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZVxuICogQHB1YmxpY1xuICovXG5cbkRpcmVjdGl2ZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXG4gIGlmICh0aGlzLnR3b1dheSkge1xuICAgIHRoaXMuX3dpdGhMb2NrKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuX3dhdGNoZXIuc2V0KHZhbHVlKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgd2FybignRGlyZWN0aXZlLnNldCgpIGNhbiBvbmx5IGJlIHVzZWQgaW5zaWRlIHR3b1dheScgKyAnZGlyZWN0aXZlcy4nKTtcbiAgfVxufTtcblxuLyoqXG4gKiBFeGVjdXRlIGEgZnVuY3Rpb24gd2hpbGUgcHJldmVudGluZyB0aGF0IGZ1bmN0aW9uIGZyb21cbiAqIHRyaWdnZXJpbmcgdXBkYXRlcyBvbiB0aGlzIGRpcmVjdGl2ZSBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICovXG5cbkRpcmVjdGl2ZS5wcm90b3R5cGUuX3dpdGhMb2NrID0gZnVuY3Rpb24gKGZuKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5fbG9ja2VkID0gdHJ1ZTtcbiAgZm4uY2FsbChzZWxmKTtcbiAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX2xvY2tlZCA9IGZhbHNlO1xuICB9KTtcbn07XG5cbi8qKlxuICogQ29udmVuaWVuY2UgbWV0aG9kIHRoYXQgYXR0YWNoZXMgYSBET00gZXZlbnQgbGlzdGVuZXJcbiAqIHRvIHRoZSBkaXJlY3RpdmUgZWxlbWVudCBhbmQgYXV0b21ldGljYWxseSB0ZWFycyBpdCBkb3duXG4gKiBkdXJpbmcgdW5iaW5kLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gaGFuZGxlclxuICogQHBhcmFtIHtCb29sZWFufSBbdXNlQ2FwdHVyZV1cbiAqL1xuXG5EaXJlY3RpdmUucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKGV2ZW50LCBoYW5kbGVyLCB1c2VDYXB0dXJlKSB7XG4gIG9uKHRoaXMuZWwsIGV2ZW50LCBoYW5kbGVyLCB1c2VDYXB0dXJlKTsodGhpcy5fbGlzdGVuZXJzIHx8ICh0aGlzLl9saXN0ZW5lcnMgPSBbXSkpLnB1c2goW2V2ZW50LCBoYW5kbGVyXSk7XG59O1xuXG4vKipcbiAqIFRlYXJkb3duIHRoZSB3YXRjaGVyIGFuZCBjYWxsIHVuYmluZC5cbiAqL1xuXG5EaXJlY3RpdmUucHJvdG90eXBlLl90ZWFyZG93biA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX2JvdW5kKSB7XG4gICAgdGhpcy5fYm91bmQgPSBmYWxzZTtcbiAgICBpZiAodGhpcy51bmJpbmQpIHtcbiAgICAgIHRoaXMudW5iaW5kKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLl93YXRjaGVyKSB7XG4gICAgICB0aGlzLl93YXRjaGVyLnRlYXJkb3duKCk7XG4gICAgfVxuICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnM7XG4gICAgdmFyIGk7XG4gICAgaWYgKGxpc3RlbmVycykge1xuICAgICAgaSA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIG9mZih0aGlzLmVsLCBsaXN0ZW5lcnNbaV1bMF0sIGxpc3RlbmVyc1tpXVsxXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciB1bndhdGNoRm5zID0gdGhpcy5fcGFyYW1VbndhdGNoRm5zO1xuICAgIGlmICh1bndhdGNoRm5zKSB7XG4gICAgICBpID0gdW53YXRjaEZucy5sZW5ndGg7XG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIHVud2F0Y2hGbnNbaV0oKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgdGhpcy5lbCkge1xuICAgICAgdGhpcy5lbC5fdnVlX2RpcmVjdGl2ZXMuJHJlbW92ZSh0aGlzKTtcbiAgICB9XG4gICAgdGhpcy52bSA9IHRoaXMuZWwgPSB0aGlzLl93YXRjaGVyID0gdGhpcy5fbGlzdGVuZXJzID0gbnVsbDtcbiAgfVxufTtcblxuZnVuY3Rpb24gbGlmZWN5Y2xlTWl4aW4gKFZ1ZSkge1xuICAvKipcbiAgICogVXBkYXRlIHYtcmVmIGZvciBjb21wb25lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVtb3ZlXG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuX3VwZGF0ZVJlZiA9IGZ1bmN0aW9uIChyZW1vdmUpIHtcbiAgICB2YXIgcmVmID0gdGhpcy4kb3B0aW9ucy5fcmVmO1xuICAgIGlmIChyZWYpIHtcbiAgICAgIHZhciByZWZzID0gKHRoaXMuX3Njb3BlIHx8IHRoaXMuX2NvbnRleHQpLiRyZWZzO1xuICAgICAgaWYgKHJlbW92ZSkge1xuICAgICAgICBpZiAocmVmc1tyZWZdID09PSB0aGlzKSB7XG4gICAgICAgICAgcmVmc1tyZWZdID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVmc1tyZWZdID0gdGhpcztcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFRyYW5zY2x1ZGUsIGNvbXBpbGUgYW5kIGxpbmsgZWxlbWVudC5cbiAgICpcbiAgICogSWYgYSBwcmUtY29tcGlsZWQgbGlua2VyIGlzIGF2YWlsYWJsZSwgdGhhdCBtZWFucyB0aGVcbiAgICogcGFzc2VkIGluIGVsZW1lbnQgd2lsbCBiZSBwcmUtdHJhbnNjbHVkZWQgYW5kIGNvbXBpbGVkXG4gICAqIGFzIHdlbGwgLSBhbGwgd2UgbmVlZCB0byBkbyBpcyB0byBjYWxsIHRoZSBsaW5rZXIuXG4gICAqXG4gICAqIE90aGVyd2lzZSB3ZSBuZWVkIHRvIGNhbGwgdHJhbnNjbHVkZS9jb21waWxlL2xpbmsgaGVyZS5cbiAgICpcbiAgICogQHBhcmFtIHtFbGVtZW50fSBlbFxuICAgKi9cblxuICBWdWUucHJvdG90eXBlLl9jb21waWxlID0gZnVuY3Rpb24gKGVsKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB0aGlzLiRvcHRpb25zO1xuXG4gICAgLy8gdHJhbnNjbHVkZSBhbmQgaW5pdCBlbGVtZW50XG4gICAgLy8gdHJhbnNjbHVkZSBjYW4gcG90ZW50aWFsbHkgcmVwbGFjZSBvcmlnaW5hbFxuICAgIC8vIHNvIHdlIG5lZWQgdG8ga2VlcCByZWZlcmVuY2U7IHRoaXMgc3RlcCBhbHNvIGluamVjdHNcbiAgICAvLyB0aGUgdGVtcGxhdGUgYW5kIGNhY2hlcyB0aGUgb3JpZ2luYWwgYXR0cmlidXRlc1xuICAgIC8vIG9uIHRoZSBjb250YWluZXIgbm9kZSBhbmQgcmVwbGFjZXIgbm9kZS5cbiAgICB2YXIgb3JpZ2luYWwgPSBlbDtcbiAgICBlbCA9IHRyYW5zY2x1ZGUoZWwsIG9wdGlvbnMpO1xuICAgIHRoaXMuX2luaXRFbGVtZW50KGVsKTtcblxuICAgIC8vIGhhbmRsZSB2LXByZSBvbiByb290IG5vZGUgKCMyMDI2KVxuICAgIGlmIChlbC5ub2RlVHlwZSA9PT0gMSAmJiBnZXRBdHRyKGVsLCAndi1wcmUnKSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIHJvb3QgaXMgYWx3YXlzIGNvbXBpbGVkIHBlci1pbnN0YW5jZSwgYmVjYXVzZVxuICAgIC8vIGNvbnRhaW5lciBhdHRycyBhbmQgcHJvcHMgY2FuIGJlIGRpZmZlcmVudCBldmVyeSB0aW1lLlxuICAgIHZhciBjb250ZXh0T3B0aW9ucyA9IHRoaXMuX2NvbnRleHQgJiYgdGhpcy5fY29udGV4dC4kb3B0aW9ucztcbiAgICB2YXIgcm9vdExpbmtlciA9IGNvbXBpbGVSb290KGVsLCBvcHRpb25zLCBjb250ZXh0T3B0aW9ucyk7XG5cbiAgICAvLyByZXNvbHZlIHNsb3QgZGlzdHJpYnV0aW9uXG4gICAgcmVzb2x2ZVNsb3RzKHRoaXMsIG9wdGlvbnMuX2NvbnRlbnQpO1xuXG4gICAgLy8gY29tcGlsZSBhbmQgbGluayB0aGUgcmVzdFxuICAgIHZhciBjb250ZW50TGlua0ZuO1xuICAgIHZhciBjdG9yID0gdGhpcy5jb25zdHJ1Y3RvcjtcbiAgICAvLyBjb21wb25lbnQgY29tcGlsYXRpb24gY2FuIGJlIGNhY2hlZFxuICAgIC8vIGFzIGxvbmcgYXMgaXQncyBub3QgdXNpbmcgaW5saW5lLXRlbXBsYXRlXG4gICAgaWYgKG9wdGlvbnMuX2xpbmtlckNhY2hhYmxlKSB7XG4gICAgICBjb250ZW50TGlua0ZuID0gY3Rvci5saW5rZXI7XG4gICAgICBpZiAoIWNvbnRlbnRMaW5rRm4pIHtcbiAgICAgICAgY29udGVudExpbmtGbiA9IGN0b3IubGlua2VyID0gY29tcGlsZShlbCwgb3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gbGluayBwaGFzZVxuICAgIC8vIG1ha2Ugc3VyZSB0byBsaW5rIHJvb3Qgd2l0aCBwcm9wIHNjb3BlIVxuICAgIHZhciByb290VW5saW5rRm4gPSByb290TGlua2VyKHRoaXMsIGVsLCB0aGlzLl9zY29wZSk7XG4gICAgdmFyIGNvbnRlbnRVbmxpbmtGbiA9IGNvbnRlbnRMaW5rRm4gPyBjb250ZW50TGlua0ZuKHRoaXMsIGVsKSA6IGNvbXBpbGUoZWwsIG9wdGlvbnMpKHRoaXMsIGVsKTtcblxuICAgIC8vIHJlZ2lzdGVyIGNvbXBvc2l0ZSB1bmxpbmsgZnVuY3Rpb25cbiAgICAvLyB0byBiZSBjYWxsZWQgZHVyaW5nIGluc3RhbmNlIGRlc3RydWN0aW9uXG4gICAgdGhpcy5fdW5saW5rRm4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICByb290VW5saW5rRm4oKTtcbiAgICAgIC8vIHBhc3NpbmcgZGVzdHJveWluZzogdHJ1ZSB0byBhdm9pZCBzZWFyY2hpbmcgYW5kXG4gICAgICAvLyBzcGxpY2luZyB0aGUgZGlyZWN0aXZlc1xuICAgICAgY29udGVudFVubGlua0ZuKHRydWUpO1xuICAgIH07XG5cbiAgICAvLyBmaW5hbGx5IHJlcGxhY2Ugb3JpZ2luYWxcbiAgICBpZiAob3B0aW9ucy5yZXBsYWNlKSB7XG4gICAgICByZXBsYWNlKG9yaWdpbmFsLCBlbCk7XG4gICAgfVxuXG4gICAgdGhpcy5faXNDb21waWxlZCA9IHRydWU7XG4gICAgdGhpcy5fY2FsbEhvb2soJ2NvbXBpbGVkJyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemUgaW5zdGFuY2UgZWxlbWVudC4gQ2FsbGVkIGluIHRoZSBwdWJsaWNcbiAgICogJG1vdW50KCkgbWV0aG9kLlxuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuX2luaXRFbGVtZW50ID0gZnVuY3Rpb24gKGVsKSB7XG4gICAgaWYgKGlzRnJhZ21lbnQoZWwpKSB7XG4gICAgICB0aGlzLl9pc0ZyYWdtZW50ID0gdHJ1ZTtcbiAgICAgIHRoaXMuJGVsID0gdGhpcy5fZnJhZ21lbnRTdGFydCA9IGVsLmZpcnN0Q2hpbGQ7XG4gICAgICB0aGlzLl9mcmFnbWVudEVuZCA9IGVsLmxhc3RDaGlsZDtcbiAgICAgIC8vIHNldCBwZXJzaXN0ZWQgdGV4dCBhbmNob3JzIHRvIGVtcHR5XG4gICAgICBpZiAodGhpcy5fZnJhZ21lbnRTdGFydC5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICB0aGlzLl9mcmFnbWVudFN0YXJ0LmRhdGEgPSB0aGlzLl9mcmFnbWVudEVuZC5kYXRhID0gJyc7XG4gICAgICB9XG4gICAgICB0aGlzLl9mcmFnbWVudCA9IGVsO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRlbCA9IGVsO1xuICAgIH1cbiAgICB0aGlzLiRlbC5fX3Z1ZV9fID0gdGhpcztcbiAgICB0aGlzLl9jYWxsSG9vaygnYmVmb3JlQ29tcGlsZScpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW5kIGJpbmQgYSBkaXJlY3RpdmUgdG8gYW4gZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgLSBkaXJlY3RpdmUgbmFtZVxuICAgKiBAcGFyYW0ge05vZGV9IG5vZGUgICAtIHRhcmdldCBub2RlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkZXNjIC0gcGFyc2VkIGRpcmVjdGl2ZSBkZXNjcmlwdG9yXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkZWYgIC0gZGlyZWN0aXZlIGRlZmluaXRpb24gb2JqZWN0XG4gICAqIEBwYXJhbSB7VnVlfSBbaG9zdF0gLSB0cmFuc2NsdXNpb24gaG9zdCBjb21wb25lbnRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtzY29wZV0gLSB2LWZvciBzY29wZVxuICAgKiBAcGFyYW0ge0ZyYWdtZW50fSBbZnJhZ10gLSBvd25lciBmcmFnbWVudFxuICAgKi9cblxuICBWdWUucHJvdG90eXBlLl9iaW5kRGlyID0gZnVuY3Rpb24gKGRlc2NyaXB0b3IsIG5vZGUsIGhvc3QsIHNjb3BlLCBmcmFnKSB7XG4gICAgdGhpcy5fZGlyZWN0aXZlcy5wdXNoKG5ldyBEaXJlY3RpdmUoZGVzY3JpcHRvciwgdGhpcywgbm9kZSwgaG9zdCwgc2NvcGUsIGZyYWcpKTtcbiAgfTtcblxuICAvKipcbiAgICogVGVhcmRvd24gYW4gaW5zdGFuY2UsIHVub2JzZXJ2ZXMgdGhlIGRhdGEsIHVuYmluZCBhbGwgdGhlXG4gICAqIGRpcmVjdGl2ZXMsIHR1cm4gb2ZmIGFsbCB0aGUgZXZlbnQgbGlzdGVuZXJzLCBldGMuXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVtb3ZlIC0gd2hldGhlciB0byByZW1vdmUgdGhlIERPTSBub2RlLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGRlZmVyQ2xlYW51cCAtIGlmIHRydWUsIGRlZmVyIGNsZWFudXAgdG9cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZSBjYWxsZWQgbGF0ZXJcbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS5fZGVzdHJveSA9IGZ1bmN0aW9uIChyZW1vdmUsIGRlZmVyQ2xlYW51cCkge1xuICAgIGlmICh0aGlzLl9pc0JlaW5nRGVzdHJveWVkKSB7XG4gICAgICBpZiAoIWRlZmVyQ2xlYW51cCkge1xuICAgICAgICB0aGlzLl9jbGVhbnVwKCk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGRlc3Ryb3lSZWFkeTtcbiAgICB2YXIgcGVuZGluZ1JlbW92YWw7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gQ2xlYW51cCBzaG91bGQgYmUgY2FsbGVkIGVpdGhlciBzeW5jaHJvbm91c2x5IG9yIGFzeW5jaHJvbm95c2x5IGFzXG4gICAgLy8gY2FsbGJhY2sgb2YgdGhpcy4kcmVtb3ZlKCksIG9yIGlmIHJlbW92ZSBhbmQgZGVmZXJDbGVhbnVwIGFyZSBmYWxzZS5cbiAgICAvLyBJbiBhbnkgY2FzZSBpdCBzaG91bGQgYmUgY2FsbGVkIGFmdGVyIGFsbCBvdGhlciByZW1vdmluZywgdW5iaW5kaW5nIGFuZFxuICAgIC8vIHR1cm5pbmcgb2YgaXMgZG9uZVxuICAgIHZhciBjbGVhbnVwSWZQb3NzaWJsZSA9IGZ1bmN0aW9uIGNsZWFudXBJZlBvc3NpYmxlKCkge1xuICAgICAgaWYgKGRlc3Ryb3lSZWFkeSAmJiAhcGVuZGluZ1JlbW92YWwgJiYgIWRlZmVyQ2xlYW51cCkge1xuICAgICAgICBzZWxmLl9jbGVhbnVwKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIHJlbW92ZSBET00gZWxlbWVudFxuICAgIGlmIChyZW1vdmUgJiYgdGhpcy4kZWwpIHtcbiAgICAgIHBlbmRpbmdSZW1vdmFsID0gdHJ1ZTtcbiAgICAgIHRoaXMuJHJlbW92ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHBlbmRpbmdSZW1vdmFsID0gZmFsc2U7XG4gICAgICAgIGNsZWFudXBJZlBvc3NpYmxlKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLl9jYWxsSG9vaygnYmVmb3JlRGVzdHJveScpO1xuICAgIHRoaXMuX2lzQmVpbmdEZXN0cm95ZWQgPSB0cnVlO1xuICAgIHZhciBpO1xuICAgIC8vIHJlbW92ZSBzZWxmIGZyb20gcGFyZW50LiBvbmx5IG5lY2Vzc2FyeVxuICAgIC8vIGlmIHBhcmVudCBpcyBub3QgYmVpbmcgZGVzdHJveWVkIGFzIHdlbGwuXG4gICAgdmFyIHBhcmVudCA9IHRoaXMuJHBhcmVudDtcbiAgICBpZiAocGFyZW50ICYmICFwYXJlbnQuX2lzQmVpbmdEZXN0cm95ZWQpIHtcbiAgICAgIHBhcmVudC4kY2hpbGRyZW4uJHJlbW92ZSh0aGlzKTtcbiAgICAgIC8vIHVucmVnaXN0ZXIgcmVmIChyZW1vdmU6IHRydWUpXG4gICAgICB0aGlzLl91cGRhdGVSZWYodHJ1ZSk7XG4gICAgfVxuICAgIC8vIGRlc3Ryb3kgYWxsIGNoaWxkcmVuLlxuICAgIGkgPSB0aGlzLiRjaGlsZHJlbi5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgdGhpcy4kY2hpbGRyZW5baV0uJGRlc3Ryb3koKTtcbiAgICB9XG4gICAgLy8gdGVhcmRvd24gcHJvcHNcbiAgICBpZiAodGhpcy5fcHJvcHNVbmxpbmtGbikge1xuICAgICAgdGhpcy5fcHJvcHNVbmxpbmtGbigpO1xuICAgIH1cbiAgICAvLyB0ZWFyZG93biBhbGwgZGlyZWN0aXZlcy4gdGhpcyBhbHNvIHRlYXJzZG93biBhbGxcbiAgICAvLyBkaXJlY3RpdmUtb3duZWQgd2F0Y2hlcnMuXG4gICAgaWYgKHRoaXMuX3VubGlua0ZuKSB7XG4gICAgICB0aGlzLl91bmxpbmtGbigpO1xuICAgIH1cbiAgICBpID0gdGhpcy5fd2F0Y2hlcnMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIHRoaXMuX3dhdGNoZXJzW2ldLnRlYXJkb3duKCk7XG4gICAgfVxuICAgIC8vIHJlbW92ZSByZWZlcmVuY2UgdG8gc2VsZiBvbiAkZWxcbiAgICBpZiAodGhpcy4kZWwpIHtcbiAgICAgIHRoaXMuJGVsLl9fdnVlX18gPSBudWxsO1xuICAgIH1cblxuICAgIGRlc3Ryb3lSZWFkeSA9IHRydWU7XG4gICAgY2xlYW51cElmUG9zc2libGUoKTtcbiAgfTtcblxuICAvKipcbiAgICogQ2xlYW4gdXAgdG8gZW5zdXJlIGdhcmJhZ2UgY29sbGVjdGlvbi5cbiAgICogVGhpcyBpcyBjYWxsZWQgYWZ0ZXIgdGhlIGxlYXZlIHRyYW5zaXRpb24gaWYgdGhlcmVcbiAgICogaXMgYW55LlxuICAgKi9cblxuICBWdWUucHJvdG90eXBlLl9jbGVhbnVwID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9pc0Rlc3Ryb3llZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyByZW1vdmUgc2VsZiBmcm9tIG93bmVyIGZyYWdtZW50XG4gICAgLy8gZG8gaXQgaW4gY2xlYW51cCBzbyB0aGF0IHdlIGNhbiBjYWxsICRkZXN0cm95IHdpdGhcbiAgICAvLyBkZWZlciByaWdodCB3aGVuIGEgZnJhZ21lbnQgaXMgYWJvdXQgdG8gYmUgcmVtb3ZlZC5cbiAgICBpZiAodGhpcy5fZnJhZykge1xuICAgICAgdGhpcy5fZnJhZy5jaGlsZHJlbi4kcmVtb3ZlKHRoaXMpO1xuICAgIH1cbiAgICAvLyByZW1vdmUgcmVmZXJlbmNlIGZyb20gZGF0YSBvYlxuICAgIC8vIGZyb3plbiBvYmplY3QgbWF5IG5vdCBoYXZlIG9ic2VydmVyLlxuICAgIGlmICh0aGlzLl9kYXRhLl9fb2JfXykge1xuICAgICAgdGhpcy5fZGF0YS5fX29iX18ucmVtb3ZlVm0odGhpcyk7XG4gICAgfVxuICAgIC8vIENsZWFuIHVwIHJlZmVyZW5jZXMgdG8gcHJpdmF0ZSBwcm9wZXJ0aWVzIGFuZCBvdGhlclxuICAgIC8vIGluc3RhbmNlcy4gcHJlc2VydmUgcmVmZXJlbmNlIHRvIF9kYXRhIHNvIHRoYXQgcHJveHlcbiAgICAvLyBhY2Nlc3NvcnMgc3RpbGwgd29yay4gVGhlIG9ubHkgcG90ZW50aWFsIHNpZGUgZWZmZWN0XG4gICAgLy8gaGVyZSBpcyB0aGF0IG11dGF0aW5nIHRoZSBpbnN0YW5jZSBhZnRlciBpdCdzIGRlc3Ryb3llZFxuICAgIC8vIG1heSBhZmZlY3QgdGhlIHN0YXRlIG9mIG90aGVyIGNvbXBvbmVudHMgdGhhdCBhcmUgc3RpbGxcbiAgICAvLyBvYnNlcnZpbmcgdGhlIHNhbWUgb2JqZWN0LCBidXQgdGhhdCBzZWVtcyB0byBiZSBhXG4gICAgLy8gcmVhc29uYWJsZSByZXNwb25zaWJpbGl0eSBmb3IgdGhlIHVzZXIgcmF0aGVyIHRoYW5cbiAgICAvLyBhbHdheXMgdGhyb3dpbmcgYW4gZXJyb3Igb24gdGhlbS5cbiAgICB0aGlzLiRlbCA9IHRoaXMuJHBhcmVudCA9IHRoaXMuJHJvb3QgPSB0aGlzLiRjaGlsZHJlbiA9IHRoaXMuX3dhdGNoZXJzID0gdGhpcy5fY29udGV4dCA9IHRoaXMuX3Njb3BlID0gdGhpcy5fZGlyZWN0aXZlcyA9IG51bGw7XG4gICAgLy8gY2FsbCB0aGUgbGFzdCBob29rLi4uXG4gICAgdGhpcy5faXNEZXN0cm95ZWQgPSB0cnVlO1xuICAgIHRoaXMuX2NhbGxIb29rKCdkZXN0cm95ZWQnKTtcbiAgICAvLyB0dXJuIG9mZiBhbGwgaW5zdGFuY2UgbGlzdGVuZXJzLlxuICAgIHRoaXMuJG9mZigpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBtaXNjTWl4aW4gKFZ1ZSkge1xuICAvKipcbiAgICogQXBwbHkgYSBsaXN0IG9mIGZpbHRlciAoZGVzY3JpcHRvcnMpIHRvIGEgdmFsdWUuXG4gICAqIFVzaW5nIHBsYWluIGZvciBsb29wcyBoZXJlIGJlY2F1c2UgdGhpcyB3aWxsIGJlIGNhbGxlZCBpblxuICAgKiB0aGUgZ2V0dGVyIG9mIGFueSB3YXRjaGVyIHdpdGggZmlsdGVycyBzbyBpdCBpcyB2ZXJ5XG4gICAqIHBlcmZvcm1hbmNlIHNlbnNpdGl2ZS5cbiAgICpcbiAgICogQHBhcmFtIHsqfSB2YWx1ZVxuICAgKiBAcGFyYW0geyp9IFtvbGRWYWx1ZV1cbiAgICogQHBhcmFtIHtBcnJheX0gZmlsdGVyc1xuICAgKiBAcGFyYW0ge0Jvb2xlYW59IHdyaXRlXG4gICAqIEByZXR1cm4geyp9XG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuX2FwcGx5RmlsdGVycyA9IGZ1bmN0aW9uICh2YWx1ZSwgb2xkVmFsdWUsIGZpbHRlcnMsIHdyaXRlKSB7XG4gICAgdmFyIGZpbHRlciwgZm4sIGFyZ3MsIGFyZywgb2Zmc2V0LCBpLCBsLCBqLCBrO1xuICAgIGZvciAoaSA9IDAsIGwgPSBmaWx0ZXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgZmlsdGVyID0gZmlsdGVyc1tpXTtcbiAgICAgIGZuID0gcmVzb2x2ZUFzc2V0KHRoaXMuJG9wdGlvbnMsICdmaWx0ZXJzJywgZmlsdGVyLm5hbWUpO1xuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgICAgYXNzZXJ0QXNzZXQoZm4sICdmaWx0ZXInLCBmaWx0ZXIubmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAoIWZuKSBjb250aW51ZTtcbiAgICAgIGZuID0gd3JpdGUgPyBmbi53cml0ZSA6IGZuLnJlYWQgfHwgZm47XG4gICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSBjb250aW51ZTtcbiAgICAgIGFyZ3MgPSB3cml0ZSA/IFt2YWx1ZSwgb2xkVmFsdWVdIDogW3ZhbHVlXTtcbiAgICAgIG9mZnNldCA9IHdyaXRlID8gMiA6IDE7XG4gICAgICBpZiAoZmlsdGVyLmFyZ3MpIHtcbiAgICAgICAgZm9yIChqID0gMCwgayA9IGZpbHRlci5hcmdzLmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICAgIGFyZyA9IGZpbHRlci5hcmdzW2pdO1xuICAgICAgICAgIGFyZ3NbaiArIG9mZnNldF0gPSBhcmcuZHluYW1pYyA/IHRoaXMuJGdldChhcmcudmFsdWUpIDogYXJnLnZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YWx1ZSA9IGZuLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlc29sdmUgYSBjb21wb25lbnQsIGRlcGVuZGluZyBvbiB3aGV0aGVyIHRoZSBjb21wb25lbnRcbiAgICogaXMgZGVmaW5lZCBub3JtYWxseSBvciB1c2luZyBhbiBhc3luYyBmYWN0b3J5IGZ1bmN0aW9uLlxuICAgKiBSZXNvbHZlcyBzeW5jaHJvbm91c2x5IGlmIGFscmVhZHkgcmVzb2x2ZWQsIG90aGVyd2lzZVxuICAgKiByZXNvbHZlcyBhc3luY2hyb25vdXNseSBhbmQgY2FjaGVzIHRoZSByZXNvbHZlZFxuICAgKiBjb25zdHJ1Y3RvciBvbiB0aGUgZmFjdG9yeS5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuX3Jlc29sdmVDb21wb25lbnQgPSBmdW5jdGlvbiAoaWQsIGNiKSB7XG4gICAgdmFyIGZhY3RvcnkgPSByZXNvbHZlQXNzZXQodGhpcy4kb3B0aW9ucywgJ2NvbXBvbmVudHMnLCBpZCk7XG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgIGFzc2VydEFzc2V0KGZhY3RvcnksICdjb21wb25lbnQnLCBpZCk7XG4gICAgfVxuICAgIGlmICghZmFjdG9yeSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBhc3luYyBjb21wb25lbnQgZmFjdG9yeVxuICAgIGlmICghZmFjdG9yeS5vcHRpb25zKSB7XG4gICAgICBpZiAoZmFjdG9yeS5yZXNvbHZlZCkge1xuICAgICAgICAvLyBjYWNoZWRcbiAgICAgICAgY2IoZmFjdG9yeS5yZXNvbHZlZCk7XG4gICAgICB9IGVsc2UgaWYgKGZhY3RvcnkucmVxdWVzdGVkKSB7XG4gICAgICAgIC8vIHBvb2wgY2FsbGJhY2tzXG4gICAgICAgIGZhY3RvcnkucGVuZGluZ0NhbGxiYWNrcy5wdXNoKGNiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnkucmVxdWVzdGVkID0gdHJ1ZTtcbiAgICAgICAgdmFyIGNicyA9IGZhY3RvcnkucGVuZGluZ0NhbGxiYWNrcyA9IFtjYl07XG4gICAgICAgIGZhY3RvcnkuY2FsbCh0aGlzLCBmdW5jdGlvbiByZXNvbHZlKHJlcykge1xuICAgICAgICAgIGlmIChpc1BsYWluT2JqZWN0KHJlcykpIHtcbiAgICAgICAgICAgIHJlcyA9IFZ1ZS5leHRlbmQocmVzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY2FjaGUgcmVzb2x2ZWRcbiAgICAgICAgICBmYWN0b3J5LnJlc29sdmVkID0gcmVzO1xuICAgICAgICAgIC8vIGludm9rZSBjYWxsYmFja3NcbiAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNicy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGNic1tpXShyZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xuICAgICAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgd2FybignRmFpbGVkIHRvIHJlc29sdmUgYXN5bmMgY29tcG9uZW50OiAnICsgaWQgKyAnLiAnICsgKHJlYXNvbiA/ICdcXG5SZWFzb246ICcgKyByZWFzb24gOiAnJykpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbm9ybWFsIGNvbXBvbmVudFxuICAgICAgY2IoZmFjdG9yeSk7XG4gICAgfVxuICB9O1xufVxuXG52YXIgZmlsdGVyUkUkMSA9IC9bXnxdXFx8W158XS87XG5cbmZ1bmN0aW9uIGRhdGFBUEkgKFZ1ZSkge1xuICAvKipcbiAgICogR2V0IHRoZSB2YWx1ZSBmcm9tIGFuIGV4cHJlc3Npb24gb24gdGhpcyB2bS5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGV4cFxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFthc1N0YXRlbWVudF1cbiAgICogQHJldHVybiB7Kn1cbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kZ2V0ID0gZnVuY3Rpb24gKGV4cCwgYXNTdGF0ZW1lbnQpIHtcbiAgICB2YXIgcmVzID0gcGFyc2VFeHByZXNzaW9uKGV4cCk7XG4gICAgaWYgKHJlcykge1xuICAgICAgaWYgKGFzU3RhdGVtZW50ICYmICFpc1NpbXBsZVBhdGgoZXhwKSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBzdGF0ZW1lbnRIYW5kbGVyKCkge1xuICAgICAgICAgIHNlbGYuJGFyZ3VtZW50cyA9IHRvQXJyYXkoYXJndW1lbnRzKTtcbiAgICAgICAgICB2YXIgcmVzdWx0ID0gcmVzLmdldC5jYWxsKHNlbGYsIHNlbGYpO1xuICAgICAgICAgIHNlbGYuJGFyZ3VtZW50cyA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIHJlcy5nZXQuY2FsbCh0aGlzLCB0aGlzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgdmFsdWUgZnJvbSBhbiBleHByZXNzaW9uIG9uIHRoaXMgdm0uXG4gICAqIFRoZSBleHByZXNzaW9uIG11c3QgYmUgYSB2YWxpZCBsZWZ0LWhhbmRcbiAgICogZXhwcmVzc2lvbiBpbiBhbiBhc3NpZ25tZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZXhwXG4gICAqIEBwYXJhbSB7Kn0gdmFsXG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuJHNldCA9IGZ1bmN0aW9uIChleHAsIHZhbCkge1xuICAgIHZhciByZXMgPSBwYXJzZUV4cHJlc3Npb24oZXhwLCB0cnVlKTtcbiAgICBpZiAocmVzICYmIHJlcy5zZXQpIHtcbiAgICAgIHJlcy5zZXQuY2FsbCh0aGlzLCB0aGlzLCB2YWwpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGVsZXRlIGEgcHJvcGVydHkgb24gdGhlIFZNXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kZGVsZXRlID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGRlbCh0aGlzLl9kYXRhLCBrZXkpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBXYXRjaCBhbiBleHByZXNzaW9uLCB0cmlnZ2VyIGNhbGxiYWNrIHdoZW4gaXRzXG4gICAqIHZhbHVlIGNoYW5nZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfEZ1bmN0aW9ufSBleHBPckZuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogICAgICAgICAgICAgICAgIC0ge0Jvb2xlYW59IGRlZXBcbiAgICogICAgICAgICAgICAgICAgIC0ge0Jvb2xlYW59IGltbWVkaWF0ZVxuICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gLSB1bndhdGNoRm5cbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kd2F0Y2ggPSBmdW5jdGlvbiAoZXhwT3JGbiwgY2IsIG9wdGlvbnMpIHtcbiAgICB2YXIgdm0gPSB0aGlzO1xuICAgIHZhciBwYXJzZWQ7XG4gICAgaWYgKHR5cGVvZiBleHBPckZuID09PSAnc3RyaW5nJykge1xuICAgICAgcGFyc2VkID0gcGFyc2VEaXJlY3RpdmUoZXhwT3JGbik7XG4gICAgICBleHBPckZuID0gcGFyc2VkLmV4cHJlc3Npb247XG4gICAgfVxuICAgIHZhciB3YXRjaGVyID0gbmV3IFdhdGNoZXIodm0sIGV4cE9yRm4sIGNiLCB7XG4gICAgICBkZWVwOiBvcHRpb25zICYmIG9wdGlvbnMuZGVlcCxcbiAgICAgIHN5bmM6IG9wdGlvbnMgJiYgb3B0aW9ucy5zeW5jLFxuICAgICAgZmlsdGVyczogcGFyc2VkICYmIHBhcnNlZC5maWx0ZXJzLFxuICAgICAgdXNlcjogIW9wdGlvbnMgfHwgb3B0aW9ucy51c2VyICE9PSBmYWxzZVxuICAgIH0pO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuaW1tZWRpYXRlKSB7XG4gICAgICBjYi5jYWxsKHZtLCB3YXRjaGVyLnZhbHVlKTtcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmN0aW9uIHVud2F0Y2hGbigpIHtcbiAgICAgIHdhdGNoZXIudGVhcmRvd24oKTtcbiAgICB9O1xuICB9O1xuXG4gIC8qKlxuICAgKiBFdmFsdWF0ZSBhIHRleHQgZGlyZWN0aXZlLCBpbmNsdWRpbmcgZmlsdGVycy5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHRcbiAgICogQHBhcmFtIHtCb29sZWFufSBbYXNTdGF0ZW1lbnRdXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kZXZhbCA9IGZ1bmN0aW9uICh0ZXh0LCBhc1N0YXRlbWVudCkge1xuICAgIC8vIGNoZWNrIGZvciBmaWx0ZXJzLlxuICAgIGlmIChmaWx0ZXJSRSQxLnRlc3QodGV4dCkpIHtcbiAgICAgIHZhciBkaXIgPSBwYXJzZURpcmVjdGl2ZSh0ZXh0KTtcbiAgICAgIC8vIHRoZSBmaWx0ZXIgcmVnZXggY2hlY2sgbWlnaHQgZ2l2ZSBmYWxzZSBwb3NpdGl2ZVxuICAgICAgLy8gZm9yIHBpcGVzIGluc2lkZSBzdHJpbmdzLCBzbyBpdCdzIHBvc3NpYmxlIHRoYXRcbiAgICAgIC8vIHdlIGRvbid0IGdldCBhbnkgZmlsdGVycyBoZXJlXG4gICAgICB2YXIgdmFsID0gdGhpcy4kZ2V0KGRpci5leHByZXNzaW9uLCBhc1N0YXRlbWVudCk7XG4gICAgICByZXR1cm4gZGlyLmZpbHRlcnMgPyB0aGlzLl9hcHBseUZpbHRlcnModmFsLCBudWxsLCBkaXIuZmlsdGVycykgOiB2YWw7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vIGZpbHRlclxuICAgICAgcmV0dXJuIHRoaXMuJGdldCh0ZXh0LCBhc1N0YXRlbWVudCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBJbnRlcnBvbGF0ZSBhIHBpZWNlIG9mIHRlbXBsYXRlIHRleHQuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kaW50ZXJwb2xhdGUgPSBmdW5jdGlvbiAodGV4dCkge1xuICAgIHZhciB0b2tlbnMgPSBwYXJzZVRleHQodGV4dCk7XG4gICAgdmFyIHZtID0gdGhpcztcbiAgICBpZiAodG9rZW5zKSB7XG4gICAgICBpZiAodG9rZW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gdm0uJGV2YWwodG9rZW5zWzBdLnZhbHVlKSArICcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRva2Vucy5tYXAoZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgICAgICAgcmV0dXJuIHRva2VuLnRhZyA/IHZtLiRldmFsKHRva2VuLnZhbHVlKSA6IHRva2VuLnZhbHVlO1xuICAgICAgICB9KS5qb2luKCcnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRleHQ7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBMb2cgaW5zdGFuY2UgZGF0YSBhcyBhIHBsYWluIEpTIG9iamVjdFxuICAgKiBzbyB0aGF0IGl0IGlzIGVhc2llciB0byBpbnNwZWN0IGluIGNvbnNvbGUuXG4gICAqIFRoaXMgbWV0aG9kIGFzc3VtZXMgY29uc29sZSBpcyBhdmFpbGFibGUuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbcGF0aF1cbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kbG9nID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICB2YXIgZGF0YSA9IHBhdGggPyBnZXRQYXRoKHRoaXMuX2RhdGEsIHBhdGgpIDogdGhpcy5fZGF0YTtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgZGF0YSA9IGNsZWFuKGRhdGEpO1xuICAgIH1cbiAgICAvLyBpbmNsdWRlIGNvbXB1dGVkIGZpZWxkc1xuICAgIGlmICghcGF0aCkge1xuICAgICAgdmFyIGtleTtcbiAgICAgIGZvciAoa2V5IGluIHRoaXMuJG9wdGlvbnMuY29tcHV0ZWQpIHtcbiAgICAgICAgZGF0YVtrZXldID0gY2xlYW4odGhpc1trZXldKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9wcm9wcykge1xuICAgICAgICBmb3IgKGtleSBpbiB0aGlzLl9wcm9wcykge1xuICAgICAgICAgIGRhdGFba2V5XSA9IGNsZWFuKHRoaXNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc29sZS5sb2coZGF0YSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFwiY2xlYW5cIiBhIGdldHRlci9zZXR0ZXIgY29udmVydGVkIG9iamVjdCBpbnRvIGEgcGxhaW5cbiAgICogb2JqZWN0IGNvcHkuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAtIG9ialxuICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAqL1xuXG4gIGZ1bmN0aW9uIGNsZWFuKG9iaikge1xuICAgIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9iaikpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRvbUFQSSAoVnVlKSB7XG4gIC8qKlxuICAgKiBDb252ZW5pZW5jZSBvbi1pbnN0YW5jZSBuZXh0VGljay4gVGhlIGNhbGxiYWNrIGlzXG4gICAqIGF1dG8tYm91bmQgdG8gdGhlIGluc3RhbmNlLCBhbmQgdGhpcyBhdm9pZHMgY29tcG9uZW50XG4gICAqIG1vZHVsZXMgaGF2aW5nIHRvIHJlbHkgb24gdGhlIGdsb2JhbCBWdWUuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuJG5leHRUaWNrID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgbmV4dFRpY2soZm4sIHRoaXMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBcHBlbmQgaW5zdGFuY2UgdG8gdGFyZ2V0XG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gdGFyZ2V0XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl1cbiAgICogQHBhcmFtIHtCb29sZWFufSBbd2l0aFRyYW5zaXRpb25dIC0gZGVmYXVsdHMgdG8gdHJ1ZVxuICAgKi9cblxuICBWdWUucHJvdG90eXBlLiRhcHBlbmRUbyA9IGZ1bmN0aW9uICh0YXJnZXQsIGNiLCB3aXRoVHJhbnNpdGlvbikge1xuICAgIHJldHVybiBpbnNlcnQodGhpcywgdGFyZ2V0LCBjYiwgd2l0aFRyYW5zaXRpb24sIGFwcGVuZCwgYXBwZW5kV2l0aFRyYW5zaXRpb24pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBQcmVwZW5kIGluc3RhbmNlIHRvIHRhcmdldFxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3dpdGhUcmFuc2l0aW9uXSAtIGRlZmF1bHRzIHRvIHRydWVcbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kcHJlcGVuZFRvID0gZnVuY3Rpb24gKHRhcmdldCwgY2IsIHdpdGhUcmFuc2l0aW9uKSB7XG4gICAgdGFyZ2V0ID0gcXVlcnkodGFyZ2V0KTtcbiAgICBpZiAodGFyZ2V0Lmhhc0NoaWxkTm9kZXMoKSkge1xuICAgICAgdGhpcy4kYmVmb3JlKHRhcmdldC5maXJzdENoaWxkLCBjYiwgd2l0aFRyYW5zaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRhcHBlbmRUbyh0YXJnZXQsIGNiLCB3aXRoVHJhbnNpdGlvbik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBJbnNlcnQgaW5zdGFuY2UgYmVmb3JlIHRhcmdldFxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3dpdGhUcmFuc2l0aW9uXSAtIGRlZmF1bHRzIHRvIHRydWVcbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kYmVmb3JlID0gZnVuY3Rpb24gKHRhcmdldCwgY2IsIHdpdGhUcmFuc2l0aW9uKSB7XG4gICAgcmV0dXJuIGluc2VydCh0aGlzLCB0YXJnZXQsIGNiLCB3aXRoVHJhbnNpdGlvbiwgYmVmb3JlV2l0aENiLCBiZWZvcmVXaXRoVHJhbnNpdGlvbik7XG4gIH07XG5cbiAgLyoqXG4gICAqIEluc2VydCBpbnN0YW5jZSBhZnRlciB0YXJnZXRcbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFt3aXRoVHJhbnNpdGlvbl0gLSBkZWZhdWx0cyB0byB0cnVlXG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuJGFmdGVyID0gZnVuY3Rpb24gKHRhcmdldCwgY2IsIHdpdGhUcmFuc2l0aW9uKSB7XG4gICAgdGFyZ2V0ID0gcXVlcnkodGFyZ2V0KTtcbiAgICBpZiAodGFyZ2V0Lm5leHRTaWJsaW5nKSB7XG4gICAgICB0aGlzLiRiZWZvcmUodGFyZ2V0Lm5leHRTaWJsaW5nLCBjYiwgd2l0aFRyYW5zaXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRhcHBlbmRUbyh0YXJnZXQucGFyZW50Tm9kZSwgY2IsIHdpdGhUcmFuc2l0aW9uKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBpbnN0YW5jZSBmcm9tIERPTVxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3dpdGhUcmFuc2l0aW9uXSAtIGRlZmF1bHRzIHRvIHRydWVcbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kcmVtb3ZlID0gZnVuY3Rpb24gKGNiLCB3aXRoVHJhbnNpdGlvbikge1xuICAgIGlmICghdGhpcy4kZWwucGFyZW50Tm9kZSkge1xuICAgICAgcmV0dXJuIGNiICYmIGNiKCk7XG4gICAgfVxuICAgIHZhciBpbkRvY3VtZW50ID0gdGhpcy5faXNBdHRhY2hlZCAmJiBpbkRvYyh0aGlzLiRlbCk7XG4gICAgLy8gaWYgd2UgYXJlIG5vdCBpbiBkb2N1bWVudCwgbm8gbmVlZCB0byBjaGVja1xuICAgIC8vIGZvciB0cmFuc2l0aW9uc1xuICAgIGlmICghaW5Eb2N1bWVudCkgd2l0aFRyYW5zaXRpb24gPSBmYWxzZTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlYWxDYiA9IGZ1bmN0aW9uIHJlYWxDYigpIHtcbiAgICAgIGlmIChpbkRvY3VtZW50KSBzZWxmLl9jYWxsSG9vaygnZGV0YWNoZWQnKTtcbiAgICAgIGlmIChjYikgY2IoKTtcbiAgICB9O1xuICAgIGlmICh0aGlzLl9pc0ZyYWdtZW50KSB7XG4gICAgICByZW1vdmVOb2RlUmFuZ2UodGhpcy5fZnJhZ21lbnRTdGFydCwgdGhpcy5fZnJhZ21lbnRFbmQsIHRoaXMsIHRoaXMuX2ZyYWdtZW50LCByZWFsQ2IpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgb3AgPSB3aXRoVHJhbnNpdGlvbiA9PT0gZmFsc2UgPyByZW1vdmVXaXRoQ2IgOiByZW1vdmVXaXRoVHJhbnNpdGlvbjtcbiAgICAgIG9wKHRoaXMuJGVsLCB0aGlzLCByZWFsQ2IpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogU2hhcmVkIERPTSBpbnNlcnRpb24gZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7VnVlfSB2bVxuICAgKiBAcGFyYW0ge0VsZW1lbnR9IHRhcmdldFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2JdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3dpdGhUcmFuc2l0aW9uXVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcDEgLSBvcCBmb3Igbm9uLXRyYW5zaXRpb24gaW5zZXJ0XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9wMiAtIG9wIGZvciB0cmFuc2l0aW9uIGluc2VydFxuICAgKiBAcmV0dXJuIHZtXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGluc2VydCh2bSwgdGFyZ2V0LCBjYiwgd2l0aFRyYW5zaXRpb24sIG9wMSwgb3AyKSB7XG4gICAgdGFyZ2V0ID0gcXVlcnkodGFyZ2V0KTtcbiAgICB2YXIgdGFyZ2V0SXNEZXRhY2hlZCA9ICFpbkRvYyh0YXJnZXQpO1xuICAgIHZhciBvcCA9IHdpdGhUcmFuc2l0aW9uID09PSBmYWxzZSB8fCB0YXJnZXRJc0RldGFjaGVkID8gb3AxIDogb3AyO1xuICAgIHZhciBzaG91bGRDYWxsSG9vayA9ICF0YXJnZXRJc0RldGFjaGVkICYmICF2bS5faXNBdHRhY2hlZCAmJiAhaW5Eb2Modm0uJGVsKTtcbiAgICBpZiAodm0uX2lzRnJhZ21lbnQpIHtcbiAgICAgIG1hcE5vZGVSYW5nZSh2bS5fZnJhZ21lbnRTdGFydCwgdm0uX2ZyYWdtZW50RW5kLCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBvcChub2RlLCB0YXJnZXQsIHZtKTtcbiAgICAgIH0pO1xuICAgICAgY2IgJiYgY2IoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3Aodm0uJGVsLCB0YXJnZXQsIHZtLCBjYik7XG4gICAgfVxuICAgIGlmIChzaG91bGRDYWxsSG9vaykge1xuICAgICAgdm0uX2NhbGxIb29rKCdhdHRhY2hlZCcpO1xuICAgIH1cbiAgICByZXR1cm4gdm07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgZm9yIHNlbGVjdG9yc1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xFbGVtZW50fSBlbFxuICAgKi9cblxuICBmdW5jdGlvbiBxdWVyeShlbCkge1xuICAgIHJldHVybiB0eXBlb2YgZWwgPT09ICdzdHJpbmcnID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbCkgOiBlbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBlbmQgb3BlcmF0aW9uIHRoYXQgdGFrZXMgYSBjYWxsYmFjay5cbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSBlbFxuICAgKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICAgKiBAcGFyYW0ge1Z1ZX0gdm0gLSB1bnVzZWRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NiXVxuICAgKi9cblxuICBmdW5jdGlvbiBhcHBlbmQoZWwsIHRhcmdldCwgdm0sIGNiKSB7XG4gICAgdGFyZ2V0LmFwcGVuZENoaWxkKGVsKTtcbiAgICBpZiAoY2IpIGNiKCk7XG4gIH1cblxuICAvKipcbiAgICogSW5zZXJ0QmVmb3JlIG9wZXJhdGlvbiB0aGF0IHRha2VzIGEgY2FsbGJhY2suXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAgICogQHBhcmFtIHtWdWV9IHZtIC0gdW51c2VkXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl1cbiAgICovXG5cbiAgZnVuY3Rpb24gYmVmb3JlV2l0aENiKGVsLCB0YXJnZXQsIHZtLCBjYikge1xuICAgIGJlZm9yZShlbCwgdGFyZ2V0KTtcbiAgICBpZiAoY2IpIGNiKCk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIG9wZXJhdGlvbiB0aGF0IHRha2VzIGEgY2FsbGJhY2suXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gZWxcbiAgICogQHBhcmFtIHtWdWV9IHZtIC0gdW51c2VkXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYl1cbiAgICovXG5cbiAgZnVuY3Rpb24gcmVtb3ZlV2l0aENiKGVsLCB2bSwgY2IpIHtcbiAgICByZW1vdmUoZWwpO1xuICAgIGlmIChjYikgY2IoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBldmVudHNBUEkgKFZ1ZSkge1xuICAvKipcbiAgICogTGlzdGVuIG9uIHRoZSBnaXZlbiBgZXZlbnRgIHdpdGggYGZuYC5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuJG9uID0gZnVuY3Rpb24gKGV2ZW50LCBmbikge1xuICAgICh0aGlzLl9ldmVudHNbZXZlbnRdIHx8ICh0aGlzLl9ldmVudHNbZXZlbnRdID0gW10pKS5wdXNoKGZuKTtcbiAgICBtb2RpZnlMaXN0ZW5lckNvdW50KHRoaXMsIGV2ZW50LCAxKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQWRkcyBhbiBgZXZlbnRgIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBpbnZva2VkIGEgc2luZ2xlXG4gICAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgKi9cblxuICBWdWUucHJvdG90eXBlLiRvbmNlID0gZnVuY3Rpb24gKGV2ZW50LCBmbikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBmdW5jdGlvbiBvbigpIHtcbiAgICAgIHNlbGYuJG9mZihldmVudCwgb24pO1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgb24uZm4gPSBmbjtcbiAgICB0aGlzLiRvbihldmVudCwgb24pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIGdpdmVuIGNhbGxiYWNrIGZvciBgZXZlbnRgIG9yIGFsbFxuICAgKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuJG9mZiA9IGZ1bmN0aW9uIChldmVudCwgZm4pIHtcbiAgICB2YXIgY2JzO1xuICAgIC8vIGFsbFxuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgaWYgKHRoaXMuJHBhcmVudCkge1xuICAgICAgICBmb3IgKGV2ZW50IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgICAgIGNicyA9IHRoaXMuX2V2ZW50c1tldmVudF07XG4gICAgICAgICAgaWYgKGNicykge1xuICAgICAgICAgICAgbW9kaWZ5TGlzdGVuZXJDb3VudCh0aGlzLCBldmVudCwgLWNicy5sZW5ndGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgLy8gc3BlY2lmaWMgZXZlbnRcbiAgICBjYnMgPSB0aGlzLl9ldmVudHNbZXZlbnRdO1xuICAgIGlmICghY2JzKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgIG1vZGlmeUxpc3RlbmVyQ291bnQodGhpcywgZXZlbnQsIC1jYnMubGVuZ3RoKTtcbiAgICAgIHRoaXMuX2V2ZW50c1tldmVudF0gPSBudWxsO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIC8vIHNwZWNpZmljIGhhbmRsZXJcbiAgICB2YXIgY2I7XG4gICAgdmFyIGkgPSBjYnMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGNiID0gY2JzW2ldO1xuICAgICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgICAgbW9kaWZ5TGlzdGVuZXJDb3VudCh0aGlzLCBldmVudCwgLTEpO1xuICAgICAgICBjYnMuc3BsaWNlKGksIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIFRyaWdnZXIgYW4gZXZlbnQgb24gc2VsZi5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBldmVudFxuICAgKiBAcmV0dXJuIHtCb29sZWFufSBzaG91bGRQcm9wYWdhdGVcbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kZW1pdCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHZhciBpc1NvdXJjZSA9IHR5cGVvZiBldmVudCA9PT0gJ3N0cmluZyc7XG4gICAgZXZlbnQgPSBpc1NvdXJjZSA/IGV2ZW50IDogZXZlbnQubmFtZTtcbiAgICB2YXIgY2JzID0gdGhpcy5fZXZlbnRzW2V2ZW50XTtcbiAgICB2YXIgc2hvdWxkUHJvcGFnYXRlID0gaXNTb3VyY2UgfHwgIWNicztcbiAgICBpZiAoY2JzKSB7XG4gICAgICBjYnMgPSBjYnMubGVuZ3RoID4gMSA/IHRvQXJyYXkoY2JzKSA6IGNicztcbiAgICAgIC8vIHRoaXMgaXMgYSBzb21ld2hhdCBoYWNreSBzb2x1dGlvbiB0byB0aGUgcXVlc3Rpb24gcmFpc2VkXG4gICAgICAvLyBpbiAjMjEwMjogZm9yIGFuIGlubGluZSBjb21wb25lbnQgbGlzdGVuZXIgbGlrZSA8Y29tcCBAdGVzdD1cImRvVGhpc1wiPixcbiAgICAgIC8vIHRoZSBwcm9wYWdhdGlvbiBoYW5kbGluZyBpcyBzb21ld2hhdCBicm9rZW4uIFRoZXJlZm9yZSB3ZVxuICAgICAgLy8gbmVlZCB0byB0cmVhdCB0aGVzZSBpbmxpbmUgY2FsbGJhY2tzIGRpZmZlcmVudGx5LlxuICAgICAgdmFyIGhhc1BhcmVudENicyA9IGlzU291cmNlICYmIGNicy5zb21lKGZ1bmN0aW9uIChjYikge1xuICAgICAgICByZXR1cm4gY2IuX2Zyb21QYXJlbnQ7XG4gICAgICB9KTtcbiAgICAgIGlmIChoYXNQYXJlbnRDYnMpIHtcbiAgICAgICAgc2hvdWxkUHJvcGFnYXRlID0gZmFsc2U7XG4gICAgICB9XG4gICAgICB2YXIgYXJncyA9IHRvQXJyYXkoYXJndW1lbnRzLCAxKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gY2JzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgY2IgPSBjYnNbaV07XG4gICAgICAgIHZhciByZXMgPSBjYi5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgaWYgKHJlcyA9PT0gdHJ1ZSAmJiAoIWhhc1BhcmVudENicyB8fCBjYi5fZnJvbVBhcmVudCkpIHtcbiAgICAgICAgICBzaG91bGRQcm9wYWdhdGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzaG91bGRQcm9wYWdhdGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlY3Vyc2l2ZWx5IGJyb2FkY2FzdCBhbiBldmVudCB0byBhbGwgY2hpbGRyZW4gaW5zdGFuY2VzLlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGV2ZW50XG4gICAqIEBwYXJhbSB7Li4uKn0gYWRkaXRpb25hbCBhcmd1bWVudHNcbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kYnJvYWRjYXN0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIGlzU291cmNlID0gdHlwZW9mIGV2ZW50ID09PSAnc3RyaW5nJztcbiAgICBldmVudCA9IGlzU291cmNlID8gZXZlbnQgOiBldmVudC5uYW1lO1xuICAgIC8vIGlmIG5vIGNoaWxkIGhhcyByZWdpc3RlcmVkIGZvciB0aGlzIGV2ZW50LFxuICAgIC8vIHRoZW4gdGhlcmUncyBubyBuZWVkIHRvIGJyb2FkY2FzdC5cbiAgICBpZiAoIXRoaXMuX2V2ZW50c0NvdW50W2V2ZW50XSkgcmV0dXJuO1xuICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuJGNoaWxkcmVuO1xuICAgIHZhciBhcmdzID0gdG9BcnJheShhcmd1bWVudHMpO1xuICAgIGlmIChpc1NvdXJjZSkge1xuICAgICAgLy8gdXNlIG9iamVjdCBldmVudCB0byBpbmRpY2F0ZSBub24tc291cmNlIGVtaXRcbiAgICAgIC8vIG9uIGNoaWxkcmVuXG4gICAgICBhcmdzWzBdID0geyBuYW1lOiBldmVudCwgc291cmNlOiB0aGlzIH07XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXTtcbiAgICAgIHZhciBzaG91bGRQcm9wYWdhdGUgPSBjaGlsZC4kZW1pdC5hcHBseShjaGlsZCwgYXJncyk7XG4gICAgICBpZiAoc2hvdWxkUHJvcGFnYXRlKSB7XG4gICAgICAgIGNoaWxkLiRicm9hZGNhc3QuYXBwbHkoY2hpbGQsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogUmVjdXJzaXZlbHkgcHJvcGFnYXRlIGFuIGV2ZW50IHVwIHRoZSBwYXJlbnQgY2hhaW4uXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICAgKiBAcGFyYW0gey4uLip9IGFkZGl0aW9uYWwgYXJndW1lbnRzXG4gICAqL1xuXG4gIFZ1ZS5wcm90b3R5cGUuJGRpc3BhdGNoID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgdmFyIHNob3VsZFByb3BhZ2F0ZSA9IHRoaXMuJGVtaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAoIXNob3VsZFByb3BhZ2F0ZSkgcmV0dXJuO1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLiRwYXJlbnQ7XG4gICAgdmFyIGFyZ3MgPSB0b0FycmF5KGFyZ3VtZW50cyk7XG4gICAgLy8gdXNlIG9iamVjdCBldmVudCB0byBpbmRpY2F0ZSBub24tc291cmNlIGVtaXRcbiAgICAvLyBvbiBwYXJlbnRzXG4gICAgYXJnc1swXSA9IHsgbmFtZTogZXZlbnQsIHNvdXJjZTogdGhpcyB9O1xuICAgIHdoaWxlIChwYXJlbnQpIHtcbiAgICAgIHNob3VsZFByb3BhZ2F0ZSA9IHBhcmVudC4kZW1pdC5hcHBseShwYXJlbnQsIGFyZ3MpO1xuICAgICAgcGFyZW50ID0gc2hvdWxkUHJvcGFnYXRlID8gcGFyZW50LiRwYXJlbnQgOiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogTW9kaWZ5IHRoZSBsaXN0ZW5lciBjb3VudHMgb24gYWxsIHBhcmVudHMuXG4gICAqIFRoaXMgYm9va2tlZXBpbmcgYWxsb3dzICRicm9hZGNhc3QgdG8gcmV0dXJuIGVhcmx5IHdoZW5cbiAgICogbm8gY2hpbGQgaGFzIGxpc3RlbmVkIHRvIGEgY2VydGFpbiBldmVudC5cbiAgICpcbiAgICogQHBhcmFtIHtWdWV9IHZtXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICAgKiBAcGFyYW0ge051bWJlcn0gY291bnRcbiAgICovXG5cbiAgdmFyIGhvb2tSRSA9IC9eaG9vazovO1xuICBmdW5jdGlvbiBtb2RpZnlMaXN0ZW5lckNvdW50KHZtLCBldmVudCwgY291bnQpIHtcbiAgICB2YXIgcGFyZW50ID0gdm0uJHBhcmVudDtcbiAgICAvLyBob29rcyBkbyBub3QgZ2V0IGJyb2FkY2FzdGVkIHNvIG5vIG5lZWRcbiAgICAvLyB0byBkbyBib29ra2VlcGluZyBmb3IgdGhlbVxuICAgIGlmICghcGFyZW50IHx8ICFjb3VudCB8fCBob29rUkUudGVzdChldmVudCkpIHJldHVybjtcbiAgICB3aGlsZSAocGFyZW50KSB7XG4gICAgICBwYXJlbnQuX2V2ZW50c0NvdW50W2V2ZW50XSA9IChwYXJlbnQuX2V2ZW50c0NvdW50W2V2ZW50XSB8fCAwKSArIGNvdW50O1xuICAgICAgcGFyZW50ID0gcGFyZW50LiRwYXJlbnQ7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGxpZmVjeWNsZUFQSSAoVnVlKSB7XG4gIC8qKlxuICAgKiBTZXQgaW5zdGFuY2UgdGFyZ2V0IGVsZW1lbnQgYW5kIGtpY2sgb2ZmIHRoZSBjb21waWxhdGlvblxuICAgKiBwcm9jZXNzLiBUaGUgcGFzc2VkIGluIGBlbGAgY2FuIGJlIGEgc2VsZWN0b3Igc3RyaW5nLCBhblxuICAgKiBleGlzdGluZyBFbGVtZW50LCBvciBhIERvY3VtZW50RnJhZ21lbnQgKGZvciBibG9ja1xuICAgKiBpbnN0YW5jZXMpLlxuICAgKlxuICAgKiBAcGFyYW0ge0VsZW1lbnR8RG9jdW1lbnRGcmFnbWVudHxzdHJpbmd9IGVsXG4gICAqIEBwdWJsaWNcbiAgICovXG5cbiAgVnVlLnByb3RvdHlwZS4kbW91bnQgPSBmdW5jdGlvbiAoZWwpIHtcbiAgICBpZiAodGhpcy5faXNDb21waWxlZCkge1xuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyAmJiB3YXJuKCckbW91bnQoKSBzaG91bGQgYmUgY2FsbGVkIG9ubHkgb25jZS4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZWwgPSBxdWVyeShlbCk7XG4gICAgaWYgKCFlbCkge1xuICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB9XG4gICAgdGhpcy5fY29tcGlsZShlbCk7XG4gICAgdGhpcy5faW5pdERPTUhvb2tzKCk7XG4gICAgaWYgKGluRG9jKHRoaXMuJGVsKSkge1xuICAgICAgdGhpcy5fY2FsbEhvb2soJ2F0dGFjaGVkJyk7XG4gICAgICByZWFkeS5jYWxsKHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiRvbmNlKCdob29rOmF0dGFjaGVkJywgcmVhZHkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogTWFyayBhbiBpbnN0YW5jZSBhcyByZWFkeS5cbiAgICovXG5cbiAgZnVuY3Rpb24gcmVhZHkoKSB7XG4gICAgdGhpcy5faXNBdHRhY2hlZCA9IHRydWU7XG4gICAgdGhpcy5faXNSZWFkeSA9IHRydWU7XG4gICAgdGhpcy5fY2FsbEhvb2soJ3JlYWR5Jyk7XG4gIH1cblxuICAvKipcbiAgICogVGVhcmRvd24gdGhlIGluc3RhbmNlLCBzaW1wbHkgZGVsZWdhdGUgdG8gdGhlIGludGVybmFsXG4gICAqIF9kZXN0cm95LlxuICAgKi9cblxuICBWdWUucHJvdG90eXBlLiRkZXN0cm95ID0gZnVuY3Rpb24gKHJlbW92ZSwgZGVmZXJDbGVhbnVwKSB7XG4gICAgdGhpcy5fZGVzdHJveShyZW1vdmUsIGRlZmVyQ2xlYW51cCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFBhcnRpYWxseSBjb21waWxlIGEgcGllY2Ugb2YgRE9NIGFuZCByZXR1cm4gYVxuICAgKiBkZWNvbXBpbGUgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7RWxlbWVudHxEb2N1bWVudEZyYWdtZW50fSBlbFxuICAgKiBAcGFyYW0ge1Z1ZX0gW2hvc3RdXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cblxuICBWdWUucHJvdG90eXBlLiRjb21waWxlID0gZnVuY3Rpb24gKGVsLCBob3N0LCBzY29wZSwgZnJhZykge1xuICAgIHJldHVybiBjb21waWxlKGVsLCB0aGlzLiRvcHRpb25zLCB0cnVlKSh0aGlzLCBlbCwgaG9zdCwgc2NvcGUsIGZyYWcpO1xuICB9O1xufVxuXG4vKipcbiAqIFRoZSBleHBvc2VkIFZ1ZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBBUEkgY29udmVudGlvbnM6XG4gKiAtIHB1YmxpYyBBUEkgbWV0aG9kcy9wcm9wZXJ0aWVzIGFyZSBwcmVmaXhlZCB3aXRoIGAkYFxuICogLSBpbnRlcm5hbCBtZXRob2RzL3Byb3BlcnRpZXMgYXJlIHByZWZpeGVkIHdpdGggYF9gXG4gKiAtIG5vbi1wcmVmaXhlZCBwcm9wZXJ0aWVzIGFyZSBhc3N1bWVkIHRvIGJlIHByb3hpZWQgdXNlclxuICogICBkYXRhLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFZ1ZShvcHRpb25zKSB7XG4gIHRoaXMuX2luaXQob3B0aW9ucyk7XG59XG5cbi8vIGluc3RhbGwgaW50ZXJuYWxzXG5pbml0TWl4aW4oVnVlKTtcbnN0YXRlTWl4aW4oVnVlKTtcbmV2ZW50c01peGluKFZ1ZSk7XG5saWZlY3ljbGVNaXhpbihWdWUpO1xubWlzY01peGluKFZ1ZSk7XG5cbi8vIGluc3RhbGwgaW5zdGFuY2UgQVBJc1xuZGF0YUFQSShWdWUpO1xuZG9tQVBJKFZ1ZSk7XG5ldmVudHNBUEkoVnVlKTtcbmxpZmVjeWNsZUFQSShWdWUpO1xuXG52YXIgc2xvdCA9IHtcblxuICBwcmlvcml0eTogU0xPVCxcbiAgcGFyYW1zOiBbJ25hbWUnXSxcblxuICBiaW5kOiBmdW5jdGlvbiBiaW5kKCkge1xuICAgIC8vIHRoaXMgd2FzIHJlc29sdmVkIGR1cmluZyBjb21wb25lbnQgdHJhbnNjbHVzaW9uXG4gICAgdmFyIG5hbWUgPSB0aGlzLnBhcmFtcy5uYW1lIHx8ICdkZWZhdWx0JztcbiAgICB2YXIgY29udGVudCA9IHRoaXMudm0uX3Nsb3RDb250ZW50cyAmJiB0aGlzLnZtLl9zbG90Q29udGVudHNbbmFtZV07XG4gICAgaWYgKCFjb250ZW50IHx8ICFjb250ZW50Lmhhc0NoaWxkTm9kZXMoKSkge1xuICAgICAgdGhpcy5mYWxsYmFjaygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbXBpbGUoY29udGVudC5jbG9uZU5vZGUodHJ1ZSksIHRoaXMudm0uX2NvbnRleHQsIHRoaXMudm0pO1xuICAgIH1cbiAgfSxcblxuICBjb21waWxlOiBmdW5jdGlvbiBjb21waWxlKGNvbnRlbnQsIGNvbnRleHQsIGhvc3QpIHtcbiAgICBpZiAoY29udGVudCAmJiBjb250ZXh0KSB7XG4gICAgICBpZiAodGhpcy5lbC5oYXNDaGlsZE5vZGVzKCkgJiYgY29udGVudC5jaGlsZE5vZGVzLmxlbmd0aCA9PT0gMSAmJiBjb250ZW50LmNoaWxkTm9kZXNbMF0ubm9kZVR5cGUgPT09IDEgJiYgY29udGVudC5jaGlsZE5vZGVzWzBdLmhhc0F0dHJpYnV0ZSgndi1pZicpKSB7XG4gICAgICAgIC8vIGlmIHRoZSBpbnNlcnRlZCBzbG90IGhhcyB2LWlmXG4gICAgICAgIC8vIGluamVjdCBmYWxsYmFjayBjb250ZW50IGFzIHRoZSB2LWVsc2VcbiAgICAgICAgdmFyIGVsc2VCbG9jayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgIGVsc2VCbG9jay5zZXRBdHRyaWJ1dGUoJ3YtZWxzZScsICcnKTtcbiAgICAgICAgZWxzZUJsb2NrLmlubmVySFRNTCA9IHRoaXMuZWwuaW5uZXJIVE1MO1xuICAgICAgICAvLyB0aGUgZWxzZSBibG9jayBzaG91bGQgYmUgY29tcGlsZWQgaW4gY2hpbGQgc2NvcGVcbiAgICAgICAgZWxzZUJsb2NrLl9jb250ZXh0ID0gdGhpcy52bTtcbiAgICAgICAgY29udGVudC5hcHBlbmRDaGlsZChlbHNlQmxvY2spO1xuICAgICAgfVxuICAgICAgdmFyIHNjb3BlID0gaG9zdCA/IGhvc3QuX3Njb3BlIDogdGhpcy5fc2NvcGU7XG4gICAgICB0aGlzLnVubGluayA9IGNvbnRleHQuJGNvbXBpbGUoY29udGVudCwgaG9zdCwgc2NvcGUsIHRoaXMuX2ZyYWcpO1xuICAgIH1cbiAgICBpZiAoY29udGVudCkge1xuICAgICAgcmVwbGFjZSh0aGlzLmVsLCBjb250ZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVtb3ZlKHRoaXMuZWwpO1xuICAgIH1cbiAgfSxcblxuICBmYWxsYmFjazogZnVuY3Rpb24gZmFsbGJhY2soKSB7XG4gICAgdGhpcy5jb21waWxlKGV4dHJhY3RDb250ZW50KHRoaXMuZWwsIHRydWUpLCB0aGlzLnZtKTtcbiAgfSxcblxuICB1bmJpbmQ6IGZ1bmN0aW9uIHVuYmluZCgpIHtcbiAgICBpZiAodGhpcy51bmxpbmspIHtcbiAgICAgIHRoaXMudW5saW5rKCk7XG4gICAgfVxuICB9XG59O1xuXG52YXIgcGFydGlhbCA9IHtcblxuICBwcmlvcml0eTogUEFSVElBTCxcblxuICBwYXJhbXM6IFsnbmFtZSddLFxuXG4gIC8vIHdhdGNoIGNoYW5nZXMgdG8gbmFtZSBmb3IgZHluYW1pYyBwYXJ0aWFsc1xuICBwYXJhbVdhdGNoZXJzOiB7XG4gICAgbmFtZTogZnVuY3Rpb24gbmFtZSh2YWx1ZSkge1xuICAgICAgdklmLnJlbW92ZS5jYWxsKHRoaXMpO1xuICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuaW5zZXJ0KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgYmluZDogZnVuY3Rpb24gYmluZCgpIHtcbiAgICB0aGlzLmFuY2hvciA9IGNyZWF0ZUFuY2hvcigndi1wYXJ0aWFsJyk7XG4gICAgcmVwbGFjZSh0aGlzLmVsLCB0aGlzLmFuY2hvcik7XG4gICAgdGhpcy5pbnNlcnQodGhpcy5wYXJhbXMubmFtZSk7XG4gIH0sXG5cbiAgaW5zZXJ0OiBmdW5jdGlvbiBpbnNlcnQoaWQpIHtcbiAgICB2YXIgcGFydGlhbCA9IHJlc29sdmVBc3NldCh0aGlzLnZtLiRvcHRpb25zLCAncGFydGlhbHMnLCBpZCk7XG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgIGFzc2VydEFzc2V0KHBhcnRpYWwsICdwYXJ0aWFsJywgaWQpO1xuICAgIH1cbiAgICBpZiAocGFydGlhbCkge1xuICAgICAgdGhpcy5mYWN0b3J5ID0gbmV3IEZyYWdtZW50RmFjdG9yeSh0aGlzLnZtLCBwYXJ0aWFsKTtcbiAgICAgIHZJZi5pbnNlcnQuY2FsbCh0aGlzKTtcbiAgICB9XG4gIH0sXG5cbiAgdW5iaW5kOiBmdW5jdGlvbiB1bmJpbmQoKSB7XG4gICAgaWYgKHRoaXMuZnJhZykge1xuICAgICAgdGhpcy5mcmFnLmRlc3Ryb3koKTtcbiAgICB9XG4gIH1cbn07XG5cbnZhciBlbGVtZW50RGlyZWN0aXZlcyA9IHtcbiAgc2xvdDogc2xvdCxcbiAgcGFydGlhbDogcGFydGlhbFxufTtcblxudmFyIGNvbnZlcnRBcnJheSA9IHZGb3IuX3Bvc3RQcm9jZXNzO1xuXG4vKipcbiAqIExpbWl0IGZpbHRlciBmb3IgYXJyYXlzXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG5cbiAqIEBwYXJhbSB7TnVtYmVyfSBvZmZzZXQgKERlY2ltYWwgZXhwZWN0ZWQpXG4gKi9cblxuZnVuY3Rpb24gbGltaXRCeShhcnIsIG4sIG9mZnNldCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPyBwYXJzZUludChvZmZzZXQsIDEwKSA6IDA7XG4gIG4gPSB0b051bWJlcihuKTtcbiAgcmV0dXJuIHR5cGVvZiBuID09PSAnbnVtYmVyJyA/IGFyci5zbGljZShvZmZzZXQsIG9mZnNldCArIG4pIDogYXJyO1xufVxuXG4vKipcbiAqIEZpbHRlciBmaWx0ZXIgZm9yIGFycmF5c1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWFyY2hcbiAqIEBwYXJhbSB7U3RyaW5nfSBbZGVsaW1pdGVyXVxuICogQHBhcmFtIHtTdHJpbmd9IC4uLmRhdGFLZXlzXG4gKi9cblxuZnVuY3Rpb24gZmlsdGVyQnkoYXJyLCBzZWFyY2gsIGRlbGltaXRlcikge1xuICBhcnIgPSBjb252ZXJ0QXJyYXkoYXJyKTtcbiAgaWYgKHNlYXJjaCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIGFycjtcbiAgfVxuICBpZiAodHlwZW9mIHNlYXJjaCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBhcnIuZmlsdGVyKHNlYXJjaCk7XG4gIH1cbiAgLy8gY2FzdCB0byBsb3dlcmNhc2Ugc3RyaW5nXG4gIHNlYXJjaCA9ICgnJyArIHNlYXJjaCkudG9Mb3dlckNhc2UoKTtcbiAgLy8gYWxsb3cgb3B0aW9uYWwgYGluYCBkZWxpbWl0ZXJcbiAgLy8gYmVjYXVzZSB3aHkgbm90XG4gIHZhciBuID0gZGVsaW1pdGVyID09PSAnaW4nID8gMyA6IDI7XG4gIC8vIGV4dHJhY3QgYW5kIGZsYXR0ZW4ga2V5c1xuICB2YXIga2V5cyA9IHRvQXJyYXkoYXJndW1lbnRzLCBuKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGN1cikge1xuICAgIHJldHVybiBwcmV2LmNvbmNhdChjdXIpO1xuICB9LCBbXSk7XG4gIHZhciByZXMgPSBbXTtcbiAgdmFyIGl0ZW0sIGtleSwgdmFsLCBqO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyci5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpdGVtID0gYXJyW2ldO1xuICAgIHZhbCA9IGl0ZW0gJiYgaXRlbS4kdmFsdWUgfHwgaXRlbTtcbiAgICBqID0ga2V5cy5sZW5ndGg7XG4gICAgaWYgKGopIHtcbiAgICAgIHdoaWxlIChqLS0pIHtcbiAgICAgICAga2V5ID0ga2V5c1tqXTtcbiAgICAgICAgaWYgKGtleSA9PT0gJyRrZXknICYmIGNvbnRhaW5zJDEoaXRlbS4ka2V5LCBzZWFyY2gpIHx8IGNvbnRhaW5zJDEoZ2V0UGF0aCh2YWwsIGtleSksIHNlYXJjaCkpIHtcbiAgICAgICAgICByZXMucHVzaChpdGVtKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY29udGFpbnMkMShpdGVtLCBzZWFyY2gpKSB7XG4gICAgICByZXMucHVzaChpdGVtKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuLyoqXG4gKiBGaWx0ZXIgZmlsdGVyIGZvciBhcnJheXNcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc29ydEtleVxuICogQHBhcmFtIHtTdHJpbmd9IHJldmVyc2VcbiAqL1xuXG5mdW5jdGlvbiBvcmRlckJ5KGFyciwgc29ydEtleSwgcmV2ZXJzZSkge1xuICBhcnIgPSBjb252ZXJ0QXJyYXkoYXJyKTtcbiAgaWYgKCFzb3J0S2V5KSB7XG4gICAgcmV0dXJuIGFycjtcbiAgfVxuICB2YXIgb3JkZXIgPSByZXZlcnNlICYmIHJldmVyc2UgPCAwID8gLTEgOiAxO1xuICAvLyBzb3J0IG9uIGEgY29weSB0byBhdm9pZCBtdXRhdGluZyBvcmlnaW5hbCBhcnJheVxuICByZXR1cm4gYXJyLnNsaWNlKCkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgIGlmIChzb3J0S2V5ICE9PSAnJGtleScpIHtcbiAgICAgIGlmIChpc09iamVjdChhKSAmJiAnJHZhbHVlJyBpbiBhKSBhID0gYS4kdmFsdWU7XG4gICAgICBpZiAoaXNPYmplY3QoYikgJiYgJyR2YWx1ZScgaW4gYikgYiA9IGIuJHZhbHVlO1xuICAgIH1cbiAgICBhID0gaXNPYmplY3QoYSkgPyBnZXRQYXRoKGEsIHNvcnRLZXkpIDogYTtcbiAgICBiID0gaXNPYmplY3QoYikgPyBnZXRQYXRoKGIsIHNvcnRLZXkpIDogYjtcbiAgICByZXR1cm4gYSA9PT0gYiA/IDAgOiBhID4gYiA/IG9yZGVyIDogLW9yZGVyO1xuICB9KTtcbn1cblxuLyoqXG4gKiBTdHJpbmcgY29udGFpbiBoZWxwZXJcbiAqXG4gKiBAcGFyYW0geyp9IHZhbFxuICogQHBhcmFtIHtTdHJpbmd9IHNlYXJjaFxuICovXG5cbmZ1bmN0aW9uIGNvbnRhaW5zJDEodmFsLCBzZWFyY2gpIHtcbiAgdmFyIGk7XG4gIGlmIChpc1BsYWluT2JqZWN0KHZhbCkpIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbCk7XG4gICAgaSA9IGtleXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIGlmIChjb250YWlucyQxKHZhbFtrZXlzW2ldXSwgc2VhcmNoKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNBcnJheSh2YWwpKSB7XG4gICAgaSA9IHZhbC5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgaWYgKGNvbnRhaW5zJDEodmFsW2ldLCBzZWFyY2gpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmICh2YWwgIT0gbnVsbCkge1xuICAgIHJldHVybiB2YWwudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpLmluZGV4T2Yoc2VhcmNoKSA+IC0xO1xuICB9XG59XG5cbnZhciBkaWdpdHNSRSA9IC8oXFxkezN9KSg/PVxcZCkvZztcblxuLy8gYXNzZXQgY29sbGVjdGlvbnMgbXVzdCBiZSBhIHBsYWluIG9iamVjdC5cbnZhciBmaWx0ZXJzID0ge1xuXG4gIG9yZGVyQnk6IG9yZGVyQnksXG4gIGZpbHRlckJ5OiBmaWx0ZXJCeSxcbiAgbGltaXRCeTogbGltaXRCeSxcblxuICAvKipcbiAgICogU3RyaW5naWZ5IHZhbHVlLlxuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gaW5kZW50XG4gICAqL1xuXG4gIGpzb246IHtcbiAgICByZWFkOiBmdW5jdGlvbiByZWFkKHZhbHVlLCBpbmRlbnQpIHtcbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUgOiBKU09OLnN0cmluZ2lmeSh2YWx1ZSwgbnVsbCwgTnVtYmVyKGluZGVudCkgfHwgMik7XG4gICAgfSxcbiAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUodmFsdWUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHZhbHVlKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogJ2FiYycgPT4gJ0FiYydcbiAgICovXG5cbiAgY2FwaXRhbGl6ZTogZnVuY3Rpb24gY2FwaXRhbGl6ZSh2YWx1ZSkge1xuICAgIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHJldHVybiAnJztcbiAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgcmV0dXJuIHZhbHVlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdmFsdWUuc2xpY2UoMSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqICdhYmMnID0+ICdBQkMnXG4gICAqL1xuXG4gIHVwcGVyY2FzZTogZnVuY3Rpb24gdXBwZXJjYXNlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlIHx8IHZhbHVlID09PSAwID8gdmFsdWUudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpIDogJyc7XG4gIH0sXG5cbiAgLyoqXG4gICAqICdBYkMnID0+ICdhYmMnXG4gICAqL1xuXG4gIGxvd2VyY2FzZTogZnVuY3Rpb24gbG93ZXJjYXNlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlIHx8IHZhbHVlID09PSAwID8gdmFsdWUudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpIDogJyc7XG4gIH0sXG5cbiAgLyoqXG4gICAqIDEyMzQ1ID0+ICQxMiwzNDUuMDBcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNpZ25cbiAgICovXG5cbiAgY3VycmVuY3k6IGZ1bmN0aW9uIGN1cnJlbmN5KHZhbHVlLCBfY3VycmVuY3kpIHtcbiAgICB2YWx1ZSA9IHBhcnNlRmxvYXQodmFsdWUpO1xuICAgIGlmICghaXNGaW5pdGUodmFsdWUpIHx8ICF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkgcmV0dXJuICcnO1xuICAgIF9jdXJyZW5jeSA9IF9jdXJyZW5jeSAhPSBudWxsID8gX2N1cnJlbmN5IDogJyQnO1xuICAgIHZhciBzdHJpbmdpZmllZCA9IE1hdGguYWJzKHZhbHVlKS50b0ZpeGVkKDIpO1xuICAgIHZhciBfaW50ID0gc3RyaW5naWZpZWQuc2xpY2UoMCwgLTMpO1xuICAgIHZhciBpID0gX2ludC5sZW5ndGggJSAzO1xuICAgIHZhciBoZWFkID0gaSA+IDAgPyBfaW50LnNsaWNlKDAsIGkpICsgKF9pbnQubGVuZ3RoID4gMyA/ICcsJyA6ICcnKSA6ICcnO1xuICAgIHZhciBfZmxvYXQgPSBzdHJpbmdpZmllZC5zbGljZSgtMyk7XG4gICAgdmFyIHNpZ24gPSB2YWx1ZSA8IDAgPyAnLScgOiAnJztcbiAgICByZXR1cm4gc2lnbiArIF9jdXJyZW5jeSArIGhlYWQgKyBfaW50LnNsaWNlKGkpLnJlcGxhY2UoZGlnaXRzUkUsICckMSwnKSArIF9mbG9hdDtcbiAgfSxcblxuICAvKipcbiAgICogJ2l0ZW0nID0+ICdpdGVtcydcbiAgICpcbiAgICogQHBhcmFtc1xuICAgKiAgYW4gYXJyYXkgb2Ygc3RyaW5ncyBjb3JyZXNwb25kaW5nIHRvXG4gICAqICB0aGUgc2luZ2xlLCBkb3VibGUsIHRyaXBsZSAuLi4gZm9ybXMgb2YgdGhlIHdvcmQgdG9cbiAgICogIGJlIHBsdXJhbGl6ZWQuIFdoZW4gdGhlIG51bWJlciB0byBiZSBwbHVyYWxpemVkXG4gICAqICBleGNlZWRzIHRoZSBsZW5ndGggb2YgdGhlIGFyZ3MsIGl0IHdpbGwgdXNlIHRoZSBsYXN0XG4gICAqICBlbnRyeSBpbiB0aGUgYXJyYXkuXG4gICAqXG4gICAqICBlLmcuIFsnc2luZ2xlJywgJ2RvdWJsZScsICd0cmlwbGUnLCAnbXVsdGlwbGUnXVxuICAgKi9cblxuICBwbHVyYWxpemU6IGZ1bmN0aW9uIHBsdXJhbGl6ZSh2YWx1ZSkge1xuICAgIHZhciBhcmdzID0gdG9BcnJheShhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBhcmdzLmxlbmd0aCA+IDEgPyBhcmdzW3ZhbHVlICUgMTAgLSAxXSB8fCBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gOiBhcmdzWzBdICsgKHZhbHVlID09PSAxID8gJycgOiAncycpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEZWJvdW5jZSBhIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGhhbmRsZXJcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGRlbGF5ID0gMzAwXG4gICAqIEByZXR1cm4ge0Z1bmN0aW9ufVxuICAgKi9cblxuICBkZWJvdW5jZTogZnVuY3Rpb24gZGVib3VuY2UoaGFuZGxlciwgZGVsYXkpIHtcbiAgICBpZiAoIWhhbmRsZXIpIHJldHVybjtcbiAgICBpZiAoIWRlbGF5KSB7XG4gICAgICBkZWxheSA9IDMwMDtcbiAgICB9XG4gICAgcmV0dXJuIF9kZWJvdW5jZShoYW5kbGVyLCBkZWxheSk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGluc3RhbGxHbG9iYWxBUEkgKFZ1ZSkge1xuICAvKipcbiAgICogVnVlIGFuZCBldmVyeSBjb25zdHJ1Y3RvciB0aGF0IGV4dGVuZHMgVnVlIGhhcyBhblxuICAgKiBhc3NvY2lhdGVkIG9wdGlvbnMgb2JqZWN0LCB3aGljaCBjYW4gYmUgYWNjZXNzZWQgZHVyaW5nXG4gICAqIGNvbXBpbGF0aW9uIHN0ZXBzIGFzIGB0aGlzLmNvbnN0cnVjdG9yLm9wdGlvbnNgLlxuICAgKlxuICAgKiBUaGVzZSBjYW4gYmUgc2VlbiBhcyB0aGUgZGVmYXVsdCBvcHRpb25zIG9mIGV2ZXJ5XG4gICAqIFZ1ZSBpbnN0YW5jZS5cbiAgICovXG5cbiAgVnVlLm9wdGlvbnMgPSB7XG4gICAgZGlyZWN0aXZlczogZGlyZWN0aXZlcyxcbiAgICBlbGVtZW50RGlyZWN0aXZlczogZWxlbWVudERpcmVjdGl2ZXMsXG4gICAgZmlsdGVyczogZmlsdGVycyxcbiAgICB0cmFuc2l0aW9uczoge30sXG4gICAgY29tcG9uZW50czoge30sXG4gICAgcGFydGlhbHM6IHt9LFxuICAgIHJlcGxhY2U6IHRydWVcbiAgfTtcblxuICAvKipcbiAgICogRXhwb3NlIHVzZWZ1bCBpbnRlcm5hbHNcbiAgICovXG5cbiAgVnVlLnV0aWwgPSB1dGlsO1xuICBWdWUuY29uZmlnID0gY29uZmlnO1xuICBWdWUuc2V0ID0gc2V0O1xuICBWdWVbJ2RlbGV0ZSddID0gZGVsO1xuICBWdWUubmV4dFRpY2sgPSBuZXh0VGljaztcblxuICAvKipcbiAgICogVGhlIGZvbGxvd2luZyBhcmUgZXhwb3NlZCBmb3IgYWR2YW5jZWQgdXNhZ2UgLyBwbHVnaW5zXG4gICAqL1xuXG4gIFZ1ZS5jb21waWxlciA9IGNvbXBpbGVyO1xuICBWdWUuRnJhZ21lbnRGYWN0b3J5ID0gRnJhZ21lbnRGYWN0b3J5O1xuICBWdWUuaW50ZXJuYWxEaXJlY3RpdmVzID0gaW50ZXJuYWxEaXJlY3RpdmVzO1xuICBWdWUucGFyc2VycyA9IHtcbiAgICBwYXRoOiBwYXRoLFxuICAgIHRleHQ6IHRleHQsXG4gICAgdGVtcGxhdGU6IHRlbXBsYXRlLFxuICAgIGRpcmVjdGl2ZTogZGlyZWN0aXZlLFxuICAgIGV4cHJlc3Npb246IGV4cHJlc3Npb25cbiAgfTtcblxuICAvKipcbiAgICogRWFjaCBpbnN0YW5jZSBjb25zdHJ1Y3RvciwgaW5jbHVkaW5nIFZ1ZSwgaGFzIGEgdW5pcXVlXG4gICAqIGNpZC4gVGhpcyBlbmFibGVzIHVzIHRvIGNyZWF0ZSB3cmFwcGVkIFwiY2hpbGRcbiAgICogY29uc3RydWN0b3JzXCIgZm9yIHByb3RvdHlwYWwgaW5oZXJpdGFuY2UgYW5kIGNhY2hlIHRoZW0uXG4gICAqL1xuXG4gIFZ1ZS5jaWQgPSAwO1xuICB2YXIgY2lkID0gMTtcblxuICAvKipcbiAgICogQ2xhc3MgaW5oZXJpdGFuY2VcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGV4dGVuZE9wdGlvbnNcbiAgICovXG5cbiAgVnVlLmV4dGVuZCA9IGZ1bmN0aW9uIChleHRlbmRPcHRpb25zKSB7XG4gICAgZXh0ZW5kT3B0aW9ucyA9IGV4dGVuZE9wdGlvbnMgfHwge307XG4gICAgdmFyIFN1cGVyID0gdGhpcztcbiAgICB2YXIgaXNGaXJzdEV4dGVuZCA9IFN1cGVyLmNpZCA9PT0gMDtcbiAgICBpZiAoaXNGaXJzdEV4dGVuZCAmJiBleHRlbmRPcHRpb25zLl9DdG9yKSB7XG4gICAgICByZXR1cm4gZXh0ZW5kT3B0aW9ucy5fQ3RvcjtcbiAgICB9XG4gICAgdmFyIG5hbWUgPSBleHRlbmRPcHRpb25zLm5hbWUgfHwgU3VwZXIub3B0aW9ucy5uYW1lO1xuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICBpZiAoIS9eW2EtekEtWl1bXFx3LV0qJC8udGVzdChuYW1lKSkge1xuICAgICAgICB3YXJuKCdJbnZhbGlkIGNvbXBvbmVudCBuYW1lOiBcIicgKyBuYW1lICsgJ1wiLiBDb21wb25lbnQgbmFtZXMgJyArICdjYW4gb25seSBjb250YWluIGFscGhhbnVtZXJpYyBjaGFyYWNhdGVycyBhbmQgdGhlIGh5cGhlbi4nKTtcbiAgICAgICAgbmFtZSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBTdWIgPSBjcmVhdGVDbGFzcyhuYW1lIHx8ICdWdWVDb21wb25lbnQnKTtcbiAgICBTdWIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShTdXBlci5wcm90b3R5cGUpO1xuICAgIFN1Yi5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTdWI7XG4gICAgU3ViLmNpZCA9IGNpZCsrO1xuICAgIFN1Yi5vcHRpb25zID0gbWVyZ2VPcHRpb25zKFN1cGVyLm9wdGlvbnMsIGV4dGVuZE9wdGlvbnMpO1xuICAgIFN1Ylsnc3VwZXInXSA9IFN1cGVyO1xuICAgIC8vIGFsbG93IGZ1cnRoZXIgZXh0ZW5zaW9uXG4gICAgU3ViLmV4dGVuZCA9IFN1cGVyLmV4dGVuZDtcbiAgICAvLyBjcmVhdGUgYXNzZXQgcmVnaXN0ZXJzLCBzbyBleHRlbmRlZCBjbGFzc2VzXG4gICAgLy8gY2FuIGhhdmUgdGhlaXIgcHJpdmF0ZSBhc3NldHMgdG9vLlxuICAgIGNvbmZpZy5fYXNzZXRUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICBTdWJbdHlwZV0gPSBTdXBlclt0eXBlXTtcbiAgICB9KTtcbiAgICAvLyBlbmFibGUgcmVjdXJzaXZlIHNlbGYtbG9va3VwXG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIFN1Yi5vcHRpb25zLmNvbXBvbmVudHNbbmFtZV0gPSBTdWI7XG4gICAgfVxuICAgIC8vIGNhY2hlIGNvbnN0cnVjdG9yXG4gICAgaWYgKGlzRmlyc3RFeHRlbmQpIHtcbiAgICAgIGV4dGVuZE9wdGlvbnMuX0N0b3IgPSBTdWI7XG4gICAgfVxuICAgIHJldHVybiBTdWI7XG4gIH07XG5cbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgc3ViLWNsYXNzIGNvbnN0cnVjdG9yIHdpdGggdGhlXG4gICAqIGdpdmVuIG5hbWUuIFRoaXMgZ2l2ZXMgdXMgbXVjaCBuaWNlciBvdXRwdXQgd2hlblxuICAgKiBsb2dnaW5nIGluc3RhbmNlcyBpbiB0aGUgY29uc29sZS5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHJldHVybiB7RnVuY3Rpb259XG4gICAqL1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUNsYXNzKG5hbWUpIHtcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby1uZXctZnVuYyAqL1xuICAgIHJldHVybiBuZXcgRnVuY3Rpb24oJ3JldHVybiBmdW5jdGlvbiAnICsgY2xhc3NpZnkobmFtZSkgKyAnIChvcHRpb25zKSB7IHRoaXMuX2luaXQob3B0aW9ucykgfScpKCk7XG4gICAgLyogZXNsaW50LWVuYWJsZSBuby1uZXctZnVuYyAqL1xuICB9XG5cbiAgLyoqXG4gICAqIFBsdWdpbiBzeXN0ZW1cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpblxuICAgKi9cblxuICBWdWUudXNlID0gZnVuY3Rpb24gKHBsdWdpbikge1xuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgIGlmIChwbHVnaW4uaW5zdGFsbGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIGFkZGl0aW9uYWwgcGFyYW1ldGVyc1xuICAgIHZhciBhcmdzID0gdG9BcnJheShhcmd1bWVudHMsIDEpO1xuICAgIGFyZ3MudW5zaGlmdCh0aGlzKTtcbiAgICBpZiAodHlwZW9mIHBsdWdpbi5pbnN0YWxsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBwbHVnaW4uaW5zdGFsbC5hcHBseShwbHVnaW4sIGFyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwbHVnaW4uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfVxuICAgIHBsdWdpbi5pbnN0YWxsZWQgPSB0cnVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8qKlxuICAgKiBBcHBseSBhIGdsb2JhbCBtaXhpbiBieSBtZXJnaW5nIGl0IGludG8gdGhlIGRlZmF1bHRcbiAgICogb3B0aW9ucy5cbiAgICovXG5cbiAgVnVlLm1peGluID0gZnVuY3Rpb24gKG1peGluKSB7XG4gICAgVnVlLm9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoVnVlLm9wdGlvbnMsIG1peGluKTtcbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFzc2V0IHJlZ2lzdHJhdGlvbiBtZXRob2RzIHdpdGggdGhlIGZvbGxvd2luZ1xuICAgKiBzaWduYXR1cmU6XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpZFxuICAgKiBAcGFyYW0geyp9IGRlZmluaXRpb25cbiAgICovXG5cbiAgY29uZmlnLl9hc3NldFR5cGVzLmZvckVhY2goZnVuY3Rpb24gKHR5cGUpIHtcbiAgICBWdWVbdHlwZV0gPSBmdW5jdGlvbiAoaWQsIGRlZmluaXRpb24pIHtcbiAgICAgIGlmICghZGVmaW5pdGlvbikge1xuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zW3R5cGUgKyAncyddW2lkXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xuICAgICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgICAgICAgIGlmICh0eXBlID09PSAnY29tcG9uZW50JyAmJiAoY29tbW9uVGFnUkUudGVzdChpZCkgfHwgcmVzZXJ2ZWRUYWdSRS50ZXN0KGlkKSkpIHtcbiAgICAgICAgICAgIHdhcm4oJ0RvIG5vdCB1c2UgYnVpbHQtaW4gb3IgcmVzZXJ2ZWQgSFRNTCBlbGVtZW50cyBhcyBjb21wb25lbnQgJyArICdpZDogJyArIGlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdjb21wb25lbnQnICYmIGlzUGxhaW5PYmplY3QoZGVmaW5pdGlvbikpIHtcbiAgICAgICAgICBkZWZpbml0aW9uLm5hbWUgPSBpZDtcbiAgICAgICAgICBkZWZpbml0aW9uID0gVnVlLmV4dGVuZChkZWZpbml0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLm9wdGlvbnNbdHlwZSArICdzJ11baWRdID0gZGVmaW5pdGlvbjtcbiAgICAgICAgcmV0dXJuIGRlZmluaXRpb247XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gZXhwb3NlIGludGVybmFsIHRyYW5zaXRpb24gQVBJXG4gIGV4dGVuZChWdWUudHJhbnNpdGlvbiwgdHJhbnNpdGlvbik7XG59XG5cbmluc3RhbGxHbG9iYWxBUEkoVnVlKTtcblxuVnVlLnZlcnNpb24gPSAnMS4wLjE4JztcblxuLy8gZGV2dG9vbHMgZ2xvYmFsIGhvb2tcbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG5pZiAoY29uZmlnLmRldnRvb2xzKSB7XG4gIGlmIChkZXZ0b29scykge1xuICAgIGRldnRvb2xzLmVtaXQoJ2luaXQnLCBWdWUpO1xuICB9IGVsc2UgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgJiYgaW5Ccm93c2VyICYmIC9DaHJvbWVcXC9cXGQrLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KSkge1xuICAgIGNvbnNvbGUubG9nKCdEb3dubG9hZCB0aGUgVnVlIERldnRvb2xzIGZvciBhIGJldHRlciBkZXZlbG9wbWVudCBleHBlcmllbmNlOlxcbicgKyAnaHR0cHM6Ly9naXRodWIuY29tL3Z1ZWpzL3Z1ZS1kZXZ0b29scycpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVnVlOyIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9zZWN1cmVMb2NhbFN0b3JhZ2UgPSByZXF1aXJlKCcuLi9saWIvc2VjdXJlLWxvY2FsLXN0b3JhZ2UuanMnKTtcblxudmFyIF9wYXNzd29yZCA9IHJlcXVpcmUoJy4uL2xpYi9wYXNzd29yZC5qcycpO1xuXG52YXIgX3Bhc3N3b3JkMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3Bhc3N3b3JkKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuX3NlY3VyZUxvY2FsU3RvcmFnZS5zZXRQYXNzd29yZC5jYWxsKF9zZWN1cmVMb2NhbFN0b3JhZ2Uuc2VjdXJlU3RvcmFnZSwgX3Bhc3N3b3JkMi5kZWZhdWx0KTtcblxuZXhwb3J0cy5kZWZhdWx0ID0ge1xuICBkYXRhOiBmdW5jdGlvbiBkYXRhKCkge1xuICAgIHJldHVybiB7XG4gICAgICB1c2VybmFtZTogX3NlY3VyZUxvY2FsU3RvcmFnZS5zZWN1cmVTdG9yYWdlLmdldCgnbmFtYVVzZXInKVxuICAgIH07XG4gIH0sXG5cblxuICBjb21wdXRlZDoge1xuICAgIHJvbGU6IGZ1bmN0aW9uIHJvbGUoKSB7XG4gICAgICByZXR1cm4gX3NlY3VyZUxvY2FsU3RvcmFnZS5zZWN1cmVTdG9yYWdlLmdldCgndXNlclJvbGUnKTtcbiAgICB9XG4gIH1cbn07XG5pZiAobW9kdWxlLmV4cG9ydHMuX19lc01vZHVsZSkgbW9kdWxlLmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cy5kZWZhdWx0XG47KHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gXCJmdW5jdGlvblwiPyBtb2R1bGUuZXhwb3J0cy5vcHRpb25zOiBtb2R1bGUuZXhwb3J0cykudGVtcGxhdGUgPSBcIlxcbjxkaXY+XFxuICA8aDE+SGFjayBJdCBDaGFsbGVuZ2U8L2gxPlxcbiAgPHA+WW91IGNhbiB1c2UgYW55IHdheSB0byBjaGFuZ2UgdGhlIHJvbGUgb2YgdGhlIHVzZXIgdG8gXFxcImFkbWluXFxcIi4gV2hlbiB5b3UndmUgZG9uZSwgeW91IHdpbGwgc2VlIG15IDxiPlNlY3JldCBNZXNzYWdlcyE8L2I+IFNpbXBsZSE8L3A+XFxuICA8cD51c2VybmFtZToge3sgdXNlcm5hbWUgfX08L3A+XFxuICA8cD5yb2xlOiB7eyByb2xlIH19PC9wPlxcbiAgPGgxIHYtaWY9XFxcInJvbGUgPT0gJ2FkbWluJ1xcXCI+SWYgeW91IEZpbmQgdGhpcywgWW91IHNob3VsZCBvcGVuIGFuIGlzc3VlIHRvIG15IEdpdGh1YiE8L2gxPlxcbjwvZGl2PlxcblwiXG5pZiAobW9kdWxlLmhvdCkgeyhmdW5jdGlvbiAoKSB7ICBtb2R1bGUuaG90LmFjY2VwdCgpXG4gIHZhciBob3RBUEkgPSByZXF1aXJlKFwidnVlLWhvdC1yZWxvYWQtYXBpXCIpXG4gIGhvdEFQSS5pbnN0YWxsKHJlcXVpcmUoXCJ2dWVcIiksIHRydWUpXG4gIGlmICghaG90QVBJLmNvbXBhdGlibGUpIHJldHVyblxuICB2YXIgaWQgPSBcIi92YXIvd3d3L2dpdGh1Yi9oYWNrLWl0LWNoYWxsZW5nZS9tYXN0ZXIvc3JjL2NvbXBvbmVudHMvYXBwLnZ1ZVwiXG4gIGlmICghbW9kdWxlLmhvdC5kYXRhKSB7XG4gICAgaG90QVBJLmNyZWF0ZVJlY29yZChpZCwgbW9kdWxlLmV4cG9ydHMpXG4gIH0gZWxzZSB7XG4gICAgaG90QVBJLnVwZGF0ZShpZCwgbW9kdWxlLmV4cG9ydHMsICh0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09IFwiZnVuY3Rpb25cIiA/IG1vZHVsZS5leHBvcnRzLm9wdGlvbnMgOiBtb2R1bGUuZXhwb3J0cykudGVtcGxhdGUpXG4gIH1cbn0pKCl9IiwiY29uc3QgcmFoYXNpYSA9IFwibG9QaWtpckJpc2FOZ2VIYWNrSHVoXCJcbmV4cG9ydCBkZWZhdWx0IHJhaGFzaWE7XG4iLCIvKiEgQ29weXJpZ2h0IChjKSAyMDE2IE5hdWZhbCBSYWJiYW5pIChodHRwczovL2dpdGh1Yi5jb20vQm9zTmF1ZmFsKVxuKiBMaWNlbnNlZCBVbmRlciBNSVQgKGh0dHA6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVQpXG4qXG4qIFNlY3VyZSBMb2NhbCBTdG9yYWdlIC0gVmVyc2lvbiAxLjAuMFxuKlxuKi9cblxuKGZ1bmN0aW9uKCl7XG5cbiAgdmFyIGZha2VSb290ID0ge1xuICAgIF9fU0VDVVJFX0xPQ0FMX1NUT1JBR0VfUEFTU19fIDogXCJcIixcbiAgICBfX251bTFfXyA6IG51bGwsXG4gICAgX19udW0yX18gOiBudWxsLFxuICAgIGRhdGE6IHt9XG4gIH07XG5cbiAgdmFyIHN0b3JhZ2VOYW1lID0gJ3NlY3VyZUxvY2FsU3RvcmFnZSc7XG4gIHZhciBpbnRlcm5QYXNzID0gJ3NlY3VyZVN0b3JhZ2VJbnRlcm5hbFBhc3N3b3JkJztcbiAgdmFyIGludGVybk51bTEgPSAyNTtcbiAgdmFyIGludGVybk51bTIgPSAxNTtcblxuICB2YXIgYWxwaGFiZXQgPSBbJ0EnLCdCJywnQycsJ0QnLCdFJywnRicsJ0cnLCdIJywnSScsJ0onLCdLJywnTCcsJ00nLCdOJywnTycsJ1AnLCdRJywnUicsJ1MnLCdUJywnVScsJ1YnLCdXJywnWCcsJ1knLCdaJywnYScsJ2InLCdjJywnZCcsJ2UnLCdmJywnZycsJ2gnLCdpJywnaicsJ2snLCdsJywnbScsJ24nLCdvJywncCcsJ3EnLCdyJywncycsJ3QnLCd1JywndicsJ3cnLCd4JywneScsJ3onLCcwJywnMScsJzInLCczJywnNCcsJzUnLCc2JywnNycsJzgnLCc5J107XG5cblxuICAvKipcbiAgICBFTkNSWVBUIGFuZCBERUNSWVBUIHNvbWUgdmFsdWVcbiAgICBAcGFyYW0ge1N0cmluZ30gYWN0aW9uXG4gICAgQHBhcmFtIHtTdHJpbmd9IHVuc2FmZVN0cmluZ1xuICAgIEBwYXJhbSB7U3RyaW5nfSBwYXNzd29yZFxuXG4gICAgQHJldHVybiB7U3RyaW5nfVxuICAqL1xuICB2YXIgc2VjdXJlID0gZnVuY3Rpb24oYWN0aW9uLHVuc2FmZVN0cmluZyxwYXNzd29yZCl7XG5cblxuICAgIC8vIFBhc3N3b3JkIHRvIGFycmF5XG4gICAgdmFyIG9ialBhc3N3b3JkID0gcGFzc3dvcmQuc3BsaXQoJycpO1xuXG4gICAgLy8gc3BsaXQgdGhlIHVuc2FmZVN0cmluZyB0byBhcnJheVxuICAgIHZhciBvYmogPSB1bnNhZmVTdHJpbmcuc3BsaXQoJycpO1xuXG5cbiAgICAvKipcbiAgICAgIGNhbGN1bGF0aW9ucyBvZiB0aGUgcGFzc3dvcmRcbiAgICAgIE1ha2UgZXZlcnkgc2luZ2xlIGNoYXIgb2YgcGFzc3dvcmQgYmVjb21lIGEgbnVtYmVyXG4gICAgICBkZXBlbmQgb24gaXRzIG9yZGVyIG9uIGFscGhhYmV0IGFycmF5XG5cbiAgICAgIHRoZW4gcHV0IGl0IG9uIG51bWJlciB2YXJpYWJsZVxuICAgICovXG4gICAgdmFyIG51bWJlciA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmpQYXNzd29yZC5sZW5ndGg7IGkrKykge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBhbHBoYWJldC5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiggb2JqUGFzc3dvcmRbaV0gPT0gYWxwaGFiZXRbal0gKSBudW1iZXIgKz0gajtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAgRU5DUllQVCBmdW5jdGlvblxuICAgICAgd2lsbCBjb252ZXJ0IGV2ZXJ5IHNpbmdsZSBjaGFyIG9mIHVuc2FmZVN0cmluZyBiZWNvbWUgYSBudW1iZXJcbiAgICAgIGRlcGVuZCBvbiBpdHMgb3JkZXIgb24gYWxwaGFiZXQgYXJyYXlcblxuICAgICAgdGhlbiBpbmNyZWFzZSB0aGVtIHdpdGggdGhlIG51bSAoY2FsY3VsYXRpb25zIG9mIHRoZSBwYXNzd29yZCBjaGFyKVxuICAgICAgdGhlIHRvdGFsIG9mIGl0IHdpbGwgZGVjcmVhc2UgYnkgYWxwaGFiZXQubGVuZ3RoIGlmIHRoZXkgYXJlIG1vcmUgdGhhbiBhbHBoYWJldC5sZW5ndGhcbiAgICAgIGFmdGVyIG1lZXQgdGhlIHBlcmZlY3QgbnVtYmVyICggbm90IG1vcmUgdGhhbiBhbHBoYWJldC5sZW5ndGggKSBmaW5kIGEgYWxwaGFiZXQgZGVwZW5kIG9uIHRoYXRcblxuICAgICAgdGhlbiBwdXNoIGl0IHRvIHNlY3VyZSBzdHJpbmdcblxuICAgICAgcmV0dXJuIGVuY29kZWQgVVJJIENvbXBvbmVudCBvZiBzZWN1cmUgc3RyaW5nXG4gICAgKi9cbiAgICAvLyBFTkNSWVBUIElUIVxuICAgIGlmKGFjdGlvbiA9PSAnZW5jcnlwdCcpe1xuICAgICAgdmFyIGVuY3J5cHRJdCA9IGZ1bmN0aW9uKGFscGhhKXtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBhbHBoYWJldC5sZW5ndGg7IGorKykge1xuICAgICAgICAgIGlmKCBhbHBoYSA9PSBhbHBoYWJldFtqXSApe1xuICAgICAgICAgICAgdmFyIG91dE9mUmFuZ2UgPSBmdW5jdGlvbihudW0pe1xuICAgICAgICAgICAgICBpZihudW0gPiBhbHBoYWJldC5sZW5ndGgpe1xuICAgICAgICAgICAgICAgIG51bSAtPSBhbHBoYWJldC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG91dE9mUmFuZ2UobnVtKTtcbiAgICAgICAgICAgICAgfSBlbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiBudW07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gYWxwaGFiZXRbb3V0T2ZSYW5nZShqK251bWJlcildOyAvLyBlbmNyeXB0aW5nIGRlcGVuZCBvbiBwYXNzd29yZCBjYWxjdWxhdGlvbnNcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFscGhhO1xuICAgICAgfVxuXG4gICAgICB2YXIgc2VjdXJlID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZW5jcnlwdCA9IGVuY3J5cHRJdChvYmpbaV0pO1xuICAgICAgICBzZWN1cmUucHVzaChlbmNyeXB0KTtcbiAgICAgIH1cblxuXG4gICAgICAvLyBlbmNyeXB0ZWQgc3RyaW5nXG4gICAgICByZXR1cm4gc2VjdXJlLmpvaW4oJycpO1xuICAgIH1cblxuXG5cbiAgICAvKipcbiAgICAgIERFQ1JZUFQgZnVuY3Rpb25cblxuICAgICAgZW5jb2RlIFVSSSBDb21wb25lbnQgdGhlIHVuc2FmZVN0cmluZyBwYXJhbXMgdGhlbi4uLlxuXG4gICAgICB3aWxsIGNvbnZlcnQgZXZlcnkgc2luZ2xlIGNoYXIgb2YgdW5zYWZlU3RyaW5nIGJlY29tZSBhIG51bWJlclxuICAgICAgZGVwZW5kIG9uIGl0cyBvcmRlciBvbiBhbHBoYWJldCBhcnJheVxuXG4gICAgICB0aGVuIGRlY3JlYXNlIHRoZW0gd2l0aCB0aGUgbnVtIChjYWxjdWxhdGlvbnMgb2YgdGhlIHBhc3N3b3JkIGNoYXIpXG4gICAgICB0aGUgdG90YWwgb2YgaXQgd2lsbCBpbmNyZWFzZSBieSBhbHBoYWJldC5sZW5ndGggaWYgdGhleSBhcmUgbGVzcyB0aGFuIGFscGhhYmV0Lmxlbmd0aFxuICAgICAgYWZ0ZXIgbWVldCB0aGUgcGVyZmVjdCBudW1iZXIgKCBub3QgbGVzcyB0aGFuIGFscGhhYmV0Lmxlbmd0aCApIGZpbmQgYSBhbHBoYWJldCBkZXBlbmQgb24gdGhhdFxuXG4gICAgICB0aGVuIHB1c2ggaXQgdG8gb3JpZ2luYWwgc3RyaW5nXG5cbiAgICAgIHJldHVybiBvcmlnaW5hbCBzdHJpbmdcbiAgICAqL1xuICAgIC8vIERFQ1JZUFQgSVQhXG4gICAgaWYoYWN0aW9uID09ICdkZWNyeXB0Jyl7XG4gICAgICB2YXIgZGVjcnlwdEl0ID0gZnVuY3Rpb24oYWxwaGEpe1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGFscGhhYmV0Lmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgaWYoIGFscGhhID09IGFscGhhYmV0W2pdICl7XG4gICAgICAgICAgICB2YXIgbWludXNPbmUgPSBmdW5jdGlvbihudW0pe1xuICAgICAgICAgICAgICBpZihudW0gPCAwKXtcbiAgICAgICAgICAgICAgICBudW0gKz0gYWxwaGFiZXQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHJldHVybiBtaW51c09uZShudW0pO1xuICAgICAgICAgICAgICB9IGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBhbHBoYWJldFttaW51c09uZShqLW51bWJlcildO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWxwaGE7XG4gICAgICB9XG5cblxuICAgICAgdmFyIG9yaWdpbmFsID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgZGVjcnlwdCA9IGRlY3J5cHRJdChvYmpbaV0pO1xuICAgICAgICBvcmlnaW5hbC5wdXNoKGRlY3J5cHQpO1xuICAgICAgfVxuXG4gICAgICAvLyBkZWNyeXB0ZWQgc3RyaW5nXG4gICAgICByZXR1cm4gb3JpZ2luYWwuam9pbignJyk7XG4gICAgfVxuXG4gIH07XG5cblxuXG4gIC8qKlxuICAgIEdldCB0aGUgcGxhaW4gTG9jYWwgU3RvcmFnZVxuICAgIEByZXR1cm4ge1N0cmluZ31cbiAgKi9cbiAgZnVuY3Rpb24gZ2V0TG9TdG9yYWdlKCl7XG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShzdG9yYWdlTmFtZSk7XG4gIH1cblxuXG4gIC8qKlxuICAgIEdldCB0aGUgcGxhaW4gTG9jYWwgU3RvcmFnZSBhbmQgcmVtb3ZlIHRoZSBlbmNyeXB0ZWRGYWtlUm9vdE51bXNcbiAgICBAcmV0dXJuIHtTdHJpbmd9XG4gICovXG4gIGZ1bmN0aW9uIGdldExvU3RvcmFnZVdpdGhvdXRFbmNyeXB0ZWRGYWtlUm9vdE51bXMoKXtcbiAgICAvLyBnZXQgaXRcbiAgICB2YXIgbG9TdG9yYWdlID0gZ2V0TG9TdG9yYWdlKCk7XG4gICAgLy8gUmVtb3ZlIHRoZSBlbmNyeXB0ZWRGYWtlUm9vdE51bXNcbiAgICB2YXIgZmlyc3QgPSBsb1N0b3JhZ2Uuc3Vic3RyKDAsNik7XG4gICAgdmFyIHRoZVJlc3QgPSBsb1N0b3JhZ2Uuc3Vic3RyKDgpO1xuICAgIGxvU3RvcmFnZSA9IGZpcnN0K3RoZVJlc3Q7XG4gICAgcmV0dXJuIGxvU3RvcmFnZTtcbiAgfVxuXG5cbiAgLyoqXG4gICAgR2V0IHRoZSBJbml0aWFsIFBhc3N3b3JkXG4gICAgaWYgaGF2ZSBzdG9yZWQgaXQgaW4gdGhlIGxvY2FsU3RvcmFnZSBpdCB3aWxsIGJlIGdvdHRlbiBhbmQgdXNlIGl0XG4gICAgZWxzZSBzaG91bGQgZ2VuZXJhdGUgYSBuZXcgcmFuZG9tIG51bWJlclxuICAgIEByZXR1cm4ge1N0cmluZ31cbiAgKi9cbiAgZnVuY3Rpb24gaW5pdGlhbEZha2VSb290TnVtcygpe1xuICAgIC8vIEdldCBudW1iZXIgaW5kaWNhdG9yIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgdmFyIG51bXMgPSBnZXRMb1N0b3JhZ2UoKTtcblxuICAgIC8vIElmIGl0IGlzbid0IGxlbmd0aFxuICAgIGlmKG51bXMgPT09IG51bGwpe1xuICAgICAgLy8gTWFrZSBpbnRlcm5hbCBwYXNzd29yZCBpbmRpY2F0b3IgYmVjb21lIFJhbmRvbVxuICAgICAgZmFrZVJvb3QuX19udW0xX18gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA1KTtcbiAgICAgIGZha2VSb290Ll9fbnVtMl9fID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG51bXMgPSBudW1zLnN1YnN0cig2LDIpXG4gICAgICAvLyBnZXQgaXQhXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFscGhhYmV0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmKGFscGhhYmV0W2ldID09IG51bXMuc3Vic3RyKDAsMSkpIGZha2VSb290Ll9fbnVtMV9fID0gKGktaW50ZXJuTnVtMSk7XG4gICAgICAgIGlmKGFscGhhYmV0W2ldID09IG51bXMuc3Vic3RyKDEsMSkpIGZha2VSb290Ll9fbnVtMl9fID0gKGktaW50ZXJuTnVtMik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cblxuXG4gIC8vIEluaXRpYWxpemVcbiAgdmFyIHN0b3JhZ2UgPSBmdW5jdGlvbiBzZWN1cmVTdG9yYWdlKCl7XG4gICAgdmFyIG1lID0gdGhpcztcblxuICAgIGluaXRpYWxGYWtlUm9vdE51bXMoKTtcblxuICAgIC8vIEluaXRpYWwgRGF0YVxuICAgIGZha2VSb290LmRhdGEgPSB7fTtcblxuICAgIC8vIGlmIGxvY2FsU3RvcmFnZSBpcyBub3QgZW1wdHlcbiAgICBpZihnZXRMb1N0b3JhZ2UoKSAhPT0gbnVsbCl7XG5cbiAgICAgIC8vIGdldCBpdFxuICAgICAgdmFyIGxvU3RvcmFnZSA9IGdldExvU3RvcmFnZVdpdGhvdXRFbmNyeXB0ZWRGYWtlUm9vdE51bXMoKTtcbiAgICAgIGZha2VSb290LmRhdGEgPSBKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudChsb1N0b3JhZ2UpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuXG5cbiAgLyoqXG4gICAgSW50ZXJuYWwgUGFzc3dvcmQgQ29tYmluYXRpb24sIGZvciBzZXRQYXNzd29yZCBhbmQgZ2V0UGFzc3dvcmRcbiAgICBAcmV0dXJuIHtTdHJpbmd9XG4gICovXG4gIGZ1bmN0aW9uIGludGVyblBhc3NDb21iaW5hdGlvbigpe1xuICAgIHJldHVybiBhbHBoYWJldFtmYWtlUm9vdC5fX251bTJfX10raW50ZXJuUGFzcythbHBoYWJldFtmYWtlUm9vdC5fX251bTFfX107XG4gIH1cblxuXG5cbiAgLyoqXG4gICAgU2hvcnRjdXQgdG8gc2V0dGluZyB0aGUgcGFzc3dvcmRcbiAgICBAcGFyYW0ge1N0cmluZ30gcGFzc1xuICAqL1xuICB2YXIgc2V0UGFzc3dvcmQgPSBmdW5jdGlvbiAocGFzcykge1xuICAgIC8vIE1ha2UgYW4gZW5jcnlwdGVkIHBhc3N3b3JkXG4gICAgdmFyIHBhc3MgPSBzZWN1cmUoJ2VuY3J5cHQnLHBhc3MsaW50ZXJuUGFzc0NvbWJpbmF0aW9uKCkpO1xuICAgIGZha2VSb290Ll9fU0VDVVJFX0xPQ0FMX1NUT1JBR0VfUEFTU19fID0gcGFzcztcblxuICB9O1xuXG5cblxuICAvKipcbiAgICBHZXQgdGhlIE9yaWdpbmFsIFBhc3N3b3JkXG5cbiAgICBAcmV0dXJuIHtPYmplY3R9XG4gICovXG4gIGZ1bmN0aW9uIGdldFBhc3N3b3JkKCl7XG4gICAgdmFyIG9yaWdpbmFsUGFzcyA9IHNlY3VyZSgnZGVjcnlwdCcsIGZha2VSb290Ll9fU0VDVVJFX0xPQ0FMX1NUT1JBR0VfUEFTU19fLCBpbnRlcm5QYXNzQ29tYmluYXRpb24oKSk7XG4gICAgcmV0dXJuIG9yaWdpbmFsUGFzcztcbiAgfVxuXG5cbiAgLyoqXG4gICAgRU5DUllQVCAvIERFQ1JZUFQgU2VjdXJlIE9iamVjdFxuICAgICotIExpbWl0YXRpb24gLSpcbiAgICBPbmx5IE5vbiBOZXN0ZWQgT2JqZWN0XG5cbiAgICBAcGFyYW0ge09iamVjdH0gb2JqXG5cbiAgICBAcmV0dXJuIHtPYmplY3R9XG4gICovXG4gIGZ1bmN0aW9uIHNlY3VyZU9iamVjdChvYmosZGVjcnlwdCl7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuXG4gICAgdmFyIGFjdGlvbiA9IGRlY3J5cHQgPyAnZGVjcnlwdCcgOiAnZW5jcnlwdCc7XG5cbiAgICB2YXIgcGFzcyA9IGdldFBhc3N3b3JkKCk7XG5cbiAgICB2YXIgc2VjdXJlT2JqZWN0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgIHNlY3VyZU9iamVjdFtzZWN1cmUoYWN0aW9uLGtleSxwYXNzKV0gPSBzZWN1cmUoYWN0aW9uLG9ialtrZXldLHBhc3MpO1xuICAgIH1cblxuICAgIHJldHVybiBzZWN1cmVPYmplY3Q7XG4gIH07XG5cblxuXG4gIC8qKlxuICAgIEFkZGluZyBFbmNyeXB0ZWQgRmFrZSBSb290IE51bXNcblxuICAgIEBwYXJhbSB7T2JqZWN0fSBvYmpcblxuICAgIEByZXR1cm4ge1N0cmluZ31cbiAgKi9cbiAgLy8gZnVuY3Rpb24gYWRkRW5jcnlwdGVkRmFrZVJvb3ROdW1zKHN0b3JhZ2VEYXRhKXtcbiAgZnVuY3Rpb24gZW5jcnlwdFRoZVN0b3JhZ2VWYWx1ZShzdG9yYWdlRGF0YSl7XG4gICAgdmFyIGVuY3J5cHRlZEZha2VSb290TnVtcyA9IGFscGhhYmV0W2Zha2VSb290Ll9fbnVtMV9fK2ludGVybk51bTFdK2FscGhhYmV0W2Zha2VSb290Ll9fbnVtMl9fK2ludGVybk51bTJdO1xuICAgIHZhciB2YWx1ZVdhbm5hQmUgPSBlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc3RvcmFnZURhdGEpKTtcbiAgICB2YXIgZmlyc3QgPSB2YWx1ZVdhbm5hQmUuc3Vic3RyKDAsNik7XG4gICAgdmFyIHRoZVJlc3QgPSB2YWx1ZVdhbm5hQmUuc3Vic3RyKDYpO1xuICAgIHZhciBlbmNyeXB0ZWRTdG9yYWdlVmFsdWUgPSBmaXJzdCtlbmNyeXB0ZWRGYWtlUm9vdE51bXMrdGhlUmVzdDtcbiAgICByZXR1cm4gZW5jcnlwdGVkU3RvcmFnZVZhbHVlO1xuICB9XG5cblxuXG4gIC8qKlxuICAgIFNldCB0aGUgaXRlbSBvZiBsb2NhbFN0b3JhZ2VcbiAgICBAcGFyYW0ge01peGVkfSBpbmRleFxuICAgIEBwYXJhbSB7U3RyaW5nfSB2YWxcblxuICAgIEByZXR1cm4ge3N0b3JhZ2V9XG4gICovXG4gIHN0b3JhZ2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGluZGV4LHZhbCl7XG4gICAgdmFyIG1lID0gdGhpcztcblxuXG4gICAgaWYoZmFrZVJvb3QuX19TRUNVUkVfTE9DQUxfU1RPUkFHRV9QQVNTX18gPT09IFwiXCIpe1xuICAgICAgY29uc29sZS53YXJuKCdbU2VjdXJlIExvY2FsIFN0b3JhZ2VdOiBZb3UgbmVlZCB0byBzZXQgdGhlIHBhc3N3b3JkJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIHNlY3VyZSA9IHt9O1xuXG4gICAgaWYodHlwZW9mIGluZGV4ID09PSAnc3RyaW5nJyl7XG4gICAgICB2YXIgb2JqID0ge307XG5cbiAgICAgIC8vIFN1cHBvcnQgT2JqZWN0XG4gICAgICBvYmpbaW5kZXhdID0gSlNPTi5zdHJpbmdpZnkodmFsKTtcbiAgICAgIGNvbnNvbGUubG9nKG9iaik7XG5cbiAgICAgIHNlY3VyZSA9IHNlY3VyZU9iamVjdChvYmopO1xuICAgIH1cblxuICAgIGlmKHR5cGVvZiBpbmRleCA9PT0gJ29iamVjdCcpe1xuXG4gICAgICAvLyBTdXBwb3J0IE9iamVjdFxuICAgICAgdmFyIGt1bmNpcyAgPSBPYmplY3Qua2V5cyhpbmRleCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGt1bmNpcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIga2V5ID0ga3VuY2lzW2ldO1xuICAgICAgICBpbmRleFtrZXldID0gSlNPTi5zdHJpbmdpZnkoaW5kZXhba2V5XSk7XG4gICAgICB9XG5cbiAgICAgIHNlY3VyZSA9IHNlY3VyZU9iamVjdChpbmRleCk7XG4gICAgfVxuXG5cbiAgICAvLyBQdXQgaXQgb24gbG9jYWxTdG9yYWdlXG4gICAgdmFyIGtleXMgID0gT2JqZWN0LmtleXMoc2VjdXJlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgZmFrZVJvb3QuZGF0YVtrZXldID0gc2VjdXJlW2tleV07XG4gICAgfVxuXG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShzdG9yYWdlTmFtZSxlbmNyeXB0VGhlU3RvcmFnZVZhbHVlKGZha2VSb290LmRhdGEpKTtcblxuICB9O1xuXG5cbiAgLyoqXG4gICAgR2V0IHRoZSBpdGVtIGZyb20gbG9jYWxTdG9yYWdlXG4gICAgQHBhcmFtIHtTdHJpbmd9IGluZGV4XG5cbiAgICBAcmV0dXJuIHtTdHJpbmd9XG4gICovXG4gIHN0b3JhZ2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKGluZGV4KXtcbiAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgaWYoZ2V0TG9TdG9yYWdlKCkgPT09IG51bGwpe1xuICAgICAgY29uc29sZS53YXJuKCdbU2VjdXJlIExvY2FsIFN0b3JhZ2VdOiBZb3VyIHN0b3JhZ2UgSXMgRW1wdHkhJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYoZmFrZVJvb3QuX19TRUNVUkVfTE9DQUxfU1RPUkFHRV9QQVNTX18gPT09IFwiXCIpe1xuICAgICAgY29uc29sZS53YXJuKCdbU2VjdXJlIExvY2FsIFN0b3JhZ2VdOiBZb3UgbmVlZCB0byBzZXQgdGhlIHBhc3N3b3JkJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIGxvU3RvcmFnZSA9IGdldExvU3RvcmFnZVdpdGhvdXRFbmNyeXB0ZWRGYWtlUm9vdE51bXMoKTtcblxuICAgIHZhciBzdG9yYWdlT2JqID0gSlNPTi5wYXJzZShkZWNvZGVVUklDb21wb25lbnQobG9TdG9yYWdlKSk7XG5cbiAgICB2YXIgb3JpZ2luYWxPYmogPSBzZWN1cmVPYmplY3Qoc3RvcmFnZU9iaiwgdHJ1ZSk7XG5cbiAgICAvLyBTdXBwb3J0IE9iamVjdFxuICAgIHJldHVybiBKU09OLnBhcnNlKG9yaWdpbmFsT2JqW2luZGV4XSk7XG4gIH07XG5cblxuICAvKipcbiAgICBSZW1vdmUgdGhlIGl0ZW0gZnJvbSBsb2NhbFN0b3JhZ2VcbiAgICBAcGFyYW0ge1N0cmluZ30gaW5kZXhcblxuICAgIEByZXR1cm4ge3N0b3JhZ2V9XG4gICovXG4gIHN0b3JhZ2UucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKGluZGV4KXtcbiAgICB2YXIgbWUgID0gdGhpcztcblxuICAgIGlmKGdldExvU3RvcmFnZSgpID09PSBudWxsKXtcbiAgICAgIGNvbnNvbGUud2FybignW1NlY3VyZSBMb2NhbCBTdG9yYWdlXTogWW91ciBzdG9yYWdlIElzIEVtcHR5IScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmKGZha2VSb290Ll9fU0VDVVJFX0xPQ0FMX1NUT1JBR0VfUEFTU19fID09PSBcIlwiKXtcbiAgICAgIGNvbnNvbGUud2FybignW1NlY3VyZSBMb2NhbCBTdG9yYWdlXTogWW91IG5lZWQgdG8gc2V0IHRoZSBwYXNzd29yZCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBlbmNyeXB0ZWRJbmRleCA9IHNlY3VyZSgnZW5jcnlwdCcsaW5kZXgsZ2V0UGFzc3dvcmQoKSk7XG5cbiAgICBkZWxldGUgZmFrZVJvb3QuZGF0YVtlbmNyeXB0ZWRJbmRleF07XG5cbiAgICAvLyBQdXQgaXQgb24gbG9jYWxTdG9yYWdlXG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShzdG9yYWdlTmFtZSxlbmNyeXB0VGhlU3RvcmFnZVZhbHVlKGZha2VSb290LmRhdGEpKTtcbiAgfTtcblxuXG4gIC8qKlxuICAgIFJlc2V0IHRoZSBsb2NhbFN0b3JhZ2VcbiAgKi9cbiAgc3RvcmFnZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpe1xuICAgIGZha2VSb290LmRhdGEgPSB7fTtcbiAgICByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHN0b3JhZ2VOYW1lKTtcbiAgfTtcblxuXG4gIC8vIE1ha2UgYSBuZXcgc2VjdXJlU3RvcmFnZSgpXG4gIHZhciBzZWN1cmVTdG9yYWdlID0gbmV3IHN0b3JhZ2UoKTtcblxuXG4gIC8vIElmIHN1cHBvcnQgbm9kZSAvIEVTNiBtb2R1bGVcbiAgaWYoIHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzICl7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgICBzZWN1cmVTdG9yYWdlOiBzZWN1cmVTdG9yYWdlLFxuICAgICAgc2V0UGFzc3dvcmQ6IHNldFBhc3N3b3JkXG4gICAgfTtcbiAgfVxuXG59KSgpO1xuIiwiLyohXG4gKiBWdWUuanMgdjEuMC4xOFxuICogKGMpIDIwMTYgRXZhbiBZb3VcbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqL1xuIWZ1bmN0aW9uKHQsZSl7XCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGU/bW9kdWxlLmV4cG9ydHM9ZSgpOlwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoZSk6dC5WdWU9ZSgpfSh0aGlzLGZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gdChlLG4scil7aWYoaShlLG4pKXJldHVybiB2b2lkKGVbbl09cik7aWYoZS5faXNWdWUpcmV0dXJuIHZvaWQgdChlLl9kYXRhLG4scik7dmFyIHM9ZS5fX29iX187aWYoIXMpcmV0dXJuIHZvaWQoZVtuXT1yKTtpZihzLmNvbnZlcnQobixyKSxzLmRlcC5ub3RpZnkoKSxzLnZtcylmb3IodmFyIG89cy52bXMubGVuZ3RoO28tLTspe3ZhciBhPXMudm1zW29dO2EuX3Byb3h5KG4pLGEuX2RpZ2VzdCgpfXJldHVybiByfWZ1bmN0aW9uIGUodCxlKXtpZihpKHQsZSkpe2RlbGV0ZSB0W2VdO3ZhciBuPXQuX19vYl9fO2lmKG4mJihuLmRlcC5ub3RpZnkoKSxuLnZtcykpZm9yKHZhciByPW4udm1zLmxlbmd0aDtyLS07KXt2YXIgcz1uLnZtc1tyXTtzLl91bnByb3h5KGUpLHMuX2RpZ2VzdCgpfX19ZnVuY3Rpb24gaSh0LGUpe3JldHVybiB5aS5jYWxsKHQsZSl9ZnVuY3Rpb24gbih0KXtyZXR1cm4gd2kudGVzdCh0KX1mdW5jdGlvbiByKHQpe3ZhciBlPSh0K1wiXCIpLmNoYXJDb2RlQXQoMCk7cmV0dXJuIDM2PT09ZXx8OTU9PT1lfWZ1bmN0aW9uIHModCl7cmV0dXJuIG51bGw9PXQ/XCJcIjp0LnRvU3RyaW5nKCl9ZnVuY3Rpb24gbyh0KXtpZihcInN0cmluZ1wiIT10eXBlb2YgdClyZXR1cm4gdDt2YXIgZT1OdW1iZXIodCk7cmV0dXJuIGlzTmFOKGUpP3Q6ZX1mdW5jdGlvbiBhKHQpe3JldHVyblwidHJ1ZVwiPT09dD8hMDpcImZhbHNlXCI9PT10PyExOnR9ZnVuY3Rpb24gaCh0KXt2YXIgZT10LmNoYXJDb2RlQXQoMCksaT10LmNoYXJDb2RlQXQodC5sZW5ndGgtMSk7cmV0dXJuIGUhPT1pfHwzNCE9PWUmJjM5IT09ZT90OnQuc2xpY2UoMSwtMSl9ZnVuY3Rpb24gbCh0KXtyZXR1cm4gdC5yZXBsYWNlKENpLGMpfWZ1bmN0aW9uIGModCxlKXtyZXR1cm4gZT9lLnRvVXBwZXJDYXNlKCk6XCJcIn1mdW5jdGlvbiB1KHQpe3JldHVybiB0LnJlcGxhY2UoJGksXCIkMS0kMlwiKS50b0xvd2VyQ2FzZSgpfWZ1bmN0aW9uIGYodCl7cmV0dXJuIHQucmVwbGFjZShraSxjKX1mdW5jdGlvbiBwKHQsZSl7cmV0dXJuIGZ1bmN0aW9uKGkpe3ZhciBuPWFyZ3VtZW50cy5sZW5ndGg7cmV0dXJuIG4/bj4xP3QuYXBwbHkoZSxhcmd1bWVudHMpOnQuY2FsbChlLGkpOnQuY2FsbChlKX19ZnVuY3Rpb24gZCh0LGUpe2U9ZXx8MDtmb3IodmFyIGk9dC5sZW5ndGgtZSxuPW5ldyBBcnJheShpKTtpLS07KW5baV09dFtpK2VdO3JldHVybiBufWZ1bmN0aW9uIHYodCxlKXtmb3IodmFyIGk9T2JqZWN0LmtleXMoZSksbj1pLmxlbmd0aDtuLS07KXRbaVtuXV09ZVtpW25dXTtyZXR1cm4gdH1mdW5jdGlvbiBtKHQpe3JldHVybiBudWxsIT09dCYmXCJvYmplY3RcIj09dHlwZW9mIHR9ZnVuY3Rpb24gZyh0KXtyZXR1cm4geGkuY2FsbCh0KT09PUFpfWZ1bmN0aW9uIF8odCxlLGksbil7T2JqZWN0LmRlZmluZVByb3BlcnR5KHQsZSx7dmFsdWU6aSxlbnVtZXJhYmxlOiEhbix3cml0YWJsZTohMCxjb25maWd1cmFibGU6ITB9KX1mdW5jdGlvbiBiKHQsZSl7dmFyIGksbixyLHMsbyxhPWZ1bmN0aW9uIGgoKXt2YXIgYT1EYXRlLm5vdygpLXM7ZT5hJiZhPj0wP2k9c2V0VGltZW91dChoLGUtYSk6KGk9bnVsbCxvPXQuYXBwbHkocixuKSxpfHwocj1uPW51bGwpKX07cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIHI9dGhpcyxuPWFyZ3VtZW50cyxzPURhdGUubm93KCksaXx8KGk9c2V0VGltZW91dChhLGUpKSxvfX1mdW5jdGlvbiB5KHQsZSl7Zm9yKHZhciBpPXQubGVuZ3RoO2ktLTspaWYodFtpXT09PWUpcmV0dXJuIGk7cmV0dXJuLTF9ZnVuY3Rpb24gdyh0KXt2YXIgZT1mdW5jdGlvbiBpKCl7cmV0dXJuIGkuY2FuY2VsbGVkP3ZvaWQgMDp0LmFwcGx5KHRoaXMsYXJndW1lbnRzKX07cmV0dXJuIGUuY2FuY2VsPWZ1bmN0aW9uKCl7ZS5jYW5jZWxsZWQ9ITB9LGV9ZnVuY3Rpb24gQyh0LGUpe3JldHVybiB0PT1lfHwobSh0KSYmbShlKT9KU09OLnN0cmluZ2lmeSh0KT09PUpTT04uc3RyaW5naWZ5KGUpOiExKX1mdW5jdGlvbiAkKHQpe3RoaXMuc2l6ZT0wLHRoaXMubGltaXQ9dCx0aGlzLmhlYWQ9dGhpcy50YWlsPXZvaWQgMCx0aGlzLl9rZXltYXA9T2JqZWN0LmNyZWF0ZShudWxsKX1mdW5jdGlvbiBrKCl7dmFyIHQsZT1CaS5zbGljZShRaSxKaSkudHJpbSgpO2lmKGUpe3Q9e307dmFyIGk9ZS5tYXRjaChlbik7dC5uYW1lPWlbMF0saS5sZW5ndGg+MSYmKHQuYXJncz1pLnNsaWNlKDEpLm1hcCh4KSl9dCYmKFZpLmZpbHRlcnM9VmkuZmlsdGVyc3x8W10pLnB1c2godCksUWk9SmkrMX1mdW5jdGlvbiB4KHQpe2lmKG5uLnRlc3QodCkpcmV0dXJue3ZhbHVlOm8odCksZHluYW1pYzohMX07dmFyIGU9aCh0KSxpPWU9PT10O3JldHVybnt2YWx1ZTppP3Q6ZSxkeW5hbWljOml9fWZ1bmN0aW9uIEEodCl7dmFyIGU9dG4uZ2V0KHQpO2lmKGUpcmV0dXJuIGU7Zm9yKEJpPXQsR2k9S2k9ITEsWmk9WGk9WWk9MCxRaT0wLFZpPXt9LEppPTAscWk9QmkubGVuZ3RoO3FpPkppO0ppKyspaWYoVWk9emksemk9QmkuY2hhckNvZGVBdChKaSksR2kpMzk9PT16aSYmOTIhPT1VaSYmKEdpPSFHaSk7ZWxzZSBpZihLaSkzND09PXppJiY5MiE9PVVpJiYoS2k9IUtpKTtlbHNlIGlmKDEyND09PXppJiYxMjQhPT1CaS5jaGFyQ29kZUF0KEppKzEpJiYxMjQhPT1CaS5jaGFyQ29kZUF0KEppLTEpKW51bGw9PVZpLmV4cHJlc3Npb24/KFFpPUppKzEsVmkuZXhwcmVzc2lvbj1CaS5zbGljZSgwLEppKS50cmltKCkpOmsoKTtlbHNlIHN3aXRjaCh6aSl7Y2FzZSAzNDpLaT0hMDticmVhaztjYXNlIDM5OkdpPSEwO2JyZWFrO2Nhc2UgNDA6WWkrKzticmVhaztjYXNlIDQxOllpLS07YnJlYWs7Y2FzZSA5MTpYaSsrO2JyZWFrO2Nhc2UgOTM6WGktLTticmVhaztjYXNlIDEyMzpaaSsrO2JyZWFrO2Nhc2UgMTI1OlppLS19cmV0dXJuIG51bGw9PVZpLmV4cHJlc3Npb24/VmkuZXhwcmVzc2lvbj1CaS5zbGljZSgwLEppKS50cmltKCk6MCE9PVFpJiZrKCksdG4ucHV0KHQsVmkpLFZpfWZ1bmN0aW9uIE8odCl7cmV0dXJuIHQucmVwbGFjZShzbixcIlxcXFwkJlwiKX1mdW5jdGlvbiBUKCl7dmFyIHQ9Tyhwbi5kZWxpbWl0ZXJzWzBdKSxlPU8ocG4uZGVsaW1pdGVyc1sxXSksaT1PKHBuLnVuc2FmZURlbGltaXRlcnNbMF0pLG49Tyhwbi51bnNhZmVEZWxpbWl0ZXJzWzFdKTthbj1uZXcgUmVnRXhwKGkrXCIoLis/KVwiK24rXCJ8XCIrdCtcIiguKz8pXCIrZSxcImdcIiksaG49bmV3IFJlZ0V4cChcIl5cIitpK1wiLipcIituK1wiJFwiKSxvbj1uZXcgJCgxZTMpfWZ1bmN0aW9uIE4odCl7b258fFQoKTt2YXIgZT1vbi5nZXQodCk7aWYoZSlyZXR1cm4gZTtpZih0PXQucmVwbGFjZSgvXFxuL2csXCJcIiksIWFuLnRlc3QodCkpcmV0dXJuIG51bGw7Zm9yKHZhciBpLG4scixzLG8sYSxoPVtdLGw9YW4ubGFzdEluZGV4PTA7aT1hbi5leGVjKHQpOyluPWkuaW5kZXgsbj5sJiZoLnB1c2goe3ZhbHVlOnQuc2xpY2UobCxuKX0pLHI9aG4udGVzdChpWzBdKSxzPXI/aVsxXTppWzJdLG89cy5jaGFyQ29kZUF0KDApLGE9NDI9PT1vLHM9YT9zLnNsaWNlKDEpOnMsaC5wdXNoKHt0YWc6ITAsdmFsdWU6cy50cmltKCksaHRtbDpyLG9uZVRpbWU6YX0pLGw9bitpWzBdLmxlbmd0aDtyZXR1cm4gbDx0Lmxlbmd0aCYmaC5wdXNoKHt2YWx1ZTp0LnNsaWNlKGwpfSksb24ucHV0KHQsaCksaH1mdW5jdGlvbiBqKHQsZSl7cmV0dXJuIHQubGVuZ3RoPjE/dC5tYXAoZnVuY3Rpb24odCl7cmV0dXJuIEUodCxlKX0pLmpvaW4oXCIrXCIpOkUodFswXSxlLCEwKX1mdW5jdGlvbiBFKHQsZSxpKXtyZXR1cm4gdC50YWc/dC5vbmVUaW1lJiZlPydcIicrZS4kZXZhbCh0LnZhbHVlKSsnXCInOkYodC52YWx1ZSxpKTonXCInK3QudmFsdWUrJ1wiJ31mdW5jdGlvbiBGKHQsZSl7aWYobG4udGVzdCh0KSl7dmFyIGk9QSh0KTtyZXR1cm4gaS5maWx0ZXJzP1widGhpcy5fYXBwbHlGaWx0ZXJzKFwiK2kuZXhwcmVzc2lvbitcIixudWxsLFwiK0pTT04uc3RyaW5naWZ5KGkuZmlsdGVycykrXCIsZmFsc2UpXCI6XCIoXCIrdCtcIilcIn1yZXR1cm4gZT90OlwiKFwiK3QrXCIpXCJ9ZnVuY3Rpb24gUyh0LGUsaSxuKXtSKHQsMSxmdW5jdGlvbigpe2UuYXBwZW5kQ2hpbGQodCl9LGksbil9ZnVuY3Rpb24gRCh0LGUsaSxuKXtSKHQsMSxmdW5jdGlvbigpe0IodCxlKX0saSxuKX1mdW5jdGlvbiBQKHQsZSxpKXtSKHQsLTEsZnVuY3Rpb24oKXt6KHQpfSxlLGkpfWZ1bmN0aW9uIFIodCxlLGksbixyKXt2YXIgcz10Ll9fdl90cmFucztpZighc3x8IXMuaG9va3MmJiFQaXx8IW4uX2lzQ29tcGlsZWR8fG4uJHBhcmVudCYmIW4uJHBhcmVudC5faXNDb21waWxlZClyZXR1cm4gaSgpLHZvaWQociYmcigpKTt2YXIgbz1lPjA/XCJlbnRlclwiOlwibGVhdmVcIjtzW29dKGkscil9ZnVuY3Rpb24gTCh0KXtpZihcInN0cmluZ1wiPT10eXBlb2YgdCl7dD1kb2N1bWVudC5xdWVyeVNlbGVjdG9yKHQpfXJldHVybiB0fWZ1bmN0aW9uIEgodCl7dmFyIGU9ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LGk9dCYmdC5wYXJlbnROb2RlO3JldHVybiBlPT09dHx8ZT09PWl8fCEoIWl8fDEhPT1pLm5vZGVUeXBlfHwhZS5jb250YWlucyhpKSl9ZnVuY3Rpb24gTSh0LGUpe3ZhciBpPXQuZ2V0QXR0cmlidXRlKGUpO3JldHVybiBudWxsIT09aSYmdC5yZW1vdmVBdHRyaWJ1dGUoZSksaX1mdW5jdGlvbiBXKHQsZSl7dmFyIGk9TSh0LFwiOlwiK2UpO3JldHVybiBudWxsPT09aSYmKGk9TSh0LFwidi1iaW5kOlwiK2UpKSxpfWZ1bmN0aW9uIEkodCxlKXtyZXR1cm4gdC5oYXNBdHRyaWJ1dGUoZSl8fHQuaGFzQXR0cmlidXRlKFwiOlwiK2UpfHx0Lmhhc0F0dHJpYnV0ZShcInYtYmluZDpcIitlKX1mdW5jdGlvbiBCKHQsZSl7ZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0LGUpfWZ1bmN0aW9uIFYodCxlKXtlLm5leHRTaWJsaW5nP0IodCxlLm5leHRTaWJsaW5nKTplLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQodCl9ZnVuY3Rpb24geih0KXt0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodCl9ZnVuY3Rpb24gVSh0LGUpe2UuZmlyc3RDaGlsZD9CKHQsZS5maXJzdENoaWxkKTplLmFwcGVuZENoaWxkKHQpfWZ1bmN0aW9uIEoodCxlKXt2YXIgaT10LnBhcmVudE5vZGU7aSYmaS5yZXBsYWNlQ2hpbGQoZSx0KX1mdW5jdGlvbiBxKHQsZSxpLG4pe3QuYWRkRXZlbnRMaXN0ZW5lcihlLGksbil9ZnVuY3Rpb24gUSh0LGUsaSl7dC5yZW1vdmVFdmVudExpc3RlbmVyKGUsaSl9ZnVuY3Rpb24gRyh0LGUpe0ZpJiYhL3N2ZyQvLnRlc3QodC5uYW1lc3BhY2VVUkkpP3QuY2xhc3NOYW1lPWU6dC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLGUpfWZ1bmN0aW9uIEsodCxlKXtpZih0LmNsYXNzTGlzdCl0LmNsYXNzTGlzdC5hZGQoZSk7ZWxzZXt2YXIgaT1cIiBcIisodC5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKXx8XCJcIikrXCIgXCI7aS5pbmRleE9mKFwiIFwiK2UrXCIgXCIpPDAmJkcodCwoaStlKS50cmltKCkpfX1mdW5jdGlvbiBaKHQsZSl7aWYodC5jbGFzc0xpc3QpdC5jbGFzc0xpc3QucmVtb3ZlKGUpO2Vsc2V7Zm9yKHZhciBpPVwiIFwiKyh0LmdldEF0dHJpYnV0ZShcImNsYXNzXCIpfHxcIlwiKStcIiBcIixuPVwiIFwiK2UrXCIgXCI7aS5pbmRleE9mKG4pPj0wOylpPWkucmVwbGFjZShuLFwiIFwiKTtHKHQsaS50cmltKCkpfXQuY2xhc3NOYW1lfHx0LnJlbW92ZUF0dHJpYnV0ZShcImNsYXNzXCIpfWZ1bmN0aW9uIFgodCxlKXt2YXIgaSxuO2lmKGV0KHQpJiZvdCh0LmNvbnRlbnQpJiYodD10LmNvbnRlbnQpLHQuaGFzQ2hpbGROb2RlcygpKWZvcihZKHQpLG49ZT9kb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk6ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtpPXQuZmlyc3RDaGlsZDspbi5hcHBlbmRDaGlsZChpKTtyZXR1cm4gbn1mdW5jdGlvbiBZKHQpe2Zvcih2YXIgZTtlPXQuZmlyc3RDaGlsZCx0dChlKTspdC5yZW1vdmVDaGlsZChlKTtmb3IoO2U9dC5sYXN0Q2hpbGQsdHQoZSk7KXQucmVtb3ZlQ2hpbGQoZSl9ZnVuY3Rpb24gdHQodCl7cmV0dXJuIHQmJigzPT09dC5ub2RlVHlwZSYmIXQuZGF0YS50cmltKCl8fDg9PT10Lm5vZGVUeXBlKX1mdW5jdGlvbiBldCh0KXtyZXR1cm4gdC50YWdOYW1lJiZcInRlbXBsYXRlXCI9PT10LnRhZ05hbWUudG9Mb3dlckNhc2UoKX1mdW5jdGlvbiBpdCh0LGUpe3ZhciBpPXBuLmRlYnVnP2RvY3VtZW50LmNyZWF0ZUNvbW1lbnQodCk6ZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoZT9cIiBcIjpcIlwiKTtyZXR1cm4gaS5fX3ZfYW5jaG9yPSEwLGl9ZnVuY3Rpb24gbnQodCl7aWYodC5oYXNBdHRyaWJ1dGVzKCkpZm9yKHZhciBlPXQuYXR0cmlidXRlcyxpPTAsbj1lLmxlbmd0aDtuPmk7aSsrKXt2YXIgcj1lW2ldLm5hbWU7aWYobW4udGVzdChyKSlyZXR1cm4gbChyLnJlcGxhY2UobW4sXCJcIikpfX1mdW5jdGlvbiBydCh0LGUsaSl7Zm9yKHZhciBuO3QhPT1lOyluPXQubmV4dFNpYmxpbmcsaSh0KSx0PW47aShlKX1mdW5jdGlvbiBzdCh0LGUsaSxuLHIpe2Z1bmN0aW9uIHMoKXtpZihhKyssbyYmYT49aC5sZW5ndGgpe2Zvcih2YXIgdD0wO3Q8aC5sZW5ndGg7dCsrKW4uYXBwZW5kQ2hpbGQoaFt0XSk7ciYmcigpfX12YXIgbz0hMSxhPTAsaD1bXTtydCh0LGUsZnVuY3Rpb24odCl7dD09PWUmJihvPSEwKSxoLnB1c2godCksUCh0LGkscyl9KX1mdW5jdGlvbiBvdCh0KXtyZXR1cm4gdCYmMTE9PT10Lm5vZGVUeXBlfWZ1bmN0aW9uIGF0KHQpe2lmKHQub3V0ZXJIVE1MKXJldHVybiB0Lm91dGVySFRNTDt2YXIgZT1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO3JldHVybiBlLmFwcGVuZENoaWxkKHQuY2xvbmVOb2RlKCEwKSksZS5pbm5lckhUTUx9ZnVuY3Rpb24gaHQoKXt0aGlzLmlkPWduKyssdGhpcy5zdWJzPVtdfWZ1bmN0aW9uIGx0KHQpe2lmKHRoaXMudmFsdWU9dCx0aGlzLmRlcD1uZXcgaHQsXyh0LFwiX19vYl9fXCIsdGhpcyksT2kodCkpe3ZhciBlPVRpP2N0OnV0O2UodCxibix5biksdGhpcy5vYnNlcnZlQXJyYXkodCl9ZWxzZSB0aGlzLndhbGsodCl9ZnVuY3Rpb24gY3QodCxlKXt0Ll9fcHJvdG9fXz1lfWZ1bmN0aW9uIHV0KHQsZSxpKXtmb3IodmFyIG49MCxyPWkubGVuZ3RoO3I+bjtuKyspe3ZhciBzPWlbbl07Xyh0LHMsZVtzXSl9fWZ1bmN0aW9uIGZ0KHQsZSl7aWYodCYmXCJvYmplY3RcIj09dHlwZW9mIHQpe3ZhciBuO3JldHVybiBpKHQsXCJfX29iX19cIikmJnQuX19vYl9fIGluc3RhbmNlb2YgbHQ/bj10Ll9fb2JfXzooT2kodCl8fGcodCkpJiZPYmplY3QuaXNFeHRlbnNpYmxlKHQpJiYhdC5faXNWdWUmJihuPW5ldyBsdCh0KSksbiYmZSYmbi5hZGRWbShlKSxufX1mdW5jdGlvbiBwdCh0LGUsaSxuKXt2YXIgcj1uZXcgaHQscz1PYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHQsZSk7aWYoIXN8fHMuY29uZmlndXJhYmxlIT09ITEpe3ZhciBvPXMmJnMuZ2V0LGE9cyYmcy5zZXQsaD1uP20oaSkmJmkuX19vYl9fOmZ0KGkpO09iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LGUse2VudW1lcmFibGU6ITAsY29uZmlndXJhYmxlOiEwLGdldDpmdW5jdGlvbigpe3ZhciBlPW8/by5jYWxsKHQpOmk7aWYoaHQudGFyZ2V0JiYoci5kZXBlbmQoKSxoJiZoLmRlcC5kZXBlbmQoKSxPaShlKSkpZm9yKHZhciBuLHM9MCxhPWUubGVuZ3RoO2E+cztzKyspbj1lW3NdLG4mJm4uX19vYl9fJiZuLl9fb2JfXy5kZXAuZGVwZW5kKCk7cmV0dXJuIGV9LHNldDpmdW5jdGlvbihlKXt2YXIgcz1vP28uY2FsbCh0KTppO2UhPT1zJiYoYT9hLmNhbGwodCxlKTppPWUsaD1uP20oZSkmJmUuX19vYl9fOmZ0KGUpLHIubm90aWZ5KCkpfX0pfX1mdW5jdGlvbiBkdCh0LGUpe3ZhciBpPXQudGFnTmFtZS50b0xvd2VyQ2FzZSgpLG49dC5oYXNBdHRyaWJ1dGVzKCk7aWYod24udGVzdChpKXx8Q24udGVzdChpKSl7aWYobilyZXR1cm4gdnQodCl9ZWxzZXtpZihBdChlLFwiY29tcG9uZW50c1wiLGkpKXJldHVybntpZDppfTt2YXIgcj1uJiZ2dCh0KTtpZihyKXJldHVybiByfX1mdW5jdGlvbiB2dCh0KXt2YXIgZT1NKHQsXCJpc1wiKTtyZXR1cm4gbnVsbCE9ZT97aWQ6ZX06KGU9Vyh0LFwiaXNcIiksbnVsbCE9ZT97aWQ6ZSxkeW5hbWljOiEwfTp2b2lkIDApfWZ1bmN0aW9uIG10KHQsZSxpKXt2YXIgbj1lLnBhdGg7aT1idChlLGkpLHZvaWQgMD09PWkmJihpPWd0KHQsZS5vcHRpb25zKSksX3QoZSxpKSYmcHQodCxuLGksITApfWZ1bmN0aW9uIGd0KHQsZSl7aWYoIWkoZSxcImRlZmF1bHRcIikpcmV0dXJuIGUudHlwZT09PUJvb2xlYW4/ITE6dm9pZCAwO3ZhciBuPWVbXCJkZWZhdWx0XCJdO3JldHVybiBtKG4pLFwiZnVuY3Rpb25cIj09dHlwZW9mIG4mJmUudHlwZSE9PUZ1bmN0aW9uP24uY2FsbCh0KTpufWZ1bmN0aW9uIF90KHQsZSl7aWYoIXQub3B0aW9ucy5yZXF1aXJlZCYmKG51bGw9PT10LnJhd3x8bnVsbD09ZSkpcmV0dXJuITA7dmFyIGksbj10Lm9wdGlvbnMscj1uLnR5cGUscz0hMDtpZihyJiYocj09PVN0cmluZz8oaT1cInN0cmluZ1wiLHM9dHlwZW9mIGU9PT1pKTpyPT09TnVtYmVyPyhpPVwibnVtYmVyXCIscz1cIm51bWJlclwiPT10eXBlb2YgZSk6cj09PUJvb2xlYW4/KGk9XCJib29sZWFuXCIscz1cImJvb2xlYW5cIj09dHlwZW9mIGUpOnI9PT1GdW5jdGlvbj8oaT1cImZ1bmN0aW9uXCIscz1cImZ1bmN0aW9uXCI9PXR5cGVvZiBlKTpyPT09T2JqZWN0PyhpPVwib2JqZWN0XCIscz1nKGUpKTpyPT09QXJyYXk/KGk9XCJhcnJheVwiLHM9T2koZSkpOnM9ZSBpbnN0YW5jZW9mIHIpLCFzKXJldHVybiExO3ZhciBvPW4udmFsaWRhdG9yO3JldHVybiFvfHxvKGUpfWZ1bmN0aW9uIGJ0KHQsZSl7dmFyIGk9dC5vcHRpb25zLmNvZXJjZTtyZXR1cm4gaT9pKGUpOmV9ZnVuY3Rpb24geXQoZSxuKXt2YXIgcixzLG87Zm9yKHIgaW4gbilzPWVbcl0sbz1uW3JdLGkoZSxyKT9tKHMpJiZtKG8pJiZ5dChzLG8pOnQoZSxyLG8pO3JldHVybiBlfWZ1bmN0aW9uIHd0KHQsZSl7dmFyIGk9T2JqZWN0LmNyZWF0ZSh0KTtyZXR1cm4gZT92KGksa3QoZSkpOml9ZnVuY3Rpb24gQ3QodCl7aWYodC5jb21wb25lbnRzKWZvcih2YXIgZSxpPXQuY29tcG9uZW50cz1rdCh0LmNvbXBvbmVudHMpLG49T2JqZWN0LmtleXMoaSkscj0wLHM9bi5sZW5ndGg7cz5yO3IrKyl7dmFyIG89bltyXTt3bi50ZXN0KG8pfHxDbi50ZXN0KG8pfHwoZT1pW29dLGcoZSkmJihpW29dPWRpLmV4dGVuZChlKSkpfX1mdW5jdGlvbiAkdCh0KXt2YXIgZSxpLG49dC5wcm9wcztpZihPaShuKSlmb3IodC5wcm9wcz17fSxlPW4ubGVuZ3RoO2UtLTspaT1uW2VdLFwic3RyaW5nXCI9PXR5cGVvZiBpP3QucHJvcHNbaV09bnVsbDppLm5hbWUmJih0LnByb3BzW2kubmFtZV09aSk7ZWxzZSBpZihnKG4pKXt2YXIgcj1PYmplY3Qua2V5cyhuKTtmb3IoZT1yLmxlbmd0aDtlLS07KWk9bltyW2VdXSxcImZ1bmN0aW9uXCI9PXR5cGVvZiBpJiYobltyW2VdXT17dHlwZTppfSl9fWZ1bmN0aW9uIGt0KHQpe2lmKE9pKHQpKXtmb3IodmFyIGUsaT17fSxuPXQubGVuZ3RoO24tLTspe2U9dFtuXTt2YXIgcj1cImZ1bmN0aW9uXCI9PXR5cGVvZiBlP2Uub3B0aW9ucyYmZS5vcHRpb25zLm5hbWV8fGUuaWQ6ZS5uYW1lfHxlLmlkO3ImJihpW3JdPWUpfXJldHVybiBpfXJldHVybiB0fWZ1bmN0aW9uIHh0KHQsZSxuKXtmdW5jdGlvbiByKGkpe3ZhciByPSRuW2ldfHxrbjtvW2ldPXIodFtpXSxlW2ldLG4saSl9Q3QoZSksJHQoZSk7dmFyIHMsbz17fTtpZihlLm1peGlucylmb3IodmFyIGE9MCxoPWUubWl4aW5zLmxlbmd0aDtoPmE7YSsrKXQ9eHQodCxlLm1peGluc1thXSxuKTtmb3IocyBpbiB0KXIocyk7Zm9yKHMgaW4gZSlpKHQscyl8fHIocyk7cmV0dXJuIG99ZnVuY3Rpb24gQXQodCxlLGkpe2lmKFwic3RyaW5nXCI9PXR5cGVvZiBpKXt2YXIgbixyPXRbZV07cmV0dXJuIHJbaV18fHJbbj1sKGkpXXx8cltuLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpK24uc2xpY2UoMSldfX1mdW5jdGlvbiBPdCh0LGUsaSl7fWZ1bmN0aW9uIFR0KHQpe3QucHJvdG90eXBlLl9pbml0PWZ1bmN0aW9uKHQpe3Q9dHx8e30sdGhpcy4kZWw9bnVsbCx0aGlzLiRwYXJlbnQ9dC5wYXJlbnQsdGhpcy4kcm9vdD10aGlzLiRwYXJlbnQ/dGhpcy4kcGFyZW50LiRyb290OnRoaXMsdGhpcy4kY2hpbGRyZW49W10sdGhpcy4kcmVmcz17fSx0aGlzLiRlbHM9e30sdGhpcy5fd2F0Y2hlcnM9W10sdGhpcy5fZGlyZWN0aXZlcz1bXSx0aGlzLl91aWQ9QW4rKyx0aGlzLl9pc1Z1ZT0hMCx0aGlzLl9ldmVudHM9e30sdGhpcy5fZXZlbnRzQ291bnQ9e30sdGhpcy5faXNGcmFnbWVudD0hMSx0aGlzLl9mcmFnbWVudD10aGlzLl9mcmFnbWVudFN0YXJ0PXRoaXMuX2ZyYWdtZW50RW5kPW51bGwsdGhpcy5faXNDb21waWxlZD10aGlzLl9pc0Rlc3Ryb3llZD10aGlzLl9pc1JlYWR5PXRoaXMuX2lzQXR0YWNoZWQ9dGhpcy5faXNCZWluZ0Rlc3Ryb3llZD10aGlzLl92Rm9yUmVtb3Zpbmc9ITEsdGhpcy5fdW5saW5rRm49bnVsbCx0aGlzLl9jb250ZXh0PXQuX2NvbnRleHR8fHRoaXMuJHBhcmVudCx0aGlzLl9zY29wZT10Ll9zY29wZSx0aGlzLl9mcmFnPXQuX2ZyYWcsdGhpcy5fZnJhZyYmdGhpcy5fZnJhZy5jaGlsZHJlbi5wdXNoKHRoaXMpLHRoaXMuJHBhcmVudCYmdGhpcy4kcGFyZW50LiRjaGlsZHJlbi5wdXNoKHRoaXMpLHQ9dGhpcy4kb3B0aW9ucz14dCh0aGlzLmNvbnN0cnVjdG9yLm9wdGlvbnMsdCx0aGlzKSx0aGlzLl91cGRhdGVSZWYoKSx0aGlzLl9kYXRhPXt9LHRoaXMuX3J1bnRpbWVEYXRhPXQuZGF0YSx0aGlzLl9jYWxsSG9vayhcImluaXRcIiksdGhpcy5faW5pdFN0YXRlKCksdGhpcy5faW5pdEV2ZW50cygpLHRoaXMuX2NhbGxIb29rKFwiY3JlYXRlZFwiKSx0LmVsJiZ0aGlzLiRtb3VudCh0LmVsKX19ZnVuY3Rpb24gTnQodCl7aWYodm9pZCAwPT09dClyZXR1cm5cImVvZlwiO3ZhciBlPXQuY2hhckNvZGVBdCgwKTtzd2l0Y2goZSl7Y2FzZSA5MTpjYXNlIDkzOmNhc2UgNDY6Y2FzZSAzNDpjYXNlIDM5OmNhc2UgNDg6cmV0dXJuIHQ7Y2FzZSA5NTpjYXNlIDM2OnJldHVyblwiaWRlbnRcIjtjYXNlIDMyOmNhc2UgOTpjYXNlIDEwOmNhc2UgMTM6Y2FzZSAxNjA6Y2FzZSA2NTI3OTpjYXNlIDgyMzI6Y2FzZSA4MjMzOnJldHVyblwid3NcIn1yZXR1cm4gZT49OTcmJjEyMj49ZXx8ZT49NjUmJjkwPj1lP1wiaWRlbnRcIjplPj00OSYmNTc+PWU/XCJudW1iZXJcIjpcImVsc2VcIn1mdW5jdGlvbiBqdCh0KXt2YXIgZT10LnRyaW0oKTtyZXR1cm5cIjBcIj09PXQuY2hhckF0KDApJiZpc05hTih0KT8hMTpuKGUpP2goZSk6XCIqXCIrZX1mdW5jdGlvbiBFdCh0KXtmdW5jdGlvbiBlKCl7dmFyIGU9dFtjKzFdO3JldHVybiB1PT09TG4mJlwiJ1wiPT09ZXx8dT09PUhuJiYnXCInPT09ZT8oYysrLG49XCJcXFxcXCIrZSxwW1RuXSgpLCEwKTp2b2lkIDB9dmFyIGksbixyLHMsbyxhLGgsbD1bXSxjPS0xLHU9Rm4sZj0wLHA9W107Zm9yKHBbTm5dPWZ1bmN0aW9uKCl7dm9pZCAwIT09ciYmKGwucHVzaChyKSxyPXZvaWQgMCl9LHBbVG5dPWZ1bmN0aW9uKCl7dm9pZCAwPT09cj9yPW46cis9bn0scFtqbl09ZnVuY3Rpb24oKXtwW1RuXSgpLGYrK30scFtFbl09ZnVuY3Rpb24oKXtpZihmPjApZi0tLHU9Um4scFtUbl0oKTtlbHNle2lmKGY9MCxyPWp0KHIpLHI9PT0hMSlyZXR1cm4hMTtwW05uXSgpfX07bnVsbCE9dTspaWYoYysrLGk9dFtjXSxcIlxcXFxcIiE9PWl8fCFlKCkpe2lmKHM9TnQoaSksaD1Jblt1XSxvPWhbc118fGhbXCJlbHNlXCJdfHxXbixvPT09V24pcmV0dXJuO2lmKHU9b1swXSxhPXBbb1sxXV0sYSYmKG49b1syXSxuPXZvaWQgMD09PW4/aTpuLGEoKT09PSExKSlyZXR1cm47aWYodT09PU1uKXJldHVybiBsLnJhdz10LGx9fWZ1bmN0aW9uIEZ0KHQpe3ZhciBlPU9uLmdldCh0KTtyZXR1cm4gZXx8KGU9RXQodCksZSYmT24ucHV0KHQsZSkpLGV9ZnVuY3Rpb24gU3QodCxlKXtyZXR1cm4gSXQoZSkuZ2V0KHQpfWZ1bmN0aW9uIER0KGUsaSxuKXt2YXIgcj1lO2lmKFwic3RyaW5nXCI9PXR5cGVvZiBpJiYoaT1FdChpKSksIWl8fCFtKGUpKXJldHVybiExO2Zvcih2YXIgcyxvLGE9MCxoPWkubGVuZ3RoO2g+YTthKyspcz1lLG89aVthXSxcIipcIj09PW8uY2hhckF0KDApJiYobz1JdChvLnNsaWNlKDEpKS5nZXQuY2FsbChyLHIpKSxoLTE+YT8oZT1lW29dLG0oZSl8fChlPXt9LHQocyxvLGUpKSk6T2koZSk/ZS4kc2V0KG8sbik6byBpbiBlP2Vbb109bjp0KGUsbyxuKTtyZXR1cm4hMH1mdW5jdGlvbiBQdCh0LGUpe3ZhciBpPWlyLmxlbmd0aDtyZXR1cm4gaXJbaV09ZT90LnJlcGxhY2UoS24sXCJcXFxcblwiKTp0LCdcIicraSsnXCInfWZ1bmN0aW9uIFJ0KHQpe3ZhciBlPXQuY2hhckF0KDApLGk9dC5zbGljZSgxKTtyZXR1cm4gSm4udGVzdChpKT90OihpPWkuaW5kZXhPZignXCInKT4tMT9pLnJlcGxhY2UoWG4sTHQpOmksZStcInNjb3BlLlwiK2kpfWZ1bmN0aW9uIEx0KHQsZSl7cmV0dXJuIGlyW2VdfWZ1bmN0aW9uIEh0KHQpe1FuLnRlc3QodCksaXIubGVuZ3RoPTA7dmFyIGU9dC5yZXBsYWNlKFpuLFB0KS5yZXBsYWNlKEduLFwiXCIpO3JldHVybiBlPShcIiBcIitlKS5yZXBsYWNlKHRyLFJ0KS5yZXBsYWNlKFhuLEx0KSxNdChlKX1mdW5jdGlvbiBNdCh0KXt0cnl7cmV0dXJuIG5ldyBGdW5jdGlvbihcInNjb3BlXCIsXCJyZXR1cm4gXCIrdCtcIjtcIil9Y2F0Y2goZSl7fX1mdW5jdGlvbiBXdCh0KXt2YXIgZT1GdCh0KTtyZXR1cm4gZT9mdW5jdGlvbih0LGkpe0R0KHQsZSxpKX06dm9pZCAwfWZ1bmN0aW9uIEl0KHQsZSl7dD10LnRyaW0oKTt2YXIgaT16bi5nZXQodCk7aWYoaSlyZXR1cm4gZSYmIWkuc2V0JiYoaS5zZXQ9V3QoaS5leHApKSxpO3ZhciBuPXtleHA6dH07cmV0dXJuIG4uZ2V0PUJ0KHQpJiZ0LmluZGV4T2YoXCJbXCIpPDA/TXQoXCJzY29wZS5cIit0KTpIdCh0KSxlJiYobi5zZXQ9V3QodCkpLHpuLnB1dCh0LG4pLG59ZnVuY3Rpb24gQnQodCl7cmV0dXJuIFluLnRlc3QodCkmJiFlci50ZXN0KHQpJiZcIk1hdGguXCIhPT10LnNsaWNlKDAsNSl9ZnVuY3Rpb24gVnQoKXtycj1bXSxzcj1bXSxvcj17fSxhcj17fSxocj1scj0hMX1mdW5jdGlvbiB6dCgpe1V0KHJyKSxscj0hMCxVdChzciksamkmJnBuLmRldnRvb2xzJiZqaS5lbWl0KFwiZmx1c2hcIiksVnQoKX1mdW5jdGlvbiBVdCh0KXtmb3IoQm49MDtCbjx0Lmxlbmd0aDtCbisrKXt2YXIgZT10W0JuXSxpPWUuaWQ7b3JbaV09bnVsbCxlLnJ1bigpfX1mdW5jdGlvbiBKdCh0KXt2YXIgZT10LmlkO2lmKG51bGw9PW9yW2VdKWlmKGxyJiYhdC51c2VyKXNyLnNwbGljZShCbisxLDAsdCk7ZWxzZXt2YXIgaT10LnVzZXI/c3I6cnI7b3JbZV09aS5sZW5ndGgsaS5wdXNoKHQpLGhyfHwoaHI9ITAsV2koenQpKX19ZnVuY3Rpb24gcXQodCxlLGksbil7biYmdih0aGlzLG4pO3ZhciByPVwiZnVuY3Rpb25cIj09dHlwZW9mIGU7aWYodGhpcy52bT10LHQuX3dhdGNoZXJzLnB1c2godGhpcyksdGhpcy5leHByZXNzaW9uPWUsdGhpcy5jYj1pLHRoaXMuaWQ9Kytjcix0aGlzLmFjdGl2ZT0hMCx0aGlzLmRpcnR5PXRoaXMubGF6eSx0aGlzLmRlcHM9W10sdGhpcy5uZXdEZXBzPVtdLHRoaXMuZGVwSWRzPU9iamVjdC5jcmVhdGUobnVsbCksdGhpcy5uZXdEZXBJZHM9bnVsbCx0aGlzLnByZXZFcnJvcj1udWxsLHIpdGhpcy5nZXR0ZXI9ZSx0aGlzLnNldHRlcj12b2lkIDA7ZWxzZXt2YXIgcz1JdChlLHRoaXMudHdvV2F5KTt0aGlzLmdldHRlcj1zLmdldCx0aGlzLnNldHRlcj1zLnNldH10aGlzLnZhbHVlPXRoaXMubGF6eT92b2lkIDA6dGhpcy5nZXQoKSx0aGlzLnF1ZXVlZD10aGlzLnNoYWxsb3c9ITF9ZnVuY3Rpb24gUXQodCl7dmFyIGUsaTtpZihPaSh0KSlmb3IoZT10Lmxlbmd0aDtlLS07KVF0KHRbZV0pO2Vsc2UgaWYobSh0KSlmb3IoaT1PYmplY3Qua2V5cyh0KSxlPWkubGVuZ3RoO2UtLTspUXQodFtpW2VdXSl9ZnVuY3Rpb24gR3QodCl7cmV0dXJuIGV0KHQpJiZvdCh0LmNvbnRlbnQpfWZ1bmN0aW9uIEt0KHQsZSl7dmFyIGk9ZT90OnQudHJpbSgpLG49ZnIuZ2V0KGkpO2lmKG4pcmV0dXJuIG47dmFyIHI9ZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLHM9dC5tYXRjaCh2ciksbz1tci50ZXN0KHQpO2lmKHN8fG8pe3ZhciBhPXMmJnNbMV0saD1kclthXXx8ZHIuZWZhdWx0LGw9aFswXSxjPWhbMV0sdT1oWzJdLGY9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtmb3IoZi5pbm5lckhUTUw9Yyt0K3U7bC0tOylmPWYubGFzdENoaWxkO2Zvcih2YXIgcDtwPWYuZmlyc3RDaGlsZDspci5hcHBlbmRDaGlsZChwKX1lbHNlIHIuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodCkpO3JldHVybiBlfHxZKHIpLGZyLnB1dChpLHIpLHJ9ZnVuY3Rpb24gWnQodCl7aWYoR3QodCkpcmV0dXJuIFkodC5jb250ZW50KSx0LmNvbnRlbnQ7aWYoXCJTQ1JJUFRcIj09PXQudGFnTmFtZSlyZXR1cm4gS3QodC50ZXh0Q29udGVudCk7Zm9yKHZhciBlLGk9WHQodCksbj1kb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7ZT1pLmZpcnN0Q2hpbGQ7KW4uYXBwZW5kQ2hpbGQoZSk7cmV0dXJuIFkobiksbn1mdW5jdGlvbiBYdCh0KXtpZighdC5xdWVyeVNlbGVjdG9yQWxsKXJldHVybiB0LmNsb25lTm9kZSgpO3ZhciBlLGksbixyPXQuY2xvbmVOb2RlKCEwKTtpZihncil7dmFyIHM9cjtpZihHdCh0KSYmKHQ9dC5jb250ZW50LHM9ci5jb250ZW50KSxpPXQucXVlcnlTZWxlY3RvckFsbChcInRlbXBsYXRlXCIpLGkubGVuZ3RoKWZvcihuPXMucXVlcnlTZWxlY3RvckFsbChcInRlbXBsYXRlXCIpLGU9bi5sZW5ndGg7ZS0tOyluW2VdLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKFh0KGlbZV0pLG5bZV0pfWlmKF9yKWlmKFwiVEVYVEFSRUFcIj09PXQudGFnTmFtZSlyLnZhbHVlPXQudmFsdWU7ZWxzZSBpZihpPXQucXVlcnlTZWxlY3RvckFsbChcInRleHRhcmVhXCIpLGkubGVuZ3RoKWZvcihuPXIucXVlcnlTZWxlY3RvckFsbChcInRleHRhcmVhXCIpLGU9bi5sZW5ndGg7ZS0tOyluW2VdLnZhbHVlPWlbZV0udmFsdWU7cmV0dXJuIHJ9ZnVuY3Rpb24gWXQodCxlLGkpe3ZhciBuLHI7cmV0dXJuIG90KHQpPyhZKHQpLGU/WHQodCk6dCk6KFwic3RyaW5nXCI9PXR5cGVvZiB0P2l8fFwiI1wiIT09dC5jaGFyQXQoMCk/cj1LdCh0LGkpOihyPXByLmdldCh0KSxyfHwobj1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0LnNsaWNlKDEpKSxuJiYocj1adChuKSxwci5wdXQodCxyKSkpKTp0Lm5vZGVUeXBlJiYocj1adCh0KSksciYmZT9YdChyKTpyKX1mdW5jdGlvbiB0ZSh0LGUsaSxuLHIscyl7dGhpcy5jaGlsZHJlbj1bXSx0aGlzLmNoaWxkRnJhZ3M9W10sdGhpcy52bT1lLHRoaXMuc2NvcGU9cix0aGlzLmluc2VydGVkPSExLHRoaXMucGFyZW50RnJhZz1zLHMmJnMuY2hpbGRGcmFncy5wdXNoKHRoaXMpLHRoaXMudW5saW5rPXQoZSxpLG4scix0aGlzKTt2YXIgbz10aGlzLnNpbmdsZT0xPT09aS5jaGlsZE5vZGVzLmxlbmd0aCYmIWkuY2hpbGROb2Rlc1swXS5fX3ZfYW5jaG9yO28/KHRoaXMubm9kZT1pLmNoaWxkTm9kZXNbMF0sdGhpcy5iZWZvcmU9ZWUsdGhpcy5yZW1vdmU9aWUpOih0aGlzLm5vZGU9aXQoXCJmcmFnbWVudC1zdGFydFwiKSx0aGlzLmVuZD1pdChcImZyYWdtZW50LWVuZFwiKSx0aGlzLmZyYWc9aSxVKHRoaXMubm9kZSxpKSxpLmFwcGVuZENoaWxkKHRoaXMuZW5kKSx0aGlzLmJlZm9yZT1uZSx0aGlzLnJlbW92ZT1yZSksdGhpcy5ub2RlLl9fdl9mcmFnPXRoaXN9ZnVuY3Rpb24gZWUodCxlKXt0aGlzLmluc2VydGVkPSEwO3ZhciBpPWUhPT0hMT9EOkI7aSh0aGlzLm5vZGUsdCx0aGlzLnZtKSxIKHRoaXMubm9kZSkmJnRoaXMuY2FsbEhvb2soc2UpfWZ1bmN0aW9uIGllKCl7dGhpcy5pbnNlcnRlZD0hMTt2YXIgdD1IKHRoaXMubm9kZSksZT10aGlzO3RoaXMuYmVmb3JlUmVtb3ZlKCksUCh0aGlzLm5vZGUsdGhpcy52bSxmdW5jdGlvbigpe3QmJmUuY2FsbEhvb2sob2UpLGUuZGVzdHJveSgpfSl9ZnVuY3Rpb24gbmUodCxlKXt0aGlzLmluc2VydGVkPSEwO3ZhciBpPXRoaXMudm0sbj1lIT09ITE/RDpCO3J0KHRoaXMubm9kZSx0aGlzLmVuZCxmdW5jdGlvbihlKXtuKGUsdCxpKX0pLEgodGhpcy5ub2RlKSYmdGhpcy5jYWxsSG9vayhzZSl9ZnVuY3Rpb24gcmUoKXt0aGlzLmluc2VydGVkPSExO3ZhciB0PXRoaXMsZT1IKHRoaXMubm9kZSk7dGhpcy5iZWZvcmVSZW1vdmUoKSxzdCh0aGlzLm5vZGUsdGhpcy5lbmQsdGhpcy52bSx0aGlzLmZyYWcsZnVuY3Rpb24oKXtlJiZ0LmNhbGxIb29rKG9lKSx0LmRlc3Ryb3koKX0pfWZ1bmN0aW9uIHNlKHQpeyF0Ll9pc0F0dGFjaGVkJiZIKHQuJGVsKSYmdC5fY2FsbEhvb2soXCJhdHRhY2hlZFwiKX1mdW5jdGlvbiBvZSh0KXt0Ll9pc0F0dGFjaGVkJiYhSCh0LiRlbCkmJnQuX2NhbGxIb29rKFwiZGV0YWNoZWRcIil9ZnVuY3Rpb24gYWUodCxlKXt0aGlzLnZtPXQ7dmFyIGksbj1cInN0cmluZ1wiPT10eXBlb2YgZTtufHxldChlKT9pPVl0KGUsITApOihpPWRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSxpLmFwcGVuZENoaWxkKGUpKSx0aGlzLnRlbXBsYXRlPWk7dmFyIHIscz10LmNvbnN0cnVjdG9yLmNpZDtpZihzPjApe3ZhciBvPXMrKG4/ZTphdChlKSk7cj13ci5nZXQobykscnx8KHI9VGUoaSx0LiRvcHRpb25zLCEwKSx3ci5wdXQobyxyKSl9ZWxzZSByPVRlKGksdC4kb3B0aW9ucywhMCk7dGhpcy5saW5rZXI9cn1mdW5jdGlvbiBoZSh0LGUsaSl7dmFyIG49dC5ub2RlLnByZXZpb3VzU2libGluZztpZihuKXtmb3IodD1uLl9fdl9mcmFnOyEodCYmdC5mb3JJZD09PWkmJnQuaW5zZXJ0ZWR8fG49PT1lKTspe2lmKG49bi5wcmV2aW91c1NpYmxpbmcsIW4pcmV0dXJuO3Q9bi5fX3ZfZnJhZ31yZXR1cm4gdH19ZnVuY3Rpb24gbGUodCl7dmFyIGU9dC5ub2RlO2lmKHQuZW5kKWZvcig7IWUuX192dWVfXyYmZSE9PXQuZW5kJiZlLm5leHRTaWJsaW5nOyllPWUubmV4dFNpYmxpbmc7cmV0dXJuIGUuX192dWVfX31mdW5jdGlvbiBjZSh0KXtmb3IodmFyIGU9LTEsaT1uZXcgQXJyYXkoTWF0aC5mbG9vcih0KSk7KytlPHQ7KWlbZV09ZTtyZXR1cm4gaX1mdW5jdGlvbiB1ZSh0LGUsaSl7Zm9yKHZhciBuLHIscyxvPWU/W106bnVsbCxhPTAsaD10Lm9wdGlvbnMubGVuZ3RoO2g+YTthKyspaWYobj10Lm9wdGlvbnNbYV0scz1pP24uaGFzQXR0cmlidXRlKFwic2VsZWN0ZWRcIik6bi5zZWxlY3RlZCl7aWYocj1uLmhhc093blByb3BlcnR5KFwiX3ZhbHVlXCIpP24uX3ZhbHVlOm4udmFsdWUsIWUpcmV0dXJuIHI7by5wdXNoKHIpfXJldHVybiBvfWZ1bmN0aW9uIGZlKHQsZSl7Zm9yKHZhciBpPXQubGVuZ3RoO2ktLTspaWYoQyh0W2ldLGUpKXJldHVybiBpO3JldHVybi0xfWZ1bmN0aW9uIHBlKHQsZSl7dmFyIGk9ZS5tYXAoZnVuY3Rpb24odCl7dmFyIGU9dC5jaGFyQ29kZUF0KDApO3JldHVybiBlPjQ3JiY1OD5lP3BhcnNlSW50KHQsMTApOjE9PT10Lmxlbmd0aCYmKGU9dC50b1VwcGVyQ2FzZSgpLmNoYXJDb2RlQXQoMCksZT42NCYmOTE+ZSk/ZTpCclt0XX0pO3JldHVybiBpPVtdLmNvbmNhdC5hcHBseShbXSxpKSxmdW5jdGlvbihlKXtyZXR1cm4gaS5pbmRleE9mKGUua2V5Q29kZSk+LTE/dC5jYWxsKHRoaXMsZSk6dm9pZCAwfX1mdW5jdGlvbiBkZSh0KXtyZXR1cm4gZnVuY3Rpb24oZSl7cmV0dXJuIGUuc3RvcFByb3BhZ2F0aW9uKCksdC5jYWxsKHRoaXMsZSl9fWZ1bmN0aW9uIHZlKHQpe3JldHVybiBmdW5jdGlvbihlKXtyZXR1cm4gZS5wcmV2ZW50RGVmYXVsdCgpLHQuY2FsbCh0aGlzLGUpfX1mdW5jdGlvbiBtZSh0KXtyZXR1cm4gZnVuY3Rpb24oZSl7cmV0dXJuIGUudGFyZ2V0PT09ZS5jdXJyZW50VGFyZ2V0P3QuY2FsbCh0aGlzLGUpOnZvaWQgMH19ZnVuY3Rpb24gZ2UodCl7aWYocXJbdF0pcmV0dXJuIHFyW3RdO3ZhciBlPV9lKHQpO3JldHVybiBxclt0XT1xcltlXT1lLGV9ZnVuY3Rpb24gX2UodCl7dD11KHQpO3ZhciBlPWwodCksaT1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpK2Uuc2xpY2UoMSk7UXJ8fChRcj1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpKTtmb3IodmFyIG4scj16ci5sZW5ndGg7ci0tOylpZihuPVVyW3JdK2ksbiBpbiBRci5zdHlsZSlyZXR1cm4genJbcl0rdDtyZXR1cm4gZSBpbiBRci5zdHlsZT90OnZvaWQgMH1mdW5jdGlvbiBiZSh0KXtmb3IodmFyIGU9e30saT10LnRyaW0oKS5zcGxpdCgvXFxzKy8pLG49aS5sZW5ndGg7bi0tOyllW2lbbl1dPSEwO3JldHVybiBlfWZ1bmN0aW9uIHllKHQsZSl7cmV0dXJuIE9pKHQpP3QuaW5kZXhPZihlKT4tMTppKHQsZSl9ZnVuY3Rpb24gd2UodCxlLGkpe2Z1bmN0aW9uIG4oKXsrK3M+PXI/aSgpOnRbc10uY2FsbChlLG4pfXZhciByPXQubGVuZ3RoLHM9MDt0WzBdLmNhbGwoZSxuKX1mdW5jdGlvbiBDZSh0KXt1cy5wdXNoKHQpLGZzfHwoZnM9ITAsV2koJGUpKX1mdW5jdGlvbiAkZSgpe2Zvcih2YXIgdD1kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQub2Zmc2V0SGVpZ2h0LGU9MDtlPHVzLmxlbmd0aDtlKyspdXNbZV0oKTtyZXR1cm4gdXM9W10sZnM9ITEsdH1mdW5jdGlvbiBrZSh0LGUsaSxuKXt0aGlzLmlkPWUsdGhpcy5lbD10LHRoaXMuZW50ZXJDbGFzcz1pJiZpLmVudGVyQ2xhc3N8fGUrXCItZW50ZXJcIix0aGlzLmxlYXZlQ2xhc3M9aSYmaS5sZWF2ZUNsYXNzfHxlK1wiLWxlYXZlXCIsdGhpcy5ob29rcz1pLHRoaXMudm09bix0aGlzLnBlbmRpbmdDc3NFdmVudD10aGlzLnBlbmRpbmdDc3NDYj10aGlzLmNhbmNlbD10aGlzLnBlbmRpbmdKc0NiPXRoaXMub3A9dGhpcy5jYj1udWxsLHRoaXMuanVzdEVudGVyZWQ9ITEsdGhpcy5lbnRlcmVkPXRoaXMubGVmdD0hMSx0aGlzLnR5cGVDYWNoZT17fSx0aGlzLnR5cGU9aSYmaS50eXBlO3ZhciByPXRoaXM7W1wiZW50ZXJOZXh0VGlja1wiLFwiZW50ZXJEb25lXCIsXCJsZWF2ZU5leHRUaWNrXCIsXCJsZWF2ZURvbmVcIl0uZm9yRWFjaChmdW5jdGlvbih0KXtyW3RdPXAoclt0XSxyKX0pfWZ1bmN0aW9uIHhlKHQpe2lmKC9zdmckLy50ZXN0KHQubmFtZXNwYWNlVVJJKSl7dmFyIGU9dC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtyZXR1cm4hKGUud2lkdGh8fGUuaGVpZ2h0KX1yZXR1cm4hKHQub2Zmc2V0V2lkdGh8fHQub2Zmc2V0SGVpZ2h0fHx0LmdldENsaWVudFJlY3RzKCkubGVuZ3RoKX1mdW5jdGlvbiBBZSh0LGUpe2Zvcih2YXIgaSxyLHMsbyxhLGgsYyxmPVtdLHA9T2JqZWN0LmtleXMoZSksZD1wLmxlbmd0aDtkLS07KXI9cFtkXSxpPWVbcl18fHdzLGE9bChyKSxDcy50ZXN0KGEpJiYoYz17bmFtZTpyLHBhdGg6YSxvcHRpb25zOmksbW9kZTp5cy5PTkVfV0FZLHJhdzpudWxsfSxzPXUociksbnVsbD09PShvPVcodCxzKSkmJihudWxsIT09KG89Vyh0LHMrXCIuc3luY1wiKSk/Yy5tb2RlPXlzLlRXT19XQVk6bnVsbCE9PShvPVcodCxzK1wiLm9uY2VcIikpJiYoYy5tb2RlPXlzLk9ORV9USU1FKSksbnVsbCE9PW8/KGMucmF3PW8saD1BKG8pLG89aC5leHByZXNzaW9uLGMuZmlsdGVycz1oLmZpbHRlcnMsbihvKSYmIWguZmlsdGVycz9jLm9wdGltaXplZExpdGVyYWw9ITA6Yy5keW5hbWljPSEwLGMucGFyZW50UGF0aD1vKTpudWxsIT09KG89TSh0LHMpKSYmKGMucmF3PW8pLGYucHVzaChjKSk7cmV0dXJuIE9lKGYpfWZ1bmN0aW9uIE9lKHQpe3JldHVybiBmdW5jdGlvbihlLGkpe2UuX3Byb3BzPXt9O2Zvcih2YXIgbixyLHMsbCxjLHU9dC5sZW5ndGg7dS0tOylpZihuPXRbdV0sYz1uLnJhdyxyPW4ucGF0aCxzPW4ub3B0aW9ucyxlLl9wcm9wc1tyXT1uLG51bGw9PT1jKW10KGUsbix2b2lkIDApO2Vsc2UgaWYobi5keW5hbWljKW4ubW9kZT09PXlzLk9ORV9USU1FPyhsPShpfHxlLl9jb250ZXh0fHxlKS4kZ2V0KG4ucGFyZW50UGF0aCksbXQoZSxuLGwpKTplLl9jb250ZXh0P2UuX2JpbmREaXIoe25hbWU6XCJwcm9wXCIsZGVmOmNzLHByb3A6bn0sbnVsbCxudWxsLGkpOm10KGUsbixlLiRnZXQobi5wYXJlbnRQYXRoKSk7ZWxzZSBpZihuLm9wdGltaXplZExpdGVyYWwpe3ZhciBmPWgoYyk7bD1mPT09Yz9hKG8oYykpOmYsbXQoZSxuLGwpfWVsc2UgbD1zLnR5cGU9PT1Cb29sZWFuJiZcIlwiPT09Yz8hMDpjLG10KGUsbixsKX19ZnVuY3Rpb24gVGUodCxlLGkpe3ZhciBuPWl8fCFlLl9hc0NvbXBvbmVudD9QZSh0LGUpOm51bGwscj1uJiZuLnRlcm1pbmFsfHxcIlNDUklQVFwiPT09dC50YWdOYW1lfHwhdC5oYXNDaGlsZE5vZGVzKCk/bnVsbDpJZSh0LmNoaWxkTm9kZXMsZSk7cmV0dXJuIGZ1bmN0aW9uKHQsZSxpLHMsbyl7dmFyIGE9ZChlLmNoaWxkTm9kZXMpLGg9TmUoZnVuY3Rpb24oKXtuJiZuKHQsZSxpLHMsbyksciYmcih0LGEsaSxzLG8pfSx0KTtyZXR1cm4gRWUodCxoKX19ZnVuY3Rpb24gTmUodCxlKXtlLl9kaXJlY3RpdmVzPVtdO3ZhciBpPWUuX2RpcmVjdGl2ZXMubGVuZ3RoO3QoKTt2YXIgbj1lLl9kaXJlY3RpdmVzLnNsaWNlKGkpO24uc29ydChqZSk7Zm9yKHZhciByPTAscz1uLmxlbmd0aDtzPnI7cisrKW5bcl0uX2JpbmQoKTtyZXR1cm4gbn1mdW5jdGlvbiBqZSh0LGUpe3JldHVybiB0PXQuZGVzY3JpcHRvci5kZWYucHJpb3JpdHl8fE5zLGU9ZS5kZXNjcmlwdG9yLmRlZi5wcmlvcml0eXx8TnMsdD5lPy0xOnQ9PT1lPzA6MX1mdW5jdGlvbiBFZSh0LGUsaSxuKXtmdW5jdGlvbiByKHIpe0ZlKHQsZSxyKSxpJiZuJiZGZShpLG4pfXJldHVybiByLmRpcnM9ZSxyfWZ1bmN0aW9uIEZlKHQsZSxpKXtmb3IodmFyIG49ZS5sZW5ndGg7bi0tOyllW25dLl90ZWFyZG93bigpfWZ1bmN0aW9uIFNlKHQsZSxpLG4pe3ZhciByPUFlKGUsaSkscz1OZShmdW5jdGlvbigpe3IodCxuKX0sdCk7cmV0dXJuIEVlKHQscyl9ZnVuY3Rpb24gRGUodCxlLGkpe3ZhciBuLHIscz1lLl9jb250YWluZXJBdHRycyxvPWUuX3JlcGxhY2VyQXR0cnM7cmV0dXJuIDExIT09dC5ub2RlVHlwZSYmKGUuX2FzQ29tcG9uZW50PyhzJiZpJiYobj1RZShzLGkpKSxvJiYocj1RZShvLGUpKSk6cj1RZSh0LmF0dHJpYnV0ZXMsZSkpLGUuX2NvbnRhaW5lckF0dHJzPWUuX3JlcGxhY2VyQXR0cnM9bnVsbCxmdW5jdGlvbih0LGUsaSl7dmFyIHMsbz10Ll9jb250ZXh0O28mJm4mJihzPU5lKGZ1bmN0aW9uKCl7bihvLGUsbnVsbCxpKX0sbykpO3ZhciBhPU5lKGZ1bmN0aW9uKCl7ciYmcih0LGUpfSx0KTtyZXR1cm4gRWUodCxhLG8scyl9fWZ1bmN0aW9uIFBlKHQsZSl7dmFyIGk9dC5ub2RlVHlwZTtyZXR1cm4gMT09PWkmJlwiU0NSSVBUXCIhPT10LnRhZ05hbWU/UmUodCxlKTozPT09aSYmdC5kYXRhLnRyaW0oKT9MZSh0LGUpOm51bGx9ZnVuY3Rpb24gUmUodCxlKXtpZihcIlRFWFRBUkVBXCI9PT10LnRhZ05hbWUpe3ZhciBpPU4odC52YWx1ZSk7aSYmKHQuc2V0QXR0cmlidXRlKFwiOnZhbHVlXCIsaihpKSksdC52YWx1ZT1cIlwiKX12YXIgbixyPXQuaGFzQXR0cmlidXRlcygpO3JldHVybiByJiYobj1VZSh0LGUpKSxufHwobj1WZSh0LGUpKSxufHwobj16ZSh0LGUpKSwhbiYmciYmKG49UWUodC5hdHRyaWJ1dGVzLGUpKSxufWZ1bmN0aW9uIExlKHQsZSl7aWYodC5fc2tpcClyZXR1cm4gSGU7dmFyIGk9Tih0Lndob2xlVGV4dCk7aWYoIWkpcmV0dXJuIG51bGw7Zm9yKHZhciBuPXQubmV4dFNpYmxpbmc7biYmMz09PW4ubm9kZVR5cGU7KW4uX3NraXA9ITAsbj1uLm5leHRTaWJsaW5nO2Zvcih2YXIgcixzLG89ZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLGE9MCxoPWkubGVuZ3RoO2g+YTthKyspcz1pW2FdLHI9cy50YWc/TWUocyxlKTpkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShzLnZhbHVlKSxvLmFwcGVuZENoaWxkKHIpO3JldHVybiBXZShpLG8sZSl9ZnVuY3Rpb24gSGUodCxlKXt6KGUpfWZ1bmN0aW9uIE1lKHQsZSl7ZnVuY3Rpb24gaShlKXtpZighdC5kZXNjcmlwdG9yKXt2YXIgaT1BKHQudmFsdWUpO3QuZGVzY3JpcHRvcj17bmFtZTplLGRlZjpvc1tlXSxleHByZXNzaW9uOmkuZXhwcmVzc2lvbixmaWx0ZXJzOmkuZmlsdGVyc319fXZhciBuO3JldHVybiB0Lm9uZVRpbWU/bj1kb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0LnZhbHVlKTp0Lmh0bWw/KG49ZG9jdW1lbnQuY3JlYXRlQ29tbWVudChcInYtaHRtbFwiKSxpKFwiaHRtbFwiKSk6KG49ZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCIgXCIpLGkoXCJ0ZXh0XCIpKSxufWZ1bmN0aW9uIFdlKHQsZSl7cmV0dXJuIGZ1bmN0aW9uKGksbixyLHMpe2Zvcih2YXIgbyxhLGgsbD1lLmNsb25lTm9kZSghMCksYz1kKGwuY2hpbGROb2RlcyksdT0wLGY9dC5sZW5ndGg7Zj51O3UrKylvPXRbdV0sYT1vLnZhbHVlLG8udGFnJiYoaD1jW3VdLG8ub25lVGltZT8oYT0oc3x8aSkuJGV2YWwoYSksby5odG1sP0ooaCxZdChhLCEwKSk6aC5kYXRhPWEpOmkuX2JpbmREaXIoby5kZXNjcmlwdG9yLGgscixzKSk7SihuLGwpfX1mdW5jdGlvbiBJZSh0LGUpe2Zvcih2YXIgaSxuLHIscz1bXSxvPTAsYT10Lmxlbmd0aDthPm87bysrKXI9dFtvXSxpPVBlKHIsZSksbj1pJiZpLnRlcm1pbmFsfHxcIlNDUklQVFwiPT09ci50YWdOYW1lfHwhci5oYXNDaGlsZE5vZGVzKCk/bnVsbDpJZShyLmNoaWxkTm9kZXMsZSkscy5wdXNoKGksbik7cmV0dXJuIHMubGVuZ3RoP0JlKHMpOm51bGx9ZnVuY3Rpb24gQmUodCl7cmV0dXJuIGZ1bmN0aW9uKGUsaSxuLHIscyl7Zm9yKHZhciBvLGEsaCxsPTAsYz0wLHU9dC5sZW5ndGg7dT5sO2MrKyl7bz1pW2NdLGE9dFtsKytdLGg9dFtsKytdO3ZhciBmPWQoby5jaGlsZE5vZGVzKTthJiZhKGUsbyxuLHIscyksaCYmaChlLGYsbixyLHMpfX19ZnVuY3Rpb24gVmUodCxlKXt2YXIgaT10LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtpZighd24udGVzdChpKSl7dmFyIG49QXQoZSxcImVsZW1lbnREaXJlY3RpdmVzXCIsaSk7cmV0dXJuIG4/cWUodCxpLFwiXCIsZSxuKTp2b2lkIDB9fWZ1bmN0aW9uIHplKHQsZSl7dmFyIGk9ZHQodCxlKTtpZihpKXt2YXIgbj1udCh0KSxyPXtuYW1lOlwiY29tcG9uZW50XCIscmVmOm4sZXhwcmVzc2lvbjppLmlkLGRlZjpicy5jb21wb25lbnQsbW9kaWZpZXJzOntsaXRlcmFsOiFpLmR5bmFtaWN9fSxzPWZ1bmN0aW9uKHQsZSxpLHMsbyl7biYmcHQoKHN8fHQpLiRyZWZzLG4sbnVsbCksdC5fYmluZERpcihyLGUsaSxzLG8pfTtyZXR1cm4gcy50ZXJtaW5hbD0hMCxzfX1mdW5jdGlvbiBVZSh0LGUpe2lmKG51bGwhPT1NKHQsXCJ2LXByZVwiKSlyZXR1cm4gSmU7aWYodC5oYXNBdHRyaWJ1dGUoXCJ2LWVsc2VcIikpe3ZhciBpPXQucHJldmlvdXNFbGVtZW50U2libGluZztpZihpJiZpLmhhc0F0dHJpYnV0ZShcInYtaWZcIikpcmV0dXJuIEplfWZvcih2YXIgbixyLHM9MCxvPVRzLmxlbmd0aDtvPnM7cysrKWlmKHI9VHNbc10sbj10LmdldEF0dHJpYnV0ZShcInYtXCIrciksbnVsbCE9bilyZXR1cm4gcWUodCxyLG4sZSl9ZnVuY3Rpb24gSmUoKXt9ZnVuY3Rpb24gcWUodCxlLGksbixyKXt2YXIgcz1BKGkpLG89e25hbWU6ZSxleHByZXNzaW9uOnMuZXhwcmVzc2lvbixmaWx0ZXJzOnMuZmlsdGVycyxyYXc6aSxkZWY6cnx8QXQobixcImRpcmVjdGl2ZXNcIixlKX07XCJmb3JcIiE9PWUmJlwicm91dGVyLXZpZXdcIiE9PWV8fChvLnJlZj1udCh0KSk7dmFyIGE9ZnVuY3Rpb24odCxlLGksbixyKXtvLnJlZiYmcHQoKG58fHQpLiRyZWZzLG8ucmVmLG51bGwpLHQuX2JpbmREaXIobyxlLGksbixyKX07cmV0dXJuIGEudGVybWluYWw9ITAsYX1mdW5jdGlvbiBRZSh0LGUpe2Z1bmN0aW9uIGkodCxlLGkpe3ZhciBuPWkmJlplKGkpLHI9IW4mJkEocyk7di5wdXNoKHtuYW1lOnQsYXR0cjpvLHJhdzphLGRlZjplLGFyZzpsLG1vZGlmaWVyczpjLGV4cHJlc3Npb246ciYmci5leHByZXNzaW9uLGZpbHRlcnM6ciYmci5maWx0ZXJzLGludGVycDppLGhhc09uZVRpbWU6bn0pfWZvcih2YXIgbixyLHMsbyxhLGgsbCxjLHUsZixwLGQ9dC5sZW5ndGgsdj1bXTtkLS07KWlmKG49dFtkXSxyPW89bi5uYW1lLHM9YT1uLnZhbHVlLGY9TihzKSxsPW51bGwsYz1HZShyKSxyPXIucmVwbGFjZShBcyxcIlwiKSxmKXM9aihmKSxsPXIsaShcImJpbmRcIixvcy5iaW5kLGYpO2Vsc2UgaWYoT3MudGVzdChyKSljLmxpdGVyYWw9ISRzLnRlc3QociksaShcInRyYW5zaXRpb25cIixicy50cmFuc2l0aW9uKTtlbHNlIGlmKGtzLnRlc3QocikpbD1yLnJlcGxhY2Uoa3MsXCJcIiksaShcIm9uXCIsb3Mub24pO2Vsc2UgaWYoJHMudGVzdChyKSloPXIucmVwbGFjZSgkcyxcIlwiKSxcInN0eWxlXCI9PT1ofHxcImNsYXNzXCI9PT1oP2koaCxic1toXSk6KGw9aCxpKFwiYmluZFwiLG9zLmJpbmQpKTtlbHNlIGlmKHA9ci5tYXRjaCh4cykpe2lmKGg9cFsxXSxsPXBbMl0sXCJlbHNlXCI9PT1oKWNvbnRpbnVlO3U9QXQoZSxcImRpcmVjdGl2ZXNcIixoKSx1JiZpKGgsdSl9cmV0dXJuIHYubGVuZ3RoP0tlKHYpOnZvaWQgMH1mdW5jdGlvbiBHZSh0KXt2YXIgZT1PYmplY3QuY3JlYXRlKG51bGwpLGk9dC5tYXRjaChBcyk7aWYoaSlmb3IodmFyIG49aS5sZW5ndGg7bi0tOyllW2lbbl0uc2xpY2UoMSldPSEwO3JldHVybiBlfWZ1bmN0aW9uIEtlKHQpe3JldHVybiBmdW5jdGlvbihlLGksbixyLHMpe2Zvcih2YXIgbz10Lmxlbmd0aDtvLS07KWUuX2JpbmREaXIodFtvXSxpLG4scixzKX19ZnVuY3Rpb24gWmUodCl7Zm9yKHZhciBlPXQubGVuZ3RoO2UtLTspaWYodFtlXS5vbmVUaW1lKXJldHVybiEwfWZ1bmN0aW9uIFhlKHQsZSl7cmV0dXJuIGUmJihlLl9jb250YWluZXJBdHRycz10aSh0KSksZXQodCkmJih0PVl0KHQpKSxlJiYoZS5fYXNDb21wb25lbnQmJiFlLnRlbXBsYXRlJiYoZS50ZW1wbGF0ZT1cIjxzbG90Pjwvc2xvdD5cIiksZS50ZW1wbGF0ZSYmKGUuX2NvbnRlbnQ9WCh0KSx0PVllKHQsZSkpKSxvdCh0KSYmKFUoaXQoXCJ2LXN0YXJ0XCIsITApLHQpLHQuYXBwZW5kQ2hpbGQoaXQoXCJ2LWVuZFwiLCEwKSkpLHR9ZnVuY3Rpb24gWWUodCxlKXt2YXIgaT1lLnRlbXBsYXRlLG49WXQoaSwhMCk7aWYobil7dmFyIHI9bi5maXJzdENoaWxkLHM9ci50YWdOYW1lJiZyLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtyZXR1cm4gZS5yZXBsYWNlPyh0PT09ZG9jdW1lbnQuYm9keSxuLmNoaWxkTm9kZXMubGVuZ3RoPjF8fDEhPT1yLm5vZGVUeXBlfHxcImNvbXBvbmVudFwiPT09c3x8QXQoZSxcImNvbXBvbmVudHNcIixzKXx8SShyLFwiaXNcIil8fEF0KGUsXCJlbGVtZW50RGlyZWN0aXZlc1wiLHMpfHxyLmhhc0F0dHJpYnV0ZShcInYtZm9yXCIpfHxyLmhhc0F0dHJpYnV0ZShcInYtaWZcIik/bjooZS5fcmVwbGFjZXJBdHRycz10aShyKSxlaSh0LHIpLHIpKToodC5hcHBlbmRDaGlsZChuKSx0KX19ZnVuY3Rpb24gdGkodCl7cmV0dXJuIDE9PT10Lm5vZGVUeXBlJiZ0Lmhhc0F0dHJpYnV0ZXMoKT9kKHQuYXR0cmlidXRlcyk6dm9pZCAwfWZ1bmN0aW9uIGVpKHQsZSl7Zm9yKHZhciBpLG4scj10LmF0dHJpYnV0ZXMscz1yLmxlbmd0aDtzLS07KWk9cltzXS5uYW1lLG49cltzXS52YWx1ZSxlLmhhc0F0dHJpYnV0ZShpKXx8anMudGVzdChpKT9cImNsYXNzXCIhPT1pfHxOKG4pfHxuLnRyaW0oKS5zcGxpdCgvXFxzKy8pLmZvckVhY2goZnVuY3Rpb24odCl7SyhlLHQpfSk6ZS5zZXRBdHRyaWJ1dGUoaSxuKX1mdW5jdGlvbiBpaSh0LGUpe2lmKGUpe2Zvcih2YXIgaSxuLHI9dC5fc2xvdENvbnRlbnRzPU9iamVjdC5jcmVhdGUobnVsbCkscz0wLG89ZS5jaGlsZHJlbi5sZW5ndGg7bz5zO3MrKylpPWUuY2hpbGRyZW5bc10sKG49aS5nZXRBdHRyaWJ1dGUoXCJzbG90XCIpKSYmKHJbbl18fChyW25dPVtdKSkucHVzaChpKTtmb3IobiBpbiByKXJbbl09bmkocltuXSxlKTtlLmhhc0NoaWxkTm9kZXMoKSYmKHJbXCJkZWZhdWx0XCJdPW5pKGUuY2hpbGROb2RlcyxlKSl9fWZ1bmN0aW9uIG5pKHQsZSl7dmFyIGk9ZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO3Q9ZCh0KTtmb3IodmFyIG49MCxyPXQubGVuZ3RoO3I+bjtuKyspe3ZhciBzPXRbbl07IWV0KHMpfHxzLmhhc0F0dHJpYnV0ZShcInYtaWZcIil8fHMuaGFzQXR0cmlidXRlKFwidi1mb3JcIil8fChlLnJlbW92ZUNoaWxkKHMpLHM9WXQocykpLGkuYXBwZW5kQ2hpbGQocyl9cmV0dXJuIGl9ZnVuY3Rpb24gcmkodCl7ZnVuY3Rpb24gZSgpe31mdW5jdGlvbiBuKHQsZSl7dmFyIGk9bmV3IHF0KGUsdCxudWxsLHtsYXp5OiEwfSk7cmV0dXJuIGZ1bmN0aW9uKCl7cmV0dXJuIGkuZGlydHkmJmkuZXZhbHVhdGUoKSxodC50YXJnZXQmJmkuZGVwZW5kKCksaS52YWx1ZX19T2JqZWN0LmRlZmluZVByb3BlcnR5KHQucHJvdG90eXBlLFwiJGRhdGFcIix7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2RhdGF9LHNldDpmdW5jdGlvbih0KXt0IT09dGhpcy5fZGF0YSYmdGhpcy5fc2V0RGF0YSh0KX19KSx0LnByb3RvdHlwZS5faW5pdFN0YXRlPWZ1bmN0aW9uKCl7dGhpcy5faW5pdFByb3BzKCksdGhpcy5faW5pdE1ldGEoKSx0aGlzLl9pbml0TWV0aG9kcygpLHRoaXMuX2luaXREYXRhKCksdGhpcy5faW5pdENvbXB1dGVkKCl9LHQucHJvdG90eXBlLl9pbml0UHJvcHM9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLiRvcHRpb25zLGU9dC5lbCxpPXQucHJvcHM7ZT10LmVsPUwoZSksdGhpcy5fcHJvcHNVbmxpbmtGbj1lJiYxPT09ZS5ub2RlVHlwZSYmaT9TZSh0aGlzLGUsaSx0aGlzLl9zY29wZSk6bnVsbH0sdC5wcm90b3R5cGUuX2luaXREYXRhPWZ1bmN0aW9uKCl7dmFyIHQsZSxuPXRoaXMuJG9wdGlvbnMuZGF0YSxyPXRoaXMuX2RhdGE9bj9uKCk6e30scz10aGlzLl9wcm9wcyxvPXRoaXMuX3J1bnRpbWVEYXRhP1wiZnVuY3Rpb25cIj09dHlwZW9mIHRoaXMuX3J1bnRpbWVEYXRhP3RoaXMuX3J1bnRpbWVEYXRhKCk6dGhpcy5fcnVudGltZURhdGE6bnVsbCxhPU9iamVjdC5rZXlzKHIpO2Zvcih0PWEubGVuZ3RoO3QtLTspZT1hW3RdLCghc3x8IWkocyxlKXx8byYmaShvLGUpJiZudWxsPT09c1tlXS5yYXcpJiZ0aGlzLl9wcm94eShlKTtmdChyLHRoaXMpfSx0LnByb3RvdHlwZS5fc2V0RGF0YT1mdW5jdGlvbih0KXt0PXR8fHt9O3ZhciBlPXRoaXMuX2RhdGE7dGhpcy5fZGF0YT10O3ZhciBuLHIscztmb3Iobj1PYmplY3Qua2V5cyhlKSxzPW4ubGVuZ3RoO3MtLTspcj1uW3NdLHIgaW4gdHx8dGhpcy5fdW5wcm94eShyKTtmb3Iobj1PYmplY3Qua2V5cyh0KSxzPW4ubGVuZ3RoO3MtLTspcj1uW3NdLGkodGhpcyxyKXx8dGhpcy5fcHJveHkocik7ZS5fX29iX18ucmVtb3ZlVm0odGhpcyksZnQodCx0aGlzKSx0aGlzLl9kaWdlc3QoKX0sdC5wcm90b3R5cGUuX3Byb3h5PWZ1bmN0aW9uKHQpe2lmKCFyKHQpKXt2YXIgZT10aGlzO09iamVjdC5kZWZpbmVQcm9wZXJ0eShlLHQse2NvbmZpZ3VyYWJsZTohMCxlbnVtZXJhYmxlOiEwLGdldDpmdW5jdGlvbigpe3JldHVybiBlLl9kYXRhW3RdfSxzZXQ6ZnVuY3Rpb24oaSl7ZS5fZGF0YVt0XT1pfX0pfX0sdC5wcm90b3R5cGUuX3VucHJveHk9ZnVuY3Rpb24odCl7cih0KXx8ZGVsZXRlIHRoaXNbdF19LHQucHJvdG90eXBlLl9kaWdlc3Q9ZnVuY3Rpb24oKXtmb3IodmFyIHQ9MCxlPXRoaXMuX3dhdGNoZXJzLmxlbmd0aDtlPnQ7dCsrKXRoaXMuX3dhdGNoZXJzW3RdLnVwZGF0ZSghMCl9LHQucHJvdG90eXBlLl9pbml0Q29tcHV0ZWQ9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLiRvcHRpb25zLmNvbXB1dGVkO2lmKHQpZm9yKHZhciBpIGluIHQpe3ZhciByPXRbaV0scz17ZW51bWVyYWJsZTohMCxjb25maWd1cmFibGU6ITB9O1wiZnVuY3Rpb25cIj09dHlwZW9mIHI/KHMuZ2V0PW4ocix0aGlzKSxzLnNldD1lKToocy5nZXQ9ci5nZXQ/ci5jYWNoZSE9PSExP24oci5nZXQsdGhpcyk6cChyLmdldCx0aGlzKTplLHMuc2V0PXIuc2V0P3Aoci5zZXQsdGhpcyk6ZSksT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsaSxzKX19LHQucHJvdG90eXBlLl9pbml0TWV0aG9kcz1mdW5jdGlvbigpe3ZhciB0PXRoaXMuJG9wdGlvbnMubWV0aG9kcztpZih0KWZvcih2YXIgZSBpbiB0KXRoaXNbZV09cCh0W2VdLHRoaXMpfSx0LnByb3RvdHlwZS5faW5pdE1ldGE9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLiRvcHRpb25zLl9tZXRhO2lmKHQpZm9yKHZhciBlIGluIHQpcHQodGhpcyxlLHRbZV0pfX1mdW5jdGlvbiBzaSh0KXtmdW5jdGlvbiBlKHQsZSl7Zm9yKHZhciBpLG4scj1lLmF0dHJpYnV0ZXMscz0wLG89ci5sZW5ndGg7bz5zO3MrKylpPXJbc10ubmFtZSxGcy50ZXN0KGkpJiYoaT1pLnJlcGxhY2UoRnMsXCJcIiksbj0odC5fc2NvcGV8fHQuX2NvbnRleHQpLiRldmFsKHJbc10udmFsdWUsITApLFwiZnVuY3Rpb25cIj09dHlwZW9mIG4mJihuLl9mcm9tUGFyZW50PSEwLHQuJG9uKGkucmVwbGFjZShGcyksbikpKX1mdW5jdGlvbiBpKHQsZSxpKXtpZihpKXt2YXIgcixzLG8sYTtmb3IocyBpbiBpKWlmKHI9aVtzXSxPaShyKSlmb3Iobz0wLGE9ci5sZW5ndGg7YT5vO28rKyluKHQsZSxzLHJbb10pO2Vsc2Ugbih0LGUscyxyKX19ZnVuY3Rpb24gbih0LGUsaSxyLHMpe3ZhciBvPXR5cGVvZiByO2lmKFwiZnVuY3Rpb25cIj09PW8pdFtlXShpLHIscyk7ZWxzZSBpZihcInN0cmluZ1wiPT09byl7dmFyIGE9dC4kb3B0aW9ucy5tZXRob2RzLGg9YSYmYVtyXTtoJiZ0W2VdKGksaCxzKX1lbHNlIHImJlwib2JqZWN0XCI9PT1vJiZuKHQsZSxpLHIuaGFuZGxlcixyKX1mdW5jdGlvbiByKCl7dGhpcy5faXNBdHRhY2hlZHx8KHRoaXMuX2lzQXR0YWNoZWQ9ITAsdGhpcy4kY2hpbGRyZW4uZm9yRWFjaChzKSl9ZnVuY3Rpb24gcyh0KXshdC5faXNBdHRhY2hlZCYmSCh0LiRlbCkmJnQuX2NhbGxIb29rKFwiYXR0YWNoZWRcIil9ZnVuY3Rpb24gbygpe3RoaXMuX2lzQXR0YWNoZWQmJih0aGlzLl9pc0F0dGFjaGVkPSExLHRoaXMuJGNoaWxkcmVuLmZvckVhY2goYSkpfWZ1bmN0aW9uIGEodCl7dC5faXNBdHRhY2hlZCYmIUgodC4kZWwpJiZ0Ll9jYWxsSG9vayhcImRldGFjaGVkXCIpfXQucHJvdG90eXBlLl9pbml0RXZlbnRzPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy4kb3B0aW9uczt0Ll9hc0NvbXBvbmVudCYmZSh0aGlzLHQuZWwpLGkodGhpcyxcIiRvblwiLHQuZXZlbnRzKSxpKHRoaXMsXCIkd2F0Y2hcIix0LndhdGNoKX0sdC5wcm90b3R5cGUuX2luaXRET01Ib29rcz1mdW5jdGlvbigpe3RoaXMuJG9uKFwiaG9vazphdHRhY2hlZFwiLHIpLHRoaXMuJG9uKFwiaG9vazpkZXRhY2hlZFwiLG8pfSx0LnByb3RvdHlwZS5fY2FsbEhvb2s9ZnVuY3Rpb24odCl7dGhpcy4kZW1pdChcInByZS1ob29rOlwiK3QpO3ZhciBlPXRoaXMuJG9wdGlvbnNbdF07aWYoZSlmb3IodmFyIGk9MCxuPWUubGVuZ3RoO24+aTtpKyspZVtpXS5jYWxsKHRoaXMpO3RoaXMuJGVtaXQoXCJob29rOlwiK3QpfX1mdW5jdGlvbiBvaSgpe31mdW5jdGlvbiBhaSh0LGUsaSxuLHIscyl7dGhpcy52bT1lLHRoaXMuZWw9aSx0aGlzLmRlc2NyaXB0b3I9dCx0aGlzLm5hbWU9dC5uYW1lLHRoaXMuZXhwcmVzc2lvbj10LmV4cHJlc3Npb24sdGhpcy5hcmc9dC5hcmcsdGhpcy5tb2RpZmllcnM9dC5tb2RpZmllcnMsdGhpcy5maWx0ZXJzPXQuZmlsdGVycyx0aGlzLmxpdGVyYWw9dGhpcy5tb2RpZmllcnMmJnRoaXMubW9kaWZpZXJzLmxpdGVyYWwsdGhpcy5fbG9ja2VkPSExLHRoaXMuX2JvdW5kPSExLHRoaXMuX2xpc3RlbmVycz1udWxsLHRoaXMuX2hvc3Q9bix0aGlzLl9zY29wZT1yLHRoaXMuX2ZyYWc9c31mdW5jdGlvbiBoaSh0KXt0LnByb3RvdHlwZS5fdXBkYXRlUmVmPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuJG9wdGlvbnMuX3JlZjtpZihlKXt2YXIgaT0odGhpcy5fc2NvcGV8fHRoaXMuX2NvbnRleHQpLiRyZWZzO3Q/aVtlXT09PXRoaXMmJihpW2VdPW51bGwpOmlbZV09dGhpc319LHQucHJvdG90eXBlLl9jb21waWxlPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuJG9wdGlvbnMsaT10O2lmKHQ9WGUodCxlKSx0aGlzLl9pbml0RWxlbWVudCh0KSwxIT09dC5ub2RlVHlwZXx8bnVsbD09PU0odCxcInYtcHJlXCIpKXt2YXIgbj10aGlzLl9jb250ZXh0JiZ0aGlzLl9jb250ZXh0LiRvcHRpb25zLHI9RGUodCxlLG4pO2lpKHRoaXMsZS5fY29udGVudCk7dmFyIHMsbz10aGlzLmNvbnN0cnVjdG9yO2UuX2xpbmtlckNhY2hhYmxlJiYocz1vLmxpbmtlcixzfHwocz1vLmxpbmtlcj1UZSh0LGUpKSk7dmFyIGE9cih0aGlzLHQsdGhpcy5fc2NvcGUpLGg9cz9zKHRoaXMsdCk6VGUodCxlKSh0aGlzLHQpO3RoaXMuX3VubGlua0ZuPWZ1bmN0aW9uKCl7YSgpLGgoITApfSxlLnJlcGxhY2UmJkooaSx0KSx0aGlzLl9pc0NvbXBpbGVkPSEwLHRoaXMuX2NhbGxIb29rKFwiY29tcGlsZWRcIil9fSx0LnByb3RvdHlwZS5faW5pdEVsZW1lbnQ9ZnVuY3Rpb24odCl7b3QodCk/KHRoaXMuX2lzRnJhZ21lbnQ9ITAsdGhpcy4kZWw9dGhpcy5fZnJhZ21lbnRTdGFydD10LmZpcnN0Q2hpbGQsdGhpcy5fZnJhZ21lbnRFbmQ9dC5sYXN0Q2hpbGQsMz09PXRoaXMuX2ZyYWdtZW50U3RhcnQubm9kZVR5cGUmJih0aGlzLl9mcmFnbWVudFN0YXJ0LmRhdGE9dGhpcy5fZnJhZ21lbnRFbmQuZGF0YT1cIlwiKSx0aGlzLl9mcmFnbWVudD10KTp0aGlzLiRlbD10LHRoaXMuJGVsLl9fdnVlX189dGhpcyx0aGlzLl9jYWxsSG9vayhcImJlZm9yZUNvbXBpbGVcIil9LHQucHJvdG90eXBlLl9iaW5kRGlyPWZ1bmN0aW9uKHQsZSxpLG4scil7dGhpcy5fZGlyZWN0aXZlcy5wdXNoKG5ldyBhaSh0LHRoaXMsZSxpLG4scikpfSx0LnByb3RvdHlwZS5fZGVzdHJveT1mdW5jdGlvbih0LGUpe2lmKHRoaXMuX2lzQmVpbmdEZXN0cm95ZWQpcmV0dXJuIHZvaWQoZXx8dGhpcy5fY2xlYW51cCgpKTt2YXIgaSxuLHI9dGhpcyxzPWZ1bmN0aW9uKCl7IWl8fG58fGV8fHIuX2NsZWFudXAoKX07dCYmdGhpcy4kZWwmJihuPSEwLHRoaXMuJHJlbW92ZShmdW5jdGlvbigpe249ITEscygpfSkpLHRoaXMuX2NhbGxIb29rKFwiYmVmb3JlRGVzdHJveVwiKSx0aGlzLl9pc0JlaW5nRGVzdHJveWVkPSEwO3ZhciBvLGE9dGhpcy4kcGFyZW50O2ZvcihhJiYhYS5faXNCZWluZ0Rlc3Ryb3llZCYmKGEuJGNoaWxkcmVuLiRyZW1vdmUodGhpcyksdGhpcy5fdXBkYXRlUmVmKCEwKSksbz10aGlzLiRjaGlsZHJlbi5sZW5ndGg7by0tOyl0aGlzLiRjaGlsZHJlbltvXS4kZGVzdHJveSgpO2Zvcih0aGlzLl9wcm9wc1VubGlua0ZuJiZ0aGlzLl9wcm9wc1VubGlua0ZuKCksdGhpcy5fdW5saW5rRm4mJnRoaXMuX3VubGlua0ZuKCksbz10aGlzLl93YXRjaGVycy5sZW5ndGg7by0tOyl0aGlzLl93YXRjaGVyc1tvXS50ZWFyZG93bigpO3RoaXMuJGVsJiYodGhpcy4kZWwuX192dWVfXz1udWxsKSxpPSEwLHMoKX0sdC5wcm90b3R5cGUuX2NsZWFudXA9ZnVuY3Rpb24oKXt0aGlzLl9pc0Rlc3Ryb3llZHx8KHRoaXMuX2ZyYWcmJnRoaXMuX2ZyYWcuY2hpbGRyZW4uJHJlbW92ZSh0aGlzKSx0aGlzLl9kYXRhLl9fb2JfXyYmdGhpcy5fZGF0YS5fX29iX18ucmVtb3ZlVm0odGhpcyksdGhpcy4kZWw9dGhpcy4kcGFyZW50PXRoaXMuJHJvb3Q9dGhpcy4kY2hpbGRyZW49dGhpcy5fd2F0Y2hlcnM9dGhpcy5fY29udGV4dD10aGlzLl9zY29wZT10aGlzLl9kaXJlY3RpdmVzPW51bGwsdGhpcy5faXNEZXN0cm95ZWQ9ITAsdGhpcy5fY2FsbEhvb2soXCJkZXN0cm95ZWRcIiksdGhpcy4kb2ZmKCkpfX1mdW5jdGlvbiBsaSh0KXt0LnByb3RvdHlwZS5fYXBwbHlGaWx0ZXJzPWZ1bmN0aW9uKHQsZSxpLG4pe3ZhciByLHMsbyxhLGgsbCxjLHUsZjtmb3IobD0wLGM9aS5sZW5ndGg7Yz5sO2wrKylpZihyPWlbbF0scz1BdCh0aGlzLiRvcHRpb25zLFwiZmlsdGVyc1wiLHIubmFtZSkscyYmKHM9bj9zLndyaXRlOnMucmVhZHx8cyxcImZ1bmN0aW9uXCI9PXR5cGVvZiBzKSl7aWYobz1uP1t0LGVdOlt0XSxoPW4/MjoxLHIuYXJncylmb3IodT0wLGY9ci5hcmdzLmxlbmd0aDtmPnU7dSsrKWE9ci5hcmdzW3VdLG9bdStoXT1hLmR5bmFtaWM/dGhpcy4kZ2V0KGEudmFsdWUpOmEudmFsdWU7dD1zLmFwcGx5KHRoaXMsbyl9cmV0dXJuIHR9LHQucHJvdG90eXBlLl9yZXNvbHZlQ29tcG9uZW50PWZ1bmN0aW9uKGUsaSl7dmFyIG49QXQodGhpcy4kb3B0aW9ucyxcImNvbXBvbmVudHNcIixlKTtpZihuKWlmKG4ub3B0aW9ucylpKG4pO2Vsc2UgaWYobi5yZXNvbHZlZClpKG4ucmVzb2x2ZWQpO2Vsc2UgaWYobi5yZXF1ZXN0ZWQpbi5wZW5kaW5nQ2FsbGJhY2tzLnB1c2goaSk7ZWxzZXtuLnJlcXVlc3RlZD0hMDt2YXIgcj1uLnBlbmRpbmdDYWxsYmFja3M9W2ldO24uY2FsbCh0aGlzLGZ1bmN0aW9uKGUpe2coZSkmJihlPXQuZXh0ZW5kKGUpKSxuLnJlc29sdmVkPWU7Zm9yKHZhciBpPTAscz1yLmxlbmd0aDtzPmk7aSsrKXJbaV0oZSl9LGZ1bmN0aW9uKHQpe30pfX19ZnVuY3Rpb24gY2kodCl7ZnVuY3Rpb24gaSh0KXtyZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0KSl9dC5wcm90b3R5cGUuJGdldD1mdW5jdGlvbih0LGUpe1xudmFyIGk9SXQodCk7aWYoaSl7aWYoZSYmIUJ0KHQpKXt2YXIgbj10aGlzO3JldHVybiBmdW5jdGlvbigpe24uJGFyZ3VtZW50cz1kKGFyZ3VtZW50cyk7dmFyIHQ9aS5nZXQuY2FsbChuLG4pO3JldHVybiBuLiRhcmd1bWVudHM9bnVsbCx0fX10cnl7cmV0dXJuIGkuZ2V0LmNhbGwodGhpcyx0aGlzKX1jYXRjaChyKXt9fX0sdC5wcm90b3R5cGUuJHNldD1mdW5jdGlvbih0LGUpe3ZhciBpPUl0KHQsITApO2kmJmkuc2V0JiZpLnNldC5jYWxsKHRoaXMsdGhpcyxlKX0sdC5wcm90b3R5cGUuJGRlbGV0ZT1mdW5jdGlvbih0KXtlKHRoaXMuX2RhdGEsdCl9LHQucHJvdG90eXBlLiR3YXRjaD1mdW5jdGlvbih0LGUsaSl7dmFyIG4scj10aGlzO1wic3RyaW5nXCI9PXR5cGVvZiB0JiYobj1BKHQpLHQ9bi5leHByZXNzaW9uKTt2YXIgcz1uZXcgcXQocix0LGUse2RlZXA6aSYmaS5kZWVwLHN5bmM6aSYmaS5zeW5jLGZpbHRlcnM6biYmbi5maWx0ZXJzLHVzZXI6IWl8fGkudXNlciE9PSExfSk7cmV0dXJuIGkmJmkuaW1tZWRpYXRlJiZlLmNhbGwocixzLnZhbHVlKSxmdW5jdGlvbigpe3MudGVhcmRvd24oKX19LHQucHJvdG90eXBlLiRldmFsPWZ1bmN0aW9uKHQsZSl7aWYoU3MudGVzdCh0KSl7dmFyIGk9QSh0KSxuPXRoaXMuJGdldChpLmV4cHJlc3Npb24sZSk7cmV0dXJuIGkuZmlsdGVycz90aGlzLl9hcHBseUZpbHRlcnMobixudWxsLGkuZmlsdGVycyk6bn1yZXR1cm4gdGhpcy4kZ2V0KHQsZSl9LHQucHJvdG90eXBlLiRpbnRlcnBvbGF0ZT1mdW5jdGlvbih0KXt2YXIgZT1OKHQpLGk9dGhpcztyZXR1cm4gZT8xPT09ZS5sZW5ndGg/aS4kZXZhbChlWzBdLnZhbHVlKStcIlwiOmUubWFwKGZ1bmN0aW9uKHQpe3JldHVybiB0LnRhZz9pLiRldmFsKHQudmFsdWUpOnQudmFsdWV9KS5qb2luKFwiXCIpOnR9LHQucHJvdG90eXBlLiRsb2c9ZnVuY3Rpb24odCl7dmFyIGU9dD9TdCh0aGlzLl9kYXRhLHQpOnRoaXMuX2RhdGE7aWYoZSYmKGU9aShlKSksIXQpe3ZhciBuO2ZvcihuIGluIHRoaXMuJG9wdGlvbnMuY29tcHV0ZWQpZVtuXT1pKHRoaXNbbl0pO2lmKHRoaXMuX3Byb3BzKWZvcihuIGluIHRoaXMuX3Byb3BzKWVbbl09aSh0aGlzW25dKX1jb25zb2xlLmxvZyhlKX19ZnVuY3Rpb24gdWkodCl7ZnVuY3Rpb24gZSh0LGUsbixyLHMsbyl7ZT1pKGUpO3ZhciBhPSFIKGUpLGg9cj09PSExfHxhP3M6byxsPSFhJiYhdC5faXNBdHRhY2hlZCYmIUgodC4kZWwpO3JldHVybiB0Ll9pc0ZyYWdtZW50PyhydCh0Ll9mcmFnbWVudFN0YXJ0LHQuX2ZyYWdtZW50RW5kLGZ1bmN0aW9uKGkpe2goaSxlLHQpfSksbiYmbigpKTpoKHQuJGVsLGUsdCxuKSxsJiZ0Ll9jYWxsSG9vayhcImF0dGFjaGVkXCIpLHR9ZnVuY3Rpb24gaSh0KXtyZXR1cm5cInN0cmluZ1wiPT10eXBlb2YgdD9kb2N1bWVudC5xdWVyeVNlbGVjdG9yKHQpOnR9ZnVuY3Rpb24gbih0LGUsaSxuKXtlLmFwcGVuZENoaWxkKHQpLG4mJm4oKX1mdW5jdGlvbiByKHQsZSxpLG4pe0IodCxlKSxuJiZuKCl9ZnVuY3Rpb24gcyh0LGUsaSl7eih0KSxpJiZpKCl9dC5wcm90b3R5cGUuJG5leHRUaWNrPWZ1bmN0aW9uKHQpe1dpKHQsdGhpcyl9LHQucHJvdG90eXBlLiRhcHBlbmRUbz1mdW5jdGlvbih0LGkscil7cmV0dXJuIGUodGhpcyx0LGkscixuLFMpfSx0LnByb3RvdHlwZS4kcHJlcGVuZFRvPWZ1bmN0aW9uKHQsZSxuKXtyZXR1cm4gdD1pKHQpLHQuaGFzQ2hpbGROb2RlcygpP3RoaXMuJGJlZm9yZSh0LmZpcnN0Q2hpbGQsZSxuKTp0aGlzLiRhcHBlbmRUbyh0LGUsbiksdGhpc30sdC5wcm90b3R5cGUuJGJlZm9yZT1mdW5jdGlvbih0LGksbil7cmV0dXJuIGUodGhpcyx0LGksbixyLEQpfSx0LnByb3RvdHlwZS4kYWZ0ZXI9ZnVuY3Rpb24odCxlLG4pe3JldHVybiB0PWkodCksdC5uZXh0U2libGluZz90aGlzLiRiZWZvcmUodC5uZXh0U2libGluZyxlLG4pOnRoaXMuJGFwcGVuZFRvKHQucGFyZW50Tm9kZSxlLG4pLHRoaXN9LHQucHJvdG90eXBlLiRyZW1vdmU9ZnVuY3Rpb24odCxlKXtpZighdGhpcy4kZWwucGFyZW50Tm9kZSlyZXR1cm4gdCYmdCgpO3ZhciBpPXRoaXMuX2lzQXR0YWNoZWQmJkgodGhpcy4kZWwpO2l8fChlPSExKTt2YXIgbj10aGlzLHI9ZnVuY3Rpb24oKXtpJiZuLl9jYWxsSG9vayhcImRldGFjaGVkXCIpLHQmJnQoKX07aWYodGhpcy5faXNGcmFnbWVudClzdCh0aGlzLl9mcmFnbWVudFN0YXJ0LHRoaXMuX2ZyYWdtZW50RW5kLHRoaXMsdGhpcy5fZnJhZ21lbnQscik7ZWxzZXt2YXIgbz1lPT09ITE/czpQO28odGhpcy4kZWwsdGhpcyxyKX1yZXR1cm4gdGhpc319ZnVuY3Rpb24gZmkodCl7ZnVuY3Rpb24gZSh0LGUsbil7dmFyIHI9dC4kcGFyZW50O2lmKHImJm4mJiFpLnRlc3QoZSkpZm9yKDtyOylyLl9ldmVudHNDb3VudFtlXT0oci5fZXZlbnRzQ291bnRbZV18fDApK24scj1yLiRwYXJlbnR9dC5wcm90b3R5cGUuJG9uPWZ1bmN0aW9uKHQsaSl7cmV0dXJuKHRoaXMuX2V2ZW50c1t0XXx8KHRoaXMuX2V2ZW50c1t0XT1bXSkpLnB1c2goaSksZSh0aGlzLHQsMSksdGhpc30sdC5wcm90b3R5cGUuJG9uY2U9ZnVuY3Rpb24odCxlKXtmdW5jdGlvbiBpKCl7bi4kb2ZmKHQsaSksZS5hcHBseSh0aGlzLGFyZ3VtZW50cyl9dmFyIG49dGhpcztyZXR1cm4gaS5mbj1lLHRoaXMuJG9uKHQsaSksdGhpc30sdC5wcm90b3R5cGUuJG9mZj1mdW5jdGlvbih0LGkpe3ZhciBuO2lmKCFhcmd1bWVudHMubGVuZ3RoKXtpZih0aGlzLiRwYXJlbnQpZm9yKHQgaW4gdGhpcy5fZXZlbnRzKW49dGhpcy5fZXZlbnRzW3RdLG4mJmUodGhpcyx0LC1uLmxlbmd0aCk7cmV0dXJuIHRoaXMuX2V2ZW50cz17fSx0aGlzfWlmKG49dGhpcy5fZXZlbnRzW3RdLCFuKXJldHVybiB0aGlzO2lmKDE9PT1hcmd1bWVudHMubGVuZ3RoKXJldHVybiBlKHRoaXMsdCwtbi5sZW5ndGgpLHRoaXMuX2V2ZW50c1t0XT1udWxsLHRoaXM7Zm9yKHZhciByLHM9bi5sZW5ndGg7cy0tOylpZihyPW5bc10scj09PWl8fHIuZm49PT1pKXtlKHRoaXMsdCwtMSksbi5zcGxpY2UocywxKTticmVha31yZXR1cm4gdGhpc30sdC5wcm90b3R5cGUuJGVtaXQ9ZnVuY3Rpb24odCl7dmFyIGU9XCJzdHJpbmdcIj09dHlwZW9mIHQ7dD1lP3Q6dC5uYW1lO3ZhciBpPXRoaXMuX2V2ZW50c1t0XSxuPWV8fCFpO2lmKGkpe2k9aS5sZW5ndGg+MT9kKGkpOmk7dmFyIHI9ZSYmaS5zb21lKGZ1bmN0aW9uKHQpe3JldHVybiB0Ll9mcm9tUGFyZW50fSk7ciYmKG49ITEpO2Zvcih2YXIgcz1kKGFyZ3VtZW50cywxKSxvPTAsYT1pLmxlbmd0aDthPm87bysrKXt2YXIgaD1pW29dLGw9aC5hcHBseSh0aGlzLHMpO2whPT0hMHx8ciYmIWguX2Zyb21QYXJlbnR8fChuPSEwKX19cmV0dXJuIG59LHQucHJvdG90eXBlLiRicm9hZGNhc3Q9ZnVuY3Rpb24odCl7dmFyIGU9XCJzdHJpbmdcIj09dHlwZW9mIHQ7aWYodD1lP3Q6dC5uYW1lLHRoaXMuX2V2ZW50c0NvdW50W3RdKXt2YXIgaT10aGlzLiRjaGlsZHJlbixuPWQoYXJndW1lbnRzKTtlJiYoblswXT17bmFtZTp0LHNvdXJjZTp0aGlzfSk7Zm9yKHZhciByPTAscz1pLmxlbmd0aDtzPnI7cisrKXt2YXIgbz1pW3JdLGE9by4kZW1pdC5hcHBseShvLG4pO2EmJm8uJGJyb2FkY2FzdC5hcHBseShvLG4pfXJldHVybiB0aGlzfX0sdC5wcm90b3R5cGUuJGRpc3BhdGNoPWZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuJGVtaXQuYXBwbHkodGhpcyxhcmd1bWVudHMpO2lmKGUpe3ZhciBpPXRoaXMuJHBhcmVudCxuPWQoYXJndW1lbnRzKTtmb3IoblswXT17bmFtZTp0LHNvdXJjZTp0aGlzfTtpOyllPWkuJGVtaXQuYXBwbHkoaSxuKSxpPWU/aS4kcGFyZW50Om51bGw7cmV0dXJuIHRoaXN9fTt2YXIgaT0vXmhvb2s6L31mdW5jdGlvbiBwaSh0KXtmdW5jdGlvbiBlKCl7dGhpcy5faXNBdHRhY2hlZD0hMCx0aGlzLl9pc1JlYWR5PSEwLHRoaXMuX2NhbGxIb29rKFwicmVhZHlcIil9dC5wcm90b3R5cGUuJG1vdW50PWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9pc0NvbXBpbGVkP3ZvaWQgMDoodD1MKHQpLHR8fCh0PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIikpLHRoaXMuX2NvbXBpbGUodCksdGhpcy5faW5pdERPTUhvb2tzKCksSCh0aGlzLiRlbCk/KHRoaXMuX2NhbGxIb29rKFwiYXR0YWNoZWRcIiksZS5jYWxsKHRoaXMpKTp0aGlzLiRvbmNlKFwiaG9vazphdHRhY2hlZFwiLGUpLHRoaXMpfSx0LnByb3RvdHlwZS4kZGVzdHJveT1mdW5jdGlvbih0LGUpe3RoaXMuX2Rlc3Ryb3kodCxlKX0sdC5wcm90b3R5cGUuJGNvbXBpbGU9ZnVuY3Rpb24odCxlLGksbil7cmV0dXJuIFRlKHQsdGhpcy4kb3B0aW9ucywhMCkodGhpcyx0LGUsaSxuKX19ZnVuY3Rpb24gZGkodCl7dGhpcy5faW5pdCh0KX1mdW5jdGlvbiB2aSh0LGUsaSl7cmV0dXJuIGk9aT9wYXJzZUludChpLDEwKTowLGU9byhlKSxcIm51bWJlclwiPT10eXBlb2YgZT90LnNsaWNlKGksaStlKTp0fWZ1bmN0aW9uIG1pKHQsZSxpKXtpZih0PUxzKHQpLG51bGw9PWUpcmV0dXJuIHQ7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgZSlyZXR1cm4gdC5maWx0ZXIoZSk7ZT0oXCJcIitlKS50b0xvd2VyQ2FzZSgpO2Zvcih2YXIgbixyLHMsbyxhPVwiaW5cIj09PWk/MzoyLGg9ZChhcmd1bWVudHMsYSkucmVkdWNlKGZ1bmN0aW9uKHQsZSl7cmV0dXJuIHQuY29uY2F0KGUpfSxbXSksbD1bXSxjPTAsdT10Lmxlbmd0aDt1PmM7YysrKWlmKG49dFtjXSxzPW4mJm4uJHZhbHVlfHxuLG89aC5sZW5ndGgpe2Zvcig7by0tOylpZihyPWhbb10sXCIka2V5XCI9PT1yJiZfaShuLiRrZXksZSl8fF9pKFN0KHMsciksZSkpe2wucHVzaChuKTticmVha319ZWxzZSBfaShuLGUpJiZsLnB1c2gobik7cmV0dXJuIGx9ZnVuY3Rpb24gZ2kodCxlLGkpe2lmKHQ9THModCksIWUpcmV0dXJuIHQ7dmFyIG49aSYmMD5pPy0xOjE7cmV0dXJuIHQuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKHQsaSl7cmV0dXJuXCIka2V5XCIhPT1lJiYobSh0KSYmXCIkdmFsdWVcImluIHQmJih0PXQuJHZhbHVlKSxtKGkpJiZcIiR2YWx1ZVwiaW4gaSYmKGk9aS4kdmFsdWUpKSx0PW0odCk/U3QodCxlKTp0LGk9bShpKT9TdChpLGUpOmksdD09PWk/MDp0Pmk/bjotbn0pfWZ1bmN0aW9uIF9pKHQsZSl7dmFyIGk7aWYoZyh0KSl7dmFyIG49T2JqZWN0LmtleXModCk7Zm9yKGk9bi5sZW5ndGg7aS0tOylpZihfaSh0W25baV1dLGUpKXJldHVybiEwfWVsc2UgaWYoT2kodCkpe2ZvcihpPXQubGVuZ3RoO2ktLTspaWYoX2kodFtpXSxlKSlyZXR1cm4hMH1lbHNlIGlmKG51bGwhPXQpcmV0dXJuIHQudG9TdHJpbmcoKS50b0xvd2VyQ2FzZSgpLmluZGV4T2YoZSk+LTF9ZnVuY3Rpb24gYmkoaSl7ZnVuY3Rpb24gbih0KXtyZXR1cm4gbmV3IEZ1bmN0aW9uKFwicmV0dXJuIGZ1bmN0aW9uIFwiK2YodCkrXCIgKG9wdGlvbnMpIHsgdGhpcy5faW5pdChvcHRpb25zKSB9XCIpKCl9aS5vcHRpb25zPXtkaXJlY3RpdmVzOm9zLGVsZW1lbnREaXJlY3RpdmVzOlJzLGZpbHRlcnM6TXMsdHJhbnNpdGlvbnM6e30sY29tcG9uZW50czp7fSxwYXJ0aWFsczp7fSxyZXBsYWNlOiEwfSxpLnV0aWw9eG4saS5jb25maWc9cG4saS5zZXQ9dCxpW1wiZGVsZXRlXCJdPWUsaS5uZXh0VGljaz1XaSxpLmNvbXBpbGVyPUVzLGkuRnJhZ21lbnRGYWN0b3J5PWFlLGkuaW50ZXJuYWxEaXJlY3RpdmVzPWJzLGkucGFyc2Vycz17cGF0aDpWbix0ZXh0OmNuLHRlbXBsYXRlOmJyLGRpcmVjdGl2ZTpybixleHByZXNzaW9uOm5yfSxpLmNpZD0wO3ZhciByPTE7aS5leHRlbmQ9ZnVuY3Rpb24odCl7dD10fHx7fTt2YXIgZT10aGlzLGk9MD09PWUuY2lkO2lmKGkmJnQuX0N0b3IpcmV0dXJuIHQuX0N0b3I7dmFyIHM9dC5uYW1lfHxlLm9wdGlvbnMubmFtZSxvPW4oc3x8XCJWdWVDb21wb25lbnRcIik7cmV0dXJuIG8ucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoZS5wcm90b3R5cGUpLG8ucHJvdG90eXBlLmNvbnN0cnVjdG9yPW8sby5jaWQ9cisrLG8ub3B0aW9ucz14dChlLm9wdGlvbnMsdCksb1tcInN1cGVyXCJdPWUsby5leHRlbmQ9ZS5leHRlbmQscG4uX2Fzc2V0VHlwZXMuZm9yRWFjaChmdW5jdGlvbih0KXtvW3RdPWVbdF19KSxzJiYoby5vcHRpb25zLmNvbXBvbmVudHNbc109byksaSYmKHQuX0N0b3I9byksb30saS51c2U9ZnVuY3Rpb24odCl7aWYoIXQuaW5zdGFsbGVkKXt2YXIgZT1kKGFyZ3VtZW50cywxKTtyZXR1cm4gZS51bnNoaWZ0KHRoaXMpLFwiZnVuY3Rpb25cIj09dHlwZW9mIHQuaW5zdGFsbD90Lmluc3RhbGwuYXBwbHkodCxlKTp0LmFwcGx5KG51bGwsZSksdC5pbnN0YWxsZWQ9ITAsdGhpc319LGkubWl4aW49ZnVuY3Rpb24odCl7aS5vcHRpb25zPXh0KGkub3B0aW9ucyx0KX0scG4uX2Fzc2V0VHlwZXMuZm9yRWFjaChmdW5jdGlvbih0KXtpW3RdPWZ1bmN0aW9uKGUsbil7cmV0dXJuIG4/KFwiY29tcG9uZW50XCI9PT10JiZnKG4pJiYobi5uYW1lPWUsbj1pLmV4dGVuZChuKSksdGhpcy5vcHRpb25zW3QrXCJzXCJdW2VdPW4sbik6dGhpcy5vcHRpb25zW3QrXCJzXCJdW2VdfX0pLHYoaS50cmFuc2l0aW9uLHZuKX12YXIgeWk9T2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSx3aT0vXlxccz8odHJ1ZXxmYWxzZXwtP1tcXGRcXC5dK3wnW14nXSonfFwiW15cIl0qXCIpXFxzPyQvLENpPS8tKFxcdykvZywkaT0vKFthLXpcXGRdKShbQS1aXSkvZyxraT0vKD86XnxbLV9cXC9dKShcXHcpL2cseGk9T2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxBaT1cIltvYmplY3QgT2JqZWN0XVwiLE9pPUFycmF5LmlzQXJyYXksVGk9XCJfX3Byb3RvX19cImlue30sTmk9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdyYmXCJbb2JqZWN0IE9iamVjdF1cIiE9PU9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cpLGppPU5pJiZ3aW5kb3cuX19WVUVfREVWVE9PTFNfR0xPQkFMX0hPT0tfXyxFaT1OaSYmd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSxGaT1FaSYmRWkuaW5kZXhPZihcIm1zaWUgOS4wXCIpPjAsU2k9RWkmJkVpLmluZGV4T2YoXCJhbmRyb2lkXCIpPjAsRGk9dm9pZCAwLFBpPXZvaWQgMCxSaT12b2lkIDAsTGk9dm9pZCAwO2lmKE5pJiYhRmkpe3ZhciBIaT12b2lkIDA9PT13aW5kb3cub250cmFuc2l0aW9uZW5kJiZ2b2lkIDAhPT13aW5kb3cub253ZWJraXR0cmFuc2l0aW9uZW5kLE1pPXZvaWQgMD09PXdpbmRvdy5vbmFuaW1hdGlvbmVuZCYmdm9pZCAwIT09d2luZG93Lm9ud2Via2l0YW5pbWF0aW9uZW5kO0RpPUhpP1wiV2Via2l0VHJhbnNpdGlvblwiOlwidHJhbnNpdGlvblwiLFBpPUhpP1wid2Via2l0VHJhbnNpdGlvbkVuZFwiOlwidHJhbnNpdGlvbmVuZFwiLFJpPU1pP1wiV2Via2l0QW5pbWF0aW9uXCI6XCJhbmltYXRpb25cIixMaT1NaT9cIndlYmtpdEFuaW1hdGlvbkVuZFwiOlwiYW5pbWF0aW9uZW5kXCJ9dmFyIFdpPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCgpe249ITE7dmFyIHQ9aS5zbGljZSgwKTtpPVtdO2Zvcih2YXIgZT0wO2U8dC5sZW5ndGg7ZSsrKXRbZV0oKX12YXIgZSxpPVtdLG49ITE7aWYoXCJ1bmRlZmluZWRcIiE9dHlwZW9mIE11dGF0aW9uT2JzZXJ2ZXIpe3ZhciByPTEscz1uZXcgTXV0YXRpb25PYnNlcnZlcih0KSxvPWRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHIpO3Mub2JzZXJ2ZShvLHtjaGFyYWN0ZXJEYXRhOiEwfSksZT1mdW5jdGlvbigpe3I9KHIrMSklMixvLmRhdGE9cn19ZWxzZXt2YXIgYT1OaT93aW5kb3c6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbD9nbG9iYWw6e307ZT1hLnNldEltbWVkaWF0ZXx8c2V0VGltZW91dH1yZXR1cm4gZnVuY3Rpb24ocixzKXt2YXIgbz1zP2Z1bmN0aW9uKCl7ci5jYWxsKHMpfTpyO2kucHVzaChvKSxufHwobj0hMCxlKHQsMCkpfX0oKSxJaT0kLnByb3RvdHlwZTtJaS5wdXQ9ZnVuY3Rpb24odCxlKXt2YXIgaTt0aGlzLnNpemU9PT10aGlzLmxpbWl0JiYoaT10aGlzLnNoaWZ0KCkpO3ZhciBuPXRoaXMuZ2V0KHQsITApO3JldHVybiBufHwobj17a2V5OnR9LHRoaXMuX2tleW1hcFt0XT1uLHRoaXMudGFpbD8odGhpcy50YWlsLm5ld2VyPW4sbi5vbGRlcj10aGlzLnRhaWwpOnRoaXMuaGVhZD1uLHRoaXMudGFpbD1uLHRoaXMuc2l6ZSsrKSxuLnZhbHVlPWUsaX0sSWkuc2hpZnQ9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmhlYWQ7cmV0dXJuIHQmJih0aGlzLmhlYWQ9dGhpcy5oZWFkLm5ld2VyLHRoaXMuaGVhZC5vbGRlcj12b2lkIDAsdC5uZXdlcj10Lm9sZGVyPXZvaWQgMCx0aGlzLl9rZXltYXBbdC5rZXldPXZvaWQgMCx0aGlzLnNpemUtLSksdH0sSWkuZ2V0PWZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5fa2V5bWFwW3RdO2lmKHZvaWQgMCE9PWkpcmV0dXJuIGk9PT10aGlzLnRhaWw/ZT9pOmkudmFsdWU6KGkubmV3ZXImJihpPT09dGhpcy5oZWFkJiYodGhpcy5oZWFkPWkubmV3ZXIpLGkubmV3ZXIub2xkZXI9aS5vbGRlciksaS5vbGRlciYmKGkub2xkZXIubmV3ZXI9aS5uZXdlciksaS5uZXdlcj12b2lkIDAsaS5vbGRlcj10aGlzLnRhaWwsdGhpcy50YWlsJiYodGhpcy50YWlsLm5ld2VyPWkpLHRoaXMudGFpbD1pLGU/aTppLnZhbHVlKX07dmFyIEJpLFZpLHppLFVpLEppLHFpLFFpLEdpLEtpLFppLFhpLFlpLHRuPW5ldyAkKDFlMyksZW49L1teXFxzJ1wiXSt8J1teJ10qJ3xcIlteXCJdKlwiL2csbm49L15pbiR8Xi0/XFxkKy8scm49T2JqZWN0LmZyZWV6ZSh7cGFyc2VEaXJlY3RpdmU6QX0pLHNuPS9bLS4qKz9eJHt9KCl8W1xcXVxcL1xcXFxdL2csb249dm9pZCAwLGFuPXZvaWQgMCxobj12b2lkIDAsbG49L1tefF1cXHxbXnxdLyxjbj1PYmplY3QuZnJlZXplKHtjb21waWxlUmVnZXg6VCxwYXJzZVRleHQ6Tix0b2tlbnNUb0V4cDpqfSksdW49W1wie3tcIixcIn19XCJdLGZuPVtcInt7e1wiLFwifX19XCJdLHBuPU9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHtkZWJ1ZzohMSxzaWxlbnQ6ITEsYXN5bmM6ITAsd2FybkV4cHJlc3Npb25FcnJvcnM6ITAsZGV2dG9vbHM6ITEsX2RlbGltaXRlcnNDaGFuZ2VkOiEwLF9hc3NldFR5cGVzOltcImNvbXBvbmVudFwiLFwiZGlyZWN0aXZlXCIsXCJlbGVtZW50RGlyZWN0aXZlXCIsXCJmaWx0ZXJcIixcInRyYW5zaXRpb25cIixcInBhcnRpYWxcIl0sX3Byb3BCaW5kaW5nTW9kZXM6e09ORV9XQVk6MCxUV09fV0FZOjEsT05FX1RJTUU6Mn0sX21heFVwZGF0ZUNvdW50OjEwMH0se2RlbGltaXRlcnM6e2dldDpmdW5jdGlvbigpe3JldHVybiB1bn0sc2V0OmZ1bmN0aW9uKHQpe3VuPXQsVCgpfSxjb25maWd1cmFibGU6ITAsZW51bWVyYWJsZTohMH0sdW5zYWZlRGVsaW1pdGVyczp7Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIGZufSxzZXQ6ZnVuY3Rpb24odCl7Zm49dCxUKCl9LGNvbmZpZ3VyYWJsZTohMCxlbnVtZXJhYmxlOiEwfX0pLGRuPXZvaWQgMCx2bj1PYmplY3QuZnJlZXplKHthcHBlbmRXaXRoVHJhbnNpdGlvbjpTLGJlZm9yZVdpdGhUcmFuc2l0aW9uOkQscmVtb3ZlV2l0aFRyYW5zaXRpb246UCxhcHBseVRyYW5zaXRpb246Un0pLG1uPS9edi1yZWY6Lyxnbj0wO2h0LnRhcmdldD1udWxsLGh0LnByb3RvdHlwZS5hZGRTdWI9ZnVuY3Rpb24odCl7dGhpcy5zdWJzLnB1c2godCl9LGh0LnByb3RvdHlwZS5yZW1vdmVTdWI9ZnVuY3Rpb24odCl7dGhpcy5zdWJzLiRyZW1vdmUodCl9LGh0LnByb3RvdHlwZS5kZXBlbmQ9ZnVuY3Rpb24oKXtodC50YXJnZXQuYWRkRGVwKHRoaXMpfSxodC5wcm90b3R5cGUubm90aWZ5PWZ1bmN0aW9uKCl7Zm9yKHZhciB0PWQodGhpcy5zdWJzKSxlPTAsaT10Lmxlbmd0aDtpPmU7ZSsrKXRbZV0udXBkYXRlKCl9O3ZhciBfbj1BcnJheS5wcm90b3R5cGUsYm49T2JqZWN0LmNyZWF0ZShfbik7W1wicHVzaFwiLFwicG9wXCIsXCJzaGlmdFwiLFwidW5zaGlmdFwiLFwic3BsaWNlXCIsXCJzb3J0XCIsXCJyZXZlcnNlXCJdLmZvckVhY2goZnVuY3Rpb24odCl7dmFyIGU9X25bdF07Xyhibix0LGZ1bmN0aW9uKCl7Zm9yKHZhciBpPWFyZ3VtZW50cy5sZW5ndGgsbj1uZXcgQXJyYXkoaSk7aS0tOyluW2ldPWFyZ3VtZW50c1tpXTt2YXIgcixzPWUuYXBwbHkodGhpcyxuKSxvPXRoaXMuX19vYl9fO3N3aXRjaCh0KXtjYXNlXCJwdXNoXCI6cj1uO2JyZWFrO2Nhc2VcInVuc2hpZnRcIjpyPW47YnJlYWs7Y2FzZVwic3BsaWNlXCI6cj1uLnNsaWNlKDIpfXJldHVybiByJiZvLm9ic2VydmVBcnJheShyKSxvLmRlcC5ub3RpZnkoKSxzfSl9KSxfKF9uLFwiJHNldFwiLGZ1bmN0aW9uKHQsZSl7cmV0dXJuIHQ+PXRoaXMubGVuZ3RoJiYodGhpcy5sZW5ndGg9TnVtYmVyKHQpKzEpLHRoaXMuc3BsaWNlKHQsMSxlKVswXX0pLF8oX24sXCIkcmVtb3ZlXCIsZnVuY3Rpb24odCl7aWYodGhpcy5sZW5ndGgpe3ZhciBlPXkodGhpcyx0KTtyZXR1cm4gZT4tMT90aGlzLnNwbGljZShlLDEpOnZvaWQgMH19KTt2YXIgeW49T2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYm4pO2x0LnByb3RvdHlwZS53YWxrPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT1PYmplY3Qua2V5cyh0KSxpPTAsbj1lLmxlbmd0aDtuPmk7aSsrKXRoaXMuY29udmVydChlW2ldLHRbZVtpXV0pfSxsdC5wcm90b3R5cGUub2JzZXJ2ZUFycmF5PWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT0wLGk9dC5sZW5ndGg7aT5lO2UrKylmdCh0W2VdKX0sbHQucHJvdG90eXBlLmNvbnZlcnQ9ZnVuY3Rpb24odCxlKXtwdCh0aGlzLnZhbHVlLHQsZSl9LGx0LnByb3RvdHlwZS5hZGRWbT1mdW5jdGlvbih0KXsodGhpcy52bXN8fCh0aGlzLnZtcz1bXSkpLnB1c2godCl9LGx0LnByb3RvdHlwZS5yZW1vdmVWbT1mdW5jdGlvbih0KXt0aGlzLnZtcy4kcmVtb3ZlKHQpfTt2YXIgd249L14oZGl2fHB8c3BhbnxpbWd8YXxifGl8YnJ8dWx8b2x8bGl8aDF8aDJ8aDN8aDR8aDV8aDZ8Y29kZXxwcmV8dGFibGV8dGh8dGR8dHJ8Zm9ybXxsYWJlbHxpbnB1dHxzZWxlY3R8b3B0aW9ufG5hdnxhcnRpY2xlfHNlY3Rpb258aGVhZGVyfGZvb3RlcikkL2ksQ249L14oc2xvdHxwYXJ0aWFsfGNvbXBvbmVudCkkL2ksJG49cG4ub3B0aW9uTWVyZ2VTdHJhdGVnaWVzPU9iamVjdC5jcmVhdGUobnVsbCk7JG4uZGF0YT1mdW5jdGlvbih0LGUsaSl7cmV0dXJuIGk/dHx8ZT9mdW5jdGlvbigpe3ZhciBuPVwiZnVuY3Rpb25cIj09dHlwZW9mIGU/ZS5jYWxsKGkpOmUscj1cImZ1bmN0aW9uXCI9PXR5cGVvZiB0P3QuY2FsbChpKTp2b2lkIDA7cmV0dXJuIG4/eXQobixyKTpyfTp2b2lkIDA6ZT9cImZ1bmN0aW9uXCIhPXR5cGVvZiBlP3Q6dD9mdW5jdGlvbigpe3JldHVybiB5dChlLmNhbGwodGhpcyksdC5jYWxsKHRoaXMpKX06ZTp0fSwkbi5lbD1mdW5jdGlvbih0LGUsaSl7aWYoaXx8IWV8fFwiZnVuY3Rpb25cIj09dHlwZW9mIGUpe3ZhciBuPWV8fHQ7cmV0dXJuIGkmJlwiZnVuY3Rpb25cIj09dHlwZW9mIG4/bi5jYWxsKGkpOm59fSwkbi5pbml0PSRuLmNyZWF0ZWQ9JG4ucmVhZHk9JG4uYXR0YWNoZWQ9JG4uZGV0YWNoZWQ9JG4uYmVmb3JlQ29tcGlsZT0kbi5jb21waWxlZD0kbi5iZWZvcmVEZXN0cm95PSRuLmRlc3Ryb3llZD0kbi5hY3RpdmF0ZT1mdW5jdGlvbih0LGUpe3JldHVybiBlP3Q/dC5jb25jYXQoZSk6T2koZSk/ZTpbZV06dH0sJG4ucGFyYW1BdHRyaWJ1dGVzPWZ1bmN0aW9uKCl7fSxwbi5fYXNzZXRUeXBlcy5mb3JFYWNoKGZ1bmN0aW9uKHQpeyRuW3QrXCJzXCJdPXd0fSksJG4ud2F0Y2g9JG4uZXZlbnRzPWZ1bmN0aW9uKHQsZSl7aWYoIWUpcmV0dXJuIHQ7aWYoIXQpcmV0dXJuIGU7dmFyIGk9e307dihpLHQpO2Zvcih2YXIgbiBpbiBlKXt2YXIgcj1pW25dLHM9ZVtuXTtyJiYhT2kocikmJihyPVtyXSksaVtuXT1yP3IuY29uY2F0KHMpOltzXX1yZXR1cm4gaX0sJG4ucHJvcHM9JG4ubWV0aG9kcz0kbi5jb21wdXRlZD1mdW5jdGlvbih0LGUpe2lmKCFlKXJldHVybiB0O2lmKCF0KXJldHVybiBlO3ZhciBpPU9iamVjdC5jcmVhdGUobnVsbCk7cmV0dXJuIHYoaSx0KSx2KGksZSksaX07dmFyIGtuPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHZvaWQgMD09PWU/dDplfSx4bj1PYmplY3QuZnJlZXplKHtkZWZpbmVSZWFjdGl2ZTpwdCxzZXQ6dCxkZWw6ZSxoYXNPd246aSxpc0xpdGVyYWw6bixpc1Jlc2VydmVkOnIsX3RvU3RyaW5nOnMsdG9OdW1iZXI6byx0b0Jvb2xlYW46YSxzdHJpcFF1b3RlczpoLGNhbWVsaXplOmwsaHlwaGVuYXRlOnUsY2xhc3NpZnk6ZixiaW5kOnAsdG9BcnJheTpkLGV4dGVuZDp2LGlzT2JqZWN0Om0saXNQbGFpbk9iamVjdDpnLGRlZjpfLGRlYm91bmNlOmIsaW5kZXhPZjp5LGNhbmNlbGxhYmxlOncsbG9vc2VFcXVhbDpDLGlzQXJyYXk6T2ksaGFzUHJvdG86VGksaW5Ccm93c2VyOk5pLGRldnRvb2xzOmppLGlzSUU5OkZpLGlzQW5kcm9pZDpTaSxnZXQgdHJhbnNpdGlvblByb3AoKXtyZXR1cm4gRGl9LGdldCB0cmFuc2l0aW9uRW5kRXZlbnQoKXtyZXR1cm4gUGl9LGdldCBhbmltYXRpb25Qcm9wKCl7cmV0dXJuIFJpfSxnZXQgYW5pbWF0aW9uRW5kRXZlbnQoKXtyZXR1cm4gTGl9LG5leHRUaWNrOldpLHF1ZXJ5OkwsaW5Eb2M6SCxnZXRBdHRyOk0sZ2V0QmluZEF0dHI6VyxoYXNCaW5kQXR0cjpJLGJlZm9yZTpCLGFmdGVyOlYscmVtb3ZlOnoscHJlcGVuZDpVLHJlcGxhY2U6SixvbjpxLG9mZjpRLHNldENsYXNzOkcsYWRkQ2xhc3M6SyxyZW1vdmVDbGFzczpaLGV4dHJhY3RDb250ZW50OlgsdHJpbU5vZGU6WSxpc1RlbXBsYXRlOmV0LGNyZWF0ZUFuY2hvcjppdCxmaW5kUmVmOm50LG1hcE5vZGVSYW5nZTpydCxyZW1vdmVOb2RlUmFuZ2U6c3QsaXNGcmFnbWVudDpvdCxnZXRPdXRlckhUTUw6YXQsbWVyZ2VPcHRpb25zOnh0LHJlc29sdmVBc3NldDpBdCxhc3NlcnRBc3NldDpPdCxjaGVja0NvbXBvbmVudEF0dHI6ZHQsaW5pdFByb3A6bXQsYXNzZXJ0UHJvcDpfdCxjb2VyY2VQcm9wOmJ0LGNvbW1vblRhZ1JFOnduLHJlc2VydmVkVGFnUkU6Q24sd2Fybjpkbn0pLEFuPTAsT249bmV3ICQoMWUzKSxUbj0wLE5uPTEsam49MixFbj0zLEZuPTAsU249MSxEbj0yLFBuPTMsUm49NCxMbj01LEhuPTYsTW49NyxXbj04LEluPVtdO0luW0ZuXT17d3M6W0ZuXSxpZGVudDpbUG4sVG5dLFwiW1wiOltSbl0sZW9mOltNbl19LEluW1NuXT17d3M6W1NuXSxcIi5cIjpbRG5dLFwiW1wiOltSbl0sZW9mOltNbl19LEluW0RuXT17d3M6W0RuXSxpZGVudDpbUG4sVG5dfSxJbltQbl09e2lkZW50OltQbixUbl0sMDpbUG4sVG5dLG51bWJlcjpbUG4sVG5dLHdzOltTbixObl0sXCIuXCI6W0RuLE5uXSxcIltcIjpbUm4sTm5dLGVvZjpbTW4sTm5dfSxJbltSbl09e1wiJ1wiOltMbixUbl0sJ1wiJzpbSG4sVG5dLFwiW1wiOltSbixqbl0sXCJdXCI6W1NuLEVuXSxlb2Y6V24sXCJlbHNlXCI6W1JuLFRuXX0sSW5bTG5dPXtcIidcIjpbUm4sVG5dLGVvZjpXbixcImVsc2VcIjpbTG4sVG5dfSxJbltIbl09eydcIic6W1JuLFRuXSxlb2Y6V24sXCJlbHNlXCI6W0huLFRuXX07dmFyIEJuLFZuPU9iamVjdC5mcmVlemUoe3BhcnNlUGF0aDpGdCxnZXRQYXRoOlN0LHNldFBhdGg6RHR9KSx6bj1uZXcgJCgxZTMpLFVuPVwiTWF0aCxEYXRlLHRoaXMsdHJ1ZSxmYWxzZSxudWxsLHVuZGVmaW5lZCxJbmZpbml0eSxOYU4saXNOYU4saXNGaW5pdGUsZGVjb2RlVVJJLGRlY29kZVVSSUNvbXBvbmVudCxlbmNvZGVVUkksZW5jb2RlVVJJQ29tcG9uZW50LHBhcnNlSW50LHBhcnNlRmxvYXRcIixKbj1uZXcgUmVnRXhwKFwiXihcIitVbi5yZXBsYWNlKC8sL2csXCJcXFxcYnxcIikrXCJcXFxcYilcIikscW49XCJicmVhayxjYXNlLGNsYXNzLGNhdGNoLGNvbnN0LGNvbnRpbnVlLGRlYnVnZ2VyLGRlZmF1bHQsZGVsZXRlLGRvLGVsc2UsZXhwb3J0LGV4dGVuZHMsZmluYWxseSxmb3IsZnVuY3Rpb24saWYsaW1wb3J0LGluLGluc3RhbmNlb2YsbGV0LHJldHVybixzdXBlcixzd2l0Y2gsdGhyb3csdHJ5LHZhcix3aGlsZSx3aXRoLHlpZWxkLGVudW0sYXdhaXQsaW1wbGVtZW50cyxwYWNrYWdlLHByb3RlY3RlZCxzdGF0aWMsaW50ZXJmYWNlLHByaXZhdGUscHVibGljXCIsUW49bmV3IFJlZ0V4cChcIl4oXCIrcW4ucmVwbGFjZSgvLC9nLFwiXFxcXGJ8XCIpK1wiXFxcXGIpXCIpLEduPS9cXHMvZyxLbj0vXFxuL2csWm49L1tcXHssXVxccypbXFx3XFwkX10rXFxzKjp8KCcoPzpbXidcXFxcXXxcXFxcLikqJ3xcIig/OlteXCJcXFxcXXxcXFxcLikqXCJ8YCg/OlteYFxcXFxdfFxcXFwuKSpcXCRcXHt8XFx9KD86W15gXFxcXF18XFxcXC4pKmB8YCg/OlteYFxcXFxdfFxcXFwuKSpgKXxuZXcgfHR5cGVvZiB8dm9pZCAvZyxYbj0vXCIoXFxkKylcIi9nLFluPS9eW0EtWmEtel8kXVtcXHckXSooPzpcXC5bQS1aYS16XyRdW1xcdyRdKnxcXFsnLio/J1xcXXxcXFtcIi4qP1wiXFxdfFxcW1xcZCtcXF18XFxbW0EtWmEtel8kXVtcXHckXSpcXF0pKiQvLHRyPS9bXlxcdyRcXC5dKD86W0EtWmEtel8kXVtcXHckXSopL2csZXI9L14oPzp0cnVlfGZhbHNlKSQvLGlyPVtdLG5yPU9iamVjdC5mcmVlemUoe3BhcnNlRXhwcmVzc2lvbjpJdCxpc1NpbXBsZVBhdGg6QnR9KSxycj1bXSxzcj1bXSxvcj17fSxhcj17fSxocj0hMSxscj0hMSxjcj0wO3F0LnByb3RvdHlwZS5nZXQ9ZnVuY3Rpb24oKXt0aGlzLmJlZm9yZUdldCgpO3ZhciB0LGU9dGhpcy5zY29wZXx8dGhpcy52bTt0cnl7dD10aGlzLmdldHRlci5jYWxsKGUsZSl9Y2F0Y2goaSl7fXJldHVybiB0aGlzLmRlZXAmJlF0KHQpLHRoaXMucHJlUHJvY2VzcyYmKHQ9dGhpcy5wcmVQcm9jZXNzKHQpKSx0aGlzLmZpbHRlcnMmJih0PWUuX2FwcGx5RmlsdGVycyh0LG51bGwsdGhpcy5maWx0ZXJzLCExKSksdGhpcy5wb3N0UHJvY2VzcyYmKHQ9dGhpcy5wb3N0UHJvY2Vzcyh0KSksdGhpcy5hZnRlckdldCgpLHR9LHF0LnByb3RvdHlwZS5zZXQ9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5zY29wZXx8dGhpcy52bTt0aGlzLmZpbHRlcnMmJih0PWUuX2FwcGx5RmlsdGVycyh0LHRoaXMudmFsdWUsdGhpcy5maWx0ZXJzLCEwKSk7dHJ5e3RoaXMuc2V0dGVyLmNhbGwoZSxlLHQpfWNhdGNoKGkpe312YXIgbj1lLiRmb3JDb250ZXh0O2lmKG4mJm4uYWxpYXM9PT10aGlzLmV4cHJlc3Npb24pe2lmKG4uZmlsdGVycylyZXR1cm47bi5fd2l0aExvY2soZnVuY3Rpb24oKXtlLiRrZXk/bi5yYXdWYWx1ZVtlLiRrZXldPXQ6bi5yYXdWYWx1ZS4kc2V0KGUuJGluZGV4LHQpfSl9fSxxdC5wcm90b3R5cGUuYmVmb3JlR2V0PWZ1bmN0aW9uKCl7aHQudGFyZ2V0PXRoaXMsdGhpcy5uZXdEZXBJZHM9T2JqZWN0LmNyZWF0ZShudWxsKSx0aGlzLm5ld0RlcHMubGVuZ3RoPTB9LHF0LnByb3RvdHlwZS5hZGREZXA9ZnVuY3Rpb24odCl7dmFyIGU9dC5pZDt0aGlzLm5ld0RlcElkc1tlXXx8KHRoaXMubmV3RGVwSWRzW2VdPSEwLHRoaXMubmV3RGVwcy5wdXNoKHQpLHRoaXMuZGVwSWRzW2VdfHx0LmFkZFN1Yih0aGlzKSl9LHF0LnByb3RvdHlwZS5hZnRlckdldD1mdW5jdGlvbigpe2h0LnRhcmdldD1udWxsO2Zvcih2YXIgdD10aGlzLmRlcHMubGVuZ3RoO3QtLTspe3ZhciBlPXRoaXMuZGVwc1t0XTt0aGlzLm5ld0RlcElkc1tlLmlkXXx8ZS5yZW1vdmVTdWIodGhpcyl9dGhpcy5kZXBJZHM9dGhpcy5uZXdEZXBJZHM7dmFyIGk9dGhpcy5kZXBzO3RoaXMuZGVwcz10aGlzLm5ld0RlcHMsdGhpcy5uZXdEZXBzPWl9LHF0LnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24odCl7dGhpcy5sYXp5P3RoaXMuZGlydHk9ITA6dGhpcy5zeW5jfHwhcG4uYXN5bmM/dGhpcy5ydW4oKToodGhpcy5zaGFsbG93PXRoaXMucXVldWVkP3Q/dGhpcy5zaGFsbG93OiExOiEhdCx0aGlzLnF1ZXVlZD0hMCxKdCh0aGlzKSl9LHF0LnByb3RvdHlwZS5ydW49ZnVuY3Rpb24oKXtpZih0aGlzLmFjdGl2ZSl7dmFyIHQ9dGhpcy5nZXQoKTtpZih0IT09dGhpcy52YWx1ZXx8KG0odCl8fHRoaXMuZGVlcCkmJiF0aGlzLnNoYWxsb3cpe3ZhciBlPXRoaXMudmFsdWU7dGhpcy52YWx1ZT10O3RoaXMucHJldkVycm9yO3RoaXMuY2IuY2FsbCh0aGlzLnZtLHQsZSl9dGhpcy5xdWV1ZWQ9dGhpcy5zaGFsbG93PSExfX0scXQucHJvdG90eXBlLmV2YWx1YXRlPWZ1bmN0aW9uKCl7dmFyIHQ9aHQudGFyZ2V0O3RoaXMudmFsdWU9dGhpcy5nZXQoKSx0aGlzLmRpcnR5PSExLGh0LnRhcmdldD10fSxxdC5wcm90b3R5cGUuZGVwZW5kPWZ1bmN0aW9uKCl7Zm9yKHZhciB0PXRoaXMuZGVwcy5sZW5ndGg7dC0tOyl0aGlzLmRlcHNbdF0uZGVwZW5kKCl9LHF0LnByb3RvdHlwZS50ZWFyZG93bj1mdW5jdGlvbigpe2lmKHRoaXMuYWN0aXZlKXt0aGlzLnZtLl9pc0JlaW5nRGVzdHJveWVkfHx0aGlzLnZtLl92Rm9yUmVtb3Zpbmd8fHRoaXMudm0uX3dhdGNoZXJzLiRyZW1vdmUodGhpcyk7Zm9yKHZhciB0PXRoaXMuZGVwcy5sZW5ndGg7dC0tOyl0aGlzLmRlcHNbdF0ucmVtb3ZlU3ViKHRoaXMpO3RoaXMuYWN0aXZlPSExLHRoaXMudm09dGhpcy5jYj10aGlzLnZhbHVlPW51bGx9fTt2YXIgdXI9e2JpbmQ6ZnVuY3Rpb24oKXt0aGlzLmF0dHI9Mz09PXRoaXMuZWwubm9kZVR5cGU/XCJkYXRhXCI6XCJ0ZXh0Q29udGVudFwifSx1cGRhdGU6ZnVuY3Rpb24odCl7dGhpcy5lbFt0aGlzLmF0dHJdPXModCl9fSxmcj1uZXcgJCgxZTMpLHByPW5ldyAkKDFlMyksZHI9e2VmYXVsdDpbMCxcIlwiLFwiXCJdLGxlZ2VuZDpbMSxcIjxmaWVsZHNldD5cIixcIjwvZmllbGRzZXQ+XCJdLHRyOlsyLFwiPHRhYmxlPjx0Ym9keT5cIixcIjwvdGJvZHk+PC90YWJsZT5cIl0sY29sOlsyLFwiPHRhYmxlPjx0Ym9keT48L3Rib2R5Pjxjb2xncm91cD5cIixcIjwvY29sZ3JvdXA+PC90YWJsZT5cIl19O2RyLnRkPWRyLnRoPVszLFwiPHRhYmxlPjx0Ym9keT48dHI+XCIsXCI8L3RyPjwvdGJvZHk+PC90YWJsZT5cIl0sZHIub3B0aW9uPWRyLm9wdGdyb3VwPVsxLCc8c2VsZWN0IG11bHRpcGxlPVwibXVsdGlwbGVcIj4nLFwiPC9zZWxlY3Q+XCJdLGRyLnRoZWFkPWRyLnRib2R5PWRyLmNvbGdyb3VwPWRyLmNhcHRpb249ZHIudGZvb3Q9WzEsXCI8dGFibGU+XCIsXCI8L3RhYmxlPlwiXSxkci5nPWRyLmRlZnM9ZHIuc3ltYm9sPWRyLnVzZT1kci5pbWFnZT1kci50ZXh0PWRyLmNpcmNsZT1kci5lbGxpcHNlPWRyLmxpbmU9ZHIucGF0aD1kci5wb2x5Z29uPWRyLnBvbHlsaW5lPWRyLnJlY3Q9WzEsJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHhtbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiIHhtbG5zOmV2PVwiaHR0cDovL3d3dy53My5vcmcvMjAwMS94bWwtZXZlbnRzXCJ2ZXJzaW9uPVwiMS4xXCI+JyxcIjwvc3ZnPlwiXTt2YXIgdnI9LzwoW1xcdzotXSspLyxtcj0vJiM/XFx3Kz87Lyxncj1mdW5jdGlvbigpe2lmKE5pKXt2YXIgdD1kb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO3JldHVybiB0LmlubmVySFRNTD1cIjx0ZW1wbGF0ZT4xPC90ZW1wbGF0ZT5cIiwhdC5jbG9uZU5vZGUoITApLmZpcnN0Q2hpbGQuaW5uZXJIVE1MfXJldHVybiExfSgpLF9yPWZ1bmN0aW9uKCl7aWYoTmkpe3ZhciB0PWRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKTtyZXR1cm4gdC5wbGFjZWhvbGRlcj1cInRcIixcInRcIj09PXQuY2xvbmVOb2RlKCEwKS52YWx1ZX1yZXR1cm4hMX0oKSxicj1PYmplY3QuZnJlZXplKHtjbG9uZU5vZGU6WHQscGFyc2VUZW1wbGF0ZTpZdH0pLHlyPXtiaW5kOmZ1bmN0aW9uKCl7OD09PXRoaXMuZWwubm9kZVR5cGUmJih0aGlzLm5vZGVzPVtdLHRoaXMuYW5jaG9yPWl0KFwidi1odG1sXCIpLEoodGhpcy5lbCx0aGlzLmFuY2hvcikpfSx1cGRhdGU6ZnVuY3Rpb24odCl7dD1zKHQpLHRoaXMubm9kZXM/dGhpcy5zd2FwKHQpOnRoaXMuZWwuaW5uZXJIVE1MPXR9LHN3YXA6ZnVuY3Rpb24odCl7Zm9yKHZhciBlPXRoaXMubm9kZXMubGVuZ3RoO2UtLTspeih0aGlzLm5vZGVzW2VdKTt2YXIgaT1ZdCh0LCEwLCEwKTt0aGlzLm5vZGVzPWQoaS5jaGlsZE5vZGVzKSxCKGksdGhpcy5hbmNob3IpfX07dGUucHJvdG90eXBlLmNhbGxIb29rPWZ1bmN0aW9uKHQpe3ZhciBlLGk7Zm9yKGU9MCxpPXRoaXMuY2hpbGRGcmFncy5sZW5ndGg7aT5lO2UrKyl0aGlzLmNoaWxkRnJhZ3NbZV0uY2FsbEhvb2sodCk7Zm9yKGU9MCxpPXRoaXMuY2hpbGRyZW4ubGVuZ3RoO2k+ZTtlKyspdCh0aGlzLmNoaWxkcmVuW2VdKX0sdGUucHJvdG90eXBlLmJlZm9yZVJlbW92ZT1mdW5jdGlvbigpe3ZhciB0LGU7Zm9yKHQ9MCxlPXRoaXMuY2hpbGRGcmFncy5sZW5ndGg7ZT50O3QrKyl0aGlzLmNoaWxkRnJhZ3NbdF0uYmVmb3JlUmVtb3ZlKCExKTtmb3IodD0wLGU9dGhpcy5jaGlsZHJlbi5sZW5ndGg7ZT50O3QrKyl0aGlzLmNoaWxkcmVuW3RdLiRkZXN0cm95KCExLCEwKTt2YXIgaT10aGlzLnVubGluay5kaXJzO2Zvcih0PTAsZT1pLmxlbmd0aDtlPnQ7dCsrKWlbdF0uX3dhdGNoZXImJmlbdF0uX3dhdGNoZXIudGVhcmRvd24oKX0sdGUucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt0aGlzLnBhcmVudEZyYWcmJnRoaXMucGFyZW50RnJhZy5jaGlsZEZyYWdzLiRyZW1vdmUodGhpcyksdGhpcy5ub2RlLl9fdl9mcmFnPW51bGwsdGhpcy51bmxpbmsoKX07dmFyIHdyPW5ldyAkKDVlMyk7YWUucHJvdG90eXBlLmNyZWF0ZT1mdW5jdGlvbih0LGUsaSl7dmFyIG49WHQodGhpcy50ZW1wbGF0ZSk7cmV0dXJuIG5ldyB0ZSh0aGlzLmxpbmtlcix0aGlzLnZtLG4sdCxlLGkpfTt2YXIgQ3I9NzAwLCRyPTgwMCxrcj04NTAseHI9MTEwMCxBcj0xNTAwLE9yPTE1MDAsVHI9MTc1MCxOcj0yZTMsanI9MmUzLEVyPTIxMDAsRnI9MCxTcj17cHJpb3JpdHk6TnIscGFyYW1zOltcInRyYWNrLWJ5XCIsXCJzdGFnZ2VyXCIsXCJlbnRlci1zdGFnZ2VyXCIsXCJsZWF2ZS1zdGFnZ2VyXCJdLGJpbmQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmV4cHJlc3Npb24ubWF0Y2goLyguKikgKD86aW58b2YpICguKikvKTtpZih0KXt2YXIgZT10WzFdLm1hdGNoKC9cXCgoLiopLCguKilcXCkvKTtlPyh0aGlzLml0ZXJhdG9yPWVbMV0udHJpbSgpLHRoaXMuYWxpYXM9ZVsyXS50cmltKCkpOnRoaXMuYWxpYXM9dFsxXS50cmltKCksdGhpcy5leHByZXNzaW9uPXRbMl19aWYodGhpcy5hbGlhcyl7dGhpcy5pZD1cIl9fdi1mb3JfX1wiKyArK0ZyO3ZhciBpPXRoaXMuZWwudGFnTmFtZTt0aGlzLmlzT3B0aW9uPShcIk9QVElPTlwiPT09aXx8XCJPUFRHUk9VUFwiPT09aSkmJlwiU0VMRUNUXCI9PT10aGlzLmVsLnBhcmVudE5vZGUudGFnTmFtZSx0aGlzLnN0YXJ0PWl0KFwidi1mb3Itc3RhcnRcIiksdGhpcy5lbmQ9aXQoXCJ2LWZvci1lbmRcIiksSih0aGlzLmVsLHRoaXMuZW5kKSxCKHRoaXMuc3RhcnQsdGhpcy5lbmQpLHRoaXMuY2FjaGU9T2JqZWN0LmNyZWF0ZShudWxsKSx0aGlzLmZhY3Rvcnk9bmV3IGFlKHRoaXMudm0sdGhpcy5lbCl9fSx1cGRhdGU6ZnVuY3Rpb24odCl7dGhpcy5kaWZmKHQpLHRoaXMudXBkYXRlUmVmKCksdGhpcy51cGRhdGVNb2RlbCgpfSxkaWZmOmZ1bmN0aW9uKHQpe3ZhciBlLG4scixzLG8sYSxoPXRbMF0sbD10aGlzLmZyb21PYmplY3Q9bShoKSYmaShoLFwiJGtleVwiKSYmaShoLFwiJHZhbHVlXCIpLGM9dGhpcy5wYXJhbXMudHJhY2tCeSx1PXRoaXMuZnJhZ3MsZj10aGlzLmZyYWdzPW5ldyBBcnJheSh0Lmxlbmd0aCkscD10aGlzLmFsaWFzLGQ9dGhpcy5pdGVyYXRvcix2PXRoaXMuc3RhcnQsZz10aGlzLmVuZCxfPUgodiksYj0hdTtmb3IoZT0wLG49dC5sZW5ndGg7bj5lO2UrKyloPXRbZV0scz1sP2guJGtleTpudWxsLG89bD9oLiR2YWx1ZTpoLGE9IW0obykscj0hYiYmdGhpcy5nZXRDYWNoZWRGcmFnKG8sZSxzKSxyPyhyLnJldXNlZD0hMCxyLnNjb3BlLiRpbmRleD1lLHMmJihyLnNjb3BlLiRrZXk9cyksZCYmKHIuc2NvcGVbZF09bnVsbCE9PXM/czplKSwoY3x8bHx8YSkmJihyLnNjb3BlW3BdPW8pKToocj10aGlzLmNyZWF0ZShvLHAsZSxzKSxyLmZyZXNoPSFiKSxmW2VdPXIsYiYmci5iZWZvcmUoZyk7aWYoIWIpe3ZhciB5PTAsdz11Lmxlbmd0aC1mLmxlbmd0aDtmb3IodGhpcy52bS5fdkZvclJlbW92aW5nPSEwLGU9MCxuPXUubGVuZ3RoO24+ZTtlKyspcj11W2VdLHIucmV1c2VkfHwodGhpcy5kZWxldGVDYWNoZWRGcmFnKHIpLHRoaXMucmVtb3ZlKHIseSsrLHcsXykpO3RoaXMudm0uX3ZGb3JSZW1vdmluZz0hMSx5JiYodGhpcy52bS5fd2F0Y2hlcnM9dGhpcy52bS5fd2F0Y2hlcnMuZmlsdGVyKGZ1bmN0aW9uKHQpe3JldHVybiB0LmFjdGl2ZX0pKTt2YXIgQywkLGsseD0wO2ZvcihlPTAsbj1mLmxlbmd0aDtuPmU7ZSsrKXI9ZltlXSxDPWZbZS0xXSwkPUM/Qy5zdGFnZ2VyQ2I/Qy5zdGFnZ2VyQW5jaG9yOkMuZW5kfHxDLm5vZGU6dixyLnJldXNlZCYmIXIuc3RhZ2dlckNiPyhrPWhlKHIsdix0aGlzLmlkKSxrPT09Q3x8ayYmaGUoayx2LHRoaXMuaWQpPT09Q3x8dGhpcy5tb3ZlKHIsJCkpOnRoaXMuaW5zZXJ0KHIseCsrLCQsXyksci5yZXVzZWQ9ci5mcmVzaD0hMX19LGNyZWF0ZTpmdW5jdGlvbih0LGUsaSxuKXt2YXIgcj10aGlzLl9ob3N0LHM9dGhpcy5fc2NvcGV8fHRoaXMudm0sbz1PYmplY3QuY3JlYXRlKHMpO28uJHJlZnM9T2JqZWN0LmNyZWF0ZShzLiRyZWZzKSxvLiRlbHM9T2JqZWN0LmNyZWF0ZShzLiRlbHMpLG8uJHBhcmVudD1zLG8uJGZvckNvbnRleHQ9dGhpcyxwdChvLGUsdCwhMCkscHQobyxcIiRpbmRleFwiLGkpLG4/cHQobyxcIiRrZXlcIixuKTpvLiRrZXkmJl8obyxcIiRrZXlcIixudWxsKSx0aGlzLml0ZXJhdG9yJiZwdChvLHRoaXMuaXRlcmF0b3IsbnVsbCE9PW4/bjppKTt2YXIgYT10aGlzLmZhY3RvcnkuY3JlYXRlKHIsbyx0aGlzLl9mcmFnKTtyZXR1cm4gYS5mb3JJZD10aGlzLmlkLHRoaXMuY2FjaGVGcmFnKHQsYSxpLG4pLGF9LHVwZGF0ZVJlZjpmdW5jdGlvbigpe3ZhciB0PXRoaXMuZGVzY3JpcHRvci5yZWY7aWYodCl7dmFyIGUsaT0odGhpcy5fc2NvcGV8fHRoaXMudm0pLiRyZWZzO3RoaXMuZnJvbU9iamVjdD8oZT17fSx0aGlzLmZyYWdzLmZvckVhY2goZnVuY3Rpb24odCl7ZVt0LnNjb3BlLiRrZXldPWxlKHQpfSkpOmU9dGhpcy5mcmFncy5tYXAobGUpLGlbdF09ZX19LHVwZGF0ZU1vZGVsOmZ1bmN0aW9uKCl7aWYodGhpcy5pc09wdGlvbil7dmFyIHQ9dGhpcy5zdGFydC5wYXJlbnROb2RlLGU9dCYmdC5fX3ZfbW9kZWw7ZSYmZS5mb3JjZVVwZGF0ZSgpfX0saW5zZXJ0OmZ1bmN0aW9uKHQsZSxpLG4pe3Quc3RhZ2dlckNiJiYodC5zdGFnZ2VyQ2IuY2FuY2VsKCksdC5zdGFnZ2VyQ2I9bnVsbCk7dmFyIHI9dGhpcy5nZXRTdGFnZ2VyKHQsZSxudWxsLFwiZW50ZXJcIik7aWYobiYmcil7dmFyIHM9dC5zdGFnZ2VyQW5jaG9yO3N8fChzPXQuc3RhZ2dlckFuY2hvcj1pdChcInN0YWdnZXItYW5jaG9yXCIpLHMuX192X2ZyYWc9dCksVihzLGkpO3ZhciBvPXQuc3RhZ2dlckNiPXcoZnVuY3Rpb24oKXt0LnN0YWdnZXJDYj1udWxsLHQuYmVmb3JlKHMpLHoocyl9KTtzZXRUaW1lb3V0KG8scil9ZWxzZSB0LmJlZm9yZShpLm5leHRTaWJsaW5nKX0scmVtb3ZlOmZ1bmN0aW9uKHQsZSxpLG4pe2lmKHQuc3RhZ2dlckNiKXJldHVybiB0LnN0YWdnZXJDYi5jYW5jZWwoKSx2b2lkKHQuc3RhZ2dlckNiPW51bGwpO3ZhciByPXRoaXMuZ2V0U3RhZ2dlcih0LGUsaSxcImxlYXZlXCIpO2lmKG4mJnIpe3ZhciBzPXQuc3RhZ2dlckNiPXcoZnVuY3Rpb24oKXt0LnN0YWdnZXJDYj1udWxsLHQucmVtb3ZlKCl9KTtzZXRUaW1lb3V0KHMscil9ZWxzZSB0LnJlbW92ZSgpfSxtb3ZlOmZ1bmN0aW9uKHQsZSl7ZS5uZXh0U2libGluZ3x8dGhpcy5lbmQucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzLmVuZCksdC5iZWZvcmUoZS5uZXh0U2libGluZywhMSl9LGNhY2hlRnJhZzpmdW5jdGlvbih0LGUsbixyKXt2YXIgcyxvPXRoaXMucGFyYW1zLnRyYWNrQnksYT10aGlzLmNhY2hlLGg9IW0odCk7cnx8b3x8aD8ocz1vP1wiJGluZGV4XCI9PT1vP246dFtvXTpyfHx0LGFbc118fChhW3NdPWUpKToocz10aGlzLmlkLGkodCxzKT9udWxsPT09dFtzXSYmKHRbc109ZSk6Xyh0LHMsZSkpLGUucmF3PXR9LGdldENhY2hlZEZyYWc6ZnVuY3Rpb24odCxlLGkpe3ZhciBuLHI9dGhpcy5wYXJhbXMudHJhY2tCeSxzPSFtKHQpO2lmKGl8fHJ8fHMpe3ZhciBvPXI/XCIkaW5kZXhcIj09PXI/ZTp0W3JdOml8fHQ7bj10aGlzLmNhY2hlW29dfWVsc2Ugbj10W3RoaXMuaWRdO3JldHVybiBuJiYobi5yZXVzZWR8fG4uZnJlc2gpLG59LGRlbGV0ZUNhY2hlZEZyYWc6ZnVuY3Rpb24odCl7dmFyIGU9dC5yYXcsbj10aGlzLnBhcmFtcy50cmFja0J5LHI9dC5zY29wZSxzPXIuJGluZGV4LG89aShyLFwiJGtleVwiKSYmci4ka2V5LGE9IW0oZSk7aWYobnx8b3x8YSl7dmFyIGg9bj9cIiRpbmRleFwiPT09bj9zOmVbbl06b3x8ZTt0aGlzLmNhY2hlW2hdPW51bGx9ZWxzZSBlW3RoaXMuaWRdPW51bGwsdC5yYXc9bnVsbH0sZ2V0U3RhZ2dlcjpmdW5jdGlvbih0LGUsaSxuKXtuKz1cIlN0YWdnZXJcIjt2YXIgcj10Lm5vZGUuX192X3RyYW5zLHM9ciYmci5ob29rcyxvPXMmJihzW25dfHxzLnN0YWdnZXIpO3JldHVybiBvP28uY2FsbCh0LGUsaSk6ZSpwYXJzZUludCh0aGlzLnBhcmFtc1tuXXx8dGhpcy5wYXJhbXMuc3RhZ2dlciwxMCl9LF9wcmVQcm9jZXNzOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnJhd1ZhbHVlPXQsdH0sX3Bvc3RQcm9jZXNzOmZ1bmN0aW9uKHQpe2lmKE9pKHQpKXJldHVybiB0O2lmKGcodCkpe2Zvcih2YXIgZSxpPU9iamVjdC5rZXlzKHQpLG49aS5sZW5ndGgscj1uZXcgQXJyYXkobik7bi0tOyllPWlbbl0scltuXT17JGtleTplLCR2YWx1ZTp0W2VdfTtyZXR1cm4gcn1yZXR1cm5cIm51bWJlclwiIT10eXBlb2YgdHx8aXNOYU4odCl8fCh0PWNlKHQpKSx0fHxbXX0sdW5iaW5kOmZ1bmN0aW9uKCl7aWYodGhpcy5kZXNjcmlwdG9yLnJlZiYmKCh0aGlzLl9zY29wZXx8dGhpcy52bSkuJHJlZnNbdGhpcy5kZXNjcmlwdG9yLnJlZl09bnVsbCksdGhpcy5mcmFncylmb3IodmFyIHQsZT10aGlzLmZyYWdzLmxlbmd0aDtlLS07KXQ9dGhpcy5mcmFnc1tlXSx0aGlzLmRlbGV0ZUNhY2hlZEZyYWcodCksdC5kZXN0cm95KCl9fSxEcj17cHJpb3JpdHk6anIsYmluZDpmdW5jdGlvbigpe3ZhciB0PXRoaXMuZWw7aWYodC5fX3Z1ZV9fKXRoaXMuaW52YWxpZD0hMDtlbHNle3ZhciBlPXQubmV4dEVsZW1lbnRTaWJsaW5nO2UmJm51bGwhPT1NKGUsXCJ2LWVsc2VcIikmJih6KGUpLHRoaXMuZWxzZUVsPWUpLHRoaXMuYW5jaG9yPWl0KFwidi1pZlwiKSxKKHQsdGhpcy5hbmNob3IpfX0sdXBkYXRlOmZ1bmN0aW9uKHQpe3RoaXMuaW52YWxpZHx8KHQ/dGhpcy5mcmFnfHx0aGlzLmluc2VydCgpOnRoaXMucmVtb3ZlKCkpfSxpbnNlcnQ6ZnVuY3Rpb24oKXt0aGlzLmVsc2VGcmFnJiYodGhpcy5lbHNlRnJhZy5yZW1vdmUoKSx0aGlzLmVsc2VGcmFnPW51bGwpLHRoaXMuZmFjdG9yeXx8KHRoaXMuZmFjdG9yeT1uZXcgYWUodGhpcy52bSx0aGlzLmVsKSksdGhpcy5mcmFnPXRoaXMuZmFjdG9yeS5jcmVhdGUodGhpcy5faG9zdCx0aGlzLl9zY29wZSx0aGlzLl9mcmFnKSx0aGlzLmZyYWcuYmVmb3JlKHRoaXMuYW5jaG9yKX0scmVtb3ZlOmZ1bmN0aW9uKCl7dGhpcy5mcmFnJiYodGhpcy5mcmFnLnJlbW92ZSgpLHRoaXMuZnJhZz1udWxsKSx0aGlzLmVsc2VFbCYmIXRoaXMuZWxzZUZyYWcmJih0aGlzLmVsc2VGYWN0b3J5fHwodGhpcy5lbHNlRmFjdG9yeT1uZXcgYWUodGhpcy5lbHNlRWwuX2NvbnRleHR8fHRoaXMudm0sdGhpcy5lbHNlRWwpKSx0aGlzLmVsc2VGcmFnPXRoaXMuZWxzZUZhY3RvcnkuY3JlYXRlKHRoaXMuX2hvc3QsdGhpcy5fc2NvcGUsdGhpcy5fZnJhZyksdGhpcy5lbHNlRnJhZy5iZWZvcmUodGhpcy5hbmNob3IpKX0sdW5iaW5kOmZ1bmN0aW9uKCl7dGhpcy5mcmFnJiZ0aGlzLmZyYWcuZGVzdHJveSgpLHRoaXMuZWxzZUZyYWcmJnRoaXMuZWxzZUZyYWcuZGVzdHJveSgpfX0sUHI9e2JpbmQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmVsLm5leHRFbGVtZW50U2libGluZzt0JiZudWxsIT09TSh0LFwidi1lbHNlXCIpJiYodGhpcy5lbHNlRWw9dCl9LHVwZGF0ZTpmdW5jdGlvbih0KXt0aGlzLmFwcGx5KHRoaXMuZWwsdCksdGhpcy5lbHNlRWwmJnRoaXMuYXBwbHkodGhpcy5lbHNlRWwsIXQpfSxhcHBseTpmdW5jdGlvbih0LGUpe2Z1bmN0aW9uIGkoKXt0LnN0eWxlLmRpc3BsYXk9ZT9cIlwiOlwibm9uZVwifUgodCk/Uih0LGU/MTotMSxpLHRoaXMudm0pOmkoKX19LFJyPXtiaW5kOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcyxlPXRoaXMuZWwsaT1cInJhbmdlXCI9PT1lLnR5cGUsbj10aGlzLnBhcmFtcy5sYXp5LHI9dGhpcy5wYXJhbXMubnVtYmVyLHM9dGhpcy5wYXJhbXMuZGVib3VuY2UsYT0hMTtpZihTaXx8aXx8KHRoaXMub24oXCJjb21wb3NpdGlvbnN0YXJ0XCIsZnVuY3Rpb24oKXthPSEwfSksdGhpcy5vbihcImNvbXBvc2l0aW9uZW5kXCIsZnVuY3Rpb24oKXthPSExLG58fHQubGlzdGVuZXIoKX0pKSx0aGlzLmZvY3VzZWQ9ITEsaXx8bnx8KHRoaXMub24oXCJmb2N1c1wiLGZ1bmN0aW9uKCl7dC5mb2N1c2VkPSEwfSksdGhpcy5vbihcImJsdXJcIixmdW5jdGlvbigpe3QuZm9jdXNlZD0hMSx0Ll9mcmFnJiYhdC5fZnJhZy5pbnNlcnRlZHx8dC5yYXdMaXN0ZW5lcigpfSkpLHRoaXMubGlzdGVuZXI9dGhpcy5yYXdMaXN0ZW5lcj1mdW5jdGlvbigpe2lmKCFhJiZ0Ll9ib3VuZCl7dmFyIG49cnx8aT9vKGUudmFsdWUpOmUudmFsdWU7dC5zZXQobiksV2koZnVuY3Rpb24oKXt0Ll9ib3VuZCYmIXQuZm9jdXNlZCYmdC51cGRhdGUodC5fd2F0Y2hlci52YWx1ZSl9KX19LHMmJih0aGlzLmxpc3RlbmVyPWIodGhpcy5saXN0ZW5lcixzKSksdGhpcy5oYXNqUXVlcnk9XCJmdW5jdGlvblwiPT10eXBlb2YgalF1ZXJ5LHRoaXMuaGFzalF1ZXJ5KXt2YXIgaD1qUXVlcnkuZm4ub24/XCJvblwiOlwiYmluZFwiO2pRdWVyeShlKVtoXShcImNoYW5nZVwiLHRoaXMucmF3TGlzdGVuZXIpLG58fGpRdWVyeShlKVtoXShcImlucHV0XCIsdGhpcy5saXN0ZW5lcil9ZWxzZSB0aGlzLm9uKFwiY2hhbmdlXCIsdGhpcy5yYXdMaXN0ZW5lciksbnx8dGhpcy5vbihcImlucHV0XCIsdGhpcy5saXN0ZW5lcik7IW4mJkZpJiYodGhpcy5vbihcImN1dFwiLGZ1bmN0aW9uKCl7V2kodC5saXN0ZW5lcil9KSx0aGlzLm9uKFwia2V5dXBcIixmdW5jdGlvbihlKXs0NiE9PWUua2V5Q29kZSYmOCE9PWUua2V5Q29kZXx8dC5saXN0ZW5lcigpfSkpLChlLmhhc0F0dHJpYnV0ZShcInZhbHVlXCIpfHxcIlRFWFRBUkVBXCI9PT1lLnRhZ05hbWUmJmUudmFsdWUudHJpbSgpKSYmKHRoaXMuYWZ0ZXJCaW5kPXRoaXMubGlzdGVuZXIpfSx1cGRhdGU6ZnVuY3Rpb24odCl7dGhpcy5lbC52YWx1ZT1zKHQpfSx1bmJpbmQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmVsO2lmKHRoaXMuaGFzalF1ZXJ5KXt2YXIgZT1qUXVlcnkuZm4ub2ZmP1wib2ZmXCI6XCJ1bmJpbmRcIjtqUXVlcnkodClbZV0oXCJjaGFuZ2VcIix0aGlzLmxpc3RlbmVyKSxqUXVlcnkodClbZV0oXCJpbnB1dFwiLHRoaXMubGlzdGVuZXIpfX19LExyPXtiaW5kOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcyxlPXRoaXMuZWw7dGhpcy5nZXRWYWx1ZT1mdW5jdGlvbigpe2lmKGUuaGFzT3duUHJvcGVydHkoXCJfdmFsdWVcIikpcmV0dXJuIGUuX3ZhbHVlO3ZhciBpPWUudmFsdWU7cmV0dXJuIHQucGFyYW1zLm51bWJlciYmKGk9byhpKSksaX0sdGhpcy5saXN0ZW5lcj1mdW5jdGlvbigpe3Quc2V0KHQuZ2V0VmFsdWUoKSl9LHRoaXMub24oXCJjaGFuZ2VcIix0aGlzLmxpc3RlbmVyKSxlLmhhc0F0dHJpYnV0ZShcImNoZWNrZWRcIikmJih0aGlzLmFmdGVyQmluZD10aGlzLmxpc3RlbmVyKX0sdXBkYXRlOmZ1bmN0aW9uKHQpe3RoaXMuZWwuY2hlY2tlZD1DKHQsdGhpcy5nZXRWYWx1ZSgpKX19LEhyPXtiaW5kOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcyxlPXRoaXMuZWw7dGhpcy5mb3JjZVVwZGF0ZT1mdW5jdGlvbigpe3QuX3dhdGNoZXImJnQudXBkYXRlKHQuX3dhdGNoZXIuZ2V0KCkpfTt2YXIgaT10aGlzLm11bHRpcGxlPWUuaGFzQXR0cmlidXRlKFwibXVsdGlwbGVcIik7dGhpcy5saXN0ZW5lcj1mdW5jdGlvbigpe3ZhciBuPXVlKGUsaSk7bj10LnBhcmFtcy5udW1iZXI/T2kobik/bi5tYXAobyk6byhuKTpuLHQuc2V0KG4pfSx0aGlzLm9uKFwiY2hhbmdlXCIsdGhpcy5saXN0ZW5lcik7dmFyIG49dWUoZSxpLCEwKTsoaSYmbi5sZW5ndGh8fCFpJiZudWxsIT09bikmJih0aGlzLmFmdGVyQmluZD10aGlzLmxpc3RlbmVyKSx0aGlzLnZtLiRvbihcImhvb2s6YXR0YWNoZWRcIix0aGlzLmZvcmNlVXBkYXRlKX0sdXBkYXRlOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZWw7ZS5zZWxlY3RlZEluZGV4PS0xO2Zvcih2YXIgaSxuLHI9dGhpcy5tdWx0aXBsZSYmT2kodCkscz1lLm9wdGlvbnMsbz1zLmxlbmd0aDtvLS07KWk9c1tvXSxuPWkuaGFzT3duUHJvcGVydHkoXCJfdmFsdWVcIik/aS5fdmFsdWU6aS52YWx1ZSxpLnNlbGVjdGVkPXI/ZmUodCxuKT4tMTpDKHQsbil9LHVuYmluZDpmdW5jdGlvbigpe3RoaXMudm0uJG9mZihcImhvb2s6YXR0YWNoZWRcIix0aGlzLmZvcmNlVXBkYXRlKX19LE1yPXtiaW5kOmZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCgpe3ZhciB0PWkuY2hlY2tlZDtyZXR1cm4gdCYmaS5oYXNPd25Qcm9wZXJ0eShcIl90cnVlVmFsdWVcIik/aS5fdHJ1ZVZhbHVlOiF0JiZpLmhhc093blByb3BlcnR5KFwiX2ZhbHNlVmFsdWVcIik/aS5fZmFsc2VWYWx1ZTp0fXZhciBlPXRoaXMsaT10aGlzLmVsO3RoaXMuZ2V0VmFsdWU9ZnVuY3Rpb24oKXtyZXR1cm4gaS5oYXNPd25Qcm9wZXJ0eShcIl92YWx1ZVwiKT9pLl92YWx1ZTplLnBhcmFtcy5udW1iZXI/byhpLnZhbHVlKTppLnZhbHVlfSx0aGlzLmxpc3RlbmVyPWZ1bmN0aW9uKCl7dmFyIG49ZS5fd2F0Y2hlci52YWx1ZTtpZihPaShuKSl7dmFyIHI9ZS5nZXRWYWx1ZSgpO2kuY2hlY2tlZD95KG4scik8MCYmbi5wdXNoKHIpOm4uJHJlbW92ZShyKX1lbHNlIGUuc2V0KHQoKSl9LHRoaXMub24oXCJjaGFuZ2VcIix0aGlzLmxpc3RlbmVyKSxpLmhhc0F0dHJpYnV0ZShcImNoZWNrZWRcIikmJih0aGlzLmFmdGVyQmluZD10aGlzLmxpc3RlbmVyKX0sdXBkYXRlOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZWw7T2kodCk/ZS5jaGVja2VkPXkodCx0aGlzLmdldFZhbHVlKCkpPi0xOmUuaGFzT3duUHJvcGVydHkoXCJfdHJ1ZVZhbHVlXCIpP2UuY2hlY2tlZD1DKHQsZS5fdHJ1ZVZhbHVlKTplLmNoZWNrZWQ9ISF0fX0sV3I9e3RleHQ6UnIscmFkaW86THIsc2VsZWN0OkhyLGNoZWNrYm94Ok1yfSxJcj17cHJpb3JpdHk6JHIsdHdvV2F5OiEwLGhhbmRsZXJzOldyLHBhcmFtczpbXCJsYXp5XCIsXCJudW1iZXJcIixcImRlYm91bmNlXCJdLGJpbmQ6ZnVuY3Rpb24oKXt0aGlzLmNoZWNrRmlsdGVycygpLHRoaXMuaGFzUmVhZCYmIXRoaXMuaGFzV3JpdGU7dmFyIHQsZT10aGlzLmVsLGk9ZS50YWdOYW1lO2lmKFwiSU5QVVRcIj09PWkpdD1XcltlLnR5cGVdfHxXci50ZXh0O2Vsc2UgaWYoXCJTRUxFQ1RcIj09PWkpdD1Xci5zZWxlY3Q7ZWxzZXtpZihcIlRFWFRBUkVBXCIhPT1pKXJldHVybjt0PVdyLnRleHR9ZS5fX3ZfbW9kZWw9dGhpcyx0LmJpbmQuY2FsbCh0aGlzKSx0aGlzLnVwZGF0ZT10LnVwZGF0ZSx0aGlzLl91bmJpbmQ9dC51bmJpbmR9LGNoZWNrRmlsdGVyczpmdW5jdGlvbigpe3ZhciB0PXRoaXMuZmlsdGVycztpZih0KWZvcih2YXIgZT10Lmxlbmd0aDtlLS07KXt2YXIgaT1BdCh0aGlzLnZtLiRvcHRpb25zLFwiZmlsdGVyc1wiLHRbZV0ubmFtZSk7KFwiZnVuY3Rpb25cIj09dHlwZW9mIGl8fGkucmVhZCkmJih0aGlzLmhhc1JlYWQ9ITApLGkud3JpdGUmJih0aGlzLmhhc1dyaXRlPSEwKX19LHVuYmluZDpmdW5jdGlvbigpe3RoaXMuZWwuX192X21vZGVsPW51bGwsdGhpcy5fdW5iaW5kJiZ0aGlzLl91bmJpbmQoKX19LEJyPXtlc2M6MjcsdGFiOjksZW50ZXI6MTMsc3BhY2U6MzIsXCJkZWxldGVcIjpbOCw0Nl0sdXA6MzgsbGVmdDozNyxyaWdodDozOSxkb3duOjQwfSxWcj17cHJpb3JpdHk6Q3IsYWNjZXB0U3RhdGVtZW50OiEwLGtleUNvZGVzOkJyLGJpbmQ6ZnVuY3Rpb24oKXtpZihcIklGUkFNRVwiPT09dGhpcy5lbC50YWdOYW1lJiZcImxvYWRcIiE9PXRoaXMuYXJnKXt2YXIgdD10aGlzO3RoaXMuaWZyYW1lQmluZD1mdW5jdGlvbigpe3EodC5lbC5jb250ZW50V2luZG93LHQuYXJnLHQuaGFuZGxlcix0Lm1vZGlmaWVycy5jYXB0dXJlKX0sdGhpcy5vbihcImxvYWRcIix0aGlzLmlmcmFtZUJpbmQpfX0sdXBkYXRlOmZ1bmN0aW9uKHQpe2lmKHRoaXMuZGVzY3JpcHRvci5yYXd8fCh0PWZ1bmN0aW9uKCl7fSksXCJmdW5jdGlvblwiPT10eXBlb2YgdCl7dGhpcy5tb2RpZmllcnMuc3RvcCYmKHQ9ZGUodCkpLHRoaXMubW9kaWZpZXJzLnByZXZlbnQmJih0PXZlKHQpKSx0aGlzLm1vZGlmaWVycy5zZWxmJiYodD1tZSh0KSk7dmFyIGU9T2JqZWN0LmtleXModGhpcy5tb2RpZmllcnMpLmZpbHRlcihmdW5jdGlvbih0KXtyZXR1cm5cInN0b3BcIiE9PXQmJlwicHJldmVudFwiIT09dCYmXCJzZWxmXCIhPT10fSk7ZS5sZW5ndGgmJih0PXBlKHQsZSkpLHRoaXMucmVzZXQoKSx0aGlzLmhhbmRsZXI9dCx0aGlzLmlmcmFtZUJpbmQ/dGhpcy5pZnJhbWVCaW5kKCk6cSh0aGlzLmVsLHRoaXMuYXJnLHRoaXMuaGFuZGxlcix0aGlzLm1vZGlmaWVycy5jYXB0dXJlKX19LHJlc2V0OmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5pZnJhbWVCaW5kP3RoaXMuZWwuY29udGVudFdpbmRvdzp0aGlzLmVsO3RoaXMuaGFuZGxlciYmUSh0LHRoaXMuYXJnLHRoaXMuaGFuZGxlcil9LHVuYmluZDpmdW5jdGlvbigpe3RoaXMucmVzZXQoKX19LHpyPVtcIi13ZWJraXQtXCIsXCItbW96LVwiLFwiLW1zLVwiXSxVcj1bXCJXZWJraXRcIixcIk1velwiLFwibXNcIl0sSnI9LyFpbXBvcnRhbnQ7PyQvLHFyPU9iamVjdC5jcmVhdGUobnVsbCksUXI9bnVsbCxHcj17ZGVlcDohMCx1cGRhdGU6ZnVuY3Rpb24odCl7XCJzdHJpbmdcIj09dHlwZW9mIHQ/dGhpcy5lbC5zdHlsZS5jc3NUZXh0PXQ6T2kodCk/dGhpcy5oYW5kbGVPYmplY3QodC5yZWR1Y2Uodix7fSkpOnRoaXMuaGFuZGxlT2JqZWN0KHR8fHt9KX0saGFuZGxlT2JqZWN0OmZ1bmN0aW9uKHQpe3ZhciBlLGksbj10aGlzLmNhY2hlfHwodGhpcy5jYWNoZT17fSk7Zm9yKGUgaW4gbillIGluIHR8fCh0aGlzLmhhbmRsZVNpbmdsZShlLG51bGwpLGRlbGV0ZSBuW2VdKTtmb3IoZSBpbiB0KWk9dFtlXSxpIT09bltlXSYmKG5bZV09aSx0aGlzLmhhbmRsZVNpbmdsZShlLGkpKX0saGFuZGxlU2luZ2xlOmZ1bmN0aW9uKHQsZSl7aWYodD1nZSh0KSlpZihudWxsIT1lJiYoZSs9XCJcIiksZSl7dmFyIGk9SnIudGVzdChlKT9cImltcG9ydGFudFwiOlwiXCI7aSYmKGU9ZS5yZXBsYWNlKEpyLFwiXCIpLnRyaW0oKSksdGhpcy5lbC5zdHlsZS5zZXRQcm9wZXJ0eSh0LGUsaSl9ZWxzZSB0aGlzLmVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KHQpfX0sS3I9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsWnI9L154bGluazovLFhyPS9edi18Xjp8XkB8Xig/OmlzfHRyYW5zaXRpb258dHJhbnNpdGlvbi1tb2RlfGRlYm91bmNlfHRyYWNrLWJ5fHN0YWdnZXJ8ZW50ZXItc3RhZ2dlcnxsZWF2ZS1zdGFnZ2VyKSQvLFlyPS9eKD86dmFsdWV8Y2hlY2tlZHxzZWxlY3RlZHxtdXRlZCkkLyx0cz0vXig/OmRyYWdnYWJsZXxjb250ZW50ZWRpdGFibGV8c3BlbGxjaGVjaykkLyxlcz17dmFsdWU6XCJfdmFsdWVcIixcInRydWUtdmFsdWVcIjpcIl90cnVlVmFsdWVcIixcImZhbHNlLXZhbHVlXCI6XCJfZmFsc2VWYWx1ZVwifSxpcz17cHJpb3JpdHk6a3IsYmluZDpmdW5jdGlvbigpe3ZhciB0PXRoaXMuYXJnLGU9dGhpcy5lbC50YWdOYW1lO3R8fCh0aGlzLmRlZXA9ITApO3ZhciBpPXRoaXMuZGVzY3JpcHRvcixuPWkuaW50ZXJwO24mJihpLmhhc09uZVRpbWUmJih0aGlzLmV4cHJlc3Npb249aihuLHRoaXMuX3Njb3BlfHx0aGlzLnZtKSksKFhyLnRlc3QodCl8fFwibmFtZVwiPT09dCYmKFwiUEFSVElBTFwiPT09ZXx8XCJTTE9UXCI9PT1lKSkmJih0aGlzLmVsLnJlbW92ZUF0dHJpYnV0ZSh0KSx0aGlzLmludmFsaWQ9ITApKX0sdXBkYXRlOmZ1bmN0aW9uKHQpe2lmKCF0aGlzLmludmFsaWQpe3ZhciBlPXRoaXMuYXJnO3RoaXMuYXJnP3RoaXMuaGFuZGxlU2luZ2xlKGUsdCk6dGhpcy5oYW5kbGVPYmplY3QodHx8e30pfX0saGFuZGxlT2JqZWN0OkdyLmhhbmRsZU9iamVjdCxoYW5kbGVTaW5nbGU6ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLmVsLG49dGhpcy5kZXNjcmlwdG9yLmludGVycDt0aGlzLm1vZGlmaWVycy5jYW1lbCYmKHQ9bCh0KSksIW4mJllyLnRlc3QodCkmJnQgaW4gaSYmKGlbdF09XCJ2YWx1ZVwiPT09dCYmbnVsbD09ZT9cIlwiOmUpO3ZhciByPWVzW3RdO2lmKCFuJiZyKXtpW3JdPWU7dmFyIHM9aS5fX3ZfbW9kZWw7cyYmcy5saXN0ZW5lcigpfXJldHVyblwidmFsdWVcIj09PXQmJlwiVEVYVEFSRUFcIj09PWkudGFnTmFtZT92b2lkIGkucmVtb3ZlQXR0cmlidXRlKHQpOnZvaWQodHMudGVzdCh0KT9pLnNldEF0dHJpYnV0ZSh0LGU/XCJ0cnVlXCI6XCJmYWxzZVwiKTpudWxsIT1lJiZlIT09ITE/XCJjbGFzc1wiPT09dD8oaS5fX3ZfdHJhbnMmJihlKz1cIiBcIitpLl9fdl90cmFucy5pZCtcIi10cmFuc2l0aW9uXCIpLEcoaSxlKSk6WnIudGVzdCh0KT9pLnNldEF0dHJpYnV0ZU5TKEtyLHQsZT09PSEwP1wiXCI6ZSk6aS5zZXRBdHRyaWJ1dGUodCxlPT09ITA/XCJcIjplKTppLnJlbW92ZUF0dHJpYnV0ZSh0KSl9fSxucz17cHJpb3JpdHk6QXIsYmluZDpmdW5jdGlvbigpe2lmKHRoaXMuYXJnKXt2YXIgdD10aGlzLmlkPWwodGhpcy5hcmcpLGU9KHRoaXMuX3Njb3BlfHx0aGlzLnZtKS4kZWxzO2koZSx0KT9lW3RdPXRoaXMuZWw6cHQoZSx0LHRoaXMuZWwpfX0sdW5iaW5kOmZ1bmN0aW9uKCl7dmFyIHQ9KHRoaXMuX3Njb3BlfHx0aGlzLnZtKS4kZWxzO3RbdGhpcy5pZF09PT10aGlzLmVsJiYodFt0aGlzLmlkXT1udWxsKX19LHJzPXtiaW5kOmZ1bmN0aW9uKCl7fX0sc3M9e2JpbmQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmVsO3RoaXMudm0uJG9uY2UoXCJwcmUtaG9vazpjb21waWxlZFwiLGZ1bmN0aW9uKCl7dC5yZW1vdmVBdHRyaWJ1dGUoXCJ2LWNsb2FrXCIpfSl9fSxvcz17dGV4dDp1cixodG1sOnlyLFwiZm9yXCI6U3IsXCJpZlwiOkRyLHNob3c6UHIsbW9kZWw6SXIsb246VnIsYmluZDppcyxlbDpucyxyZWY6cnMsY2xvYWs6c3N9LGFzPXtkZWVwOiEwLHVwZGF0ZTpmdW5jdGlvbih0KXt0JiZcInN0cmluZ1wiPT10eXBlb2YgdD90aGlzLmhhbmRsZU9iamVjdChiZSh0KSk6Zyh0KT90aGlzLmhhbmRsZU9iamVjdCh0KTpPaSh0KT90aGlzLmhhbmRsZUFycmF5KHQpOnRoaXMuY2xlYW51cCgpfSxoYW5kbGVPYmplY3Q6ZnVuY3Rpb24odCl7dGhpcy5jbGVhbnVwKHQpO2Zvcih2YXIgZT10aGlzLnByZXZLZXlzPU9iamVjdC5rZXlzKHQpLGk9MCxuPWUubGVuZ3RoO24+aTtpKyspe3ZhciByPWVbaV07dFtyXT9LKHRoaXMuZWwscik6Wih0aGlzLmVsLHIpfX0saGFuZGxlQXJyYXk6ZnVuY3Rpb24odCl7dGhpcy5jbGVhbnVwKHQpO2Zvcih2YXIgZT0wLGk9dC5sZW5ndGg7aT5lO2UrKyl0W2VdJiZLKHRoaXMuZWwsdFtlXSk7dGhpcy5wcmV2S2V5cz10LnNsaWNlKCl9LGNsZWFudXA6ZnVuY3Rpb24odCl7aWYodGhpcy5wcmV2S2V5cylmb3IodmFyIGU9dGhpcy5wcmV2S2V5cy5sZW5ndGg7ZS0tOyl7dmFyIGk9dGhpcy5wcmV2S2V5c1tlXTshaXx8dCYmeWUodCxpKXx8Wih0aGlzLmVsLGkpfX19LGhzPXtwcmlvcml0eTpPcixwYXJhbXM6W1wia2VlcC1hbGl2ZVwiLFwidHJhbnNpdGlvbi1tb2RlXCIsXCJpbmxpbmUtdGVtcGxhdGVcIl0sYmluZDpmdW5jdGlvbigpe3RoaXMuZWwuX192dWVfX3x8KHRoaXMua2VlcEFsaXZlPXRoaXMucGFyYW1zLmtlZXBBbGl2ZSx0aGlzLmtlZXBBbGl2ZSYmKHRoaXMuY2FjaGU9e30pLHRoaXMucGFyYW1zLmlubGluZVRlbXBsYXRlJiYodGhpcy5pbmxpbmVUZW1wbGF0ZT1YKHRoaXMuZWwsITApKSx0aGlzLnBlbmRpbmdDb21wb25lbnRDYj10aGlzLkNvbXBvbmVudD1udWxsLHRoaXMucGVuZGluZ1JlbW92YWxzPTAsdGhpcy5wZW5kaW5nUmVtb3ZhbENiPW51bGwsdGhpcy5hbmNob3I9aXQoXCJ2LWNvbXBvbmVudFwiKSxKKHRoaXMuZWwsdGhpcy5hbmNob3IpLHRoaXMuZWwucmVtb3ZlQXR0cmlidXRlKFwiaXNcIiksdGhpcy5kZXNjcmlwdG9yLnJlZiYmdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUoXCJ2LXJlZjpcIit1KHRoaXMuZGVzY3JpcHRvci5yZWYpKSx0aGlzLmxpdGVyYWwmJnRoaXMuc2V0Q29tcG9uZW50KHRoaXMuZXhwcmVzc2lvbikpfSx1cGRhdGU6ZnVuY3Rpb24odCl7dGhpcy5saXRlcmFsfHx0aGlzLnNldENvbXBvbmVudCh0KX0sc2V0Q29tcG9uZW50OmZ1bmN0aW9uKHQsZSl7aWYodGhpcy5pbnZhbGlkYXRlUGVuZGluZygpLHQpe3ZhciBpPXRoaXM7dGhpcy5yZXNvbHZlQ29tcG9uZW50KHQsZnVuY3Rpb24oKXtpLm1vdW50Q29tcG9uZW50KGUpfSl9ZWxzZSB0aGlzLnVuYnVpbGQoITApLHRoaXMucmVtb3ZlKHRoaXMuY2hpbGRWTSxlKSx0aGlzLmNoaWxkVk09bnVsbH0scmVzb2x2ZUNvbXBvbmVudDpmdW5jdGlvbih0LGUpe3ZhciBpPXRoaXM7dGhpcy5wZW5kaW5nQ29tcG9uZW50Q2I9dyhmdW5jdGlvbihuKXtpLkNvbXBvbmVudE5hbWU9bi5vcHRpb25zLm5hbWV8fHQsaS5Db21wb25lbnQ9bixlKCl9KSx0aGlzLnZtLl9yZXNvbHZlQ29tcG9uZW50KHQsdGhpcy5wZW5kaW5nQ29tcG9uZW50Q2IpO1xufSxtb3VudENvbXBvbmVudDpmdW5jdGlvbih0KXt0aGlzLnVuYnVpbGQoITApO3ZhciBlPXRoaXMsaT10aGlzLkNvbXBvbmVudC5vcHRpb25zLmFjdGl2YXRlLG49dGhpcy5nZXRDYWNoZWQoKSxyPXRoaXMuYnVpbGQoKTtpJiYhbj8odGhpcy53YWl0aW5nRm9yPXIsd2UoaSxyLGZ1bmN0aW9uKCl7ZS53YWl0aW5nRm9yPT09ciYmKGUud2FpdGluZ0Zvcj1udWxsLGUudHJhbnNpdGlvbihyLHQpKX0pKToobiYmci5fdXBkYXRlUmVmKCksdGhpcy50cmFuc2l0aW9uKHIsdCkpfSxpbnZhbGlkYXRlUGVuZGluZzpmdW5jdGlvbigpe3RoaXMucGVuZGluZ0NvbXBvbmVudENiJiYodGhpcy5wZW5kaW5nQ29tcG9uZW50Q2IuY2FuY2VsKCksdGhpcy5wZW5kaW5nQ29tcG9uZW50Q2I9bnVsbCl9LGJ1aWxkOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0Q2FjaGVkKCk7aWYoZSlyZXR1cm4gZTtpZih0aGlzLkNvbXBvbmVudCl7dmFyIGk9e25hbWU6dGhpcy5Db21wb25lbnROYW1lLGVsOlh0KHRoaXMuZWwpLHRlbXBsYXRlOnRoaXMuaW5saW5lVGVtcGxhdGUscGFyZW50OnRoaXMuX2hvc3R8fHRoaXMudm0sX2xpbmtlckNhY2hhYmxlOiF0aGlzLmlubGluZVRlbXBsYXRlLF9yZWY6dGhpcy5kZXNjcmlwdG9yLnJlZixfYXNDb21wb25lbnQ6ITAsX2lzUm91dGVyVmlldzp0aGlzLl9pc1JvdXRlclZpZXcsX2NvbnRleHQ6dGhpcy52bSxfc2NvcGU6dGhpcy5fc2NvcGUsX2ZyYWc6dGhpcy5fZnJhZ307dCYmdihpLHQpO3ZhciBuPW5ldyB0aGlzLkNvbXBvbmVudChpKTtyZXR1cm4gdGhpcy5rZWVwQWxpdmUmJih0aGlzLmNhY2hlW3RoaXMuQ29tcG9uZW50LmNpZF09biksbn19LGdldENhY2hlZDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmtlZXBBbGl2ZSYmdGhpcy5jYWNoZVt0aGlzLkNvbXBvbmVudC5jaWRdfSx1bmJ1aWxkOmZ1bmN0aW9uKHQpe3RoaXMud2FpdGluZ0ZvciYmKHRoaXMud2FpdGluZ0Zvci4kZGVzdHJveSgpLHRoaXMud2FpdGluZ0Zvcj1udWxsKTt2YXIgZT10aGlzLmNoaWxkVk07cmV0dXJuIWV8fHRoaXMua2VlcEFsaXZlP3ZvaWQoZSYmKGUuX2luYWN0aXZlPSEwLGUuX3VwZGF0ZVJlZighMCkpKTp2b2lkIGUuJGRlc3Ryb3koITEsdCl9LHJlbW92ZTpmdW5jdGlvbih0LGUpe3ZhciBpPXRoaXMua2VlcEFsaXZlO2lmKHQpe3RoaXMucGVuZGluZ1JlbW92YWxzKyssdGhpcy5wZW5kaW5nUmVtb3ZhbENiPWU7dmFyIG49dGhpczt0LiRyZW1vdmUoZnVuY3Rpb24oKXtuLnBlbmRpbmdSZW1vdmFscy0tLGl8fHQuX2NsZWFudXAoKSwhbi5wZW5kaW5nUmVtb3ZhbHMmJm4ucGVuZGluZ1JlbW92YWxDYiYmKG4ucGVuZGluZ1JlbW92YWxDYigpLG4ucGVuZGluZ1JlbW92YWxDYj1udWxsKX0pfWVsc2UgZSYmZSgpfSx0cmFuc2l0aW9uOmZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcyxuPXRoaXMuY2hpbGRWTTtzd2l0Y2gobiYmKG4uX2luYWN0aXZlPSEwKSx0Ll9pbmFjdGl2ZT0hMSx0aGlzLmNoaWxkVk09dCxpLnBhcmFtcy50cmFuc2l0aW9uTW9kZSl7Y2FzZVwiaW4tb3V0XCI6dC4kYmVmb3JlKGkuYW5jaG9yLGZ1bmN0aW9uKCl7aS5yZW1vdmUobixlKX0pO2JyZWFrO2Nhc2VcIm91dC1pblwiOmkucmVtb3ZlKG4sZnVuY3Rpb24oKXt0LiRiZWZvcmUoaS5hbmNob3IsZSl9KTticmVhaztkZWZhdWx0OmkucmVtb3ZlKG4pLHQuJGJlZm9yZShpLmFuY2hvcixlKX19LHVuYmluZDpmdW5jdGlvbigpe2lmKHRoaXMuaW52YWxpZGF0ZVBlbmRpbmcoKSx0aGlzLnVuYnVpbGQoKSx0aGlzLmNhY2hlKXtmb3IodmFyIHQgaW4gdGhpcy5jYWNoZSl0aGlzLmNhY2hlW3RdLiRkZXN0cm95KCk7dGhpcy5jYWNoZT1udWxsfX19LGxzPXBuLl9wcm9wQmluZGluZ01vZGVzLGNzPXtiaW5kOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy52bSxlPXQuX2NvbnRleHQsaT10aGlzLmRlc2NyaXB0b3IucHJvcCxuPWkucGF0aCxyPWkucGFyZW50UGF0aCxzPWkubW9kZT09PWxzLlRXT19XQVksbz10aGlzLnBhcmVudFdhdGNoZXI9bmV3IHF0KGUscixmdW5jdGlvbihlKXtlPWJ0KGksZSksX3QoaSxlKSYmKHRbbl09ZSl9LHt0d29XYXk6cyxmaWx0ZXJzOmkuZmlsdGVycyxzY29wZTp0aGlzLl9zY29wZX0pO2lmKG10KHQsaSxvLnZhbHVlKSxzKXt2YXIgYT10aGlzO3QuJG9uY2UoXCJwcmUtaG9vazpjcmVhdGVkXCIsZnVuY3Rpb24oKXthLmNoaWxkV2F0Y2hlcj1uZXcgcXQodCxuLGZ1bmN0aW9uKHQpe28uc2V0KHQpfSx7c3luYzohMH0pfSl9fSx1bmJpbmQ6ZnVuY3Rpb24oKXt0aGlzLnBhcmVudFdhdGNoZXIudGVhcmRvd24oKSx0aGlzLmNoaWxkV2F0Y2hlciYmdGhpcy5jaGlsZFdhdGNoZXIudGVhcmRvd24oKX19LHVzPVtdLGZzPSExLHBzPVwidHJhbnNpdGlvblwiLGRzPVwiYW5pbWF0aW9uXCIsdnM9RGkrXCJEdXJhdGlvblwiLG1zPVJpK1wiRHVyYXRpb25cIixncz1rZS5wcm90b3R5cGU7Z3MuZW50ZXI9ZnVuY3Rpb24odCxlKXt0aGlzLmNhbmNlbFBlbmRpbmcoKSx0aGlzLmNhbGxIb29rKFwiYmVmb3JlRW50ZXJcIiksdGhpcy5jYj1lLEsodGhpcy5lbCx0aGlzLmVudGVyQ2xhc3MpLHQoKSx0aGlzLmVudGVyZWQ9ITEsdGhpcy5jYWxsSG9va1dpdGhDYihcImVudGVyXCIpLHRoaXMuZW50ZXJlZHx8KHRoaXMuY2FuY2VsPXRoaXMuaG9va3MmJnRoaXMuaG9va3MuZW50ZXJDYW5jZWxsZWQsQ2UodGhpcy5lbnRlck5leHRUaWNrKSl9LGdzLmVudGVyTmV4dFRpY2s9ZnVuY3Rpb24oKXt0aGlzLmp1c3RFbnRlcmVkPSEwO3ZhciB0PXRoaXM7c2V0VGltZW91dChmdW5jdGlvbigpe3QuanVzdEVudGVyZWQ9ITF9LDE3KTt2YXIgZT10aGlzLmVudGVyRG9uZSxpPXRoaXMuZ2V0Q3NzVHJhbnNpdGlvblR5cGUodGhpcy5lbnRlckNsYXNzKTt0aGlzLnBlbmRpbmdKc0NiP2k9PT1wcyYmWih0aGlzLmVsLHRoaXMuZW50ZXJDbGFzcyk6aT09PXBzPyhaKHRoaXMuZWwsdGhpcy5lbnRlckNsYXNzKSx0aGlzLnNldHVwQ3NzQ2IoUGksZSkpOmk9PT1kcz90aGlzLnNldHVwQ3NzQ2IoTGksZSk6ZSgpfSxncy5lbnRlckRvbmU9ZnVuY3Rpb24oKXt0aGlzLmVudGVyZWQ9ITAsdGhpcy5jYW5jZWw9dGhpcy5wZW5kaW5nSnNDYj1udWxsLFoodGhpcy5lbCx0aGlzLmVudGVyQ2xhc3MpLHRoaXMuY2FsbEhvb2soXCJhZnRlckVudGVyXCIpLHRoaXMuY2ImJnRoaXMuY2IoKX0sZ3MubGVhdmU9ZnVuY3Rpb24odCxlKXt0aGlzLmNhbmNlbFBlbmRpbmcoKSx0aGlzLmNhbGxIb29rKFwiYmVmb3JlTGVhdmVcIiksdGhpcy5vcD10LHRoaXMuY2I9ZSxLKHRoaXMuZWwsdGhpcy5sZWF2ZUNsYXNzKSx0aGlzLmxlZnQ9ITEsdGhpcy5jYWxsSG9va1dpdGhDYihcImxlYXZlXCIpLHRoaXMubGVmdHx8KHRoaXMuY2FuY2VsPXRoaXMuaG9va3MmJnRoaXMuaG9va3MubGVhdmVDYW5jZWxsZWQsdGhpcy5vcCYmIXRoaXMucGVuZGluZ0pzQ2ImJih0aGlzLmp1c3RFbnRlcmVkP3RoaXMubGVhdmVEb25lKCk6Q2UodGhpcy5sZWF2ZU5leHRUaWNrKSkpfSxncy5sZWF2ZU5leHRUaWNrPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5nZXRDc3NUcmFuc2l0aW9uVHlwZSh0aGlzLmxlYXZlQ2xhc3MpO2lmKHQpe3ZhciBlPXQ9PT1wcz9QaTpMaTt0aGlzLnNldHVwQ3NzQ2IoZSx0aGlzLmxlYXZlRG9uZSl9ZWxzZSB0aGlzLmxlYXZlRG9uZSgpfSxncy5sZWF2ZURvbmU9ZnVuY3Rpb24oKXt0aGlzLmxlZnQ9ITAsdGhpcy5jYW5jZWw9dGhpcy5wZW5kaW5nSnNDYj1udWxsLHRoaXMub3AoKSxaKHRoaXMuZWwsdGhpcy5sZWF2ZUNsYXNzKSx0aGlzLmNhbGxIb29rKFwiYWZ0ZXJMZWF2ZVwiKSx0aGlzLmNiJiZ0aGlzLmNiKCksdGhpcy5vcD1udWxsfSxncy5jYW5jZWxQZW5kaW5nPWZ1bmN0aW9uKCl7dGhpcy5vcD10aGlzLmNiPW51bGw7dmFyIHQ9ITE7dGhpcy5wZW5kaW5nQ3NzQ2ImJih0PSEwLFEodGhpcy5lbCx0aGlzLnBlbmRpbmdDc3NFdmVudCx0aGlzLnBlbmRpbmdDc3NDYiksdGhpcy5wZW5kaW5nQ3NzRXZlbnQ9dGhpcy5wZW5kaW5nQ3NzQ2I9bnVsbCksdGhpcy5wZW5kaW5nSnNDYiYmKHQ9ITAsdGhpcy5wZW5kaW5nSnNDYi5jYW5jZWwoKSx0aGlzLnBlbmRpbmdKc0NiPW51bGwpLHQmJihaKHRoaXMuZWwsdGhpcy5lbnRlckNsYXNzKSxaKHRoaXMuZWwsdGhpcy5sZWF2ZUNsYXNzKSksdGhpcy5jYW5jZWwmJih0aGlzLmNhbmNlbC5jYWxsKHRoaXMudm0sdGhpcy5lbCksdGhpcy5jYW5jZWw9bnVsbCl9LGdzLmNhbGxIb29rPWZ1bmN0aW9uKHQpe3RoaXMuaG9va3MmJnRoaXMuaG9va3NbdF0mJnRoaXMuaG9va3NbdF0uY2FsbCh0aGlzLnZtLHRoaXMuZWwpfSxncy5jYWxsSG9va1dpdGhDYj1mdW5jdGlvbih0KXt2YXIgZT10aGlzLmhvb2tzJiZ0aGlzLmhvb2tzW3RdO2UmJihlLmxlbmd0aD4xJiYodGhpcy5wZW5kaW5nSnNDYj13KHRoaXNbdCtcIkRvbmVcIl0pKSxlLmNhbGwodGhpcy52bSx0aGlzLmVsLHRoaXMucGVuZGluZ0pzQ2IpKX0sZ3MuZ2V0Q3NzVHJhbnNpdGlvblR5cGU9ZnVuY3Rpb24odCl7aWYoISghUGl8fGRvY3VtZW50LmhpZGRlbnx8dGhpcy5ob29rcyYmdGhpcy5ob29rcy5jc3M9PT0hMXx8eGUodGhpcy5lbCkpKXt2YXIgZT10aGlzLnR5cGV8fHRoaXMudHlwZUNhY2hlW3RdO2lmKGUpcmV0dXJuIGU7dmFyIGk9dGhpcy5lbC5zdHlsZSxuPXdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuZWwpLHI9aVt2c118fG5bdnNdO2lmKHImJlwiMHNcIiE9PXIpZT1wcztlbHNle3ZhciBzPWlbbXNdfHxuW21zXTtzJiZcIjBzXCIhPT1zJiYoZT1kcyl9cmV0dXJuIGUmJih0aGlzLnR5cGVDYWNoZVt0XT1lKSxlfX0sZ3Muc2V0dXBDc3NDYj1mdW5jdGlvbih0LGUpe3RoaXMucGVuZGluZ0Nzc0V2ZW50PXQ7dmFyIGk9dGhpcyxuPXRoaXMuZWwscj10aGlzLnBlbmRpbmdDc3NDYj1mdW5jdGlvbihzKXtzLnRhcmdldD09PW4mJihRKG4sdCxyKSxpLnBlbmRpbmdDc3NFdmVudD1pLnBlbmRpbmdDc3NDYj1udWxsLCFpLnBlbmRpbmdKc0NiJiZlJiZlKCkpfTtxKG4sdCxyKX07dmFyIF9zPXtwcmlvcml0eTp4cix1cGRhdGU6ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLmVsLG49QXQodGhpcy52bS4kb3B0aW9ucyxcInRyYW5zaXRpb25zXCIsdCk7dD10fHxcInZcIixpLl9fdl90cmFucz1uZXcga2UoaSx0LG4sdGhpcy52bSksZSYmWihpLGUrXCItdHJhbnNpdGlvblwiKSxLKGksdCtcIi10cmFuc2l0aW9uXCIpfX0sYnM9e3N0eWxlOkdyLFwiY2xhc3NcIjphcyxjb21wb25lbnQ6aHMscHJvcDpjcyx0cmFuc2l0aW9uOl9zfSx5cz1wbi5fcHJvcEJpbmRpbmdNb2Rlcyx3cz17fSxDcz0vXlskX2EtekEtWl0rW1xcdyRdKiQvLCRzPS9edi1iaW5kOnxeOi8sa3M9L152LW9uOnxeQC8seHM9L152LShbXjpdKykoPzokfDooLiopJCkvLEFzPS9cXC5bXlxcLl0rL2csT3M9L14odi1iaW5kOnw6KT90cmFuc2l0aW9uJC8sVHM9W1wiZm9yXCIsXCJpZlwiXSxOcz0xZTM7SmUudGVybWluYWw9ITA7dmFyIGpzPS9bXlxcd1xcLTpcXC5dLyxFcz1PYmplY3QuZnJlZXplKHtjb21waWxlOlRlLGNvbXBpbGVBbmRMaW5rUHJvcHM6U2UsY29tcGlsZVJvb3Q6RGUsdGVybWluYWxEaXJlY3RpdmVzOlRzLHRyYW5zY2x1ZGU6WGUscmVzb2x2ZVNsb3RzOmlpfSksRnM9L152LW9uOnxeQC87YWkucHJvdG90eXBlLl9iaW5kPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5uYW1lLGU9dGhpcy5kZXNjcmlwdG9yO2lmKChcImNsb2FrXCIhPT10fHx0aGlzLnZtLl9pc0NvbXBpbGVkKSYmdGhpcy5lbCYmdGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUpe3ZhciBpPWUuYXR0cnx8XCJ2LVwiK3Q7dGhpcy5lbC5yZW1vdmVBdHRyaWJ1dGUoaSl9dmFyIG49ZS5kZWY7aWYoXCJmdW5jdGlvblwiPT10eXBlb2Ygbj90aGlzLnVwZGF0ZT1uOnYodGhpcyxuKSx0aGlzLl9zZXR1cFBhcmFtcygpLHRoaXMuYmluZCYmdGhpcy5iaW5kKCksdGhpcy5fYm91bmQ9ITAsdGhpcy5saXRlcmFsKXRoaXMudXBkYXRlJiZ0aGlzLnVwZGF0ZShlLnJhdyk7ZWxzZSBpZigodGhpcy5leHByZXNzaW9ufHx0aGlzLm1vZGlmaWVycykmJih0aGlzLnVwZGF0ZXx8dGhpcy50d29XYXkpJiYhdGhpcy5fY2hlY2tTdGF0ZW1lbnQoKSl7dmFyIHI9dGhpczt0aGlzLnVwZGF0ZT90aGlzLl91cGRhdGU9ZnVuY3Rpb24odCxlKXtyLl9sb2NrZWR8fHIudXBkYXRlKHQsZSl9OnRoaXMuX3VwZGF0ZT1vaTt2YXIgcz10aGlzLl9wcmVQcm9jZXNzP3AodGhpcy5fcHJlUHJvY2Vzcyx0aGlzKTpudWxsLG89dGhpcy5fcG9zdFByb2Nlc3M/cCh0aGlzLl9wb3N0UHJvY2Vzcyx0aGlzKTpudWxsLGE9dGhpcy5fd2F0Y2hlcj1uZXcgcXQodGhpcy52bSx0aGlzLmV4cHJlc3Npb24sdGhpcy5fdXBkYXRlLHtmaWx0ZXJzOnRoaXMuZmlsdGVycyx0d29XYXk6dGhpcy50d29XYXksZGVlcDp0aGlzLmRlZXAscHJlUHJvY2VzczpzLHBvc3RQcm9jZXNzOm8sc2NvcGU6dGhpcy5fc2NvcGV9KTt0aGlzLmFmdGVyQmluZD90aGlzLmFmdGVyQmluZCgpOnRoaXMudXBkYXRlJiZ0aGlzLnVwZGF0ZShhLnZhbHVlKX19LGFpLnByb3RvdHlwZS5fc2V0dXBQYXJhbXM9ZnVuY3Rpb24oKXtpZih0aGlzLnBhcmFtcyl7dmFyIHQ9dGhpcy5wYXJhbXM7dGhpcy5wYXJhbXM9T2JqZWN0LmNyZWF0ZShudWxsKTtmb3IodmFyIGUsaSxuLHI9dC5sZW5ndGg7ci0tOyllPXRbcl0sbj1sKGUpLGk9Vyh0aGlzLmVsLGUpLG51bGwhPWk/dGhpcy5fc2V0dXBQYXJhbVdhdGNoZXIobixpKTooaT1NKHRoaXMuZWwsZSksbnVsbCE9aSYmKHRoaXMucGFyYW1zW25dPVwiXCI9PT1pPyEwOmkpKX19LGFpLnByb3RvdHlwZS5fc2V0dXBQYXJhbVdhdGNoZXI9ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLG49ITEscj0odGhpcy5fc2NvcGV8fHRoaXMudm0pLiR3YXRjaChlLGZ1bmN0aW9uKGUscil7aWYoaS5wYXJhbXNbdF09ZSxuKXt2YXIgcz1pLnBhcmFtV2F0Y2hlcnMmJmkucGFyYW1XYXRjaGVyc1t0XTtzJiZzLmNhbGwoaSxlLHIpfWVsc2Ugbj0hMH0se2ltbWVkaWF0ZTohMCx1c2VyOiExfSk7KHRoaXMuX3BhcmFtVW53YXRjaEZuc3x8KHRoaXMuX3BhcmFtVW53YXRjaEZucz1bXSkpLnB1c2gocil9LGFpLnByb3RvdHlwZS5fY2hlY2tTdGF0ZW1lbnQ9ZnVuY3Rpb24oKXt2YXIgdD10aGlzLmV4cHJlc3Npb247aWYodCYmdGhpcy5hY2NlcHRTdGF0ZW1lbnQmJiFCdCh0KSl7dmFyIGU9SXQodCkuZ2V0LGk9dGhpcy5fc2NvcGV8fHRoaXMudm0sbj1mdW5jdGlvbih0KXtpLiRldmVudD10LGUuY2FsbChpLGkpLGkuJGV2ZW50PW51bGx9O3JldHVybiB0aGlzLmZpbHRlcnMmJihuPWkuX2FwcGx5RmlsdGVycyhuLG51bGwsdGhpcy5maWx0ZXJzKSksdGhpcy51cGRhdGUobiksITB9fSxhaS5wcm90b3R5cGUuc2V0PWZ1bmN0aW9uKHQpe3RoaXMudHdvV2F5JiZ0aGlzLl93aXRoTG9jayhmdW5jdGlvbigpe3RoaXMuX3dhdGNoZXIuc2V0KHQpfSl9LGFpLnByb3RvdHlwZS5fd2l0aExvY2s9ZnVuY3Rpb24odCl7dmFyIGU9dGhpcztlLl9sb2NrZWQ9ITAsdC5jYWxsKGUpLFdpKGZ1bmN0aW9uKCl7ZS5fbG9ja2VkPSExfSl9LGFpLnByb3RvdHlwZS5vbj1mdW5jdGlvbih0LGUsaSl7cSh0aGlzLmVsLHQsZSxpKSwodGhpcy5fbGlzdGVuZXJzfHwodGhpcy5fbGlzdGVuZXJzPVtdKSkucHVzaChbdCxlXSl9LGFpLnByb3RvdHlwZS5fdGVhcmRvd249ZnVuY3Rpb24oKXtpZih0aGlzLl9ib3VuZCl7dGhpcy5fYm91bmQ9ITEsdGhpcy51bmJpbmQmJnRoaXMudW5iaW5kKCksdGhpcy5fd2F0Y2hlciYmdGhpcy5fd2F0Y2hlci50ZWFyZG93bigpO3ZhciB0LGU9dGhpcy5fbGlzdGVuZXJzO2lmKGUpZm9yKHQ9ZS5sZW5ndGg7dC0tOylRKHRoaXMuZWwsZVt0XVswXSxlW3RdWzFdKTt2YXIgaT10aGlzLl9wYXJhbVVud2F0Y2hGbnM7aWYoaSlmb3IodD1pLmxlbmd0aDt0LS07KWlbdF0oKTt0aGlzLnZtPXRoaXMuZWw9dGhpcy5fd2F0Y2hlcj10aGlzLl9saXN0ZW5lcnM9bnVsbH19O3ZhciBTcz0vW158XVxcfFtefF0vO1R0KGRpKSxyaShkaSksc2koZGkpLGhpKGRpKSxsaShkaSksY2koZGkpLHVpKGRpKSxmaShkaSkscGkoZGkpO3ZhciBEcz17cHJpb3JpdHk6RXIscGFyYW1zOltcIm5hbWVcIl0sYmluZDpmdW5jdGlvbigpe3ZhciB0PXRoaXMucGFyYW1zLm5hbWV8fFwiZGVmYXVsdFwiLGU9dGhpcy52bS5fc2xvdENvbnRlbnRzJiZ0aGlzLnZtLl9zbG90Q29udGVudHNbdF07ZSYmZS5oYXNDaGlsZE5vZGVzKCk/dGhpcy5jb21waWxlKGUuY2xvbmVOb2RlKCEwKSx0aGlzLnZtLl9jb250ZXh0LHRoaXMudm0pOnRoaXMuZmFsbGJhY2soKX0sY29tcGlsZTpmdW5jdGlvbih0LGUsaSl7aWYodCYmZSl7aWYodGhpcy5lbC5oYXNDaGlsZE5vZGVzKCkmJjE9PT10LmNoaWxkTm9kZXMubGVuZ3RoJiYxPT09dC5jaGlsZE5vZGVzWzBdLm5vZGVUeXBlJiZ0LmNoaWxkTm9kZXNbMF0uaGFzQXR0cmlidXRlKFwidi1pZlwiKSl7dmFyIG49ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRlbXBsYXRlXCIpO24uc2V0QXR0cmlidXRlKFwidi1lbHNlXCIsXCJcIiksbi5pbm5lckhUTUw9dGhpcy5lbC5pbm5lckhUTUwsbi5fY29udGV4dD10aGlzLnZtLHQuYXBwZW5kQ2hpbGQobil9dmFyIHI9aT9pLl9zY29wZTp0aGlzLl9zY29wZTt0aGlzLnVubGluaz1lLiRjb21waWxlKHQsaSxyLHRoaXMuX2ZyYWcpfXQ/Sih0aGlzLmVsLHQpOnoodGhpcy5lbCl9LGZhbGxiYWNrOmZ1bmN0aW9uKCl7dGhpcy5jb21waWxlKFgodGhpcy5lbCwhMCksdGhpcy52bSl9LHVuYmluZDpmdW5jdGlvbigpe3RoaXMudW5saW5rJiZ0aGlzLnVubGluaygpfX0sUHM9e3ByaW9yaXR5OlRyLHBhcmFtczpbXCJuYW1lXCJdLHBhcmFtV2F0Y2hlcnM6e25hbWU6ZnVuY3Rpb24odCl7RHIucmVtb3ZlLmNhbGwodGhpcyksdCYmdGhpcy5pbnNlcnQodCl9fSxiaW5kOmZ1bmN0aW9uKCl7dGhpcy5hbmNob3I9aXQoXCJ2LXBhcnRpYWxcIiksSih0aGlzLmVsLHRoaXMuYW5jaG9yKSx0aGlzLmluc2VydCh0aGlzLnBhcmFtcy5uYW1lKX0saW5zZXJ0OmZ1bmN0aW9uKHQpe3ZhciBlPUF0KHRoaXMudm0uJG9wdGlvbnMsXCJwYXJ0aWFsc1wiLHQpO2UmJih0aGlzLmZhY3Rvcnk9bmV3IGFlKHRoaXMudm0sZSksRHIuaW5zZXJ0LmNhbGwodGhpcykpfSx1bmJpbmQ6ZnVuY3Rpb24oKXt0aGlzLmZyYWcmJnRoaXMuZnJhZy5kZXN0cm95KCl9fSxScz17c2xvdDpEcyxwYXJ0aWFsOlBzfSxMcz1Tci5fcG9zdFByb2Nlc3MsSHM9LyhcXGR7M30pKD89XFxkKS9nLE1zPXtvcmRlckJ5OmdpLGZpbHRlckJ5Om1pLGxpbWl0Qnk6dmksanNvbjp7cmVhZDpmdW5jdGlvbih0LGUpe3JldHVyblwic3RyaW5nXCI9PXR5cGVvZiB0P3Q6SlNPTi5zdHJpbmdpZnkodCxudWxsLE51bWJlcihlKXx8Mil9LHdyaXRlOmZ1bmN0aW9uKHQpe3RyeXtyZXR1cm4gSlNPTi5wYXJzZSh0KX1jYXRjaChlKXtyZXR1cm4gdH19fSxjYXBpdGFsaXplOmZ1bmN0aW9uKHQpe3JldHVybiB0fHwwPT09dD8odD10LnRvU3RyaW5nKCksdC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSt0LnNsaWNlKDEpKTpcIlwifSx1cHBlcmNhc2U6ZnVuY3Rpb24odCl7cmV0dXJuIHR8fDA9PT10P3QudG9TdHJpbmcoKS50b1VwcGVyQ2FzZSgpOlwiXCJ9LGxvd2VyY2FzZTpmdW5jdGlvbih0KXtyZXR1cm4gdHx8MD09PXQ/dC50b1N0cmluZygpLnRvTG93ZXJDYXNlKCk6XCJcIn0sY3VycmVuY3k6ZnVuY3Rpb24odCxlKXtpZih0PXBhcnNlRmxvYXQodCksIWlzRmluaXRlKHQpfHwhdCYmMCE9PXQpcmV0dXJuXCJcIjtlPW51bGwhPWU/ZTpcIiRcIjt2YXIgaT1NYXRoLmFicyh0KS50b0ZpeGVkKDIpLG49aS5zbGljZSgwLC0zKSxyPW4ubGVuZ3RoJTMscz1yPjA/bi5zbGljZSgwLHIpKyhuLmxlbmd0aD4zP1wiLFwiOlwiXCIpOlwiXCIsbz1pLnNsaWNlKC0zKSxhPTA+dD9cIi1cIjpcIlwiO3JldHVybiBhK2UrcytuLnNsaWNlKHIpLnJlcGxhY2UoSHMsXCIkMSxcIikrb30scGx1cmFsaXplOmZ1bmN0aW9uKHQpe3ZhciBlPWQoYXJndW1lbnRzLDEpO3JldHVybiBlLmxlbmd0aD4xP2VbdCUxMC0xXXx8ZVtlLmxlbmd0aC0xXTplWzBdKygxPT09dD9cIlwiOlwic1wiKX0sZGVib3VuY2U6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdD8oZXx8KGU9MzAwKSxiKHQsZSkpOnZvaWQgMH19O3JldHVybiBiaShkaSksZGkudmVyc2lvbj1cIjEuMC4xOFwiLHBuLmRldnRvb2xzJiZqaSYmamkuZW1pdChcImluaXRcIixkaSksZGl9KTsiLCJcbi8vIEltcG9ydCB0aGUgbGlicmFyeVxuaW1wb3J0IFZ1ZSBmcm9tICcuL2xpYi92dWUubWluLmpzJ1xuXG4vLyBpbXBvcnQgc2VjdXJlU3RvcmFnZSBmcm9tICcuL2xpYi9zZWN1cmUtbG9jYWwtc3RvcmFnZS5qcydcbmltcG9ydCB7IHNlY3VyZVN0b3JhZ2UsIHNldFBhc3N3b3JkIH0gZnJvbSAnLi9saWIvc2VjdXJlLWxvY2FsLXN0b3JhZ2UuanMnXG5pbXBvcnQgcmFoYXNpYSBmcm9tICcuL2xpYi9wYXNzd29yZC5qcydcblxuVnVlLmNvbmZpZy5kZXZ0b29scyA9IGZhbHNlXG5cbi8vIFNldCB0aGUgcGFzc3dvcmRcbnNldFBhc3N3b3JkLmNhbGwoc2VjdXJlU3RvcmFnZSxyYWhhc2lhKVxuXG4vLyBzZXQgdGhlIGxvY2FsU3RvcmFnZVxuaWYoIHNlY3VyZVN0b3JhZ2UuZ2V0KCd1c2VyUm9sZScpICE9PSAnYWRtaW4nICkgc2VjdXJlU3RvcmFnZS5zZXQoe1xuICBuYW1hVXNlcjogJ0Jvc05hdWZhbCcsXG4gIHVzZXJSb2xlOiAndXNlcicsXG59KVxuXG4vLyBpbXBvcnQgY29tcG9uZW50c1xuaW1wb3J0IHRoZUFwcCBmcm9tICcuL2NvbXBvbmVudHMvYXBwLnZ1ZSdcblxuLy8gTWFrZSBhIG5ldyBjb21wb25lbnRzXG5sZXQgQXBwID0gVnVlLmV4dGVuZCh0aGVBcHApXG5cbi8vIE1vdW50IFRoZSBBcHBcbm5ldyBBcHAoeyBlbDogJyNhcHAnLCByZXBsYWNlOiBmYWxzZSB9KVxuIl19
