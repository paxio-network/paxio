import { describe, it, expect } from 'vitest';
import type { Logger, Clock } from '@paxio/interfaces';
import { CAPABILITIES, ZodDid, ZodAgentCard, ok, err } from '@paxio/types';

describe('Contracts export surface', () => {
  it('Logger interface is satisfied by shape', () => {
    const logger: Logger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      child() {
        return logger;
      },
    };
    logger.info('test');
    expect(logger).toBeDefined();
  });

  it('Clock interface is satisfied by shape', () => {
    const clock: Clock = {
      now: () => 0,
      nowIso: () => '1970-01-01T00:00:00.000Z',
    };
    expect(clock.now()).toBe(0);
    expect(clock.nowIso()).toBe('1970-01-01T00:00:00.000Z');
  });

  it('app/types re-exports Result constructors', () => {
    const r1 = ok(1);
    const r2 = err('x');
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(false);
  });

  it('app/types re-exports ZodDid + ZodAgentCard', () => {
    expect(ZodDid.safeParse('did:paxio:base:0x1').success).toBe(true);
    expect(ZodAgentCard).toBeDefined();
  });

  it('CAPABILITIES is a readonly tuple of 5 entries', () => {
    expect(CAPABILITIES).toHaveLength(5);
    expect(CAPABILITIES).toContain('REGISTRY');
  });
});
