/**
 * Registry smoke test — verifies app skeleton renders.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { fileURLToPath } from 'url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('registry smoke', () => {
  it('app/page.tsx renders without throwing', async () => {
    const { default: Page } = await import('../../app/page.tsx');
    expect(() => render(<Page />)).not.toThrow();
  });

  it('app/layout.tsx exists', () => {
    const { existsSync } = await import('node:fs');
    const layout = join(__dirname, '..', 'app', 'layout.tsx');
    expect(existsSync(layout)).toBe(true);
  });
});