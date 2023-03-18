// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import type { Filter, LogRecord, Stream } from "../types.ts";
import { asString } from "../utils/asString.ts";

/**
 * A simple sub-string filter.  If the LogRecord message, or anything in the
 * metadata, upon conversion to a string if necessary, contains the registered
 * sub-string, then this LogRecord will be filtered out.
 */
export class SubStringFilter implements Filter {
  #subString: string;

  constructor(subString: string) {
    this.#subString = subString;
  }

  shouldFilterOut(_stream: Stream, logRecord: LogRecord): boolean {
    const msgAsString = asString(logRecord.msg);
    const metadataAsString = asString(logRecord.metadata);
    return msgAsString.indexOf(this.#subString) >= 0 ||
      metadataAsString.indexOf(this.#subString) >= 0;
  }
}
