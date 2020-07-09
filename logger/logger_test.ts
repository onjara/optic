import {
  test,
  assertEquals,
  assert,
} from "../test_deps.ts";
import { Logger } from "./logger.ts";
import { Level } from "./levels.ts";
import {
  Stream,
  LogRecord,
  LogMeta,
  Monitor,
  Filter,
  Obfuscator,
} from "../types.ts";

class TestStream implements Stream {
  functionsCalled: string[] = [];
  meta: LogMeta | undefined;
  logRecords: LogRecord[] = [];

  logHeader?(meta: LogMeta): void {
    this.functionsCalled.push("logHeader");
    this.meta = meta;
  }
  logFooter?(meta: LogMeta): void {
    this.functionsCalled.push("logFooter");
    this.meta = meta;
  }
  setup?(): void {
    this.functionsCalled.push("setup");
  }
  destroy?(): void {
    this.functionsCalled.push("destroy");
  }
  handle(logRecord: LogRecord): void {
    this.functionsCalled.push("handle");
    this.logRecords.push(logRecord);
  }
}

test({
  name: "Logger default level is DEBUG",
  fn() {
    assertEquals(
      new Logger().addStream(new TestStream()).minLogLevel(),
      Level.DEBUG,
    );
  },
});

test({
  name: "Logger min level can be set via cli arguments",
  fn() {
    const logger = new class extends Logger {
      protected getArgs(): string[] {
        return ["minLogLevel=INFO"];
      }
    }();
    const testStream = new TestStream();
    assertEquals(logger.addStream(testStream).minLogLevel(), Level.INFO);
    assertEquals(testStream.meta?.minLogLevel, Level.INFO);
    assertEquals(testStream.meta?.minLogLevelFrom, "command line arguments");
  },
});

test({
  name: "Logger min level set to 1 if rubbish set for cli argument",
  fn() {
    const logger = new class extends Logger {
      protected getArgs(): string[] {
        return ["minLogLevel=rubbish!"];
      }
    }();
    assertEquals(logger.addStream(new TestStream()).minLogLevel(), 1);
  },
});

test({
  name: "Logger min level can be set via env variable",
  fn() {
    const logger = new class extends Logger {
      protected getEnv(): { get(key: string): string | undefined } {
        return {
          get(key: string): string | undefined {
            return key === "OPTIC_MIN_LEVEL" ? "ERROR" : undefined;
          },
        };
      }
    }();
    const testStream = new TestStream();
    assertEquals(logger.addStream(testStream).minLogLevel(), Level.ERROR);
    assertEquals(testStream.meta?.minLogLevel, Level.ERROR);
    assertEquals(testStream.meta?.minLogLevelFrom, "environment variable");
  },
});

test({
  name: "Logger min level set to 1 if rubbish set for env variable",
  fn() {
    const logger = new class extends Logger {
      protected getEnv(): { get(key: string): string | undefined } {
        return {
          get(key: string): string | undefined {
            return key === "OPTIC_MIN_LEVEL" ? "Rubbish!" : undefined;
          },
        };
      }
    }();
    assertEquals(logger.addStream(new TestStream()).minLogLevel(), 1);
  },
});

test({
  name: "Args trump env variable min log levels",
  fn() {
    const logger = new class extends Logger {
      protected getEnv(): { get(key: string): string | undefined } {
        return {
          get(key: string): string | undefined {
            return key === "OPTIC_MIN_LEVEL" ? "ERROR" : undefined;
          },
        };
      }
      protected getArgs(): string[] {
        return ["minLogLevel=INFO"];
      }
    }();
    assertEquals(
      logger.addStream(new TestStream()).minLogLevel(),
      Level.INFO,
    );
  },
});

test({
  name: "Unload even is registered and will log footers and destroy streams",
  fn() {
    const testStream = new TestStream();
    new Logger().addStream(testStream);
    dispatchEvent(new Event("unload"));
    assertEquals(
      testStream.functionsCalled,
      ["setup", "logHeader", "logFooter", "destroy"],
    );
  },
});

test({
  name: "Logger min level can be set directly",
  fn() {
    const testStream = new TestStream();
    const logger = new Logger().addStream(testStream).withLevel(Level.INFO);
    assertEquals(logger.minLogLevel(), Level.INFO);
    assertEquals(testStream.meta?.minLogLevel, Level.INFO);
    assertEquals(testStream.meta?.minLogLevelFrom, "logger.level()");
  },
});

test({
  name: "Adding a stream will monitor stream setup and logHeader",
  fn() {
    const testStream = new TestStream();
    new Logger().addStream(testStream);
    assertEquals(testStream.functionsCalled, ["setup", "logHeader"]);
  },
});

test({
  name: "Removing a stream will monitor logFooter and destroy",
  fn() {
    const testStream = new TestStream();
    new Logger().addStream(testStream).removeStream(testStream);
    assertEquals(
      testStream.functionsCalled,
      ["setup", "logHeader", "logFooter", "destroy"],
    );
  },
});

test({
  name: "Min log level respected for new log messages",
  fn() {
    const testStream = new TestStream();
    const logger = new Logger().addStream(testStream).withLevel(Level.INFO);
    logger.debug("hello");
    // assert that 'handle' isn't called on stream
    assertEquals(
      testStream.functionsCalled,
      ["setup", "logHeader"],
    );
  },
});

test({
  name: "Message functions are resolved before passed to handler",
  fn() {
    const testStream = new TestStream();
    const logger = new Logger().addStream(testStream);
    const resolvedMsg: string | undefined = logger.debug(() =>
      "resolved hello"
    );

    assertEquals(
      testStream.functionsCalled,
      ["setup", "logHeader", "handle"],
    );
    assertEquals(testStream.logRecords[0].msg, "resolved hello");
    assertEquals(resolvedMsg, "resolved hello");
  },
});

test({
  name: "Monitors can be added and removed and fire on each log message",
  fn() {
    class TestMonitor implements Monitor {
      checkCount = 0;
      check(logRecord: LogRecord): void {
        this.checkCount++;
      }
    }
    const testMonitor1 = new TestMonitor();
    const testMonitor2 = new TestMonitor();
    const logger = new Logger().addStream(new TestStream()).addMonitor(
      testMonitor1,
    ).addMonitor(testMonitor2);
    assertEquals(testMonitor1.checkCount, 0);
    assertEquals(testMonitor2.checkCount, 0);
    logger.debug("test monitor fires after being added");
    assertEquals(testMonitor1.checkCount, 1);
    assertEquals(testMonitor2.checkCount, 1);
    logger.removeMonitor(testMonitor1);
    logger.removeMonitor(testMonitor2);
    logger.debug("test monitor was removed");
    assertEquals(testMonitor1.checkCount, 1);
    assertEquals(testMonitor2.checkCount, 1);
  },
});

test({
  name: "Each stream will process log messages",
  fn() {
    const testStream1 = new TestStream();
    const testStream2 = new TestStream();
    const logger = new Logger().addStream(testStream1).addStream(testStream2);
    logger.info("Test both streams handle this message");
    assertEquals(testStream1.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(testStream2.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(testStream1.logRecords.length, 1);
    assertEquals(testStream2.logRecords.length, 1);
    assertEquals(testStream1.logRecords[0], testStream2.logRecords[0]);
  },
});

test({
  name: "Filters can be added/removed and will filter out messages",
  fn() {
    const testStream1 = new TestStream();
    const testStream2 = new TestStream();
    class TestFilter implements Filter {
      filterCount = 0;
      shouldFilterOut(stream: Stream, logRecord: LogRecord): boolean {
        this.filterCount++;
        return stream === testStream1 && logRecord.msg === "Filter out";
      }
    }
    const filter1 = new TestFilter();
    const filter2 = new TestFilter();
    const logger = new Logger().addStream(testStream1).addStream(testStream2)
      .addFilter(filter1).addFilter(filter2);
    // log unfiltered message
    logger.debug("hello");
    assertEquals(testStream1.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(testStream2.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(filter1.filterCount, 2); // filter is fired once per stream
    assertEquals(filter2.filterCount, 2);

    // log filtered message
    logger.info("Filter out");
    assertEquals(testStream1.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(
      testStream2.functionsCalled,
      ["setup", "logHeader", "handle", "handle"],
    );
    assertEquals(filter1.filterCount, 4);
    assertEquals(filter2.filterCount, 3); // Second filter not fired on first stream as first filter matched

    // Remove filter and send same message again
    logger.removeFilter(filter1).removeFilter(filter2);
    logger.warning("Filter out"); // This shouldn't be filtered out
    assertEquals(
      testStream1.functionsCalled,
      ["setup", "logHeader", "handle", "handle"],
    );
    assertEquals(
      testStream2.functionsCalled,
      ["setup", "logHeader", "handle", "handle", "handle"],
    );
    assertEquals(filter1.filterCount, 4);
    assertEquals(filter2.filterCount, 3);
  },
});

test({
  name: "Obfuscators can be added/removed and obfuscate messages",
  fn() {
    const testStream1 = new TestStream();
    const testStream2 = new TestStream();
    class TestObfuscator implements Obfuscator {
      obfuscateCalls = 0;
      replacements = 0;
      obfuscate(stream: Stream, logRecord: LogRecord): LogRecord {
        this.obfuscateCalls++;

        let msg = logRecord.msg as string;
        if (
          stream === testStream1 &&
          (logRecord.msg as string).indexOf("obfuscate") > -1
        ) {
          this.replacements++;
          msg = msg.replace("obfuscate", "*********");
        }
        return {
          msg: msg,
          metadata: logRecord.metadata,
          dateTime: logRecord.dateTime,
          level: logRecord.level,
          logger: logRecord.logger,
        };
      }
    }
    const ob1 = new TestObfuscator();
    const ob2 = new TestObfuscator();
    const logger = new Logger().addStream(testStream1).addStream(testStream2)
      .addObfuscator(ob1).addObfuscator(ob2);

    // log unobfuscated message
    logger.debug("hello");
    assertEquals(ob1.obfuscateCalls, 2); // Called once per stream
    assertEquals(ob2.obfuscateCalls, 2);
    assertEquals(ob1.replacements, 0);
    assertEquals(ob2.replacements, 0);
    assertEquals(testStream1.logRecords[0].msg, "hello");
    assertEquals(testStream2.logRecords[0].msg, "hello");

    // log obfuscated message
    logger.debug("hello obfuscated");
    assertEquals(ob1.obfuscateCalls, 4);
    assertEquals(ob2.obfuscateCalls, 4);
    assertEquals(ob1.replacements, 1);
    assertEquals(ob2.replacements, 0); // Second obfuscator won't find a match as first one already did
    assertEquals(testStream1.logRecords[1].msg, "hello *********d");
    assertEquals(testStream2.logRecords[1].msg, "hello *********d");

    // Remove obfuscators and send same message again
    logger.removeObfuscator(ob1).removeObfuscator(ob2);
    logger.debug("hello obfuscated");
    assertEquals(ob1.obfuscateCalls, 4); // Unchanged
    assertEquals(ob2.obfuscateCalls, 4);
    assertEquals(ob1.replacements, 1);
    assertEquals(ob2.replacements, 0);
    assertEquals(testStream1.logRecords[2].msg, "hello obfuscated");
    assertEquals(testStream2.logRecords[2].msg, "hello obfuscated");
  },
});

test({
  name: "TRACE messages work as expected",
  fn() {
    const testStream = new TestStream();
    const logger = new Logger().addStream(testStream);
    const ignoredOutput = logger.trace("World");
    assertEquals(ignoredOutput, "World");
    assertEquals(testStream.functionsCalled, ["setup", "logHeader"]);
    assertEquals(testStream.logRecords.length, 0);

    const output = logger.withLevel(Level.TRACE).trace(() => "hello");
    assertEquals(output, "hello");
    assertEquals(testStream.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(testStream.logRecords[0].msg, "hello");
    assertEquals(testStream.logRecords[0].level, Level.TRACE);
    assertEquals(testStream.logRecords[0].metadata, []);
    assert(
      new Date().getTime() - testStream.logRecords[0].dateTime.getTime() <
        10,
    );
  },
});

test({
  name: "DEBUG messages work as expected",
  fn() {
    const testStream = new TestStream();
    const output = new Logger().addStream(testStream).debug(() => "hello");
    assertEquals(output, "hello");
    assertEquals(testStream.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(testStream.logRecords[0].msg, "hello");
    assertEquals(testStream.logRecords[0].level, Level.DEBUG);
    assertEquals(testStream.logRecords[0].metadata, []);
    assert(
      new Date().getTime() - testStream.logRecords[0].dateTime.getTime() <
        10,
    );
  },
});

test({
  name: "INFO messages work as expected",
  fn() {
    const testStream = new TestStream();
    const output = new Logger().addStream(testStream).info("hello", 1, 2, 3);
    assertEquals(output, "hello");
    assertEquals(testStream.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(testStream.logRecords[0].msg, "hello");
    assertEquals(testStream.logRecords[0].level, Level.INFO);
    assertEquals(testStream.logRecords[0].metadata, [1, 2, 3]);
    assert(
      new Date().getTime() - testStream.logRecords[0].dateTime.getTime() <
        10,
    );
  },
});

test({
  name: "WARNING messages work as expected",
  fn() {
    const testStream = new TestStream();
    const output = new Logger().addStream(testStream).warning(
      { a: "b" },
      [{ c: "d" }],
    );
    assertEquals(output, { a: "b" });
    assertEquals(testStream.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(testStream.logRecords[0].msg, { a: "b" });
    assertEquals(testStream.logRecords[0].level, Level.WARNING);
    assertEquals(testStream.logRecords[0].metadata, [[{ c: "d" }]]);
    assert(
      new Date().getTime() - testStream.logRecords[0].dateTime.getTime() <
        10,
    );
  },
});

test({
  name: "ERROR messages work as expected",
  fn() {
    const testStream = new TestStream();
    const output = new Logger().addStream(testStream).error(true);
    assertEquals(output, true);
    assertEquals(testStream.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(testStream.logRecords[0].msg, true);
    assertEquals(testStream.logRecords[0].level, Level.ERROR);
    assertEquals(testStream.logRecords[0].metadata, []);
    assert(
      new Date().getTime() - testStream.logRecords[0].dateTime.getTime() <
        10,
    );
  },
});

test({
  name: "CRITICAL messages work as expected",
  fn() {
    const testStream = new TestStream();
    const output = new Logger().addStream(testStream).critical(undefined);
    assertEquals(output, undefined);
    assertEquals(testStream.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(testStream.logRecords[0].msg, undefined);
    assertEquals(testStream.logRecords[0].level, Level.CRITICAL);
    assertEquals(testStream.logRecords[0].metadata, []);
    assert(
      new Date().getTime() - testStream.logRecords[0].dateTime.getTime() <
        10,
    );
  },
});

test({
  name: "Logger can be named",
  fn() {
    const testStream = new TestStream();
    const logger = new Logger("config").addStream(testStream);
    assertEquals(logger.name(), "config");
    assertEquals(testStream.meta?.logger, "config");
  },
});
