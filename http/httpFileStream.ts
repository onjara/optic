import { FileStream } from "../streams/fileStream/fileStream.ts";
import { LogFileInitStrategy, RotationStrategy } from "../streams/fileStream/types.ts";
import { LogRecord } from "../types.ts";
import { HttpFormatter } from "./httpFormatter.ts";
import { HttpStream } from "./types.ts";

export class HttpLogFileStream implements HttpStream {
  consumesRequestBody = false;
  consumesResponseBody = false;
  #formatter = new HttpFormatter();
  #stream:FileStream;

  constructor(fileName: string) {
    this.#stream = new FileStream(fileName);
    this.#stream.withFormat(this.#formatter);
    this.#stream.withLogHeader(false);
    this.#stream.withLogFooter(false);
  }

  setup(): void {
    this.#stream.setup();
  }

  destroy(): void {
    this.#stream.destroy();
  }

  flush(): void {
    this.#stream.flush();
  }

  withLogFileRotation(strategy: RotationStrategy): this {
    this.#stream.withLogFileRotation(strategy);
    return this;
  }

  withBufferSize(bytes: number): this {
    this.#stream.withBufferSize(bytes);
    return this;
  }

  withLogFileInitMode(mode: LogFileInitStrategy): this {
    this.#stream.withLogFileInitMode(mode);
    return this;
  }

  getFileName(): string {
    return this.#stream.getFileName();
  }

  handle(logRecord: LogRecord): boolean {
    return this.#stream.handle(logRecord);
  }

  withFormat(format:string):this {
    this.#formatter.withFormat(format);
    this.consumesRequestBody = this.#formatter.consumesRequestBody;
    this.consumesResponseBody = this.#formatter.consumesResponseBody;
    return this;
  }
}