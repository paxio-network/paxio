import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // M-L9: Section component render tests via React Testing Library + jsdom.
    // Verifies each section mounts, exposes required DOM selectors (#id, [data-section]).
    // Tests use mocked @paxio/api-client so no backend roundtrip needed.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
  },
});
