// Copyright 2021 the optic authors. All rights reserved. MIT license.
import type { LogRecord, Stream, Transformer } from "../types.ts";
import type { Level } from "../logger/levels.ts";
import { clone } from "./deepClone.ts";

/**
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter
 *
 * A replacer function passed to a javascript `string.replace(regExp, replacer)`
 * `args` will contain the following:
 * * p1..pn one arg for each reg ex group
 * * offset - offset in the whole string where the match starts
 * * string - the entire string being examined
 */
export type Replacer = (fullMatch: string, ...args: unknown[]) => string;

/**
 * A replace function which replaces all alpha-numeric characters with stars.
 * E.g. a match of "£25.62" becomes "£**.**"
 * If the match has no groups, then the entire match is obfuscated. If the match
 * contains groups, then only the groups are obfuscated and non-group characters
 * in the full match are left untouched.
 *
 * See also https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter
 */
export function alphaNumericReplacer(
  fullMatch: string,
  ...args: unknown[]
): string {
  if (args.length === 2) { // e.g. no groups, obfuscate all of match
    return fullMatch.replace(/[a-zA-Z0-9]/g, "*");
  } else { // e.g. groups, obfuscate only the groups
    let returnVal = fullMatch;
    for (let i = 0; i < args.length - 2; i++) {
      const argValAsString = args[i] as string;
      returnVal = returnVal.replace(
        argValAsString,
        (args[i] as string).replace(/[a-zA-Z0-9]/g, "*"),
      );
    }
    return returnVal;
  }
}

/**
 * A replace function which replaces all non white-space characters with stars.
 * E.g. a match of "Amount: £35.25" becomes "******* ******"
 * If the match has no groups, then the entire match is obfuscated. If the match
 * contains groups, then only the groups are obfuscated and non-group characters
 * in the full match are left untouched.
 *
 * See also https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_function_as_a_parameter
 */
export function nonWhitespaceReplacer(
  fullMatch: string,
  ...args: unknown[]
): string {
  if (args.length === 2) { // e.g. no groups, obfuscate all of match
    return fullMatch.replace(/[^\s]/g, "*");
  } else { // e.g. groups, obfuscate only the groups
    let returnVal = fullMatch;
    for (let i = 0; i < args.length - 2; i++) {
      const argValAsString = args[i] as string;
      returnVal = returnVal.replace(
        argValAsString,
        argValAsString.replace(/[^\s]/g, "*"),
      );
    }
    return returnVal;
  }
}

/**
 * A transformer to match regular expressions and replace with the specified
 * replacer function return value or replace all non-characters with `*`s.
 * `msg` and `metadata` fields are checked against the supplied RegExp.  Only
 * string values are compared and deep object checking is used.  The underlying
 * replacement is done via Javascript's `string.replace(regExp, replacer)`. The
 * default replacer function is alphaNumericReplacer.
 */
export class RegExpReplacer implements Transformer {
  #regExp: RegExp;
  #replacer: Replacer = alphaNumericReplacer;

  constructor(regExp: RegExp, replacer?: Replacer) {
    this.#regExp = regExp;
    if (replacer) this.#replacer = replacer;
  }

  transform(_stream: Stream, logRecord: LogRecord): LogRecord {
    let shouldRedactMsg = false;
    let shouldRedactMeta = false;

    if (!shouldRedactMsg) {
      shouldRedactMsg = this.shouldRedact(
        logRecord.msg,
        this.#regExp,
        this.#replacer,
      );
    }

    if (!shouldRedactMsg) {
      shouldRedactMeta = this.shouldRedact(
        logRecord.metadata,
        this.#regExp,
        this.#replacer,
      );
    }

    if (shouldRedactMsg || shouldRedactMeta) {
      return new ObfuscatedViaRegExpLogRecord(
        logRecord,
        this.#regExp,
        this.#replacer,
      );
    }
    return logRecord;
  }

  shouldRedact(obj: unknown, regExp: RegExp, replacer: Replacer): boolean {
    if (isObjectButNotArray(obj)) {
      for (const key in (obj as Record<string, unknown>)) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const castObj = (obj as { [key: string]: unknown });
          if (typeof castObj[key] === "string") {
            if ((castObj[key] as string).match(regExp)) {
              return true;
            }
          } else if (typeof castObj[key] === "object") {
            return this.shouldRedact(castObj[key], regExp, replacer);
          }
        }
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (this.shouldRedact(obj[i], regExp, replacer)) {
          return true;
        }
      }
    } else if (typeof obj === "string") {
      if (obj.match(regExp)) {
        return true;
      }
    }
    return false;
  }
}

class ObfuscatedViaRegExpLogRecord implements LogRecord {
  readonly msg: unknown;
  #metadata: unknown[];
  #dateTime: Date;
  readonly level: Level;
  #logRecord: LogRecord;
  readonly logger: string;

  constructor(logRecord: LogRecord, regExp: RegExp, replacer: Replacer) {
    if (typeof logRecord.msg == "string") {
      this.msg = logRecord.msg.replace(regExp, replacer);
    } else {
      this.msg = clone(logRecord.msg);
      this.redact(this.msg, regExp, replacer);
    }

    this.#metadata = clone(logRecord.metadata);

    for (let i = 0; i < this.#metadata.length; i++) {
      if (typeof this.#metadata[i] === "string") {
        this.#metadata[i] = (this.#metadata[i] as string).replace(
          regExp,
          replacer,
        );
      } else {
        this.redact(this.#metadata[i], regExp, replacer);
      }
    }

    this.level = logRecord.level;
    this.#dateTime = logRecord.dateTime;
    this.#logRecord = logRecord;
    this.logger = logRecord.logger;
  }

  redact(obj: unknown, regExp: RegExp, replacer: Replacer): void {
    if (isObjectButNotArray(obj)) {
      for (const key in (obj as Record<string, unknown>)) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const castObj = (obj as { [key: string]: unknown });
          if (typeof castObj[key] === "string") {
            castObj[key] = (castObj[key] as string).replace(regExp, replacer);
          } else if (typeof castObj[key] === "object") {
            this.redact(castObj[key], regExp, replacer);
          }
        }
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === "string") {
          obj[i] = obj[i].replace(regExp, replacer);
        } else {
          this.redact(obj[i], regExp, replacer);
        }
      }
    }
  }

  get dateTime(): Date {
    return new Date(this.#dateTime.getTime());
  }

  get metadata(): unknown[] {
    return [...this.#metadata];
  }
  get logRecord(): LogRecord {
    return this.#logRecord;
  }
}

function isObjectButNotArray(obj: unknown): boolean {
  return typeof obj === "object" && !Array.isArray(obj);
}
