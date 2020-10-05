import { assert, assertEquals, test } from "../test_deps.ts";
import { LogMetaImpl } from "./meta.ts";
import { Level } from "./levels.ts";
import { Formatter, LogMeta, LogRecord, Stream } from "../types.ts";
import { BaseStream } from "../streams/baseStream.ts";

class MockFormatter implements Formatter<string> {
  format(lr: LogRecord): string {
    return "logged";
  }
}

class TestStream extends BaseStream {
  constructor() {
    super(new MockFormatter());
  }
  log(msg: string): void {}
}

test({
  name: "log record transformed into Record",
  fn() {
    const stream = new TestStream();
    const meta = new LogMetaImpl();
    meta.minLogLevel = Level.WARN;
    meta.minLogLevelFrom = "Environment variable";
    (meta as LogMeta).sessionEnded = new Date(1592360640000); // "2020-06-17T03:24:00"
    meta.logger = "MyLogger";
    meta.filters = 3;
    meta.transformers = 4;
    meta.monitors = 5;
    meta.streamStats.set(
      stream,
      { handled: new Map<number, number>(), filtered: 6, transformed: 7 },
    );
    meta.streamStats.get(stream)?.handled.set(Level.DEBUG, 8);
    meta.streamStats.get(stream)?.handled.set(Level.INFO, 9);
    meta.streamStats.get(stream)?.handled.set(Level.WARN, 10);

    const record = meta.toRecord(stream);
    //assert less than 100ms have passed
    assert(
      new Date().getTime() - 100 < (record.sessionStarted as Date).getTime(),
    );
    assertEquals(record.sessionEnded, new Date(1592360640000));
    assertEquals(record.minLogLevel, "WARN");
    assertEquals(record.minLogLevelFrom, "Environment variable");
    assertEquals(record.loggerName, "MyLogger");
    assertEquals(record.filtersRegistered, 3);
    assertEquals(record.transformersRegistered, 4);
    assertEquals(record.monitorsRegistered, 5);
    assertEquals(record.streamName, "TestStream");
    assertEquals(record.logRecordsHandled, "DEBUG: 8, INFO: 9, WARN: 10");
    assertEquals(record.recordsFiltered, 6);
    assertEquals(record.recordsTransformed, 7);
  },
});