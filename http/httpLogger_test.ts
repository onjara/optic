import { SubStringFilter } from "../filters/subStringFilter.ts";
import { NotFunction } from "../logger/logger.ts";
import { ConsoleStream, Filter, FilterFn, Logger, LogRecord, Monitor, MonitorFn, Stream } from "../mod.ts";
import { assert, assertEquals, test } from "../test_deps.ts";
import { HttpConsoleStream } from "./httpConsoleStream.ts";
import { HttpFormatter } from "./httpFormatter.ts";
import { HttpLogger } from "./httpLogger.ts";
import { HttpLogRecord } from "./httpLogRecord.ts";
import { ConnInfo } from "./http_deps.ts";
import { HttpStream } from "./types.ts";

class TestableHttpLogger extends HttpLogger {
  constructor() {
    super();
  }

  getDefaultStream(): HttpConsoleStream {
    return this.defaultConsoleStream;
  }

  getCloneRequest(): boolean {
    return this.cloneRequest;
  }
  getCloneResponse(): boolean {
    return this.cloneResponse;
  }
  setLogger(overrideLogger:Logger): void {
    this.logger = overrideLogger;
  }
}

class CaptureStream implements HttpStream {
  consumesRequestBody = false;
  consumesResponseBody = false;
  logRecords: HttpLogRecord[] = [];

  handle(logRecord: LogRecord): boolean {
    this.logRecords.push(logRecord.msg as HttpLogRecord);
    return true;
  }
}

class CaptureLogger extends Logger {
  streamsAdded:Stream[] = [];
  streamsRemoved:Stream[] = [];
  monitorsAdded:(Monitor|MonitorFn)[] = [];
  monitorsRemoved:(Monitor|MonitorFn)[] = [];
  filtersAdded:(Filter|FilterFn)[] =[];
  filtersRemoved:(Filter|FilterFn)[] =[];
  logs: HttpLogRecord[] = [];

  addStream(stream: Stream): Logger {
    this.streamsAdded.push(stream);
    return this;
  }

  removeStream(stream: Stream): Logger {
    this.streamsRemoved.push(stream);
    return this;
  }

  addMonitor(monitor: Monitor | MonitorFn): Logger {
    this.monitorsAdded.push(monitor);
    return this;
  }
  removeMonitor(monitorToRemove: Monitor): Logger {
    this.monitorsRemoved.push(monitorToRemove);
    return this;
  }
  addFilter(filter: Filter | FilterFn): Logger {
    this.filtersAdded.push(filter);
    return this;
  }
  removeFilter(filterToRemove: Filter): Logger {
    this.filtersRemoved.push(filterToRemove);
    return this;
  }
  info<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  info<T>(msg: NotFunction<T>, ...metadata: unknown[]): T;
  info<T>(
    msg: () => T | NotFunction<T>,
    ..._metadata: unknown[]
  ): T | undefined {
    this.logs.push(msg as unknown as HttpLogRecord);
    return undefined;
  }

}

class RequestResponseConsumerStream implements Stream {
  consumesRequestBody = true;
  consumesResponseBody = true;
  
  handle(_logRecord: LogRecord): boolean {
    return true;
  }
}

const connInfo:ConnInfo = {localAddr: {
  hostname: "127.0.0.1",
  port: 8080,
  transport: "tcp"
  },
remoteAddr: {
  hostname: "87.25.612.1",
  port: 243,
  transport: "tcp"
  }
};

test({
  name: "Default console stream configured correctly with HttpFormatter",
  fn() {
    const logger = new TestableHttpLogger();
    assert(logger.getDefaultStream().getFormatter() instanceof HttpFormatter);
  }
});

test({
  name: "The default logger doesn't require cloning request or response objects",
  fn() {
    const logger = new TestableHttpLogger();
    assert(!logger.getCloneRequest());
    assert(!logger.getCloneResponse());
  }
});

test({
  name: "Adding stream removes default stream and replaces with new stream",
  fn() {
    const logger = new TestableHttpLogger();
    const captureLogger = new CaptureLogger();
    logger.setLogger(captureLogger);
    assertEquals(captureLogger.streamsAdded.length, 0);
    assertEquals(captureLogger.streamsRemoved.length, 0);

    const stream1 = new ConsoleStream();
    logger.addStream(stream1);
    assertEquals(captureLogger.streamsAdded.length, 1);
    assertEquals(captureLogger.streamsRemoved.length, 1); // The removed stream is the default stream

    const stream2 = new ConsoleStream();
    logger.addStream(stream2);
    assertEquals(captureLogger.streamsAdded.length, 2);
    assertEquals(captureLogger.streamsRemoved.length, 1);

    logger.removeStream(stream1);
    assertEquals(captureLogger.streamsRemoved.length, 2);

    logger.removeStream(stream2);
    assertEquals(captureLogger.streamsRemoved.length, 3);
  }
});

test({
  name: "Clone request and response are set correctly when adding new stream",
  fn() {
    const logger = new TestableHttpLogger();
    logger.addStream(new RequestResponseConsumerStream());
    
    assert(logger.getCloneRequest());
    assert(logger.getCloneResponse());
  }
});

test({
  name: "Clone request and response are set correctly for a properly configured formatter",
  fn() {
    const logger:TestableHttpLogger = new TestableHttpLogger();
    assert(!logger.getCloneRequest());
    assert(!logger.getCloneResponse());
    
    const stream = new HttpConsoleStream().withFormat("$[request_body] $[response_body]");
    logger.addStream(stream) as TestableHttpLogger;

    assert(logger.getCloneRequest());
    assert(logger.getCloneResponse());
  }
});

test({
  name: "Adding and removing monitors and filters configured correctly with logger",
  fn() {
    const logger = new TestableHttpLogger();
    const captureLogger = new CaptureLogger();
    logger.setLogger(captureLogger);
    assertEquals(captureLogger.monitorsAdded.length, 0);
    assertEquals(captureLogger.monitorsRemoved.length, 0);
    assertEquals(captureLogger.filtersAdded.length, 0);
    assertEquals(captureLogger.filtersRemoved.length, 0);

    const filter = new SubStringFilter('');
    const monitor = {check: ():void => {}};
    logger.addFilter(filter);
    logger.addMonitor(monitor);
    assertEquals(captureLogger.monitorsAdded.length, 1);
    assertEquals(captureLogger.monitorsRemoved.length, 0);
    assertEquals(captureLogger.filtersAdded.length, 1);
    assertEquals(captureLogger.filtersRemoved.length, 0);

    logger.removeFilter(filter);
    logger.removeMonitor(monitor);
    assertEquals(captureLogger.monitorsAdded.length, 1);
    assertEquals(captureLogger.monitorsRemoved.length, 1);
    assertEquals(captureLogger.filtersAdded.length, 1);
    assertEquals(captureLogger.filtersRemoved.length, 1);
  }
});

test({
  name: "You can enable and disable the logger",
  fn() {
    const logger = new TestableHttpLogger();
    assert(logger.isEnabled());
    logger.enabled(false);
    assert(!logger.isEnabled());
  }
});

test({
  name: "Successful Http request with no req/resp body needed is logged",
  async fn() {
    const logger = new TestableHttpLogger();
    const captureLogger = new CaptureLogger();
    logger.setLogger(captureLogger);

    const req = new Request("https://www.example.com?q=1", {method: "GET", headers:{"User-Agent": "Some browser"}});
    const resp = new Response("Hello world", {status: 201});
    const response = await logger.log(req, connInfo, () => resp);

    const responseText = await response.text();
    assertEquals(responseText, "Hello world");
    assertEquals(response.status, 201);

    const lr = captureLogger.logs[0];
    assert(lr.requestBody === undefined);
    assert(lr.responseBody === undefined);
    assert(lr.connInfo === connInfo);
    assert(lr.request === req);
    assert(lr.response === resp);
    assert(lr.requestReceived.getTime() > new Date().getTime() - 100);
    assert(lr.responseProcessed && lr.responseProcessed.getTime() > new Date().getTime() - 100);
  }
});

test({
  name: "Successful http request with req/resp body needed is logged",
  async fn() {
    const logger = new TestableHttpLogger();
    const captureLogger = new CaptureLogger();
    const captureStream = new CaptureStream();
    captureStream.consumesRequestBody = true;
    captureStream.consumesResponseBody = true;
    logger.setLogger(captureLogger);
    logger.addStream(captureStream);

    const req = new Request("https://www.example.com?q=1", {method: "POST", body: "request body", headers:{"User-Agent": "Some browser"}});
    const resp = new Response("Hello world", {status: 201});
    const response = await logger.log(req, connInfo, () => resp);

    const responseText = await response.text();
    assertEquals(responseText, "Hello world");
    assertEquals(response.status, 201);

    const lr = captureLogger.logs[0];
    assert(lr.requestBody === "request body");
    assert(lr.responseBody === "Hello world");
    assert(lr.connInfo === connInfo);
    assert(lr.request === req);
    assert(lr.response === resp);
    assert(lr.requestReceived.getTime() > new Date().getTime() - 100);
    assert(lr.responseProcessed && lr.responseProcessed.getTime() > new Date().getTime() - 100);
  }
});

test({
  name: "Log error as response by default in error scenarios",
  async fn() {
    const logger = new TestableHttpLogger();
    const captureLogger = new CaptureLogger();
    logger.setLogger(captureLogger);

    const req = new Request("https://www.example.com?q=1", {method: "GET", headers:{"User-Agent": "Some browser"}});
    const errorResp = new Error("oops");

    let errorCaught = false;
    let response: Response | undefined = undefined;
    try {
      response = await logger.log(req, connInfo, () => {throw errorResp;});
    } catch (error: unknown) {
      assert(error === errorResp);
      errorCaught = true;
    }
    assert(errorCaught);

    assert(response === undefined);

    const lr = captureLogger.logs[0];
    assert(lr.requestBody === undefined);
    assert(lr.responseBody === undefined);
    assert(lr.connInfo === connInfo);
    assert(lr.request === req);
    assert(lr.response === errorResp);
    assert(lr.requestReceived.getTime() > new Date().getTime() - 100);
    assert(lr.responseProcessed && lr.responseProcessed.getTime() > new Date().getTime() - 100);
  }
})

test({
  name: "Log error as via custom error handler in error scenarios",
  async fn() {
    const logger = new TestableHttpLogger();
    const captureLogger = new CaptureLogger();
    const responseFromErrorHandler = new Response("error handled!", {status: 500}); 
    const errorHandler = () => responseFromErrorHandler;
    logger.setLogger(captureLogger);
    logger.withRequestErrorHandler(errorHandler);

    const req = new Request("https://www.example.com?q=1", {method: "GET", headers:{"User-Agent": "Some browser"}});
    const errorResp = new Error("oops");

    const response = await logger.log(req, connInfo, () => {
      throw errorResp;
    });

    assert(response === responseFromErrorHandler);
    const responseText = await response.text();
    assertEquals(responseText, "error handled!");
    assertEquals(response.status, 500);

    const lr = captureLogger.logs[0];
    assert(lr.requestBody === undefined);
    assert(lr.responseBody === undefined);
    assert(lr.connInfo === connInfo);
    assert(lr.request === req);
    assert(lr.response === responseFromErrorHandler);
    assert(lr.requestReceived.getTime() > new Date().getTime() - 100);
    assert(lr.responseProcessed && lr.responseProcessed.getTime() > new Date().getTime() - 100);
  }
})

test({
  name: "Disabled logger won't log in successful response",
  async fn() {
    const logger = new TestableHttpLogger();
    const captureLogger = new CaptureLogger();
    logger.setLogger(captureLogger);
    logger.enabled(false);

    const req = new Request("https://www.example.com?q=1", {method: "GET", headers:{"User-Agent": "Some browser"}});
    const resp = new Response("Hello world", {status: 201});
    const response = await logger.log(req, connInfo, () => resp);
    assert(response === resp);
    assertEquals(captureLogger.logs.length, 0);
  }
});

test({
  name: "Disabled logger won't log in default error response",
  async fn() {
    const logger = new TestableHttpLogger();
    const captureLogger = new CaptureLogger();
    logger.setLogger(captureLogger);
    logger.enabled(false);

    const req = new Request("https://www.example.com?q=1", {method: "GET", headers:{"User-Agent": "Some browser"}});
    const errorResp = new Error("oops");

    let errorCaught = false;
    let response: Response | undefined = undefined;
    try {
      response = await logger.log(req, connInfo, () => {
        throw errorResp;
      });
    } catch (error: unknown) {
      assert(error === errorResp);
      errorCaught = true;
    }
    assert(errorCaught);

    assert(response === undefined);
    assertEquals(captureLogger.logs.length, 0);
  }
});

test({
  name: "Disabled logger won't log in custom error handler response",
  async fn() {
    const logger = new TestableHttpLogger();
    const captureLogger = new CaptureLogger();
    const responseFromErrorHandler = new Response("error handled!", {status: 500}); 
    const errorHandler = () => responseFromErrorHandler;
    logger.setLogger(captureLogger);
    logger.withRequestErrorHandler(errorHandler);
    logger.enabled(false);

    const req = new Request("https://www.example.com?q=1", {method: "GET", headers:{"User-Agent": "Some browser"}});
    const errorResp = new Error("oops");

    const response = await logger.log(req, connInfo, () => {
      throw errorResp;
    });

    assert(response === responseFromErrorHandler);
    const responseText = await response.text();
    assertEquals(responseText, "error handled!");
    assertEquals(response.status, 500);
    assertEquals(captureLogger.logs.length, 0);
  }
});
