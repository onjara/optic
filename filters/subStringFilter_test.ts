import { assert, assertThrows, test } from "../test_deps.ts";
import { Level } from "../logger/levels.ts";
import type { LogRecord } from "../types.ts";
import { SubStringFilter } from "./subStringFilter.ts";

function lrMsg(msg: unknown) {
  return {
    msg: msg,
    metadata: [],
    dateTime: new Date("2020-06-17T03:24:00"),
    level: Level.DEBUG,
    logger: "default",
  };
}
function lrMeta(data: unknown[]) {
  return {
    msg: "",
    metadata: data,
    dateTime: new Date("2020-06-17T03:24:00"),
    level: Level.DEBUG,
    logger: "default",
  };
}

const stream = {
  handle(logRecord: LogRecord): boolean {
    return true;
  },
};

test({
  name: "Test msg string filtering",
  fn() {
    assert(
      new SubStringFilter("a").shouldFilterOut(
        stream,
        lrMsg("a new world"),
      ),
    );
    assert(
      new SubStringFilter("hello world")
        .shouldFilterOut(stream, lrMsg("hello world")),
    );
    assert(
      new SubStringFilter("password").shouldFilterOut(
        stream,
        lrMsg({ password: "abcd1234" }),
      ),
    );
    assert(
      !new SubStringFilter("a").shouldFilterOut(
        stream,
        lrMsg("hello world"),
      ),
    );
    assert(
      !new SubStringFilter("x").shouldFilterOut(
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
      new SubStringFilter("a").shouldFilterOut(
        stream,
        lrMeta([[1, 2, "a new world"]]),
      ),
    );
    assert(
      new SubStringFilter("hello world")
        .shouldFilterOut(stream, lrMeta([true, { a: 6, b: "hello world" }])),
    );
    assert(
      new SubStringFilter("password").shouldFilterOut(
        stream,
        lrMeta([true, { a: 6, b: "hello world", password: "abcd1234" }]),
      ),
    );
    assert(
      !new SubStringFilter("a").shouldFilterOut(
        stream,
        lrMeta(["hello world"]),
      ),
    );
    assert(
      !new SubStringFilter("x").shouldFilterOut(
        stream,
        lrMeta([{ a: 6 }]),
      ),
    );
    assert(
      !new SubStringFilter("a").shouldFilterOut(
        stream,
        lrMeta([]),
      ),
    );
  },
});
