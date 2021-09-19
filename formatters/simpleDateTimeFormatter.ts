// Copyright 2021 the optic authors. All rights reserved. MIT license.
import type { DateTimeFormatter } from "../types.ts";

/**
 * A simple Date/Time formatter class, partly based on moment's date formatting
 * syntax.  This class takes as in put a string which defines the formatting of
 * the timestamp.  E.g.
 * ```
 * new SimpleDateTimeFormatter('hh:mm:ss:SSS YYYY-MM-DD');
 * ```
 * The formatting options are as per below.  Any characters not formatted are
 * left as is.  Tokens are case sensitive.
 *
 * |Token|Example|Value|
 * |-----|-------|-----|
 * |`hh` |`00..23`|2 digit hours (24 hour time)|
 * |`h`  |`0..23`|1-2 digit hours (24 hour time)|
 * |`HH` |`01..12`|2 digit hours (12 hour time)|
 * |`H`  |`1..12`|1-2 digit hours (12 hour time|
 * |`a`|`am` or `pm`|am/pm for use with 12 hour time|
 * |`A`|`AM` or `PM`|AM/PM for use with 12 hour time|
 * |`mm` |`00..59`|minutes|
 * |`ss`|`00..59`|seconds|
 * |`SSS`|`000..999`|3-digit milliseconds|
 * |`SS`|`00..99`|2-digit milliseconds|
 * |`S`|`0..9`|1-digit milliseconds|
 * |`YYYY`|`2020`|4 digit year|
 * |`YY`|`20`|2 digit year|
 * |`DD`|`00..31`|2 digit day|
 * |`D`|`0..31`|1-2 digit day|
 * |`MMMM`|`January`|long form month|
 * |`MMM`|`Jan`|short form month|
 * |`MM`|`01..12`|2 digit month|
 * |`M`|`1..12`|1-2 digit month|
 * |`dddd`|`Tuesday`|long form day of week|
 * |`ddd`|`Tue`|short form day of week|
 */
export class SimpleDateTimeFormatter implements DateTimeFormatter {
  constructor(private format: string) {}

  #shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  #longDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  #shortMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  #longMonths = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  formatDateTime(dateTime: Date): string {
    let formatted = this.format;

    // Format hours
    if (formatted.indexOf("hh") >= 0) {
      formatted = formatted.replace(
        "hh",
        String(dateTime.getHours()).padStart(2, "0"),
      );
    } else if (formatted.indexOf("h") >= 0) {
      formatted = formatted.replace("h", String(dateTime.getHours()));
    } else if (formatted.indexOf("HH") >= 0) {
      formatted = formatted.replace(
        "HH",
        String(dateTime.getHours() % 12 || 12).padStart(2, "0"),
      );
    } else if (formatted.indexOf("H") >= 0) {
      formatted = formatted.replace(
        "H",
        String(dateTime.getHours() % 12 || 12),
      );
    }

    // Format minutes
    if (formatted.indexOf("mm") >= 0) {
      formatted = formatted.replace(
        "mm",
        String(dateTime.getMinutes()).padStart(2, "0"),
      );
    }

    // Format seconds
    if (formatted.indexOf("ss") >= 0) {
      formatted = formatted.replace(
        "ss",
        String(dateTime.getSeconds()).padStart(2, "0"),
      );
    }

    // Format milliseconds
    if (formatted.indexOf("SSS") >= 0) {
      formatted = formatted.replace(
        "SSS",
        this.toStringWithSignificantDigits(dateTime.getMilliseconds(), 3),
      );
    } else if (formatted.indexOf("SS") >= 0) {
      formatted = formatted.replace(
        "SS",
        this.toStringWithSignificantDigits(dateTime.getMilliseconds(), 2),
      );
    } else if (formatted.indexOf("S") >= 0) {
      formatted = formatted.replace(
        "S",
        this.toStringWithSignificantDigits(dateTime.getMilliseconds(), 1),
      );
    }

    // Format am/pm
    if (formatted.indexOf("a") >= 0) {
      formatted = formatted.replace(
        "a",
        dateTime.getHours() < 12 ? "am" : "pm",
      );
    } else if (formatted.indexOf("A") >= 0) {
      formatted = formatted.replace(
        "A",
        dateTime.getHours() < 12 ? "AM" : "PM",
      );
    }

    // Format year
    if (formatted.indexOf("YYYY") >= 0) {
      formatted = formatted.replace("YYYY", String(dateTime.getFullYear()));
    } else if (formatted.indexOf("YY") >= 0) {
      formatted = formatted.replace(
        "YY",
        String(dateTime.getFullYear()).slice(2),
      );
    }

    // Format day
    if (formatted.indexOf("DD") >= 0) {
      formatted = formatted.replace(
        "DD",
        String(dateTime.getDate()).padStart(2, "0"),
      );
    } else if (formatted.indexOf("D") >= 0) {
      formatted = formatted.replace("D", String(dateTime.getDate()));
    }

    // Format month
    if (formatted.indexOf("MMMM") >= 0) {
      formatted = formatted.replace(
        "MMMM",
        this.#longMonths[dateTime.getMonth()],
      );
    } else if (formatted.indexOf("MMM") >= 0) {
      formatted = formatted.replace(
        "MMM",
        this.#shortMonths[dateTime.getMonth()],
      );
    } else if (formatted.indexOf("MM") >= 0) {
      formatted = formatted.replace(
        "MM",
        String(dateTime.getMonth() + 1).padStart(2, "0"),
      );
    } else if (formatted.indexOf("M") >= 0) {
      formatted = formatted.replace("M", String(dateTime.getMonth() + 1));
    }

    // Format day of week
    if (formatted.indexOf("dddd") >= 0) {
      formatted = formatted.replace("dddd", this.#longDays[dateTime.getDay()]);
    } else if (formatted.indexOf("ddd") >= 0) {
      formatted = formatted.replace("ddd", this.#shortDays[dateTime.getDay()]);
    }

    return formatted;
  }

  private toStringWithSignificantDigits(milli: number, sigFig: number) {
    return String(milli).padStart(3, "0").substr(0, sigFig);
  }
}
