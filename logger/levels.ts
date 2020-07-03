/** Default log levels */
export enum Level {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARNING = 40,
  ERROR = 50,
  CRITICAL = 60,
}

const levelMap = new Map<number, string>();
levelMap.set(10, "TRACE");
levelMap.set(20, "DEBUG");
levelMap.set(30, "INFO");
levelMap.set(40, "WARNING");
levelMap.set(50, "ERROR");
levelMap.set(60, "CRITICAL");

const levelNameMap = new Map<string, number>();
levelNameMap.set("TRACE", Level.TRACE);
levelNameMap.set("DEBUG", Level.DEBUG);
levelNameMap.set("INFO", Level.INFO);
levelNameMap.set("WARNING", Level.WARNING);
levelNameMap.set("ERROR", Level.ERROR);
levelNameMap.set("CRITICAL", Level.CRITICAL);

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
  for (let key of levelNameMap.keys()) {
    longest = key.length > longest ? key.length : longest;
  }
  return longest;
}
