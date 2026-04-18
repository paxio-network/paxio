// Clock abstraction — for testability.
// Domain code MUST NOT use Date.now() or new Date() directly.
// Always inject Clock via dependency injection.
//
// Implementations: app/lib/clock.ts (backend-dev)
//   createSystemClock()   — real time
//   createFixedClock(ms)  — for unit tests

export interface Clock {
  // Unix timestamp in milliseconds (number)
  now(): number;

  // ISO 8601 string (e.g. "2026-04-18T12:34:56.789Z")
  nowIso(): string;
}
