// Copyright 2020 the optic authors. All rights reserved. MIT license.
import {
  assert,
  assertEquals,
  assertStringContains,
  test,
} from "../test_deps.ts";
import { BaseStream } from "./baseStream.ts";
import type { Formatter, LogMeta, LogRecord, Stream } from "../types.ts";
import { Level } from "../logger/levels.ts";
import { Logger } from "../mod.ts";
import { LogMetaImpl } from "../logger/meta.ts";
import { assertMatch } from "https://deno.land/std@0.69.0/testing/asserts.ts";
import { stringify } from "../utils/stringify.ts";
import { asString } from "../utils/asString.ts";
import { PropertyRedaction } from "../transformers/propertyRedaction.ts";

class MsgPassThrough implements Formatter<string> {
  format(lr: LogRecord): string {
    const msg = lr.msg === "format" ? "formatted!" : stringify(lr.msg);
    return msg + " " + stringify(lr.metadata);
  }
}

class AlternativeMsgPassThrough implements Formatter<string> {
  format(lr: LogRecord): string {
    return "world";
  }
}

class TestStream extends BaseStream {
  logs: unknown[] = [];

  constructor() {
    super(new MsgPassThrough());
  }

  log(msg: unknown): void {
    this.logs.push(msg);
  }
}

function newBaseStream(): TestStream {
  return new TestStream();
}

function logRec(msg: string, level: Level): LogRecord {
  return {
    msg: msg,
    dateTime: new Date(),
    metadata: [],
    level: level,
    logger: "default",
  };
}

function logMeta(): LogMeta {
  const meta = new LogMetaImpl();
  meta.minLogLevel = Level.Info;
  return meta;
}

test({
  name: "Default base stream will log debug messages",
  fn() {
    const baseStream = newBaseStream();
    baseStream.handle(logRec("hello", Level.Debug));
    assertEquals(baseStream.logs[0], `"hello" []`);
  },
});

test({
  name: "Stream with higher min log level than log record won't log message",
  fn() {
    const baseStream = newBaseStream().withMinLogLevel(Level.Info);
    baseStream.handle(logRec("hello", Level.Debug));
    assertEquals(baseStream.logs.length, 0);
  },
});

test({
  name: "Log messages are formatted by the default format function",
  fn() {
    const baseStream = newBaseStream();
    baseStream.handle(logRec("format", Level.Debug));
    assertEquals(baseStream.logs[0], `formatted! []`);
  },
});

test({
  name: "Alternative formatter function is used if set",
  fn() {
    const baseStream = newBaseStream().withFormat(
      new AlternativeMsgPassThrough(),
    );
    baseStream.handle(logRec("hello", Level.Debug));
    assertEquals(baseStream.logs[0], "world");
  },
});

test({
  name: "Output header defaults to true, but can be turned off",
  fn() {
    const baseStream = newBaseStream(); // default = true
    assert(baseStream.outputHeader);
    baseStream.withLogHeader(false); // explicitly set to false
    assert(!baseStream.outputHeader);
    baseStream.withLogHeader(); // implicitly set to true
    assert(baseStream.outputHeader);
    baseStream.withLogHeader(false); // explicitly set to false
    assert(!baseStream.outputHeader);
    baseStream.withLogHeader(true); // explicitly set to true
    assert(baseStream.outputHeader);
  },
});

test({
  name: "Output footer defaults to true, but can be turned off",
  fn() {
    const baseStream = newBaseStream(); // default = true
    assert(baseStream.outputFooter);
    baseStream.withLogFooter(false); // explicitly set to false
    assert(!baseStream.outputFooter);
    baseStream.withLogFooter(); // implicitly set to true
    assert(baseStream.outputFooter);
    baseStream.withLogFooter(false); // explicitly set to false
    assert(!baseStream.outputFooter);
    baseStream.withLogFooter(true); // explicitly set to true
    assert(baseStream.outputFooter);
  },
});

test({
  name: "Log header outputs header info",
  fn() {
    const baseStream = newBaseStream().withLogHeader(false);
    baseStream.logHeader(logMeta());
    assertEquals(baseStream.logs.length, 0);

    baseStream.withLogHeader();
    baseStream.logHeader(logMeta());
    assertEquals(baseStream.logs.length, 1);
    assertStringContains(
      (baseStream.logs[0] as string),
      "Logging session initialized",
    );
  },
});

test({
  name: "Log footer outputs header info",
  fn() {
    const testStream = newBaseStream().withLogFooter(false);
    const meta = logMeta();
    meta.streamStats.set(
      testStream,
      { handled: new Map<number, number>(), filtered: 0, transformed: 0 },
    );
    testStream.logFooter(meta);
    assertEquals(testStream.logs.length, 0);

    testStream.withLogFooter();
    testStream.logFooter(meta);
    assertEquals(testStream.logs.length, 1);
    assertStringContains(
      (testStream.logs[0] as string),
      "Logging session complete.  Duration",
    );
  },
});

test({
  name: "Log footer complex variants",
  fn() {
    const testStream = new TestStream();
    const logger = new Logger("config").addStream(testStream)
      .withMinLogLevel(Level.Info)
      .addTransformer(new PropertyRedaction("z"))
      .addFilter((stream: Stream, lr: LogRecord): boolean => {
        return asString(lr.msg).indexOf("def") > -1;
      })
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
    logger.removeStream(testStream);

    assertMatch(
      testStream.logs[testStream.logs.length - 1] as string,
      /\"Logging session complete\.\s\sDuration: \d+ms\" \[{\"sessionStarted\":\"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\",\"sessionEnded\":\"undefined\",\"minLogLevel\":\"Info\",\"minLogLevelFrom\":\"programmatically set\",\"loggerName\":\"config\",\"filtersRegistered\":1,\"transformersRegistered\":1,\"monitorsRegistered\":1,\"streamName\":\"TestStream\",\"logRecordsHandled\":\"Error: 3, Warn: 2, Info: 3\",\"recordsFiltered\":5,\"recordsTransformed\":2}\]/,
    );
  },
});
