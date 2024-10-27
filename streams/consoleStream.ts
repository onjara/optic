// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import { BaseStream } from "./baseStream.ts";
import { TokenReplacer } from "../formatters/tokenReplacer.ts";
import type { LogRecord } from "../types.ts";
import { Level } from "../logger/levels.ts";

/** A stream to send log messages to the console.  By default it uses the
 * TokenReplacer log formatter with color.
 */
export class ConsoleStream extends BaseStream {
  #started = new Date();

  constructor() {
    super(new TokenReplacer().withColor());
  }

  /**
   * Unused but available to call console.log directly.
   * @param msg log message string
   */
  override log(msg: string): void {
    console.log(msg);
  }

  /**
   * Logs the output to the appropriate console handler.
   *
   * Specifically for a Deno process, this ultimately means:
   * - Warnings, errors and criticals are logged to stderr stream
   * - Everything else is written to the stdout stream
   *
   * @param logRecord
   * @returns true
   */
  override handle(logRecord: LogRecord): boolean {
    if (this.minLevel > logRecord.level) return false;
    const msg = this.format(logRecord);

    if (logRecord.level >= Level.Error) {
      console.error(msg);
    } else if (logRecord.level >= Level.Warn) {
      console.warn(msg);
    } else if (logRecord.level >= Level.Info) {
      console.info(msg);
    } else if (logRecord.level >= Level.Debug) {
      console.debug(msg);
    } else {
      console.log(msg);
    }

    return true;
  }
}
