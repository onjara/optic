import { Level, nameToLevel } from "./levels.ts";
import type {
  Stream,
  FilterFn,
  Filter,
  MonitorFn,
  Monitor,
  Transformer,
  TransformerFn,
  LogRecord,
  LogMeta,
} from "../types.ts";
import { ConsoleStream } from "../streams/consoleStream.ts";
import { ImmutableLogRecord } from "./logRecord.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => any;

class LogMetaImpl implements LogMeta {
  minLogLevel: Level = Level.DEBUG;
  minLogLevelFrom = "default";
  readonly sessionStarted = new Date();
  readonly hostname = "unavailable";
  logger = "default";
  filters = 0;
  transformers = 0;
  monitors = 0;
  streamStats: Map<
    Stream,
    { handled: Map<number, number>; filtered: number; transformed: number }
  > = new Map();
}

export class Logger {
  #name = "default";
  #minLevel: Level = Level.DEBUG;
  #streams: Stream[] = [new ConsoleStream()];
  #filters: Filter[] = [];
  #monitors: Monitor[] = [];
  #transformers: Transformer[] = [];
  #streamAdded = false;
  #meta: LogMetaImpl = new LogMetaImpl();
  #ifCondition = true;

  constructor(name?: string) {
    if (name) {
      this.#name = name;
      this.#meta.logger = name;
    }
    //TODO check permissions here for meta.unableToReadEnvVar once stable and sync version available

    this.setMinLogLevel();

    // Append footers and destroy loggers on unload of module
    addEventListener("unload", () => {
      for (const stream of this.#streams) {
        if (stream.logFooter) stream.logFooter(this.#meta);
        if (stream.destroy) stream.destroy();
      }
      for (const monitor of this.#monitors) {
        if (monitor.destroy) monitor.destroy();
      }
      for (const filter of this.#filters) {
        if (filter.destroy) filter.destroy();
      }
      for (const transformer of this.#transformers) {
        if (transformer.destroy) transformer.destroy();
      }
    });
  }

  private setMinLogLevel() {
    //Check environment variable and parameters for min log level
    const argMinLevel = this.getArgsMinLevel();
    if (argMinLevel !== undefined && nameToLevel(argMinLevel) !== undefined) {
      //set min log level from module arguments
      this.#minLevel = nameToLevel(argMinLevel)!;
      this.#meta.minLogLevelFrom = "from command line argument";
      this.#meta.minLogLevel = this.#minLevel;
    } else {
      // Set min log level from env variable
      const envMinLevel = this.getEnvMinLevel();
      if (envMinLevel && nameToLevel(envMinLevel) !== undefined) {
        this.#minLevel = nameToLevel(envMinLevel)!;
        this.#meta.minLogLevelFrom = "from environment variable";
        this.#meta.minLogLevel = this.#minLevel;
      }
    }
  }

  /**
   * Returns the minimum log level required for a log record to be passed to
   * each stream (which may still reject with a more restrictive min log level)
   */
  minLogLevel(): Level {
    return this.#minLevel;
  }

  /**
   * Set the minimum log level required for the logger to process a log record.
   * Log records with a lower level are not processed by anything.
   */
  withMinLogLevel(level: Level): this {
    this.#minLevel = level;
    this.#meta.minLogLevelFrom = "programmatically set";
    this.#meta.minLogLevel = this.#minLevel;
    return this;
  }

  name(): string {
    return this.#name;
  }

  /** 
   * Add a stream to this logger. By default the logger comes with a console 
   * stream.  Adding any additional streams removes this default stream.
   */
  addStream(stream: Stream): Logger {
    if (!this.#streamAdded) {
      // remove the default console stream if adding specified ones
      this.#streams = [];
      this.#streamAdded = true;
    }
    this.#streams.push(stream);
    if (stream.setup) stream.setup();
    if (stream.logHeader) stream.logHeader(this.#meta);
    this.#meta.streamStats.set(
      stream,
      { handled: new Map<number, number>(), filtered: 0, transformed: 0 },
    );
    return this;
  }

  /** Remove stream from the logger */
  removeStream(removeStream: Stream): Logger {
    this.#streams = this.#streams.filter((stream) => stream !== removeStream);
    if (removeStream.logFooter) removeStream.logFooter(this.#meta);
    if (removeStream.destroy) removeStream.destroy();
    return this;
  }

  /**
   * Add a monitor to the logger.  A monitor is a hook to spy on log records
   * being processed by the logger and potentially take action.
   */
  addMonitor(monitor: Monitor | MonitorFn): Logger {
    if (typeof monitor === "function") {
      monitor = { check: monitor };
    }
    if (monitor.setup) monitor.setup();
    this.#monitors.push(monitor);
    this.#meta.monitors++;
    return this;
  }

  /** 
   * Remove monitor from the logger.  Once removed it will no longer spy on 
   * log records passing through the logger.
   */
  removeMonitor(monitorToRemove: Monitor): Logger {
    this.#monitors = this.#monitors.filter((monitor) =>
      monitor !== monitorToRemove
    );
    if (monitorToRemove.destroy) monitorToRemove.destroy();
    return this;
  }

  /**
   * Add a filter to the logger.  Filters examine each log record and will
   * reject them from being processes if the filter condition is met.
   */
  addFilter(filter: Filter | FilterFn): Logger {
    if (typeof filter === "function") {
      filter = { shouldFilterOut: filter };
    }
    if (filter.setup) filter.setup();
    this.#filters.push(filter);
    this.#meta.filters++;
    return this;
  }

  /**
   * Remove filter from the logger.  Once removed, the filter will no longer
   * examine any log records or reject them.
   */
  removeFilter(filterToRemove: Filter): Logger {
    this.#filters = this.#filters.filter((filter) => filter !== filterToRemove);
    if (filterToRemove.destroy) filterToRemove.destroy();
    return this;
  }

  /**
   * Add a transformer to the logger.  Transformers may or may not transform
   * your log record.  Examples include obfuscation of sensitive data, stripping
   * new-lines, encoding output, etc.
   */
  addTransformer(transformer: Transformer | TransformerFn): Logger {
    if (typeof transformer === "function") {
      transformer = { transform: transformer };
    }
    if (transformer.setup) transformer.setup();
    this.#transformers.push(transformer);
    this.#meta.transformers++;
    return this;
  }

  /**
   * Remove transformer from the logger.  Once removed, it will no longer examine
   * any log records or transform them.
   */
  removeTransformer(transformerToRemove: Transformer): Logger {
    this.#transformers = this.#transformers.filter((transformer) =>
      transformer !== transformerToRemove
    );
    if (transformerToRemove.destroy) transformerToRemove.destroy();
    return this;
  }

  private getArgsMinLevel(): string | undefined {
    for (let i = 0; i < this.getArgs().length; i++) {
      let arg = this.getArgs()[i];
      if (arg.startsWith("minLogLevel=")) {
        return arg.slice("minLogLevel=".length);
      }
    }
    return undefined;
  }

  private getEnvMinLevel(): string | undefined {
    try {
      // Deno.env requires --allow-env permissions.  Add check here if they are granted once this is stable,
      // but for now just catch the no permission error.
      return this.getEnv().get("OPTIC_MIN_LEVEL");
    } catch (err) {
      return undefined;
    }
  }

  private logToStreams<T>(
    level: Level,
    msg: () => T | (T extends AnyFunction ? never : T),
    metadata: unknown[],
  ): T | undefined {
    if (this.loggingBlocked(level)) {
      this.#ifCondition = true; //reset to true
      return msg instanceof Function ? undefined : msg;
    }
    let resolvedMsg = msg instanceof Function ? msg() : msg;

    let logRecord: LogRecord = new ImmutableLogRecord(
      resolvedMsg,
      metadata,
      level,
      this.#name,
    );

    // Check monitors
    for (let i = 0; i < this.#monitors.length; i++) {
      this.#monitors[i].check(logRecord);
    }

    // Process streams
    for (let i = 0; i < this.#streams.length; i++) {
      const stream = this.#streams[i];
      let skip = false;

      // Apply Filters.  First matching filter will skip rest of filters.
      for (let j = 0; !skip && j < this.#filters.length; j++) {
        if (this.#filters[j].shouldFilterOut(stream, logRecord)) {
          skip = true;
          this.#meta.streamStats.get(stream)!.filtered++;
        }
      }

      if (this.#transformers.length > 0) {
        // Apply transformers
        for (let j = 0; !skip && j < this.#transformers.length; j++) {
          let thisLogRecord = logRecord;
          thisLogRecord = this.#transformers[j].transform(
            stream,
            thisLogRecord,
          );
          if (logRecord !== thisLogRecord) {
            logRecord = thisLogRecord;
            this.#meta.streamStats.get(stream)!.transformed++;
          }
        }
        if (!skip) {
          stream.handle(logRecord);
          this.registerStreamHandlingOfLogRecord(stream, level);
        }
      } else if (!skip) {
        stream.handle(logRecord);
        this.registerStreamHandlingOfLogRecord(stream, level);
      }
    }

    return resolvedMsg;
  }

  protected loggingBlocked(level: Level): boolean {
    return this.#minLevel > level || !this.#ifCondition;
  }

  registerStreamHandlingOfLogRecord(stream: Stream, level: number): void {
    if (!this.#meta.streamStats.get(stream)!.handled.has(level)) {
      this.#meta.streamStats.get(stream)!.handled.set(level, 0);
    }
    this.#meta.streamStats.get(stream)!.handled.set(
      level,
      this.#meta.streamStats.get(stream)!.handled.get(level)! + 1,
    );
  }

  /**
   * Trace is the lowest log level used for intimate tracing of flow through
   * logic.
   * 
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  trace<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  trace<T>(msg: (T extends AnyFunction ? never : T), ...metadata: unknown[]): T;
  trace<T>(
    msg: () => T | (T extends AnyFunction ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.TRACE, msg, metadata);
  }

  /**
   * Debug is a low log level used for tracking down issues
   * 
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  debug<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  debug<T>(msg: (T extends AnyFunction ? never : T), ...metadata: unknown[]): T;
  debug<T>(
    msg: () => T | (T extends AnyFunction ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.DEBUG, msg, metadata);
  }

  /**
   * Info is a mid/low log level used for recording informational messages
   * 
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  info<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  info<T>(msg: (T extends AnyFunction ? never : T), ...metadata: unknown[]): T;
  info<T>(
    msg: () => T | (T extends AnyFunction ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.INFO, msg, metadata);
  }

  /**
   * Warning is a mid log level used for recording situations that are unexpected
   * or not quite right, but which are not necessarily causing issues
   * 
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  warning<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  warning<T>(
    msg: (T extends AnyFunction ? never : T),
    ...metadata: unknown[]
  ): T;
  warning<T>(
    msg: () => T | (T extends AnyFunction ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.WARNING, msg, metadata);
  }

  /**
   * Error is a high log level used for recording situations where errors are
   * occurring and causing issues
   * 
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  error<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  error<T>(msg: (T extends AnyFunction ? never : T), ...metadata: unknown[]): T;
  error<T>(
    msg: () => T | (T extends AnyFunction ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.ERROR, msg, metadata);
  }

  /**
   * Critical is the highest log level used for recording situations where the
   * execution flow itself is at risk due to catastrophic failures
   * 
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  critical<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  critical<T>(
    msg: (T extends AnyFunction ? never : T),
    ...metadata: unknown[]
  ): T;
  critical<T>(
    msg: () => T | (T extends AnyFunction ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.CRITICAL, msg, metadata);
  }

  /**
   * Log at any level, including custom levels.
   * 
   * @param level - a LogLevel
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  log<T>(level: Level, msg: () => T, ...metadata: unknown[]): T | undefined;
  log<T>(
    level: Level,
    msg: (T extends AnyFunction ? never : T),
    ...metadata: unknown[]
  ): T;
  log<T>(
    level: Level,
    msg: () => T | (T extends AnyFunction ? never : T),
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(level, msg, metadata);
  }

  protected getArgs(): string[] {
    return Deno.args;
  }

  protected getEnv(): { get(key: string): string | undefined } {
    return Deno.env;
  }

  /**
   * Specify a condition under which this logging is allowed to occur.  Note
   * that even if the condition is true, the logging is still subject to the
   * logger (and possibly stream) log level constraints.
   */
  if(condition: boolean): Logger {
    this.#ifCondition = condition;
    return this;
  }
}
