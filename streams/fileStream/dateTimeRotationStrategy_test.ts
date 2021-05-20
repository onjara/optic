// Copyright 2021 the optic authors. All rights reserved. MIT license.
import { assert, assertThrows, test } from "../../test_deps.ts";
import { DateTimeRotationStrategy } from "./dateTimeRotationStrategy.ts";
import { IllegalStateError, ValidationError } from "../../types.ts";
import { every, of } from "./mod.ts";
import { twoDig } from "./_rotationStrategyCommon.ts";

const isWindows = Deno.build.os === "windows";
const LOG_FILE = isWindows ? "test_log.file" : "./test_log.file";
const encoder = new TextEncoder();

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

function getDateRotatedFilename(file: string, d: Date): string {
  return file + "_" + d.getFullYear() + "." + twoDig(d.getMonth() + 1) + "." +
    twoDig(d.getDate());
}

function getDateTimeRotatedFilename(file: string, d: Date): string {
  return getDateRotatedFilename(file, d) + "_" + twoDig(d.getHours()) + "." +
    twoDig(d.getMinutes());
}

test({
  name: "Interval cannot be less than 1",
  fn() {
    assertThrows(
      () => {
        new DateTimeRotationStrategy(0, "days");
      },
      ValidationError,
      "DateTime rotation interval cannot be less than 1",
    );
  },
});

test({
  name: "Overwrite init strategy will delete existing log files",
  async fn() {
    await createFile(LOG_FILE + "_2020.02.25");
    const rs = every(1).days().withLogFileRetentionPolicy(of(7).files());
    rs.initLogs(LOG_FILE, "overwrite");
    assert(!exists(LOG_FILE + "_2020.02.25"));
  },
});

test({
  name: "MustNotExist init strategy will throw if any log files exist",
  async fn() {
    await createFile(LOG_FILE + "_2020.02.25");
    const rs = every(1).days().withLogFileRetentionPolicy(of(7).files());
    assertThrows(
      () => {
        rs.initLogs(LOG_FILE, "mustNotExist");
      },
      IllegalStateError,
      "Found log file(s) which must not exist: " + (isWindows ? ".\\" : "") +
        LOG_FILE + "_2020.02.25",
    );
    Deno.removeSync(LOG_FILE + "_2020.02.25");
  },
});

test({
  name: "MustNotExist init strategy is happy with no logs",
  fn() {
    const rs = every(1).days().withLogFileRetentionPolicy(of(7).files());
    rs.initLogs(LOG_FILE, "mustNotExist");
  },
});

test({
  name: "Append strategy init logs can handle non-existent log file",
  fn() {
    const rs = every(1).days().withLogFileRetentionPolicy(of(7).files());
    rs.initLogs(LOG_FILE, "append");
  },
});

test({
  name:
    "Append strategy init logs with same interval as last run will not rotate",
  async fn() {
    await createFile(LOG_FILE);
    const rs = every(1).days().withLogFileRetentionPolicy(of(7).files());
    rs.initLogs(LOG_FILE, "append");
    assert(exists(LOG_FILE));
    Deno.removeSync(LOG_FILE);
  },
});

test({
  name:
    "Append strategy, init logs, old interval within retention, default formatter, rotates base log file",
  async fn() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    class TestableDateTimeRotationStrategy extends DateTimeRotationStrategy {
      protected getBirthTime(_fi: Deno.FileInfo | undefined): Date | null {
        return twoDaysAgo;
      }
    }

    await createFile(LOG_FILE);
    const rs = new TestableDateTimeRotationStrategy(1, "days");
    rs.initLogs(LOG_FILE, "append");
    assert(!exists(LOG_FILE));
    const rotatedFile = getDateRotatedFilename(LOG_FILE, twoDaysAgo);
    assert(exists(rotatedFile));
    Deno.removeSync(rotatedFile);
  },
});

test({
  name:
    "Append strategy, init logs, old interval within retention, custom formatter, rotates base log file",
  async fn() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    class TestableDateTimeRotationStrategy extends DateTimeRotationStrategy {
      protected getBirthTime(_fi: Deno.FileInfo | undefined): Date | null {
        return twoDaysAgo;
      }
    }

    await createFile(LOG_FILE);
    const rs = new TestableDateTimeRotationStrategy(1, "days");
    rs.withFilenameFormatter((_f: string, _d: Date) => "my_rotated_file.log");
    rs.initLogs(LOG_FILE, "append");
    assert(!exists(LOG_FILE));
    assert(exists("my_rotated_file.log"));
    Deno.removeSync("my_rotated_file.log");
  },
});

test({
  name:
    "Append strategy, init logs, old interval outwith retention deletes log files",
  ignore: Deno.build.os === "windows",
  async fn() {
    const oldFileDate = new Date();
    oldFileDate.setDate(oldFileDate.getDate() - 15);
    await createFile(LOG_FILE, oldFileDate);
    oldFileDate.setDate(oldFileDate.getDate() - 1);
    await createFile(LOG_FILE + "_2020.01.15", oldFileDate);
    const rs = new DateTimeRotationStrategy(1, "days")
      .withLogFileRetentionPolicy(of(14).days());
    assert(exists(LOG_FILE));
    assert(exists(LOG_FILE + "_2020.01.15"));
    rs.initLogs(LOG_FILE, "append");
    assert(!exists(LOG_FILE));
    assert(!exists(LOG_FILE + "_2020.01.15"));
  },
});

test({
  name: "should rotate when date is beyond end of interval period",
  fn() {
    class TestableDateTimeRotationStrategy extends DateTimeRotationStrategy {
      mockEndOfIntervalPeriod = new Date();

      protected _getEndOfIntervalPeriod(): Date {
        return this.mockEndOfIntervalPeriod;
      }
    }

    const rs = new TestableDateTimeRotationStrategy(1, "days");
    //End of interval period will be 1 day from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    rs.mockEndOfIntervalPeriod = futureDate;
    assert(!rs.shouldRotate());

    const pastDate = new Date();
    //End of interval period set to yesterday
    pastDate.setDate(pastDate.getDate() - 1);
    rs.mockEndOfIntervalPeriod = pastDate;
    assert(rs.shouldRotate());
  },
});

test({
  name: "rotate days strategy, date/time retention but no old files",
  async fn() {
    await createFile(LOG_FILE);
    const rs = new DateTimeRotationStrategy(1, "days")
      .withLogFileRetentionPolicy(of(7).days());
    const d = new Date();
    rs.rotate(LOG_FILE);
    assert(!exists(LOG_FILE));
    const rotatedLogFile = getDateRotatedFilename(LOG_FILE, d);
    assert(exists(rotatedLogFile));
    Deno.removeSync(rotatedLogFile);
  },
});

test({
  name:
    "rotate days strategy, date/time retention with retained and non retained logs",
  async fn() {
    const fileDate = new Date();
    await createFile(LOG_FILE);

    fileDate.setDate(fileDate.getDate() - 1);
    const oneDayOld = getDateRotatedFilename(LOG_FILE, fileDate);
    await createFile(oneDayOld, fileDate);

    fileDate.setDate(fileDate.getDate() - 1);
    const twoDaysOld = getDateRotatedFilename(LOG_FILE, fileDate);
    await createFile(twoDaysOld, fileDate);

    fileDate.setDate(fileDate.getDate() - 1);
    fileDate.setMinutes(fileDate.getMinutes() - 1);
    const threeDaysOneMinuteOld = getDateRotatedFilename(LOG_FILE, fileDate);
    await createFile(threeDaysOneMinuteOld, fileDate);

    const rs = new DateTimeRotationStrategy(1, "days")
      .withLogFileRetentionPolicy(of(3).days());
    const d = new Date();

    rs.rotate(LOG_FILE);

    assert(!exists(LOG_FILE));
    const rotatedLogFile = getDateRotatedFilename(LOG_FILE, d);
    assert(exists(rotatedLogFile));
    assert(exists(oneDayOld));
    assert(exists(twoDaysOld));
    assert(!exists(threeDaysOneMinuteOld)); // This should be 1 min outside the retention period
    Deno.removeSync(rotatedLogFile);
    Deno.removeSync(oneDayOld);
    Deno.removeSync(twoDaysOld);
  },
});

test({
  name: "rotate hours strategy, files strategy, some retained, some not",
  async fn() {
    const fileDate = new Date();
    await createFile(LOG_FILE);

    fileDate.setDate(fileDate.getDate() - 1);
    const oneDayOld = getDateTimeRotatedFilename(LOG_FILE, fileDate);
    await createFile(oneDayOld, fileDate);

    fileDate.setDate(fileDate.getDate() - 1);
    const twoDaysOld = getDateTimeRotatedFilename(LOG_FILE, fileDate);
    await createFile(twoDaysOld, fileDate);

    fileDate.setDate(fileDate.getDate() - 1);
    const threeDaysOld = getDateTimeRotatedFilename(LOG_FILE, fileDate);
    await createFile(threeDaysOld, fileDate);

    const rs = new DateTimeRotationStrategy(1, "hours")
      .withLogFileRetentionPolicy(of(3).files());
    const d = new Date();

    rs.rotate(LOG_FILE);

    assert(!exists(LOG_FILE));
    const zeroMinutesD = new Date(d.getTime());
    zeroMinutesD.setMinutes(0, 0, 0);
    const rotatedLogFile = getDateTimeRotatedFilename(LOG_FILE, zeroMinutesD);
    assert(exists(rotatedLogFile));
    assert(exists(oneDayOld));
    assert(exists(twoDaysOld));
    assert(!exists(threeDaysOld)); // This is the '4th' log file, so is deleted
    Deno.removeSync(rotatedLogFile);
    Deno.removeSync(oneDayOld);
    Deno.removeSync(twoDaysOld);
  },
});
