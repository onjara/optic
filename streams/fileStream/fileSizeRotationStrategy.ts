// Copyright 2022 the optic authors. All rights reserved. MIT license.
import type {
  LogFileInitStrategy,
  LogFileRetentionPolicy,
  RotationStrategy,
} from "./types.ts";
import { of } from "./retentionPolicy.ts";
import { IllegalStateError, ValidationError } from "../../types.ts";
import {
  exists,
  fileInfo,
  getLogFilesInDir,
  matchesFilePattern,
} from "./_rotationStrategyCommon.ts";

/**
 * A rotation strategy based on file size.  When the current log file grows
 * beyond `maxBytes`, this will trigger a rotation before the log message
 * is written guaranteeing that no log file is larger than `maxBytes`
 */
export class FileSizeRotationStrategy implements RotationStrategy {
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
    this.handleLogFileRetentionInit(filename);

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
        logFiles.push(filename);

        // Now remove log.txt.1, log.txt.2 ... up to max age (in days or hours)
        for (const logFile of logFiles) {
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

  /**
   * On initialization, remove any log files which fall outside the specified
   * retention policy.
   * @param filename
   */
  private handleLogFileRetentionInit(filename: string): void {
    const logFiles = getLogFilesInDir(
      filename,
      matchesFilePattern,
    );

    for (const logFile of logFiles) {
      const matched = logFile.match(/.*\.([\d]+)/);
      if (matched?.[1]) {
        if (this.#logFileRetentionPolicy.type === "files") {
          if (+matched[1] > this.#logFileRetentionPolicy.quantity) {
            Deno.removeSync(logFile);
          }
        } /* date/time based retention */ else {
          const statInfo = Deno.statSync(logFile)?.mtime?.getTime();
          if (
            statInfo &&
            statInfo <
              this.#logFileRetentionPolicy.oldestRetentionDate().getTime()
          ) {
            Deno.removeSync(logFile);
          }
        }
      }
    }
    if (this.#logFileRetentionPolicy.type !== "files" && exists(filename)) {
      const statInfo = Deno.statSync(filename)?.mtime?.getTime();
      if (
        statInfo &&
        statInfo <
          this.#logFileRetentionPolicy.oldestRetentionDate().getTime()
      ) {
        Deno.removeSync(filename);
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
      logFiles.push(filename);

      /* Given the log files, find the maximum extension that is within the
       * oldest retention date.  Add 1 to this value to ensure it is rotated
       * along with all other log files with a lower extension */
      maxFiles = 1;
      //console.log('Oldest retention date: ', this.#logFileRetentionPolicy.oldestRetentionDate().getTime());
      for (const logFile of logFiles) {
        const matched = logFile.match(/.*\.([\d]+)/);
        if (matched?.[1]) {
          const statInfo = Deno.statSync(logFile)?.mtime?.getTime();
          //console.log('stat time of ', logFile, ':', statInfo);
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
