// Copyright 2020 the optic authors. All rights reserved. MIT license.
import { BaseStream } from "./baseStream.ts";
import { TokenReplacer } from "../formatters/tokenReplacer.ts";

/** A stream to send log messages to the console.  By default it uses the 
 * TokenReplacer log formatter with color.
 */
export class ConsoleStream extends BaseStream {
  #started = new Date();

  constructor() {
    super(new TokenReplacer().withColor());
  }

  log(msg: string): void {
    console.log(msg);
  }
}
