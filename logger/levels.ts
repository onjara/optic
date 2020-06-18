export enum Level {
  DEBUG = 10,
  INFO = 20,
  WARNING = 30,
  ERROR = 40,
  CRITICAL = 50,
}

const levelMap = new Map<number, string>();
levelMap.set(10, "DEBUG");
levelMap.set(20, "INFO");
levelMap.set(30, "WARNING");
levelMap.set(40, "ERROR");
levelMap.set(50, "CRITICAL");

const levelNameMap = new Map<string, number>();
levelNameMap.set("DEBUG", Level.DEBUG);
levelNameMap.set("INFO", Level.INFO);
levelNameMap.set("WARNING", Level.WARNING);
levelNameMap.set("ERROR", Level.ERROR);
levelNameMap.set("CRITICAL", Level.CRITICAL);

export function levelToName(level: Level): string {
  const levelAsString = levelMap.get(level);
  return levelAsString ? levelAsString : "UNKNOWN";
}

export function nameToLevel(name: string): number {
  const level: number | undefined = levelNameMap.get(name);
  return level === undefined ? 1 : level;
}

export function longestLevelName(): number {
  let longest = 0;
  for (let key of levelNameMap.keys()) {
    longest = key.length > longest ? key.length : longest;
  }
  return longest;
}
