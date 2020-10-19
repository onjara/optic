# Filters

Filters allows you to filter out log records from your streams.  A log record
can be filtered out from one stream but not another.  Filters are processed
after monitors, but before transformers or stream handling.  Upon handling a
log record, the logger will run filters once for each registered stream.

Some use cases for filters include:
* Preventing spam from filling up your logs
* Removing log records which contain illegal characters
* Blocking malicious log records

## Constructing a filter

There are two ways to construct a filter.

### Filter function

This is a good choice for short and simple filters.  Filter functions must match
the following type:
```typescript
export type FilterFn = (stream: Stream, logRecord: LogRecord) => boolean;
```

The function takes in a stream and logRecord and returns true if the logRecord
should be filtered out.  Example:
```typescript
const filter: FilterFn = (stream: Stream, logRecord: LogRecord) =>
  (logRecord.msg as string).includes("bad stuff");
```

### Implement the Filter interface

The Filter interface requires you to implement the `shouldFilterOut` function,
which is of type `FilterFn` as above.  This gives you the power of a class for
more complex filtering, or perhaps you want to redirect filtered out logs to 
another logger and stream.

```typescript
class MyFilter implements Filter {
  shouldFilerOut(stream: Stream, logRecord: LogRecord): boolean {
    return (logRecord.msg as string).includes("bad stuff");
  }
}
```

## Registering your filter

Filters are registered directly with the logger as follows:
```typescript
const myFilter = new MyFilter();
const logger = new Logger().addFilter(myFilter);
```

## Ready made filters

Two filters are available in Optic.

### Regular Expression Filter

This filter takes in a regular expression.  If it matches, then the log record
is filtered out.  The log record `msg` and `metadata` fields are first
converted to a string if necessary before testing the regular expression.

```typescript
// Filters out log records containing `%` or `&` in the message or metadata
import { RegExpFilter } from "https://deno.land/x/optic/filters/regExpFilter.ts"

const regExpFilter = new RegExpFilter(/[%&]+/);
const logger = new Logger().addFilter(regExpFilter);
logger.error("Oh no!");  // not filtered
logger.error("Oh no!", "& another thing");  // filtered out
```

### Substring filter

This filter takes in a string.  If this string is found to be a substring of
either the log record `msg` or `metadata` fields (converting them to string
first if required), then this log record is filtered out.  Example:

```typescript
import { SubStringFilter } from "https://deno.land/x/optic/filters/subStringFilter.ts"
import { Logger } from "https://deno.land/x/optic/mod.ts"

const subStringFilter = new SubStringFilter("user1234");
const logger = new Logger().addFilter(subStringFilter);
logger.info({user: "joe1944", action: "login"});  // not filtered
logger.info({user: "user1234", action: "login"});  // filtered out

```