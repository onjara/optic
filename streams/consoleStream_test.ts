// Copyright 2022 the optic authors. All rights reserved. MIT license.
import { assert, assertEquals, test } from "../test_deps.ts";
import { ConsoleStream } from "./consoleStream.ts";
import { Level } from "../logger/levels.ts";
import { Formatter,LogRecord } from "../types.ts";

class MsgFormatter implements Formatter<string> {
  format(logRecord: LogRecord): string {
    return '' + logRecord.msg;
  }
}

function logToConsole(level:Level): void {
  const cs = new ConsoleStream().withFormat(new MsgFormatter());
  cs.handle({
    msg: "hello",
    level: level,
    metadata: [],
    dateTime: new Date(),
    logger: "default",
});
}

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
    const savedLogFn = console.debug;
    try {
      console.debug = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      new ConsoleStream().handle(
        {
          msg: "hello",
          level: Level.Debug,
          metadata: [],
          dateTime: new Date(),
          logger: "default",
        },
      );
      assert(
        (savedMsgs[0] as string).match(
          /\d{4}[-]\d{2}[-]\d{2}[T]\d{2}[:]\d{2}[:]\d{2}[.]\d{3}[Z]\sDebug\s\s\s\shello/,
        ),
      );
    } finally {
      console.debug = savedLogFn;
    }
  },
});

test({
  name: "ConsoleStream logs debug to console.debug",
  fn() {
    const savedMsgs: unknown[] = [];
    const savedLogFn = console.debug;
    try {
      console.debug = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      logToConsole(Level.Debug);
      assertEquals(savedMsgs[0], "hello");
    } finally {
      console.debug = savedLogFn;
    }
  },
});

test({
  name: "ConsoleStream logs info to console.info",
  fn() {
    const savedMsgs: unknown[] = [];
    const savedLogFn = console.info;
    try {
      console.info = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      logToConsole(Level.Info);
      assertEquals(savedMsgs[0], "hello");
    } finally {
      console.info = savedLogFn;
    }
  },
});

test({
  name: "ConsoleStream logs warn to console.warn",
  fn() {
    const savedMsgs: unknown[] = [];
    const savedLogFn = console.warn;
    try {
      console.warn = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      logToConsole(Level.Warn);
      assertEquals(savedMsgs[0], "hello");
    } finally {
      console.warn = savedLogFn;
    }
  },
});

test({
  name: "ConsoleStream logs error to console.error",
  fn() {
    const savedMsgs: unknown[] = [];
    const savedLogFn = console.error;
    try {
      console.error = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      logToConsole(Level.Error);
      assertEquals(savedMsgs[0], "hello");
    } finally {
      console.error = savedLogFn;
    }
  },
});

test({
  name: "ConsoleStream logs critical to console.error",
  fn() {
    const savedMsgs: unknown[] = [];
    const savedLogFn = console.error;
    try {
      console.error = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      logToConsole(Level.Critical);
      assertEquals(savedMsgs[0], "hello");
    } finally {
      console.error = savedLogFn;
    }
  },
});

test({
  name: "ConsoleStream logs trace to console.log",
  fn() {
    const savedMsgs: unknown[] = [];
    const savedLogFn = console.log;
    try {
      console.log = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      logToConsole(Level.Trace);
      assertEquals(savedMsgs[0], "hello");
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
    const savedLogFn = console.info;
    try {
      console.info = (...args: unknown[]) => {
        savedMsgs.push(...args);
      };
      const cs = new ConsoleStream().withLogHeader(false).withLogFooter(false);
      const lm = {
        hostname: "",
        sessionStarted: new Date(),
        minLogLevel: Level.Info,
        minLogLevelFrom: "somewhere",
        logger: "default",
        streamStats: new Map(),
        filters: 0,
        transformers: 0,
        monitors: 0,
        logsHandled: 0,
      };
      cs.logHeader(lm);
      cs.logFooter(lm);
      assert(savedMsgs.length === 0);
    } finally {
      console.info = savedLogFn;
    }
  },
});
