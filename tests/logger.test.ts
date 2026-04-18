import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '@paxio/utils/logger';

describe('Logger', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdoutWrite: any;

  beforeEach(() => {
    stdoutWrite = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
  });

  it('emits JSON on info()', () => {
    const log = createLogger({ level: 'info' });
    log.info('hello', { user: 'alice' });
    const out = stdoutWrite.mock.calls[0]?.[0] as string;
    expect(out).toBeDefined();
    const parsed = JSON.parse(out);
    expect(parsed).toMatchObject({
      level: 'info',
      msg: 'hello',
      user: 'alice',
    });
    expect(typeof parsed.time).toBe('number');
  });

  it('emits JSON on warn()', () => {
    const log = createLogger({ level: 'info' });
    log.warn('heads up');
    const out = stdoutWrite.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(out);
    expect(parsed.level).toBe('warn');
    expect(parsed.msg).toBe('heads up');
  });

  it('emits JSON on error()', () => {
    const log = createLogger({ level: 'info' });
    log.error('boom');
    const out = stdoutWrite.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(out);
    expect(parsed.level).toBe('error');
  });

  it('respects log level: debug not emitted at info level', () => {
    const log = createLogger({ level: 'info' });
    log.debug('ignore me');
    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('respects log level: debug IS emitted at debug level', () => {
    const log = createLogger({ level: 'debug' });
    log.debug('see me');
    expect(stdoutWrite).toHaveBeenCalled();
  });

  it('child() inherits bindings', () => {
    const log = createLogger({ level: 'info' });
    const child = log.child({ reqId: 'abc' });
    child.info('handled');
    const out = stdoutWrite.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(out);
    expect(parsed.reqId).toBe('abc');
  });

  it('child() merges bindings with call context', () => {
    const log = createLogger({ level: 'info' });
    const child = log.child({ reqId: 'abc' });
    child.info('handled', { user: 'alice' });
    const out = stdoutWrite.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(out);
    expect(parsed.reqId).toBe('abc');
    expect(parsed.user).toBe('alice');
  });
});
