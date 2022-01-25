// Copyright 2021 the optic authors. All rights reserved. MIT license.
const isHrtimeAllowed = Deno.permissions &&
  (await Deno.permissions.query({ name: "hrtime" })).state === "granted";

export function formatMs(ms: number): string {
  if (ms < 0) return ms + "ms";

  const portions: string[] = [];
  const msInHour = 1000 * 60 * 60;
  const msInMinute = 1000 * 60;
  const msInSecond = 1000;

  const hours = Math.trunc(ms / msInHour);
  let duration = ms - (hours * msInHour);

  const minutes = Math.trunc(duration / msInMinute);
  duration -= minutes * msInMinute;

  const seconds = Math.trunc(duration / msInSecond);
  duration -= seconds * msInSecond;

  if (hours > 0) portions.push(hours + "h");
  if (minutes > 0) portions.push(minutes + "m");
  if (seconds > 0) portions.push(seconds + "s");
  if (duration > 0) {
    portions.push((isHrtimeAllowed ? duration.toFixed(6) : duration) + "ms");
  }

  return portions.length > 0 ? portions.join(" ") : "0ms";
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(i == 0 ? 0 : 1) + " " + sizes[i];
}
