import {
  Formatter,
  LogRecord,
  DateTimeFormatter,
  DateTimeFormatterFn,
  ValidationError,
} from "../types.ts";
import { levelToName } from "../logger/levels.ts";
import { SimpleDateTimeFormatter } from "./simpleDateTimeFormatter.ts";
import { stringify } from "./stringify.ts";

type Fields = "msg" | "metadata" | "level" | "dateTime" | "logger";

/**
 * A formatter to output the log record in json format.  You may optionally
 * specify which fields to output and pretty print the resulting json object
 * as well.
 */
export class JsonFormatter implements Formatter<string> {
  #fields: Fields[] = ["dateTime", "level", "msg", "metadata"];
  #indent: number | string = 0;
  #dateTimeFormatter: DateTimeFormatter | undefined = undefined;

  format(logRecord: LogRecord): string {
    let output = "{";
    for (let field of this.#fields) {
      if (field === "dateTime") {
        output += '"dateTime":' +
          stringify(
            logRecord.dateTime,
            { dateTimeFormatter: this.#dateTimeFormatter },
          ) + ",";
      } else if (field === "level") {
        output += '"level":' + stringify(levelToName(logRecord.level)) +
          ",";
      } else if (field === "msg") {
        output += '"msg":' + stringify(logRecord.msg) + ",";
      } else if (field === "metadata") {
        output += '"metadata":' + stringify(logRecord.metadata) + ",";
      } else if (field === "logger") {
        output += `"logger":"${logRecord.logger}",`;
      }
    }
    output = output.slice(0, -1) + "}";
    if (this.#indent !== 0) {
      output = stringify(JSON.parse(output), { indent: this.#indent })
        .replaceAll("\\n", "\n");
    }
    return output;
  }

  /**
   * Specify the log record fields to populate in the json object.  The order of
   * the fields to output is the same as their index in the array.
   */
  withFields(fields: Fields[]): this {
    if (fields.length === 0) {
      throw new ValidationError("JsonFormatter fields cannot be empty");
    }
    this.#fields = fields;
    return this;
  }

  /**
   * If indent is a number, the resulting json object will be output as a pretty
   * printed string with `indent` as the number of spaces to indent.  If `indent`
   * is a string, this string is used instead of space(s) to indent.
   */
  withPrettyPrintIndentation(indent: number | string): this {
    this.#indent = indent;
    return this;
  }

  withDateTimeFormat(
    dtf: DateTimeFormatterFn | DateTimeFormatter | string,
  ): this {
    if (typeof dtf === "string") {
      dtf = new SimpleDateTimeFormatter(dtf);
    } else if (typeof dtf === "function") {
      dtf = { formatDateTime: dtf };
    }
    this.#dateTimeFormatter = dtf;
    return this;
  }
}
