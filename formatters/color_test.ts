import { assert, test } from "../test_deps.ts";
import { Level } from "../logger/levels.ts";
import { getColorForLevel } from "./color.ts";

test({
  name: "There is a matching color rule for each log level",
  fn() {
    assert(typeof getColorForLevel(Level.DEBUG) === "function");
    assert(typeof getColorForLevel(Level.INFO) === "function");
    assert(typeof getColorForLevel(Level.WARN) === "function");
    assert(typeof getColorForLevel(Level.ERROR) === "function");
    assert(typeof getColorForLevel(Level.CRITICAL) === "function");

    // unrecognized level
    assert(getColorForLevel(9999)("msg") === "msg");
  },
});
