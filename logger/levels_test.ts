import {
  test,
  assertEquals,
} from "../test_deps.ts";
import { Level, levelToName, nameToLevel } from "./levels.ts";

test({
  name: "level map maps level enum to name",
  fn() {
    assertEquals(levelToName(Level.TRACE), "TRACE");
    assertEquals(levelToName(Level.DEBUG), "DEBUG");
    assertEquals(levelToName(Level.INFO), "INFO");
    assertEquals(levelToName(Level.WARN), "WARN");
    assertEquals(levelToName(Level.ERROR), "ERROR");
    assertEquals(levelToName(Level.CRITICAL), "CRITICAL");
    assertEquals(levelToName(0), "UNKNOWN");
    assertEquals(levelToName(999), "UNKNOWN");
  },
});

test({
  name: "level name map returns level for name",
  fn() {
    assertEquals(nameToLevel("TRACE"), Level.TRACE);
    assertEquals(nameToLevel("DEBUG"), Level.DEBUG);
    assertEquals(nameToLevel("INFO"), Level.INFO);
    assertEquals(nameToLevel("WARN"), Level.WARN);
    assertEquals(nameToLevel("ERROR"), Level.ERROR);
    assertEquals(nameToLevel("CRITICAL"), Level.CRITICAL);
    assertEquals(nameToLevel("made up level"), 1);
  },
});
