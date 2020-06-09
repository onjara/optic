import {
  LogRecord,
  Formatter,
  DateTimeFormatterFn,
  DateTimeFormatter,
} from "../types.ts";
import { levelMap, levelNameMap } from "../levels.ts";
import { colorRules } from "./color.ts";
import { SimpleDateTimeFormatter } from "./dateTimeFormatter.ts";

export class TokenReplacer implements Formatter<string> {
  #format = "{dateTime} {level} {msg} {metadata}";
  #levelPadding = 0;
  #withColor = false;
  #dateTimeFormatter: DateTimeFormatter = {
    formatDateTime: (date: Date) => date.toISOString(),
  };

  constructor(tokens?: string) {
    if (tokens) this.#format = tokens;
    for (let key of levelNameMap.keys()) {
      this.#levelPadding = key.length > this.#levelPadding
        ? key.length
        : this.#levelPadding;
    }
  }

  levelPadding(padding: number): TokenReplacer {
    this.#levelPadding = padding;
    return this;
  }

  withDateTimeFormat(
    dtf: DateTimeFormatterFn | DateTimeFormatter | string,
  ): TokenReplacer {
    if (typeof dtf === "string") {
      dtf = new SimpleDateTimeFormatter(dtf);
    } else if (typeof dtf === "function") {
      dtf = { formatDateTime: dtf };
    }
    this.#dateTimeFormatter = dtf;
    return this;
  }

  withColor(on?: boolean): TokenReplacer {
    if (on === undefined) this.#withColor = true;
    else this.#withColor = on;
    return this;
  }

  format(logRecord: LogRecord): string {
    let formattedMsg = this.#format;
    formattedMsg = formattedMsg.replace(
      "{dateTime}",
      this.#dateTimeFormatter.formatDateTime(logRecord.dateTime),
    );
    formattedMsg = formattedMsg.replace(
      "{level}",
      levelMap.get(logRecord.level)?.padEnd(this.#levelPadding, " ") ||
        "UNKNOWN",
    );
    formattedMsg = formattedMsg.replace("{msg}", this.asString(logRecord.msg));
    formattedMsg = formattedMsg.replace(
      "{metadata}",
      logRecord.metadata.length === 0 ? "" : this.asString(logRecord.metadata),
    );

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
    } else if (data instanceof Error) {
      return data.stack ? data.stack : "Undefined Error";
    } else if (typeof data === "object") {
      return JSON.stringify(data);
    }
    return "undefined";
  }
}
