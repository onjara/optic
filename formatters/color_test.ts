// Copyright 2022 the optic authors. All rights reserved. MIT license.
import { assert, test } from "../test_deps.ts";
import { Level } from "../logger/levels.ts";
import { getColorForLevel } from "./color.ts";

test({
  name: "There is a matching color rule for each log level",
  fn() {
    assert(typeof getColorForLevel(Level.Debug) === "function");
    assert(typeof getColorForLevel(Level.Info) === "function");
    assert(typeof getColorForLevel(Level.Warn) === "function");
    assert(typeof getColorForLevel(Level.Error) === "function");
    assert(typeof getColorForLevel(Level.Critical) === "function");

    // unrecognized level
    assert(getColorForLevel(9999)("msg") === "msg");
  },
});
