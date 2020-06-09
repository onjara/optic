import { Logger } from "./logger.ts";

export class LogGear {
  private constructor() {}

  static newLogger(): Logger {
    return new Logger();
  }
}
