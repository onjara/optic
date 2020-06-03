import { Level } from "./levels.ts";
import { Stream, LogRecord, FilterFn, Filter, TriggerFn, Trigger } from "./types.ts";
import { ConsoleStream } from "./streams/consoleStream.ts";

export class Logger {
  #minLevel: Level = Level.DEBUG;
  #streams: Stream[] = [new ConsoleStream()];
  #filters: (Filter | FilterFn)[] = [];
  #triggers: (Trigger | TriggerFn)[] = [];
  #streamAdded = false;

  constructor() {
    addEventListener("unload", () => {
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

  addTrigger(trigger: Trigger | TriggerFn): Logger {
    this.#triggers.push(trigger);
    return this;
  }

  removeTrigger(triggerToRemove: Trigger | TriggerFn): Logger {
    this.#triggers = this.#triggers.filter((trigger) => trigger !== triggerToRemove);
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
    metadata: unknown[],
  ): T | undefined {
    if (this.#minLevel > level) {
      return msg instanceof Function ? undefined : msg;
    }
    let resolvedMsg = msg instanceof Function ? msg() : msg;

    const logRecord = new LogRecord(resolvedMsg, metadata, level);

    // Check triggers
    for (let i=0; i < this.#triggers.length; i++) {
      const trigger = this.#triggers[i];
      typeof trigger === "function" ? trigger(logRecord) : trigger.check(logRecord);
    }

    // Process streams
    for (let i = 0; i < this.#streams.length; i++) {
      const stream = this.#streams[i];
      let skip = false;

      // Check Filters
      for (let j=0; j < this.#filters.length && !skip; j++) {
        const filter = this.#filters[j];
        if (
          (typeof filter !== "function" &&
            filter.shouldFilterOut(stream, logRecord)) ||
          (typeof filter === "function" && filter(stream, logRecord))
        ) {
          skip = true;
        }
      }

      if (!skip) stream.handle(logRecord);
    }

    return resolvedMsg;
  }

  debug<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  debug<T>(msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  debug<T>(
    msg: () => T | (T extends Function ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.DEBUG, msg, metadata);
  }

  info<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  info<T>(msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  info<T>(
    msg: () => T | (T extends Function ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.INFO, msg, metadata);
  }

  warning<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  warning<T>(msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  warning<T>(
    msg: () => T | (T extends Function ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.WARNING, msg, metadata);
  }

  error<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  error<T>(msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  error<T>(
    msg: () => T | (T extends Function ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.ERROR, msg, metadata);
  }

  critical<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  critical<T>(msg: (T extends Function ? never : T), ...metadata: unknown[]): T;
  critical<T>(
    msg: () => T | (T extends Function ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.CRITICAL, msg, metadata);
  }

  log<T>(level: Level, msg: () => T, ...metadata: unknown[]): T | undefined;
  log<T>(
    level: Level,
    msg: (T extends Function ? never : T),
    ...metadata: unknown[]
  ): T;
  log<T>(
    level: Level,
    msg: () => T | (T extends Function ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(level, msg, metadata);
  }
}
