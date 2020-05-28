import { Level } from "../levels.ts";
import { LogRecord, Stream } from "../types.ts";

export type FormatterFunction<T> = (logRecord: LogRecord) => T;

export abstract class BaseStream<T> implements Stream {
  minLevel = Level.DEBUG;
  #formatter: FormatterFunction<T>;

  constructor() {
    this.#formatter = this.getDefaultFormatFunction();
  }

  abstract async setup(): Promise<void>;
  abstract async destroy(): Promise<void>;
  abstract getDefaultFormatFunction(): FormatterFunction<T>;
  abstract log(msg: T): void;

  handle(logRecord: LogRecord): void {
    if (this.minLevel > logRecord.level) return;

    const msg = this.format(logRecord);
    return this.log(msg);
  }

  format(logRecord: LogRecord): T {
    return this.#formatter(logRecord);
  }
}
