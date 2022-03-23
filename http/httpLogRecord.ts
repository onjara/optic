import { ConnInfo } from "./http_deps.ts";

export class HttpLogRecord {
  #requestReceived: Date;
  #responseProcessed: Date | undefined;
  #request: Request;
  #requestBody: string | undefined;
  #response: unknown;
  #responseBody: string | undefined
  #connInfo: ConnInfo;

  constructor(req: Request, connInfo: ConnInfo) {
    this.#requestReceived = new Date();
    this.#request = req;
    this.#connInfo = connInfo;
  }

  get requestReceived(): Date {
    return this.#requestReceived;
  }

  protected set requestReceived(date:Date) {
    this.#requestReceived = date;
  }

  get responseProcessed(): Date | undefined {
    return this.#responseProcessed;
  }

  get request(): Request {
    return this.#request;
  }

  get response(): unknown {
    return this.#response;
  }

  set response(val:unknown) {
    this.#responseProcessed = new Date();
    this.#response = val;
  }

  get connInfo(): ConnInfo {
    return this.#connInfo;
  }

  get requestBody(): string | undefined {
    return this.#requestBody;
  }
  
  set requestBody(body:string | undefined) {
    this.#requestBody = body;
  }

  get responseBody(): string | undefined {
    return this.#responseBody;
  }

  set responseBody(body:string | undefined) {
    this.#responseBody = body;
  }
}