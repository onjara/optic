import { Level, levelNameMap } from "./levels.ts";
import {
  Stream,
  FilterFn,
  Filter,
  TriggerFn,
  Trigger,
  Obfuscator,
  ObfuscatorFn,
  LogRecord,
  LogMeta,
} from "./types.ts";
import { ConsoleStream } from "./streams/consoleStream.ts";
import { ImmutableLogRecord } from "./logRecord.ts";

class LogMetaImpl implements LogMeta {
  logCount: Map<Level, number> = new Map<Level, number>();
  minLogLevel: Level = Level.DEBUG;
  minLogLevelFrom: string = "default value";
  readonly hostname = "unavailable";
  unableToReadEnvVar = false;
}

export class Logger {
  #minLevel: Level = Level.DEBUG;
  #streams: Stream[] = [new ConsoleStream()];
  #filters: Filter[] = [];
  #triggers: Trigger[] = [];
  #obfuscators: Obfuscator[] = [];
  #streamAdded = false;
  #meta: LogMetaImpl = new LogMetaImpl();

  constructor() {
    //TODO check permissions here for meta.unableToReadEnvVar once stable

    const argsMinLevel = this.getArgsMinLevel();
    if (
      argsMinLevel !== undefined &&
      levelNameMap.get(argsMinLevel) !== undefined
    ) {
      this.#minLevel = levelNameMap.get(argsMinLevel)!;
      this.#meta.minLogLevelFrom = "command line arguments";
      this.#meta.minLogLevel = this.#minLevel;
    } else {
      // Set min log level for logger from env variable
      const envDefaultMinLevel = this.getEnvMinLevel();
      if (
        envDefaultMinLevel && levelNameMap.get(envDefaultMinLevel) !== undefined
      ) {
        this.#minLevel = levelNameMap.get(envDefaultMinLevel)!;
        this.#meta.minLogLevelFrom = "environment variable";
        this.#meta.minLogLevel = this.#minLevel;
      }
    }

    addEventListener("unload", () => {
      for (const stream of this.#streams) {
        if (stream.logFooter) stream.logFooter(this.#meta);
        if (stream.destroy) stream.destroy();
      }
    });
  }

  level(level: Level): Logger {
    this.#minLevel = level;
    this.#meta.minLogLevelFrom = "logger.level()";
    this.#meta.minLogLevel = this.#minLevel;
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
    if (stream.logHeader) stream.logHeader(this.#meta);
    return this;
  }

  removeStream(removeStream: Stream): Logger {
    this.#streams = this.#streams.filter((stream) => stream !== removeStream);
    if (removeStream.logFooter) removeStream.logFooter(this.#meta);
    if (removeStream.destroy) removeStream.destroy();
    return this;
  }

  addTrigger(trigger: Trigger | TriggerFn): Logger {
    if (typeof trigger === "function") {
      trigger = { check: trigger };
    }
    this.#triggers.push(trigger);
    return this;
  }

  removeTrigger(triggerToRemove: Trigger): Logger {
    this.#triggers = this.#triggers.filter((trigger) =>
      trigger !== triggerToRemove
    );
    return this;
  }

  addFilter(filter: Filter | FilterFn): Logger {
    if (typeof filter === "function") {
      filter = { shouldFilterOut: filter };
    }
    this.#filters.push(filter);
    return this;
  }

  removeFilter(filterToRemove: Filter): Logger {
    this.#filters = this.#filters.filter((filter) => filter !== filterToRemove);
    return this;
  }

  addObfuscator(obfuscator: Obfuscator | ObfuscatorFn): Logger {
    if (typeof obfuscator === "function") {
      obfuscator = { obfuscate: obfuscator };
    }
    this.#obfuscators.push(obfuscator);
    return this;
  }

  removeObfuscator(obfuscatorToRemove: Obfuscator): Logger {
    this.#obfuscators = this.#obfuscators.filter((obfuscator) =>
      obfuscator !== obfuscatorToRemove
    );
    return this;
  }

  getArgsMinLevel(): string | undefined {
    for (let i = 0; i < Deno.args.length; i++) {
      let arg = Deno.args[i];
      if (arg.startsWith("minLogLevel=")) {
        return arg.slice("minLogLevel=".length);
      }
    }
    return undefined;
  }

  getEnvMinLevel(): string | undefined {
    try {
      return Deno.env.get("LOGGEAR_MIN_LEVEL");
    } catch (err) {
      this.#meta.unableToReadEnvVar = true;
      return undefined;
    }
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

    let logRecord: LogRecord = new ImmutableLogRecord(
      resolvedMsg,
      metadata,
      level,
    );

    // Check triggers
    for (let i = 0; i < this.#triggers.length; i++) {
      this.#triggers[i].check(logRecord);
    }

    // Process streams
    for (let i = 0; i < this.#streams.length; i++) {
      const stream = this.#streams[i];
      let skip = false;

      // Apply Filters
      for (let j = 0; j < this.#filters.length && !skip; j++) {
        if (this.#filters[j].shouldFilterOut(stream, logRecord)) {
          skip = true;
        }
      }

      // Apply obfuscators
      for (let j = 0; j < this.#obfuscators.length && !skip; j++) {
        logRecord = this.#obfuscators[j].obfuscate(stream, logRecord);
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
