// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
import { Level } from "../mod.ts";
import { assert, assertEquals, test } from "../test_deps.ts";
import {
  between,
  from,
  MarkSpecifiers,
  NOW,
  PROCESS_START,
  ProfilingConfig,
  SummaryMeasureFormatter,
  to,
  UnknownProfileMark,
} from "./profileMeasure.ts";
import { ProfileMark } from "../types.ts";

const processStartMark: ProfileMark = {
  timestamp: 0,
  opMetrics: {
    ops: {},
    opsDispatched: 0,
    opsDispatchedSync: 0,
    opsDispatchedAsync: 0,
    opsDispatchedAsyncUnref: 0,
    opsCompleted: 0,
    opsCompletedSync: 0,
    opsCompletedAsync: 0,
    opsCompletedAsyncUnref: 0,
    bytesSentControl: 0,
    bytesSentData: 0,
    bytesReceived: 0,
  } as Deno.Metrics,
  memory: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
  label: "Process start",
};

function getMark(
  options: { label?: string; memory?: boolean; ops?: boolean },
): ProfileMark {
  return {
    label: options.label,
    timestamp: performance.now(),
    ...(options.memory && { memory: Deno.memoryUsage() }),
    ...(options.ops && { opMetrics: Deno.metrics() }),
  };
}

test({
  name: "profiling config works as expected",
  fn() {
    const pc: ProfilingConfig = new ProfilingConfig();
    assert(pc.isEnabled());
    assert(pc.isCaptureMemory());
    assert(pc.isCaptureOps());
    assertEquals(pc.getLogLevel(), Level.Info);
    assert(pc.getFormatter() != null);

    pc.captureOps(false);
    pc.captureMemory(false);
    pc.enabled(false);
    pc.withLogLevel(Level.Trace);
    pc.withFormatter({
      format(
        _startMark: ProfileMark,
        _endMark: ProfileMark,
        _label?: string,
      ): string {
        return "formatted";
      },
    });

    assert(!pc.isEnabled());
    assert(!pc.isCaptureMemory());
    assert(!pc.isCaptureOps());
    assertEquals(pc.getLogLevel(), Level.Trace);
    assertEquals(
      pc.getFormatter().format(
        new UnknownProfileMark("start"),
        new UnknownProfileMark("end"),
      ),
      "formatted",
    );

    pc.captureOps(true);
    pc.captureMemory(true);
    pc.enabled(true);

    assert(pc.isEnabled());
    assert(pc.isCaptureMemory());
    assert(pc.isCaptureOps());
  },
});

const smf = new SummaryMeasureFormatter();

test({
  name: "SummaryMeasureFormatter - invalid start mark",
  fn() {
    assertEquals(
      smf.format(
        new UnknownProfileMark("invalid mark"),
        getMark({ label: "valid mark" }),
      ),
      "Unable to record measure. Unknown start mark of 'invalid mark'",
    );
  },
});

test({
  name: "SummaryMeasureFormatter - invalid end mark",
  fn() {
    assertEquals(
      smf.format(
        getMark({ label: "valid mark" }),
        new UnknownProfileMark("invalid mark"),
      ),
      "Unable to record measure. Unknown end mark of 'invalid mark'",
    );
  },
});

test({
  name: "SummaryMeasureFormatter - no description, memory or ops",
  fn() {
    const output = smf.format(
      processStartMark,
      getMark({ label: "Now", memory: false, ops: false }),
    );
    assert(
      /^Measuring 'Process start' -> 'Now', took (?:\d+s\s)?\d+(?:\.\d+)?ms$/
        .test(output),
    );
  },
});

test({
  name: "SummaryMeasureFormatter - with description, but no memory or ops",
  fn() {
    const output = smf.format(
      processStartMark,
      getMark({ label: "Now", memory: false, ops: false }),
      "the description",
    );
    assert(
      /^Measuring 'Process start' -> 'Now' \(the description\), took (?:\d+s\s)?\d+(?:\.\d+)?ms$/
        .test(output),
    );
  },
});

test({
  name: "SummaryMeasureFormatter - no description, with memory, no ops",
  fn() {
    const startOfTestMark = getMark({
      label: "start of test",
      memory: true,
      ops: false,
    });
    const output = smf.format(
      processStartMark,
      getMark({ label: "Now", memory: true, ops: false }),
    );
    assert(
      /^Measuring 'Process start' -> 'Now', took (?:\d+s\s)?\d+(?:\.\d+)?ms; heap usage is \d+\.\d+ [A-Z]{2}$/
        .test(output),
    );

    const outputWithHeapIncrease = smf.format(
      startOfTestMark,
      getMark({ label: "Now", memory: true, ops: false }),
    );

    // Insert arbitrary delay to help fix bizarre CI issue.
    for(let i=0; i++; i < 100);

    assert(
      /^Measuring 'start of test' -> 'Now', took \d+(?:\.\d+)?ms; heap usage increased \d+\.\d+ [A-Z]{2} to \d+\.\d+ [A-Z]{2}$/
        .test(outputWithHeapIncrease),
    );
  },
});

test({
  name: "SummaryMeasureFormatter - no description, no memory, with ops",
  fn() {
    const output = smf.format(
      processStartMark,
      getMark({ label: "Now", memory: false, ops: true }),
    );
    assert(
      /^Measuring 'Process start' -> 'Now', took (?:\d+s\s)?\d+(?:\.\d+)?ms; \d+ ops dispatched, all completed$/
        .test(output),
    );

    const mark = getMark({ label: "Now", memory: false, ops: true });
    const outputNoOps = smf.format(mark, mark);
    assert(
      /^Measuring 'Now' -> 'Now', took (?:\d+s\s)?\d+(?:\.\d+)?ms; no ops dispatched, all completed$/
        .test(outputNoOps),
    );

    setTimeout(() => {}, 1); // push pending op to the task queue
    const outputWithPendingOp = smf.format(
      processStartMark,
      getMark({ label: "Now", memory: false, ops: true }),
    );
    assert(
      /^Measuring 'Process start' -> 'Now', took (?:\d+s\s)?\d+(?:\.\d+)?ms; \d+ ops dispatched, 1 ops still to complete$/
        .test(outputWithPendingOp),
    );
  },
});

test({
  name: "ProfileMark creation",
  fn() {
    const fromMark: MarkSpecifiers = from("from");
    const toMark: MarkSpecifiers = to("to");
    const betweenMark: MarkSpecifiers = between("a", "b");

    assertEquals(fromMark.startMark, "from");
    assertEquals(fromMark.endMark, NOW);
    assertEquals(toMark.startMark, PROCESS_START);
    assertEquals(toMark.endMark, "to");
    assertEquals(betweenMark.startMark, "a");
    assertEquals(betweenMark.endMark, "b");
  },
});
