import {
  win32Dirname,
  posixDirname,
  win32Basename,
  posixBasename,
} from "./deps.ts";

export function fileInfo(filePath: string): Deno.FileInfo | undefined {
  try {
    return Deno.statSync(filePath);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return undefined;
    }
    throw err;
  }
}

export function exists(file: string): boolean {
  return fileInfo(file) !== undefined;
}

/**
 * Given a file name, search in the directory for files beginning with the same
 * file name and ending in the pattern supplied, returning the list of matched
 * files
 */
export function getLogFilesInDir(
  filename: string,
  pattern: (dirEntryName: string, regExSafeFilename: string) => boolean,
): string[] {
  const matches: string[] = [];

  const dir: string = Deno.build.os === "windows"
    ? win32Dirname(filename)
    : posixDirname(filename);
  const file: string = Deno.build.os === "windows"
    ? win32Basename(filename)
    : posixBasename(filename);
  const escapedFilename = escapeForRegExp(file);

  for (const dirEntry of Deno.readDirSync(dir)) {
    if (!dirEntry.isDirectory && pattern(dirEntry.name, escapedFilename)) {
      matches.push(join(dir, dirEntry.name));
    }
  }

  return matches;
}

export function matchesFilePattern(
  dirEntryName: string,
  regExSafeFilename: string,
): boolean {
  return dirEntryName.match(new RegExp(regExSafeFilename + "\.\\d+$")) != null;
}

export function matchesDatePattern(
  dirEntryName: string,
  regExSafeFilename: string,
): boolean {
  return dirEntryName.match(
    new RegExp(regExSafeFilename + "_\\d{4}\.\\d{2}\.\\d{2}$"),
  ) != null;
}

export function matchesDateTimePattern(
  dirEntryName: string,
  regExSafeFilename: string,
): boolean {
  return dirEntryName.match(
    new RegExp(regExSafeFilename + "_\\d{4}\.\\d{2}\.\\d{2}_\\d{2}\.\\d{2}$"),
  ) != null;
}

function escapeForRegExp(filename: string): string {
  return filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function join(dir: string, file: string) {
  if (Deno.build.os == "windows") {
    return dir + "\\" + file;
  }
  return dir + "/" + file;
}

export function twoDig(num: number): string {
  return num > 9 ? "" + num : "0" + num;
}
