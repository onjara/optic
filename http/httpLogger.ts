import { ConnInfo, Handler } from "./http_deps.ts";
import { ConsoleStream } from "../streams/consoleStream.ts";
import { Filter, FilterFn, Monitor, MonitorFn, Stream } from "../types.ts";
import { isRequestResponseConsumer } from "./types.ts";
import { HttpLogRecord } from "./httpLogRecord.ts";
import { Logger } from "../logger/logger.ts";
import { HttpFormatter } from "./httpFormatter.ts";
import { BaseStream } from "../mod.ts";

export class HttpLogger {
  #logger:Logger = new Logger();
  #defaultConsoleStream = new ConsoleStream();
  #streamAdded = false;
  #onError: undefined | ((error: unknown) => Response | Promise<Response>);
  #cloneRequest = false;
  #cloneResponse = false;

  constructor() {
    this.#defaultConsoleStream.withLogFooter(false);
    this.#defaultConsoleStream.withLogHeader(false);
    this.#defaultConsoleStream.withFormat(new HttpFormatter());
    this.#logger.addStream(this.#defaultConsoleStream);
    this.setCloneRequestResponseAttributes(this.#defaultConsoleStream);
  }

  addStream(stream: Stream): HttpLogger {
    if (!this.#streamAdded) {
      this.#logger.removeStream(this.#defaultConsoleStream);
      this.#streamAdded = true;
    }
    this.#logger.addStream(stream);
    this.setCloneRequestResponseAttributes(stream);
    return this;
  }

  private setCloneRequestResponseAttributes(stream:Stream): void {
    if (isRequestResponseConsumer(stream)) {
      this.#cloneRequest = this.#cloneRequest || stream.consumesRequestBody;
      this.#cloneResponse = this.#cloneResponse || stream.consumesResponseBody;
    } else if (stream instanceof BaseStream) {
      const formatter = stream.getFormatter();
      if (isRequestResponseConsumer(formatter)) {
        this.#cloneRequest = this.#cloneRequest || formatter.consumesRequestBody;
        this.#cloneResponse = this.#cloneResponse || formatter.consumesResponseBody;
      }
    }
  } 

  removeStream(removeStream: Stream): HttpLogger {
    this.#logger.removeStream(removeStream);
    return this;
  }

  addMonitor(monitor: Monitor | MonitorFn): HttpLogger {
    this.#logger.addMonitor(monitor);
    return this;
  }

  removeMonitor(monitorToRemove: Monitor): HttpLogger{
    this.#logger.removeMonitor(monitorToRemove);
    return this;
  }
  
  addFilter(filter: Filter | FilterFn): HttpLogger {
    this.#logger.addFilter(filter);
    return this;
  }

  removeFilter(filterToRemove: Filter): HttpLogger {
    this.#logger.removeFilter(filterToRemove);
    return this;
  }

  enableLogging(condition: boolean): HttpLogger {
    this.#logger.enabled(condition);
    return this;
  }

  withRequestErrorHandler(errorHandler: (error: unknown) => Response | Promise<Response>): HttpLogger {
    this.#onError = errorHandler;
    return this;
  }

  withConsoleFormat(format:string): HttpLogger {
    
    return this;
  }

  async log(req:Request, connInfo: ConnInfo, handler:Handler): Promise<Response> {
    const logRecord = new HttpLogRecord(req, connInfo);

    if (this.#cloneRequest) {
      logRecord.requestBody = await req.clone().text();
    }

    let response: Response;
    try {
      response = await handler(req, connInfo);

      if (this.#cloneResponse) {
        logRecord.responseBody = await response.clone().text();
      }
  
      logRecord.response = response;
      this.#logger.info(logRecord);
    } catch (error: unknown) {
      // Invoke onError handler when request handler throws, if available,
      // else bubble error back up to server
      if (this.#onError) {
        response = await this.#onError(error);
        logRecord.response = response;
        this.#logger.info(logRecord);
      } else {
        logRecord.response = error;
        this.#logger.info(logRecord);
        throw error;
      }
    }
    
    return response;
  }

  protected get defaultConsoleStream() {
    return this.#defaultConsoleStream;
  }

  protected get cloneRequest() {
    return this.#cloneRequest;
  }
  
  protected get cloneResponse() {
    return this.#cloneResponse;
  }

  protected set logger(overrideLogger: Logger) {
    this.#logger = overrideLogger;
  }
}
