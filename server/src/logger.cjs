'use strict';

// Logger wrapper around pino. Injected into VM sandbox as `console`.
// Ported from Olympus server/src/logger.cjs.

class Logger {
  constructor(pinoInstance) {
    this.pino = pinoInstance;
  }

  log(msg, ctx) {
    if (ctx) this.pino.info(ctx, msg);
    else this.pino.info(msg);
  }
  info(msg, ctx) {
    if (ctx) this.pino.info(ctx, msg);
    else this.pino.info(msg);
  }
  warn(msg, ctx) {
    if (ctx) this.pino.warn(ctx, msg);
    else this.pino.warn(msg);
  }
  error(msg, ctx) {
    if (ctx) this.pino.error(ctx, msg);
    else this.pino.error(msg);
  }
  debug(msg, ctx) {
    if (ctx) this.pino.debug(ctx, msg);
    else this.pino.debug(msg);
  }
  child(bindings) {
    return new Logger(this.pino.child(bindings));
  }
}

module.exports = { Logger };
