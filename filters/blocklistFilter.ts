import { Filter, LogRecord, Stream } from "../types.ts";
import { asString } from "../formatters/asString.ts";

/**
 * A sub-string filter.  If the LogRecord message, or anything in the metadata,
 * upon conversion to a string if necessary, contains a registered sub-string,
 * then this LogRecord will be filtered out.
 */
export class BlocklistFilter implements Filter {
  #subStrings: string[] = [];

  shouldFilterOut(stream: Stream, logRecord: LogRecord): boolean {
    const msgAsString = asString(logRecord.msg);
    const metadataAsString = asString(logRecord.metadata);
    for (let i = 0; i < this.#subStrings.length; i++) {
      if (
        msgAsString.indexOf(this.#subStrings[i]) >= 0 ||
        metadataAsString.indexOf(this.#subStrings[i]) >= 0
      ) {
        return true;
      }
    }
    return false;
  }

  blockRecordsContaining(...strings: string[]): this {
    this.#subStrings = strings;
    return this;
  }
}
