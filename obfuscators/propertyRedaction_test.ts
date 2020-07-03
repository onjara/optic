import {
  test,
  assertEquals,
} from "../test_deps.ts";
import { Level } from "../logger/levels.ts";
import { PropertyRedaction } from "./propertyRedaction.ts";
import { LogRecord } from "../types.ts";

const noopStream = { handle(lr: LogRecord): void {} };
const REDACTED = "[Redacted]";

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
    const newLr = new PropertyRedaction("x").obfuscate(noopStream, lr);
    assertEquals(newLr.msg, lr.msg);
    assertEquals(newLr.metadata, lr.metadata);
    assertEquals(newLr.dateTime, lr.dateTime);
    assertEquals(newLr.level, lr.level);
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
    const newLrA = new PropertyRedaction("a").obfuscate(noopStream, lr);
    const newLrB = new PropertyRedaction("b").obfuscate(noopStream, lr);
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
    const newLrA = new PropertyRedaction("a").obfuscate(noopStream, lr);
    const newLrB = new PropertyRedaction("b").obfuscate(noopStream, lr);
    const newLrC = new PropertyRedaction("c").obfuscate(noopStream, lr);
    const newLrD = new PropertyRedaction("d").obfuscate(noopStream, lr);
    assertEquals(newLrA.msg, { a: REDACTED, e: true });
    assertEquals(newLrB.msg, { a: { b: REDACTED }, e: true });
    assertEquals(newLrC.msg, { a: { b: { c: REDACTED } }, e: true });
    assertEquals(newLrD.msg, { a: { b: { c: { d: REDACTED } } }, e: true });
    assertEquals(lr.msg, { a: { b: { c: { d: "hello" } } }, e: true });
  },
});

test({
  name: "Test shallow metadata object redaction",
  fn() {
    const lr = {
      msg: null,
      metadata: [{ a: 6, b: true }, "The metadata", { c: "hello", d: "world" }],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
      logger: "default",
    };
    const newLrA = new PropertyRedaction("a").obfuscate(noopStream, lr);
    const newLrB = new PropertyRedaction("b").obfuscate(noopStream, lr);
    const newLrC = new PropertyRedaction("c").obfuscate(noopStream, lr);
    const newLrD = new PropertyRedaction("d").obfuscate(noopStream, lr);
    assertEquals(
      newLrA.metadata,
      [{ a: REDACTED, b: true }, "The metadata", { c: "hello", d: "world" }],
    );
    assertEquals(
      newLrB.metadata,
      [{ a: 6, b: REDACTED }, "The metadata", { c: "hello", d: "world" }],
    );
    assertEquals(
      newLrC.metadata,
      [{ a: 6, b: true }, "The metadata", { c: REDACTED, d: "world" }],
    );
    assertEquals(
      newLrD.metadata,
      [{ a: 6, b: true }, "The metadata", { c: "hello", d: REDACTED }],
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
    const newLrA = new PropertyRedaction("a").obfuscate(noopStream, lr);
    const newLrB = new PropertyRedaction("b").obfuscate(noopStream, lr);
    const newLrC = new PropertyRedaction("c").obfuscate(noopStream, lr);
    const newLrD = new PropertyRedaction("d").obfuscate(noopStream, lr);
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
