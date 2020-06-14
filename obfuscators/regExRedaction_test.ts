import {
  test,
  assertEquals,
} from "../test_deps.ts";
import { Level } from "../levels.ts";
import { RegExRedaction } from "./regExRedaction.ts";
import { LogRecord } from "../types.ts";

const noopStream = { handle(lr: LogRecord): void {} };

test({
  name: "Non matching redaction results in same object values",
  fn() {
    const lr = {
      msg: "Log Message",
      metadata: [{ a: true, b: "hello" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
    };
    const newLr = new RegExRedaction(/123/).obfuscate(noopStream, lr);
    assertEquals(newLr.msg, lr.msg);
    assertEquals(newLr.metadata, lr.metadata);
    assertEquals(newLr.dateTime, lr.dateTime);
    assertEquals(newLr.level, lr.level);
  },
});

test({
  name: "RegEx redaction: Msg as string",
  fn() {
    const lr = {
      msg: "Log Message 1234, hello world",
      metadata: [{ a: true, b: "hello" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
    };
    const newLr = new RegExRedaction(/123/).obfuscate(noopStream, lr);
    assertEquals(newLr.msg, "Log Message ***4, hello world");

    const newLr2 = new RegExRedaction(/[s]{2}.*\d{4}/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(newLr2.msg, "Log Me***** ****, hello world");
  },
});

test({
  name: "RegEx redaction: Metadata as string",
  fn() {
    const lr = {
      msg: "some log message",
      metadata: ["Log Message 1234, hello world"],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
    };
    const newLr = new RegExRedaction(/123/).obfuscate(noopStream, lr);
    assertEquals(newLr.metadata, ["Log Message ***4, hello world"]);

    const newLr2 = new RegExRedaction(/[s]{2}.*\d{4}/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(newLr2.metadata, ["Log Me***** ****, hello world"]);
  },
});

test({
  name: "RegEx redaction: Msg as object",
  fn() {
    const lr = {
      msg: { a: "hello 1234", b: { c: "1234, there" } },
      metadata: [{ a: true, b: undefined }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
    };
    const newLr = new RegExRedaction(/123/).obfuscate(noopStream, lr);
    assertEquals(newLr.msg, { a: "hello ***4", b: { c: "***4, there" } });

    const newLr2 = new RegExRedaction(/[o].*\d{4}/).obfuscate(noopStream, lr);
    assertEquals(newLr2.msg, { a: "hell* ****", b: { c: "1234, there" } });
  },
});

test({
  name: "RegEx redaction: Metadata as object",
  fn() {
    const lr = {
      msg: "some log message",
      metadata: [{ a: "hello 1234", b: { c: "1234, there" } }, { d: "hello" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
    };
    const newLr = new RegExRedaction(/123/).obfuscate(noopStream, lr);
    assertEquals(
      newLr.metadata,
      [{ a: "hello ***4", b: { c: "***4, there" } }, { d: "hello" }],
    );

    const newLr2 = new RegExRedaction(/[o].*\d{4}/).obfuscate(noopStream, lr);
    assertEquals(
      newLr2.metadata,
      [{ a: "hell* ****", b: { c: "1234, there" } }, { d: "hello" }],
    );
  },
});

test({
  name: "RegEx redaction: Custom replacement functions work as expected",
  fn() {
    const lr = {
      msg: "Date of birth: 30-04-1977",
      metadata: [],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
    };
    const newLr = new RegExRedaction(
      /\d{2}-\d{2}-\d{4}/,
      (match) => match.replace(/\d/g, "*"),
    ).obfuscate(noopStream, lr);
    assertEquals(newLr.msg, "Date of birth: **-**-****");
  },
});
