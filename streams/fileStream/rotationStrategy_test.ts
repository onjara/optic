import {
  test,
  assert,
  assertEquals,
  assertThrows,
} from "../../test_deps.ts";
import { every } from "./rotationStrategy.ts";
import { of } from "./retentionPolicy.ts";

const LOG_FILE = "./test_log.file";

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

test({
  name: "ByteRotationStrategy: bytes cannot be less than 1",
  fn() {
    assertThrows(
      () => {
        every(0).bytes();
      },
      Error,
      "Max bytes cannot be less than 1",
    );
  },
});

test({
  name: "ByteRotationStrategy: You can query max bytes",
  fn() {
    assertEquals(every(100).bytes().maxBytes, 100);
  },
});

test({
  name:
    "ByteRotationStrategy: init append will set current file size to log file size for existing log file",
  fn() {
    Deno.writeFileSync(LOG_FILE, new TextEncoder().encode("hello world"));
    const rs = every(100).bytes();
    rs.initLogs(LOG_FILE, "append");
    assertEquals(rs.currentFileSize, 11);
    Deno.removeSync(LOG_FILE);
  },
});

test({
  name:
    "ByteRotationStrategy: init append will set current file size to 0 for new log file",
  fn() {
    const rs = every(100).bytes();
    rs.initLogs(LOG_FILE, "append");
    assertEquals(rs.currentFileSize, 0);
  },
});

test({
  name:
    "ByteRotationStrategy: mustNotExist strategy will not throw for out of scope log file",
  fn() {
    Deno.writeFileSync(
      LOG_FILE + ".8",
      new TextEncoder().encode("hello world"),
    );
    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).files());
    rs.initLogs(LOG_FILE, "mustNotExist");
    Deno.removeSync(LOG_FILE + ".8");
  },
});

test({
  name:
    "ByteRotationStrategy: mustNotExist strategy will throw for in scope log file",
  fn() {
    Deno.writeFileSync(
      LOG_FILE + ".7",
      new TextEncoder().encode("hello world"),
    );
    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).files());
    assertThrows(
      () => {
        rs.initLogs(LOG_FILE, "mustNotExist");
      },
      Error,
      "Found existing log file which must not exist",
    );
    Deno.removeSync(LOG_FILE + ".7");
  },
});

test({
  name:
    "ByteRotationStrategy: overwrite strategy will not delete for out of scope log file",
  fn() {
    Deno.writeFileSync(
      LOG_FILE + ".8",
      new TextEncoder().encode("hello world"),
    );
    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).files());
    rs.initLogs(LOG_FILE, "overwrite");
    assert(exists(LOG_FILE + ".8"));
    Deno.removeSync(LOG_FILE + ".8");
  },
});

test({
  name:
    "ByteRotationStrategy: overwrite strategy will delete for in scope log file",
  fn() {
    Deno.writeFileSync(
      LOG_FILE + ".1",
      new TextEncoder().encode("hello world"),
    );
    Deno.writeFileSync(
      LOG_FILE + ".7",
      new TextEncoder().encode("hello world"),
    );
    const rs = every(100).bytes().withLogFileRetentionPolicy(of(7).files());
    rs.initLogs(LOG_FILE, "overwrite");
    assert(!exists(LOG_FILE + ".1"));
    assert(!exists(LOG_FILE + ".7"));
  },
});
