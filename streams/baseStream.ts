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

    const minLogLevel = meta.minLogLevelFrom === "default"
      ? ""
      : "Initial logger min log level: " + levelToName(meta.minLogLevel) +
        " (" + meta.minLogLevelFrom + ")";
    const loggingInitAtRecord = this.metaLogRecord(
      meta,
      "Logging session initialized. " +
        minLogLevel, /* on host Deno.hostname() */
    );

    this.log(this.format(loggingInitAtRecord));
  }

  logFooter(meta: LogMeta): void {
    if (!this.outputFooter) return;

    const loggingCompletedAtRecord = this.metaLogRecord(
      meta,
      "Logging session complete.  Duration: " +
        (new Date().getTime() - this.#started.getTime()) + "ms",
    );

    let registered = "";
    registered += meta.filters > 0
      ? "Filters registered: " + meta.filters + " "
      : "";
    registered += meta.transformers > 0
      ? "Transformers registered: " + meta.transformers + " "
      : "";
    registered += meta.monitors > 0
      ? "Monitors registered: " + meta.monitors + " "
      : "";

    let stats = "";
    stats += meta.streamStats.get(this)!.filtered > 0
      ? "Records filtered: " + meta.streamStats.get(this)!.filtered + " "
      : "";
    stats += meta.streamStats.get(this)!.transformed > 0
      ? "Records transformed: " + meta.streamStats.get(this)!.transformed + " "
      : "";

    let levelStats = "";
    const handledMap = meta.streamStats.get(this)!.handled;
    levelStats = Array.from(handledMap.keys()).map((k) =>
      levelToName(k) + ": " + handledMap.get(k)
    ).join(", ");
    if (levelStats != "") {
      levelStats = "Log count => " + levelStats;
    }

    if (registered != "") {
      this.log(this.format(this.metaLogRecord(meta, registered)));
    }
    if (stats != "") {
      this.log(this.format(this.metaLogRecord(meta, stats)));
    }
    if (levelStats != "") {
      this.log(this.format(this.metaLogRecord(meta, levelStats)));
    }

    this.log(this.format(loggingCompletedAtRecord));
  }

  private metaLogRecord(meta: LogMeta, msg: string): LogRecord {
    return {
      msg: msg,
      metadata: [],
      dateTime: new Date(),
      level: Level.INFO,
      logger: meta.logger,
    };
  }
}
