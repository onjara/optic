// Copyright 2021 the optic authors. All rights reserved. MIT license.
import { assertEquals, test } from "../test_deps.ts";
import { formatBytes, formatMs } from "./numberFormatter.ts";

const hrPermission = { name: "hrtime" } as const;

test({
  name: "ms to human readable string formats properly",
  async fn() {
    if ((await Deno.permissions.query(hrPermission)).state == "granted") {
      assertEquals(formatMs(-10000), "-10000ms");
      assertEquals(formatMs(0), "0ms");
      assertEquals(formatMs(5), "5.000000ms");
      assertEquals(formatMs(999), "999.000000ms");
      assertEquals(formatMs(1000), "1s");
      assertEquals(formatMs(1001), "1s 1.000000ms");
      assertEquals(formatMs(59999), "59s 999.000000ms");
      assertEquals(formatMs(60000), "1m");
      assertEquals(formatMs(60001), "1m 1.000000ms");
      assertEquals(formatMs(61001), "1m 1s 1.000000ms");
      assertEquals(formatMs(3599999), "59m 59s 999.000000ms");
      assertEquals(formatMs(3600000), "1h");
      assertEquals(formatMs(3661001), "1h 1m 1s 1.000000ms");
      assertEquals(formatMs(999999999999), "277777h 46m 39s 999.000000ms");
      assertEquals(formatMs(5.123456789), "5.123457ms");
    } else {
      assertEquals(formatMs(-10000), "-10000ms");
      assertEquals(formatMs(0), "0ms");
      assertEquals(formatMs(5), "5ms");
      assertEquals(formatMs(999), "999ms");
      assertEquals(formatMs(1000), "1s");
      assertEquals(formatMs(1001), "1s 1ms");
      assertEquals(formatMs(59999), "59s 999ms");
      assertEquals(formatMs(60000), "1m");
      assertEquals(formatMs(60001), "1m 1ms");
      assertEquals(formatMs(61001), "1m 1s 1ms");
      assertEquals(formatMs(3599999), "59m 59s 999ms");
      assertEquals(formatMs(3600000), "1h");
      assertEquals(formatMs(3661001), "1h 1m 1s 1ms");
      assertEquals(formatMs(999999999999), "277777h 46m 39s 999ms");
    }
  },
});

test({
  name: "bytes to human readable string formats properly",
  fn() {
    assertEquals(formatBytes(-100), "-100 Bytes");
    assertEquals(formatBytes(100), "100 Bytes");
    assertEquals(formatBytes(-1023), "-1023 Bytes");
    assertEquals(formatBytes(1023), "1023 Bytes");
    assertEquals(formatBytes(-1024), "-1.0 KB");
    assertEquals(formatBytes(1024), "1.0 KB");
    assertEquals(formatBytes(-2000), "-2.0 KB");
    assertEquals(formatBytes(2000), "2.0 KB");
    assertEquals(formatBytes(-2047), "-2.0 KB");
    assertEquals(formatBytes(2047), "2.0 KB");
    assertEquals(formatBytes(-19654), "-19.2 KB");
    assertEquals(formatBytes(19654), "19.2 KB");
    assertEquals(formatBytes(-1048576), "-1.0 MB");
    assertEquals(formatBytes(1048576), "1.0 MB");
    assertEquals(formatBytes(-83485400), "-79.6 MB");
    assertEquals(formatBytes(83485400), "79.6 MB");
    assertEquals(formatBytes(-1073741824), "-1.0 GB");
    assertEquals(formatBytes(1073741824), "1.0 GB");
  },
});
