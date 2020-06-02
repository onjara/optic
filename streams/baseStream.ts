import { Level } from "../levels.ts";
import { LogRecord, Stream, Formatter } from "../types.ts";

export abstract class BaseStream implements Stream {
  minLevel = Level.DEBUG;
  formatter: Formatter<string>;

  constructor(defaultFormatters: Formatter<string>) {
    this.formatter = defaultFormatters;
  }

  abstract log(msg: string): void;

  handle(logRecord: LogRecord): void {
    if (this.minLevel > logRecord.level) return;

    const msg = this.format(logRecord);
    return this.log(msg);
  }

  level(level: Level): this {
    this.minLevel = level;
    return this;
  }

  withFormat(newFormatter: Formatter<string>): this {
    this.formatter = newFormatter;
    return this;
  }

  format(logRecord: LogRecord): string {
    return this.formatter.format(logRecord);
  }
}
