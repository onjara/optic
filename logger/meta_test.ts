// Copyright 2020-2024 the optic authors. All rights reserved. MIT license.
import { assert, assertEquals, test } from "../test_deps.ts";
import { LogMetaImpl } from "./meta.ts";
import { Level } from "./levels.ts";
import type { Formatter, LogMeta } from "../types.ts";
import { BaseStream } from "../streams/baseStream.ts";

class MockFormatter implements Formatter<string> {
  format(): string {
    return "logged";
  }
}

class TestStream extends BaseStream {
  constructor() {
    super(new MockFormatter());
  }
  log(): void {}
}

test({
  name: "log record transformed into Record",
  fn() {
    const stream = new TestStream();
    const meta = new LogMetaImpl();
    meta.minLogLevel = Level.Warn;
    meta.minLogLevelFrom = "Environment variable";
    (meta as LogMeta).sessionEnded = new Date(1592360640000); // "2020-06-17T03:24:00"
    meta.logger = "MyLogger";
    meta.filters = 3;
    meta.transformers = 4;
    meta.monitors = 5;
    meta.streamStats.set(
      stream,
      {
        handled: new Map<number, number>(),
        filtered: 6,
        transformed: 7,
        duplicated: 11,
      },
    );
    meta.streamStats.get(stream)?.handled.set(Level.Debug, 8);
    meta.streamStats.get(stream)?.handled.set(Level.Info, 9);
    meta.streamStats.get(stream)?.handled.set(Level.Warn, 10);

    const record = meta.toRecord(stream);
    //assert less than 100ms have passed
    assert(
      new Date().getTime() - 100 < (record.sessionStarted as Date).getTime(),
    );
    assertEquals(record.sessionEnded, new Date(1592360640000));
    assertEquals(record.minLogLevel, "Warn");
    assertEquals(record.minLogLevelFrom, "Environment variable");
    assertEquals(record.loggerName, "MyLogger");
    assertEquals(record.filtersRegistered, 3);
    assertEquals(record.transformersRegistered, 4);
    assertEquals(record.monitorsRegistered, 5);
    assertEquals(record.streamName, "TestStream");
    assertEquals(record.logRecordsHandled, "Debug: 8, Info: 9, Warn: 10");
    assertEquals(record.recordsFiltered, 6);
    assertEquals(record.recordsTransformed, 7);
    assertEquals(record.duplicatedRecords, 11);
  },
});

test({
  name: "if no duplicates, then do not output it",
  fn() {
    const stream = new TestStream();
    const meta = new LogMetaImpl();
    meta.streamStats.set(
      stream,
      {
        handled: new Map<number, number>(),
        filtered: 6,
        transformed: 7,
        duplicated: 0,
      },
    );

    const record = meta.toRecord(stream);
    assert(Object.prototype.hasOwnProperty.call(record, "recordsFiltered"));
    assert(!Object.prototype.hasOwnProperty.call(record, "duplicatedRecords"));
  },
});
