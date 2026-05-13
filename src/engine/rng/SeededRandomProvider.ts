import { RandomProvider } from './RandomProvider';

export class SeededRandomProvider implements RandomProvider {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  private mulberry32(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  next(): number { return this.mulberry32(); }
  nextInt(min: number, max: number): number { return Math.floor(this.next() * (max - min + 1)) + min; }
  chance(probability: number): boolean { return this.next() < probability; }
  pick<T>(items: T[]): T {
    if (!items.length) throw new Error('Cannot pick from empty array');
    return items[this.nextInt(0, items.length - 1)];
  }
}
