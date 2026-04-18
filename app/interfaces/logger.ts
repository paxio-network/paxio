// Logger contract — injected into VM sandbox as `console`.
// Implementation: app/lib/logger.ts (backend-dev).
// Server-side: server/src/logger.cjs wraps pino.

export interface LogContext {
  readonly [key: string]: string | number | boolean | null | undefined;
}

export interface Logger {
  info(msg: string, ctx?: LogContext): void;
  warn(msg: string, ctx?: LogContext): void;
  error(msg: string, ctx?: LogContext): void;
  debug(msg: string, ctx?: LogContext): void;

  // Create child logger with additional bindings (e.g. request ID, agent DID).
  // Returned logger inherits parent bindings + merges new ones.
  child(bindings: LogContext): Logger;
}
