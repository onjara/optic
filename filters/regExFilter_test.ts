// Copyright 2020 the optic authors. All rights reserved. MIT license.
import { assert, test } from "../test_deps.ts";
import { Level } from "../logger/levels.ts";
import { RegExFilter } from "./regExFilter.ts";
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
  handle(logRecord: LogRecord): boolean {
    return true;
  },
};

test({
  name: "Regular expressions work as expected for msg field",
  fn() {
    assert(
      !new RegExFilter("hello").shouldFilterOut(stream, lrMsg(null)),
    );
    assert(
      !new RegExFilter("hello").shouldFilterOut(stream, lrMsg(undefined)),
    );
    assert(
      new RegExFilter("hello").shouldFilterOut(stream, lrMsg("hello world")),
    );
    assert(
      new RegExFilter("hello").shouldFilterOut(stream, lrMsg("hello world")),
    );
    assert(
      !new RegExFilter("hello").shouldFilterOut(stream, lrMsg("helllo world")),
    );
    assert(
      new RegExFilter(".*abc.*").shouldFilterOut(stream, lrMsg("xxxabcyyy")),
    );
    assert(!new RegExFilter(".*abc.*").shouldFilterOut(stream, lrMsg("axbxc")));
    assert(
      new RegExFilter(/hello/).shouldFilterOut(stream, lrMsg("hello world")),
    );
    assert(
      !new RegExFilter(/hello/).shouldFilterOut(stream, lrMsg("helllo world")),
    );
    assert(new RegExFilter(/[^bt]ear/).shouldFilterOut(stream, lrMsg("fear")));
    assert(!new RegExFilter(/[^bt]ear/).shouldFilterOut(stream, lrMsg("bear")));
  },
});

test({
  name: "Regular expressions work as expected for metadata field",
  fn() {
    assert(
      new RegExFilter("hello").shouldFilterOut(
        stream,
        lrMeta(["abc", "hello world", "def"]),
      ),
    );
    assert(
      !new RegExFilter("hello").shouldFilterOut(
        stream,
        lrMeta(["abc", "helllo world", "def"]),
      ),
    );
    assert(
      new RegExFilter(".*abc.*").shouldFilterOut(
        stream,
        lrMeta(["xxxabcyyy", "def", "ghi"]),
      ),
    );
    assert(
      !new RegExFilter(".*abc.*").shouldFilterOut(
        stream,
        lrMeta(["axbxc", "def", "ghi"]),
      ),
    );
    assert(
      new RegExFilter(/hello/).shouldFilterOut(
        stream,
        lrMeta(["abc", "def", "hello world"]),
      ),
    );
    assert(
      !new RegExFilter(/hello/).shouldFilterOut(
        stream,
        lrMeta(["abc", "def", "helllo world"]),
      ),
    );
    assert(
      new RegExFilter(/[^bt]ear/).shouldFilterOut(stream, lrMeta(["fear"])),
    );
    assert(
      !new RegExFilter(/[^bt]ear/).shouldFilterOut(stream, lrMeta(["bear"])),
    );
  },
});

test({
  name: "This filter can act as an illegal character filter",
  fn() {
    const ref = new RegExFilter(/[£%~`]+/);
    assert(ref.shouldFilterOut(stream, lrMsg("£300.35")));
    assert(ref.shouldFilterOut(stream, lrMsg("85% approved")));
    assert(ref.shouldFilterOut(stream, lrMsg("Approx. ~30")));
    assert(ref.shouldFilterOut(stream, lrMsg("`hello`")));
    assert(!ref.shouldFilterOut(stream, lrMsg("#this is a test#")));
    assert(!ref.shouldFilterOut(stream, lrMsg("*?/\|\\@,*^")));
  },
});
