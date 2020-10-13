// Copyright 2020 the optic authors. All rights reserved. MIT license.
import { assertEquals, assertMatch, test } from "../test_deps.ts";
import { stringify } from "./stringify.ts";
import { SimpleDateTimeFormatter } from "./simpleDateTimeFormatter.ts";

const SEPT_24_2020 = new Date(1600981358481);
const DATE_FMT = new SimpleDateTimeFormatter("hh:mm dddd MMM D");

test({
  name: "Basic types stringified correctly",
  fn() {
    assertEquals(stringify("hello world"), `"hello world"`);
    assertEquals(stringify("/£([\d]+\.[\d]{2})/"), `"/£([\d]+\.[\d]{2})/"`);

    assertEquals(stringify(5), "5");
    assertEquals(stringify(null), "null");
    assertEquals(stringify(undefined), `"undefined"`);
    assertEquals(stringify(Infinity), `"Infinity"`);
    assertEquals(stringify(-Infinity), `"-Infinity"`);
    assertEquals(stringify(NaN), `"NaN"`);
    assertEquals(stringify(9007199254740991n), `"9007199254740991"`);
    assertEquals(stringify(() => "hello world"), `"[Function]"`);
  },
});

test({
  name: "Arrays stringified correctly",
  fn() {
    assertEquals(stringify([1, 2, 3]), "[1,2,3]");
    assertEquals(stringify(["a", "b", "c"]), `["a","b","c"]`);
    assertEquals(
      stringify([null, undefined, true, 9n, NaN]),
      `[null,"undefined",true,"9","NaN"]`,
    );
  },
});

test({
  name: "Objects stringified correctly",
  fn() {
    assertEquals(stringify({ a: 5, b: 7 }), `{"a":5,"b":7}`);
    assertEquals(stringify({ a: "x", b: "y" }), `{"a":"x","b":"y"}`);
    assertEquals(
      stringify({ a: null, b: undefined, c: true, d: 9n, e: NaN }),
      `{"a":null,"b":"undefined","c":true,"d":"9","e":"NaN"}`,
    );
  },
});

test({
  name: "Sets stringified correctly",
  fn() {
    assertEquals(stringify(new Set([1, 2, 3, 4])), "[1,2,3,4]");
    assertEquals(stringify(new Set(["a", "b", "c"])), `["a","b","c"]`);
    assertEquals(
      stringify(new Set([null, undefined, true, 9n, NaN])),
      `[null,"undefined",true,"9","NaN"]`,
    );
  },
});

test({
  name: "Maps stringified correctly",
  fn() {
    assertEquals(
      stringify(new Map([["key1", "value1"], ["key2", "value2"]])),
      `[["key1","value1"],["key2","value2"]]`,
    );
    assertEquals(
      stringify(new Map([["key1", undefined], ["key2", NaN]])),
      `[["key1","undefined"],["key2","NaN"]]`,
    );
    assertEquals(
      stringify(new Map([["key1", true], ["key2", false]])),
      `[["key1",true],["key2",false]]`,
    );
  },
});

test({
  name: "RegEx stringified correctly",
  fn() {
    assertEquals(
      stringify(new RegExp(/£([\d]+\.[\d]{2})/g)),
      `{"regexSource":"£([\\\\d]+\\\\.[\\\\d]{2})","flags":"g"}`,
    );
    assertEquals(
      stringify(new RegExp(/£([\d]+\.[\d]{2})/)),
      `{"regexSource":"£([\\\\d]+\\\\.[\\\\d]{2})","flags":""}`,
    );
  },
});

test({
  name: "Dates stringified correctly",
  fn() {
    assertEquals(stringify(SEPT_24_2020), `"2020-09-24T21:02:38.481Z"`);
    assertMatch(
      stringify(SEPT_24_2020, { dateTimeFormatter: DATE_FMT }),
      /\"\d\d:02 Thursday Sep 24\"/,
    );
  },
});

test({
  name: "Errors stringified correctly",
  fn() {
    assertEquals(
      stringify(new Error("hello"), { suppressErrorStack: true }),
      `"Error: hello"`,
    );
    assertMatch(
      stringify(new Error("hello")),
      /Error: hello\\n\s{4}at fn \(stringify_test\.ts:.*/,
    );
  },
});

test({
  name: "Nested objects stringified correctly",
  fn() {
    const map = new Map([[SEPT_24_2020, new Set(["a", "b", "c"])]]);
    const obj = {
      first: { subFirst: map },
      second: { subSecond: SEPT_24_2020 },
    };
    assertMatch(
      stringify(obj, { dateTimeFormatter: DATE_FMT }),
      /{\"first\":{\"subFirst\":\[\[\"\d\d:02 Thursday Sep 24\",\[\"a\",\"b\",\"c\"\]\]\]},\"second\":{\"subSecond\":\"\d\d:02 Thursday Sep 24\"}}/,
    );
  },
});

test({
  name: "Circular dependencies stringified correctly",
  fn() {
    const obj_a: Record<string, unknown> = {};
    const obj_b: Record<string, unknown> = {};
    const obj_c = { a: obj_a };
    obj_a["b"] = obj_b;
    obj_b["c"] = obj_c;
    assertEquals(stringify(obj_a), `{"b":{"c":{"a":"[ref=.]"}}}`);

    const deepRecursiveObj = {
      some: "prop",
      deeply: {
        recursive: {
          obj: {},
        },
      },
    };

    deepRecursiveObj.deeply.recursive.obj = deepRecursiveObj.deeply.recursive;
    assertEquals(
      stringify(deepRecursiveObj),
      `{"some":"prop","deeply":{"recursive":{"obj":"[ref=.deeply.recursive]"}}}`,
    );
  },
});

test({
  name: "indentation works as expected",
  fn() {
    const obj = { a: { b: { c: "hello world" } } };
    assertEquals(
      stringify(obj, { indent: 2 }),
      '{\n  "a": {\n    "b": {\n      "c": "hello world"\n    }\n  }\n}',
    );
  },
});
