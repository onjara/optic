import type { Filter, LogRecord, Stream } from "../types.ts";
import { asString } from "../formatters/asString.ts";

/**
 * A regular expression filter.  If the LogRecord message, or any field in
 * the metadata, upon conversion to string, matches the regular expression,
 * then this LogRecord will be filtered out.
 */
export class RegExFilter implements Filter {
  #regEx: RegExp;

  /** Records matching the supplied regEx will be filtered out */
  constructor(regEx: RegExp | string) {
    if (typeof regEx === "string") {
      this.#regEx = new RegExp(regEx);
    } else {
      this.#regEx = regEx;
    }
  }

  shouldFilterOut(stream: Stream, logRecord: LogRecord): boolean {
    if (this.#regEx.test(asString(logRecord.msg))) {
      return true;
    } else if (logRecord.metadata.length > 0) {
      for (const metaItem of logRecord.metadata) {
        if (this.#regEx.test(asString(metaItem))) {
          return true;
        }
      }
    }
    return false;
  }
}
