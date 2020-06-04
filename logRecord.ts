import { LogRecord } from "./types.ts";
import { Level } from "./levels.ts";

export class ImmutableLogRecord implements LogRecord {
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

export class ObfuscatedLogRecord implements LogRecord {
  readonly msg: unknown;
  #metadata: unknown[];
  #dateTime: Date;
  readonly level: Level;
  #logRecord: LogRecord;

  constructor(logRecord: LogRecord, property: string) {
    this.msg = property === "msg" ? "[Redacted]" : logRecord.msg;

    // TODO support deep field/obj redaction
    this.#metadata = property === "metadata" && logRecord.metadata.length > 0
      ? ["[Redacted]"]
      : logRecord.metadata;

    for (let i = 0; i < logRecord.metadata.length; i++) {
      if (typeof (logRecord.metadata[i]) === "object") {
        if (property in (logRecord.metadata[i] as Object)) {
          (logRecord.metadata[i] as { [key: string]: any })[property] =
            "[Redacted]";
        }
      }
    }

    this.level = logRecord.level;
    this.#dateTime = logRecord.dateTime;
    this.#logRecord = logRecord;
  }

  get dateTime(): Date {
    return new Date(this.#dateTime.getTime());
  }

  get metadata(): unknown[] {
    return [...this.#metadata];
  }
  get logRecord(): LogRecord {
    return this.#logRecord;
  }
}
