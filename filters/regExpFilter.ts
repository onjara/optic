// Copyright 2021 the optic authors. All rights reserved. MIT license.
import type { Filter, LogRecord, Stream } from "../types.ts";
import { asString } from "../utils/asString.ts";

/**
 * A regular expression filter.  If the LogRecord message, or any field in
 * the metadata, upon conversion to string, matches the regular expression,
 * then this LogRecord will be filtered out.
 */
export class RegExpFilter implements Filter {
  #regExp: RegExp;

  /** Records matching the supplied regExp will be filtered out */
  constructor(regExp: RegExp | string) {
    if (typeof regExp === "string") {
      this.#regExp = new RegExp(regExp);
    } else {
      this.#regExp = regExp;
    }
  }

  shouldFilterOut(stream: Stream, logRecord: LogRecord): boolean {
    if (this.#regExp.test(asString(logRecord.msg))) {
      return true;
    } else if (logRecord.metadata.length > 0) {
      for (const metaItem of logRecord.metadata) {
        if (this.#regExp.test(asString(metaItem))) {
          return true;
        }
      }
    }
    return false;
  }
}
