// Copyright 2022 the optic authors. All rights reserved. MIT license.
import { assertEquals, test } from "../test_deps.ts";
import { encode } from "./encoder.ts";

test({
  name: "Empty, null, undefined string remains as is",
  fn() {
    assertEquals(encode(""), "");
  }
});

test({
  name: "Normal characters remain as is",
  fn() {
    assertEquals(encode("abc_xyz_ABC_XYZ_123_890_!$%^&*()_+"), "abc_xyz_ABC_XYZ_123_890_!$%^&*()_+");
  }
});

test({
  name: "Special characters get encoded",
  fn() {
    assertEquals(encode('"\\'), "\\u0022\\u005c");
  }
});

test({
  name: "Out of ascii range chars encoded",
  fn() {
    const s = String.fromCharCode(31) + String.fromCharCode(32) + String.fromCharCode(126) + String.fromCharCode(127);
    assertEquals(encode(s), "\\u001f ~\\u007f");
    assertEquals(encode("\r\n"), "\\u000d\\u000a");
  }
});