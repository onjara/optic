import { Logger } from "./logger/logger.ts";

export { RegExFilter } from "./filters/regExFilter.ts";
export { SubStringFilter } from "./filters/subStringFilter.ts";
export { ColorRule, getColorForLevel } from "./formatters/color.ts";
export { JsonFormatter } from "./formatters/json.ts";
export { TokenReplacer } from "./formatters/tokenReplacer.ts";
export { SimpleDateTimeFormatter } from "./formatters/simpleDateTimeFormatter.ts";
export * from "./logger/levels.ts";
export { Logger } from "./logger/logger.ts";
export { PropertyRedaction } from "./obfuscators/propertyRedaction.ts";
export { RegExReplacer } from "./obfuscators/regExReplacer.ts";
export { BaseStream } from "./streams/baseStream.ts";
export { ConsoleStream } from "./streams/consoleStream.ts";
export * from "./types.ts";

const state = new Map<string, Logger>();

export class Optic {
  private constructor() {}

  static logger(name?: string): Logger {
    let loggerName = name;
    if (!loggerName) {
      loggerName = "default";
    }
    if (state.has(loggerName)) {
      return state.get(loggerName)!;
    } else {
      const logger = new Logger(loggerName);
      state.set(loggerName, logger);
      return logger;
    }
  }
}
