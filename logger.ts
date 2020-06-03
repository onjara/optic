import { Level } from "./levels.ts";
import { Stream, LogRecord, FilterFn, Filter, isFilter } from "./types.ts";
import { ConsoleStream } from "./streams/consoleStream.ts";

export class Logger {
  #minLevel: Level = Level.DEBUG;
  #streams: Stream[] = [new ConsoleStream()];
  #filters: (Filter | FilterFn)[] = [];
  #streamAdded = false;

  constructor() {
    addEventListener('unload', () => {
      for (const stream of this.#streams) {
        if (stream.logFooter) stream.logFooter();
        if (stream.destroy) stream.destroy();
      }
    });
  }

  level(level: Level): Logger {
    this.#minLevel = level;
    return this;
  }

  addStream(stream: Stream): Logger {
    if (!this.#streamAdded) {
      // remove the default console stream if adding specified ones
      this.#streams = [];
      this.#streamAdded = true;
    }
    this.#streams.push(stream);
    if (stream.setup) stream.setup();
    if (stream.logHeader) stream.logHeader();
    return this;
  }

  removeStream(removeStream: Stream): Logger {
    this.#streams = this.#streams.filter((stream) => stream !== removeStream);
    if (removeStream.logFooter) removeStream.logFooter();
    if (removeStream.destroy) removeStream.destroy();
    return this;
  }

  addFilter(filter: Filter | FilterFn): Logger {
    this.#filters.push(filter);
    return this;
  }

  removeFilter(filterToRemove: Filter | FilterFn): Logger {
    this.#filters = this.#filters.filter((filter) => filter !== filterToRemove);
    return this;
  }

  private logToStreams<T>(
    level: Level,
    msg: () => T | (T extends Function ? never : T),
    metadata: unknown[]
  ): T | undefined {
    if (this.#minLevel > level) {
      return msg instanceof Function ? undefined : msg;
    } 
    let resolvedMsg = msg instanceof Function ? msg() : msg;

    const logRecord = new LogRecord(resolvedMsg, metadata, level);
    this.#streams.forEach((stream: Stream) => {
      let skip = false;
      for (let filter of this.#filters) {
        if ((isFilter(filter) && filter.shouldFilterOut(stream, logRecord))
              || (typeof filter === "function" && filter(stream, logRecord))) {
          skip = true;
        }
      }
      if (!skip) stream.handle(logRecord);
    });
    return resolvedMsg;
  }

  debug<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  debug<T>(msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  debug<T>(msg: () => T | (T extends Function ? never : T), ...metadata: unknown[]): T | undefined {
    return this.logToStreams(Level.DEBUG, msg, metadata);
  }

  info<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  info<T>(msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  info<T>(msg: () => T | (T extends Function ? never : T), ...metadata: unknown[]): T | undefined {
    return this.logToStreams(Level.INFO, msg, metadata);
  }

  warning<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  warning<T>(msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  warning<T>(msg: () => T | (T extends Function ? never : T), ...metadata: unknown[]): T | undefined {
    return this.logToStreams(Level.WARNING, msg, metadata);
  }

  error<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  error<T>(msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  error<T>(msg: () => T | (T extends Function ? never : T), ...metadata: unknown[]): T | undefined {
    return this.logToStreams(Level.ERROR, msg, metadata);
  }

  critical<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  critical<T>(msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  critical<T>(msg: () => T | (T extends Function ? never : T), ...metadata: unknown[]): T | undefined {
    return this.logToStreams(Level.CRITICAL, msg, metadata);
  }

  log<T>(level: Level, msg: () => T, ...metadata: unknown[]): T | undefined;
  log<T>(level: Level, msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  log<T>(level: Level, msg: () => T | (T extends Function ? never : T), ...metadata: unknown[]): T | undefined {
    return this.logToStreams(level, msg, metadata);
  }
}
