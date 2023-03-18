// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import { assertEquals, assertMatch, test } from "../test_deps.ts";
import { asString } from "./asString.ts";

test({
  name: "Types convert to string as expected",
  fn() {
    assertEquals(asString("hello world"), "hello world");
    assertEquals(asString(5), "5");
    assertEquals(asString(5.00012), "5.00012");
    assertEquals(asString(-5.00012), "-5.00012");
    assertEquals(asString(9007199254740991n), "9007199254740991");
    assertEquals(asString(true), "true");
    assertEquals(asString(false), "false");
    assertEquals(asString(null), "null");
    assertEquals(asString(undefined), "undefined");
    assertEquals(asString(Symbol("a")), "Symbol(a)");
    assertEquals(asString(() => "a"), "[function]");
    assertMatch(
      asString(new Date("2020-06-17T03:24:00")),
      /2020-06-1[6,7,8]T\d\d:\d\d:00.000Z/,
    );
    const err = new Error();
    assertEquals(asString(err), err.stack);
    assertEquals(
      asString({ a: true, b: 6, c: "hello" }),
      '{"a":true,"b":6,"c":"hello"}',
    );
  },
});

test({
  name: "Test circular reference",
  fn() {
    const a: { [k: string]: unknown } = {};
    a.name = "hello";
    a.circ = a;
    assertEquals(asString(a), `{\"name\":\"hello\",\"circ\":\"[ref=.]\"}`);
  },
});
