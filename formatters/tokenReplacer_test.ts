import { assert, assertEquals, assertMatch, test } from "../test_deps.ts";
import { TokenReplacer } from "./tokenReplacer.ts";
import { Level } from "../logger/levels.ts";
import { gray } from "../deps.ts";

const lr = {
  msg: "Log Message",
  metadata: ["The metadata"],
  dateTime: new Date(1592360640000), // "2020-06-17T03:24:00"
  level: Level.Debug,
  logger: "default",
};

function getMsgLr(msg: unknown) {
  return {
    msg: msg,
    metadata: ["The metadata"],
    dateTime: new Date(1592360640000), // "2020-06-17T03:24:00"
    level: Level.Debug,
    logger: "default",
  };
}

function getMetadataLr(meta: unknown[]) {
  return {
    msg: "The msg",
    metadata: meta,
    dateTime: new Date(1592360640000), // "2020-06-17T03:24:00"
    level: Level.Debug,
    logger: "default",
  };
}

test({
  name: "New TokenReplacer calculates level padding and uses default format",
  fn() {
    assertEquals(new TokenReplacer().levelPadding, 8);
    assertEquals(
      new TokenReplacer().formatString,
      "{dateTime} {level} {msg} {metadata}",
    );
  },
});

test({
  name: "You can set custom level padding",
  fn() {
    const tr = new TokenReplacer().withLevelPadding(2);
    assertEquals(tr.levelPadding, 2);
  },
});

test({
  name: "DateTimeFormat defaults to ISO string",
  fn() {
    const output = new TokenReplacer().withFormat("{dateTime}").format(lr);
    assertMatch(output, /2020-06-1[6,7,8]T\d\d:\d\d:00.000Z/);
  },
});

test({
  name: "You can set your own DateTimeFormatter class, fn or string",
  fn() {
    let output = new TokenReplacer().withFormat("{dateTime}")
      .withDateTimeFormat("YYYY")
      .format(lr);
    assertEquals(output, "2020");
    output = new TokenReplacer().withFormat("{dateTime}").withDateTimeFormat((
      d: Date,
    ) => "from fn").format(lr);
    assertEquals(output, "from fn");
    output = new TokenReplacer().withFormat("{dateTime}").withDateTimeFormat(
      { formatDateTime: (d: Date) => "from class" },
    ).format(lr);
    assertEquals(output, "from class");
  },
});

test({
  name: "Color is configurable",
  fn() {
    assert(new TokenReplacer().withColor().isColor());
    assert(new TokenReplacer().withColor(true).isColor());
    assert(!new TokenReplacer().withColor(false).isColor());
  },
});

test({
  name: "Levels are properly formatted",
  fn() {
    const tr = new TokenReplacer().withFormat("{level}");
    lr.level = Level.Debug;
    assertEquals(tr.format(lr), "Debug   ");
    lr.level = Level.Info;
    assertEquals(tr.format(lr), "Info    ");
    lr.level = Level.Warn;
    assertEquals(tr.format(lr), "Warn    ");
    lr.level = Level.Error;
    assertEquals(tr.format(lr), "Error   ");
    lr.level = Level.Critical;
    assertEquals(tr.format(lr), "Critical");
  },
});

test({
  name: "Msg is properly formatted, no matter what type",
  fn() {
    const tr = new TokenReplacer().withFormat("{msg}");
    const err = new Error();
    assertEquals(tr.format(getMsgLr(null)), "null");
    assertEquals(tr.format(getMsgLr(undefined)), "undefined");
    assertEquals(tr.format(getMsgLr("I am a string")), "I am a string");
    assertEquals(tr.format(getMsgLr(3.456)), "3.456");
    assertEquals(tr.format(getMsgLr(9007199254740991n)), "9007199254740991");
    assertEquals(tr.format(getMsgLr(Symbol("a"))), "Symbol(a)");
    assertEquals(
      tr.format(getMsgLr({ a: 6, b: "hello" })),
      '{"a":6,"b":"hello"}',
    );
    assertEquals(tr.format(getMsgLr(err)), err.stack);
  },
});

test({
  name: "Metadata is properly formatted for 0, 1 and many cases",
  fn() {
    const tr = new TokenReplacer().withFormat("{metadata}");
    const err = new Error();
    assertEquals(tr.format(getMetadataLr([])), "");
    assertEquals(tr.format(getMetadataLr([true])), "true");
    assertEquals(tr.format(getMetadataLr(["a", "b"])), "a b");
    assertEquals(
      tr.format(getMetadataLr([[1, 2, 3], "b", err])),
      "[1,2,3] b " + err.stack,
    );
  },
});

test({
  name: "If color is enabled, then output is tagged with color",
  fn() {
    const tr = new TokenReplacer().withColor();
    lr.level = Level.Debug;
    assertEquals(
      tr.format(lr),
      gray("2020-06-17T02:24:00.000Z Debug    Log Message The metadata"),
    );
  },
});

test({
  name: "Given no color available for level, then no coloring is applied",
  fn() {
    const tr = new TokenReplacer().withColor();
    lr.level = 99;
    assertEquals(
      tr.format(lr),
      "2020-06-17T02:24:00.000Z UNKNOWN  Log Message The metadata",
      //      dateTime: new Date("2020-06-17T03:24:00"),
    );
  },
});
test({
  name: "Logger name is a valid token",
  fn() {
    const tr = new TokenReplacer().withFormat("{msg} {logger}");
    lr.level = 99;
    assertEquals(
      tr.format(lr),
      "Log Message default",
    );
  },
});
