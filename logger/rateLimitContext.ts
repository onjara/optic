// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import type { TimeUnit } from "../types.ts";
import type { Level } from "./levels.ts";

export class RateLimiter {
  #contexts = new Map<string, number>();

  isRateLimited(rlc: RateLimitContext, level: Level): boolean {
    const context = rlc.getContext(level);
    const contextState: number | undefined = this.#contexts.get(context);

    if (contextState === undefined) {
      // First visit for this context
      if (rlc.unit) {
        // atMostEvery
        this.#contexts.set(
          context,
          new Date().getTime() + (rlc.unit.getMilliseconds() * rlc.amount),
        );
      } else {
        // every
        this.#contexts.set(context, 0);
      }
      return false;
    } else if (rlc.unit) {
      // Second or more visit for 'atMostEvery'
      if (new Date().getTime() > contextState) {
        // min time has passed, allow this log record
        this.#contexts.set(
          context,
          new Date().getTime() + (rlc.unit.getMilliseconds() * rlc.amount),
        );
        return false;
      }
      // else still within constraint
      return true;
    } else {
      // Second or more visit for 'every'
      if (contextState + 1 === rlc.amount) {
        // amount matched, allows this log record
        this.#contexts.set(context, 0);
        return false;
      }
      // else still within constraint
      this.#contexts.set(context, contextState + 1);
      return true;
    }
  }

  protected getContexts(): Map<string, number> {
    return this.#contexts;
  }
}

export class RateLimitContext {
  readonly amount: number;
  readonly unit: TimeUnit | undefined;
  readonly context: string | undefined;

  constructor(amount: number, unit?: TimeUnit, context?: string) {
    this.amount = amount;
    this.unit = unit;
    this.context = context;
  }

  getContext(level: Level): string {
    return "" +
      this.amount +
      (this.unit ? "." + this.unit.getMilliseconds() : "") +
      (this.context ? "." + this.context : "") +
      "." + level;
  }
}
