// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import { assert, assertEquals, assertThrows, test } from "../../test_deps.ts";
import { FileStream } from "./fileStream.ts";
import {
  LogFileInitStrategy,
  LogFileRetentionPolicy,
  RotationStrategy,
} from "./types.ts";
import { LogMetaImpl } from "../../logger/meta.ts";
import { Level } from "../../logger/levels.ts";
import { LogRecord, ValidationError } from "../../types.ts";
import { BufWriterSync } from "./deps.ts";
import { intervalOf } from "../../utils/timeInterval.ts";

const LOG_FILE = "./logFile.txt";
const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

class TestableFileStream extends FileStream {
  getBuffer(): BufWriterSync {
    return this._buffer();
  }
  override format(lr: LogRecord): string {
    return lr.msg as string;
  }
}

class TestableRotationStrategy implements RotationStrategy {
  initLogsFilename = "";
  initStrategy: LogFileInitStrategy = "append";
  shouldRotateLogMessage: unknown;
  shouldRotateResult = false;
  rotateLogFilename = "";
  rotateLogMessage: unknown;
  logRetentionPolicy: LogFileRetentionPolicy | undefined;

  initLogs(filename: string, initStrategy: LogFileInitStrategy): void {
    this.initLogsFilename = filename;
    this.initStrategy = initStrategy;
  }
  shouldRotate(logMessage?: unknown): boolean {
    this.shouldRotateLogMessage = logMessage;
    return this.shouldRotateResult;
  }
  rotate(filename: string, logMessage: unknown): void {
    this.rotateLogFilename = filename;
    this.rotateLogMessage = logMessage;
    Deno.renameSync(filename, filename + ".1");
  }
  withLogFileRetentionPolicy(
    logFileRetentionPolicy: LogFileRetentionPolicy,
  ): this {
    this.logRetentionPolicy = logFileRetentionPolicy;
    return this;
  }
}

function readFile(file: string): string {
  return DECODER.decode(Deno.readFileSync(file));
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

test({
  name: "Filename is retained on construction",
  fn() {
    assertEquals(new FileStream(LOG_FILE).getFileName(), LOG_FILE);
  },
});

test({
  name: "LogFileInitStrategy of mustNotExist should throw if file exists",
  fn() {
    assertThrows(
      () => {
        Deno.writeFileSync(LOG_FILE, ENCODER.encode("hello world"));
        new FileStream(LOG_FILE).withLogFileInitMode("mustNotExist").setup();
      },
      Error,
      "exists",
    );
    Deno.removeSync(LOG_FILE);
  },
});

test({
  name: "LogFileInitStrategy of overwrite should wipe log file if file exists",
  fn() {
    const fs = new FileStream(LOG_FILE).withLogFileInitMode("overwrite");
    Deno.writeFileSync(LOG_FILE, ENCODER.encode("hello world"));
    assertEquals(Deno.statSync(LOG_FILE).size, 11);
    fs.setup();
    assertEquals(Deno.statSync(LOG_FILE).size, 0);
    Deno.removeSync(LOG_FILE);
    fs.destroy();
  },
});

test({
  name:
    "LogFileInitStrategy of append should retain existing log file if file exists",
  fn() {
    const fs = new FileStream(LOG_FILE).withLogFileInitMode("append");
    Deno.writeFileSync(LOG_FILE, ENCODER.encode("hello world"));
    assertEquals(Deno.statSync(LOG_FILE).size, 11);
    fs.setup();
    assertEquals(Deno.statSync(LOG_FILE).size, 11);
    Deno.removeSync(LOG_FILE);
    fs.destroy();
  },
});

test({
  name: "Rotation strategy should be initialised on setup",
  fn() {
    const rs = new TestableRotationStrategy();
    const fs = new FileStream(LOG_FILE).withLogFileRotation(rs)
      .withLogFileInitMode("mustNotExist");
    fs.setup();
    assertEquals(rs.initLogsFilename, LOG_FILE);
    assertEquals(rs.initStrategy, "mustNotExist");
    Deno.removeSync(LOG_FILE);
    fs.destroy();
  },
});

test({
  name: "Destroy flushes logs and closes log file",
  fn() {
    const fs = new FileStream(LOG_FILE);
    fs.setup();
    assertEquals(Deno.statSync(LOG_FILE).size, 0);
    fs.log("hello world"); // written to buffer, not the log file
    assertEquals(Deno.statSync(LOG_FILE).size, 0);
    fs.destroy(); // flush buffer to file and close it
    assertEquals(Deno.statSync(LOG_FILE).size, 12);
    Deno.removeSync(LOG_FILE);
  },
});

test({
  name: "Header and footer shouldn't log if set not to",
  fn() {
    const fs = new FileStream(LOG_FILE).withLogHeader(false).withLogFooter(
      false,
    );
    fs.setup();
    fs.logHeader(new LogMetaImpl());
    fs.logFooter(new LogMetaImpl());
    fs.destroy();
    assertEquals(Deno.statSync(LOG_FILE).size, 0);
    Deno.removeSync(LOG_FILE);
  },
});

test({
  name: "Header and footer should log if set to",
  fn() {
    const fs = new FileStream(LOG_FILE);
    fs.setup();
    fs.logHeader(new LogMetaImpl());
    fs.logFooter(new LogMetaImpl());
    fs.destroy();
    assert(Deno.statSync(LOG_FILE).size > 300);
    Deno.removeSync(LOG_FILE);
  },
});

test({
  name: "Log records less than min log level aren't handled",
  fn() {
    const fs = new FileStream(LOG_FILE).withMinLogLevel(Level.Error);
    assert(!fs.handle(logRec("shouldn't be logged", Level.Debug)));
  },
});

test({
  name: "Log level of error or less will queue log records",
  async fn() {
    const fs = new TestableFileStream(LOG_FILE);
    fs.setup();
    const handled = fs.handle(logRec("hello world", Level.Error));
    assert(handled);
    assertEquals(Deno.statSync(LOG_FILE).size, 0, "Message still queued");
    assertEquals(fs.getBuffer().buffered(), 0, "Nothing buffered yet");
    //let queueMicrotask run to process queued messages to buffer
    await new Promise<void>((res) => {
      setTimeout((): void => {
        assertEquals(fs.getBuffer().buffered(), 12);
        fs.destroy();
        assertEquals(Deno.statSync(LOG_FILE).size, 12, "Message now processed");
        Deno.removeSync(LOG_FILE);
        res();
      }, 0);
    });
  },
});

test({
  name: "Log level of greater than error will immediately cut log record",
  fn() {
    const fs = new TestableFileStream(LOG_FILE);
    fs.setup();
    const handled = fs.handle(logRec("hello world", Level.Critical));
    assert(handled);
    assertEquals(
      Deno.statSync(LOG_FILE).size,
      12,
      "Message immediately written to file",
    );
    fs.destroy();
    Deno.removeSync(LOG_FILE);
  },
});

test({
  name: "On file rotation, buffer is flushed and file is rotated",
  fn() {
    const rs = new TestableRotationStrategy();
    const fs = new TestableFileStream(LOG_FILE).withLogFileRotation(rs);
    fs.setup();
    fs.log("first message");
    assertEquals(Deno.statSync(LOG_FILE).size, 0, "Message still buffered");
    assertEquals(fs.getBuffer().buffered(), "first message\n".length);
    rs.shouldRotateResult = true;
    fs.log("second message");
    assertEquals(rs.rotateLogFilename, LOG_FILE);
    assertEquals(
      DECODER.decode(rs.rotateLogMessage as Uint8Array),
      "second message\n",
    );
    assertEquals(readFile(LOG_FILE + ".1"), "first message\n");
    assertEquals(fs.getBuffer().buffered(), "second message\n".length);
    assertEquals(
      Deno.statSync(LOG_FILE).size,
      0,
      "Second message still buffered",
    );
    fs.destroy();
    Deno.removeSync(LOG_FILE);
    Deno.removeSync(LOG_FILE + ".1");
  },
});

test({
  name: "Negative buffer sizes should throw exception",
  fn() {
    assertThrows(
      () => {
        new FileStream(LOG_FILE).withBufferSize(-1);
      },
      ValidationError,
      "Buffer size cannot be negative",
    );
  },
});

test({
  name: "flush() should flush buffer",
  fn() {
    const fs = new TestableFileStream(LOG_FILE);
    fs.setup();
    fs.getBuffer().writeSync(ENCODER.encode("hello world"));
    fs.flush();
    assertEquals(readFile(LOG_FILE), "hello world");
    fs.destroy();
    Deno.removeSync(LOG_FILE);
  },
});

test({
  name: "Auto flush should flush buffer on interval",
  async fn() {
    const fs = new TestableFileStream(LOG_FILE).withAutoFlushEvery(
      intervalOf(1).seconds(),
    );
    fs.setup();
    fs.log("hello world");

    //Assert that the log file is empty after 200ms, e.g. the buffer hasn't been flushed yet
    await new Promise<void>((res) => {
      setTimeout((): void => {
        assertEquals(readFile(LOG_FILE), "");
        res();
      }, 500);
    });

    await new Promise<void>((res) => {
      setTimeout((): void => {
        assertEquals(readFile(LOG_FILE), "hello world\n");
        fs.destroy();
        Deno.removeSync(LOG_FILE);
        res();
      }, 600); //600ms + 500ms = 1100ms which is greater than the 1 second interval
    });
  },
});
