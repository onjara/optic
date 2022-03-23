import { ConsoleStream, Logger, LogRecord, Stream } from "../mod.ts";
import { assert, assertEquals, test } from "../test_deps.ts";
import { HttpConsoleStream } from "./httpConsoleStream.ts";
import { HttpFormatter } from "./httpFormatter.ts";
import { HttpLogger } from "./httpLogger.ts";

class TestableHttpLogger extends HttpLogger {
  constructor() {
    super();
  }

  getDefaultStream(): ConsoleStream {
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

class CaptureLogger extends Logger {
  streamsAdded:Stream[] = [];
  streamsRemoved:Stream[] = [];

  addStream(stream: Stream): Logger {
    this.streamsAdded.push(stream);
    return this;
  }

  removeStream(stream: Stream): Logger {
    this.streamsRemoved.push(stream);
    return this;
  }
}

class RequestResponseConsumerStream implements Stream {
  consumesRequestBody = true;
  consumesResponseBody = true;
  
  handle(logRecord: LogRecord): boolean {
    return true;
  }
}

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
    const stream = new HttpConsoleStream().withFormat("$[request_body] $[response_body]");
    const logger:TestableHttpLogger = new TestableHttpLogger().addStream(stream) as TestableHttpLogger;

    assert(logger.getCloneRequest());
    assert(logger.getCloneResponse());
  }
})