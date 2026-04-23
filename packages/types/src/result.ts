// Result<T, E> — algebraic sum type for success/failure.
// Used as return type for all domain functions (no throwing).
// See .claude/rules/engineering-principles.md section 7 (ADT).

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok === true;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => r.ok === false;

// Transform Ok value. Err passes through unchanged.
export const map = <T, U, E>(
  r: Result<T, E>,
  f: (t: T) => U,
): Result<U, E> => (r.ok ? ok(f(r.value)) : r);

// FlatMap: chain Result-returning functions.
export const chain = <T, U, E>(
  r: Result<T, E>,
  f: (t: T) => Result<U, E>,
): Result<U, E> => (r.ok ? f(r.value) : r);

// Transform Err value. Ok passes through unchanged.
export const mapErr = <T, E, F>(
  r: Result<T, E>,
  f: (e: E) => F,
): Result<T, F> => (r.ok ? r : err(f(r.error)));

// Extract value OR throw. Use ONLY in tests or at top-level where
// an Err is a programming bug. In domain code always pattern-match on `r.ok`.
export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw new Error(`unwrap on Err: ${JSON.stringify(r.error)}`);
};

// Extract value OR return fallback.
export const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T =>
  r.ok ? r.value : fallback;
