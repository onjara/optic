import { Logger } from "./logger.ts";
import { Level } from "./levels.ts";
import { ConsoleStream } from "./streams/consoleStream.ts";
import { TokenReplacer } from "./formatters/tokenReplacer.ts";

class LogGear {
  private constructor() {}

  static logger(): Logger {
    return new Logger();
  }
}

const consoleStream = new ConsoleStream()
  .level(Level.DEBUG)
  .withFormat(new TokenReplacer());
//  .withFormat(LEVEL_MSG, THEN_COLOR)
//.addConcern("config", Level.INFO)


const log = LogGear.logger()
  .level(Level.DEBUG)
  .withStream(consoleStream)
//  .build()  //so that setup of each handler can be done, unless we do setup
//            //on each withStream()?
//.addConcern("config", Level.INFO)
//.removeConcern("config")
//.removeStream(consoleStream)

//const log = LogGear.logger();
log.debug("hello world", "really!");
log.info({ a: 6, b: "hello", c: { d: 7, e: "world" } });
log.warning(10);
log.error(true);
log.critical(null);
log.log(Level.INFO, undefined);

// change to addStream
// allow string format in withFormats:
// .withFormats("{level} {msg}", THEN_COLOR, THEN_PRETTY_PRINT);

// Need validation of formatting rules
// Other common formatters?
// How to handle metadata?
// rename withFormats().  withFormatting()? formatting()? withFormatters()?
// Strip logger - Remove statements from source if level < XXX, safety/security/speed
// debug_if(cond, msg, ...args)

// append header:
// 	fmt.Fprintf(&buf, "Log file created at: %s\n", now.Format("2006/01/02 15:04:05"))
//	fmt.Fprintf(&buf, "Running on machine: %s\n", host)
//	fmt.Fprintf(&buf, "Binary: Built with %s %s for %s/%s\n", runtime.Compiler, runtime.Version(), runtime.GOOS, runtime.GOARCH)
//	fmt.Fprintf(&buf, "Log line format: [IWEF]mmdd hh:mm:ss.uuuuuu threadid file:line] msg\n")
