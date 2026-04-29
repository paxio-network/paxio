/**
 * Drift-guard for backend server CJS syntax governance.
 *
 * Class of bugs closed: «backend .cjs edit breaks node --check syntax but
 * typecheck + vitest don't catch it». Specifically duplicate-const, broken
 * require, syntax errors in apps/back/server/main.cjs that pass all CI gates
 * green but break `node main.cjs` startup silently on production deploy.
 *
 * Three governance gaps closed:
 *   1. quality-gate.sh had no `node --check` step on apps/back/server/*.cjs.
 *   2. dev-startup.md had no Step 4.2 mandate to run server syntax check on
 *      apps/back/server/**\/*.cjs touches.
 *   3. reviewer.md Phase 10 had no J12 mandate to run server-syntax-check.sh
 *      on PRs touching apps/back/server/.
 *
 * Plus: scripts/server-syntax-check.sh did not exist as a reusable tool.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const readFile = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8');

describe('M-Q21 — quality-gate.sh step 1.5/6 (server CJS syntax)', () => {
  it('quality-gate.sh has step 1.5/6 node --check on apps/back/server/*.cjs', () => {
    const c = readFile('scripts/quality-gate.sh');
    expect(c).toMatch(/1\.5\/6/);
    expect(c).toMatch(/node --check/);
    expect(c).toMatch(/apps\/back\/server.*\.cjs/);
  });

  it('step 1.5/6 only runs when server CJS files in diff (skips otherwise)', () => {
    const c = readFile('scripts/quality-gate.sh');
    expect(c).toMatch(/git diff --name-only origin\/dev\.\.HEAD[\s\S]*?apps\/back\/server.*\.cjs/);
    expect(c).toMatch(/no apps\/back\/server.*skipping node --check/);
  });

  it('step 1.5/6 fails fast with exit 1 + diagnostic on syntax error', () => {
    const c = readFile('scripts/quality-gate.sh');
    // Verify syntax-failure path exits non-zero (consistent with other steps)
    const stepBlock = c.match(/1\.5\/6[\s\S]*?# 2\/6/);
    expect(stepBlock, 'step 1.5/6 block expected').not.toBeNull();
    expect(stepBlock![0]).toMatch(/exit 1/);
    expect(stepBlock![0]).toMatch(/find apps\/back\/server/);
  });
});

describe('M-Q21 — dev-startup.md Step 4.2 server syntax mandate', () => {
  it('dev-startup.md mentions Step 4.2 OR drift-guards section', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/4\.2|Drift-guards/i);
  });

  it('mandate references server-syntax-check.sh', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/server-syntax-check\.sh/);
  });

  it('mandate explains rationale (typecheck only handles .ts)', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/typecheck only.*\.ts|typecheck.*\.cjs|typecheck only checks `?\.ts/i);
  });

  it('mandate scoped to apps/back/server/**/*.cjs', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/apps\/back\/server.*\.cjs/);
  });
});

describe('M-Q21 — reviewer.md Phase 10 J12 backend syntax check', () => {
  it('reviewer.md has J12 backend server syntax check', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/J12.*Backend server syntax/i);
    expect(c).toMatch(/server-syntax-check\.sh/);
  });

  it('J12 explains why CI gates miss this class', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/typecheck skips? `?\.cjs|vitest.*main\.cjs/i);
  });

  it('J12 lists examples of caught bugs (duplicate const, broken require)', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/duplicate-?const|duplicate `?const|broken[ -]require/i);
  });
});

describe('M-Q21 — scripts/server-syntax-check.sh tool exists + executable', () => {
  it('scripts/server-syntax-check.sh exists', () => {
    expect(existsSync(resolve(ROOT, 'scripts/server-syntax-check.sh'))).toBe(true);
  });

  it('script has user execute bit (chmod +x)', () => {
    const path = resolve(ROOT, 'scripts/server-syntax-check.sh');
    const mode = statSync(path).mode & 0o777;
    expect(mode & 0o100, 'script must be executable').toBeGreaterThan(0);
  });

  it('script invokes node --check', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/server-syntax-check.sh'), 'utf8');
    expect(src).toMatch(/node --check/);
  });

  it('script targets apps/back/server/ recursively', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/server-syntax-check.sh'), 'utf8');
    expect(src).toMatch(/find apps\/back\/server.*\.cjs/);
  });

  it('script exits 0 on clean repo (post-fix state)', () => {
    // Smoke check — script body must have explicit exit 0 success path
    const src = readFileSync(resolve(ROOT, 'scripts/server-syntax-check.sh'), 'utf8');
    expect(src).toMatch(/all .* node --check|exit 0/);
  });
});
