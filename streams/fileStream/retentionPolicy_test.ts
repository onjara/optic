// Copyright 2020-2024 the optic authors. All rights reserved. MIT license.
import { assertEquals, assertThrows, test } from "../../test_deps.ts";
import { of } from "./retentionPolicy.ts";
import { IllegalStateError, ValidationError } from "../../types.ts";

function wipeMs(date: Date): Date {
  const d = new Date(date.getTime());
  d.setMilliseconds(0);
  return d;
}

test({
  name: "File count < 2 throws Error",
  fn() {
    assertThrows(
      () => {
        of(1).files();
      },
      ValidationError,
      "Log retention of type 'files' must have a quantity greater than 1",
    );
  },
});

test({
  name: "Zero dateTime quantity throws Error",
  fn() {
    assertThrows(
      () => {
        of(0).days();
      },
      ValidationError,
      "Date/time based log retention must have quantity greater than 0",
    );
  },
});

test({
  name: "Quantity and Type are accessible",
  fn() {
    assertEquals(of(7).files().quantity, 7);
    assertEquals(of(7).files().type, "files");
  },
});

test({
  name: "maxPeriodDate() throws for type files",
  fn() {
    assertThrows(
      () => {
        of(7).files().oldestRetentionDate();
      },
      IllegalStateError,
      "Oldest Retention Date is meaningless for retention strategy of 'files'",
    );
  },
});

test({
  name: "maxPeriodDate() returns correct date for type days",
  fn() {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    assertEquals(wipeMs(of(7).days().oldestRetentionDate()), wipeMs(d));
  },
});

test({
  name: "maxPeriodDate() returns correct date for type hours",
  fn() {
    const d = new Date();
    d.setHours(d.getHours() - 7);
    assertEquals(wipeMs(of(7).hours().oldestRetentionDate()), wipeMs(d));
  },
});

test({
  name: "maxPeriodDate() returns correct date for type minutes",
  fn() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 7);
    assertEquals(wipeMs(of(7).minutes().oldestRetentionDate()), wipeMs(d));
  },
});
