export interface RandomProvider {
  next(): number;
  nextInt(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: T[]): T;
}
