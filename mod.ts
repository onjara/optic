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

// Types
export { IllegalStateError, TimeUnit, ValidationError } from "./types.ts";

export type {
  DateTimeFormatter,
  DateTimeFormatterFn,
  Filter,
  FilterFn,
  Formatter,
  LogMeta,
  LogRecord,
  Monitor,
  MonitorFn,
  Stream,
  Transformer,
  TransformerFn,
} from "./types.ts";

// For transformer implementations, see:
// https://github.com/onjara/optic/blob/master/transformers/propertyRedaction.ts
// https://github.com/onjara/optic/blob/master/transformers/regExpReplacer.ts

// For filter implementations, see:
// https://github.com/onjara/optic/blob/master/filters/regExpFilter.ts
// https://github.com/onjara/optic/blob/master/filters/subStringFilter.ts

// For formatter implementations, see:
// https://github.com/onjara/optic/blob/master/formatters/mod.ts
