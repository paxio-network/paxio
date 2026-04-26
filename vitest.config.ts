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
    // Default run = green baseline only. `*.test.ts` convention.
    // RED specs for pending tech-debt fixes live in `tests/_specs/**/*.spec.ts`
    // (see `pnpm test:specs` in root package.json) — they are NOT in the
    // default suite by design: CI enforces green, specs guide dev toward
    // green. This mirrors the Paxio TDD pattern (RED on feature branch only).
    // Default run = green baseline. RED specs for pending tech-debt live in
    // `tests/_specs/` and run via `pnpm test:specs` (uses vitest.specs.config.ts).
    // Keeping them out of default CI — they're guidance for dev, not regressions.
    include: [
      'tests/**/*.test.ts',
      'products/*/tests/**/*.test.ts',
      // Landing tests are NOT included here — they need jsdom environment
      // (React render via @testing-library/react), but root environment is
      // 'node'. Workspace entry below picks them up via per-app config
      // (apps/frontend/landing/vitest.config.ts) which sets jsdom + react
      // plugin. Single source of truth: per-app config.
    ],
    exclude: [
      'tests/**/*.integration.ts',
      'tests/_specs/**',
      'node_modules',
      'dist',
      'canisters',
      'opensrc',
      'products/*/cli',
      'products/*/http-proxy',
      'products/*/ml',
      'products/04-security/guard',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['packages/*/src/**/*.ts', 'products/*/app/**/*.ts'],
      exclude: ['packages/types/**', 'packages/interfaces/**', 'tests/**', '**/*.d.ts'],
    },
    environment: 'node',
  },
  workspace: [
    {
      extends: './apps/frontend/landing/vitest.config.ts',
      test: {
        include: ['apps/frontend/landing/tests/**/*.test.ts', 'apps/frontend/landing/tests/**/*.test.tsx'],
        // Inherit environment: 'jsdom' from per-app config above.
        // M-L9 sections.test.tsx renders React components via @testing-library/react
        // — needs `document` global, which jsdom provides and 'node' does not.
        // Earlier override forced 'node' for landing smoke (.test.ts uses module
        // import, not DOM render); jsdom is a superset and works for both.
      },
    },
  ],
});
