import { assertEquals, test } from "../test_deps.ts";
import { ImmutableLogRecord } from "./logRecord.ts";
import { Level } from "./levels.ts";

test({
  name: "LogRecord is immutable",
  fn() {
    const ilr = new ImmutableLogRecord(
      "msg",
      ["a", "b"],
      Level.Debug,
      "myLogger",
    );
    ilr.metadata[0] = "ddddddddddd";
    ilr.dateTime.setFullYear(1999);
    assertEquals(ilr.metadata, ["a", "b"]);
    assertEquals(ilr.dateTime.getFullYear, new Date().getFullYear);
    assertEquals(ilr.logger, "myLogger");
  },
});
