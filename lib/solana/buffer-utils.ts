/**
 * Cross-environment Buffer utilities
 *
 * These helpers use DataView instead of Node.js Buffer methods
 * for compatibility across Node.js, Edge Runtime, and Browser environments.
 */

/**
 * Write a BigInt as little-endian 64-bit unsigned integer
 */
export function writeBigUInt64LE(buffer: Uint8Array, value: bigint, offset: number): void {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  view.setBigUint64(offset, value, true); // true = little-endian
}

/**
 * Read a little-endian 64-bit unsigned integer as BigInt
 */
export function readBigUInt64LE(buffer: Uint8Array, offset: number): bigint {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return view.getBigUint64(offset, true); // true = little-endian
}

/**
 * Write a number as little-endian 32-bit unsigned integer
 */
export function writeUInt32LE(buffer: Uint8Array, value: number, offset: number): void {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  view.setUint32(offset, value, true); // true = little-endian
}

/**
 * Read a little-endian 32-bit unsigned integer
 */
export function readUInt32LE(buffer: Uint8Array, offset: number): number {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  return view.getUint32(offset, true); // true = little-endian
}

/**
 * Write a single byte (8-bit unsigned integer)
 */
export function writeUInt8(buffer: Uint8Array, value: number, offset: number): void {
  buffer[offset] = value & 0xff;
}

/**
 * Read a single byte (8-bit unsigned integer)
 */
export function readUInt8(buffer: Uint8Array, offset: number): number {
  return buffer[offset];
}
