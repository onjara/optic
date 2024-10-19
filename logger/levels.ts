// Copyright 2020-2023 the optic authors. All rights reserved. MIT license.
/** Default log levels */
export enum Level {
  Trace = 10,
  Debug = 20,
  Info = 30,
  Warn = 40,
  Error = 50,
  Critical = 60,
}

const levelMap = new Map<Level, string>();
levelMap.set(Level.Trace, "Trace");
levelMap.set(Level.Debug, "Debug");
levelMap.set(Level.Info, "Info");
levelMap.set(Level.Warn, "Warn");
levelMap.set(Level.Error, "Error");
levelMap.set(Level.Critical, "Critical");

const levelNameMap = new Map<string, Level>();
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

/** Translate string value to Level, or Level.Info if not found */
export function nameToLevel(name: string): Level {
  const level: Level | undefined = levelNameMap.get(name);

  //try a case insensitive match
  if (level === undefined) {
    for (const [key, logLevel] of levelNameMap.entries()) {
      if (key.toLowerCase() === name.toLowerCase()) {
        return logLevel;
      }
    }
  }

  if (!level) {
    console.log(`Unknown log level: ${name}, defaulting to 'Info'`);
    return Level.Info;
  }

  return level;
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
