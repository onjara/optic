// Copyright 2022 the optic authors. All rights reserved. MIT license.

/** The strategy to take when initializing logs:
 * * `"append"` - Reuse log file if it exists, create otherwise
 * * `"overwrite"` - Always start with an empty log file, overwriting any existing one
 * * `"mustNotExist"` - Always start with an empty log file, but throw an error if it
 * already exists
 */
export type LogFileInitStrategy = "append" | "overwrite" | "mustNotExist";
export type Periods = "minutes" | "hours" | "days";

export interface RotationStrategy {
  /**
   * On logger initialization, initLogs will be called to clean up any old logs
   * or other initialization required here.
   */
  initLogs(filename: string, initStrategy: LogFileInitStrategy): void;

  /**
   * Given a log message, return true if the logs should rotate
   */
  shouldRotate(logMessage?: unknown): boolean;

  /**
   * Carry out a rotation of the logs
   */
  rotate(filename: string, logMessage: unknown): void;

  /**
   * Specify how many or for how log files are kept. Examples:
   * ```typescript
   * of(20).files()
   * of(7).days()
   * of(12).hours()
   * of(125).minutes()
   * ```
   */
  withLogFileRetentionPolicy(
    logFileRetentionPolicy: LogFileRetentionPolicy,
  ): this;
}
export interface LogFileRetentionPolicy {
  /** The number of units to retain log files for */
  readonly quantity: number;

  /** The type of units to retain logs files for (e.g. 'files', 'days', etc.) */
  readonly type: string;

  /** For date/time based retention policies, this is the oldest allowable date
   * to retain log files for */
  oldestRetentionDate(): Date;
}
