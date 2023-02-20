// Copyright 2022 the optic authors. All rights reserved. MIT license.
export {
  basename as posixBasename,
  dirname as posixDirname,
} from "https://deno.land/std@0.177.0/path/posix.ts";
export {
  basename as win32Basename,
  dirname as win32Dirname,
} from "https://deno.land/std@0.177.0/path/win32.ts";
export { BufWriterSync } from "https://deno.land/std@0.177.0/io/buf_writer.ts";
