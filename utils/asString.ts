// Copyright 2021 the optic authors. All rights reserved. MIT license.
import { stringify } from "./stringify.ts";

/**
 * Convert an unknown object into a string.  Special considerations are:
 * * `function` - returns "[function]"
 * * `Date` - returns the toISOString() date
 * * `Error` - returns error stack trace or "[Error]" if there is none
 * * `Object` - custom JSON.stringify() like representation or "[Unable to stringify()] if an error occurs"
 */
export function asString(data: unknown): string {
  if (typeof data === "string") {
    return data;
  } else if (
    data === null ||
    typeof data === "number" ||
    typeof data === "bigint" ||
    typeof data === "boolean" ||
    typeof data === "undefined"
  ) {
    return `${data}`;
  } else if (typeof data === "symbol") {
    return String(data);
  } else if (typeof data === "function") {
    return "[function]";
  } else if (data instanceof Date) {
    return data.toISOString();
  } else if (data instanceof Error) {
    return data.stack ? data.stack : "[" + data.name + "]";
  } else if (typeof data === "object") {
    try {
      return stringify(data);
    } catch (_err) {
      return "[Unable to stringify()]";
    }
  }
  return "undefined";
}
