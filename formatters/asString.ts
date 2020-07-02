/**
 * Convert an unknown object into a string.  Special considerations are:
 * * `function` - returns "[function]"
 * * `Date` - returns the toISOString() date
 * * `Error` - returns error stack trace or "[Error]" if there is none
 * * `Object` - JSON.stringify() representation or "[Unable to JSON.stringify()] if an error occurs"
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
    return data.stack ? data.stack : "[Error]";
  } else if (typeof data === "object") {
    try {
      return JSON.stringify(data);
    } catch (err) {
      return "[Unable to JSON.stringify()]";
    }
  }
  return "undefined";
}
