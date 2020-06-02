import { BaseStream } from "./baseStream.ts";
import { TokenReplacer } from "../formatters/tokenReplacer.ts";

export class ConsoleStream extends BaseStream {

  constructor() {
    super(new TokenReplacer().withColor());
  }

  setup(): void {}
  destroy(): void {}

  hello() {

  }

  log(msg: string): void {
    console.log(msg);
  }
}
