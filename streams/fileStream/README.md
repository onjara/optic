# File Stream

This stream will output log records to a log file.  It has many options.

## Specifying the log file

The log file is specified in the constructor of the file stream:
```typescript
const fs = new FileStream("/data/logs/logFile.txt");
```

## Specifying the minimum log level

By default, the file stream will log messages at or above `DEBUG`.  You may 
change this through programmatically setting the minimum log level:
```typescript
const fs = new FileStream("./logFile.txt")
  .withMinLogLevel(Level.ERROR);

```

## Formatting the log records

The file stream takes in any of Optic's formatters.  See the [full documentation](../..#log-formatting)
on formatting for details.

## Log buffering

File system writes are comparatively very slow compared to module execution.  To
reduce this performance hit, log records are buffered (held in memory) until
a threshold is reached at which point the buffered log records are 'flushed' to
the log file in one go.  This single larger file system access is much more
efficient than many smaller writes.

The default buffer size is 8,192 bytes.  You can also set this value
programmatically if you want a different buffer size:
```typescript
const fileStream = new FileStream("./logFile.txt")
  .withBufferSize(30000);  // in bytes
```

Buffering can also be disabled if desired, thereby forcing immediate writes of
every log record to the log file, by setting the buffer size to 0 bytes.

There are a number of scenarios where the buffer is flushed:
* The new log record would exceed the buffer size
* A log record with a log level greater than `ERROR` is logged
* The module exits normally (triggering a flush of the buffer via an `unload` event)
* `flush()` is called manually.  (e.g. `fileStream.flush()`)

## Log file initialization

A log file may already exist when your logger initializes.  You can control
what happens during logging initialization by specifying the desired behavior
of the log file initialization mode.  There are 3 options:

Option|Description
------|-----------
"append"|Reuse the log file if it exists or create a new one otherwise
"overwrite"|Always start with an empty log file, overwriting any existing one
"mustNotExist"|Always start with an empty log file, but throw an error if it already exists

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
* Byte rotation - When the log file would grow beyond a specified size, then
the file is rotated
* Date based rotation - This is a work in progress

### Byte size rotation

If a log file write would grow the file bigger than the specified size, then the
log file is rotated first.  As an example, let's say you have a log file `mod.log`.
Upon it's first rotation, `mod.log` becomes `mod.log.1` and the log record(s) are
written to a new, empty, `mod.log`.  When `mod.log` is ready to rotate again,
`mod.log.1` becomes `mod.log.2`, `mod.log` becomes `mod.log.1` and the new
record(s) are written to a new, empty, `mod.log`.  The number of log files kept
in rotation is specified by the rotation strategy.  The default is 7 log files.

Examples:
```typescript
const fileStream = new FileStream("./logFile.txt")
  .withLogFileRotation(every(2000000).bytes());
```

## Log file retention

Log file retention may also be specified, defining either how many log
files to keep or for how long to keep them.  As log file retention only makes
sense for rotated log files, log file retention policy is an attribute of
the log rotation and may be specified as a quantity of files, minutes, hours or
days.  Examples:
```typescript
const fixedNumberLogFileRetention = new FileStream("./logFile.txt")
  .withLogFileRotation(
    every(2000000).bytes()
      .withLogFileRetentionPolicy(of(7).files()));

const fixedTimeframeLogFileRetention = new FileStream("./logFile.txt")
  .withLogFileRotation(
    every(2000000).bytes()
      .withLogFileRetentionPolicy(of(36).hours()));
```
