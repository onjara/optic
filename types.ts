// Copyright 2020 the optic authors. All rights reserved. MIT license.
import type { Level } from "./logger/levels.ts";

/**
 * Defines the flow of log records to a logging endpoint
 */
export interface Stream {
  /**
   * Optional.  If implemented, this method is called after the stream is
   * setup in the logger and provides the opportunity for the stream to output
   * log header records.
   * 
   * @param meta Contains metadata from the Logger instance
   */
  logHeader?(meta: LogMeta): void;

  /**
   * Optional.  If implemented, this method is called after the stream is
   * destroyed via the logger and provides the opportunity for the stream to
   * output log footer records.
   * 
   * @param meta Contains metadata from the Logger instance
   */
  logFooter?(meta: LogMeta): void;

  /**
   * Optional.  Provides the opportunity for the stream to perform any required
   * setup.  This function is called when the stream is added to the logger.
   */
  setup?(): void;

  /**
   * Optional.  Provides the opportunity for the stream to perform any required
   * teardown.  This function is called when the stream is removed from the 
   * logger or the module exits
   */
  destroy?(): void;

  /**
   * Handle the populated log record.  This will, for example, format the log
   * record and publish the resulting record to the end point.
   * 
   * @param logRecord 
   */
  handle(logRecord: LogRecord): boolean;
}

/**
 * Interface for formatting log records
 */
export interface Formatter<T> {
  /**
   * Given a logRecord instance, format it for output to the stream endpoint
   * @param logRecord 
   */
  format(logRecord: LogRecord): T;
}

/**
 * Define a function type for formatting Date to string
 */
export type DateTimeFormatterFn = (dateTime: Date) => string;

/**
 * Interface for defining a class to format a Date to string
 */
export interface DateTimeFormatter {
  formatDateTime: DateTimeFormatterFn;
}

/**
 * Define a monitor.  Monitors spy on log records and do not interfere in any
 * way with the log process. Monitors may take additional actions based on 
 * conditions met by the log record, collect stats, etc..
 */
export type MonitorFn = (logRecord: LogRecord) => void;

/**
 * Interface for defining a class to monitor log records and optionally take
 * action
 */
export interface Monitor {
  check: MonitorFn;

  /**
   * Optional.  Provides the opportunity for the monitor to perform any required
   * setup.  This function is called when the monitor is added to the logger.
   */
  setup?(): void;

  /**
   * Optional.  Provides the opportunity for the monitor to perform any required
   * teardown.  This function is called when the monitor is removed from the 
   * logger or the module exits
   */
  destroy?(): void;
}

/**
 * Define a filter which takes in a stream and logRecord and returns true
 * if the log record should be filtered out for this stream.
 */
export type FilterFn = (stream: Stream, logRecord: LogRecord) => boolean;

/**
 * Interface for defining a class to model logic for filtering out log
 * records from streams
 */
export interface Filter {
  shouldFilterOut: FilterFn;

  /**
   * Optional.  Provides the opportunity for the filter to perform any required
   * setup.  This function is called when the filter is added to the logger.
   */
  setup?(): void;

  /**
   * Optional.  Provides the opportunity for the filter to perform any required
   * teardown.  This function is called when the filter is removed from the 
   * logger or the module exits
   */
  destroy?(): void;
}

/**
 * Define an transformer for transforming a log record.  The output will
 * be either the same log record, untouched, or a new log record based on the
 * original, but with one or more change present.
 */
export type TransformerFn = (stream: Stream, logRecord: LogRecord) => LogRecord;

/**
 * Interface for defining a class to model logic for transforming log records
 */
export interface Transformer {
  transform: TransformerFn;

  /**
   * Optional.  Provides the opportunity for the transformer to perform any required
   * setup.  This function is called when the transformer is added to the logger.
   */
  setup?(): void;

  /**
   * Optional.  Provides the opportunity for the transformer to perform any required
   * teardown.  This function is called when the transformer is removed from the 
   * logger or the module exits
   */
  destroy?(): void;
}

/**
 * The core data captured during a log event
 */
export interface LogRecord {
  /** The primary log message */
  readonly msg: unknown;
  /** Supporting metadata for the log event */
  readonly metadata: unknown[];
  /** The date and time the log event was initiated */
  readonly dateTime: Date;
  /** The log level for this event */
  readonly level: Level;
  /** The name of the logger which created the log record */
  readonly logger: string;
}

/**
 * Metadata around the logger itself, used for outputting headers and footers
 * in the logging endpoint
 */
export interface LogMeta {
  /** The hostname the process is running on */
  readonly hostname: string;
  /** The date and time the logging session started */
  readonly sessionStarted: Date;
  /** The date and time the logging session ended (or undefined if still active)*/
  sessionEnded?: Date;
  /** The min log level of the logger */
  minLogLevel: Level;
  /** Where the min log level was sourced from */
  minLogLevelFrom: string;
  /** The name of the logger for this metadata */
  readonly logger: string;
  /** Count of handled (Map of Level -> count), filtered and transformed records by stream */
  readonly streamStats: Map<
    Stream,
    { handled: Map<number, number>; filtered: number; transformed: number }
  >;
  /** Number of filters added.  (Removed filters do not subtract from this total) */
  readonly filters: number;
  /** Number of transformers added.  (Removed transformers do not subtract from this total) */
  readonly transformers: number;
  /** Number of monitors added.  (Removed monitors do not subtract from this total) */
  readonly monitors: number;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class IllegalStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalStateError";
  }
}

export class TimeUnit {
  public static MILLISECONDS = new TimeUnit(1);
  public static SECONDS = new TimeUnit(1000);
  public static MINUTES = new TimeUnit(60000);
  public static HOURS = new TimeUnit(3600000);
  public static DAYS = new TimeUnit(86400000);

  private constructor(private milliseconds: number) {}

  getMilliseconds(): number {
    return this.milliseconds;
  }
}
