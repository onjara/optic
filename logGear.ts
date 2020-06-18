import { Logger } from "./logger/logger.ts";

export class LogGear {
  private constructor() {}

  static newLogger(): Logger {
    return new Logger();
  }
}
