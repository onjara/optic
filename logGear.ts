import { Logger } from "./logger.ts";
import { Level } from "./levels.ts";
import { ConsoleStream } from "./streams/consoleStream.ts";

class LogGear {
  private constructor(){};

  static logger(): Logger {
    return new Logger();
  };
}

const consoleStream = new ConsoleStream()
                          .level(Level.DEBUG)
                          .colorEnabled(true);

const log = LogGear.logger()
                    .level(Level.INFO)
                    .withStream(consoleStream);

//const log = LogGear.logger();
log.debug('hello world');
log.info({a:6, b:"hello", c:{d: 7, e: "world"}});
log.warning('hello world');
log.error('hello world');
log.critical('hello world');
log.log(Level.INFO, 'hello world');