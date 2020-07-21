import { FileStream, every, of } from "../streams/fileStream/mod.ts";
import {
  Level,
  JsonFormatter,
  Optic,
  Stream,
  LogRecord,
  PropertyRedaction,
} from "../mod.ts";

const fileStream = new FileStream("logFile.txt")
  .withMinLogLevel(Level.WARNING)
  .withFormat(
    new JsonFormatter()
      .withPrettyPrintIndentation(2)
      .withDateTimeFormat("YYYY.MM.DD hh:mm:ss:SSS"),
  )
  .withBufferSize(10000)
  .withLogFileInitMode("append")
  .withLogFileRotation(
    every(200000).bytes().withLogFileRetentionPolicy(of(7).days()),
  )
  .withLogHeader(true)
  .withLogFooter(true);

const log = Optic.logger()
  .withMinLogLevel(Level.WARNING)
  .addFilter((stream: Stream, logRecord: LogRecord) => logRecord.msg === "spam")
  .addObfuscator(new PropertyRedaction("password"))
  .addStream(fileStream);

log.info("Level too low. This won't be logged");
const logVal: string = log.critical("Hello world"); // logs and returns "Hello world"
log.warning("spam"); // "spam" records are filtered out
log.warning({ user: "jsmith", password: "secret_password" }); // logs { "user": "jsmith", "password": "[Redacted]" }
log.debug(() => {
  throw new Error("I'm not thrown");
}); // debug < warning, so no error as function isn't evaluated
log.error(() => {
  return "1234";
}); // logs "1234"
