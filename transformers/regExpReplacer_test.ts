// Copyright 2020 the optic authors. All rights reserved. MIT license.
import { assert, assertEquals, test } from "../test_deps.ts";
import { Level } from "../logger/levels.ts";
import { RegExpReplacer } from "./regExpReplacer.ts";
import { nonWhitespaceReplacer } from "./regExpReplacer.ts";
import type { LogRecord } from "../types.ts";

const noopStream = {
  handle(lr: LogRecord): boolean {
    return true;
  },
};

test({
  name:
    "Errors are preserved when transforming into ObfuscatedPropertyLogRecord",
  fn() {
    const err = new Error("oops");
    const err2 = new Error("oops2");
    const lr = {
      msg: err,
      metadata: [{ a: true, b: "hello" }, err2],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(/123/).transform(noopStream, lr);
    assert(newLr.msg instanceof Error);
    assert(newLr.metadata[1] instanceof Error);
    assertEquals(
      (newLr.msg as Error).stack?.slice(0, 50),
      err.stack?.slice(0, 50),
    );
    assertEquals(
      (newLr.metadata[1] as Error).stack?.slice(0, 50),
      err2.stack?.slice(0, 50),
    );
  },
});

test({
  name: "Test redaction in arrays",
  fn() {
    const sym = Symbol("abc");
    const lr = {
      msg: ["hello", 123, "world", sym],
      metadata: [{ a: true, b: "hello" }, "metaHello", sym],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(/world/).transform(noopStream, lr);
    const newLr2 = new RegExpReplacer(/meta/).transform(noopStream, lr);
    assertEquals(newLr.msg, ["hello", 123, "*****", sym]);
    assertEquals(newLr2.metadata, [{ a: true, b: "hello" }, "****Hello", sym]);
  },
});

test({
  name: "Non matching redaction results in same object values",
  fn() {
    const lr = {
      msg: "Log Message",
      metadata: [{ a: true, b: "hello" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(/123/).transform(noopStream, lr);
    assert(lr === newLr);
  },
});

test({
  name: "RegExp redaction without groups: Msg as string",
  fn() {
    const lr = {
      msg: "Log Message 1234, hello world",
      metadata: [{ a: true, b: "hello" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(/123/).transform(noopStream, lr);
    assertEquals(newLr.msg, "Log Message ***4, hello world");

    const newLr2 = new RegExpReplacer(/[s]{2}.*\d{4}/).transform(
      noopStream,
      lr,
    );
    assertEquals(newLr2.msg, "Log Me***** ****, hello world");
  },
});

test({
  name: "RegExp redaction with groups: Msg as string",
  fn() {
    const lr = {
      msg: "Log Message 1234, hello world",
      metadata: [{ a: true, b: "hello" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(/Message (\d{4})/).transform(
      noopStream,
      lr,
    );
    assertEquals(newLr.msg, "Log Message ****, hello world");

    const newLr2 = new RegExpReplacer(/Log ([a-zA-Z]+)/).transform(
      noopStream,
      lr,
    );
    assertEquals(newLr2.msg, "Log ******* 1234, hello world");

    const newLr3 = new RegExpReplacer(/Log ([a-zA-Z]+)\s\d(\d{2})\d/).transform(
      noopStream,
      lr,
    );
    assertEquals(newLr3.msg, "Log ******* 1**4, hello world");
  },
});

test({
  name: "RegExp redaction without group: Metadata as string",
  fn() {
    const lr = {
      msg: "some log message",
      metadata: ["Log Message 1234, hello world"],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(/123/).transform(noopStream, lr);
    assertEquals(newLr.metadata, ["Log Message ***4, hello world"]);

    const newLr2 = new RegExpReplacer(/[s]{2}.*\d{4}/).transform(
      noopStream,
      lr,
    );
    assertEquals(newLr2.metadata, ["Log Me***** ****, hello world"]);
  },
});

test({
  name: "RegExp redaction with group: Metadata as string",
  fn() {
    const lr = {
      msg: "some log message",
      metadata: ["Log Message 1234, hello world"],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(/Message (\d{4})/).transform(
      noopStream,
      lr,
    );
    assertEquals(newLr.metadata, ["Log Message ****, hello world"]);

    const newLr2 = new RegExpReplacer(/Log ([a-zA-Z]+)/).transform(
      noopStream,
      lr,
    );
    assertEquals(newLr2.metadata, ["Log ******* 1234, hello world"]);

    const newLr3 = new RegExpReplacer(/Log ([a-zA-Z]+)\s\d(\d{2})\d/).transform(
      noopStream,
      lr,
    );
    assertEquals(newLr3.metadata, ["Log ******* 1**4, hello world"]);
  },
});

test({
  name: "RegExp redaction: Msg as object",
  fn() {
    const lr = {
      msg: { a: "hello 1234", b: { c: "1234, there" } },
      metadata: [{ a: true, b: undefined }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(/123/).transform(noopStream, lr);
    assertEquals(newLr.msg, { a: "hello ***4", b: { c: "***4, there" } });

    const newLr2 = new RegExpReplacer(/[o].*\d{4}/).transform(noopStream, lr);
    assertEquals(newLr2.msg, { a: "hell* ****", b: { c: "1234, there" } });
  },
});

test({
  name: "RegExp redaction: Metadata as object",
  fn() {
    const lr = {
      msg: "some log message",
      metadata: [{ a: "hello 1234", b: { c: "1234, there" } }, { d: "£76.22" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(/123/).transform(noopStream, lr);
    assertEquals(
      newLr.metadata,
      [{ a: "hello ***4", b: { c: "***4, there" } }, { d: "£76.22" }],
    );

    const newLr2 = new RegExpReplacer(/[o].*\d{4}/).transform(noopStream, lr);
    assertEquals(
      newLr2.metadata,
      [{ a: "hell* ****", b: { c: "1234, there" } }, { d: "£76.22" }],
    );

    const newLr3 = new RegExpReplacer(/£([\d]+\.[\d]{2})/).transform(
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
  name: "RegExp redaction: Custom replacement functions work as expected",
  fn() {
    const lr = {
      msg: "Date of birth: 30-04-1977",
      metadata: [],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(
      /\d{2}-\d{2}-\d{4}/,
      (match) => match.replace(/\d/g, "*"),
    ).transform(noopStream, lr);
    assertEquals(newLr.msg, "Date of birth: **-**-****");
  },
});

test({
  name: "RegExp redaction: nonWhitespaceReplacer works as expected",
  fn() {
    const lr = {
      msg: "Date of birth: 30-04-1977",
      metadata: [],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(
      /\d{2}-\d{2}-\d{4}/,
      nonWhitespaceReplacer,
    ).transform(noopStream, lr);
    assertEquals(newLr.msg, "Date of birth: **********");

    const newLr2 = new RegExpReplacer(
      /Date of birth/,
      nonWhitespaceReplacer,
    ).transform(noopStream, lr);
    assertEquals(newLr2.msg, "**** ** *****: 30-04-1977");
  },
});

test({
  name: "RegExp redaction: unusual characters",
  fn() {
    const lr = {
      msg: `A¬!"£$%^&*()_-+=]}[{#~'@;:/?.>,<\|'Z`,
      metadata: [],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(
      /A(.*)Z/,
      nonWhitespaceReplacer,
    ).transform(noopStream, lr);
    assertEquals(newLr.msg, "A*********************************Z");
  },
});

test({
  name: "RegExp redaction: Nested class redaction",
  fn() {
    class A {
      name = "hello world";
    }
    class B {
      a = new A();
    }
    const lr = {
      msg: new B(),
      metadata: [],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.Debug,
      logger: "default",
    };
    const newLr = new RegExpReplacer(/ell/).transform(noopStream, lr);
    assertEquals((newLr.msg as B).a.name, "h***o world");
  },
});
