// Copyright 2022 the optic authors. All rights reserved. MIT license.
import { assertEquals, test } from "../test_deps.ts";
import { Level, levelToName, nameToLevel } from "./levels.ts";

test({
  name: "level map maps level enum to name",
  fn() {
    assertEquals(levelToName(Level.Trace), "Trace");
    assertEquals(levelToName(Level.Debug), "Debug");
    assertEquals(levelToName(Level.Info), "Info");
    assertEquals(levelToName(Level.Warn), "Warn");
    assertEquals(levelToName(Level.Error), "Error");
    assertEquals(levelToName(Level.Critical), "Critical");
    assertEquals(levelToName(0), "UNKNOWN");
    assertEquals(levelToName(999), "UNKNOWN");
  },
});

test({
  name: "level name map returns level for name",
  fn() {
    assertEquals(nameToLevel("Trace"), Level.Trace);
    assertEquals(nameToLevel("Debug"), Level.Debug);
    assertEquals(nameToLevel("Info"), Level.Info);
    assertEquals(nameToLevel("Warn"), Level.Warn);
    assertEquals(nameToLevel("Error"), Level.Error);
    assertEquals(nameToLevel("Critical"), Level.Critical);
    assertEquals(nameToLevel("made up level"), 1);
  },
});

test({
  name: "level name map returns level for name case insensitive",
  fn() {
    assertEquals(nameToLevel("trace"), Level.Trace);
    assertEquals(nameToLevel("DEBUG"), Level.Debug);
    assertEquals(nameToLevel("inFo"), Level.Info);
    assertEquals(nameToLevel("warN"), Level.Warn);
    assertEquals(nameToLevel("ERROr"), Level.Error);
    assertEquals(nameToLevel("critical"), Level.Critical);
  },
});
