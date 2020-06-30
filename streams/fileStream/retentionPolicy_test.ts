import {
  test,
  assertEquals,
  assertThrows,
} from "../../test_deps.ts";
import { of } from "./retentionPolicy.ts";

test({
  name: "Negative file count throws Error",
  fn() {
    assertThrows(
      () => {
        of(-1).files();
      },
      Error,
      "Invalid quantity",
    );
  },
});

test({
  name: "Zero dateTime quantity throws Error",
  fn() {
    assertThrows(
      () => {
        of(-1).days();
      },
      Error,
      "Invalid quantity",
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
      Error,
      "Max Period Date is meaningless",
    );
  },
});

test({
  name: "maxPeriodDate() returns correct date for type days",
  fn() {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    assertEquals(of(7).days().oldestRetentionDate(), d);
  },
});

test({
  name: "maxPeriodDate() returns correct date for type hours",
  fn() {
    const d = new Date();
    d.setHours(d.getHours() - 7);
    assertEquals(of(7).hours().oldestRetentionDate(), d);
  },
});

test({
  name: "maxPeriodDate() returns correct date for type minutes",
  fn() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 7);
    assertEquals(of(7).minutes().oldestRetentionDate(), d);
  },
});
