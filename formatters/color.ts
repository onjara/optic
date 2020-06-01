import { Level } from "../levels.ts";
import {
  yellow,
  gray,
  red,
  bold,
  blue,
} from "https://deno.land/std@0.51.0/fmt/colors.ts";

type ColorRule = (msg: string) => string;

export const colorRules: Map<Level, ColorRule> = new Map<Level, ColorRule>();
colorRules.set(Level.DEBUG, (msg: string) => gray(msg));
colorRules.set(Level.INFO, (msg: string) => blue(msg));
colorRules.set(Level.WARNING, (msg: string) => yellow(msg));
colorRules.set(Level.ERROR, (msg: string) => red(msg));
colorRules.set(Level.CRITICAL, (msg: string) => bold(red(msg)));

// export const THEN_COLOR: FormatterFunction = (logRecord: LogRecord, ongoingMsg?: string): string => {
//   const colorize = colorRules.get(logRecord.level);
//   return ongoingMsg && ongoingMsg.length > 0 ? colorize!(ongoingMsg) : '';
// };
