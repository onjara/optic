import {
  test,
  assert,
  assertEquals,
  assertThrows,
} from "../../test_deps.ts";
import { every } from "./rotationStrategy.ts";
import { of } from "./retentionPolicy.ts";
import { ValidationError, IllegalStateError } from "../../types.ts";
import { FileSizeRotationStrategy } from "./fileSizeRotationStrategy.ts";

const LOG_FILE = "./test_log.file";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function exists(filePath: string): boolean {
  try {
    Deno.statSync(filePath);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }
    throw err;
  }
  return true;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  // add back 1 second to avoid loss of millisecond precision with setMTime
  d.setSeconds(d.getSeconds() + 61);
  return d;
}

async function setMTime(file: string, date: Date): Promise<void> {
  let modTime: string = "" + date.getFullYear();
  modTime += ((date.getMonth() + 1) < 10 ? "0" : "") + (date.getMonth() + 1);
  modTime += (date.getDate() < 10 ? "0" : "") + date.getDate();
  modTime += (date.getHours() < 10 ? "0" : "") + date.getHours();
  modTime += (date.getMinutes() < 10 ? "0" : "") + date.getMinutes();
  modTime += "." + (date.getSeconds() < 10 ? "0" : "") + date.getSeconds();
  const p = Deno.run({
    cmd: ["touch", "-m", "-t", modTime, file],
  });
  await p.status();
  p.close();
}

async function createFile(file: string, date?: Date): Promise<void> {
  Deno.writeFileSync(file, encoder.encode("hello world"));
  if (date) {
    await setMTime(file, date);
  }
}

function readFile(file: string): string {
  return decoder.decode(Deno.readFileSync(file));
}

test({
  name: "FileSizeRotationStrategy: bytes cannot be less than 1",
  fn() {
    assertThrows(
      () => {
        new FileSizeRotationStrategy(0);
      },
      ValidationError,
      "Max bytes cannot be less than 1",
    );
  },
});

test({
  name: "FileSizeRotationStrategy: You can query max bytes",
  fn() {
    assertEquals(every(100).bytes().maxBytes, 100);
  },
});

test({
  name:
    "FileSizeRotationStrategy: init append will set current file size to log file size for existing log file",
  async fn() {
    await createFile(LOG_FILE);
    const rs = every(100).bytes();
    rs.initLogs(LOG_FILE, "append");
    assertEquals(rs.currentFileSize, 11);
    Deno.removeSync(LOG_FILE);
  },
});

test({
  name:
    "FileSizeRotationStrategy: init append will set current file size to 0 for new log file",
  fn() {
    const rs = every(100).bytes();
    rs.initLogs(LOG_FILE, "append");
    assertEquals(rs.currentFileSize, 0);
  },
});

test({
  name:
    "FileSizeRotationStrategy: mustNotExist strategy will not throw for out of scope log file",
  async fn() {
    await createFile(LOG_FILE + ".8");
    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).files());
    rs.initLogs(LOG_FILE, "mustNotExist");
    Deno.removeSync(LOG_FILE + ".8");
  },
});

test({
  name:
    "FileSizeRotationStrategy: mustNotExist strategy will throw for in scope log file",
  async fn() {
    await createFile(LOG_FILE + ".7");
    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).files());
    assertThrows(
      () => {
        rs.initLogs(LOG_FILE, "mustNotExist");
      },
      IllegalStateError,
      "Found existing log file which must not exist",
    );
    Deno.removeSync(LOG_FILE + ".7");
  },
});

test({
  name:
    "FileSizeRotationStrategy: overwrite strategy will not delete for out of scope log file",
  async fn() {
    await createFile(LOG_FILE + ".8");
    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).files());
    rs.initLogs(LOG_FILE, "overwrite");
    assert(exists(LOG_FILE + ".8"));
    Deno.removeSync(LOG_FILE + ".8");
  },
});

test({
  name:
    "FileSizeRotationStrategy: overwrite strategy will delete for in scope log file",
  async fn() {
    await createFile(LOG_FILE + ".1");
    await createFile(LOG_FILE + ".7");
    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).files());
    rs.initLogs(LOG_FILE, "overwrite");
    assert(!exists(LOG_FILE + ".1"));
    assert(!exists(LOG_FILE + ".7"));
  },
});

test({
  name:
    "FileSizeRotationStrategy: No log files with date/time based retention policy causes no issues",
  fn() {
    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).days());
    rs.initLogs(LOG_FILE, "overwrite");
  },
});

test({
  name:
    "FileSizeRotationStrategy: Log file (with date/time retention policy) mod time older than in-scope is not deleted",
  ignore: Deno.build.os === "windows",
  async fn() {
    const d = new Date();
    d.setDate(d.getDate() - 8);
    await createFile(LOG_FILE + ".1", d);

    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).days());
    rs.initLogs(LOG_FILE, "overwrite");

    assert(exists(LOG_FILE + ".1"));
    Deno.removeSync(LOG_FILE + ".1");
  },
});

test({
  name:
    "FileSizeRotationStrategy: Log file with days date/time retention policy",
  ignore: Deno.build.os === "windows",
  async fn() {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    await createFile(LOG_FILE + ".1", d);

    const d2 = new Date();
    d2.setDate(d2.getDate() - 8);
    await createFile(LOG_FILE + ".2", d2);

    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).days());
    rs.initLogs(LOG_FILE, "overwrite");

    assert(!exists(LOG_FILE + ".1"));
    assert(exists(LOG_FILE + ".2"));
    Deno.removeSync(LOG_FILE + ".2");
  },
});

test({
  name:
    "FileSizeRotationStrategy: Log file with hours date/time retention policy",
  ignore: Deno.build.os === "windows",
  async fn() {
    const d = new Date();
    d.setHours(d.getHours() - 6);
    await createFile(LOG_FILE + ".1", d);

    const d2 = new Date();
    d2.setHours(d2.getHours() - 24);
    await createFile(LOG_FILE + ".2", d2);

    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).hours());
    rs.initLogs(LOG_FILE, "overwrite");

    assert(!exists(LOG_FILE + ".1"));
    assert(exists(LOG_FILE + ".2"));
    Deno.removeSync(LOG_FILE + ".2");
  },
});

test({
  name:
    "FileSizeRotationStrategy: Log file with minutes date/time retention policy",
  ignore: Deno.build.os === "windows",
  async fn() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 6);
    await createFile(LOG_FILE + ".1", d);

    const d2 = new Date();
    d2.setMinutes(d2.getMinutes() - 24);
    await createFile(LOG_FILE + ".2", d2);

    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).minutes());
    rs.initLogs(LOG_FILE, "overwrite");

    assert(!exists(LOG_FILE + ".1"));
    assert(exists(LOG_FILE + ".2"));
    Deno.removeSync(LOG_FILE + ".2");
  },
});

test({
  name:
    "FileSizeRotationStrategy: Log file with date/time retention policy throw with must not exist",
  ignore: Deno.build.os === "windows",
  async fn() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 6);
    await createFile(LOG_FILE + ".1", d);

    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).minutes());
    assertThrows(
      () => {
        rs.initLogs(LOG_FILE, "mustNotExist");
      },
      IllegalStateError,
      "Found log file within defined maximum log retention constraints",
    );

    Deno.removeSync(LOG_FILE + ".1");
  },
});

test({
  name: "FileSizeRotationStrategy: shouldRotate",
  fn() {
    const lrp = every(11).bytes();
    assert(!lrp.shouldRotate(encoder.encode("Hello ")));
    assertEquals(lrp.currentFileSize, 6);
    assert(!lrp.shouldRotate(encoder.encode("World")));
    assertEquals(lrp.currentFileSize, 11);
    assert(lrp.shouldRotate(encoder.encode("!")));
    // current file size remains untouched, updated instead in rotate()
    assertEquals(lrp.currentFileSize, 11);
  },
});

test({
  name:
    "FileSizeRotationStrategy: file based rotation will rotate original log file",
  async fn() {
    await createFile(LOG_FILE);
    const rs = every(15).bytes().withLogFileRetentionPolicy(of(7).files());
    rs.rotate(LOG_FILE, encoder.encode("hello"));
    assert(!exists(LOG_FILE)); // recreated in Stream, not here
    assert(exists(LOG_FILE + ".1"));
    assertEquals(rs.currentFileSize, 5);
    Deno.removeSync(LOG_FILE + ".1");
  },
});

test({
  name:
    "FileSizeRotationStrategy: file based rotation will rotate original log file",
  async fn() {
    await createFile(LOG_FILE);
    const rs = every(15).bytes().withLogFileRetentionPolicy(of(7).files());
    rs.rotate(LOG_FILE, encoder.encode("hello"));
    assert(!exists(LOG_FILE)); // recreated in Stream, not here
    assert(exists(LOG_FILE + ".1"));
    assertEquals(rs.currentFileSize, 5);
    Deno.removeSync(LOG_FILE + ".1");
  },
});

test({
  name:
    "FileSizeRotationStrategy: file based rotation will rotate all in scope log files",
  async fn() {
    Deno.writeFileSync(LOG_FILE, encoder.encode("orig"));
    Deno.writeFileSync(LOG_FILE + ".1", encoder.encode("1"));
    Deno.writeFileSync(LOG_FILE + ".2", encoder.encode("2"));
    Deno.writeFileSync(LOG_FILE + ".3", encoder.encode("3"));

    const rs = every(15).bytes().withLogFileRetentionPolicy(of(3).files());
    rs.rotate(LOG_FILE, encoder.encode("hello"));

    assertEquals(rs.currentFileSize, 5);
    assert(!exists(LOG_FILE)); // recreated in Stream, not here
    assert(exists(LOG_FILE + ".1"));
    assertEquals(readFile(LOG_FILE + ".1"), "orig");
    assert(exists(LOG_FILE + ".2"));
    assertEquals(readFile(LOG_FILE + ".2"), "1");
    assert(exists(LOG_FILE + ".3"));
    assertEquals(readFile(LOG_FILE + ".3"), "2");
    assert(!exists(LOG_FILE + ".4"));

    Deno.removeSync(LOG_FILE + ".1");
    Deno.removeSync(LOG_FILE + ".2");
    Deno.removeSync(LOG_FILE + ".3");
  },
});

test({
  name:
    "FileSizeRotationStrategy: dateTime based rotation will rotate all in scope log files",
  ignore: Deno.build.os === "windows",
  async fn() {
    Deno.writeFileSync(LOG_FILE, encoder.encode("orig"));
    Deno.writeFileSync(LOG_FILE + ".1", encoder.encode("1"));
    Deno.writeFileSync(LOG_FILE + ".2", encoder.encode("2"));
    Deno.writeFileSync(LOG_FILE + ".3", encoder.encode("3"));
    Deno.writeFileSync(LOG_FILE + ".5", encoder.encode("5"));
    await setMTime(LOG_FILE + ".1", daysAgo(1));
    await setMTime(LOG_FILE + ".2", daysAgo(2));
    await setMTime(LOG_FILE + ".3", daysAgo(3));
    await setMTime(LOG_FILE + ".5", daysAgo(5));

    const rs = every(15).bytes().withLogFileRetentionPolicy(of(3).days());
    rs.rotate(LOG_FILE, encoder.encode("hello"));

    assertEquals(rs.currentFileSize, 5);
    assert(!exists(LOG_FILE)); // recreated in Stream, not here
    assert(exists(LOG_FILE + ".1"));
    assertEquals(readFile(LOG_FILE + ".1"), "orig");
    assert(exists(LOG_FILE + ".2"));
    assertEquals(readFile(LOG_FILE + ".2"), "1");
    assert(exists(LOG_FILE + ".3"));
    assertEquals(readFile(LOG_FILE + ".3"), "2");
    assert(exists(LOG_FILE + ".4"));
    assertEquals(readFile(LOG_FILE + ".4"), "3");
    assert(!exists(LOG_FILE + ".5")); // deleted as too old...
    assert(!exists(LOG_FILE + ".6")); // ... and check it wasn't rotated either

    Deno.removeSync(LOG_FILE + ".1");
    Deno.removeSync(LOG_FILE + ".2");
    Deno.removeSync(LOG_FILE + ".3");
    Deno.removeSync(LOG_FILE + ".4");
  },
});
