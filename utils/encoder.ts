
  /**
   * Follow Nginx `escape=default` encoding rules, but using unicode rather than hex encoding.
   * @returns string with chars '"', '\', chars with ascii less than 32 and greater than 126 transformed to 16bit unicode
   */
   export function encode(value: string):string {
    let out = "";
    for (let i = 0; i < value.length; i++) {
        const char = value.charAt(i);
        const charCode = char.charCodeAt(0);
        // 34 = ", 92 = \
        if (charCode == 34 || charCode == 92 || charCode < 32 || charCode > 126) {
          out += "\\u" + charCode.toString(16).padStart(4, "0");
        } else {
          out += char;
        }
    }
    return out;
  }
