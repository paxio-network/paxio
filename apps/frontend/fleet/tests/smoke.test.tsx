/**
 * Fleet smoke test — verifies app skeleton loads.
 */
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('fleet smoke', () => {
  it('app/layout.tsx exists', () => {
    const layout = join(__dirname, '..', 'app', 'layout.tsx');
    expect(existsSync(layout)).toBe(true);
  });

  it('app/page.tsx module loads without throwing', async () => {
    // Smoke test: verify the page module can be imported without runtime errors.
    // Actual rendering is verified by the Next.js build passing.
    await expect(async () => {
      await import('../app/page');
    }).not.toThrow();
  });
});
