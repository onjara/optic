import { Level, levelToName } from "../logger/levels.ts";
import { LogMeta, LogRecord, Stream, Formatter } from "../types.ts";

/**
 * An abstract base class for streams, using string based logs.
 */
export abstract class BaseStream implements Stream {
  #minLevel = Level.DEBUG;
  #formatter: Formatter<string>;
  #started = new Date();
  outputHeader = true;
  outputFooter = true;

  constructor(defaultFormatters: Formatter<string>) {
    this.#formatter = defaultFormatters;
  }

  abstract log(msg: string): void;

  setup(): void {
    this.#started = new Date();
  }

  destroy(): void {/* NoOp */}

  handle(logRecord: LogRecord): void {
    if (this.#minLevel > logRecord.level) return;

    const msg = this.format(logRecord);
    this.log(msg);
  }

  /** the minimum log level the log record must have to be logged */
  get minLogLevel(): number {
    return this.#minLevel;
  }

  /** Sets the minimum log level which a log record must have to be logged */
  withMinLogLevel(level: Level): this {
    this.#minLevel = level;
    return this;
  }

  /** Sets the formatter to use when formatting a log record */
  withFormat(newFormatter: Formatter<string>): this {
    this.#formatter = newFormatter;
    return this;
  }

  /** Turn on or off header entries in the logs (default is on) */
  withLogHeader(on?: boolean): this {
    this.outputHeader = (on === undefined) || on;
    return this;
  }

  /** Turn on or off footer entries in the logs (default is off) */
  withLogFooter(on?: boolean): this {
    this.outputFooter = (on === undefined) || on;
    return this;
  }

  format(logRecord: LogRecord): string {
    return this.#formatter.format(logRecord);
  }

  logHeader(meta: LogMeta): void {
    if (!this.outputHeader) return;

    const loggingInitAtRecord = {
      msg: "Logging session initialized", /* on host Deno.hostname() */
      metadata: [],
      dateTime: new Date(),
      level: Level.INFO,
      logger: meta.logger,
    };
    const minLogLevelRecord = {
      msg: "Default min log level set at: " + levelToName(meta.minLogLevel) +
        " (from " + meta.minLogLevelFrom + ")",
      metadata: [],
      dateTime: new Date(),
      level: Level.INFO,
      logger: meta.logger,
    };

    this.log(this.format(loggingInitAtRecord));
    this.log(this.format(minLogLevelRecord));
  }

  logFooter(meta: LogMeta): void {
    if (!this.outputFooter) return;

    const loggingCompletedAtRecord = {
      msg: "Logging session complete",
      metadata: [],
      dateTime: new Date(),
      level: Level.INFO,
      logger: meta.logger,
    };
    const loggingDurationRecord = {
      msg: "Log session duration: " +
        (new Date().getTime() - this.#started.getTime()) + "ms",
      metadata: [],
      dateTime: new Date(),
      level: Level.INFO,
      logger: meta.logger,
    };

    this.log(this.format(loggingCompletedAtRecord));
    this.log(this.format(loggingDurationRecord));
  }
}
