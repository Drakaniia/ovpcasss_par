/**
 * This package also builds for Workers and the browser, so it deliberately has
 * no Node types. The source-parity test reads the office's workbook from disk,
 * and this is the only Node call it makes.
 */
declare module 'node:fs' {
  export function readFileSync(path: string): Uint8Array;
}
