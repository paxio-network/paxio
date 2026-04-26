import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Landing app smoke tests verify module loads (not DOM rendering).
    // Actual rendering verified by Next.js build passing (Step 7).
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
});
