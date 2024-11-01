// Copyright 2020-2024 the optic authors. All rights reserved. MIT license.
import { Level } from "../logger/levels.ts";
import { blue, bold, gray, red, yellow } from "../deps.ts";

/**
 * A type for defining a function which takes in a string and outputs the string
 * which has had color formatting (bold, red, italics, etc.) applied to it
 */
export type ColorRule = (msg: string) => string;

/**
 * A map of coloring rules per log level.  Custom log levels may also register
 * a new color rule, and existing levels may be updated with new rules too.
 */
export const colorRules: Map<Level, ColorRule> = new Map<Level, ColorRule>();
colorRules.set(Level.Debug, (msg: string) => gray(msg));
colorRules.set(Level.Info, (msg: string) => blue(msg));
colorRules.set(Level.Warn, (msg: string) => yellow(msg));
colorRules.set(Level.Error, (msg: string) => red(msg));
colorRules.set(Level.Critical, (msg: string) => bold(red(msg)));

export function getColorForLevel(level: Level): ColorRule {
  const color: ColorRule | undefined = colorRules.get(level);
  return color ? color : (msg: string) => msg;
}
