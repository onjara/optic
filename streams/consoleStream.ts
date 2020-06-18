import { BaseStream } from "./baseStream.ts";
import { TokenReplacer } from "../formatters/tokenReplacer.ts";
import { LogMeta } from "../types.ts";
import { levelToName } from "../logger/levels.ts";

export class ConsoleStream extends BaseStream {
  constructor() {
    super(new TokenReplacer().withColor());
  }

  setup(): void {}
  destroy(): void {}

  logHeader(meta: LogMeta): void {
    if (!this.outputHeader) return;

    console.log(
      "Default min log level set at:",
      levelToName(meta.minLogLevel),
      "from",
      meta.minLogLevelFrom,
    );
    console.log("Console logging initialized at", new Date().toString());
    // TODO Enable once hostname is stable
    // console.log('Running on machine:', Deno.hostname());
    console.log("---------------------------------------------------");
  }

  logFooter(meta: LogMeta): void {
    if (!this.outputFooter) return;

    console.log("---------------------------------------------------");
    console.log("Console logging completed at", new Date().toString());
    console.log(
      "Log session duration:",
      (new Date().getTime() - meta.sessionStarted.getTime()) + "ms",
    );
  }

  log(msg: string): void {
    console.log(msg);
  }
}
