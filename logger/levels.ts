// Copyright 2021 the optic authors. All rights reserved. MIT license.
/** Default log levels */
export enum Level {
  Trace = 10,
  Debug = 20,
  Info = 30,
  Warn = 40,
  Error = 50,
  Critical = 60,
}

const levelMap = new Map<number, string>();
levelMap.set(10, "Trace");
levelMap.set(20, "Debug");
levelMap.set(30, "Info");
levelMap.set(40, "Warn");
levelMap.set(50, "Error");
levelMap.set(60, "Critical");

const levelNameMap = new Map<string, number>();
levelNameMap.set("Trace", Level.Trace);
levelNameMap.set("Debug", Level.Debug);
levelNameMap.set("Info", Level.Info);
levelNameMap.set("Warn", Level.Warn);
levelNameMap.set("Error", Level.Error);
levelNameMap.set("Critical", Level.Critical);

/** Translate Level enum to string value */
export function levelToName(level: Level): string {
  const levelAsString = levelMap.get(level);
  return levelAsString ? levelAsString : "UNKNOWN";
}

/** Translate string value to Level, or 1 if not found */
export function nameToLevel(name: string): number {
  const level: number | undefined = levelNameMap.get(name);
  return level === undefined ? 1 : level;
}

/** Returns the length of the longest log level name. This is used when
 * formatting the level to allow all levels to be padded with spaces to
 * the same length as the longest level name.
 */
export function longestLevelName(): number {
  let longest = 0;
  for (const key of levelNameMap.keys()) {
    longest = key.length > longest ? key.length : longest;
  }
  return longest;
}
