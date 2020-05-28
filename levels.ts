export enum Level {
  DEBUG = 10,
  INFO = 20,
  WARNING = 30,
  ERROR = 40,
  CRITICAL = 50,
}

export const levelMap = new Map<number, string>();
levelMap.set(10, "DEBUG");
levelMap.set(20, "INFO");
levelMap.set(30, "WARNING");
levelMap.set(40, "ERROR");
levelMap.set(50, "CRITICAL");

export function levelLabel(level: Level): string {
  const levelAsString = levelMap.get(level);
  return levelAsString ? levelAsString : "UNKNOWN";
}