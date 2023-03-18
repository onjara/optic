// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import type { LogFileRetentionPolicy, Periods } from "./types.ts";
import { IllegalStateError, ValidationError } from "../../types.ts";

/**
 * Used for building a LogFileRetentionPolicy
 * @param quantity number of files or date/time units to retain logs for
 */
export function of(quantity: number): OngoingLogFileRetentionPolicy {
  return new OngoingLogFileRetentionPolicy(quantity);
}

class OngoingLogFileRetentionPolicy {
  constructor(private quantity: number) {}
  files(): LogFileRetentionPolicy {
    return new LogFileRetentionPolicyImpl(this.quantity, "files");
  }
  days(): LogFileRetentionPolicy {
    return new LogFileRetentionPolicyImpl(this.quantity, "days");
  }
  hours(): LogFileRetentionPolicy {
    return new LogFileRetentionPolicyImpl(this.quantity, "hours");
  }
  minutes(): LogFileRetentionPolicy {
    return new LogFileRetentionPolicyImpl(this.quantity, "minutes");
  }
}

export class LogFileRetentionPolicyImpl implements LogFileRetentionPolicy {
  #quantity: number;
  #type: "files" | Periods;

  constructor(quantity: number, type: "files" | Periods) {
    if (quantity < 2 && type == "files") {
      throw new ValidationError(
        "Log retention of type 'files' must have a quantity greater than 1",
      );
    } else if (quantity < 1 && type != "files") {
      throw new ValidationError(
        "Date/time based log retention must have quantity greater than 0",
      );
    }

    this.#quantity = quantity;
    this.#type = type;
  }

  get quantity(): number {
    return this.#quantity;
  }

  get type(): "files" | Periods {
    return this.#type;
  }

  oldestRetentionDate(): Date {
    const d = new Date();
    if (this.#type === "files") {
      throw new IllegalStateError(
        "Oldest Retention Date is meaningless for retention strategy of 'files'",
      );
    }
    if (this.#type === "days") d.setDate(d.getDate() - this.#quantity);
    if (this.#type === "hours") d.setHours(d.getHours() - this.#quantity);
    if (this.#type === "minutes") d.setMinutes(d.getMinutes() - this.#quantity);
    return d;
  }
}
