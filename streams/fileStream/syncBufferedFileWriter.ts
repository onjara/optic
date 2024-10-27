/**
 * A class offering synchronous writing, with asynchronous file I/O using configurable buffering
 */
export class SyncBufferedFileWriter {
  private file: Deno.FsFile;
  private buffer: Uint8Array;
  private bufferSizeInBytes: number;
  private bufferBytesUsed: number = 0;
  private isClosed = false;

  constructor(file: Deno.FsFile, bufferSize: number) {
    this.file = file;
    this.bufferSizeInBytes = bufferSize;
    this.buffer = new Uint8Array(bufferSize);
  }

  write(data: Uint8Array): void {
    if (this.isClosed) {
      throw new Error("Attempted to write to a closed buffer");
    }
    
    if (this.bufferBytesUsed + data.length > this.bufferSizeInBytes) {
      // Flush buffer if incoming data would overflow buffer
      this.flush();
    }

    if (data.length >= this.bufferSizeInBytes) {
      // if data is greater than the buffer size, then write straight to file
      this.writeFullBuffer(data);
      return;
    }
    
    // Data will fit in the buffer, so add it and increment our bytes used count
    this.buffer.set(data, this.bufferBytesUsed);
    this.bufferBytesUsed += data.length;

    if (this.bufferBytesUsed === this.bufferSizeInBytes) {
      // Special case where the exact full buffer has been used.  Queue copy of buffer contents.
      this.flush();
    }
  }

  private writeFullBuffer(buffer: Uint8Array): void {
    let bytesWritten = 0;
    while (bytesWritten < buffer.length) {
      bytesWritten += this.file.writeSync(buffer.subarray(bytesWritten));
    }
  }

  flush(): void {
    if (this.bufferBytesUsed > 0) {
      this.writeFullBuffer(this.buffer.subarray(0, this.bufferBytesUsed));
      this.bufferBytesUsed = 0;
    }
  }

  close(): void {
    this.isClosed = true;
    this.flush();
  }

  buffered(): number {
    return this.bufferBytesUsed;
  }
}
