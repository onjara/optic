import { Level } from "./levels.ts";

export interface Stream {
  logHeader?(): void;
  logFooter?(): void;
  setup?(): void;
  destroy?(): void;
  handle(logRecord: LogRecord): void;
}

export interface Formatter<T> {
  format(logRecord: LogRecord): T;
}

export type TriggerFn = (logRecord: LogRecord) => void;

export interface Trigger {
  check(logRecord: LogRecord): void;
}

export type FilterFn = (stream: Stream, logRecord: LogRecord) => boolean;

export interface Filter {
  shouldFilterOut(stream: Stream, logRecord: LogRecord): boolean;
}

export class LogRecord {
  readonly msg: unknown;
  #metadata: unknown[];
  #dateTime: Date;
  readonly level: Level;

  constructor(msg: unknown, metadata: unknown[], level: Level) {
    this.msg = msg;
    this.#metadata = [...metadata];
    this.level = level;
    this.#dateTime = new Date();
  }
  get metadata(): unknown[] {
    return [...this.#metadata];
  }
  get dateTime(): Date {
    return new Date(this.#dateTime.getTime());
  }
}
