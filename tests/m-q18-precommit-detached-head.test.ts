/**
 * M-Q18 — drift-guard: pre-commit hook blocks commits on detached HEAD.
 *
 * Closes TD-36. M-Q16 added textual instruction in dev-startup.md Step 1
 * («verify branch via git symbolic-ref HEAD»). Frontend-dev session 2026-04-29
 * (PR #78) STILL ended up on detached HEAD anyway — first recurrence under
 * the textual rule. Mechanical hook gate is the only durable enforcement.
 *
 * Hook invariant pinned here:
 *   1. Hook contains `git symbolic-ref --quiet HEAD` check
 *   2. Hook exits non-zero if detached (with explanatory message)
 *   3. Architect bypass via `ARCHITECT_DETACHED_OK=1` env var (cherry-pick
 *      / rebase staging needs intermediate detached state)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function readHook(): string {
  return readFileSync(resolve(ROOT, '.husky/pre-commit'), 'utf8');
}

describe('M-Q18 / TD-36 — pre-commit hook detached-HEAD gate', () => {
  it('hook calls `git symbolic-ref --quiet HEAD`', () => {
    const c = readHook();
    expect(c, 'hook must check branch state via git symbolic-ref').toMatch(
      /git symbolic-ref --quiet HEAD/,
    );
  });

  it('hook exits 1 on detached HEAD (no branch)', () => {
    const c = readHook();
    // Block contains explicit `exit 1` after symbolic-ref check.
    // Limit 1500 chars — block has multi-line message + bypass branch.
    expect(c).toMatch(/git symbolic-ref --quiet HEAD[\s\S]{0,1500}exit 1/);
  });

  it('hook produces «detached HEAD» diagnostic message', () => {
    const c = readHook();
    expect(c).toMatch(/detached HEAD/i);
  });

  it('hook explains the recurrence context (TD-36 / PR #78)', () => {
    const c = readHook();
    expect(c).toMatch(/TD-36|PR #78|frontend-dev.*PR.*detached/);
  });

  it('hook supports architect bypass via ARCHITECT_DETACHED_OK=1', () => {
    const c = readHook();
    expect(c).toMatch(/ARCHITECT_DETACHED_OK/);
    // Bypass guarded by architect identity check
    expect(c).toMatch(/ARCHITECT_DETACHED_OK[\s\S]{0,200}architect@paxio\.network/);
  });

  it('detached-HEAD check runs BEFORE identity check (Step 0 — fail-fast)', () => {
    const c = readHook();
    const detachedIdx = c.indexOf('git symbolic-ref --quiet HEAD');
    const identityIdx = c.indexOf('Identity check');
    expect(detachedIdx).toBeGreaterThan(0);
    expect(identityIdx).toBeGreaterThan(0);
    expect(detachedIdx, 'detached check must come before identity check').toBeLessThan(
      identityIdx,
    );
  });
});
