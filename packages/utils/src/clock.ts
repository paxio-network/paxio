// Clock implementations — for dependency-injected time.
// Domain code MUST NOT use Date.now() or new Date() directly.
// Always accept Clock as a parameter, pass createSystemClock() in production
// and createFixedClock(ms) in tests.

import type { Clock } from '@paxio/interfaces';

export const createSystemClock = (): Clock => ({
  now: () => Date.now(),
  nowIso: () => new Date().toISOString(),
});

export const createFixedClock = (ms: number): Clock => ({
  now: () => ms,
  nowIso: () => new Date(ms).toISOString(),
});
