// Copyright 2022 the optic authors. All rights reserved. MIT license.
import { assertEquals, test } from "../test_deps.ts";
import { clone } from "./deepClone.ts";

test({
  name: "shallow clone",
  fn() {
    const a = 1;
    const b = true;
    const c = "string";
    const d = 9007199254740991n;
    const e = undefined;
    const f = null;
    const g = Symbol("mySymbol");
    const h = function () {};
    const j = new Date();
    const k = new Error("ack!");
    const l = { a: "hello world" };
    assertEquals(clone(a), a);
    assertEquals(clone(b), b);
    assertEquals(clone(c), c);
    assertEquals(clone(d), d);
    assertEquals(clone(e), e);
    assertEquals(clone(f), f);
    assertEquals(clone(g), g);
    assertEquals(clone(h), h);
    assertEquals(clone(j), j);
    assertEquals(clone(k), k);
    assertEquals(clone(l), l);
  },
});

test({
  name: "deep clone with complex types",
  fn() {
    const obj = {
      a: 1,
      b: {
        c: true,
        d: {
          e: "string",
          f: {
            g: 9007199254740991n,
            h: {
              i: undefined,
              j: {
                k: null,
                l: {
                  m: Symbol("asdf"),
                  n: {
                    o: function () {},
                    p: {
                      q: new Date(),
                      r: new Error("ack!"),
                      s: new Map<string, number>(),
                      t: new Set<string>(),
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    assertEquals(clone(obj), obj);
  },
});
