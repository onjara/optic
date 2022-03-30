// Copyright 2022 the optic authors. All rights reserved. MIT license.
import { Level, levelToName } from "../logger/levels.ts";
import type { Formatter, LogMeta, LogRecord, Stream } from "../types.ts";
import { LogMetaImpl } from "../logger/meta.ts";

/**
 * An abstract base class for streams, using string based logs.
 */
export abstract class BaseStream implements Stream {
  #minLevel = Level.Trace;
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

  handle(logRecord: LogRecord): boolean {
    if (this.#minLevel > logRecord.level) return false;
    const msg = this.format(logRecord);
    this.log(msg);
    return true;
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

    const minLogLevel = meta.minLogLevelFrom === "default"
      ? ""
      : "Initial logger min log level: " + levelToName(meta.minLogLevel) +
        " (" + meta.minLogLevelFrom + ")";

    this.log(
      this.format(
        this.logRecord(
          meta,
          "Logging session initialized. " + minLogLevel,
          false,
        ),
      ), /* on host Deno.hostname(), */
    );
  }

  logFooter(meta: LogMeta): void {
    if (!this.outputFooter) return;

    this.log(this.format(this.logRecord(
      meta,
      "Logging session complete.  Duration: " +
        (new Date().getTime() - this.#started.getTime()) + "ms",
      true,
    )));
  }

  private logRecord(meta: LogMeta, msg: string, logMeta: boolean): LogRecord {
    return {
      msg: msg,
      metadata: logMeta ? [(meta as LogMetaImpl).toRecord(this)] : [],
      dateTime: new Date(),
      level: Level.Info,
      logger: meta.logger,
    };
  }

  protected get minLevel() {
    return this.#minLevel;
  }
}
