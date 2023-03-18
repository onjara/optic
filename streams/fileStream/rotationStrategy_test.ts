// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import { assert, assertEquals, assertThrows, test } from "../../test_deps.ts";
import { every } from "./rotationStrategy.ts";
import { FileSizeRotationStrategy } from "./fileSizeRotationStrategy.ts";
import { DateTimeRotationStrategy } from "./dateTimeRotationStrategy.ts";
import { IllegalStateError } from "../../types.ts";

test({
  name: "fluid interface returns correct class",
  fn() {
    assert(every(1).bytes() instanceof FileSizeRotationStrategy);
    assert(every(1).kb() instanceof FileSizeRotationStrategy);
    assert(every(1).mb() instanceof FileSizeRotationStrategy);
    assert(every(1).gb() instanceof FileSizeRotationStrategy);
    assert(every(1).days() instanceof DateTimeRotationStrategy);
    assert(every(1).hours() instanceof DateTimeRotationStrategy);
    assert(every(1).minutes() instanceof DateTimeRotationStrategy);
  },
});

test({
  name: "File size rotation strategy returns correct maxBytes",
  fn() {
    assertEquals(every(1).bytes().maxBytes, 1);
    assertEquals(every(1).kb().maxBytes, 1024);
    assertEquals(every(1).mb().maxBytes, 1024 * 1024);
    assertEquals(every(1).gb().maxBytes, 1024 * 1024 * 1024);
  },
});

test({
  name: "Cannot rotate on 0 or negative quantities",
  fn() {
    assertThrows(
      () => {
        every(0);
      },
      IllegalStateError,
      "Invalid rotation quantity: 0",
    );
    assertThrows(
      () => {
        every(-1);
      },
      IllegalStateError,
      "Invalid rotation quantity: -1",
    );
  },
});
