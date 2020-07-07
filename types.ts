import { Level } from "./logger/levels.ts";

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
  handle(logRecord: LogRecord): void;
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
}

/**
 * Define an obfuscator for redacting part of a log record.  The output will
 * be either the same log record, untouched, or a new log record based on the
 * original, but with one or more properties redacted partly or in full.
 */
export type ObfuscatorFn = (stream: Stream, logRecord: LogRecord) => LogRecord;

/**
 * Interface for defining a class to model logic for obfuscating log records
 */
export interface Obfuscator {
  obfuscate: ObfuscatorFn;
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
  /** The min log level of the logger */
  minLogLevel: Level;
  /** Where the min log level was sourced from */
  minLogLevelFrom: string;
  /** The name of the logger for this metadata */
  readonly logger: string;
}
