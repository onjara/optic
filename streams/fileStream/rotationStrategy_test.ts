// Copyright 2020 the optic authors. All rights reserved. MIT license.
import { assert, assertThrows, test } from "../../test_deps.ts";
import { every } from "./rotationStrategy.ts";
import { FileSizeRotationStrategy } from "./fileSizeRotationStrategy.ts";
import { DateTimeRotationStrategy } from "./dateTimeRotationStrategy.ts";
import { IllegalStateError } from "../../types.ts";

test({
  name: "fluid interface returns correct class",
  fn() {
    assert(every(1).bytes() instanceof FileSizeRotationStrategy);
    assert(every(1).days() instanceof DateTimeRotationStrategy);
    assert(every(1).hours() instanceof DateTimeRotationStrategy);
    assert(every(1).minutes() instanceof DateTimeRotationStrategy);
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
