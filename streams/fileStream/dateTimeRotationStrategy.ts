// Copyright 2020-2024 the optic authors. All rights reserved. MIT license.
import type {
  LogFileInitStrategy,
  LogFileRetentionPolicy,
  Periods,
  RotationStrategy,
} from "./types.ts";
import { of } from "./retentionPolicy.ts";
import { IllegalStateError, ValidationError } from "../../types.ts";
import {
  fileInfo,
  getLogFilesInDir,
  matchesDatePattern,
  matchesDateTimePattern,
  twoDig,
} from "./_rotationStrategyCommon.ts";

/**
 * A rotation strategy based on date/time. For each log record write to the log
 * file, if the timestamp of the record falls outside the defined rotation
 * interval period, then the log files are rotated.
 */
export class DateTimeRotationStrategy implements RotationStrategy {
  #interval: number;
  #period: Periods;
  #logFileRetentionPolicy: LogFileRetentionPolicy = of(7).days();
  #startOfIntervalPeriod = new Date();
  #endOfIntervalPeriod = new Date();
  #filenameFormatter: ((filename: string, refDate: Date) => string) | null =
    null;

  constructor(interval: number, period: Periods) {
    if (interval < 1) {
      throw new ValidationError(
        "DateTime rotation interval cannot be less than 1",
      );
    }
    this.#interval = interval;
    this.#period = period;
    this.clearTimeInIntervalPeriod(this.#startOfIntervalPeriod);
    this.setEndOfIntervalPeriod();
  }

  /**
   * Initialize the log files based on the following log file init strategy:
   * * "append" - remove any log files outside the retention policy and rotate
   * the primary log file if it requires it based on the creation date and the
   * specified interval period
   * * "overwrite" - remove any and all existing log files
   * * "mustNotExist" - throw error if any log file exists
   */
  initLogs(filename: string, initStrategy: LogFileInitStrategy): void {
    if (initStrategy === "append") {
      this.handleLogFileRetention(filename);

      // check if base log file still exists and needs rotating
      const fi = fileInfo(filename);
      const logBirthTime = this.getBirthTime(fi);
      if (logBirthTime) {
        const birthTime = new Date(logBirthTime.getTime());
        this.clearTimeInIntervalPeriod(birthTime);
        if (birthTime.getTime() != this.#startOfIntervalPeriod.getTime()) {
          this.rotateLogFile(filename, birthTime);
        }
      }
    } else if (initStrategy === "overwrite") {
      // Clean slate, remove any existing log files
      for (const file of this.getLogFiles(filename)) {
        Deno.removeSync(file);
      }
    } /* mustNotExist */ else {
      // Clean slate, ensure no existing log files
      const logFiles = this.getLogFiles(filename);
      if (logFiles.length > 0) {
        throw new IllegalStateError(
          "Found log file(s) which must not exist: " +
            logFiles.toString(),
        );
      }
    }
  }

  protected getBirthTime(
    fi: Deno.FileInfo | undefined,
  ): Date | undefined | null {
    return fi?.birthtime || fi?.mtime;
  }

  /**
   * Get all log files, including both rotated files and primary log file
   */
  private getLogFiles(filename: string): string[] {
    const logFiles: string[] = getLogFilesInDir(
      filename,
      this.#period == "days" ? matchesDatePattern : matchesDateTimePattern,
    );
    const fi = fileInfo(filename);
    if (fi) {
      logFiles.push(filename);
    }
    return logFiles;
  }

  private handleLogFileRetention(filename: string) {
    const logFiles = this.getLogFiles(filename);
    if (this.#logFileRetentionPolicy.type === "files") {
      if (logFiles.length > this.#logFileRetentionPolicy.quantity) {
        //delete by age older than retentionPolicy.quantity'th indexed file
        const mtimeMap: Map<Date, string> = new Map<Date, string>();
        for (const file of logFiles) {
          const fileStat = Deno.statSync(file);
          if (fileStat && fileStat.mtime) {
            mtimeMap.set(fileStat.mtime, file);
          }
        }
        // Sort log file modified time keys in descending order
        const sortedKeys = [...mtimeMap.keys()].sort((a, b) =>
          b.getTime() - a.getTime()
        );

        // Delete those beyond retention quantity index in sorted array
        for (
          let i = this.#logFileRetentionPolicy.quantity;
          i < logFiles.length;
          i++
        ) {
          Deno.removeSync(mtimeMap.get(sortedKeys[i])!);
        }
      }
    } /* dateTime retention policy */ else {
      const retentionDate = this.#logFileRetentionPolicy.oldestRetentionDate();
      //delete by age older than quantity.period
      for (const file of logFiles) {
        const fileStat = Deno.statSync(file);
        if (fileStat && fileStat.mtime && fileStat.mtime < retentionDate) {
          Deno.removeSync(file);
        }
      }
    }
  }

  /** return true if this log event should initiate a log rotation */
  shouldRotate(): boolean {
    return new Date() > this._getEndOfIntervalPeriod();
  }

  protected _getEndOfIntervalPeriod(): Date {
    return this.#endOfIntervalPeriod;
  }

  /**
   * Rotate file by adding the date/time stamp to the end, delete any rotated
   * files which fall outside the retention policy, reset the start and end
   * of interval periods.
   */
  rotate(filename: string): void {
    this.rotateLogFile(filename, this.#startOfIntervalPeriod);

    this.handleLogFileRetention(filename);

    this.#startOfIntervalPeriod = new Date();
    this.#endOfIntervalPeriod = new Date();
    this.clearTimeInIntervalPeriod(this.#startOfIntervalPeriod);
    this.setEndOfIntervalPeriod();
  }

  private clearTimeInIntervalPeriod(refDate: Date): void {
    if (this.#period == "days") {
      refDate.setHours(0, 0, 0, 0);
    } else if (this.#period == "hours") {
      refDate.setMinutes(0, 0, 0);
    } else {
      refDate.setSeconds(0, 0);
    }
  }

  private setEndOfIntervalPeriod(): void {
    if (this.#period == "days") {
      this.#endOfIntervalPeriod.setDate(
        this.#endOfIntervalPeriod.getDate() + this.#interval,
      );
      this.#endOfIntervalPeriod.setHours(0, 0, 0, 0);
    } else if (this.#period == "hours") {
      this.#endOfIntervalPeriod.setHours(
        this.#endOfIntervalPeriod.getHours() + this.#interval,
      );
      this.#endOfIntervalPeriod.setMinutes(0, 0, 0);
    } else {
      this.#endOfIntervalPeriod.setMinutes(
        this.#endOfIntervalPeriod.getMinutes() + this.#interval,
      );
      this.#endOfIntervalPeriod.setSeconds(0, 0);
    }
  }

  /**
   * Given filename and stats, rotate via rename
   */
  private rotateLogFile(filename: string, refDate: Date): void {
    // using the reference date, rotate the log file by renaming it
    Deno.renameSync(filename, this.logFilenameWithTimestamp(filename, refDate));
  }

  private logFilenameWithTimestamp(filename: string, refDate: Date): string {
    if (this.#filenameFormatter) {
      return this.#filenameFormatter(filename, refDate);
    }
    return filename + this.dateSuffix(this.#period == "days", refDate);
  }

  // e.g. '_2020.10.23_22.16'
  private dateSuffix(dateOnly: boolean, refDate: Date): string {
    let dateStr = "_";
    dateStr += refDate.getFullYear();
    dateStr += ".";
    dateStr += twoDig(refDate.getMonth() + 1);
    dateStr += ".";
    dateStr += twoDig(refDate.getDate());
    if (!dateOnly) {
      dateStr += "_";
      dateStr += twoDig(refDate.getHours());
      dateStr += ".";
      dateStr += twoDig(refDate.getMinutes());
    }
    return dateStr;
  }

  /**
   * Supply an optional formatter function to format the filename on rotation.
   * This formatter function takes in a filename (the active log file name) and
   * a reference date representing the start of the interval period. It should
   * return the full name of the rotated file.
   *
   * The default formatting (without setting a formatter) is as follows:
   * Period of days:  my_log_file.txt.18.03.2020
   * Period of min/hours: my_log_file.txt_18.03.2020_15.00
   */
  withFilenameFormatter(
    formatter: (filename: string, refDate: Date) => string,
  ): this {
    this.#filenameFormatter = formatter;
    return this;
  }

  /**
   * Set a policy for how long to keep rotated log files.  E.g.
   * ```ts
   * withLogFileRetentionPolicy(of(7).files())
   * withLogFileRetentionPolicy(of(14).days())
   * withLogFileRetentionPolicy(of(12).hours())
   * withLogFileRetentionPolicy(of(90).minutes())
   * ```
   * Log files found outside the retention policy are deleted.  The default is a
   * retention policy of 7 days.
   */
  withLogFileRetentionPolicy(
    logFileRetentionPolicy: LogFileRetentionPolicy,
  ): this {
    this.#logFileRetentionPolicy = logFileRetentionPolicy;
    return this;
  }
}
