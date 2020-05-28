import { Stream, LogRecord } from "../types.ts";
import { Level, levelMap } from "../levels.ts";
import {
  yellow,
  gray,
  red,
  bold,
  blue,
} from "https://deno.land/std@0.51.0/fmt/colors.ts";
import { BaseStream, FormatterFunction } from "./baseStream.ts";

export type ColorRule = (msg: string) => string;

export class ConsoleStream extends BaseStream<string> {
  #colorEnabled = true;
  #colorRules: Map<Level, ColorRule> = new Map<Level, ColorRule>();

  constructor() {
    super();
    this.#colorRules.set(Level.DEBUG, (msg: string) => gray(msg));
    this.#colorRules.set(Level.INFO, (msg: string) => blue(msg));
    this.#colorRules.set(Level.WARNING, (msg: string) => yellow(msg));
    this.#colorRules.set(Level.ERROR, (msg: string) => red(msg));
    this.#colorRules.set(Level.CRITICAL, (msg: string) => bold(red(msg)));
  }

  async setup():Promise<void> {}
  async destroy(): Promise<void> {}

  getDefaultFormatFunction(): FormatterFunction<string> {
    return (logRecord: LogRecord) => {
      // TODO - break dependency on Deno here.
      let msg = Deno.inspect(logRecord.msg);
      if (logRecord.metadata.length > 0) {
        msg += ', ' + Deno.inspect(logRecord.metadata);
      }

      return msg;
    };
  };

  level(level: Level): ConsoleStream {
    this.minLevel = level;
    return this;
  }

  colorEnabled(enable: boolean): ConsoleStream {
    this.#colorEnabled = enable;
    return this;
  }

  format(logRecord: LogRecord): string {
    let msg = super.format(logRecord);
    if (this.#colorEnabled) {
      const colorize = this.#colorRules.get(logRecord.level);
      if (colorize) {
        msg = colorize(msg);
      }
    }
    return msg;    
  }

  log(msg: string): void {
    console.log(msg);
  }
}
