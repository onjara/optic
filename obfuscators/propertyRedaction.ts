import {
  Obfuscator,
  Stream,
  LogRecord,
} from "../types.ts";
import { Level } from "../logger/levels.ts";

/**
 * An obfuscator to obfuscate the entire value of any matched properties of any
 * object in the `msg` or `metadata` log record fields.  This includes deep
 * checking of objects. Redacted values are set to the string `[Redacted]`.
 */
export class PropertyRedaction implements Obfuscator {
  #redactionKey: string;

  constructor(propertyToRedact: string) {
    this.#redactionKey = propertyToRedact;
  }

  obfuscate(stream: Stream, logRecord: LogRecord): LogRecord {
    return new ObfuscatedPropertyLogRecord(logRecord, this.#redactionKey);
  }
}

class ObfuscatedPropertyLogRecord implements LogRecord {
  readonly msg: unknown;
  #metadata: unknown[];
  #dateTime: Date;
  readonly level: Level;
  #logRecord: LogRecord;

  constructor(logRecord: LogRecord, property: string) {
    if (typeof logRecord.msg === "object") {
      this.msg = JSON.parse(JSON.stringify(logRecord.msg));
      this.redact(this.msg, property);
    } else {
      this.msg = logRecord.msg;
    }

    if (property === "metadata") {
      this.#metadata = ["[Redacted]"];
    } else {
      this.#metadata = JSON.parse(JSON.stringify(logRecord.metadata));
      for (let i = 0; i < this.#metadata.length; i++) {
        if (typeof (this.#metadata[i]) === "object") {
          this.redact(this.#metadata[i], property);
        }
      }
    }

    this.level = logRecord.level;
    this.#dateTime = logRecord.dateTime;
    this.#logRecord = logRecord;
  }

  redact(obj: unknown, property: string): void {
    if (obj && typeof obj === "object") {
      for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const castObj = (obj as { [key: string]: unknown });
          if (key === property) {
            castObj[key] = "[Redacted]";
          } else if (typeof castObj[key] === "object") {
            this.redact(castObj[key], property);
          }
        }
      }
    }
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
