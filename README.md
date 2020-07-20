# NOTE

This project is not yet ready for public release and is a work in progress. 
Significant breaking changes are still underway.

# Optic

A highly extensible, configurable and easy to use logging framework for Deno. 

## Quick start

```typescript
import { Optic } from "https://deno.land/x/optic/mod.ts";

const logger = Optic.logger();
logger.info("Hello world!");  // outputs log record to the console
```
## Streams

Streams in Optic control the flow of log messages from a module logging statement
to an endpoint defined by the stream (e.g. console, file system, etc.).  A logger
can have one or more streams and the same log message will be handled by all
registered streams.

`ConsoleStream` is the default stream in a logger.  Once any stream is added to
the logger, the default stream is removed.  If console logging is still desired
you can explicitly add the `ConsoleStream` again.

### Optics streams

There are two out of the box streams available.

#### Console stream

A basic stream which outputs log messages to the console.

```typescript
const consoleStream = new ConsoleStream()
  .withMinLogLevel(Level.DEBUG)
  .withLogHeader(true)
  .withLogFooter(true)
  .withFormat(
    new TokenReplacer()
      .withColor()
      .withDateTimeFormat("YYYY.MM.DD hh:mm:ss:SSS")
  );

logger.addStream(consoleStream);
```

#### File stream

A stream which outputs log messages to the file system.

```typescript
const fileStream = new FileStream("./logFile.txt")
  .withMinLogLevel(Level.WARNING)
  .withFormat(new JsonFormatter())
  .withBufferSize(30000)
  .withLogFileInitMode("append")
  .withLogFileRotation(
    every(2000000).bytes().withLogFileRetentionPolicy(of(7).days()),
  )
  .withLogHeader(true)
  .withLogFooter(true);

logger.addStream(fileStream);
```

See [FileStream documentation](./streams/fileStream) for full details.

### Defining a custom stream

You can build your own stream by creating a class which implements the [`Stream`](./types.ts)
interface.  The `handle` function is the only requirement which defines what
your stream should do with a log record.  

Basic example:
```typescript
class SimpleStream implements Stream {
  handle(logRecord: LogRecord) {
    console.log(logRecord.msg);
  }
}

logger.addStream(new SimpleStream());
```

## Logging

All logging in Optic is done through a logger instance, which provides the 
interface and framework for all logging activity.

### Creating a logger

Before you can log anything you must first get an instance of a logger.  This
can either be the default logger, or a named logger.  Each logger instance will
be stored in the state and reused if that logger is requested again.

```typescript
// Using the default logger
const defaultLogger = Optic.logger();

// Using a named logger
const configLogger = Optic.logger("config");

// Reusing existing loggers
const exactSameDefaultLogger = Optic.logger();
const exactSameConfigLogger = Optic.logger("config");
```

### Logging an event

You can log an event through any of the level functions on the logger, supplying
a `msg` (of any type) and one or more optional `metadata` items.  E.g.
```typescript
logger.info("File loaded", "exa_113.txt", 1223, true);
```
In this example, `"File loaded"` is the log record message (primary data), with
supporting data of the file name (`"exa_113.txt"`), size (`1223`) and readonly
attribute (`true`) supplied.

### Log levels

Optic supports the following logging levels out of the box:
* Trace
* Debug
* Info
* Warning
* Error
* Critical

These may be used directly via the logger, e.g.
```typescript
logger.trace("Some trace info");
logger.error("Oops, something went wrong");
```

Or through the use of the Level enum, e.g.
```typescript
logger.log(Level.INFO, "Here some info");
```

### Log Records

Each log event (e.g. `logger.info("hello world")`) generates a `LogRecord` with
all the relevant info on the event.  Fields captured in the `LogRecord` are:

Field|Description
-----|-----------
msg| The primary content of the log event of any type
metadata| Supporting data, in one or more additional data items of any type
dateTime| When the log record was created
level| The log level of the event
logger| The name of the logger which generated the event

### Minimum log level

Each logger can be configured to log at a minimum level (the default level is
`DEBUG`). Log events with a level lower than the minimum level are discarded with
no action taken. You can programmatically get the logging level at any time with:
```typescript
const minLogLevel: Level = logger.minLogLevel();
```

There are 3 ways in which you can configure a logger to log at a 
minimum level:

#### Programmatically

Within the code, this can be set at any time and takes highest precedence of
any method:
```typescript
logger.withLevel(Level.WARNING);
```

#### Environment variable

Through the use of an environment variable `OPTIC_MIN_LEVEL` you can set the
minimum log level of any logger.  This method takes lowest priority and will be
overridden if set programmatically or supplied via a command line argument. The
values for this variable are any of the logging levels in uppercase, e.g. `INFO`.

**NOTE** for this method to work you MUST supply `--allow-env` to the Deno
command line process.  E.g.:
```shell
OPTIC_MIN_LEVEL=ERROR deno run --allow-env my-module.ts
```

#### Command line argument

You may also set the value of the minimum log level via a command line 
argument, `minLogLevel`.  Minimum log levels set this way apply to all loggers
unless overridden by programmatically setting a new level.  Example:
```shell
deno run my-module.ts minLogLevel=ERROR
```
The value of the argument is any valid log level in uppercase

### Logging lifecycle

Logging events will undergo the following lifecycle:
* If the minimum log level requirement is not met, the msg is returned with no
actions undertaken
* Resolve the msg function value if using deferred logging (see below)
* Run each registered monitor against the log record
* For each stream
  * Run each registered filter
  * Run each registered obfuscator against the log record (if not filtered)
  * Pass log record to stream for handling (if not filtered)
* Return msg value (or resolved msg value in deferred logging)

### In-line logging

All log statements return the value of the `msg` field, allowing more concise 
coding.  E.g.
```typescript
const user: User = logger.info(getUser());

// is equivalent to:
const user: User = getUser();
logger.info(user);
```

### Deferred logging

Deferred logging is used when you have expensive objects to create for logging
purposes, but don't want to incur the cost if the log message won't be handled
anyway.  By supplying a function argument to the log event `msg` field, this
will defer resolution of the value of this function until after determining if
the log event should be recorded.  Example:
```typescript
const value = logger.info(() => { return expensiveObjectCreation() });
```
Here, `expensiveObjectCreation()` won't be called unless the logger is allowed
to log info messages.  `value`, in this example, will be set to the return value of 
`expensiveObjectCreation()` if the logger logged the message or `undefined` if
it did not log it.

## Log formatting

Optic's streams allows you to format your logs however you wish, either through
your own custom formatting or several out of the box formatters.  Formatters
are set directly on the stream via `withFormat()`.

### Optic formatters overview

Three out of the box formatters are available.  See also the [complete 
documentation on formatters](./formatters).

#### TokenReplacer formatter

This formatter allows you to construct a custom string using tokens as
placeholders for the various log record fields.

Example:
```typescript
logger.addStream(
  new ConsoleStream()
    .withFormat(
      new TokenReplacer()
        .withFormat("{dateTime} {level} {msg} {metadata}")
        .withDateTimeFormat("hh:mm:ss YYYY-MM-DD")
        .withLevelPadding(10)
        .withColor()
    )
);
```
See [TokenReplacer documentation](./formatters#tokenreplacer-formatter) for full details.

#### JSON formatter

This formatter allows you to output your log record as a structured JSON
formatted string.

Example:
```typescript
logger.addStream(
  new ConsoleStream()
    .withFormat(
      new JsonFormatter()
        .withFields(["dateTime", "level", "logger", "msg"])
        .withDateTimeFormat("hh:mm:ss YYYY-MM-DD")
        .withPrettyPrintIndentation(2)
    ),
);
```
See [JSON formatter documentation](./formatters#json-formatter) for full details.

#### DateTimeFormatter

A formatter to be used within other formatters, this allows you to provide a
custom format for your date/time fields.  Example:

```typescript
logger.addStream(
  new ConsoleStream()
    .withFormat(
      new JsonFormatter().withDateTimeFormat("hh:mm:ss YYYY-MM-DD")
    )
);
```
See [DateTimeFormatter](./formatters#datetimeformatter) for full details.

#### Custom formatters

You can also easily supply your own custom formatter by implementing the 
`Formatter` interface.  See [Using your own custom formatter](formatters#using-your-own-custom-formatter)
for full details.

## Monitors

Monitors allow you to spy on log records that flow through your logger.  Monitors
are run first, before any filtering, obfuscation or stream handling. 

Some use cases for monitors include:
* Collect stats of your log records
* Send alert if too many error records detected
* Take automated action on specific error scenario
* Debugging aid - e.g. output certain records to the console

### Constructing a monitor

There are two ways to construct a monitor:

#### Monitor function

This is a good choice for short and simple monitors.  Monitor functions must
match the following type:
```typescript
export type MonitorFn = (logRecord: LogRecord) => void;
```

Example:
```typescript
import { MonitorFn } from "https://deno.land/x/optic/mod.ts";

const mon:MonitorFn = (logRecord:LogRecord):void => {
  if ((logRecord.msg as User).username === "jsmith") {
    console.log("User jsmith spotted again");
  }
}
```

#### Implement the Monitor interface

The Monitor interface requires implementation of the `check` function which is
of type `MonitorFn` as above.  This gives you the power of a class for more
complex monitors.

```typescript
import { MonitorFn } from "https://deno.land/x/optic/mod.ts";

class UserMonitor implements Monitor {
  check(logRecord:LogRecord):void {
    if ((logRecord.msg as User).username === "jsmith") {
      console.log("User jsmith spotted again");
    }
  }
}
```

### Registering Monitors

Monitors are registered directly with the logger as follows:
```typescript
const logger = Optic.logger().addMonitor(new UserMonitor());
```

## Obfuscation

Optic allows you to obfuscate log records sent to a stream, allowing a log
record to be obfuscated in one stream but not another. Obfuscation will hide
part of a log record, leaving the remainder untouched. Obfuscation takes place
after monitors and also after log filtering but before the log record is sent
to a stream.

Some use cases for obfuscation include:
* Hiding sensitive data in your logs such as passwords or credit card details
* Complying with data protection laws

### Constructing an obfuscator

There are two ways to construct an obfuscator.

#### Obfuscation function

This is a good choice for short and simple obfuscators.  Obfuscator functions
must match the following type:
```typescript
export type ObfuscatorFn = (stream: Stream, logRecord: LogRecord) => LogRecord;
```

The function takes a stream and logRecord and returns either the original 
log record if nothing is obfuscated, or a copy of the original with the
necessary data obfuscated.  Example:

```typescript
import { ObfuscatorFn } from "https://deno.land/x/optic/mod.ts";

const ob: ObfuscatorFn = (stream: Stream, logRecord: LogRecord):LogRecord => ({
  msg: (logRecord.msg as string).startsWith("password:")
    ? "password: [Redacted]"
    : logRecord.msg,
  metadata: [...logRecord.metadata],
  level: logRecord.level,
  logger: logRecord.logger,
  dateTime: new Date(logRecord.dateTime.getTime()),
});
```

#### Implement the Obfuscator interface

The Obfuscator interface requires implementation of the `obfuscate` function,
which is of type `ObfuscatorFn` as above.  This gives you the power of a class
for more complex obfuscation.

```typescript
import { Obfuscator, Stream, LogRecord } from "https://deno.land/x/optic/mod.ts";

class PasswordObfuscator implements Obfuscator {
  obfuscate(stream: Stream, logRecord: LogRecord): LogRecord {
    if ((logRecord.msg as string).startsWith("password:")) {
      return {
        msg:"password: [Redacted]",
        metadata: [...logRecord.metadata],
        level: logRecord.level,
        logger: logRecord.logger,
        dateTime: new Date(logRecord.dateTime.getTime()),
      }
    } else {
      return logRecord;
    }
  }
}
```

### Registering obfuscators

Obfuscators are registered directly with the logger as follows:
```typescript
const passwordObfuscator = new PasswordObfuscator();
const logger = Optic.logger().addObfuscator(passwordObfuscator);
```

### Optic obfuscators

Two out of the box obfuscators are available in Optic.

#### Property redaction obfuscator

This obfuscator allows you to specify a single object property name which if found
in the `msg` or `metadata` log record fields (using deep object searching), will
replace the value of that property with the string `[Redacted]`.  The original
object is untouched, as obfuscation clones the object before obfuscation.

```typescript
import { PropertyRedaction } from "https://deno.land/x/optic/mod.ts";

logger.addObfuscator(new PropertyRedaction('password'));

// This next record is untouched by the obfuscator (no `password` property)
logger.info({user: "abc29002", dateOfBirth: "1966/02/33"});

// This record gets transformed to: {user: "abc29002", password: "[Redacted]"}
logger.info({user: "abc29002", password: "s3cr3tpwd"});
```

#### Regular expression redaction

This obfuscator allows you to specify a regular expression and an optional
replacer function.  The RegExReplacer will then go through the `msg` and 
`metadata` fields looking for string values.  Anytime it finds one, it will
run the Javascript `string.replace(regEx, replacer)` against it. For more details
on this, see [String.replace()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace).

There are two included replacer functions. `alphaNumericReplacer` (the default) 
will replace all letters and numbers with `*`'s.  `nonWhitespaceReplacer` will
replace all non white space characters with `*`'s.  For both replacers, if the
regular expression does not use groups then then entire match is replaced, however
if groups are used, only the groups are replaced.

```typescript
import { RegExReplacer, nonWhitespaceReplacer } from "https://deno.land/x/optic/mod.ts";

logger.addObfuscator(new RegExReplacer(/£([\d]+\.[\d]{2})/));
logger.addObfuscator(new RegExReplacer(/password: (.*)/, nonWhitespaceReplacer));

logger.info("Amount: £122.51"); // becomes "Amount: £***.**" ('£' is not in a group)
logger.info("password: MyS3cret! Pwd!"); // becomes "password: ********* ****"
```

RegEx and Replacer examples:

RegEx|Test string|alphaNumericReplacer|nonWhitespaceReplacer
-----|-----------|--------------------|---------------------
/£([\d]+\.[\d]{2})/|£52.22|£**.**|£*****
/\d{2}-\d{2}-\d{4}/|30-04-1954| \*\*-\*\*-\*\*\*\* |**********

## Filters

Filters allows you to filter out log records from your streams.  A log record
can be filtered out from one stream but not another.  Filters are processed
after monitors, but before obfuscators or stream handling.  Upon handling a
log record, the logger will run filters once for each registered stream.

Some use cases for filters include:
* Preventing spam from filling up your logs
* Directing log messages to certain streams only, based on content
* Blocking malicious log records
* Redirecting certain log records to an entirely different logger

### Constructing a filter

There are two ways to construct a filter.

#### Filter function

This is a good choice for short and simple filters.  Filter functions must match
the following type:
```typescript
export type FilterFn = (stream: Stream, logRecord: LogRecord) => boolean;
```

The function takes in a stream and logRecord and returns true if the logRecord
should be filtered out.  Example:
```typescript
import { FilterFn, Stream, LogRecord } from "https://deno.land/x/optic/mod.ts";
const filter: FilterFn = (stream: Stream, logRecord: LogRecord) =>
  (logRecord.msg as string).includes("bad stuff");
```

#### Implement the Filter interface

The Filter interface requires you to implement the `shouldFilterOut` function,
which is of type `FilterFn` as above.  This gives you the power of a class for
more complex filtering, or perhaps you want to redirect filtered out logs to 
another logger and stream.

```typescript
import { Filter, Stream, LogRecord } from "https://deno.land/x/optic/mod.ts";

class MyFilter implements Filter {
  shouldFilerOut(stream: Stream, logRecord: LogRecord): boolean {
    return (logRecord.msg as string).includes("bad stuff");
  }
}
```

### Registering filters

Filters are registered directly with the logger as follows:
```typescript
const myFilter = new MyFilter();
const logger = Optic.logger().addFilter(myFilter);
```

### Optic filters

Two out of the box filters are available in Optic.

#### Regular Expression Filter

This filter takes in a regular expression.  If it matches, then the log record
is filtered out.  The log record `msg` and `metadata` fields are first
converted to a string if necessary before testing the regular expression.

```typescript
import { RegExFilter } from "https://deno.land/x/optic/mod.ts";

// Filters out log records containing `%` or `&` in the message or metadata
const regExFilter = new RegExFilter(/[%&]+/);
logger.addFilter(regExFilter);
logger.error("Oh no!");  // not filtered
logger.error("Oh no!", "& another thing");  // filtered out
```

#### Substring filter

This filter takes in a string.  If this string is found to be a substring of
either the log record `msg` or `metadata` fields (converting them to string
first if required), then this log record is filtered out.  Example:

```typescript
import { SubStringFilter } from "https://deno.land/x/optic/mod.ts";

const subStringFilter = new SubStringFilter("user1234");
logger.addFilter(subStringFilter);
logger.info({user: "joe1944", action: "login"});  // not filtered
logger.info({user: "user1234", action: "login"});  // filtered out

```