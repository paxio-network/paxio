import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests for pure functions extracted from UI components (TD-16).
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
});
