import {
  test,
  assert,
  assertEquals,
} from "../test_deps.ts";
import { Level } from "../logger/levels.ts";
import { PropertyRedaction } from "./propertyRedaction.ts";
import { LogRecord } from "../types.ts";

const noopStream = { handle(lr: LogRecord): void {} };
const REDACTED = "[Redacted]";

test({
  name:
    "Errors are preserved when transforming into ObfuscatedPropertyLogRecord",
  fn() {
    const err = new Error("oops");
    const lr = {
      msg: err,
      metadata: [{ a: true, b: "hello" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLr = new PropertyRedaction("x").transform(noopStream, lr);
    assert(newLr.msg instanceof Error);
    assertEquals(
      (newLr.msg as Error).stack?.slice(0, 50),
      err.stack?.slice(0, 50),
    );
  },
});

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
    const newLr = new PropertyRedaction("x").transform(noopStream, lr);
    assert(lr === newLr);
  },
});

test({
  name: "Test shallow msg object redaction",
  fn() {
    const lr = {
      msg: { a: 6, b: "hello" },
      metadata: [],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLrA = new PropertyRedaction("a").transform(noopStream, lr);
    const newLrB = new PropertyRedaction("b").transform(noopStream, lr);
    assertEquals(newLrA.msg, { a: REDACTED, b: "hello" });
    assertEquals(newLrB.msg, { a: 6, b: REDACTED });
    assertEquals(lr.msg, { a: 6, b: "hello" });
  },
});

test({
  name: "Test deep msg object redaction",
  fn() {
    const lr = {
      msg: { a: { b: { c: { d: "hello" } } }, e: true },
      metadata: ["The metadata"],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLrA = new PropertyRedaction("a").transform(noopStream, lr);
    const newLrB = new PropertyRedaction("b").transform(noopStream, lr);
    const newLrC = new PropertyRedaction("c").transform(noopStream, lr);
    const newLrD = new PropertyRedaction("d").transform(noopStream, lr);
    assertEquals(newLrA.msg, { a: REDACTED, e: true });
    assertEquals(newLrB.msg, { a: { b: REDACTED }, e: true });
    assertEquals(newLrC.msg, { a: { b: { c: REDACTED } }, e: true });
    assertEquals(newLrD.msg, { a: { b: { c: { d: REDACTED } } }, e: true });
    assertEquals(lr.msg, { a: { b: { c: { d: "hello" } } }, e: true });
  },
});

test({
  name: "Test msg as Array redaction",
  fn() {
    const sym = Symbol("abc");
    const lr = {
      msg: [{ a: "hello" }, { e: true }, 1234, sym],
      metadata: ["The metadata"],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLrA = new PropertyRedaction("e").transform(noopStream, lr);
    assertEquals(newLrA.msg, [{ a: "hello" }, { e: REDACTED }, 1234, sym]);
  },
});

test({
  name: "Test shallow metadata object redaction",
  fn() {
    const lr = {
      msg: null,
      metadata: [
        { a: 6, b: true },
        "The metadata",
        { c: "hello", d: "world" },
        1,
      ],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLrA = new PropertyRedaction("a").transform(noopStream, lr);
    const newLrB = new PropertyRedaction("b").transform(noopStream, lr);
    const newLrC = new PropertyRedaction("c").transform(noopStream, lr);
    const newLrD = new PropertyRedaction("d").transform(noopStream, lr);
    assertEquals(
      newLrA.metadata,
      [{ a: REDACTED, b: true }, "The metadata", { c: "hello", d: "world" }, 1],
    );
    assertEquals(
      newLrB.metadata,
      [{ a: 6, b: REDACTED }, "The metadata", { c: "hello", d: "world" }, 1],
    );
    assertEquals(
      newLrC.metadata,
      [{ a: 6, b: true }, "The metadata", { c: REDACTED, d: "world" }, 1],
    );
    assertEquals(
      newLrD.metadata,
      [{ a: 6, b: true }, "The metadata", { c: "hello", d: REDACTED }, 1],
    );
  },
});

test({
  name: "Test deep metadata object redaction",
  fn() {
    const lr = {
      msg: undefined,
      metadata: [
        { a: { b: { c: { d: "hello" } } }, e: true },
        { a: { b: { c: { d: "hello" } } }, e: true },
      ],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLrA = new PropertyRedaction("a").transform(noopStream, lr);
    const newLrB = new PropertyRedaction("b").transform(noopStream, lr);
    const newLrC = new PropertyRedaction("c").transform(noopStream, lr);
    const newLrD = new PropertyRedaction("d").transform(noopStream, lr);
    assertEquals(
      newLrA.metadata,
      [{ a: REDACTED, e: true }, { a: REDACTED, e: true }],
    );
    assertEquals(
      newLrB.metadata,
      [{ a: { b: REDACTED }, e: true }, { a: { b: REDACTED }, e: true }],
    );
    assertEquals(
      newLrC.metadata,
      [
        { a: { b: { c: REDACTED } }, e: true },
        { a: { b: { c: REDACTED } }, e: true },
      ],
    );
    assertEquals(
      newLrD.metadata,
      [
        { a: { b: { c: { d: REDACTED } } }, e: true },
        { a: { b: { c: { d: REDACTED } } }, e: true },
      ],
    );
  },
});
