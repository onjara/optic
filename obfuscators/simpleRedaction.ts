import {
  Obfuscator,
  Stream,
  LogRecord,
  ObfuscatedLogRecord,
} from "../types.ts";

export class SimpleRedaction implements Obfuscator {
  #redactionKey: string;

  constructor(redactionKey: string) {
    this.#redactionKey = redactionKey;
  }

  obfuscate(stream: Stream, logRecord: LogRecord): LogRecord {
    return new ObfuscatedLogRecord(logRecord, this.#redactionKey);
  }
}
