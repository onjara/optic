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
 * A rotation strategy based on byte size.  When the current log file grows 
 * beyond `maxBytes`, this will trigger a rotation before the log message
 * is written guaranteeing that no log file is larger than `maxBytes`
 */
class ByteRotationStrategy implements RotationStrategy {
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

    // Remove all e.g. logFile.log, logFile.log.1, logFile.log.2, ..., .maxFiles log files
    for (let i = maxFiles - 1; i >= 0; i--) {
      const source = filename + (i === 0 ? "" : "." + i);
      const dest = filename + "." + (i + 1);

      if (exists(source)) {
        Deno.renameSync(source, dest);
      }
    }

    this.#currentFileSize = (logMessage as Uint8Array).byteLength;
  }

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

  constructor(interval: number, period: Periods) {
    if (interval < 1) {
      throw new ValidationError(
        "DateTime rotation interval cannot be less than 1",
      );
    }
    this.#interval = interval;
    this.#period = period;
  }

  initLogs(filename: string, initStrategy: LogFileInitStrategy): void {
    // append - rotate first if outside timeframe
    // overwrite - delete log files within interval period
    // mustNotExist - check for log files within interval period
  }

  shouldRotate(formattedMessage: unknown): boolean {
    return false;
  }

  rotate(filename: string): void {}

  withUTCTime(): this {
    this.#useUTCTime = true;
    return this;
  }

  withLocalTime(): this {
    this.#useUTCTime = false;
    return this;
  }

  withLogFileRetentionPolicy(
    logFileRetentionPolicy: LogFileRetentionPolicy,
  ): this {
    this.#logFileRetentionPolicy = logFileRetentionPolicy;
    return this;
  }
}

class OngoingRotationStrategy {
  constructor(private quantity: number) {}
  bytes(): ByteRotationStrategy {
    return new ByteRotationStrategy(this.quantity);
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
