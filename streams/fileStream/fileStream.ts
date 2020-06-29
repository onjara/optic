import { BaseStream } from "../baseStream.ts";
import { LogMeta, LogRecord } from "../../types.ts";
import { TokenReplacer } from "../../formatters/tokenReplacer.ts";
import { Level } from "../../logger/levels.ts";
import { BufWriterSync } from "./fileStream_deps.ts";
import { RotationStrategy } from "./rotationStrategy.ts";
import { LogFileInitStrategy } from "./types.ts";

export class FileStream extends BaseStream {
  #filename: string;
  #rotationStrategy: RotationStrategy | undefined = undefined;
  #logFileInitStrategy: LogFileInitStrategy = "append";
  #maxBufferSize: number = 8192;
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
    this.#buffer = new BufWriterSync(this.#logFile, this.#maxBufferSize);
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
    const encodedMsg = this.#encoder.encode(msg + "\n");
    if (
      this.#maxBufferSize > 0 &&
      this.#rotationStrategy?.shouldRotate(encodedMsg)
    ) {
      this.flush();
      Deno.close(this.#logFile.rid);
      this.#rotationStrategy.rotate(this.#filename, encodedMsg);
      this.#logFile = Deno.openSync(
        this.#filename,
        { createNew: true, write: true },
      );
      this.#buffer = new BufWriterSync(this.#logFile, this.#maxBufferSize);
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

  withLogFileRotation(strategy: RotationStrategy): this {
    this.#rotationStrategy = strategy;
    return this;
  }

  withBufferSize(bytes: number): this {
    if (bytes < 0) {
      throw new Error("Buffer size cannot be negative");
    }
    this.#maxBufferSize = bytes;
    return this;
  }

  withLogFileInitMode(mode: LogFileInitStrategy): this {
    this.#logFileInitStrategy = mode;
    return this;
  }
}
