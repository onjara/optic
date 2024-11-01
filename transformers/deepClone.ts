// Copyright 2020-2024 the optic authors. All rights reserved. MIT license.
// deno-lint-ignore-file
// Adapted from https://github.com/pvorb/clone
// MIT - Copyright © 2011-2016 Paul Vorbach and contributors.

const nativeMap = Map;
const nativeSet = Set;
const nativePromise = Promise;

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype). */
export function clone(
  parent: any,
  circular?: any,
  depth?: number,
  prototype?: any,
) {
  if (typeof circular === "object") {
    depth = circular.depth;
    prototype = circular.prototype;
    circular = circular.circular;
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  let allParents: unknown[] = [];
  let allChildren: unknown[] = [];

  if (typeof circular == "undefined") {
    circular = true;
  }

  if (typeof depth == "undefined") {
    depth = Infinity;
  }

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent: any, depth: number) {
    // cloning null always returns null
    if (parent === null) {
      return null;
    }

    if (depth === 0) {
      return parent;
    }

    let child: any;
    let proto: any;
    if (typeof parent != "object") {
      return parent;
    }

    if (_instanceof(parent, nativeMap)) {
      child = new nativeMap();
    } else if (_instanceof(parent, nativeSet)) {
      child = new nativeSet();
    } else if (_instanceof(parent, nativePromise)) {
      child = new nativePromise(function (resolve, reject) {
        (parent as Promise<any>).then(function (value) {
          resolve(_clone(value, depth - 1));
        }, function (err) {
          reject(_clone(err, depth - 1));
        });
      });
    } else if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp((parent as RegExp).source, __getRegExpFlags(parent));
      if ((parent as RegExp).lastIndex) {
        (child as RegExp).lastIndex = (parent as RegExp).lastIndex;
      }
    } else if (clone.__isDate(parent)) {
      child = new Date((parent as Date).getTime());
    } else if (_instanceof(parent, Error)) {
      child = Object.create(parent);
    } else {
      if (typeof prototype == "undefined") {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      } else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      let index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    if (_instanceof(parent, nativeMap)) {
      (parent as Map<unknown, unknown>).forEach(function (value, key) {
        let keyChild = _clone(key, depth - 1);
        let valueChild = _clone(value, depth - 1);
        (child as Map<unknown, unknown>).set(keyChild, valueChild);
      });
    }
    if (_instanceof(parent, nativeSet)) {
      (parent as Set<unknown>).forEach(function (value) {
        let entryChild = _clone(value, depth - 1);
        (child as Set<unknown>).add(entryChild);
      });
    }

    for (let i in parent) {
      var attrs = Object.getOwnPropertyDescriptor(parent, i);
      if (attrs) {
        child[i] = _clone(parent[i], depth - 1);
      }

      try {
        var objProperty = Object.getOwnPropertyDescriptor(parent, i);
        child[i] = _clone(parent[i], depth - 1);
      } catch (e) {
        if (e instanceof TypeError) {
          // when in strict mode, TypeError will be thrown if child[i] property only has a getter
          // we can't do anything about this, other than inform the user that this property cannot be set.
          continue;
        } else if (e instanceof ReferenceError) {
          //this may happen in non strict mode
          continue;
        }
      }
    }

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(parent);
      for (var i = 0; i < symbols.length; i++) {
        // Don't need to worry about cloning a symbol because it is a primitive,
        // like a number or string.
        var symbol = symbols[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
        if (descriptor && !descriptor.enumerable) {
          continue;
        }
        child[symbol] = _clone(parent[symbol], depth - 1);
        if (descriptor) {
          Object.defineProperty(child, symbol, descriptor);
        }
      }
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent: any) {
  if (parent === null) {
    return null;
  }

  const c: any = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o: any) {
  return Object.prototype.toString.call(o);
}
clone.__objToStr = __objToStr;

function _instanceof(obj: unknown, ofType: any) {
  return ofType != null && obj instanceof ofType;
}

function __isDate(o: any) {
  return typeof o === "object" && __objToStr(o) === "[object Date]";
}
clone.__isDate = __isDate;

function __isArray(o: any) {
  return typeof o === "object" && __objToStr(o) === "[object Array]";
}
clone.__isArray = __isArray;

function __isRegExp(o: any) {
  return typeof o === "object" && __objToStr(o) === "[object RegExp]";
}
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re: RegExp) {
  var flags = "";
  if (re.global) flags += "g";
  if (re.ignoreCase) flags += "i";
  if (re.multiline) flags += "m";
  return flags;
}
clone.__getRegExpFlags = __getRegExpFlags;
