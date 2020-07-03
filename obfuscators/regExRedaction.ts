import { Obfuscator, LogRecord, Stream } from "../types.ts";
import { Level } from "../logger/levels.ts";

/* For a given match, this function will return the string to replace the
 * match with.
 */
export type Replacer = (match: string) => string;

/**
 * An obfuscator to replace regular expression matches with `*`s or a custom
 * replacer function.  `msg` and `metadata` fields are checked against the
 * supplied RegExp, having first been converted to strings if necessary.
 */
export class RegExRedaction implements Obfuscator {
  #regex: RegExp;
  #replacer: Replacer = (match: string): string => {
    return match.replace(/[^\s]/g, "*");
  };

  constructor(regex: RegExp, replacer?: Replacer) {
    this.#regex = regex;
    if (replacer) this.#replacer = replacer;
  }

  obfuscate(stream: Stream, logRecord: LogRecord): LogRecord {
    return new ObfuscatedViaRegExLogRecord(
      logRecord,
      this.#regex,
      this.#replacer,
    );
  }
}

class ObfuscatedViaRegExLogRecord implements LogRecord {
  readonly msg: unknown;
  #metadata: unknown[];
  #dateTime: Date;
  readonly level: Level;
  #logRecord: LogRecord;

  constructor(logRecord: LogRecord, regEx: RegExp, replacer: Replacer) {
    if (typeof logRecord.msg == "string") {
      this.msg = this.matchAndReplace(logRecord.msg, regEx, replacer);
    } else if (typeof logRecord.msg === "object") {
      this.msg = JSON.parse(JSON.stringify(logRecord.msg));
      this.redact(this.msg, regEx, replacer);
    } else {
      this.msg = logRecord.msg;
    }

    this.#metadata = JSON.parse(JSON.stringify(logRecord.metadata));
    for (let i = 0; i < this.#metadata.length; i++) {
      if (typeof (this.#metadata[i]) === "object") {
        this.redact(this.#metadata[i], regEx, replacer);
      } else if (typeof (this.#metadata[i] === "string")) {
        this.#metadata[i] = this.matchAndReplace(
          this.#metadata[i] as string,
          regEx,
          replacer,
        );
      }
    }

    this.level = logRecord.level;
    this.#dateTime = logRecord.dateTime;
    this.#logRecord = logRecord;
  }

  matchAndReplace(str: string, regEx: RegExp, replacer: Replacer): string {
    const matches = str.match(regEx);
    for (let i = 0; matches && i < matches.length; i++) {
      str = str.replace(matches[i], replacer(matches[i]));
    }
    return str;
  }

  redact(obj: unknown, regEx: RegExp, replacer: Replacer): void {
    if (obj && typeof obj === "object") {
      for (let key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const castObj = (obj as { [key: string]: unknown });
          if (typeof castObj[key] === "string") {
            castObj[key] = this.matchAndReplace(
              castObj[key] as string,
              regEx,
              replacer,
            );
          } else if (typeof castObj[key] === "object") {
            this.redact(castObj[key], regEx, replacer);
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
