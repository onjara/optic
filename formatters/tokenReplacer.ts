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

/**
 * A formatter which allows you to use tokens in a string for place
 * substitutions of log record fields.  Tokens are wrapped in curly 
 * brackets, e.g. {msg}, and must correspond to one of `{dateTime}`, `{level}`,
 * `{msg}` or `{metadata}`.  Unrecognized tokens will be left unmodified.
 *
 * Examples:
 * ```
 * "[{dateTime}] {level} {msg} {metadata}"
 * "Date: {dateTime} Level: {level} Data: {msg} [{metadata}]"
 * ```
 */
export class TokenReplacer implements Formatter<string> {
  #formatString = "{dateTime} {level} {msg} {metadata}";
  #levelPadding = 0;
  #withColor = false;
  #dateTimeFormatter: DateTimeFormatter = {
    formatDateTime: (date: Date) => date.toISOString(),
  };

  /** If no tokens are supplied, the default format of 
   * `"{dateTime} {level} {msg} {metadata}"` is used */
  constructor(tokens?: string) {
    if (tokens) this.#formatString = tokens;
    this.#levelPadding = longestLevelName();
  }

  /** Get the token string used in formatting messages */
  get formatString(): string {
    return this.#formatString;
  }

  /** Get the fixed length that level should be printed at */
  get levelPadding(): number {
    return this.#levelPadding;
  }

  /** Returns true if log messages are output in color */
  isColor(): boolean {
    return this.#withColor;
  }

  /**
   * To make logs more consistent in format, this functionality allows you
   * to set the minimum length output for the level.  E.g. if the levelPadding
   * is set to 10 and a debug log message is formatted, then you will get:
   * ```
   * "DEBUG     "
   * ```
   * This can help ensure that the next field will start at the same position
   * regardless of the length of the level.  This advantage requires that any
   * preceding fields are also of fixed length.
   * 
   * @param padding min length to pad the {level} token value
   */
  withLevelPadding(padding: number): TokenReplacer {
    this.#levelPadding = padding;
    return this;
  }

  /**
   * Allows the ability of the formatter to apply custom formatting to the 
   * log message date/time.
   * 
   * @param dtf a custom date formatter function, a `DateTimeFormatter` 
   * implementation, or a `SimpleDateTimeFormatter` format string (see
   * `SimpleDateTimeFormatter` for details)
   */
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

  /**
   * For environments which support colored output, this allows you to turn on
   * and off color formatting of logs. Default is false;
   * 
   * @param on If true or unspecified, logs will be output in color
   */
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
