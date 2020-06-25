import {
  test,
  assertEquals,
  assert,
} from "../test_deps.ts";
import { BaseStream } from "./baseStream.ts";
import { LogRecord, Formatter } from "../types.ts";
import { Level } from "../logger/levels.ts";

class MsgPassThrough implements Formatter<string> {
  format(lr: LogRecord): string {
    return lr.msg === "format" ? "formatted!" : String(lr.msg);
  }
}

class AlternativeMsgPassThrough implements Formatter<string> {
  format(lr: LogRecord): string {
    return "world";
  }
}

class TestStream extends BaseStream {
  logs: string[] = [];

  constructor() {
    super(new MsgPassThrough());
  }

  log(msg: string): void {
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
  };
}

test({
  name: "Default base stream will log debug messages",
  fn() {
    const baseStream = newBaseStream();
    baseStream.handle(logRec("hello", Level.DEBUG));
    assertEquals(baseStream.logs[0], "hello");
  },
});

test({
  name: "Stream with higher min log level than log record won't log message",
  fn() {
    const baseStream = newBaseStream().withMinLogLevel(Level.INFO);
    baseStream.handle(logRec("hello", Level.DEBUG));
    assertEquals(baseStream.logs.length, 0);
  },
});

test({
  name: "Log messages are formatted by the default format function",
  fn() {
    const baseStream = newBaseStream();
    baseStream.handle(logRec("format", Level.DEBUG));
    assertEquals(baseStream.logs[0], "formatted!");
  },
});

test({
  name: "Alternative formatter function is used if set",
  fn() {
    const baseStream = newBaseStream().withFormat(
      new AlternativeMsgPassThrough(),
    );
    baseStream.handle(logRec("hello", Level.DEBUG));
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
