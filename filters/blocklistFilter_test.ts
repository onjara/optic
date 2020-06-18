import {
  test,
  assert,
} from "../test_deps.ts";
import { Level } from "../logger/levels.ts";
import { LogRecord } from "../types.ts";
import { BlocklistFilter } from "./blocklistFilter.ts";

function lrMsg(msg: unknown) {
  return {
    msg: msg,
    metadata: [],
    dateTime: new Date("2020-06-17T03:24:00"),
    level: Level.DEBUG,
  };
}
function lrMeta(data: unknown[]) {
  return {
    msg: "",
    metadata: data,
    dateTime: new Date("2020-06-17T03:24:00"),
    level: Level.DEBUG,
  };
}

const stream = {
  handle(logRecord: LogRecord): void {},
};

test({
  name: "Test msg string filtering",
  fn() {
    assert(
      new BlocklistFilter().blockRecordsContaining("a", "b").shouldFilterOut(
        stream,
        lrMsg("a new world"),
      ),
    );
    assert(
      new BlocklistFilter().blockRecordsContaining("hello world")
        .shouldFilterOut(stream, lrMsg("hello world")),
    );
    assert(
      new BlocklistFilter().blockRecordsContaining("password").shouldFilterOut(
        stream,
        lrMsg({ password: "abcd1234" }),
      ),
    );
    assert(
      !new BlocklistFilter().blockRecordsContaining("a").shouldFilterOut(
        stream,
        lrMsg("hello world"),
      ),
    );
    assert(
      !new BlocklistFilter().blockRecordsContaining("x").shouldFilterOut(
        stream,
        lrMsg({ a: 6 }),
      ),
    );
  },
});

test({
  name: "Metadata string filtering",
  fn() {
    assert(
      new BlocklistFilter().blockRecordsContaining("a", "b").shouldFilterOut(
        stream,
        lrMeta([[1, 2, "a new world"]]),
      ),
    );
    assert(
      new BlocklistFilter().blockRecordsContaining("hello world")
        .shouldFilterOut(stream, lrMeta([true, { a: 6, b: "hello world" }])),
    );
    assert(
      new BlocklistFilter().blockRecordsContaining("password").shouldFilterOut(
        stream,
        lrMeta([true, { a: 6, b: "hello world", password: "abcd1234" }]),
      ),
    );
    assert(
      !new BlocklistFilter().blockRecordsContaining("a").shouldFilterOut(
        stream,
        lrMeta(["hello world"]),
      ),
    );
    assert(
      !new BlocklistFilter().blockRecordsContaining("x").shouldFilterOut(
        stream,
        lrMeta([{ a: 6 }]),
      ),
    );
    assert(
      !new BlocklistFilter().blockRecordsContaining("a").shouldFilterOut(
        stream,
        lrMeta([]),
      ),
    );
  },
});
