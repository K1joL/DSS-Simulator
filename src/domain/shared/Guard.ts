export class Guard {
  static againstNegative(value: number, field: string): void {
    if (value < 0) throw new Error(`${field} must be >= 0`);
  }

  static againstEmpty(value: string, field: string): void {
    if (!value.trim()) throw new Error(`${field} must not be empty`);
  }
}
