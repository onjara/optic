# Log Formatting

Optic's streams allows you to format your logs however you wish, either through
your own custom formatting or several out of the box formatters. Formatters are
typically set directly on the stream via `withFormat()`.

## Optic formatters

Three out of the box formatters are available.

### TokenReplacer formatter

This formatter allows you to transform a log record to string using tokens as
placeholders for the various log record fields. When formatting a log record the
tokens are replaced by values of the log record fields. Any unrecognized tokens
(as well as other text) are left unmodified.

Available tokens are:

- `{msg}` - The log record message
- `{metadata}` - An array of metadata associated with the log record
- `{dateTime}` - The date/time the log record was created
- `{level}` - The log level of the log record
- `{logger}` - The name of this logger

The constructed token template is then passed to the `withFormat` function.

Complete example using `TokenReplacer`:

```ts
import { ConsoleStream, Logger } from "https://deno.land/x/optic/mod.ts";
import { TokenReplacer } from "https://deno.land/x/optic/formatters/mod.ts";

const logger = new Logger().addStream(
  new ConsoleStream()
    .withFormat(
      new TokenReplacer()
        .withFormat("{dateTime} Level: [{level}] Msg: {msg}")
        .withDateTimeFormat("hh:mm:ss YYYY-MM-DD")
        .withLevelPadding(10)
        .withColor(),
    ),
);

logger.info("hello world");
// Outputs in color to console: 22:09:54 2020-07-10 Level: [Info      ] Msg: hello world
```

- `withDateTimeFormat` allows for custom date/time formats and is described in
  more detail below.
- `withLevelPadding` allows you to pad the level name to allow the message to
  start at the same column in the console (as different levels have different
  lengths).
- `withColor` allows you to specify if the formatter output should be wrapped in
  color based on the log level

The defaults for this formatter are:

- Format is `"{dateTime} {level} {msg} {metadata}"`
- No color
- Optimal padding
- UTC date/time format. Example: `2020-07-11T20:16:34.477Z`

### JSON formatter

This formatter will take a log record and construct a structured JSON formatted
string with the specified log record fields. You may additionally specify the
JSON string to be pretty printed and the format of the date/time field.

Available fields are:

- `msg` - The log record message
- `metadata` - An array of metadata associated with the log record
- `dateTime` - The date/time the log record was created
- `level` - The log level of the log record
- `logger` - The name of this logger

Complete example using `JsonFormatter`:

```ts
import { ConsoleStream, Logger } from "https://deno.land/x/optic/mod.ts";
import { JsonFormatter } from "https://deno.land/x/optic/formatters/mod.ts";

const logger = new Logger().addStream(
  new ConsoleStream()
    .withFormat(
      new JsonFormatter()
        .withFields(["dateTime", "level", "logger", "msg"])
        .withDateTimeFormat("hh:mm:ss YYYY-MM-DD")
        .withPrettyPrintIndentation(2)
    ),
);

logger.info("Hello world");

// Outputs:
{
  "dateTime": "22:49:09 2020-07-10",
  "level": "Info",
  "logger": "default",
  "msg": "Hello world"
}
```

The defaults for this formatter are:

- Fields of `["dateTime", "level", "msg", "metadata"]`
- UTC date/time format. Example: `2020-07-11T20:16:34.477Z`
- No pretty printing

### DateTimeFormatter

This is a formatter to be used by other formatters to output the date and time
with a custom specification. An input string defines the formatting of the
timestamp using pre-defined tokens. The output date/time string is constructed
from the local date/time.

E.g. to use as a standalone class

```ts
import { SimpleDateTimeFormatter } from "https://deno.land/x/optic/formatters/mod.ts";

const dtf = new SimpleDateTimeFormatter("hh:mm:ss:SSS YYYY-MM-DD");
const dateTime = dtf.formatDateTime(new Date());
```

The formatting tokens are as per below. Any characters not formatted are left as
is. Tokens are case sensitive.

| Token  | Example      | Value                           |
| ------ | ------------ | ------------------------------- |
| `hh`   | `00..23`     | 2 digit hours (24 hour time)    |
| `h`    | `0..23`      | 1-2 digit hours (24 hour time)  |
| `HH`   | `01..12`     | 2 digit hours (12 hour time)    |
| `H`    | `1..12`      | 1-2 digit hours (12 hour time   |
| `a`    | `am` or `pm` | am/pm for use with 12 hour time |
| `A`    | `AM` or `PM` | AM/PM for use with 12 hour time |
| `mm`   | `00..59`     | minutes                         |
| `ss`   | `00..59`     | seconds                         |
| `SSS`  | `000..999`   | 3-digit milliseconds            |
| `SS`   | `00..99`     | 2-digit milliseconds            |
| `S`    | `0..9`       | 1-digit milliseconds            |
| `YYYY` | `2020`       | 4 digit year                    |
| `YY`   | `20`         | 2 digit year                    |
| `DD`   | `00..31`     | 2 digit day                     |
| `D`    | `0..31`      | 1-2 digit day                   |
| `MMMM` | `January`    | long form month                 |
| `MMM`  | `Jan`        | short form month                |
| `MM`   | `01..12`     | 2 digit month                   |
| `M`    | `1..12`      | 1-2 digit month                 |
| `dddd` | `Tuesday`    | long form day of week           |
| `ddd`  | `Tue`        | short form day of week          |

Optic's formatters allow you to add this formatter as follows, typically using
the shorthand of just the formatting string:

```ts
import { ConsoleStream, Logger } from "https://deno.land/x/optic/mod.ts";
import { TokenReplacer } from "https://deno.land/x/optic/formatters/mod.ts";

const logger = new Logger().addStream(
  new ConsoleStream()
    .withFormat(
      new TokenReplacer()
        .withDateTimeFormat("hh:mm:ss:SSS YYYY-MM-DD"),
      // equivalent to:
      // .withDateTimeFormat(new SimpleDateTimeFormatter("hh:mm:ss:SSS YYYY-MM-DD"))
    ),
);
```

## Using your own custom formatter

You can easily supply your own formatting capabilities via an implementation of
the `Formatter` interface:

```ts
export interface Formatter<T> {
  format(logRecord: LogRecord): T;
}
```

Example:

```ts
import {
  ConsoleStream,
  Formatter,
  Logger,
  LogRecord,
} from "https://deno.land/x/optic/mod.ts";

class MyFormatter implements Formatter<string> {
  format(logRecord: LogRecord): string {
    return "Hello! " + logRecord.msg;
  }
}

const logger = new Logger().addStream(
  new ConsoleStream().withFormat(new MyFormatter()),
);

logger.info("Some info message");

// Outputs to console: "Hello! Some info message"
```
