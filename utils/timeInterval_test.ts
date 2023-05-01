// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import { assertEquals, assertThrows } from "../test_deps.ts";
import { intervalOf, TimeInterval } from "./timeInterval.ts";

Deno.test({
  name: "timeInterval should have valid input",
  fn() {
    const interval = new TimeInterval(1);
    assertEquals(interval.getPeriod(), 1);
    assertThrows(
      () => new TimeInterval(0),
      Error,
      "Invalid interval period: 0",
    );
  },
});

Deno.test({
  name: "intervalOf should have valid input",
  fn() {
    const interval = intervalOf(1);
    assertEquals(interval.seconds().getPeriod(), 1);
    assertThrows(
      () => intervalOf(0),
      Error,
      "Invalid interval period: 0",
    );
  },
});

Deno.test({
  name: "different time intervals should have different periods",
  fn() {
    const interval = intervalOf(1);
    assertEquals(interval.seconds().getPeriod(), 1);
    assertEquals(interval.minutes().getPeriod(), 60);
    assertEquals(interval.hours().getPeriod(), 3600);
    assertEquals(interval.days().getPeriod(), 86400);
  },
});
