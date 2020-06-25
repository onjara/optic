import { BaseStream } from "./baseStream.ts";
import { LogMeta, Formatter, LogRecord } from "../types.ts";
import { TokenReplacer } from "../formatters/tokenReplacer.ts";
import { Level } from "../logger/levels.ts";
import { BufWriterSync } from "./fileStream_deps.ts";

class OngoingMaxArchiveStrategy {
  constructor(private quantity: number) {}
  files(): MaxArchiveStrategy {
    return new MaxArchiveStrategy(this.quantity, "files");
  }
  hours(): MaxArchiveStrategy {
    return new MaxArchiveStrategy(this.quantity, "hours");
  }
  days(): MaxArchiveStrategy {
    return new MaxArchiveStrategy(this.quantity, "days");
  }
}

type Periods = "minutes" | "hours" | "days";

class MaxArchiveStrategy {
  #quantity: number;
  #type: "files" | Periods;

  constructor(quantity: number, type: "files" | Periods) {
    if (
      (quantity < 0 && type == "files") || (quantity < 1 && type != "files")
    ) {
      throw new Error("Invalid quantity for maximum archive count");
    }
    this.#quantity = quantity;
    this.#type = type;
  }
  get quantity(): number {
    return this.#quantity;
  }
  get type(): "files" | Periods {
    return this.#type;
  }
}

class ByteRotationStrategy implements RotationStrategy {
  #maxBytes: number;
  constructor(maxBytes: number) {
    if (maxBytes < 1) {
      throw new Error("Max bytes cannot be less than 1");
    }
    this.#maxBytes = maxBytes;
  }
  get maxBytes(): number {
    return this.maxBytes;
  }

  initLogs(filename: string, initStrategy: LogFileInitStrategy): void {}
  shouldRotate(formattedMessage: unknown): void {}
  rotate(filename: string): void {}
}

class DateTimeRotationStrategy implements RotationStrategy {
  #interval: number;
  #period: Periods;
  #useUTCTime = false;

  constructor(interval: number, period: Periods) {
    if (interval < 1) {
      throw new Error("DateTime rotation interval cannot be less than 1");
    }
    this.#interval = interval;
    this.#period = period;
  }

  initLogs(filename: string, initStrategy: LogFileInitStrategy): void {}
  shouldRotate(formattedMessage: unknown): void {}
  rotate(filename: string): void {}

  withUTCTime(): this {
    this.#useUTCTime = true;
    return this;
  }

  withLocalTime(): this {
    this.#useUTCTime = false;
    return this;
  }
}

class OngoingRotationStrategy {
  constructor(private quantity: number) {}
  bytes(): ByteRotationStrategy {
    return new ByteRotationStrategy(this.quantity);
  }
  minutes(): DateTimeRotationStrategy {
    return new DateTimeRotationStrategy(this.quantity, "minutes");
  }
  hours(): DateTimeRotationStrategy {
    return new DateTimeRotationStrategy(this.quantity, "hours");
  }
  days(): DateTimeRotationStrategy {
    return new DateTimeRotationStrategy(this.quantity, "days");
  }
}

export function every(quantity: number): OngoingRotationStrategy {
  return new OngoingRotationStrategy(quantity);
}

export function of(quantity: number): OngoingMaxArchiveStrategy {
  return new OngoingMaxArchiveStrategy(quantity);
}

export type LogFileInitStrategy = "append" | "overwrite" | "mustNotExist";

export interface RotationStrategy {
  initLogs(filename: string, initStrategy: LogFileInitStrategy): void;
  shouldRotate(formattedMessage: unknown): void;
  rotate(filename: string): void;
}

export class FileStream extends BaseStream {
  #filename: string;
  #maxArchivesStrategy: MaxArchiveStrategy = of(7).files();
  #rotationStrategy: RotationStrategy | undefined = undefined;
  #logFileInitStrategy: LogFileInitStrategy = "append";
  #bufferSize: number = 8192;
  #buffer!: BufWriterSync;
  #logFile!: Deno.File;
  #deferredLogQueue: LogRecord[] = [];
  #encoder = new TextEncoder();

  constructor(filename: string) {
    super(new TokenReplacer());
    this.#filename = filename;
  }

  setup(): void {
    if (this.#rotationStrategy !== undefined) {
      this.#rotationStrategy.initLogs(
        this.#filename,
        this.#logFileInitStrategy,
      );
    }

    const openOptions = {
      createNew: this.#logFileInitStrategy === "mustNotExist",
      create: this.#logFileInitStrategy !== "mustNotExist",
      append: this.#logFileInitStrategy === "append",
      truncate: this.#logFileInitStrategy !== "append",
      write: true,
    };
    this.#logFile = Deno.openSync(this.#filename, openOptions);
    this.#buffer = new BufWriterSync(this.#logFile, this.#bufferSize);
  }

  destroy(): void {
    this.flush();
    this.#logFile.close();
  }

  logHeader(meta: LogMeta): void {
    // TODO
  }

  logFooter(meta: LogMeta): void {
    // TODO
  }

  handle(logRecord: LogRecord): void {
    if (this.minLogLevel > logRecord.level) return;

    if (logRecord.level > Level.ERROR) {
      this.#deferredLogQueue.push(logRecord);
      this.processDeferredQueue();
      this.flush();
    } else {
      if (this.#deferredLogQueue.length === 0) {
        queueMicrotask(() => {
          this.processDeferredQueue();
        });
      }
      this.#deferredLogQueue.push(logRecord);
    }
  }

  private processDeferredQueue() {
    for (let i = 0; i < this.#deferredLogQueue.length; i++) {
      const msg = this.format(this.#deferredLogQueue[i]);
      this.log(msg);
    }
    this.#deferredLogQueue = [];
  }

  log(msg: string): void {
    if (this.#bufferSize > 0 && this.#rotationStrategy?.shouldRotate(msg)) {
      this.flush();
      Deno.close(this.#logFile.rid);
      this.#rotationStrategy.rotate(this.#filename);
      this.#logFile = Deno.openSync(
        this.#filename,
        { createNew: true, write: true },
      );
      this.#buffer = new BufWriterSync(this.#logFile, this.#bufferSize);
    }
    this.#buffer.writeSync(this.#encoder.encode(msg + "\n"));
  }

  flush(): void {
    if (this.#deferredLogQueue.length > 0) {
      this.processDeferredQueue();
    }
    if (this.#buffer?.buffered() > 0) {
      this.#buffer.flush();
    }
  }

  withMaxArchiveCount(strategy: MaxArchiveStrategy): this {
    this.#maxArchivesStrategy = strategy;
    return this;
  }

  withRotation(strategy: RotationStrategy): this {
    this.#rotationStrategy = strategy;
    return this;
  }

  withBufferSize(bytes: number): this {
    if (bytes < 0) {
      throw new Error("Buffer size cannot be negative");
    }
    this.#bufferSize = bytes;
    return this;
  }

  withLogFileInitMode(mode: LogFileInitStrategy): this {
    this.#logFileInitStrategy = mode;
    return this;
  }
}
