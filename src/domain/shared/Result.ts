export class Result<T> {
  private constructor(
    public readonly ok: boolean,
    public readonly value?: T,
    public readonly error?: string
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result<T>(true, value);
  }

  static failure<T = never>(error: string): Result<T> {
    return new Result<T>(false, undefined, error);
  }
}
