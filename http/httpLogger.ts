import { ConnInfo, Handler } from "./http_deps.ts";
import { Filter, FilterFn, Monitor, MonitorFn, Stream } from "../types.ts";
import { isRequestResponseConsumer } from "./types.ts";
import { HttpLogRecord } from "./httpLogRecord.ts";
import { Logger } from "../logger/logger.ts";
import { BaseStream } from "../mod.ts";
import { HttpConsoleStream } from "./httpConsoleStream.ts";

export class HttpLogger {
  #logger:Logger = new Logger();
  #defaultConsoleStream = new HttpConsoleStream();
  #streamAdded = false;
  #onError: undefined | ((error: unknown) => Response | Promise<Response>);
  #cloneRequest = false;
  #cloneResponse = false;
  #enabled = true;

  constructor() {
    this.#logger.addStream(this.#defaultConsoleStream);
    this.setCloneRequestResponseAttributes(this.#defaultConsoleStream);
  }

  addStream(stream: Stream): HttpLogger {
    if (!this.#enabled) return this;
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
    if (!this.#enabled) return this;
    this.#logger.removeStream(removeStream);
    return this;
  }

  addMonitor(monitor: Monitor | MonitorFn): HttpLogger {
    if (!this.#enabled) return this;
    this.#logger.addMonitor(monitor);
    return this;
  }

  removeMonitor(monitorToRemove: Monitor): HttpLogger{
    if (!this.#enabled) return this;
    this.#logger.removeMonitor(monitorToRemove);
    return this;
  }
  
  addFilter(filter: Filter | FilterFn): HttpLogger {
    if (!this.#enabled) return this;
    this.#logger.addFilter(filter);
    return this;
  }

  removeFilter(filterToRemove: Filter): HttpLogger {
    if (!this.#enabled) return this;
    this.#logger.removeFilter(filterToRemove);
    return this;
  }

  enabled(condition: boolean): HttpLogger {
    this.#enabled = condition;
    return this;
  }

  /**
   * @returns true if the logger is currently enabled
   */
   isEnabled(): boolean {
    return this.#enabled;
  }

  withRequestErrorHandler(errorHandler: (error: unknown) => Response | Promise<Response>): HttpLogger {
    if (!this.#enabled) return this;
    this.#onError = errorHandler;
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
      if (this.#enabled) this.#logger.info(logRecord);
    } catch (error: unknown) {
      // Invoke onError handler when request handler throws, if available,
      // else bubble error back up to server
      if (this.#onError) {
        response = await this.#onError(error);
        logRecord.response = response;
        if (this.#enabled) this.#logger.info(logRecord);
      } else {
        logRecord.response = error;
        if (this.#enabled) this.#logger.info(logRecord);
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
