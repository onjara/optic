import {
  LogRecord,
  Formatter,
  DateTimeFormatterFn,
  DateTimeFormatter,
} from "../types.ts";
import { SimpleDateTimeFormatter } from "./dateTimeFormatter.ts";
import { asString } from "./asString.ts";
import { longestLevelName, levelToName } from "../logger/levels.ts";
import { getColorForLevel } from "./color.ts";

export class TokenReplacer implements Formatter<string> {
  #formatString = "{dateTime} {level} {msg} {metadata}";
  #levelPadding = 0;
  #withColor = false;
  #dateTimeFormatter: DateTimeFormatter = {
    formatDateTime: (date: Date) => date.toISOString(),
  };

  constructor(tokens?: string) {
    if (tokens) this.#formatString = tokens;
    this.#levelPadding = longestLevelName();
  }

  get formatString(): string {
    return this.#formatString;
  }

  get levelPadding(): number {
    return this.#levelPadding;
  }

  isColor(): boolean {
    return this.#withColor;
  }

  withLevelPadding(padding: number): TokenReplacer {
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
    let formattedMsg = this.#formatString;
    formattedMsg = formattedMsg.replace(
      "{dateTime}",
      this.#dateTimeFormatter.formatDateTime(logRecord.dateTime),
    );
    formattedMsg = formattedMsg.replace(
      "{level}",
      levelToName(logRecord.level)?.padEnd(this.#levelPadding, " ") ||
        "UNKNOWN",
    );
    formattedMsg = formattedMsg.replace("{msg}", asString(logRecord.msg));

    let metadataReplacement = "";
    if (logRecord.metadata.length > 0) {
      for (const metaItem of logRecord.metadata) {
        metadataReplacement += asString(metaItem) + " ";
      }
      metadataReplacement = metadataReplacement.slice(0, -1);
    }
    formattedMsg = formattedMsg.replace("{metadata}", metadataReplacement);

    if (this.#withColor && globalThis.Deno) {
      const colorize = getColorForLevel(logRecord.level);
      formattedMsg = colorize ? colorize(formattedMsg) : formattedMsg;
    }
    return formattedMsg;
  }
}
