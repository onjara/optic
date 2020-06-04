import { BaseStream } from "./baseStream.ts";
import { TokenReplacer } from "../formatters/tokenReplacer.ts";

export class ConsoleStream extends BaseStream {
  #started = new Date();

  constructor() {
    super(new TokenReplacer().withColor());
  }

  setup(): void {}
  destroy(): void {}

  logHeader(): void {
    if (!this.outputHeader) return;

    console.log("Console logging initialized at", new Date().toString());
    // TODO Enable once hostname is stable
    // console.log('Running on machine:', Deno.hostname());
  }

  logFooter(): void {
    if (!this.outputFooter) return;

    console.log("Console logging completed at", new Date().toString());
    console.log(
      "Log session duration:",
      (new Date().getTime() - this.#started.getTime()) + "ms",
    );
  }

  log(msg: string): void {
    console.log(msg);
  }
}
