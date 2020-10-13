// Copyright 2020 the optic authors. All rights reserved. MIT license.
import { every, FileStream, of } from "../streams/fileStream/mod.ts";
import {
  JsonFormatter,
  Level,
  Logger,
  LogRecord,
  PropertyRedaction,
  Stream,
} from "../mod.ts";

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
  .addFilter((stream: Stream, logRecord: LogRecord) => logRecord.msg === "spam")
  .addTransformer(new PropertyRedaction("password"))
  .addStream(fileStream);

log.info("Level too low. This won't be logged");
const logVal: string = log.critical("Hello world"); // logs and returns "Hello world"
log.warn("spam"); // "spam" records are filtered out
log.warn({ user: "jsmith", password: "secret_password" }); // logs { "user": "jsmith", "password": "[Redacted]" }
log.debug(() => {
  throw new Error("I'm not thrown");
}); // debug < warn, so no error as function isn't evaluated
log.error(() => {
  return "1234";
}); // logs "1234"
