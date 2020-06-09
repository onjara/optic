import {
  test,
  assertEquals,
} from "../test_deps.ts";
import { SimpleDateTimeFormatter } from "./dateTimeFormatter.ts";

function assertDtf(format: string, date: Date, expectedOutput: string) {
  const dtf = new SimpleDateTimeFormatter(format);
  assertEquals(dtf.formatDateTime(date), expectedOutput);
}

test({
  name: "Test date/time hour formats",
  fn() {
    assertDtf("hh", new Date("1995-12-17T00:24:00"), "00");
    assertDtf("hh", new Date("1995-12-17T03:24:00"), "03");
    assertDtf("hh", new Date("1995-12-17T23:59:00"), "23");
    assertDtf("h", new Date("1995-12-17T00:24:00"), "0");
    assertDtf("h", new Date("1995-12-17T03:24:00"), "3");
    assertDtf("h", new Date("1995-12-17T13:24:00"), "13");
    assertDtf("HH", new Date("1995-12-17T00:24:00"), "12");
    assertDtf("HH", new Date("1995-12-17T03:24:00"), "03");
    assertDtf("HH", new Date("1995-12-17T13:24:00"), "01");
    assertDtf("HH", new Date("1995-12-17T23:59:00"), "11");
    assertDtf("H", new Date("1995-12-17T00:24:00"), "12");
    assertDtf("H", new Date("1995-12-17T03:24:00"), "3");
    assertDtf("H", new Date("1995-12-17T13:24:00"), "1");
    assertDtf("H", new Date("1995-12-17T23:59:00"), "11");
  },
});

test({
  name: "Test date/time minute formats",
  fn() {
    assertDtf("mm", new Date("1995-12-17T23:00:00"), "00");
    assertDtf("mm", new Date("1995-12-17T23:07:00"), "07");
    assertDtf("mm", new Date("1995-12-17T23:59:00"), "59");
  },
});

test({
  name: "Test date/time minute formats",
  fn() {
    assertDtf("ss", new Date("1995-12-17T23:00:00"), "00");
    assertDtf("ss", new Date("1995-12-17T23:07:04"), "04");
    assertDtf("ss", new Date("1995-12-17T23:59:59"), "59");
  },
});

test({
  name: "Test date/time milliseconds formats",
  fn() {
    assertDtf("SSS", new Date("1995-12-17T23:00:00.000"), "000");
    assertDtf("SSS", new Date("1995-12-17T23:07:04.001"), "001");
    assertDtf("SSS", new Date("1995-12-17T23:59:59.011"), "011");
    assertDtf("SSS", new Date("1995-12-17T23:59:59.111"), "111");
    assertDtf("SS", new Date("1995-12-17T23:00:00.000"), "00");
    assertDtf("SS", new Date("1995-12-17T23:07:04.004"), "00");
    assertDtf("SS", new Date("1995-12-17T23:07:04.005"), "00");
    assertDtf("SS", new Date("1995-12-17T23:59:59.010"), "01");
    assertDtf("SS", new Date("1995-12-17T23:59:59.049"), "04");
    assertDtf("SS", new Date("1995-12-17T23:59:59.089"), "08");
    assertDtf("SS", new Date("1995-12-17T23:59:59.099"), "09");
    assertDtf("SS", new Date("1995-12-17T23:59:59.118"), "11");
    assertDtf("SS", new Date("1995-12-17T23:59:59.518"), "51");
    assertDtf("S", new Date("1995-12-17T23:59:59.000"), "0");
    assertDtf("S", new Date("1995-12-17T23:59:59.005"), "0");
    assertDtf("S", new Date("1995-12-17T23:59:59.010"), "0");
    assertDtf("S", new Date("1995-12-17T23:59:59.090"), "0");
    assertDtf("S", new Date("1995-12-17T23:59:59.222"), "2");
    assertDtf("S", new Date("1995-12-17T23:59:59.999"), "9");
  },
});

test({
  name: "Test date/time am/pm formatting",
  fn() {
    assertDtf("a", new Date("1995-12-17T23:59:59.999"), "pm");
    assertDtf("a", new Date("1995-12-17T12:00:00.000"), "pm");
    assertDtf("a", new Date("1995-12-17T11:59:59.999"), "am");
    assertDtf("a", new Date("1995-12-17T00:00:00.000"), "am");
  },
});

test({
  name: "Test date/time year formatting",
  fn() {
    assertDtf("YYYY", new Date("1995-12-17T23:59:59.999"), "1995");
    assertDtf("YYYY", new Date("2020-12-17T23:59:59.999"), "2020");
    assertDtf("YY", new Date("1995-12-17T23:59:59.999"), "95");
    assertDtf("YY", new Date("2020-12-17T23:59:59.999"), "20");
  },
});

test({
  name: "Test date/time month formatting",
  fn() {
    assertDtf("MMMM", new Date("1995-01-17T23:59:59.999"), "January");
    assertDtf("MMMM", new Date("1995-06-17T23:59:59.999"), "June");
    assertDtf("MMMM", new Date("1995-12-17T23:59:59.999"), "December");
    assertDtf("MMM", new Date("1995-01-17T23:59:59.999"), "Jan");
    assertDtf("MMM", new Date("1995-06-17T23:59:59.999"), "Jun");
    assertDtf("MMM", new Date("1995-12-17T23:59:59.999"), "Dec");
    assertDtf("MM", new Date("1995-01-17T23:59:59.999"), "01");
    assertDtf("MM", new Date("1995-06-17T23:59:59.999"), "06");
    assertDtf("MM", new Date("1995-12-17T23:59:59.999"), "12");
    assertDtf("M", new Date("1995-01-17T23:59:59.999"), "1");
    assertDtf("M", new Date("1995-06-17T23:59:59.999"), "6");
    assertDtf("M", new Date("1995-12-17T23:59:59.999"), "12");
  },
});

test({
  name: "Test date/time day formatting",
  fn() {
    assertDtf("DD", new Date("1995-01-17T23:59:59.999"), "17");
    assertDtf("DD", new Date("1995-06-01T23:59:59.999"), "01");
    assertDtf("D", new Date("1995-01-17T23:59:59.999"), "17");
    assertDtf("D", new Date("1995-06-01T23:59:59.999"), "1");
  },
});

test({
  name: "Test date/time day of week formatting",
  fn() {
    assertDtf("ddd", new Date("2020-06-07T23:59:59.999"), "Sun");
    assertDtf("ddd", new Date("2020-06-09T23:59:59.999"), "Tue");
    assertDtf("dddd", new Date("2020-06-09T23:59:59.999"), "Tuesday");
    assertDtf("dddd", new Date("2020-06-13T23:59:59.999"), "Saturday");
  },
});

test({
  name: "Test complex date/time formatting",
  fn() {
    assertDtf(
      "HH:mm:ss:SSSa YYYY-MMMM-DD",
      new Date("2020-06-09T23:59:59.999"),
      "11:59:59:999pm 2020-June-09",
    );
    assertDtf(
      "hh:mm:ss:SSa YYYY-MMM-DD dddd",
      new Date("2020-06-09T23:59:59.999"),
      "23:59:59:99pm 2020-Jun-09 Tuesday",
    );
    assertDtf(
      "hh:mm:ss:SSa ddd YYYY-MMMM-DD",
      new Date("2020-12-09T23:59:59.999"),
      "23:59:59:99pm Wed 2020-December-09",
    );
    assertDtf(
      "hh:mm:ss:S dddd YY-MMM-D",
      new Date("2020-12-09T23:59:59.999"),
      "23:59:59:9 Wednesday 20-Dec-9",
    );
    assertDtf(
      "Time: hh:mm:ss:S Other: dddd YY-MMM-D",
      new Date("2020-12-09T23:59:59.999"),
      "Time: 23:59:59:9 Other: Wednesday 20-Dec-9",
    );
  },
});
