import { ConsoleStream } from "../streams/consoleStream.ts";
import { LogRecord } from "../types.ts";
import { HttpFormatter } from "./httpFormatter.ts";
import { HttpStream } from "./types.ts";

export class HttpConsoleStream implements HttpStream {
  consumesRequestBody = false;
  consumesResponseBody = false;
  #formatter = new HttpFormatter();
  #stream = new ConsoleStream();
  constructor() {
    this.#stream.withFormat(this.#formatter);
    this.#stream.withLogHeader(false);
    this.#stream.withLogFooter(false);
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