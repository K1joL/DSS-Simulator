export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function mbpsFromBytesPerSec(bytesPerSec: number): number {
  return (bytesPerSec * 8) / 1_000_000;
}
