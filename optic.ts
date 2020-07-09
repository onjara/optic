import { Logger } from "./logger/logger.ts";

export class Optic {
  private constructor() {}

  static newLogger(): Logger {
    return new Logger();
  }
}
