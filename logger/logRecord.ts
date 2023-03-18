// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import type { LogRecord } from "../types.ts";
import type { Level } from "./levels.ts";

/**
 * An immutable representation of LogRecord
 */
export class ImmutableLogRecord implements LogRecord {
  readonly msg: unknown;
  #metadata: unknown[];
  #dateTime: Date;
  readonly level: Level;
  readonly logger: string;

  constructor(msg: unknown, metadata: unknown[], level: Level, name: string) {
    this.msg = msg;
    this.#metadata = [...metadata];
    this.level = level;
    this.#dateTime = new Date();
    this.logger = name;
  }
  get metadata(): unknown[] {
    return [...this.#metadata];
  }
  get dateTime(): Date {
    return new Date(this.#dateTime.getTime());
  }
}
