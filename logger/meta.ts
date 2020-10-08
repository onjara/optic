import { LogMeta, Stream } from "../types.ts";
import { Level, levelToName } from "./levels.ts";

export class LogMetaImpl implements LogMeta {
  minLogLevel: Level = Level.Debug;
  minLogLevelFrom = "default";
  readonly sessionStarted = new Date();
  readonly hostname = "unavailable";
  logger = "default";
  filters = 0;
  transformers = 0;
  monitors = 0;
  streamStats: Map<
    Stream,
    { handled: Map<number, number>; filtered: number; transformed: number }
  > = new Map();

  toRecord(stream: Stream): Record<string, unknown> {
    const record: Record<string, unknown> = {
      //hostname: this.hostname,
      sessionStarted: this.sessionStarted,
      sessionEnded: (this as LogMeta).sessionEnded,
      minLogLevel: levelToName(this.minLogLevel),
      minLogLevelFrom: this.minLogLevelFrom,
      loggerName: this.logger,
      filtersRegistered: this.filters,
      transformersRegistered: this.transformers,
      monitorsRegistered: this.monitors,
      streamName: stream.constructor.name,
    };
    const streamStats = this.streamStats.get(stream);
    if (streamStats) {
      record.logRecordsHandled = Array.from(streamStats.handled.keys()).map((
        k,
      ) => levelToName(k) + ": " + streamStats.handled.get(k)).join(", ");
      record.recordsFiltered = streamStats.filtered;
      record.recordsTransformed = streamStats.transformed;
    }
    return record;
  }
}
