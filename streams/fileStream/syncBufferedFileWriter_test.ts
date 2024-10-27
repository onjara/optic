import { assertEquals, assertThrows, test } from "../../test_deps.ts";
import { SyncBufferedFileWriter } from "./syncBufferedFileWriter.ts";

const encoder = new TextEncoder();
const helloWorldBytes = encoder.encode("hello world"); // len=11

class TestableFsFile implements Pick<Deno.FsFile, "writeSync"> {
  pretendBytesWritten: number | undefined = undefined;
  writtenChunks: Uint8Array[] = [];

  writeSync(p: Uint8Array): number {
    this.writtenChunks.push(Uint8Array.from(p));
    return this.pretendBytesWritten ?? p.length;
  }
}

class TestableSyncBufferFileWriter extends SyncBufferedFileWriter {
  flushCount = 0;

  override flush(): void {
    this.flushCount++;
    super.flush();
  }
}

test({
  name: "Data bigger than max buffer size flushes buffer then writes",
  fn() {
    const file = new TestableFsFile();
    const buff = new TestableSyncBufferFileWriter(
      file as unknown as Deno.FsFile,
      5,
    );
    buff.write(helloWorldBytes); // 11 bytes > 5 max buffer size
    assertEquals(buff.flushCount, 1);
    assertEquals(file.writtenChunks.length, 1);
    assertEquals(file.writtenChunks[0], helloWorldBytes);
  },
});

test({
  name: "Data smaller than max buffer size, but pushes buffer over max",
  fn() {
    const file = new TestableFsFile();
    const buff = new TestableSyncBufferFileWriter(
      file as unknown as Deno.FsFile,
      15,
    );
    buff.write(helloWorldBytes); // 11 bytes < 15 max buffer size
    assertEquals(buff.buffered(), 11);
    assertEquals(buff.flushCount, 0);

    buff.write(encoder.encode("abcde")); // 5 additional bytes, total 16 > 15 max
    assertEquals(buff.flushCount, 1);
    assertEquals(buff.buffered(), 5);
    assertEquals(file.writtenChunks.length, 1);
    assertEquals(file.writtenChunks[0], helloWorldBytes);
  },
});

test({
  name: "Data plus buffer is exactly buffer size",
  fn() {
    const file = new TestableFsFile();
    const buff = new TestableSyncBufferFileWriter(
      file as unknown as Deno.FsFile,
      15,
    );
    buff.write(helloWorldBytes); // 11 bytes < 15 max buffer size
    assertEquals(buff.buffered(), 11);
    assertEquals(buff.flushCount, 0);

    const abcdBytes = encoder.encode("abcd");
    buff.write(abcdBytes); // 4 additional bytes, total 15 = 15 max
    assertEquals(buff.flushCount, 1);
    assertEquals(buff.buffered(), 0);
    assertEquals(file.writtenChunks.length, 1);
    assertEquals(
      file.writtenChunks[0],
      Uint8Array.from([...helloWorldBytes, ...abcdBytes]),
    );
  },
});

test({
  name:
    "if file.writeSync can't write all bytes, additional writes will do this",
  fn() {
    const file = new TestableFsFile();
    file.pretendBytesWritten = 10;

    const buff = new TestableSyncBufferFileWriter(
      file as unknown as Deno.FsFile,
      5,
    );
    buff.write(helloWorldBytes); // 11 bytes < 15 max buffer size
    assertEquals(buff.flushCount, 1);
    assertEquals(file.writtenChunks.length, 2);
    // chunk 1 attempts to write all the data...
    assertEquals(file.writtenChunks[0], encoder.encode("hello world"));
    // ...but only 10 of the 11 chars are written, so a second write of just 11th char is done
    assertEquals(file.writtenChunks[1], encoder.encode("d"));
  },
});

test({
  name: "flushing empty buffer does nothing",
  fn() {
    const file = new TestableFsFile();
    const buff = new TestableSyncBufferFileWriter(
      file as unknown as Deno.FsFile,
      5,
    );
    buff.flush();
    buff.flush();
    buff.flush();
    assertEquals(file.writtenChunks.length, 0);
  },
});

test({
  name: "Closing buffer flushes and prevents further writes",
  fn() {
    const file = new TestableFsFile();
    const buff = new TestableSyncBufferFileWriter(
      file as unknown as Deno.FsFile,
      15,
    );
    buff.write(helloWorldBytes);
    assertEquals(buff.buffered(), 11);
    assertEquals(buff.flushCount, 0);

    buff.close();
    assertEquals(buff.flushCount, 1);
    assertEquals(buff.buffered(), 0);
    assertEquals(file.writtenChunks.length, 1);
    assertEquals(file.writtenChunks[0], helloWorldBytes);
    assertThrows(
      () => buff.write(helloWorldBytes),
      Error,
      "Attempted to write to a closed buffer",
    );
  },
});
