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
    return "undefined";
  } else if (data instanceof Date) {
    return data.toISOString();
  } else if (data instanceof Error) {
    return data.stack ? data.stack : "Undefined Error";
  } else if (typeof data === "object") {
    return JSON.stringify(data);
  }
  return "undefined";
}
