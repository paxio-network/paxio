import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Registry app smoke tests verify module loads (not DOM rendering).
    // Actual rendering verified by Next.js build passing.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
});
