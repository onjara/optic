// Copyright 2020-2024 the optic authors. All rights reserved. MIT license.
import { assert, assertEquals, test } from "../test_deps.ts";
import type { LogRecord, Stream } from "../types.ts";
import { asString } from "../utils/asString.ts";
import { Dedupe } from "./dedupe.ts";
import { Level } from "./levels.ts";
import { ImmutableLogRecord } from "./logRecord.ts";
import { LogMetaImpl } from "./meta.ts";

const logMsg1 = new ImmutableLogRecord("msg1", [], Level.Info, "abc");
const logMsg2 = new ImmutableLogRecord("msg2", [], Level.Info, "abc");

class TestStream implements Stream {
  logRecords: LogRecord[] = [];

  handle(logRecord: LogRecord): boolean {
    this.logRecords.push(logRecord);
    return true;
  }
}

function logMetaObj(stream: Stream): LogMetaImpl {
  const meta = new LogMetaImpl();
  meta.streamStats.set(
    stream,
    {
      handled: new Map<number, number>(),
      filtered: 0,
      transformed: 0,
      duplicated: 0,
    },
  );
  return meta;
}

test({
  name: "Destroy with no records does nothing",
  fn() {
    const testStream = new TestStream();
    const deduper = new Dedupe([testStream], logMetaObj(testStream));
    deduper.destroy();
    assertEquals(testStream.logRecords.length, 0);
  },
});

test({
  name: "First message is not a duplicate",
  fn() {
    const testStream = new TestStream();
    const deduper = new Dedupe([testStream], logMetaObj(testStream));
    assert(!deduper.isDuplicate(logMsg1));
    assertEquals(testStream.logRecords.length, 0);
  },
});

test({
  name: "Second message is a duplicate, and is output as is",
  fn() {
    const testStream = new TestStream();
    const meta = logMetaObj(testStream);
    const deduper = new Dedupe([testStream], meta);
    assert(!deduper.isDuplicate(logMsg1));
    assert(deduper.isDuplicate(logMsg1));
    assertEquals(testStream.logRecords.length, 0);
    assertEquals(meta.streamStats.get(testStream)!.duplicated, 0);
    deduper.destroy(); //simulate unload event
    // Only the duplicate message is recorded to the stream from the deduper
    assertEquals(testStream.logRecords.length, 1);
    assertEquals(
      asString(testStream.logRecords[0]),
      '{"msg":"msg1","level":30,"logger":"abc"}',
    );
    assertEquals(meta.streamStats.get(testStream)!.duplicated, 1);
  },
});

test({
  name: "Third message in a row is a duplicate.  Duplicated 2 times is output",
  fn() {
    const testStream = new TestStream();
    const meta = logMetaObj(testStream);
    const deduper = new Dedupe([testStream], meta);
    assert(!deduper.isDuplicate(logMsg1));
    assert(deduper.isDuplicate(logMsg1));
    assert(deduper.isDuplicate(logMsg1));
    assertEquals(testStream.logRecords.length, 0);
    assertEquals(meta.streamStats.get(testStream)!.duplicated, 0);
    deduper.destroy(); //simulate unload event
    // Only the duplicate message is recorded to the stream from the deduper
    assertEquals(testStream.logRecords.length, 1);
    assertEquals(
      asString(testStream.logRecords[0]),
      '{"msg":"  ^-- last log repeated 2 additional times","level":30,"logger":"abc"}',
    );
    assertEquals(meta.streamStats.get(testStream)!.duplicated, 2);
  },
});

test({
  name: "Fourth message in a row is a duplicate.  Duplicated 3 times is output",
  fn() {
    const testStream = new TestStream();
    const meta = logMetaObj(testStream);
    const deduper = new Dedupe([testStream], meta);
    assert(!deduper.isDuplicate(logMsg1));
    assert(deduper.isDuplicate(logMsg1));
    assert(deduper.isDuplicate(logMsg1));
    assert(deduper.isDuplicate(logMsg1));
    assertEquals(testStream.logRecords.length, 0);
    assertEquals(meta.streamStats.get(testStream)!.duplicated, 0);
    deduper.destroy(); //simulate unload event
    // Only the duplicate message is recorded to the stream from the deduper
    assertEquals(testStream.logRecords.length, 1);
    assertEquals(
      asString(testStream.logRecords[0]),
      '{"msg":"  ^-- last log repeated 3 additional times","level":30,"logger":"abc"}',
    );
    assertEquals(meta.streamStats.get(testStream)!.duplicated, 3);
  },
});

test({
  name: "Different message will trigger duplicate queue to flush",
  fn() {
    const testStream = new TestStream();
    const meta = logMetaObj(testStream);
    const deduper = new Dedupe([testStream], meta);
    assert(!deduper.isDuplicate(logMsg1));
    assert(deduper.isDuplicate(logMsg1));
    assert(deduper.isDuplicate(logMsg1));
    assert(deduper.isDuplicate(logMsg1));
    assertEquals(testStream.logRecords.length, 0);
    assertEquals(meta.streamStats.get(testStream)!.duplicated, 0);

    // Trigger flush of duplicate msg to stream with new message
    assert(!deduper.isDuplicate(logMsg2));
    // Only the duplicate message is recorded to the stream from the deduper
    assertEquals(testStream.logRecords.length, 1);
    assertEquals(
      asString(testStream.logRecords[0]),
      '{"msg":"  ^-- last log repeated 3 additional times","level":30,"logger":"abc"}',
    );
    assertEquals(meta.streamStats.get(testStream)!.duplicated, 3);
  },
});
