/**
 * Fleet smoke test — verifies app skeleton renders.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { fileURLToPath } from 'url';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import type { Page as PageType } from '../app/page';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('fleet smoke', () => {
  it('app/page.tsx renders without throwing', async () => {
    const { default: Page } = await import('../app/page') as { default: PageType };
    expect(() => render(<Page />)).not.toThrow();
  });

  it('app/layout.tsx exists', () => {
    const layout = join(__dirname, '..', 'app', 'layout.tsx');
    expect(existsSync(layout)).toBe(true);
  });
});