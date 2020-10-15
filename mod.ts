// Copyright 2020 the optic authors. All rights reserved. MIT license.

// Logger
export {
  Level,
  levelToName,
  longestLevelName,
  nameToLevel,
} from "./logger/levels.ts";
export { Logger } from "./logger/logger.ts";

// Streams
// (see also https://github.com/onjara/optic/blob/master/streams/fileStream/mod.ts)
export { BaseStream } from "./streams/baseStream.ts";
export { ConsoleStream } from "./streams/consoleStream.ts";

// Filters
export { RegExFilter } from "./filters/regExFilter.ts";
export { SubStringFilter } from "./filters/subStringFilter.ts";

// Formatters
export { ColorRule, getColorForLevel } from "./formatters/color.ts";
export { JsonFormatter } from "./formatters/json.ts";
export { TokenReplacer } from "./formatters/tokenReplacer.ts";
export { SimpleDateTimeFormatter } from "./formatters/simpleDateTimeFormatter.ts";

// Transformers
export { PropertyRedaction } from "./transformers/propertyRedaction.ts";
export {
  alphaNumericReplacer,
  nonWhitespaceReplacer,
  RegExReplacer,
  Replacer,
} from "./transformers/regExReplacer.ts";

// Types
export {
  DateTimeFormatter,
  DateTimeFormatterFn,
  Filter,
  FilterFn,
  Formatter,
  IllegalStateError,
  LogMeta,
  LogRecord,
  Monitor,
  MonitorFn,
  Stream,
  Transformer,
  TransformerFn,
  ValidationError,
} from "./types.ts";
