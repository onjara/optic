import {
  test,
  assertEquals,
  assert,
} from "../test_deps.ts";
import { Logger } from "./logger.ts";
import { Level } from "./levels.ts";
import type {
  Stream,
  LogRecord,
  LogMeta,
  Monitor,
  Filter,
  Transformer,
} from "../types.ts";
import { PropertyRedaction } from "../transformers/propertyRedaction.ts";
import { SubStringFilter } from "../filters/subStringFilter.ts";

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

class TestMonitor implements Monitor {
  functionsCalled: string[] = [];
  check(logRecord: LogRecord) {
    this.functionsCalled.push("check");
  }
  setup() {
    this.functionsCalled.push("setup");
  }
  destroy() {
    this.functionsCalled.push("destroy");
  }
}
class TestFilter implements Filter {
  functionsCalled: string[] = [];
  shouldFilterOut(stream: Stream, logRecord: LogRecord): boolean {
    this.functionsCalled.push("shouldFilterOut");
    return false;
  }
  setup() {
    this.functionsCalled.push("setup");
  }
  destroy() {
    this.functionsCalled.push("destroy");
  }
}
class TestTransformer implements Transformer {
  functionsCalled: string[] = [];
  transform(stream: Stream, logRecord: LogRecord): LogRecord {
    this.functionsCalled.push("transform");
    return logRecord;
  }
  setup() {
    this.functionsCalled.push("setup");
  }
  destroy() {
    this.functionsCalled.push("destroy");
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
    assertEquals(
      testStream.meta?.minLogLevelFrom,
      "from command line argument",
    );
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
    assertEquals(testStream.meta?.minLogLevelFrom, "from environment variable");
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
  name:
    "Unload event is registered and will log footers and destroy streams, monitors, filters and transformers",
  fn() {
    const testStream = new TestStream();
    const testMonitor = new TestMonitor();
    const testFilter = new TestFilter();
    const testTransformer = new TestTransformer();

    new Logger().addStream(testStream).addMonitor(testMonitor).addFilter(
      testFilter,
    ).addTransformer(testTransformer);
    dispatchEvent(new Event("unload"));
    assertEquals(
      testStream.functionsCalled,
      ["setup", "logHeader", "logFooter", "destroy"],
    );
    assertEquals(testMonitor.functionsCalled, ["setup", "destroy"]);
    assertEquals(testFilter.functionsCalled, ["setup", "destroy"]);
    assertEquals(testTransformer.functionsCalled, ["setup", "destroy"]);
  },
});

test({
  name: "Logger min level can be set directly",
  fn() {
    const testStream = new TestStream();
    const logger = new Logger().addStream(testStream).withMinLogLevel(
      Level.INFO,
    );
    assertEquals(logger.minLogLevel(), Level.INFO);
    assertEquals(testStream.meta?.minLogLevel, Level.INFO);
    assertEquals(testStream.meta?.minLogLevelFrom, "programmatically set");
  },
});

test({
  name: "Adding a stream will trigger stream setup and logHeader",
  fn() {
    const testStream = new TestStream();
    new Logger().addStream(testStream);
    assertEquals(testStream.functionsCalled, ["setup", "logHeader"]);
  },
});

test({
  name: "Removing a stream will trigger logFooter and destroy",
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
    const logger = new Logger().addStream(testStream).withMinLogLevel(
      Level.INFO,
    );
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
  name: "Monitors call destroy() on removal",
  fn() {
    const testMonitor = new TestMonitor();
    new Logger().addStream(new TestStream()).addMonitor(testMonitor)
      .removeMonitor(testMonitor);
    assertEquals(testMonitor.functionsCalled, ["setup", "destroy"]);
  },
});

test({
  name: "Filters call destroy() on removal",
  fn() {
    const testFilter = new TestFilter();
    new Logger().addStream(new TestStream()).addFilter(testFilter).removeFilter(
      testFilter,
    );
    assertEquals(testFilter.functionsCalled, ["setup", "destroy"]);
  },
});

test({
  name: "Transformers call destroy() on removal",
  fn() {
    const testTransformer = new TestTransformer();
    new Logger().addStream(new TestStream()).addTransformer(testTransformer)
      .removeTransformer(testTransformer);
    assertEquals(testTransformer.functionsCalled, ["setup", "destroy"]);
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
    logger.warn("Filter out"); // This shouldn't be filtered out
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
    assertEquals(testStream1.meta?.streamStats.get(testStream1)?.filtered, 1);
    assertEquals(testStream2.meta?.streamStats.get(testStream2)?.filtered, 0);
  },
});

test({
  name: "Transformers can be added/removed and transform messages",
  fn() {
    const testStream1 = new TestStream();
    const testStream2 = new TestStream();
    class TestTransformer implements Transformer {
      transformCalls = 0;
      replacements = 0;
      transform(stream: Stream, logRecord: LogRecord): LogRecord {
        this.transformCalls++;

        let msg = logRecord.msg as string;
        if (
          stream === testStream1 &&
          (logRecord.msg as string).indexOf("transform") > -1
        ) {
          this.replacements++;
          msg = msg.replace("transform", "*********");
          return {
            msg: msg,
            metadata: logRecord.metadata,
            dateTime: logRecord.dateTime,
            level: logRecord.level,
            logger: logRecord.logger,
          };
        }
        return logRecord;
      }
    }
    const ob1 = new TestTransformer();
    const ob2 = new TestTransformer();
    const logger = new Logger().addStream(testStream1).addStream(testStream2)
      .addTransformer(ob1).addTransformer(ob2);

    // log untransformed message
    logger.debug("hello");
    assertEquals(ob1.transformCalls, 2); // Called once per stream
    assertEquals(ob2.transformCalls, 2);
    assertEquals(ob1.replacements, 0);
    assertEquals(ob2.replacements, 0);
    assertEquals(testStream1.logRecords[0].msg, "hello");
    assertEquals(testStream2.logRecords[0].msg, "hello");

    // log transformed message
    logger.debug("hello transformed");
    assertEquals(ob1.transformCalls, 4);
    assertEquals(ob2.transformCalls, 4);
    assertEquals(ob1.replacements, 1);
    assertEquals(ob2.replacements, 0); // Second transformer won't find a match as first one already did
    assertEquals(testStream1.logRecords[1].msg, "hello *********ed");
    assertEquals(testStream2.logRecords[1].msg, "hello *********ed");

    // Remove transformers and send same message again
    logger.removeTransformer(ob1).removeTransformer(ob2);
    logger.debug("hello transformer");
    assertEquals(ob1.transformCalls, 4); // Unchanged
    assertEquals(ob2.transformCalls, 4);
    assertEquals(ob1.replacements, 1);
    assertEquals(ob2.replacements, 0);
    assertEquals(testStream1.logRecords[2].msg, "hello transformer");
    assertEquals(testStream2.logRecords[2].msg, "hello transformer");

    assertEquals(
      testStream1.meta?.streamStats.get(testStream1)?.transformed,
      1,
    );
    assertEquals(
      testStream2.meta?.streamStats.get(testStream2)?.transformed,
      0,
    );
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

    const output = logger.withMinLogLevel(Level.TRACE).trace(() => "hello");
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
  name: "WARN messages work as expected",
  fn() {
    const testStream = new TestStream();
    const output = new Logger().addStream(testStream).warn(
      { a: "b" },
      [{ c: "d" }],
    );
    assertEquals(output, { a: "b" });
    assertEquals(testStream.functionsCalled, ["setup", "logHeader", "handle"]);
    assertEquals(testStream.logRecords[0].msg, { a: "b" });
    assertEquals(testStream.logRecords[0].level, Level.WARN);
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

test({
  name: "Meta data as expected",
  fn() {
    const testStream = new TestStream();
    const logger = new Logger("config").addStream(testStream)
      .withMinLogLevel(Level.INFO)
      .addTransformer(new PropertyRedaction("z"))
      .addFilter(new SubStringFilter("def"))
      .addMonitor((logRecord: LogRecord) => {});
    logger.error("abc");
    logger.error("abc");
    logger.error("abc");
    logger.warn("abc");
    logger.warn("abc");
    logger.warn("abcdef");
    logger.warn("abcdef");
    logger.warn("abcdef");
    logger.warn("abcdef");
    logger.warn("abcdef");
    logger.info("abc");
    logger.info({ z: "abc" });
    logger.info({ z: "abc" });
    const meta = testStream.meta;
    assertEquals(meta?.filters, 1);
    assertEquals(meta?.hostname, "unavailable");
    assertEquals(meta?.logger, "config");
    assertEquals(meta?.minLogLevel, Level.INFO);
    assertEquals(meta?.minLogLevelFrom, "programmatically set");
    assertEquals(meta?.monitors, 1);
    assertEquals(meta?.transformers, 1);
    assert(new Date().getTime() - meta?.sessionStarted.getTime()! < 100);
    assertEquals(meta?.streamStats.get(testStream)?.filtered, 5);
    assertEquals(meta?.streamStats.get(testStream)?.transformed, 2);
    assertEquals(
      meta?.streamStats.get(testStream)?.handled.get(Level.ERROR),
      3,
    );
    assertEquals(
      meta?.streamStats.get(testStream)?.handled.get(Level.WARN),
      2,
    );
    assertEquals(meta?.streamStats.get(testStream)?.handled.get(Level.INFO), 3);
  },
});

test({
  name: "'If' logging works as expected",
  fn() {
    const testStream = new TestStream();
    const logger = new Logger().addStream(testStream);

    logger.if("123".length > 0).error("I should be logged");
    logger.if("123".length > 9).error("I should not be logged");
    assertEquals(1, testStream.logRecords.length);
    assertEquals(testStream.logRecords[0].msg, "I should be logged");
  },
});
