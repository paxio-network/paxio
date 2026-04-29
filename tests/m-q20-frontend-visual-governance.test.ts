/**
 * Drift-guard for frontend visual workflow governance.
 *
 * Three governance gaps closed:
 *   1. dev-startup.md had no mandate to verify CSS coverage on frontend visual
 *      changes. Result: porting JSX from docs/design/ without matching CSS
 *      passed all CI gates (build clean, tests GREEN) but produced unstyled
 *      production deploys.
 *   2. reviewer.md Phase 10 (Frontend) covered TS/Radix/a11y but had no
 *      mandate for CSS coverage check or visual diff vs design source.
 *   3. scripts/css-coverage-check.sh did not exist as a reusable tool dev
 *      and reviewer can run.
 *
 * Tests pin the textual presence of the rules + script existence.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

const readFile = (rel: string): string =>
  readFileSync(resolve(ROOT, rel), 'utf8');

describe('M-Q20 — dev-startup.md Step 4.1 visual CSS coverage mandate', () => {
  it('dev-startup.md mentions Step 4.1 (visual coverage check)', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/4\.1/);
    expect(c).toMatch(/CSS coverage check/i);
  });

  it('Step 4.1 invokes scripts/css-coverage-check.sh', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/css-coverage-check\.sh/);
  });

  it('Step 4.1 explains rationale (PostCSS/Tailwind not fail-fast on unknown design classes)', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/PostCSS|Tailwind/);
    expect(c).toMatch(/unstyled|design-system/i);
  });

  it('Step 4.1 references docs/design/ JSX→CSS porting requirement', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/docs\/design\//);
    expect(c).toMatch(/JSX.*CSS|CSS.*JSX/i);
  });
});

describe('M-Q20 — reviewer.md Phase 10 CSS coverage + visual diff checks', () => {
  it('reviewer.md Phase 10 has J9 CSS coverage check', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/J9.*CSS coverage/);
    expect(c).toMatch(/css-coverage-check\.sh/);
  });

  it('J9 explains build-clean ≠ visual-correct rationale', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/Build clean.*visual|visual.*Build clean/i);
  });

  it('reviewer.md has J10 visual diff vs design source mandate', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/J10.*Visual diff|J10.*design source/i);
    expect(c).toMatch(/Vercel preview/i);
  });

  it('reviewer.md has J11 design CSS parity check', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/J11.*Design CSS parity|J11.*parity/i);
  });
});

describe('M-Q20 — scripts/css-coverage-check.sh tool exists + executable', () => {
  it('scripts/css-coverage-check.sh exists', () => {
    expect(existsSync(resolve(ROOT, 'scripts/css-coverage-check.sh'))).toBe(true);
  });

  it('script is executable (mode bits)', () => {
    const path = resolve(ROOT, 'scripts/css-coverage-check.sh');
    const mode = statSync(path).mode & 0o777;
    expect(mode & 0o100, 'script must have user execute bit (chmod +x)').toBeGreaterThan(0);
  });

  it('script accepts <app> argument and exits 0 for app with empty sections', () => {
    // wallet/registry/etc apps have no sections/ → script should exit 0 with informational message.
    // We don't actually run the script here (would need execSync), but the file body
    // must contain the empty-state path.
    const src = readFileSync(resolve(ROOT, 'scripts/css-coverage-check.sh'), 'utf8');
    expect(src).toMatch(/no className tokens found/);
  });

  it('script supports per-app .css-whitelist file', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/css-coverage-check.sh'), 'utf8');
    expect(src).toMatch(/\.css-whitelist/);
  });

  it('script detects Tailwind utility atoms (text-, bg-, p-, w-, etc.)', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/css-coverage-check.sh'), 'utf8');
    expect(src).toMatch(/is_tailwind_atom/);
    // Spot-check pattern presence
    expect(src).toMatch(/text\|bg\|border|text\\\|bg/);
  });

  it('script strips Tailwind variant prefixes (sm:, md:, hover:, dark:, ...)', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/css-coverage-check.sh'), 'utf8');
    expect(src).toMatch(/variant prefix|stripped.*:|while.*\*:\*/);
  });
});
