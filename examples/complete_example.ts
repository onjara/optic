import { every, FileStream, of } from "../streams/fileStream/mod.ts";
import {
  Level,
  Logger,
  type LogRecord,
  type Stream,
  TimeUnit,
} from "../mod.ts";
import { JsonFormatter } from "../formatters/mod.ts";
import { PropertyRedaction } from "../transformers/propertyRedaction.ts";

const fileStream = new FileStream("logFile.txt")
  .withMinLogLevel(Level.Warn)
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

const log = new Logger()
  .withMinLogLevel(Level.Warn)
  .addFilter((_stream: Stream, logRecord: LogRecord) =>
    logRecord.msg === "spam"
  )
  .addTransformer(new PropertyRedaction("password"))
  .addStream(fileStream);

log.info("Level too low. This won't be logged");
const _logVal: string = log.critical("Hello world"); // logs and returns "Hello world"
log.warn("spam"); // "spam" records are filtered out
log.warn({ user: "jsmith", password: "secret_password" }); // logs { "user": "jsmith", "password": "[Redacted]" }
log.debug(() => {
  throw new Error("I'm not thrown");
}); // debug < warn, so no error as function isn't evaluated
log.error(() => {
  return "1234";
}); // logs "1234"

for (let i = 0; i < 1000000; i++) {
  log.every(100).warn("Logs every 100th iteration");
  log.atMostEvery(10, TimeUnit.SECONDS).warn(
    "Logs at most once every 10 seconds",
  );
}
