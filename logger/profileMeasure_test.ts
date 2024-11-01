// Copyright 2020-2024 the optic authors. All rights reserved. MIT license.
import { Level } from "../mod.ts";
import { assert, assertEquals, test } from "../test_deps.ts";
import {
  between,
  from,
  type MarkSpecifiers,
  NOW,
  PROCESS_START,
  ProfilingConfig,
  SummaryMeasureFormatter,
  to,
  UnknownProfileMark,
} from "./profileMeasure.ts";
import type { ProfileMark } from "../types.ts";

const processStartMark: ProfileMark = {
  timestamp: 0,
  memory: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
  label: "Process start",
};

function getMark(
  options: { label?: string; memory?: boolean },
): ProfileMark {
  return {
    label: options.label,
    timestamp: performance.now(),
    ...(options.memory && { memory: Deno.memoryUsage() }),
  };
}

test({
  name: "profiling config works as expected",
  fn() {
    const pc: ProfilingConfig = new ProfilingConfig();
    assert(pc.isEnabled());
    assert(pc.isCaptureMemory());
    assertEquals(pc.getLogLevel(), Level.Info);
    assert(pc.getFormatter() != null);

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
    assertEquals(pc.getLogLevel(), Level.Trace);
    assertEquals(
      pc.getFormatter().format(
        new UnknownProfileMark("start"),
        new UnknownProfileMark("end"),
      ),
      "formatted",
    );

    pc.captureMemory(true);
    pc.enabled(true);

    assert(pc.isEnabled());
    assert(pc.isCaptureMemory());
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
  name: "SummaryMeasureFormatter - no description, memory",
  fn() {
    const output = smf.format(
      processStartMark,
      getMark({ label: "Now", memory: false }),
    );
    assert(
      /^Measuring 'Process start' -> 'Now', took (?:\d+s\s)?\d+(?:\.\d+)?ms$/
        .test(output),
    );
  },
});

test({
  name: "SummaryMeasureFormatter - with description, but no memory",
  fn() {
    const output = smf.format(
      processStartMark,
      getMark({ label: "Now", memory: false }),
      "the description",
    );
    assert(
      /^Measuring 'Process start' -> 'Now' \(the description\), took (?:\d+s\s)?\d+(?:\.\d+)?ms$/
        .test(output),
    );
  },
});

test({
  name: "SummaryMeasureFormatter - no description, with memory",
  fn() {
    const startOfTestMark = getMark({
      label: "start of test",
      memory: true,
    });
    const output = smf.format(
      processStartMark,
      getMark({ label: "Now", memory: true }),
    );
    assert(
      /^Measuring 'Process start' -> 'Now', took (?:\d+s\s)?\d+(?:\.\d+)?ms; heap usage is \d+\.\d+ [A-Z]{2}$/
        .test(output),
    );

    const outputWithHeapIncrease = smf.format(
      startOfTestMark,
      getMark({ label: "Now", memory: true }),
    );

    assert(
      outputWithHeapIncrease.startsWith(
        "Measuring 'start of test' -> 'Now', took ",
      ),
    );

    assert(
      /.*\d+(?:\.\d+)?ms.*/.test(outputWithHeapIncrease),
    );

    assert(
      outputWithHeapIncrease.includes("ms; heap usage "),
    );

    assert(
      /^Measuring 'start of test' -> 'Now', took \d+(?:\.\d+)?ms; heap usage increased|decreased \d+\.\d+ [A-Z]{2} to \d+\.\d+ [A-Z]{2}$/
        .test(outputWithHeapIncrease),
    );
  },
});

test({
  name: "SummaryMeasureFormatter - no description, no memory",
  fn() {
    const output = smf.format(
      processStartMark,
      getMark({ label: "Now", memory: false }),
    );
    assert(
      /^Measuring 'Process start' -> 'Now', took (?:\d+s\s)?\d+(?:\.\d+)?ms$/
        .test(output),
    );

    const mark = getMark({ label: "Now", memory: false });
    const outputNoOps = smf.format(mark, mark);
    assert(
      /^Measuring 'Now' -> 'Now', took (?:\d+s\s)?\d+(?:\.\d+)?ms$/
        .test(outputNoOps),
    );

    const id = setTimeout(() => {}, 1); // push pending op to the task queue
    try {
      const outputWithPendingOp = smf.format(
        processStartMark,
        getMark({ label: "Now", memory: false }),
      );
      assert(
        /^Measuring 'Process start' -> 'Now', took (?:\d+s\s)?\d+(?:\.\d+)?ms$/
          .test(outputWithPendingOp),
      );
    } finally {
      clearTimeout(id);
    }
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
