// Copyright 2020-2024 the optic authors. All rights reserved. MIT license.
import { assert, assertEquals, test } from "../test_deps.ts";
import { TimeUnit } from "../types.ts";
import { Level } from "./levels.ts";
import { RateLimitContext, RateLimiter } from "./rateLimitContext.ts";

test({
  name: "RateLimitContext returns correct context",
  fn() {
    const rlc1 = new RateLimitContext(100, TimeUnit.MILLISECONDS, "hello");
    const rlc2 = new RateLimitContext(100, TimeUnit.MILLISECONDS);
    const rlc3 = new RateLimitContext(100, undefined, "hello");
    const rlc4 = new RateLimitContext(100);

    assertEquals(rlc1.getContext(Level.Info), "100.1.hello.30");
    assertEquals(rlc2.getContext(Level.Info), "100.1.30");
    assertEquals(rlc3.getContext(Level.Info), "100.hello.30");
    assertEquals(rlc4.getContext(Level.Info), "100.30");
  },
});

test({
  name: "First visit for `atMostEvery` context is not rate limited",
  fn() {
    const rlc = new RateLimitContext(120, TimeUnit.SECONDS);
    const rl = new class extends RateLimiter {
      public override getContexts(): Map<string, number> {
        return super.getContexts();
      }
    }();
    assert(!rl.isRateLimited(rlc, Level.Info));
    assert(
      new Date().getTime() + 119000 <
        (rl.getContexts().get(rlc.getContext(Level.Info))!),
    );
  },
});

test({
  name: "First visit for `every` context is not rate limited",
  fn() {
    const rlc = new RateLimitContext(100);
    const rl = new class extends RateLimiter {
      public override getContexts(): Map<string, number> {
        return super.getContexts();
      }
    }();
    assert(!rl.isRateLimited(rlc, Level.Info));
    assertEquals(rl.getContexts().get(rlc.getContext(Level.Info))!, 0);
  },
});

test({
  name:
    "Subsequent visit for `atMostEvery`, not yet beyond min time is blocked",
  fn() {
    const rlc = new RateLimitContext(100, TimeUnit.SECONDS);
    const rl = new RateLimiter();
    assert(!rl.isRateLimited(rlc, Level.Info));
    assert(rl.isRateLimited(rlc, Level.Info));
  },
});

test({
  name: "Subsequent visit for `every`, not yet matching amount is blocked",
  fn() {
    const rlc = new RateLimitContext(100);
    const rl = new RateLimiter();
    assert(!rl.isRateLimited(rlc, Level.Info));
    assert(rl.isRateLimited(rlc, Level.Info));
  },
});

test({
  name: "Subsequent visit for `atMostEvery`, beyond min time is not blocked",
  fn() {
    const rlc = new RateLimitContext(5, TimeUnit.MILLISECONDS);
    const rl = new RateLimiter();
    assert(!rl.isRateLimited(rlc, Level.Info));
    assert(rl.isRateLimited(rlc, Level.Info));
    const sixMsFromNow = new Date().getTime() + 6;
    while (sixMsFromNow > new Date().getTime()) { /* no op */ }
    assert(!rl.isRateLimited(rlc, Level.Info));
    assert(rl.isRateLimited(rlc, Level.Info));
  },
});

test({
  name: "Subsequent visit for `every`, matching amount is not blocked",
  fn() {
    const rlc = new RateLimitContext(5);
    const rl = new RateLimiter();
    assert(!rl.isRateLimited(rlc, Level.Info));
    assert(rl.isRateLimited(rlc, Level.Info));
    assert(rl.isRateLimited(rlc, Level.Info));
    assert(rl.isRateLimited(rlc, Level.Info));
    assert(rl.isRateLimited(rlc, Level.Info));
    assert(!rl.isRateLimited(rlc, Level.Info));
  },
});
