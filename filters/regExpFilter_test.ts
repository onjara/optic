// Copyright 2022 the optic authors. All rights reserved. MIT license.
import { assert, test } from "../test_deps.ts";
import { Level } from "../logger/levels.ts";
import { RegExpFilter } from "./regExpFilter.ts";
import type { LogRecord } from "../types.ts";

function lrMsg(msg: unknown) {
  return {
    msg: msg,
    metadata: ["The metadata"],
    dateTime: new Date("2020-06-17T03:24:00"),
    level: Level.Debug,
    logger: "default",
  };
}

function lrMeta(meta: string[]) {
  return {
    msg: "The msg",
    metadata: meta,
    dateTime: new Date("2020-06-17T03:24:00"),
    level: Level.Debug,
    logger: "default",
  };
}

const stream = {
  handle(_logRecord: LogRecord): boolean {
    return true;
  },
};

test({
  name: "Regular expressions work as expected for msg field",
  fn() {
    assert(
      !new RegExpFilter("hello").shouldFilterOut(stream, lrMsg(null)),
    );
    assert(
      !new RegExpFilter("hello").shouldFilterOut(stream, lrMsg(undefined)),
    );
    assert(
      new RegExpFilter("hello").shouldFilterOut(stream, lrMsg("hello world")),
    );
    assert(
      new RegExpFilter("hello").shouldFilterOut(stream, lrMsg("hello world")),
    );
    assert(
      !new RegExpFilter("hello").shouldFilterOut(stream, lrMsg("helllo world")),
    );
    assert(
      new RegExpFilter(".*abc.*").shouldFilterOut(stream, lrMsg("xxxabcyyy")),
    );
    assert(
      !new RegExpFilter(".*abc.*").shouldFilterOut(stream, lrMsg("axbxc")),
    );
    assert(
      new RegExpFilter(/hello/).shouldFilterOut(stream, lrMsg("hello world")),
    );
    assert(
      !new RegExpFilter(/hello/).shouldFilterOut(stream, lrMsg("helllo world")),
    );
    assert(new RegExpFilter(/[^bt]ear/).shouldFilterOut(stream, lrMsg("fear")));
    assert(
      !new RegExpFilter(/[^bt]ear/).shouldFilterOut(stream, lrMsg("bear")),
    );
  },
});

test({
  name: "Regular expressions work as expected for metadata field",
  fn() {
    assert(
      new RegExpFilter("hello").shouldFilterOut(
        stream,
        lrMeta(["abc", "hello world", "def"]),
      ),
    );
    assert(
      !new RegExpFilter("hello").shouldFilterOut(
        stream,
        lrMeta(["abc", "helllo world", "def"]),
      ),
    );
    assert(
      new RegExpFilter(".*abc.*").shouldFilterOut(
        stream,
        lrMeta(["xxxabcyyy", "def", "ghi"]),
      ),
    );
    assert(
      !new RegExpFilter(".*abc.*").shouldFilterOut(
        stream,
        lrMeta(["axbxc", "def", "ghi"]),
      ),
    );
    assert(
      new RegExpFilter(/hello/).shouldFilterOut(
        stream,
        lrMeta(["abc", "def", "hello world"]),
      ),
    );
    assert(
      !new RegExpFilter(/hello/).shouldFilterOut(
        stream,
        lrMeta(["abc", "def", "helllo world"]),
      ),
    );
    assert(
      new RegExpFilter(/[^bt]ear/).shouldFilterOut(stream, lrMeta(["fear"])),
    );
    assert(
      !new RegExpFilter(/[^bt]ear/).shouldFilterOut(stream, lrMeta(["bear"])),
    );
  },
});

test({
  name: "This filter can act as an illegal character filter",
  fn() {
    const ref = new RegExpFilter(/[£%~`]+/);
    assert(ref.shouldFilterOut(stream, lrMsg("£300.35")));
    assert(ref.shouldFilterOut(stream, lrMsg("85% approved")));
    assert(ref.shouldFilterOut(stream, lrMsg("Approx. ~30")));
    assert(ref.shouldFilterOut(stream, lrMsg("`hello`")));
    assert(!ref.shouldFilterOut(stream, lrMsg("#this is a test#")));
    assert(!ref.shouldFilterOut(stream, lrMsg("*?/\|\\@,*^")));
  },
});
