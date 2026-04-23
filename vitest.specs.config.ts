/**
 * vitest config for RED specs — `pnpm test:specs`.
 *
 * RED specs encode tech-debt fix expectations (e.g. TD-08, TD-09). They live in
 * `tests/_specs/**\/*.test.ts` and are INTENTIONALLY RED until the corresponding
 * dev agent fixes the underlying code. They are excluded from the default suite
 * (`vitest.config.ts`) so CI on main/dev stays green.
 *
 * Frontend-dev / backend-dev run `pnpm test:specs` locally to verify their
 * tech-debt fix; when all specs for a given TD are GREEN, that TD is closed
 * and its spec may graduate into the default suite (renamed/moved).
 */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@paxio/types': resolve(__dirname, 'packages/types/src/index.ts'),
      '@paxio/interfaces': resolve(__dirname, 'packages/interfaces/src/index.ts'),
      '@paxio/errors': resolve(__dirname, 'packages/errors/src/index.ts'),
      '@paxio/utils/clock': resolve(__dirname, 'packages/utils/src/clock.ts'),
      '@paxio/utils/logger': resolve(__dirname, 'packages/utils/src/logger.ts'),
      '@paxio/utils': resolve(__dirname, 'packages/utils/src/index.ts'),
    },
  },
  test: {
    include: ['tests/_specs/**/*.test.ts'],
    environment: 'node',
  },
});
