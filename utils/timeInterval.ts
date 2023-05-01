// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import { IllegalStateError } from "../types.ts";

export function intervalOf(period: number): OngoingInterval {
  return new OngoingInterval(period);
}

class OngoingInterval {
  constructor(private period: number) {
    if (period < 1) {
      throw new IllegalStateError("Invalid interval period: " + period);
    }
  }
  seconds(): TimeInterval {
    return new TimeInterval(this.period);
  }
  minutes(): TimeInterval {
    return new TimeInterval(this.period * 60);
  }
  hours(): TimeInterval {
    return new TimeInterval(this.period * 60 * 60);
  }
  days(): TimeInterval {
    return new TimeInterval(this.period * 60 * 60 * 24);
  }
}

export class TimeInterval {
  constructor(private period: number) {
    if (period < 1) {
      throw new IllegalStateError("Invalid interval period: " + period);
    }
  }
  getPeriod(): number {
    return this.period;
  }
}
