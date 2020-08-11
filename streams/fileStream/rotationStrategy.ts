import {
  LogFileInitStrategy,
  Periods,
  LogFileRetentionPolicy,
  RotationStrategy,
} from "./types.ts";
import { of } from "./retentionPolicy.ts";
import {
  win32Dirname,
  posixDirname,
  win32Basename,
  posixBasename,
} from "./deps.ts";
import { ValidationError, IllegalStateError } from "../../types.ts";

/**
 * Used for building a RotationStrategy
 * @param quantity number of files or day/hour/minute units before log rotation
 */
export function every(quantity: number): OngoingRotationStrategy {
  return new OngoingRotationStrategy(quantity);
}

/**
 * A rotation strategy based on file size.  When the current log file grows 
 * beyond `maxBytes`, this will trigger a rotation before the log message
 * is written guaranteeing that no log file is larger than `maxBytes`
 */
class FileSizeRotationStrategy implements RotationStrategy {
  #maxBytes: number;
  #logFileRetentionPolicy: LogFileRetentionPolicy = of(7).files();
  #currentFileSize = 0;

  constructor(maxBytes: number) {
    if (maxBytes < 1) {
      throw new ValidationError("Max bytes cannot be less than 1");
    }
    this.#maxBytes = maxBytes;
  }

  get maxBytes(): number {
    return this.#maxBytes;
  }

  get currentFileSize(): number {
    return this.#currentFileSize;
  }

  initLogs(filename: string, initStrategy: LogFileInitStrategy): void {
    if (initStrategy === "append") {
      // reuse existing log file, if it exists
      const fi = fileInfo(filename);
      this.#currentFileSize = fi ? fi.size : 0;
    } else {
      /* overwrite or mustNotExist initStrategy */
      if (this.#logFileRetentionPolicy.type === "files") {
        for (let i = 1; i <= this.#logFileRetentionPolicy.quantity; i++) {
          // e.g. check (mustNotExist) or remove (overwrite) log.txt.1, log.txt.2
          // ... up to log.txt.#maxArchivesStrategy.quantity.  Files above this
          // are ignored for now.
          if (exists(filename + "." + i)) {
            if (initStrategy === "mustNotExist") {
              throw new IllegalStateError(
                "Found existing log file which must not exist: " + filename +
                  "." + i,
              );
            } else {
              Deno.removeSync(filename + "." + i);
            }
          }
        }
      } else {
        /* dateTime retention policy */
        // get list of all files in directory
        const logFiles = getLogFilesInDir(
          filename,
          matchesFilePattern,
        );
        // Now remove log.txt.1, log.txt.2 ... up to max age (in days or hours)
        for (let logFile of logFiles) {
          const maxTimeAgo = this.#logFileRetentionPolicy.oldestRetentionDate();
          const lastModified = fileInfo(logFile)?.mtime;
          if (lastModified && lastModified.getTime() >= maxTimeAgo.getTime()) {
            if (initStrategy === "mustNotExist") {
              throw new IllegalStateError(
                "Found log file within defined maximum log retention constraints which must not exist: " +
                  logFile,
              );
            } else {
              Deno.removeSync(logFile);
            }
          }
        }
      }
    }
  }

  shouldRotate(encodedMessage: unknown): boolean {
    const msg: Uint8Array = encodedMessage as Uint8Array;
    const msgByteLength = msg.byteLength;
    if ((this.#currentFileSize + msgByteLength) > this.#maxBytes) {
      return true;
    }
    this.#currentFileSize += msgByteLength;
    return false;
  }

  rotate(filename: string, logMessage: unknown): void {
    let maxFiles = this.#logFileRetentionPolicy.quantity;

    if (this.#logFileRetentionPolicy.type !== "files") {
      const logFiles = getLogFilesInDir(
        filename,
        matchesFilePattern,
      );

      /* Given the log files, find the maximum extension that is within the
       * oldest retention date.  Add 1 to this value to ensure it is rotated
       * along with all other log files with a lower extension */
      maxFiles = 0;
      for (let logFile of logFiles) {
        const matched = logFile.match(/.*\.([\d]+)/);
        if (matched?.[1]) {
          const statInfo = Deno.statSync(logFile)?.mtime?.getTime();
          if (
            statInfo &&
            statInfo >
              this.#logFileRetentionPolicy.oldestRetentionDate().getTime()
          ) {
            // Add 1 to this extension value to ensure it is kept during rotation
            maxFiles = +matched[1] >= maxFiles ? +matched[1] + 1 : maxFiles;
          } else {
            // This log file is outside the oldest retention date, delete it
            Deno.removeSync(logFile);
          }
        }
      }
    }

    // Rename all e.g. logFile.log, logFile.log.1, logFile.log.2, ..., .maxFiles log files
    for (let i = maxFiles - 1; i >= 0; i--) {
      const source = filename + (i === 0 ? "" : "." + i);
      const dest = filename + "." + (i + 1);

      if (exists(source)) {
        Deno.renameSync(source, dest);
      }
    }

    this.#currentFileSize = (logMessage as Uint8Array).byteLength;
  }

  /**
   * Set a policy for how long to keep rotated log files.  E.g.
   * ```typescript
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

/**
 * A rotation strategy based on date/time. For each log record write to the log
 * file, if the timestamp of the record falls outside the defined rotation
 * interval period, then the log files are rotated.
 */
class DateTimeRotationStrategy implements RotationStrategy {
  #interval: number;
  #period: Periods;
  #useUTCTime = false;
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

  initLogs(filename: string, initStrategy: LogFileInitStrategy): void {
    if (initStrategy === "append") {
      this.handleLogFileRetention(filename);

      // check if base log file still exists and needs rotating
      const fi = fileInfo(filename);
      if (fi && fi.birthtime) {
        const birthTime = new Date(fi.birthtime.getTime());
        this.clearTimeInIntervalPeriod(birthTime);
        if (birthTime.getTime() != this.#startOfIntervalPeriod.getTime()) {
          this.rotateLogFile(filename, birthTime);
        }
      }
    } else if (initStrategy === "overwrite") {
      // Clean slate, remove any existing log files
      for (const file in this.getLogFiles(filename)) {
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
    const retentionDate = this.#logFileRetentionPolicy.oldestRetentionDate();
    if (this.#logFileRetentionPolicy.type === "files") {
      if (logFiles.length - 1 > this.#logFileRetentionPolicy.quantity) {
        //delete by age older than retentionPolicy.quantity'th indexed file
        const mtimeMap: Map<Date, string> = new Map<Date, string>();
        for (const file in logFiles) {
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
          i < logFiles.length - 1;
          i++
        ) {
          Deno.removeSync(mtimeMap.get(sortedKeys[i])!);
        }
      }
    } /* dateTime retention policy */ else {
      //delete by age older than quantity.period
      for (const file in logFiles) {
        const fileStat = Deno.statSync(file);
        if (fileStat && fileStat.mtime && fileStat.mtime < retentionDate) {
          Deno.removeSync(file);
        }
      }
    }
  }

  shouldRotate(formattedMessage: unknown): boolean {
    return new Date() > this.#endOfIntervalPeriod;
  }

  /**
   * Rotate file by adding the date/time stamp to the end, delete any rotated
   * files which fall outside the retention period, reset the start and end
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
    if (this.#filenameFormatter) {
      Deno.renameSync(filename, this.#filenameFormatter(filename, refDate));
    } else {
      Deno.renameSync(
        filename,
        filename + this.dateSuffix(this.#period == "days", refDate),
      );
    }
  }

  // e.g. '.23.10.2020_22.16'
  private dateSuffix(dateOnly: boolean, refDate: Date): string {
    const utc = this.#useUTCTime;
    let dateStr = ".";
    dateStr += utc ? refDate.getUTCDate() : refDate.getDate();
    dateStr += ".";
    dateStr += utc ? refDate.getUTCMonth() : refDate.getMonth();
    dateStr += ".";
    dateStr += utc ? refDate.getUTCFullYear() : refDate.getFullYear();
    if (!dateOnly) {
      dateStr += "_";
      dateStr += utc ? refDate.getUTCHours() : refDate.getHours();
      dateStr += ".";
      dateStr += utc ? refDate.getUTCMinutes() : refDate.getMinutes();
    }
    return dateStr;
  }

  /** Use UTC rather than local time for rotated file names. Default is to use
   * local time.
   */
  withUTCTime(): this {
    this.#useUTCTime = true;
    return this;
  }

  /** Use local rather than UTC time for rotated file names. Default is to use
   * local time.
   */
  withLocalTime(): this {
    this.#useUTCTime = false;
    return this;
  }

  /**
   * Supply an optional formatter function to format the filename on rotation.
   * This formatter function takes in a filename (the active log file name) and
   * a reference date representing the start of the interval period. It should
   * return the full name of the rotated file.
   *
   * The default formatting (without setting a formatter) is as follows:
   * Period of days:  my_log_file.txt.18.03.2020
   * Period of min/hours: my_log_file.txt.18.03.2020_15:00
   */
  withFilenameFormatter(
    formatter: (filename: string, refDate: Date) => string,
  ): this {
    this.#filenameFormatter = formatter;
    return this;
  }

  /**
   * Set a policy for how long to keep rotated log files.  E.g.
   * ```typescript
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

class OngoingRotationStrategy {
  constructor(private quantity: number) {}
  bytes(): FileSizeRotationStrategy {
    return new FileSizeRotationStrategy(this.quantity);
  }
  minutes(): DateTimeRotationStrategy {
    return new DateTimeRotationStrategy(this.quantity, "minutes");
  }
  hours(): DateTimeRotationStrategy {
    return new DateTimeRotationStrategy(this.quantity, "hours");
  }
  days(): DateTimeRotationStrategy {
    return new DateTimeRotationStrategy(this.quantity, "days");
  }
}

function exists(file: string): boolean {
  return fileInfo(file) !== undefined;
}

function fileInfo(filePath: string): Deno.FileInfo | undefined {
  try {
    return Deno.statSync(filePath);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return undefined;
    }
    throw err;
  }
}

/**
 * Given a file name, search in the directory for files beginning with the same
 * file name and ending in the pattern supplied, returning the list of matched
 * files
 */
function getLogFilesInDir(
  filename: string,
  pattern: (dirEntryName: string, regExSafeFilename: string) => boolean,
): string[] {
  const matches: string[] = [];

  const dir: string = Deno.build.os === "windows"
    ? win32Dirname(filename)
    : posixDirname(filename);
  const file: string = Deno.build.os === "windows"
    ? win32Basename(filename)
    : posixBasename(filename);
  const escapedFilename = escapeForRegExp(file);

  for (const dirEntry of Deno.readDirSync(dir)) {
    if (!dirEntry.isDirectory && pattern(dirEntry.name, escapedFilename)) {
      matches.push(join(dir, dirEntry.name));
    }
  }

  return matches;
}

function matchesFilePattern(
  dirEntryName: string,
  regExSafeFilename: string,
): boolean {
  return dirEntryName.match(new RegExp(regExSafeFilename + "\.\\d+$")) != null;
}

function matchesDatePattern(
  dirEntryName: string,
  regExSafeFilename: string,
): boolean {
  return dirEntryName.match(
    new RegExp(regExSafeFilename + "_\\d{4}\.\\d{2}\.\\d{2}$"),
  ) != null;
}

function matchesDateTimePattern(
  dirEntryName: string,
  regExSafeFilename: string,
): boolean {
  return dirEntryName.match(
    new RegExp(regExSafeFilename + "_\\d{4}\.\\d{2}\.\\d{2}_\\d{2}\.\\d{2}$"),
  ) != null;
}

function escapeForRegExp(filename: string): string {
  return filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function join(dir: string, file: string) {
  if (Deno.build.os == "windows") {
    return dir + "\\" + file;
  }
  return dir + "/" + file;
}
