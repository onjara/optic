import {
  test,
  assert,
} from "../test_deps.ts";
import { levelMap } from "../logger/levels.ts";
import { colorRules } from "./color.ts";

test({
  name: "There is a matching color rule for each log level",
  fn() {
    for (const level of levelMap.keys()) {
      assert(typeof colorRules.get(level) === "function");
    }
  },
});
