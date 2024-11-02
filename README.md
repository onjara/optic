# Optic

[![ci](https://github.com/onjara/optic/workflows/ci/badge.svg)](https://github.com/onjara/optic)
[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/optic/mod.ts)

A powerful, highly extensible and easy to use logging framework for Deno.

## At a glance

- Easy to use fluid interface
- Log anything
- Modular and highly extensible - build your own streams, filters, transformers,
  monitors, formatters and more
- Deferred log message resolution for greater performance
- Filters - keep your logs clean
- Transformers - hide sensitive data, strip new lines, encode data, etc.
- Monitors - watch your logs and take action
- Profiling - measure the performance of your code

## Table of contents

1. [Quick start](#quick-start)
2. [Logging](#logging)
3. [Streams](#streams)
4. [Log formatting](#log-formatting)
5. [Monitors](#monitors)
6. [Transformers](#transformers)
7. [Filters](#filters)
8. [Profiling](#profiling)

## Quick start

### Simple example

```ts
import { Logger } from "jsr:@onjara/optic/logger";

const logger = new Logger();
logger.info("Hello world!"); // outputs log record to the console
```

### Complete example

```ts
import {
  every,
  FileStream,
  of,
} from "jsr:@onjara/optic/streams";
import {
  between,
  Level,
  Logger,
  LogRecord,
  Stream,
  TimeUnit,
} from "jsr:@onjara/optic/logger";
import { JsonFormatter } from "jsr:@onjara/optic/formatters";
import { PropertyRedaction } from "jsr:@onjara/optic/transformers";

// Configure the output file stream
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

// Configure the logger
const log = new Logger()
  .withMinLogLevel(Level.Warn)
  .addFilter((stream: Stream, logRecord: LogRecord) => logRecord.msg === "spam")
  .addTransformer(new PropertyRedaction("password"))
  .addStream(fileStream);

// "info" is lower than configured min log level of "warn"
log.info("Level too low. This won't be logged");

// logs "Hello World" and supporting metadata, returns "Hello world"
const logVal: string = log.critical("Hello world", 12, true, { name: "Poe" });

// Log records with `msg` of "spam" are filtered out
log.warn("spam");

// logs `msg` as { "user": "jsmith", "password": "[Redacted]" }
log.warn({ user: "jsmith", password: "secret_password" });

// debug < min log level, so function isn't evaluated and error not thrown
log.debug(() => {
  throw new Error("I'm not thrown");
});

// error > min log level, so function is evaluated and `msg` is set to "1234"
log.error(() => {
  return "1234";
}); // logs "1234"

const x = 5;
log.if(x > 10).error("Since x < 10 this doesn't get logged");

log.mark("before loop");
for (let i = 0; i < 1000000; i++) {
  log.every(100).warn("Logs every 100th iteration");
  log.atMostEvery(10, TimeUnit.SECONDS).warn(
    "Logs at most once every 10 seconds",
  );
}
log.mark("after loop");
log.profilingConfig().withLogLevel(Level.Warn);
// logs (at warn level) time, memory usage and ops called for loop duration
log.measure(between("before loop", "after loop"));

log.enabled(false);
log.error("Logger is disabled, so this does nothing");
```

## Logging

All logging in Optic is done through a logger instance, which provides the
interface and framework for all logging activity.

**In this section:**

1. [Creating a logger](#creating-a-logger)
2. [Sharing loggers across modules](#sharing-loggers-across-modules)
3. [Logging an event](#logging-an-event)
4. [Log levels](#log-levels)
5. [Log records](#log-records)
6. [Minimum log level](#minimum-log-level)
7. [Logging lifecycle](#logging-lifecycle)
8. [In-line logging](#in-line-logging)
9. [Deferred logging](#deferred-logging)
10. [Conditional logging](#conditional-logging)
11. [Deduplicating logs](#deduplicating-log-messages)
12. [Rate limiting logs](#rate-limiting-the-logger)
13. [Disabling the logger](#disabling-the-logger)
14. [Shutting down the logger](#shutting-down-the-logger)

### Creating a logger

Before you can log anything you must first get an instance of a logger.

```ts
// Using an unnamed logger
const defaultLogger = new Logger();

// Using a named logger
const configLogger = new Logger("config");
```

### Sharing loggers across modules

To reuse the same logger instance across multiple modules, declare and configure
your loggers in their own module which are then exported for use in other
modules. E.g.

```ts
/** logger.ts */
import { ConsoleStream, Logger } from "https://deno.land/x/optic/mod.ts";
import { JsonFormatter } from "https://deno.land/x/optic/formatters/json.ts";

export const logger = new Logger();
logger.addStream(new ConsoleStream().withFormat(new JsonFormatter()));
```

```ts
/** module_a.ts */
import { logger } from "./logger.ts";

logger.info("hello world");
```

### Logging an event

You can log an event through any of the level functions on the logger, supplying
a `msg` (of any type) and one or more optional `metadata` items. E.g.

```ts
logger.info("File loaded", "exa_113.txt", 1223, true);
```

In this example, `"File loaded"` is the log record message (primary data), with
supporting metadata of the file name (`"exa_113.txt"`), size (`1223`) and
readonly attribute (`true`) supplied.

### Log levels

Optic supports the following logging levels out of the box:

- Trace
- Debug
- Info
- Warn
- Error
- Critical

These may be used directly via the logger, e.g.

```ts
logger.trace("Some trace info");
logger.error("Oops, something went wrong");
```

Or through the use of the Level enum, e.g.

```ts
logger.log(Level.Info, "Here some info");
```

### Log Records

Each log event (e.g. `logger.info("hello world")`) generates a `LogRecord` with
all the relevant info on the event. Fields captured in the `LogRecord` are:

| Field    | Description                                                       |
| -------- | ----------------------------------------------------------------- |
| msg      | The primary content of the log event of any type                  |
| metadata | Supporting data, in one or more additional data items of any type |
| dateTime | When the log record was created                                   |
| level    | The log level of the event                                        |
| logger   | The name of the logger which generated the event                  |

### Minimum log level

Each logger can be configured to log at a minimum level (the default level is
`Debug`). Log events with a level lower than the minimum level are ignored with
no action taken. There are 3 ways in which you can configure a logger to log at
a minimum level:

#### Programmatically

Within the code, this can be set at any time and takes highest precedence of any
method:

```ts
logger.withLevel(Level.Warn);
```

#### Environment variable

Through the use of an environment variable `OPTIC_MIN_LEVEL` you can set the
minimum log level of any logger. This method takes lowest priority and will be
overridden if set programmatically or supplied via a command line argument. The
values for this variable are any of the logging levels in uppercase, e.g.
`Info`.

**NOTE** for this method to work you MUST supply `--allow-env` to the Deno
command line process. E.g.:

```shell
OPTIC_MIN_LEVEL=Error deno run --allow-env my-module.ts
```

#### Command line argument

You may also set the value of the minimum log level via a command line argument,
`minLogLevel`. Minimum log levels set this way apply to all loggers unless
overridden by programmatically setting a new level. Example:

```shell
deno run my-module.ts minLogLevel=Error
```

The value of the argument is any valid log level in Pascal case.

### Logging lifecycle

Logging events will undergo the following lifecycle:

- If the minimum log level requirement is not met, the msg is returned with no
  actions undertaken
- Resolve the msg function value if using deferred logging (see below)
- Run each registered monitor against the log record
- For each stream
  - Run each registered filter
  - Run each registered transformer against the log record (if not filtered)
  - Pass log record to stream for handling (if not filtered)
- Return msg value (or resolved msg value in deferred logging)

### In-line logging

All log statements return the value of the `msg` field, allowing more concise
coding. E.g.

```ts
const user: User = logger.info(getUser());

// is equivalent to:
const user: User = getUser();
logger.info(user);
```

### Deferred logging

Deferred logging is used when you have expensive objects to create or calculate
for logging purposes, but don't want to incur the cost if the log message won't
be handled anyway. By supplying a function argument to the log event `msg`
field, this will defer resolution of the value of this function until after
determining if the log event should be recorded. The resolved value is then set
as the `msg` field in the LogRecord.

Example:

```ts
const value = logger.info(() => {
  return expensiveObjectCreation();
});
```

Here, `expensiveObjectCreation()` won't be called unless the logger is allowed
to log info messages. `value`, in this example, will be set to the return value
of `expensiveObjectCreation()` if the logger logged the message or `undefined`
if it did not log it.

### Conditional logging

You can specify a condition which must be met to log the log message. To do
this, supply a boolean condition to the `if` function on the logger. E.g.

```ts
logger.if(attempts > 3).warn("Excessive attempts by user");
```

Note that even if the condition is true, the log record may not be logged if the
minimum log level for the logger (and/or stream) is higher than this record.

### Deduplicating log messages

You can use the logger to deduplicate log messages. When enabled, if 3 or more
log messages in a row are the same (same msg and supporting meta data) then
output of the duplicates is suppressed. Once a new log message which is
different is logged, then a new log message is finally cut (ahead of the
new/different one) detailing the number of duplicated log messages which were
suppressed. This can clean up your logs in situations where significant
duplicates are encountered. Additionally, significant performance gains can
potentially be had by not recording duplicate log messages over and over. Be
aware, however, that comparing the current log message to the previous isn't
free and if your logs have no or limited duplicates the performance may be
reduced. If performance is critical it is suggested that you test the
deduplication capabilities. This feature is disabled by default.

To turn on deduping of logs:

```ts
logger.withDedupe();
```

To turn off deduping of logs:

```ts
logger.withDedupe(false);
```

Example:

```ts
const logger = new Logger().withDedupe();
for (let i = 0; i < 1000; i++) {
  logger.info("hello world");
}
```

Output:

```
2021-01-11T22:32:58.497Z Info  hello world 
2021-01-11T22:32:58.506Z Info    ^-- last log repeated 999 additional times
```

### Rate limiting the logger

You can limit how many times the logger logs a particular statement in one of
two ways;

```ts
logger.atMostEvery(5, TimeUnit.SECONDS).info(
  "I'm only logged at most every 5 seconds",
);
logger.every(100).info("I'm logged every 100 attempts");
```

**An important note**: Rate limiters work in a context. The context for the rate
limiting is determined, by default, on the amount, unit (for `atMostEvery`) and
log level. Where two or more `every` or `atMostEvery` statements match the same
context, the same rate limiter will be used, possibly causing unintended side
effects through race conditions on which of the statements will be logged when
matching or exceeding the constraint. To avoid this, you can enforce unique
contexts by passing in an optional context string:

```ts
logger.atMostEvery(5, TimeUnit.SECONDS, "Context 1").info(
  "Logged at most every 5 seconds",
);
logger.atMostEvery(5, TimeUnit.SECONDS, "Context 2").info(
  "Also logged at most every 5 seconds",
);
```

### Disabling the logger

You can programmatically disable the logger which transforms it into a no-op
logger. This is useful for loggers which should not run in a production
environment for example and the value of `enabled()` can be supplied via an
environment variable or argument. The logger can later be re-enabled. When
disabled:

- Logs are not logged and deferred log messages are not resolved
- Adding or removing streams, filters, monitors or transformers is silently
  ignored and they are not added (or removed)
- Changes to the minimum log level are silently ignored
- No tear down of streams, filters, monitors or transformers is undertaken upon
  module unload or manual `shutdown()`. NOTE: this is a breaking change from
  v1.3.6 or earlier which did execute tear down on module unload. Should you
  wish to perform tear down actions on a disabled logger, you can either renable
  the logger and manually call `logger.shutdown()` or call `destroy()` on each
  stream, filter, monitor or transformer associated with the logger

To disable the logger:

```ts
logger.enabled(false);
```

### Shutting down the logger

Under normal circumstances, when a Deno process completes it will fire an unload
event. The logger is registered to perform a shutdown when this event is
broadcast, meaning no explicit action is required by the client. During
shutdown, the logger will call `destroy()` on all streams, filters, monitors or
transformers registered to the logger.

Sometimes, a client may wish to trigger a shutdown manually. For example, a
client may listen for certain signal events and request a shutdown manually via
`logger.shutdown()`. Shutting down the logger fully disables it.

## Streams

Streams in Optic control the flow of log records from a module logging statement
to an endpoint defined by the stream (e.g. console, file system, etc.). A logger
can have one or more streams and the same log message will be handled by all
registered streams (unless filtered from that stream).

`ConsoleStream` is the default stream in a logger. Once any stream is added to
the logger, this default stream is removed. If console logging is still desired
as an additional stream, you should explicitly add the `ConsoleStream`.

### Optics streams

There are two out of the box streams available.

#### Console stream

A basic stream which outputs log messages to the console.

```ts
import { ConsoleStream, Level, Logger } from "https://deno.land/x/optic/mod.ts";
import { TokenReplacer } from "https://deno.land/x/optic/formatters/mod.ts";

const consoleStream = new ConsoleStream()
  .withMinLogLevel(Level.Debug)
  .withLogHeader(true)
  .withLogFooter(true)
  .withFormat(
    new TokenReplacer()
      .withColor()
      .withDateTimeFormat("YYYY.MM.DD hh:mm:ss:SSS"),
  );

const logger = new Logger().addStream(consoleStream);
```

See [Formatting](#log-formatting) for further detail on formatting your logs.

#### File stream

A stream which outputs log messages to the file system.

```ts
import { Level, Logger } from "https://deno.land/x/optic/mod.ts";
import { JsonFormatter } from "https://deno.land/x/optic/formatters/mod.ts";
import {
  every,
  FileStream,
  of,
} from "https://deno.land/x/optic/streams/fileStream/mod.ts";

const fileStream = new FileStream("./logFile.txt")
  .withMinLogLevel(Level.Warn)
  .withFormat(new JsonFormatter())
  .withBufferSize(30000)
  .withLogFileInitMode("append")
  .withLogFileRotation(
    every(2000000).bytes().withLogFileRetentionPolicy(of(7).days()),
  )
  .withLogHeader(true)
  .withLogFooter(true);

const logger = new Logger().addStream(fileStream);
```

See [FileStream documentation](./streams/fileStream/README.md) for full details.
See also [Formatting](#log-formatting) for further detail on formatting your
logs.

### Defining a custom stream

You can build your own stream by creating a class which implements the
[`Stream`](./types.ts) interface. The `handle` function is the only requirement
which defines what your stream should do with a log record (and return true if
the record was handled).

Basic example:

```ts
import { Logger, LogRecord, Stream } from "https://deno.land/x/optic/mod.ts";

class SimpleStream implements Stream {
  handle(logRecord: LogRecord): boolean {
    console.log(logRecord.msg);
    return true;
  }
}

const logger = new Logger().addStream(new SimpleStream());
```

Streams can also take logging metadata in `logHeader()` and `logFooter()`
functions, and also can expose `setup()` and `destroy()` functions.

## Log formatting

Optic's streams allow you to format your logs however you wish, either through
your own custom formatting or several out of the box formatters. Formatters are
set directly on the stream via `withFormat()`.

### Optic formatters overview

Three out of the box formatters are available. See also the
[complete documentation on formatters](./formatters/README.md).

#### TokenReplacer formatter

This formatter allows you to construct a custom string using tokens as
placeholders for the various log record fields.

Example:

```ts
import { ConsoleStream, Logger } from "https://deno.land/x/optic/mod.ts";
import { TokenReplacer } from "https://deno.land/x/optic/formatters/mod.ts";

const logger = new Logger().addStream(
  new ConsoleStream()
    .withFormat(
      new TokenReplacer()
        .withFormat("{dateTime} {level} {msg} {metadata}")
        .withDateTimeFormat("hh:mm:ss YYYY-MM-DD")
        .withLevelPadding(10)
        .withColor(),
    ),
);
```

See
[TokenReplacer documentation](./formatters/README.md#tokenreplacer-formatter)
for full details.

#### JSON formatter

This formatter allows you to output your log record as a structured JSON
formatted string.

Example:

```ts
import { ConsoleStream, Logger } from "https://deno.land/x/optic/mod.ts";
import { JsonFormatter } from "https://deno.land/x/optic/formatters/mod.ts";

const logger = new Logger().addStream(
  new ConsoleStream()
    .withFormat(
      new JsonFormatter()
        .withFields(["dateTime", "level", "logger", "msg"])
        .withDateTimeFormat("hh:mm:ss YYYY-MM-DD")
        .withPrettyPrintIndentation(2),
    ),
);
```

See [JSON formatter documentation](./formatters/README.md#json-formatter) for
full details.

#### DateTimeFormatter

A formatter to be used within other formatters, this allows you to provide a
custom format for your date/time fields. Example:

```ts
logger.addStream(
  new ConsoleStream()
    .withFormat(
      new JsonFormatter().withDateTimeFormat("hh:mm:ss YYYY-MM-DD"),
    ),
);
```

See [DateTimeFormatter](./formatters/README.md#datetimeformatter) for full
details.

#### Custom formatters

You can also easily supply your own custom formatter by implementing the
`Formatter` interface. See
[Using your own custom formatter](./formatters/README.md#using-your-own-custom-formatter)
for full details.

## Monitors

Monitors allow you to spy on log records that flow through your logger. Monitors
are run first, before any filtering, transformation or stream handling.

Some use cases for monitors include:

- Collect stats of your log records
- Send alert if too many error records detected
- Take automated action on specific error scenario
- Debugging aid - e.g. output certain records to the console

### Constructing a monitor

There are two ways to construct a monitor:

#### Monitor function

This is a good choice for short and simple monitors. Monitor functions must
match the following type:

```ts
export type MonitorFn = (logRecord: LogRecord) => void;
```

Example:

```ts
import { LogRecord, MonitorFn } from "https://deno.land/x/optic/mod.ts";

const mon: MonitorFn = (logRecord: LogRecord): void => {
  if ((logRecord.msg as User).username === "jsmith") {
    console.log("User jsmith spotted again");
  }
};
```

#### Implement the Monitor interface

The Monitor interface requires implementation of the `check` function which is
of type `MonitorFn` as above. This gives you the power of a class for more
complex monitors.

```ts
import { LogRecord, Monitor } from "https://deno.land/x/optic/mod.ts";

class UserMonitor implements Monitor {
  check(logRecord: LogRecord): void {
    if ((logRecord.msg as User).username === "jsmith") {
      console.log("User jsmith spotted again");
    }
  }
}
```

### Registering Monitors

Monitors are registered directly with the logger as follows:

```ts
const logger = new Logger().addMonitor(new UserMonitor());
```

## Transformers

Optic allows you to transform log records sent to a stream, allowing a log
record to be transformed in one stream but not another. Transformation can
change some, all or none of the original log record. Transformation takes place
after monitors and also after log filtering but before the log record is sent to
a stream.

Some use cases for transformation include:

- Hiding sensitive data in your logs such as passwords or credit card details
- Obscuring personal information, complying with data protection laws
- Strip new lines from log data (log forging protection)
- Encoding data
- Compressing data

### Constructing a transformer

There are two ways to construct an transformer.

#### Transformer function

This is a good choice for short and simple transformers. Transformer functions
must match the following type:

```ts
export type TransformerFn = (stream: Stream, logRecord: LogRecord) => LogRecord;
```

The function takes a stream and logRecord and returns either the original log
record if nothing is transformed, or a copy of the original with the necessary
transformations applied. Example:

```ts
import {
  LogRecord,
  Stream,
  TransformerFn,
} from "https://deno.land/x/optic/mod.ts";

const tr: TransformerFn = (
  stream: Stream,
  logRecord: LogRecord,
): LogRecord => ({
  msg: (logRecord.msg as string).startsWith("password:")
    ? "password: [Redacted]"
    : logRecord.msg,
  metadata: [...logRecord.metadata],
  level: logRecord.level,
  logger: logRecord.logger,
  dateTime: new Date(logRecord.dateTime.getTime()),
});
```

#### Implement the Transformer interface

The Transformer interface requires implementation of the `transform` function,
which is of type `TransformerFn` as above. This gives you the power of a class
for more complex transformations.

```ts
import {
  LogRecord,
  Stream,
  Transformer,
} from "https://deno.land/x/optic/mod.ts";

class PasswordObfuscator implements Transformer {
  transform(stream: Stream, logRecord: LogRecord): LogRecord {
    if ((logRecord.msg as string).startsWith("password:")) {
      return {
        msg: "password: [Redacted]",
        metadata: [...logRecord.metadata],
        level: logRecord.level,
        logger: logRecord.logger,
        dateTime: new Date(logRecord.dateTime.getTime()),
      };
    } else {
      return logRecord;
    }
  }
}
```

### Registering transformers

Transformers are registered directly with the logger as follows:

```ts
const passwordObfuscator = new PasswordObfuscator();
const logger = new Logger().addTransformer(passwordObfuscator);
```

### Optic transformers

Two out of the box transformers are available in Optic.

#### Property redaction obfuscator

This transformer allows you to specify a single object property name which if
found in the `msg` or `metadata` log record fields (using deep object
searching), will replace the value of that property with the string
`[Redacted]`. The original object is untouched, as transformation clones the
object before obfuscation.

```ts
import { PropertyRedaction } from "https://deno.land/x/optic/mod.ts";

logger.addTransformer(new PropertyRedaction("password"));

// This next record is untouched by the transformer (no `password` property)
logger.info({ user: "abc29002", dateOfBirth: "1966/02/33" });

// This record gets transformed to: {user: "abc29002", password: "[Redacted]"}
logger.info({ user: "abc29002", password: "s3cr3tpwd" });
```

#### Regular expression redaction

This obfuscator allows you to specify a regular expression and an optional
replacer function. The RegExpReplacer will then go through the `msg` and
`metadata` fields looking for string values. Anytime it finds one, it will run
the Javascript `string.replace(regExp, replacer)` against it. For more details
on this, see
[String.replace()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace).

There are two included replacer functions. `alphaNumericReplacer` (the default)
will replace all letters and numbers with `*`'s. `nonWhitespaceReplacer` will
replace all non white space characters with `*`'s. For both replacers, if the
regular expression does not use groups then then entire match is replaced,
however if groups are used, only the groups are replaced.

```ts
import {
  nonWhitespaceReplacer,
  RegExpReplacer,
} from "https://deno.land/x/optic/transformers/regExpReplacer.ts";
import { Logger } from "https://deno.land/x/optic/mod.ts";

const logger = new Logger()
  .addTransformer(new RegExpReplacer(/£([\d]+\.[\d]{2})/))
  .addTransformer(new RegExpReplacer(/password: (.*)/, nonWhitespaceReplacer));

logger.info("Amount: £122.51"); // becomes "Amount: £***.**" ('£' is not in a group)
logger.info("password: MyS3cret! Pwd!"); // becomes "password: ********* ****"
```

RegExp and Replacer examples:

| RegExp              | Test string | alphaNumericReplacer | nonWhitespaceReplacer |
| ------------------- | ----------- | -------------------- | --------------------- |
| /£([\d]+\.[\d]{2})/ | £52.22      | £**.**               | £*****                |
| /\d{2}-\d{2}-\d{4}/ | 30-04-1954  | *\*-\*\*-\*\*\*\*    | **********            |

## Filters

Filters allows you to filter out log records from your streams. A log record can
be filtered out from one stream but not another. Filters are processed after
monitors, but before obfuscators or stream handling. Upon handling a log record,
the logger will run filters once for each registered stream.

Some use cases for filters include:

- Preventing spam from filling up your logs
- Directing log messages to certain streams only, based on content
- Blocking malicious log records
- Redirecting certain log records to an entirely different logger

### Constructing a filter

There are two ways to construct a filter.

#### Filter function

This is a good choice for short and simple filters. Filter functions must match
the following type:

```ts
export type FilterFn = (stream: Stream, logRecord: LogRecord) => boolean;
```

The function takes in a stream and logRecord and returns true if the logRecord
should be filtered out. Example:

```ts
import { FilterFn, LogRecord, Stream } from "https://deno.land/x/optic/mod.ts";
const filter: FilterFn = (stream: Stream, logRecord: LogRecord) =>
  (logRecord.msg as string).includes("bad stuff");
```

#### Implement the Filter interface

The Filter interface requires you to implement the `shouldFilterOut` function,
which is of type `FilterFn` as above. This gives you the power of a class for
more complex filtering, or perhaps you want to redirect filtered out logs to
another logger and stream.

```ts
import { Filter, LogRecord, Stream } from "https://deno.land/x/optic/mod.ts";

class MyFilter implements Filter {
  shouldFilterOut(stream: Stream, logRecord: LogRecord): boolean {
    return (logRecord.msg as string).includes("bad stuff");
  }
}
```

### Registering filters

Filters are registered directly with the logger as follows:

```ts
const myFilter = new MyFilter();
const logger = new Logger().addFilter(myFilter);
```

### Optic filters

Two out of the box filters are available in Optic.

#### Regular Expression Filter

This filter takes in a regular expression. If it matches, then the log record is
filtered out. The log record `msg` and `metadata` fields are first converted to
a string if necessary before testing the regular expression.

```ts
import { Logger } from "https://deno.land/x/optic/mod.ts";
import { RegExpFilter } from "https://deno.land/x/optic/filters/regExpFilter.ts";

// Filters out log records containing `%` or `&` in the message or metadata
const regExpFilter = new RegExpFilter(/[%&]+/);
const logger = new Logger().addFilter(regExpFilter);
logger.error("Oh no!"); // not filtered
logger.error("Oh no!", "& another thing"); // filtered out
```

#### Substring filter

This filter takes in a string. If this string is found to be a substring of
either the log record `msg` or `metadata` fields (converting them to string
first if required), then this log record is filtered out. Example:

```ts
import { Logger } from "https://deno.land/x/optic/mod.ts";
import { SubStringFilter } from "https://deno.land/x/optic/filters/subStringFilter.ts";

const subStringFilter = new SubStringFilter("user1234");
const logger = new Logger().addFilter(subStringFilter);
logger.info({ user: "joe1944", action: "login" }); // not filtered
logger.info({ user: "user1234", action: "login" }); // filtered out
```

## Profiling

Optic's profiling capabilities allow you to measure your code's performance.
Profiling is based on marks which are recorded at various points in your code
base. A mark is a snapshot of your running application, recording the time,
memory consumption and ops calls (these are the calls between the V8 engine and
Deno runtime). Measures are then used to output differences between two marks to
your logs.

### Recording marks

Recording marks in your code is very straightforward. The example below takes a
snapshot of the time, memory usage and ops calls and saves these against an
identifier (e.g. `below`).

```ts
logger.mark("before");
someFunction();
logger.mark("after");
```

### Measuring

Measuring outputs the difference between two marks to your logs. For example,
this will measure the performance of `someFunction()`:

```ts
import { between } from "https://deno.land/x/optic/mod.ts";

logger.mark("before");
someFunction();
logger.mark("after");

logger.measure(between("before", "after"), "with description");
```

#### Sample output

By default, profiling uses the `SummaryMeasureFormatter` to format the measure
log output. Example output:

```ts
//Measuring 'before' -> 'after' (with description), took 790ms; heap usage increased 9.2 MB to 11.7 MB; 18 ops dispatched, all completed
```

#### Special marks

There are two special marks which can be used, `NOW` and `PROCESS_START`. The
special mark `NOW` will generate a mark at the time of measurement, while
`PROCESS_START` represents the moment the process started (with 0ms time, 0
memory usage and 0 ops calls). These special marks do not require you to use the
`mark` function in the logger first.

#### Measuring examples

```ts
import {
  between,
  from,
  NOW,
  PROCESS_START,
  to,
} from "https://deno.land/x/optic/mod.ts";

logger.mark("before");
someFunction();
logger.mark("after");

//Measure between two marks (with optional description)
logger.measure(between("before", "after"));
logger.measure(between(PROCESS_START, "after"));
logger.measure(between("before", NOW), "with description");

//Measure from a mark to NOW (with optional description)
logger.measure(from("before"));
logger.measure(from("before"), "with description");

//Measure from PROCESS_START to mark (with optional description)
logger.measure(to("after"));
logger.measure(to("after"), "with description");

//Mesure from PROCESS_START to NOW (with optional description)
logger.measure();
logger.measure("with description");
```

### Configuring the profiler

There are a number of options for you to configure the profiler with if you
wish.

```ts
//Defaults shown below
logger.profilingConfig()
  .enabled(true) //Enable or disable all recording of marks or measures
  .captureMemory(true) //Enable or disable capturing of memory information
  .captureOps(true) //Enable or disable capturing of ops calls
  .withLogLevel(Level.Info) //Set the log level at which the profile measure is output
  .withFormatter(new SummaryMeasureFormatter()); //Formats the profiling log message
```

### Custom measure output

As described above, by default the `SummaryMeasureFormatter` is used to format
the output. You can specify your own measure formatter by implementing the
interface `MeasureFormatter`:

```ts
interface MeasureFormatter<T> {
  format(startMark: ProfileMark, endMark: ProfileMark, label?: string): T;
}
```

Example:

```ts
import { MeasureFormatter } from "https://deno.land/x/optic/mod.ts";

const myFormatter: MeasureFormatter<string> = {
  format(startMark: ProfileMark, endMark: ProfileMark, label?: string): string {
    return (endMark.timestamp - startMark.timestamp) + "ms" +
      (label ? (" " + label) : "");
  },
};
log.profilingConfig().withFormatter(myFormatter);
```
