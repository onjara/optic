import {
  Obfuscator,
  Stream,
  LogRecord,
} from "../types.ts";
import { Level } from "../logger/levels.ts";
import { clone } from "./deepClone.ts";

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
    let shouldRedactMsg = false;
    let shouldRedactMeta = this.#redactionKey === "metadata";

    if (!shouldRedactMsg) {
      shouldRedactMsg = this.shouldRedact(logRecord.msg, this.#redactionKey);
    }

    if (!shouldRedactMsg) {
      shouldRedactMeta = this.shouldRedact(
        logRecord.metadata,
        this.#redactionKey,
      );
    }

    if (shouldRedactMsg || shouldRedactMeta) {
      return new ObfuscatedPropertyLogRecord(logRecord, this.#redactionKey);
    }

    return logRecord;
  }

  shouldRedact(obj: unknown, property: string): boolean {
    if (isObjectButNotErrorNorArray(obj)) {
      for (let key in (obj as Object)) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const castObj = (obj as { [key: string]: unknown });
          if (key === property) {
            return true;
          } else if (typeof castObj[key] === "object") {
            return this.shouldRedact(castObj[key], property);
          }
        }
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (this.shouldRedact(obj[i], property)) {
          return true;
        }
      }
    }
    return false;
  }
}

class ObfuscatedPropertyLogRecord implements LogRecord {
  readonly msg: unknown;
  #metadata: unknown[];
  #dateTime: Date;
  readonly level: Level;
  #logRecord: LogRecord;
  readonly logger: string;

  constructor(logRecord: LogRecord, property: string) {
    // clone the original object
    this.msg = clone(logRecord.msg);
    this.redact(this.msg, property);

    if (property === "metadata") {
      this.#metadata = ["[Redacted]"];
    } else {
      // clone the original metadata
      this.#metadata = clone(logRecord.metadata);
      this.redact(this.#metadata, property);
    }

    // these fields are not available for obfuscation
    this.level = logRecord.level;
    this.#dateTime = logRecord.dateTime;
    this.#logRecord = logRecord; // retain a copy of the original log record
    this.logger = logRecord.logger;
  }

  redact(obj: unknown, property: string): void {
    if (isObjectButNotErrorNorArray(obj)) {
      for (let key in (obj as Object)) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const castObj = (obj as { [key: string]: unknown });
          if (key === property) {
            castObj[key] = "[Redacted]";
          } else if (typeof castObj[key] === "object") {
            this.redact(castObj[key], property);
          }
        }
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        this.redact(obj[i], property);
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

function isObjectButNotErrorNorArray(obj: unknown): boolean {
  return obj && typeof obj === "object" && !(obj instanceof Error) &&
    !Array.isArray(obj);
}
