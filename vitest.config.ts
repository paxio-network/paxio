import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      app: resolve(__dirname, 'app'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [
      'tests/**/*.integration.ts',
      'node_modules',
      'dist',
      'canisters',
      'packages/frontend',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['app/**/*.ts', 'packages/*/src/**/*.ts'],
      exclude: ['app/types/**', 'app/interfaces/**', 'tests/**', '**/*.d.ts'],
    },
    environment: 'node',
  },
});
