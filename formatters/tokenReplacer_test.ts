import {
  test,
  assertEquals,
} from "../test_deps.ts";
import { TokenReplacer } from "./tokenReplacer.ts";
import { ImmutableLogRecord } from "../logRecord.ts";
import { Level } from "../levels.ts";

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
    const lr = {
      msg: "",
      metadata: [],
      dateTime: new Date("2020-06-17T03:24:00"),
      level: Level.DEBUG,
    };
    const output = new TokenReplacer("{dateTime}").format(lr);
    // TODO make this work in other timezones (regex safest? or construct ISO date)
    assertEquals(output, "2020-06-17T02:24:00.000Z");
  },
});
