import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Landing app smoke tests use React Testing Library — needs jsdom for DOM APIs.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'jsdom',
  },
  esbuild: {
    // Override tsconfig "jsx": "preserve" — Next.js plugin handles JSX transform,
    // but standalone vitest has no Next.js plugin. react-jsx uses the modern JSX
    // runtime (no React import needed, no "React is not defined" error).
    jsx: 'automatic',
  },
});
