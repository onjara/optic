// Copyright 2021 the optic authors. All rights reserved. MIT license.

import { Level } from "../mod.ts";
import { MeasureFormatter, ProfileMark } from "../types.ts";
import { formatBytes, formatMs } from "../utils/numberFormatter.ts";

/**
 * Raw interface for specifying the start and end profile marks for a profile measure.
 * `from`, `to` and `between` functions should be preferred to generate a MarkSpecifier
 */
export interface MarkSpecifiers {
  startMark: string | symbol;
  endMark: string | symbol;
}

/**
 * Represents an unknown profile mark where a user has specified a mark which doesn't exist
 */
export class UnknownProfileMark implements ProfileMark {
  readonly timestamp = -1;
  readonly markName: string;
  constructor(markName: string) {
    this.markName = markName;
  }
}

/**
 * Represents the mark label for the start of the process
 */
export const PROCESS_START = Symbol("Process start");

/**
 * Represents the mark label for 'now'
 */
export const NOW = Symbol("Now");

/**
 * @param mark
 * @returns Generates MarkSpecifiers representing the measure between `mark` and `now`
 */
export function from(mark: string): MarkSpecifiers {
  return {
    startMark: mark,
    endMark: NOW,
  };
}

/**
 * @param mark
 * @returns Generates MarkSpecifiers representing the measure between `process start` and `mark`
 */
export function to(mark: string): MarkSpecifiers {
  return {
    startMark: PROCESS_START,
    endMark: mark,
  };
}

/**
 * @param start
 * @param end
 * @returns Generates MarkSpecifiers representing the measure bewteen `start` and `end`
 */
export function between(start: string, end: string): MarkSpecifiers {
  return {
    startMark: start,
    endMark: end,
  };
}

/**
 * Represents the configuration of the profiling capabilities in the logger
 */
export class ProfilingConfig {
  #enabled = true;
  #captureMemory = true;
  #captureOps = true;
  #logLevel = Level.Info;
  #formatter: MeasureFormatter<unknown> = new SummaryMeasureFormatter();

  /** Enable (default) or disable the profiling capability.  When disabled, profiling becomes noop */
  enabled(enabled: boolean): this {
    this.#enabled = enabled;
    return this;
  }
  /** Enable (default) or disable capturing of memory */
  captureMemory(captureMemory: boolean): this {
    this.#captureMemory = captureMemory;
    return this;
  }
  /** Enable (default) or disable capturing of op metrics */
  captureOps(captureOps: boolean): this {
    this.#captureOps = captureOps;
    return this;
  }
  /** Set the log level at which the profiling is output (default is Level.Info) */
  withLogLevel(level: Level): this {
    this.#logLevel = level;
    return this;
  }
  /** Set the formatter to use to output the profile measure to the logs with (default is SummaryMeasureFormatter) */
  withFormatter(formatter: MeasureFormatter<unknown>): this {
    this.#formatter = formatter;
    return this;
  }
  /** returns true if enabled */
  isEnabled(): boolean {
    return this.#enabled;
  }
  /** returns true if profiling will capture memory details */
  isCaptureMemory(): boolean {
    return this.#captureMemory;
  }
  /** returns true if profiling will capture op metrics */
  isCaptureOps(): boolean {
    return this.#captureOps;
  }
  /** returns the log level at which profile measures will be output in the logs */
  getLogLevel(): Level {
    return this.#logLevel;
  }
  /** returns the formatter used to output the profile measure to the logs */
  getFormatter(): MeasureFormatter<unknown> {
    return this.#formatter;
  }
}
/**
 * The default formatter to output profile measures to the logs.  Example output:
 * `Measuring start -> end (label), took 1,432ms; heap usage increased 503kb to 3425kb; 1 ops dispatched, all completed`
 */
export class SummaryMeasureFormatter implements MeasureFormatter<string> {
  format(
    startMark: ProfileMark,
    endMark: ProfileMark,
    description?: string,
  ): string {
    if (startMark instanceof UnknownProfileMark) {
      return "Unable to record measure. Unknown start mark of '" +
        (startMark as UnknownProfileMark).markName + "'";
    } else if (endMark instanceof UnknownProfileMark) {
      return "Unable to record measure. Unknown end mark of '" +
        (endMark as UnknownProfileMark).markName + "'";
    }

    let output = "Measuring '" + startMark.label + "' -> '" + endMark.label +
      "'";
    if (description) {
      output += " (" + description + ")";
    }
    output += ", took " + formatMs(endMark.timestamp - startMark.timestamp);

    if (startMark.memory && endMark.memory) {
      const heapDiff = endMark.memory.heapUsed - startMark.memory.heapUsed;
      if (startMark.memory.heapUsed === 0) {
        output += "; heap usage is " + formatBytes(Math.abs(heapDiff));
      } else {
        output += "; heap usage " +
          (heapDiff > 0 ? "increased " : "decreased ");
        output += formatBytes(Math.abs(heapDiff));
        output += " to " + formatBytes(endMark.memory.heapUsed);
      }
    }

    if (startMark.opMetrics && endMark.opMetrics) {
      const opsDispatched = endMark.opMetrics.opsDispatched -
        startMark.opMetrics.opsDispatched;
      const opsNotCompleted = endMark.opMetrics.opsDispatched -
        endMark.opMetrics.opsCompleted;
      if (opsDispatched === 0) {
        output += "; no ops dispatched, ";
      } else {
        output += "; " + opsDispatched + " ops dispatched, ";
      }
      if (opsNotCompleted === 0) {
        output += "all completed";
      } else {
        output += opsNotCompleted + " ops still to complete";
      }
    }
    return output;
  }
}
