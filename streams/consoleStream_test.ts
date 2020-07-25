import {
  test,
  assertEquals,
  assert,
} from "../test_deps.ts";
import { ConsoleStream } from "./consoleStream.ts";
import { Level } from "../logger/levels.ts";

test({
  name: "Default ConsoleStream logs message to console",
  fn() {
    const savedMsgs: unknown[] = [];
    const savedLogFn = console.log;
    try {
      console.log = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      new ConsoleStream().log("hello");
      assertEquals(savedMsgs[0], "hello");
    } finally {
      console.log = savedLogFn;
    }
  },
});

test({
  name: "Default ConsoleStream logs color log record to console",
  fn() {
    const savedMsgs: unknown[] = [];
    const savedLogFn = console.log;
    try {
      console.log = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      new ConsoleStream().handle(
        {
          msg: "hello",
          level: Level.DEBUG,
          metadata: [],
          dateTime: new Date(),
          logger: "default",
        },
      );
      console.log(savedMsgs);
      assert(
        (savedMsgs[0] as string).match(
          /\d{4}[-]\d{2}[-]\d{2}[T]\d{2}[:]\d{2}[:]\d{2}[.]\d{3}[Z] DEBUG    hello/,
        ),
      );
    } finally {
      console.log = savedLogFn;
    }
  },
});

test({
  name:
    "If logHeader and logFooter are not set to output, then nothing is output",
  fn() {
    const savedMsgs: unknown[] = [];
    const savedLogFn = console.log;
    try {
      console.log = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      const cs = new ConsoleStream().withLogHeader(false).withLogFooter(false);
      const lm = {
        hostname: "",
        sessionStarted: new Date(),
        minLogLevel: Level.DEBUG,
        minLogLevelFrom: "somewhere",
        logger: "default",
      };
      cs.logHeader(lm);
      cs.logFooter(lm);
      assert(savedMsgs.length === 0);
    } finally {
      console.log = savedLogFn;
    }
  },
});
