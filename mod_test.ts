import {
  test,
  assertEquals,
  assert,
} from "./test_deps.ts";
import { Optic } from "./mod.ts";
import type { Stream, LogRecord } from "./types.ts";

class NoOpStream implements Stream {
  handle(logRecord: LogRecord): void {
  }
}

test({
  name: "Default logger is created once and reused",
  fn() {
    const logger1 = Optic.logger().addStream(new NoOpStream());
    const logger2 = Optic.logger().addStream(new NoOpStream());
    assert(logger1 === logger2);
    assertEquals(logger1.name(), "default");
  },
});

test({
  name: "Named logger is created once and reused",
  fn() {
    const logger1 = Optic.logger("config").addStream(new NoOpStream());
    const logger2 = Optic.logger("config").addStream(new NoOpStream());
    assert(logger1 === logger2);
    assertEquals(logger1.name(), "config");
  },
});
