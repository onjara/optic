import { DateTimeFormatter } from "../types.ts";

export class SimpleDateTimeFormatter implements DateTimeFormatter {
  constructor(private format: string) {}

  #shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  #longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  formatDateTime(dateTime: Date): string {
    let formatted = this.format;

    // Format hours
    if (formatted.indexOf('hh') >= 0) {
      formatted = formatted.replace('hh', String(dateTime.getHours()).padStart(2, '0'));
    } else if (formatted.indexOf('h') >= 0) {
      formatted = formatted.replace('h', String(dateTime.getHours()));
    } else if (formatted.indexOf('HH') >= 0) {
      formatted = formatted.replace('HH', String(dateTime.getHours() % 12 || 12).padStart(2, '0'));
    } else if (formatted.indexOf('H') >= 0) {
      formatted = formatted.replace('H', String(dateTime.getHours() % 12 || 12));
    }

    // Format minutes
    if (formatted.indexOf('mm') >= 0) {
      formatted = formatted.replace('mm', String(dateTime.getMinutes()).padStart(2, '0'));
    }

    // Format seconds
    if (formatted.indexOf('ss') >= 0) {
      formatted = formatted.replace('ss', String(dateTime.getSeconds()).padStart(2, '0'));
    }

    // Format milliseconds
    if (formatted.indexOf('SSS') >= 0) {
      formatted = formatted.replace('SSS', String(dateTime.getMilliseconds()).padStart(3, '0'));
    } else if (formatted.indexOf('SS') >= 0) {
      formatted = formatted.replace('SS', String(Number(dateTime.getMilliseconds().toPrecision(2))).padStart(3, '0'));
    } else if (formatted.indexOf('S') >= 0) {
      formatted = formatted.replace('S', String(Number(dateTime.getMilliseconds().toPrecision(1))).padStart(3, '0'));
    }

    // Format am/pm
    if (formatted.indexOf('a') >= 0) {
      formatted = formatted.replace('a', dateTime.getHours() < 12 ? 'am' : 'pm');
    } else if (formatted.indexOf('A') >= 0) {
      formatted = formatted.replace('A', dateTime.getHours() < 12 ? 'AM' : 'PM');
    }

    // Format year
    if (formatted.indexOf('YYYY') >= 0) {
      formatted = formatted.replace('YYYY', String(dateTime.getFullYear()));
    } else if (formatted.indexOf('YY') >= 0) {
      formatted = formatted.replace('YY', String(dateTime.getFullYear()).slice(2));
    }

    // Format month
    if (formatted.indexOf('MM') >= 0) {
      formatted = formatted.replace('MM', String(dateTime.getMonth() + 1).padStart(2, '0'));
    } else if (formatted.indexOf('M') >= 0) {
      formatted = formatted.replace('M', String(dateTime.getMonth() + 1));
    }

    // Format day
    if (formatted.indexOf('DD') >= 0) {
      formatted = formatted.replace('DD', String(dateTime.getDate()).padStart(2, '0'));
    } else if (formatted.indexOf('D') >= 0) {
      formatted = formatted.replace('D', String(dateTime.getDate()));
    }

    // Format day of week
    if (formatted.indexOf('ddd') >= 0) {
      formatted = formatted.replace('ddd', this.#shortDays[dateTime.getDay()]);
    } else if (formatted.indexOf('dddd') >= 0) {
      formatted = formatted.replace('dddd', this.#longDays[dateTime.getDay()]);
    }

    return formatted;
  }
}