import {
  test,
  assertEquals,
} from "../test_deps.ts";
import { Level } from "../logger/levels.ts";
import { RegExReplacer, nonWhitespaceReplacer } from "./regExReplacer.ts";
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
      logger: "default",
    };
    const newLr = new RegExReplacer(/123/).obfuscate(noopStream, lr);
    assertEquals(newLr.msg, lr.msg);
    assertEquals(newLr.metadata, lr.metadata);
    assertEquals(newLr.dateTime, lr.dateTime);
    assertEquals(newLr.level, lr.level);
  },
});

test({
  name: "RegEx redaction without groups: Msg as string",
  fn() {
    const lr = {
      msg: "Log Message 1234, hello world",
      metadata: [{ a: true, b: "hello" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLr = new RegExReplacer(/123/).obfuscate(noopStream, lr);
    assertEquals(newLr.msg, "Log Message ***4, hello world");

    const newLr2 = new RegExReplacer(/[s]{2}.*\d{4}/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(newLr2.msg, "Log Me***** ****, hello world");
  },
});

test({
  name: "RegEx redaction with groups: Msg as string",
  fn() {
    const lr = {
      msg: "Log Message 1234, hello world",
      metadata: [{ a: true, b: "hello" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLr = new RegExReplacer(/Message (\d{4})/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(newLr.msg, "Log Message ****, hello world");

    const newLr2 = new RegExReplacer(/Log ([a-zA-Z]+)/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(newLr2.msg, "Log ******* 1234, hello world");

    const newLr3 = new RegExReplacer(/Log ([a-zA-Z]+)\s\d(\d{2})\d/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(newLr3.msg, "Log ******* 1**4, hello world");
  },
});

test({
  name: "RegEx redaction without group: Metadata as string",
  fn() {
    const lr = {
      msg: "some log message",
      metadata: ["Log Message 1234, hello world"],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLr = new RegExReplacer(/123/).obfuscate(noopStream, lr);
    assertEquals(newLr.metadata, ["Log Message ***4, hello world"]);

    const newLr2 = new RegExReplacer(/[s]{2}.*\d{4}/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(newLr2.metadata, ["Log Me***** ****, hello world"]);
  },
});

test({
  name: "RegEx redaction with group: Metadata as string",
  fn() {
    const lr = {
      msg: "some log message",
      metadata: ["Log Message 1234, hello world"],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLr = new RegExReplacer(/Message (\d{4})/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(newLr.metadata, ["Log Message ****, hello world"]);

    const newLr2 = new RegExReplacer(/Log ([a-zA-Z]+)/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(newLr2.metadata, ["Log ******* 1234, hello world"]);

    const newLr3 = new RegExReplacer(/Log ([a-zA-Z]+)\s\d(\d{2})\d/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(newLr3.metadata, ["Log ******* 1**4, hello world"]);
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
      logger: "default",
    };
    const newLr = new RegExReplacer(/123/).obfuscate(noopStream, lr);
    assertEquals(newLr.msg, { a: "hello ***4", b: { c: "***4, there" } });

    const newLr2 = new RegExReplacer(/[o].*\d{4}/).obfuscate(noopStream, lr);
    assertEquals(newLr2.msg, { a: "hell* ****", b: { c: "1234, there" } });
  },
});

test({
  name: "RegEx redaction: Metadata as object",
  fn() {
    const lr = {
      msg: "some log message",
      metadata: [{ a: "hello 1234", b: { c: "1234, there" } }, { d: "£76.22" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLr = new RegExReplacer(/123/).obfuscate(noopStream, lr);
    assertEquals(
      newLr.metadata,
      [{ a: "hello ***4", b: { c: "***4, there" } }, { d: "£76.22" }],
    );

    const newLr2 = new RegExReplacer(/[o].*\d{4}/).obfuscate(noopStream, lr);
    assertEquals(
      newLr2.metadata,
      [{ a: "hell* ****", b: { c: "1234, there" } }, { d: "£76.22" }],
    );

    const newLr3 = new RegExReplacer(/£([\d]+\.[\d]{2})/).obfuscate(
      noopStream,
      lr,
    );
    assertEquals(
      newLr3.metadata,
      [{ a: "hello 1234", b: { c: "1234, there" } }, { d: "£**.**" }],
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
      logger: "default",
    };
    const newLr = new RegExReplacer(
      /\d{2}-\d{2}-\d{4}/,
      (match) => match.replace(/\d/g, "*"),
    ).obfuscate(noopStream, lr);
    assertEquals(newLr.msg, "Date of birth: **-**-****");
  },
});

test({
  name: "nonWhitespaceReplacer works as expected",
  fn() {
    const lr = {
      msg: "Date of birth: 30-04-1977",
      metadata: [],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLr = new RegExReplacer(
      /\d{2}-\d{2}-\d{4}/,
      nonWhitespaceReplacer,
    ).obfuscate(noopStream, lr);
    assertEquals(newLr.msg, "Date of birth: **********");

    const newLr2 = new RegExReplacer(
      /Date of birth/,
      nonWhitespaceReplacer,
    ).obfuscate(noopStream, lr);
    assertEquals(newLr2.msg, "**** ** *****: 30-04-1977");
  },
});

test({
  name: "Test unusual characters",
  fn() {
    const lr = {
      msg: `A¬!"£$%^&*()_-+=]}[{#~'@;:/?.>,<\|'Z`,
      metadata: [],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLr = new RegExReplacer(
      /A(.*)Z/,
      nonWhitespaceReplacer,
    ).obfuscate(noopStream, lr);
    assertEquals(newLr.msg, "A*********************************Z");
  },
});
