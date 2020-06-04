import { BaseStream } from "./baseStream.ts";
import { TokenReplacer } from "../formatters/tokenReplacer.ts";
import { LogMeta } from "../types.ts";
import { levelMap } from "../levels.ts";

export class ConsoleStream extends BaseStream {
  #started = new Date();

  constructor() {
    super(new TokenReplacer().withColor());
  }

  setup(): void {}
  destroy(): void {}

  logHeader(meta: LogMeta): void {
    if (!this.outputHeader) return;

    if (meta.unableToReadEnvVar) {
      console.log(
        "Unable to read environment variables.  Use '--allow-env' permission flag to enable.",
      );
    }
    console.log(
      "Default min log level set at:",
      levelMap.get(meta.minLogLevel),
      "from",
      meta.minLogLevelFrom,
    );
    console.log("Console logging initialized at", new Date().toString());
    // TODO Enable once hostname is stable
    // console.log('Running on machine:', Deno.hostname());
  }

  logFooter(meta: LogMeta): void {
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
