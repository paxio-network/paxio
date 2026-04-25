import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Unit tests for pure functions extracted from UI components (TD-16) +
    // runtime render tests for thin presentation components (M-L0 Progressive
    // Reveal: ConditionalSection, UpcomingBadge). Default env is `node`; tsx
    // tests that need DOM declare `// @vitest-environment happy-dom` at the
    // top of the file.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
});
