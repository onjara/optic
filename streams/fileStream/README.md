# File Stream

This stream will output log records to a log file.  It has many options.

## Specifying the log file

The log file is specified in the constructor of the file stream:
```typescript
import { FileStream } from "https://deno.land/x/optic/streams/fileStream/mod.ts";
const fs = new FileStream("/data/logs/logFile.txt");
```

## Specifying the minimum log level

By default, the file stream will log messages at or above `Debug`.  You may 
change this by programmatically setting the minimum log level:
```typescript
const fs = new FileStream("./logFile.txt")
  .withMinLogLevel(Level.Error);

```

## Formatting the log records

The file stream takes in any of Optic's formatters.  See the [full documentation](https://github.com/onjara/optic#log-formatting)
on formatting for details.

## Log buffering

File system writes are very slow compared to module execution.  To improve
log write performance, log records are buffered (held in memory) until
a threshold is reached at which point the buffered log records are 'flushed' to
the log file in one go.  This single larger file system access is much more
efficient than many smaller writes, resulting in greater module performance.

The default buffer size is 8,192 bytes.  This value can be set
programmatically if you want a different buffer size:
```typescript
const fileStream = new FileStream("./logFile.txt")
  .withBufferSize(30000);  // in bytes
```

Buffering can also be disabled if desired, thereby forcing immediate writes of
every log record to the log file, by setting the buffer size to 0 bytes.

The buffer is flushed in the following scenarios:
* The new log record, when added to the buffer, would cause the buffer to exceed the max buffer size
* A log record with a log level greater than `Error` is logged
* The module exits normally (triggering a flush of the buffer via an `unload` event)
* `flush()` is called manually.  (e.g. `fileStream.flush()`)

## Log file initialization

A log file may already exist when your logger initializes.  You can control
what happens during logging initialization by specifying the desired behavior
of the log file initialization mode.  There are 3 options:

Option|Description
------|-----------
"append"|Continue appending to an existing log file or create a new empty one if it didn't exist.  This option has no effect on rotated log files.
"overwrite"|Always start with a clean slate with an empty log file, discarding any existing ones.  In addition to starting with a clean log file, previous rotated log files will also be deleted.
"mustNotExist"|Always start with an empty log file, but throw an error if it or any previously rotated log files already exists

The log file initialization option is specified via:
```typescript
const fileStream = new FileStream("./logFile.txt")
  .withLogFileInitMode("append");
```

## Log file rotation

By default, the file stream uses a singe log file and will keep appending
indefinitely.  You may wish to employ a log rotation strategy.  This will 
automatically move the current log file to a backup file and start a fresh one,
preventing any individual log file from getting to big.  It can also help
organize your log files better.  There are two rotation strategies:
* File size rotation__ - When the log file would grow beyond a specified size, then
the file is rotated.

### File size rotation

If a log file write would grow the file bigger than the specified size, then the
log file is rotated first.  As an example, let's say you have a log file `mod.log`.
Upon its first rotation, `mod.log` becomes `mod.log.1` and the log record(s) are
written to a new, empty, `mod.log`.  When `mod.log` is ready to rotate again,
`mod.log.1` becomes `mod.log.2`, `mod.log` becomes `mod.log.1` and the new
record(s) are written to a new, empty, `mod.log`.  

Example:
```typescript
import { FileStream, every } from "https://deno.land/x/optic/streams/fileStream/mod.ts";

const fileStream = new FileStream("./logFile.txt")
  .withLogFileRotation(every(2000000).bytes());
```

### Date/Time rotation

With this rotation strategy, files are rotated after a fixed period of days, hours 
or minutes.  Rotated log files are appended with the date and, for minutes or hours
based rotation strategies, the time as well.  E.g. `mod.log.2020.05.25` or 
`mod.log_2020.05.25_15.33`.

Example:
```typescript
import { FileStream, every } from "https://deno.land/x/optic/streams/fileStream/mod.ts";

const fileStream = new FileStream("./logFile.txt")
  .withLogFileRotation(every(2).days());
```

## Log file retention

By default, a maximum of 7 log files are kept.  A custom log file retention policy
may also be specified, defining either the maximum number of log files to keep or
for how long to keep them.  Any log file which falls outside the retention policy
is deleted.

As log file retention only makes sense for rotated log files, log file retention
policy is an attribute of the log rotation strategy and may be specified as a
quantity of files, minutes, hours or days.  Retention policy is enforced at
stream initialization and on log rotation events.  

Examples:
```typescript
import { FileStream, every, of } from "https://deno.land/x/optic/streams/fileStream/mod.ts";

// Retain up to 7 log files maximum
const fixedNumberLogFileRetention = new FileStream("./logFile.txt")
  .withLogFileRotation(
    every(2000000).bytes()
      .withLogFileRetentionPolicy(of(7).files()));

// Retain logs files for maximum of 36 hours
const fixedTimeframeLogFileRetention = new FileStream("./logFile.txt")
  .withLogFileRotation(
    every(2000000).bytes()
      .withLogFileRetentionPolicy(of(36).hours()));
```
