import { RequestResponseConsumer } from "./types.ts";
import { HttpLogRecord } from "./httpLogRecord.ts";
import { DateTimeFormatter, DateTimeFormatterFn, Formatter, LogRecord } from "../types.ts";
import { SimpleDateTimeFormatter } from "../formatters/simpleDateTimeFormatter.ts";
import { encode } from "../utils/encoder.ts";

type ValueFunction = (logData:HttpLogRecord, id?:string) => string;

/**
 * https://httpd.apache.org/docs/2.4/mod/mod_log_config.html#customlog
 * https://nginx.org/en/docs/http/ngx_http_log_module.html
 * https://nginx.org/en/docs/varindex.html
 * 
 * $local_host, $local_port client IP address (connInfo - remote connection)
 * $remote_host, $remote_port, local connect address (connInfo - local connection)
 * $request_body_bytes, $request_body_headers_bytes
 * $response_body_bytes, $response_body_headers_bytes
 * $request_cookie_{name}, Request cookie value
 * $response_cookie_{name}, Response cookie value
 * $request_header_{name}, Request header value
 * $response_header_{name}, Response header value
 * $process_time - Time to serve request in ms
 * $method - Request.method
 * $url - Request.url
 * $status - Response.status
 * $status_text - Response.statusText
 * $request_body - Request.body
 * $request_body_first_line - First line of request (body?), Apache %r
 * $response_body - Response.body
 * $response_body_first_line - Response.body
 * $request_received - Date/time request received
 * $referrer - Request referer header
 * $user-agent - Request user-agent header
 * $content-length - Response user agent header
 * 
 */
export class HttpFormatter implements Formatter<string>, RequestResponseConsumer {
  consumesRequestBody = false;
  consumesResponseBody = false;
  #textEncoder = new TextEncoder();
  //Default to Common Log Format
  #format = '$[remote_host] - - [$process_time] "$[method] $[url] HTTP" $[status] $[response_header_Content-Length]';
  #formatTokens:string[] = [];
  //Default to Common Log Format date/times: 10/Oct/2000:13:55:36 -0700
  #dateTimeFormatter: DateTimeFormatter = new SimpleDateTimeFormatter("DD/MMM/YYYY:hh:mm:ss tt");
  readonly #REQ_COOKIE_LEN = "$[request_cookie_".length;
  readonly #RES_COOKIE_LEN = "$[response_cookie_".length;
  readonly #REQ_HEADER_LEN = "$[request_header_".length;
  readonly #RES_HEADER_LEN = "$[response_header_".length;

  constructor() {
    this.preprocessFormat();
  }

  withFormat(newFormat:string): this {
    this.#format = newFormat;
    this.preprocessFormat();
    return this;
  }
  
  withDateTimeFormat(
    dtf: DateTimeFormatterFn | DateTimeFormatter | string,
  ): this {
    if (typeof dtf === "string") {
      dtf = new SimpleDateTimeFormatter(dtf);
    } else if (typeof dtf === "function") {
      dtf = { formatDateTime: dtf };
    }
    this.#dateTimeFormatter = dtf;
    return this;
  }

  /**
   * Transform single log string, e.g.
   * `"$[local_host]:$[local_port] hello"`
   * to array of dynamic tokens and static text, e.g.
   * `["$[local_host]", ":", "$[local_port]", " hello"]`
   */
  private preprocessFormat(): void {
    this.consumesRequestBody = this.#format.includes("$[request_body");
    this.consumesResponseBody = this.#format.includes("$[response_body");
    
    let data = "";
    let inToken = false;
    this.#formatTokens = [];

    for (let i=0; i < this.#format.length; i++) {
      if (this.#format[i] == "$" && i < this.#format.length -1 && this.#format[i+1] == "[") {
        inToken = true;
        if (data.length > 0) {
          this.#formatTokens.push(data); //push static data (if any)
        }
        data = "$";
      } else if (this.#format[i] == "]" && inToken) {
        data += "]";
        this.#formatTokens.push(data); //push token
        data = "";
        inToken = false;
      } else {
        data += this.#format[i];
      }
    }
    if (data != "" || this.#formatTokens.length == 0) {
      this.#formatTokens.push(data);
    }
  }

  format(logRecord: LogRecord): string {
    const httpInfo:HttpLogRecord = logRecord.msg as HttpLogRecord;
    
    let logEntry = "";
    this.#formatTokens.forEach(t => {
      logEntry += t.startsWith("$[") ? this.getTokenValue(t, httpInfo) : t;
    });

    return logEntry;
  }

  private getTokenValue(key:string, logData:HttpLogRecord):string {
    let lookupKey = key;
    let lookupKeyData = "";

    if (lookupKey.startsWith("$[request_cookie_")) {
      lookupKeyData = lookupKey.slice(this.#REQ_COOKIE_LEN).slice(0,-1);
      lookupKey = "$[request_cookie_";
    } else if (lookupKey.startsWith("$[response_cookie_")) {
      lookupKeyData = lookupKey.slice(this.#RES_COOKIE_LEN).slice(0,-1);
      lookupKey = "$[response_cookie_";
    } else if (lookupKey.startsWith("$[request_header_")) {
      lookupKeyData = lookupKey.slice(this.#REQ_HEADER_LEN).slice(0,-1);
      lookupKey = "$[request_header_";
    } else if (lookupKey.startsWith("$[response_header_")) {
      lookupKeyData = lookupKey.slice(this.#RES_HEADER_LEN).slice(0,-1);
      lookupKey = "$[response_header_";
    }

    let value: string | number = '-';
    switch (lookupKey) {
      case "$[local_host]":
        value = (logData.connInfo.localAddr as Deno.NetAddr).hostname;
        break;
      case "$[local_port]":
        value = (logData.connInfo.localAddr as Deno.NetAddr).port;
        break;
      case "$[remote_host]":
        value = (logData.connInfo.remoteAddr as Deno.NetAddr).hostname;
        break;
      case "$[remote_port]":
        value = (logData.connInfo.remoteAddr as Deno.NetAddr).port;
        break;
      case "$[request_body_bytes]":
        value = logData.requestBody ? this.#textEncoder.encode(logData.requestBody).length : 0;
        break;
      case "$[request_body_headers_bytes]": {
        let size = 0;
        logData.request.headers.forEach((val:string, key:string) => {
          size += this.#textEncoder.encode(key).length + 2 + this.#textEncoder.encode(val).length;
        });
        size += logData.requestBody ? this.#textEncoder.encode(logData.requestBody).length : 0;
        value = size;
        break;
      }
      case "$[response_body_bytes]":
        if (logData.response && logData.response instanceof Response) {
          value = logData.responseBody ? this.#textEncoder.encode(logData.responseBody).length : 0;
        }
        break;
      case "$[response_body_headers_bytes]": {
        if (logData.response && logData.response instanceof Response) {
          let size = 0;
          logData.response.headers.forEach((val:string, key:string) => {
            //E.g. header in format "key: value"
            size += this.#textEncoder.encode(key).length + 2 + this.#textEncoder.encode(val).length;
          });
          size += logData.responseBody ? this.#textEncoder.encode(logData.responseBody).length : 0;
          value = size;
        }
        break;
      }
      case "$[request_cookie_": {
        const cookies = logData.request.headers.get("Cookie");
        if (cookies) {
          value = encode(cookies.split(lookupKeyData + "=")[1]?.split(";")[0] ?? "-");
        }
        break;
      }
      case "$[response_cookie_": {
        if (logData.response && logData.response instanceof Response) {
          const cookies = logData.response.headers.get("Set-Cookie");
          if (cookies) {
            value = encode(cookies.split(lookupKeyData + "=")[1]?.split(";")[0] ?? "-");
          }
        }
        break;
      }
      case "$[request_header_":
        value = encode(logData.request.headers.get(lookupKeyData) ?? "-");
        break;
      case "$[response_header_":
        if (logData.response && logData.response instanceof Response) {
          value = encode(logData.response.headers.get(lookupKeyData) ?? "-");
        }
        break;
      case "$[process_time]": {
          if (logData.responseProcessed) {
            value = logData.responseProcessed!.getTime() - logData.requestReceived.getTime();
          }
        }
        break;
      case "$[method]":
        value = logData.request.method;
        break;
      case "$[url]":
        value = logData.request.url;
        break;
      case "$[status]":
        if (logData.response && logData.response instanceof Response) {
          value = logData.response.status;
        }
        break;
      case "$[status_text]":
        if (logData.response && logData.response instanceof Response) {
          value = logData.response.statusText;
        }
        break;
      case "$[request_body]":
        if (logData.requestBody) {
          value = encode(logData.requestBody);
        }
        break;
      case "$[request_body_first_line]":
        if (logData.requestBody) {
          value = encode(logData.requestBody.split(/\r\n|\r|\n/)[0]);
        }
        break;
      case "$[response_body]":
        if (logData.responseBody) {
          value = encode(logData.responseBody);
        }
        break;
      case "$[response_body_first_line]":
        if (logData.responseBody) {
          value = encode(logData.responseBody.split(/\r\n|\r|\n/)[0]);
        }
        break;
      case "$[request_received]":
        value = this.#dateTimeFormatter.formatDateTime(logData.requestReceived);
        break;
      case "$[referrer]":
        value = encode(logData.request.headers.get("Referer") ?? "-");
        break;
      case "$[user_agent]":
        value = encode(logData.request.headers.get("User-Agent") ?? "-");
        break;
      case "$[content_length]":
        if (logData.response && logData.response instanceof Response) {
          value = logData.response.headers.get("Content-Length") ?? "-";
        }
        break;
     
      default:
        value = lookupKey;
        break;
    }
    return "" + value;
  }

  protected _getFormatTokens():string[] {
    return this.#formatTokens;
  }
}