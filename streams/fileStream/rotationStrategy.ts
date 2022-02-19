// Copyright 2022 the optic authors. All rights reserved. MIT license.
import { FileSizeRotationStrategy } from "./fileSizeRotationStrategy.ts";
import { DateTimeRotationStrategy } from "./dateTimeRotationStrategy.ts";
import { IllegalStateError } from "../../types.ts";

/**
 * Fluid interface for building a RotationStrategy
 * @param quantity number of files or day/hour/minute units before log rotation
 */
export function every(quantity: number): OngoingRotationStrategy {
  return new OngoingRotationStrategy(quantity);
}

class OngoingRotationStrategy {
  constructor(private quantity: number) {
    if (quantity < 1) {
      throw new IllegalStateError("Invalid rotation quantity: " + quantity);
    }
  }
  bytes(): FileSizeRotationStrategy {
    return new FileSizeRotationStrategy(this.quantity);
  }
  minutes(): DateTimeRotationStrategy {
    return new DateTimeRotationStrategy(this.quantity, "minutes");
  }
  hours(): DateTimeRotationStrategy {
    return new DateTimeRotationStrategy(this.quantity, "hours");
  }
  days(): DateTimeRotationStrategy {
    return new DateTimeRotationStrategy(this.quantity, "days");
  }
}
