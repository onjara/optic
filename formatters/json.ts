import { Formatter, LogRecord } from "../types.ts";
import { levelToName } from "../logger/levels.ts";

type Fields = "msg" | "metadata" | "level" | "dateTime";
export type ReplacerFn = (key: unknown, value: unknown) => string;

export class JsonFormatter implements Formatter<string> {
  #fields: Fields[] = ["dateTime", "level", "msg", "metadata"];
  #indent: number | string = 0;

  format(logRecord: LogRecord): string {
    let output = "{";
    for (let field of this.#fields) {
      if (field === "dateTime") {
        output += '"dateTime":' + JSON.stringify(logRecord.dateTime) + ",";
      } else if (field === "level") {
        output += '"level":' + JSON.stringify(levelToName(logRecord.level)) +
          ",";
      } else if (field === "msg") {
        output += '"msg":' + JSON.stringify(logRecord.msg) + ",";
      } else if (field === "metadata") {
        output += '"metadata":' + JSON.stringify(logRecord.metadata) + ",";
      }
    }
    output = output.slice(0, -1) + "}";
    if (this.#indent !== 0) {
      output = JSON.stringify(JSON.parse(output), null, this.#indent);
    }
    return output;
  }

  withFields(fields: Fields[]): this {
    if (fields.length === 0) {
      throw new Error("JsonFormatter fields cannot be empty");
    }
    this.#fields = fields;
    return this;
  }

  withPrettyPrintIndentation(indent: number | string): this {
    this.#indent = indent;
    return this;
  }
}
