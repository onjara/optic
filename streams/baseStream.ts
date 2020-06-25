import { Level } from "../logger/levels.ts";
import { LogRecord, Stream, Formatter } from "../types.ts";

export abstract class BaseStream implements Stream {
  #minLevel = Level.DEBUG;
  #formatter: Formatter<string>;
  outputHeader = true;
  outputFooter = true;

  constructor(defaultFormatters: Formatter<string>) {
    this.#formatter = defaultFormatters;
  }

  abstract log(msg: string): void;

  handle(logRecord: LogRecord): void {
    if (this.#minLevel > logRecord.level) return;

    const msg = this.format(logRecord);
    this.log(msg);
  }

  get minLogLevel(): number {
    return this.#minLevel;
  }

  withMinLogLevel(level: Level): this {
    this.#minLevel = level;
    return this;
  }

  withFormat(newFormatter: Formatter<string>): this {
    this.#formatter = newFormatter;
    return this;
  }

  withLogHeader(on?: boolean): this {
    this.outputHeader = (on === undefined) || on;
    return this;
  }

  withLogFooter(on?: boolean): this {
    this.outputFooter = (on === undefined) || on;
    return this;
  }

  format(logRecord: LogRecord): string {
    return this.#formatter.format(logRecord);
  }
}
