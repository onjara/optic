import { Level, levelMap } from "./levels.ts";
import { Stream, LogRecord } from "./types.ts";
import { ConsoleStream } from "./streams/consoleStream.ts";

export class Logger {
  #minLevel: Level = Level.DEBUG;
  #streams: Stream[] = [new ConsoleStream()];
  #streamAdded = false;

  level(level: Level): Logger {
    this.#minLevel = level;
    return this;
  }

  withStream(stream: Stream): Logger {
    if (!this.#streamAdded) {
      // remove the default console stream if adding specified ones
      this.#streams = [];
      this.#streamAdded = true;
    }
    this.#streams.push(stream);
    return this;
  }

  private logToStreams(
    level: Level,
    msg: unknown,
    metadata: unknown[]
  ): void {
    if (this.#minLevel > level) return;

    const logRecord = new LogRecord(msg, metadata, level);
    this.#streams.forEach((stream: Stream) => {
      stream.handle(logRecord);
    });
  }

  debug(msg: unknown, ...metadata: unknown[]) {
    this.logToStreams(Level.DEBUG, msg, metadata);
  }

  info(msg: unknown, ...metadata: unknown[]) {
    this.logToStreams(Level.INFO, msg, metadata);
  }

  warning(msg: unknown, ...metadata: unknown[]) {
    this.logToStreams(Level.WARNING, msg, metadata);
  }

  error(msg: unknown, ...metadata: unknown[]) {
    this.logToStreams(Level.ERROR, msg, metadata);
  }

  critical(msg: unknown, ...metadata: unknown[]) {
    this.logToStreams(Level.CRITICAL, msg, metadata);
  }

  log(level: Level, msg: unknown, ...metadata: unknown[]) {
    this.logToStreams(level, msg, metadata);
  }
}
