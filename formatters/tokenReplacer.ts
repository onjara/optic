import { LogRecord, Formatter } from "../types.ts";
import { levelMap } from "../levels.ts";
import { colorRules } from "./color.ts";

export class TokenReplacer implements Formatter<string> {
  #format = "{dateTime} {level} {msg} {metadata}";
  #levelPadding = 8;
  #withColor = false;

  constructor(tokens?: string) {
    if (tokens) this.#format = tokens;
  }

  levelPadding(padding: number): TokenReplacer {
    this.#levelPadding = padding;
    return this;
  }

  withColor(on?: boolean): TokenReplacer {
    if (on === undefined) this.#withColor = true;
    else this.#withColor = on;
    return this;
  }

  format(logRecord: LogRecord): string {
    let formattedMsg = this.#format.replace(/{(\S+)}/g, (match, p1): string => {
      const value = logRecord[p1 as keyof LogRecord];

      // don't replace missing values
      if (!value) return match;
      else if (
        p1 === "level"
      ) {
        return levelMap.get(value as number)?.padEnd(this.#levelPadding, " ") ||
          "UNKNOWN";
      } else if (p1 === "metadata" && logRecord.metadata.length === 0) {
        return "";
      } else return this.asString(value);
    });

    if (this.#withColor && globalThis.Deno) {
      const colorize = colorRules.get(logRecord.level);
      formattedMsg = colorize ? colorize(formattedMsg) : formattedMsg;
    }
    return formattedMsg;
  }

  private asString(data: unknown): string {
    if (typeof data === "string") {
      return data;
    } else if (
      data === null ||
      typeof data === "number" ||
      typeof data === "bigint" ||
      typeof data === "boolean" ||
      typeof data === "undefined"
    ) {
      return `${data}`;
    } else if (typeof data === "symbol") {
      return String(data);
    } else if (typeof data === "function") {
      return "undefined";
    } else if (data instanceof Date) {
      return data.toISOString();
    } else if (typeof data === "object") {
      return JSON.stringify(data);
    }
    return "undefined";
  }
}
