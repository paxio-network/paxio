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
    include: ['tests/**/*.test.ts', 'products/*/tests/**/*.test.ts'],
    exclude: [
      'tests/**/*.integration.ts',
      'node_modules',
      'dist',
      'canisters',
      'apps/frontend',
      'products/*/canister',
      'products/*/canisters',
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
});
