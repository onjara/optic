import { Level, LogRecord } from "../mod.ts";
import { assert, assertEquals, test } from "../test_deps.ts";
import { HttpFormatter } from "./httpFormatter.ts";
import { HttpLogRecord } from "./httpLogRecord.ts";
import { ConnInfo } from "./http_deps.ts";

const fixedDate = new Date(1592360640000); // "2020-06-17T03:24:00"

function connInfo(): ConnInfo {
  return {
    localAddr: {
      transport: "tcp",
      hostname: "127.0.0.1",
      port: 8000
    },
    remoteAddr: {
      transport: "tcp",
      hostname: "85.68.195.1",
      port: 243
    }
  };
}

function logRec(req: Request, res:unknown): LogRecord {
  const hlr = new SetDateHttpLogRecord(req, connInfo());
  hlr.response = res;

  return {
    msg: hlr,
    dateTime: new Date(),
    metadata: [],
    level: Level.Info,
    logger: "default",
  };
}

class TestableHttpFormatter extends HttpFormatter {
  getFormatTokens(): string[] {
    return this._getFormatTokens();
  }
}

class SetDateHttpLogRecord extends HttpLogRecord {
  overrideDate(date:Date): void {
    this.requestReceived = date;
  }
}

test({
  name: "Default format is common log format",
  fn() {
    const formatter = new TestableHttpFormatter();
    const tokenString = formatter.getFormatTokens().join('');
    assertEquals(tokenString, '$[remote_host] - - [$process_time] "$[method] $[url] HTTP" $[status] $[response_header_Content-Length]');
  }
});

test({
  name:"Setting new format correctly parses log string",
  fn() {
    const formatter = new TestableHttpFormatter();

    formatter.withFormat(']$$[test]}\-!"£$%^&*()_+{[$');
    let tokenStringArray = formatter.getFormatTokens();
    assertEquals(tokenStringArray.length, 3);
    assertEquals(tokenStringArray[1], "$[test]");
    assertEquals(tokenStringArray.join(''), ']$$[test]}\-!"£$%^&*()_+{[$');

    formatter.withFormat("");
    tokenStringArray = formatter.getFormatTokens();
    assertEquals(tokenStringArray.length, 1);
    assertEquals(tokenStringArray[0], "");

    formatter.withFormat("$[1]-$[2]-$[3]");
    tokenStringArray = formatter.getFormatTokens();
    assertEquals(tokenStringArray.length, 5);
    assertEquals(tokenStringArray.join(''), '$[1]-$[2]-$[3]');
  }
});

test({
  name: "Connection info is output correctly in log record",
  fn() {
    const req = new Request("http://example.com");
    const lr = logRec(req, new Response());
    const formatter = new HttpFormatter().withFormat("Local=$[local_host]:$[local_port], Remote=$[remote_host]:$[remote_port]");
    assertEquals(formatter.format(lr), "Local=127.0.0.1:8000, Remote=85.68.195.1:243");
  }
});

test({
  name: "No body should output 0 for byte tokens (with exception for headers)",
  fn() {
    const req_no_headers = new Request("http://example.com");
    const req_with_headers = new Request("http://example.com", {headers: {"User-Agent" : "Some browser"}});
    const res_no_headers = new Response();
    const res_with_headers = new Response(null, {headers: {"Content-Type": "application/text"}});
    const lr_no_headers = logRec(req_no_headers, res_no_headers);
    const lr_with_headers = logRec(req_with_headers, res_with_headers);
    
    const byteFormatter = new HttpFormatter().withFormat("Req bytes: $[request_body_bytes], with headers: $[request_body_headers_bytes].  Res bytes: $[response_body_bytes], with headers: $[response_body_headers_bytes]");
    assertEquals(byteFormatter.format(lr_no_headers), "Req bytes: 0, with headers: 0.  Res bytes: 0, with headers: 0");
    assertEquals(byteFormatter.format(lr_with_headers), "Req bytes: 0, with headers: 24.  Res bytes: 0, with headers: 30");
  }
});

test({
  name: "Request and response bodies handled correctly in log record",
  async fn() {
    const req = new Request("http://example.com", {method: "POST", body: "hello\nworld", headers: {Referer:"https://www.google.com", "User-Agent": "Some browser blah blah"}});
    const res = new Response("goodbye\nmoon", {headers: {"Content-Type": "application/text"}});
    const lr = logRec(req, res);
    (lr.msg as HttpLogRecord).requestBody = await req.clone().text();
    (lr.msg as HttpLogRecord).responseBody = await res.clone().text();
    
    const bodyFormatter = new HttpFormatter().withFormat("All request body: $[request_body], 1st request line: $[request_body_first_line], All response body: $[response_body], 1st response line: $[response_body_first_line]");
    assertEquals(bodyFormatter.format(lr), "All request body: hello\\u000aworld, 1st request line: hello, All response body: goodbye\\u000amoon, 1st response line: goodbye");
    
    const byteFormatter = new HttpFormatter().withFormat("Req bytes: $[request_body_bytes], with headers: $[request_body_headers_bytes].  Res bytes: $[response_body_bytes], with headers: $[response_body_headers_bytes]");
    assertEquals(byteFormatter.format(lr), "Req bytes: 11, with headers: 114.  Res bytes: 12, with headers: 42");
  }
});

test({
  name: "No request or response bodies should output dash",
  async fn() {
    const req = new Request("http://example.com");
    const res = new Response("");
    const lr = logRec(req, res);
    (lr.msg as HttpLogRecord).requestBody = await req.clone().text();
    (lr.msg as HttpLogRecord).responseBody = await res.clone().text();
    const bodyFormatter = new HttpFormatter().withFormat("$[request_body] $[request_body_first_line] $[response_body] $[response_body_first_line]");
    assertEquals(bodyFormatter.format(lr), "- - - -");
  }
});

test({
  name: "Cookie values are output correctly in log record",
  fn() {
    const req = new Request("http://example.com", {headers: {Cookie:"cookie1=hello; cookie2=world"}});
    const res = new Response("", {headers: {"set-cookie": "cookie3=goodbye; cookie4=moon"}});
    const lr = logRec(req, res);
    const formatter = new HttpFormatter().withFormat("$[request_cookie_cookie1] $[request_cookie_cookie2] $[request_cookie_bad] $[response_cookie_cookie3] $[response_cookie_cookie4] $[response_cookie_bad]");
    assertEquals(formatter.format(lr), "hello world - goodbye moon -");
  }
});

test({
  name: "Header values are output correctly in log record",
  fn() {
    const req = new Request("http://example.com", {headers: {header1:"hello", header2:"world"}});
    const res = new Response("", {headers: {header3: "goodbye", header4: "moon"}});
    const lr = logRec(req, res);
    const formatter = new HttpFormatter().withFormat("$[request_header_header1] $[request_header_header2] $[request_header_bad] $[response_header_header3] $[response_header_header4] $[response_header_bad]");
    assertEquals(formatter.format(lr), "hello world - goodbye moon -");
  }
});

test({
  name: "Process time is output correctly in log record",
  async fn() {
    const req = new Request("http://example.com", {headers: {header1:"hello", header2:"world"}});
    const res = new Response("", {headers: {header3: "goodbye", header4: "moon"}});

    const hlr = new HttpLogRecord(req, connInfo());
    //Simulate delay of receiving response by min 10ms
    await new Promise(resolve => setTimeout(resolve, 10));

    hlr.response = res;
  
    const lr = {
      msg: hlr,
      dateTime: new Date(),
      metadata: [],
      level: Level.Info,
      logger: "default",
    };
  
    const formatter = new HttpFormatter().withFormat("$[process_time]");
    const time = formatter.format(lr);
    assert(/^\d+$/.test(time));
    assert(+time > 9);
  }
});

test({
  name: "Basic request and response info output correctly in log record",
  fn() {
    const req = new Request("http://example.com", {method: "PUT"});
    const res = new Response("", {status: 201, statusText: "Created"});
    const lr = logRec(req, res);
    const formatter = new HttpFormatter().withFormat("$[method] $[url] $[status] $[status_text]");
    assertEquals(formatter.format(lr), "PUT http://example.com/ 201 Created");
  }
});

test({
  name: "Request received time is output correctly in log record (defaulting to Common Log Format)",
  fn() {
    const req = new Request("http://example.com");
    const res = new Response("");
    const lr = logRec(req, res);
    const formatter = new HttpFormatter().withFormat("$[request_received]");
    const dateTime = formatter.format(lr);
    assert(/^\d{2}\/[A-Z][a-z]{2}\/\d{4}:\d{2}:\d{2}:\d{2} [+-]\d{4}$/.test(dateTime));
  }
});

test({
  name: "Common headers are output correct in log record",
  fn() {
    const req = new Request("http://example.com", {headers: {referer:"https://www.google.com?q=some%20search", "user-Agent":"some browser"}});
    const res = new Response("", {headers: {"Content-length": "123"}});
    const lr = logRec(req, res);
    const formatter = new HttpFormatter().withFormat("$[referrer] $[user_agent] $[content_length]");
    assertEquals(formatter.format(lr), "https://www.google.com?q=some%20search some browser 123");
  }
});

test({
  name: "Common headers are output correct in log record even if missing in req/res",
  fn() {
    const req = new Request("http://example.com");
    const res = new Response("");
    const lr = logRec(req, res);
    const formatter = new HttpFormatter().withFormat("$[referrer] $[user_agent] $[content_length]");
    assertEquals(formatter.format(lr), "- - -");
  }
});

test({
  name: "Unknown tokens are simply output in log record as is",
  fn() {
    const req = new Request("http://example.com");
    const res = new Response("");
    const lr = logRec(req, res);
    const formatter = new HttpFormatter().withFormat("$[made-up] $[request] $[tokens]");
    assertEquals(formatter.format(lr), "$[made-up] $[request] $[tokens]");
  }
});

test({
  name: "Error responses are handled correctly in log record",
  fn() {
    const req = new Request("http://example.com");
    const res = new Error("oops");
    const lr = logRec(req, res);
    const formatter = new HttpFormatter().withFormat("$[response_body_bytes] $[response_body_headers_bytes] $[response_cookie_mycookie] $[response_header_Content-Type] $[status] $[status_text] $[response_body] $[response_body_first_line] $[content_length]");
    assertEquals(formatter.format(lr), "- - - - - - - - -");
  }
});

test({
  name: "You can set your own DateTimeFormatter class, fn or string",
  fn() {
    
    const req = new Request("http://example.com");
    const res = new Error("oops");
    const lr = logRec(req, res);
    (lr.msg as SetDateHttpLogRecord).overrideDate(fixedDate);

    let output = new HttpFormatter().withFormat("$[request_received]")
      .withDateTimeFormat("YYYY")
      .format(lr);
    assertEquals(output, "2020");

    output =  new HttpFormatter().withFormat("$[request_received]").withDateTimeFormat(
      () => "from fn",
    ).format(lr);
    assertEquals(output, "from fn");
    output =  new HttpFormatter().withFormat("$[request_received]").withDateTimeFormat(
      { formatDateTime: () => "from class" },
    ).format(lr);
    assertEquals(output, "from class");
  },
});
