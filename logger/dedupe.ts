// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import { LogRecord, Stream } from "../types.ts";
import { asString } from "../utils/asString.ts";
import { ImmutableLogRecord } from "./logRecord.ts";
import { LogMetaImpl } from "./meta.ts";

export class Dedupe {
  #streams: Stream[];
  #meta: LogMetaImpl;
  #lastLogRecord: LogRecord = new ImmutableLogRecord(undefined, [], 0, "");
  #lastLogString = "";
  #dupeCount = 0;

  constructor(streams: Stream[], meta: LogMetaImpl) {
    this.#streams = streams;
    this.#meta = meta;
  }

  isDuplicate(logRecord: LogRecord): boolean {
    const thisLogAsString = asString(logRecord.msg) +
      asString(logRecord.metadata);
    if (this.#lastLogString === thisLogAsString) {
      // Same log message content
      this.#dupeCount++;
      return true;
    } else {
      // Different log message content
      this.outputDuplicatedMessageLog();
      this.#lastLogString = thisLogAsString;
      this.#lastLogRecord = logRecord;
      return false;
    }
  }

  destroy(): void {
    this.outputDuplicatedMessageLog();
  }

  private outputDuplicatedMessageLog(): void {
    if (this.#dupeCount > 0) {
      // handle output of duplicates
      const duplicateLogRecord = this.generateDuplicateLogRecord(
        this.#lastLogRecord,
      );
      for (let i = 0; i < this.#streams.length; i++) {
        const stream = this.#streams[i];

        const handled = stream.handle(duplicateLogRecord);
        if (handled) {
          this.#meta.streamStats.get(stream)!.duplicated += this.#dupeCount;
        }
      }
      this.#dupeCount = 0;
    }
  }

  private generateDuplicateLogRecord(logRecord: LogRecord): LogRecord {
    if (this.#dupeCount === 1) {
      return logRecord;
    }
    return new ImmutableLogRecord(
      "  ^-- last log repeated " + this.#dupeCount + " additional times",
      [],
      logRecord.level,
      logRecord.logger,
    );
  }
}
