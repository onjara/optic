// Copyright 2020 the optic authors. All rights reserved. MIT license.
// Adapted from https://github.com/planttheidea/fast-stringify (MIT, Copyright (c) 2018 Tony Quetano)

import { DateTimeFormatter } from "../types.ts";

/**
 * @function getReferenceKey
 *
 * @description
 * get the reference key for the circular value
 *
 * @param keys the keys to build the reference key from
 * @param cutoff the maximum number of keys to include
 * @returns the reference key
 */
function getReferenceKey(keys: string[], cutoff: number) {
  return keys.slice(0, cutoff).join(".") || ".";
}

/**
 * @function getCutoff
 *
 * @description
 * faster `Array.prototype.indexOf` implementation build for slicing / splicing
 *
 * @param array the array to match the value in
 * @param value the value to match
 * @returns the matching index, or -1
 */
function getCutoff(array: unknown[], value: unknown) {
  const { length } = array;

  for (let index = 0; index < length; ++index) {
    if (array[index] === value) {
      return index + 1;
    }
  }

  return 0;
}

type StandardReplacer = (key: string, value: unknown) => unknown;
type CircularReplacer = (
  key: string,
  value: unknown,
  referenceKey: string,
) => unknown;

/**
 * @function createReplacer
 *
 * @description
 * create a replacer method that handles circular values
 *
 * @param [replacer] a custom replacer to use for non-circular values
 * @param [circularReplacer] a custom replacer to use for circular methods
 * @param [dateTimeFormatter] a custom date/time formatter for Date objects
 * @returns the value to stringify
 */
function createReplacer(
  options: StringifyOptions | undefined,
): StandardReplacer {
  const hasReplacer = typeof options?.replacer === "function";
  const hasCircularReplacer = typeof options?.circularReplacer === "function";

  const cache: unknown[] = [];
  const keys: string[] = [];

  return function replace(
    this: Record<string, unknown>,
    key: string,
    value: unknown,
  ) {
    // Before the value reaches here, if it is an object and contains a toJSON
    // function, then this is called prior to reaching here.  Use the original
    // value instead.
    const originalValue = this[key];
    if (typeof value === "object") {
      if (cache.length) {
        const thisCutoff = getCutoff(cache, this);

        if (thisCutoff === 0) {
          cache[cache.length] = this;
        } else {
          cache.splice(thisCutoff);
          keys.splice(thisCutoff);
        }

        keys[keys.length] = key;

        const valueCutoff = getCutoff(cache, value);

        if (valueCutoff !== 0) {
          return hasCircularReplacer
            ? options!.circularReplacer!.call(
              this,
              key,
              value,
              getReferenceKey(keys, valueCutoff),
            )
            : `[ref=${getReferenceKey(keys, valueCutoff)}]`;
        }
      } else {
        cache[0] = value;
        keys[0] = key;
      }
      if (value instanceof Set) {
        return Array.from(value.values());
      } else if (value instanceof Map) {
        return Array.from(value.entries());
      } else if (value instanceof RegExp) {
        return { regexSource: value.source, flags: value.flags };
      } else if (value instanceof Error) {
        return options?.suppressErrorStack
          ? value.name + ": " + value.message
          : value.stack;
      }
    } else if (typeof value === "undefined") {
      return "undefined";
    } else if (value === Infinity) {
      return "Infinity";
    } else if (value === -Infinity) {
      return "-Infinity";
    } else if (value !== value) {
      //NaN is the only JavaScript value that is treated as unequal to itself,
      //therefore you can always test if a value is NaN by checking it for equality to itself
      return "NaN";
    } else if (typeof value === "bigint") {
      return value.toLocaleString();
    } else if (typeof value === "symbol") {
      return String(value);
    } else if (typeof value === "function") {
      return "[function]";
    } else if (originalValue instanceof Date && options?.dateTimeFormatter) {
      return options.dateTimeFormatter.formatDateTime(originalValue);
    }

    return hasReplacer ? options!.replacer!.call(this, key, value) : value;
  };
}

export interface StringifyOptions {
  replacer?: StandardReplacer;
  indent?: string | number;
  circularReplacer?: CircularReplacer;
  dateTimeFormatter?: DateTimeFormatter;
  suppressErrorStack?: boolean;
}

/**
 * @function stringify
 *
 * @description
 * JSON stringifier that handles circular values, Maps, Arrays, Sets, RegEx and Dates
 *
 * @param the value to stringify
 * @param [options] a set of options to supply a custom replacer, custom 
 * circular replacer, a date time formatter and indent configuration
 * @returns the stringified output in JSON format
 */
export function stringify(
  value: unknown,
  options?: StringifyOptions,
) {
  return JSON.stringify(value, createReplacer(options), options?.indent);
}
