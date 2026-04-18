// Logger implementation — thin wrapper around pino with custom stream.
//
// Design notes:
// - Writes synchronously to process.stdout (not pino.destination) so that
//   test mocks via vi.spyOn(process.stdout, 'write') capture output.
//   Overhead is negligible (stdout is already fd-1 with kernel buffering).
// - formatters.level emits level as string label ('info' not 30) for grep-ability.
// - base: null disables default pid/hostname bindings — keeps output minimal.
//   Consumers opt-in to bindings via .child({ reqId, agent, ... }).

import pino, { type Logger as PinoLogger } from 'pino';
import type { Logger, LogContext } from 'app/interfaces/logger.js';

export interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
}

const createPinoStream = () => ({
  write: (chunk: string): void => {
    process.stdout.write(chunk);
  },
});

class LoggerImpl implements Logger {
  constructor(private readonly pinoInstance: PinoLogger) {}

  info(msg: string, ctx?: LogContext): void {
    if (ctx) this.pinoInstance.info(ctx, msg);
    else this.pinoInstance.info(msg);
  }

  warn(msg: string, ctx?: LogContext): void {
    if (ctx) this.pinoInstance.warn(ctx, msg);
    else this.pinoInstance.warn(msg);
  }

  error(msg: string, ctx?: LogContext): void {
    if (ctx) this.pinoInstance.error(ctx, msg);
    else this.pinoInstance.error(msg);
  }

  debug(msg: string, ctx?: LogContext): void {
    if (ctx) this.pinoInstance.debug(ctx, msg);
    else this.pinoInstance.debug(msg);
  }

  child(bindings: LogContext): Logger {
    return new LoggerImpl(this.pinoInstance.child(bindings));
  }
}

export const createLogger = (opts: LoggerOptions): Logger => {
  const pinoInstance = pino(
    {
      level: opts.level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      base: null,
    },
    createPinoStream(),
  );
  return new LoggerImpl(pinoInstance);
};
