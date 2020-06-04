import { Filter, LogRecord, Stream, FilterFn } from "../types.ts";

export class SimpleFilter implements Filter {
  #filter: FilterFn;

  constructor(filterFn: FilterFn) {
    this.#filter = filterFn;
  }

  shouldFilterOut(stream: Stream, logRecord: LogRecord): boolean {
    return this.#filter(stream, logRecord);
  }
}
