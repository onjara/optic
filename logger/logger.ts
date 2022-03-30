// Copyright 2022 the optic authors. All rights reserved. MIT license.
import { Level, nameToLevel } from "./levels.ts";
import type {
  Filter,
  FilterFn,
  LogMeta,
  LogRecord,
  Monitor,
  MonitorFn,
  ProfileMark,
  Stream,
  TimeUnit,
  Transformer,
  TransformerFn,
} from "../types.ts";
import { ConsoleStream } from "../streams/consoleStream.ts";
import { ImmutableLogRecord } from "./logRecord.ts";
import { LogMetaImpl } from "./meta.ts";
import { RateLimitContext, RateLimiter } from "./rateLimitContext.ts";
import { Dedupe } from "./dedupe.ts";
import {
  MarkSpecifiers,
  NOW,
  PROCESS_START,
  ProfilingConfig,
  UnknownProfileMark,
} from "./profileMeasure.ts";

// deno-lint-ignore ban-types
export type NotFunction<T> = Exclude<T, Function>;

const defaultStream = new ConsoleStream();
const processStartMark: ProfileMark = {
  timestamp: 0,
  opMetrics: {
    ops: {},
    opsDispatched: 0,
    opsDispatchedSync: 0,
    opsDispatchedAsync: 0,
    opsDispatchedAsyncUnref: 0,
    opsCompleted: 0,
    opsCompletedSync: 0,
    opsCompletedAsync: 0,
    opsCompletedAsyncUnref: 0,
    bytesSentControl: 0,
    bytesSentData: 0,
    bytesReceived: 0,
  } as Deno.Metrics,
  memory: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
  label: "Process start",
};

const opticEnvGranted =
  (await Deno.permissions.query({ name: "env", variable: "OPTIC_MIN_LEVEL" }))
    .state == "granted";

export class Logger {
  #name = "default";
  #minLevel: Level = Level.Debug;
  #streams: Stream[] = [defaultStream];
  #filters: Filter[] = [];
  #monitors: Monitor[] = [];
  #transformers: Transformer[] = [];
  #streamAdded = false;
  #meta: LogMetaImpl = new LogMetaImpl();
  #ifCondition = true;
  #enabled = true;
  #rateLimiter = new RateLimiter();
  #rateLimitContext: RateLimitContext | null = null;
  #deduper: Dedupe | null = null;
  #shouldDedupe = false;
  #profilingConfig = new ProfilingConfig();
  #marks: Map<string | symbol, ProfileMark> = new Map();

  constructor(name?: string) {
    this.#marks.set(PROCESS_START, processStartMark);

    if (name) {
      this.#name = name;
      this.#meta.logger = name;
    }

    this.#meta.streamStats.set(
      defaultStream,
      {
        handled: new Map<number, number>(),
        filtered: 0,
        transformed: 0,
        duplicated: 0,
      },
    );

    //TODO check permissions here for meta.unableToReadEnvVar once stable and sync version available

    this.setMinLogLevel();

    // Append footers and destroy loggers on unload of module
    addEventListener("unload", () => {
      this.#deduper?.destroy();
      (this.#meta as LogMeta).sessionEnded = new Date();
      for (const stream of this.#streams) {
        if (stream.logFooter && this.#streamAdded && this.#enabled) {
          stream.logFooter(this.#meta);
        }
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
    if (!this.#enabled) return this;
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
    if (!this.#enabled) return this;
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
      {
        handled: new Map<number, number>(),
        filtered: 0,
        transformed: 0,
        duplicated: 0,
      },
    );
    return this;
  }

  /** Remove stream from the logger */
  removeStream(removeStream: Stream): Logger {
    if (!this.#enabled) return this;
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
    if (!this.#enabled) return this;
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
    if (!this.#enabled) return this;
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
    if (!this.#enabled) return this;
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
    if (!this.#enabled) return this;
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
    if (!this.#enabled) return this;
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
    if (!this.#enabled) return this;
    this.#transformers = this.#transformers.filter((transformer) =>
      transformer !== transformerToRemove
    );
    if (transformerToRemove.destroy) transformerToRemove.destroy();
    return this;
  }

  private getArgsMinLevel(): string | undefined {
    for (let i = 0; i < this.getArgs().length; i++) {
      const arg = this.getArgs()[i];
      if (arg.startsWith("minLogLevel=")) {
        return arg.slice("minLogLevel=".length);
      }
    }
    return undefined;
  }

  private getEnvMinLevel(): string | undefined {
    return opticEnvGranted ? this.getEnv().get("OPTIC_MIN_LEVEL") : undefined;
  }

  private logToStreams<T>(
    level: Level,
    msg: () => T | NotFunction<T>,
    metadata: unknown[],
  ): T | undefined {
    if (!this.#enabled || this.loggingBlocked(level)) {
      this.#ifCondition = true; //reset to true
      this.#rateLimitContext = null;
      return msg instanceof Function ? undefined : msg;
    }
    this.#rateLimitContext = null;
    const resolvedMsg = msg instanceof Function ? msg() : msg;

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

      if (!skip) {
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

          // potentially check for consecutive duplicate logs
          if (!this.#shouldDedupe || !this.#deduper?.isDuplicate(logRecord)) {
            const handled = stream.handle(logRecord);
            if (handled) {
              this.registerStreamHandlingOfLogRecord(stream, level);
            }
          }
        } else {
          // potentially check for consecutive duplicate logs
          if (!this.#shouldDedupe || !this.#deduper?.isDuplicate(logRecord)) {
            const handled = stream.handle(logRecord);
            if (handled) {
              this.registerStreamHandlingOfLogRecord(stream, level);
            }
          }
        }
      }
    }

    return resolvedMsg;
  }

  private registerStreamHandlingOfLogRecord(
    stream: Stream,
    level: number,
  ): void {
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
  trace<T>(msg: NotFunction<T>, ...metadata: unknown[]): T;
  trace<T>(
    msg: () => T | NotFunction<T>,
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.Trace, msg, metadata);
  }

  /**
   * Debug is a low log level used for tracking down issues
   *
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  debug<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  debug<T>(msg: NotFunction<T>, ...metadata: unknown[]): T;
  debug<T>(
    msg: () => T | NotFunction<T>,
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.Debug, msg, metadata);
  }

  /**
   * Info is a mid/low log level used for recording informational messages
   *
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  info<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  info<T>(msg: NotFunction<T>, ...metadata: unknown[]): T;
  info<T>(
    msg: () => T | NotFunction<T>,
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.Info, msg, metadata);
  }

  /**
   * Warn is a mid log level used for recording situations that are unexpected
   * or not quite right, but which are not necessarily causing issues
   *
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  warn<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  warn<T>(
    msg: NotFunction<T>,
    ...metadata: unknown[]
  ): T;
  warn<T>(
    msg: () => T | NotFunction<T>,
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.Warn, msg, metadata);
  }

  /**
   * Error is a high log level used for recording situations where errors are
   * occurring and causing issues
   *
   * @param msg primary log message
   * @param metadata supporting log message data
   */
  error<T>(msg: () => T, ...metadata: unknown[]): T | undefined;
  error<T>(msg: NotFunction<T>, ...metadata: unknown[]): T;
  error<T>(
    msg: () => T | NotFunction<T>,
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.Error, msg, metadata);
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
    msg: NotFunction<T>,
    ...metadata: unknown[]
  ): T;
  critical<T>(
    msg: () => T | NotFunction<T>,
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(Level.Critical, msg, metadata);
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
    msg: NotFunction<T>,
    ...metadata: unknown[]
  ): T;
  log<T>(
    level: Level,
    msg: () => T | NotFunction<T>,
    ...metadata: unknown[]
  ): T | undefined {
    return this.logToStreams(level, msg, metadata);
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

  /**
   * Set this to false to disable the logger completely. Default is true.  A
   * disabled logger is effectively a no-op logger.  Logs are not logged,
   * deferred log message values are not resolved, and removing/adding streams,
   * filters, monitors and transformers are silently ignored with no effect.
   *
   * The only action streams, monitors, filters or transformers will undertake in
   * a disabled logger (and which were added before the logger was disabled) will
   * be to call `destroy()` on unload of the module.
   */
  enabled(condition: boolean): Logger {
    this.#enabled = condition;
    return this;
  }

  /**
   * Causes the next log action to only be recorded at most every x time units.
   *
   * Rate limiters work in a context. The context for the rate limiting is
   * determined, by default, on the amount, unit and log level.  Where two or
   * more `atMostEvery` statements match the same amount/unit/level, the same rate limiter
   * will be used, possibly causing unintended side effects through race
   * conditions on which of the statements will be logged when passing the time
   * constraint.  To avoid this, you can enforce unique contexts by passing in
   * an optional context string.
   *
   * @param amount The number of time units which must pass before the log statement is allowed
   * @param unit The time unit related to the amount
   * @param context Optional unique context label to guarantee no side effects
   * when using multiple rate limiting statements
   */
  atMostEvery(amount: number, unit: TimeUnit, context?: string): this {
    if (!this.#enabled) return this;
    this.#rateLimitContext = new RateLimitContext(amount, unit, context);
    return this;
  }

  /**
   * Causes the next log action to only be recorded every x times.
   *
   * Rate limiters work in a context. The context for the rate limiting is
   * determined, by default, on the amount and log level.  Where two or
   * more `every` statements match the amount/log-level, the same rate limiter
   * will be used, possibly causing unintended side effects through race
   * conditions on which of the statements will be logged when matching the
   * every 'x' condition.  To avoid this, you can enforce unique contexts by
   * passing in an optional context string.
   *
   * @param amount Only log this statement every `amount` times, otherwise skip
   * @param context Optional unique context label to guarantee no side effects
   * when using multiple rate limiting statements
   */
  every(amount: number, context?: string): this {
    if (!this.#enabled) return this;
    this.#rateLimitContext = new RateLimitContext(amount, undefined, context);
    return this;
  }

  /**
   * Turn on or off (default is off) deduplication of log records.  If a log
   * record is deemed to be a duplicate of the previous, and dedupe is enabled,
   * then the log record is skipped and an internal count is incremented. Once
   * a new log record which is not the same is encountered, a log message is
   * first output detailing how many duplicates in a row were encountered.
   *
   * @param shouldDedupe if not specified, then dedupe is enabled
   */
  withDedupe(shouldDedupe?: boolean): this {
    if (!this.#enabled) return this;
    if (shouldDedupe || shouldDedupe === undefined) {
      this.#deduper = new Dedupe(this.#streams, this.#meta);
      this.#shouldDedupe = true;
    } else {
      if (this.#deduper) {
        this.#deduper.destroy();
      }
      this.#shouldDedupe = false;
      this.#deduper = null;
    }
    return this;
  }

  /**
   * @returns the profiling configuration controlling recording and output of the logger profiler
   */
  profilingConfig(): ProfilingConfig {
    return this.#profilingConfig;
  }

  /**
   * Take a profiling snapshot and save for later.  This will record, against the mark,
   * the elapsed time since the process start and, optionally, memory consumption
   * and ops calls (both enabled by default). Percision of the elapsed time is either
   * milliseconds (default) or microseconds (if the `--allow-hrtime` permission is granted)
   *
   * @param label a label to indentify this profiling mark
   */
  mark(label: string): this {
    if (!this.#enabled || !this.#profilingConfig.isEnabled()) return this;
    this.#_mark(label);
    return this;
  }

  #_mark(label: string | symbol): void {
    this.#marks.set(label, {
      label: typeof label === "string" ? label : label.description,
      timestamp: performance.now(),
      ...(this.#profilingConfig.isCaptureMemory() &&
        { memory: Deno.memoryUsage() }),
      ...(this.#profilingConfig.isCaptureOps() &&
        { opMetrics: Deno.metrics() }),
    });
  }

  /**
   * Output to the logs a profiling measure, detailing time taken and, optionally, memory and
   * ops usage between two 'marks'.  A profiling measure may have mark specifiers
   * (determining the start and end of the measurement) and also an optional description. If no
   * mark specifiers are supplied, then the measurement is from process start until 'now'.
   * Note, output to the logs depends on both the logger and profiling capability being enabled (default) and
   * the logger able to output logs at the log level specified in the profiling config (default is Level.Info)
   *
   * Examples:
   * ```typescript
   * logger.mark('my mark');  //capture profiling snapshot
   * logger.measure(); //log profile of process start -> now
   * logger.measure('hello');  //log profile of process start -> now with description 'hello'
   * logger.measure(to('my mark'));  //log profile of process start -> 'my mark'
   * logger.measure(from('my mark')); //log profile of 'my mark' -> now
   * logger.mark('another mark');
   * logger.measure(between('my mark', 'another mark')); //log profile beween 'my mark' and 'another mark'
   * ```
   *
   * Example output:
   * ```
   * Measuring 'my mark' -> 'another mark' (description), took 790ms; heap usage increased 9.2 MB to 11.7 MB; 18 ops dispatched, all completed
   * ```
   */
  measure(): this;
  measure(marks: MarkSpecifiers): this;
  measure(description: string): this;
  measure(marks: MarkSpecifiers, description: string): this;
  measure(
    marksOrDescription?: MarkSpecifiers | string,
    description?: string,
  ): this {
    if (!this.#enabled || !this.#profilingConfig.isEnabled()) return this;

    const inputMarks: MarkSpecifiers | undefined =
      typeof marksOrDescription === "string" ? undefined : marksOrDescription;
    const inputDesc: string | undefined = typeof marksOrDescription === "string"
      ? marksOrDescription
      : description;

    const msg = (): unknown => {
      if (!inputMarks || inputMarks.endMark === NOW) {
        this.#_mark(NOW);
      }
      const startMark: ProfileMark =
        this.#marks.get(inputMarks?.startMark || PROCESS_START) ||
        new UnknownProfileMark(inputMarks!.startMark as string);
      const endMark: ProfileMark =
        this.#marks.get(inputMarks?.endMark || NOW) ||
        new UnknownProfileMark(inputMarks!.endMark as string);
      return this.#profilingConfig.getFormatter().format(
        startMark,
        endMark,
        inputDesc,
      );
    };
    this.logToStreams(this.#profilingConfig.getLogLevel(), msg, []);
    return this;
  }

  protected getArgs(): string[] {
    return (Deno as { args?: string[] }).args ?? [];
  }

  protected getEnv(): { get(key: string): string | undefined } {
    return Deno.env;
  }

  protected loggingBlocked(level: Level): boolean {
    if (this.#minLevel > level || !this.#ifCondition) {
      return true;
    }

    if (
      this.#rateLimitContext &&
      this.#rateLimiter.isRateLimited(this.#rateLimitContext, level)
    ) {
      return true;
    }

    return false;
  }
  protected getMarks(): Map<string | symbol, ProfileMark> {
    return this.#marks;
  }
}
