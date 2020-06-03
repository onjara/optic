import { Logger } from "./logger.ts";
import { Level } from "./levels.ts";
import { ConsoleStream } from "./streams/consoleStream.ts";
import { TokenReplacer } from "./formatters/tokenReplacer.ts";

class LogGear {
  private constructor() {}

  static newLogger(): Logger {
    return new Logger();
  }
}

const consoleStream = new ConsoleStream()
  .minLogLevel(Level.DEBUG)
  .withLogFooter(true)
  .withFormat(new TokenReplacer().withColor());
//.addConcern("config", Level.INFO)


const log = LogGear.newLogger()
  .level(Level.DEBUG)
  .addFilter((stream, logRecord) => logRecord.msg === null)
  .addStream(consoleStream)
//.addConcern("config", Level.INFO)
//.removeConcern("config")
//.removeStream(consoleStream)

//const log = LogGear.newLogger();
const s: string = log.debug("hello world", "really!");
const u: unknown = log.info({ a: 6, b: "hello", c: { d: 7, e: "world" } });
const n: number = log.warning(10);
//log.removeStream(consoleStream);
const test: number | undefined = log.debug(() => 5);
const test2: number = log.debug(5);

log.error(true);
log.critical(null);
log.log(Level.INFO, undefined);
//log.for('config').info('hello world');

// How to handle metadata?
// Strip logger - Remove statements from source if level < XXX, safety/security/speed
// debug_if(cond, msg, ...args)

// append header:
// 	fmt.Fprintf(&buf, "Log file created at: %s\n", now.Format("2006/01/02 15:04:05"))
//	fmt.Fprintf(&buf, "Running on machine: %s\n", host)
//	fmt.Fprintf(&buf, "Binary: Built with %s %s for %s/%s\n", runtime.Compiler, runtime.Version(), runtime.GOOS, runtime.GOARCH)
//	fmt.Fprintf(&buf, "Log line format: [IWEF]mmdd hh:mm:ss.uuuuuu threadid file:line] msg\n")
