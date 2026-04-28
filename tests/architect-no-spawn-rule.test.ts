/**
 * Drift-guard: architect-no-spawn rule presence in 3 governance files.
 *
 * Catches LLM tendency to forget «architect doesn't spawn dev/reviewer-Phase-N
 * sub-agents» after context compaction. Pattern observed twice in 2026-04-28
 * session — user explicitly corrected, then it recurred 90 minutes later.
 *
 * Each of 3 files MUST contain a marker (token-like substring) that survives
 * mechanical regex check. Removing the rule from any of them = test RED →
 * blocks merge.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('Architect no-spawn rule — drift-guard across 3 governance files', () => {
  it('.claude/agents/architect.md::Boundaries lists DOES NOT spawn sub-agents', () => {
    const content = readFile('.claude/agents/architect.md');
    expect(content).toMatch(/DOES NOT spawn sub-agents/);
    expect(content).toMatch(/Single exception.*Phase 0/);
  });

  it('.claude/rules/architect-protocol.md::§6.5 has SCOPE BOUNDARY guard', () => {
    const content = readFile('.claude/rules/architect-protocol.md');
    expect(content).toMatch(/SCOPE BOUNDARY/);
    // NEVER callout list: across newlines, requires multi-line dotall
    expect(content).toMatch(/NEVER[\s\S]*?Phase N/);
    expect(content).toMatch(/NEVER[\s\S]*?dev agents/);
  });

  it('.claude/rules/scope-guard.md has AGENT INVOCATION section', () => {
    const content = readFile('.claude/rules/scope-guard.md');
    expect(content).toMatch(/## AGENT INVOCATION/);
    expect(content).toMatch(/Architect не запускает devs/);
    expect(content).toMatch(/ONLY Phase 0/);
  });

  it('.claude/rules/scope-guard.md table lists user-invoked: devs, reviewer Phase N, test-runner', () => {
    const content = readFile('.claude/rules/scope-guard.md');
    expect(content).toMatch(/dev agents.*backend-dev.*frontend-dev.*icp-dev.*registry-dev/);
    expect(content).toMatch(/reviewer Phase N/);
    expect(content).toMatch(/test-runner/);
  });
});

/**
 * Drift-guard: compact.threshold in .claude/settings.json must NOT regress below 0.85.
 *
 * 2026-04-28 incident: explicit `compact.threshold: 0.5` overrode env var
 * `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=90`, causing test-runner agent (Haiku 4.5) to
 * autocompact 3 times in 3 turns during a single test verification task. The explicit
 * setting wins over env override — the 0.5 value was leftover from a debug session.
 *
 * Floor of 0.85 keeps a safety margin without being so strict (1.0) that legitimate
 * compaction needs are blocked.
 */
describe('settings.json compact.threshold drift-guard', () => {
  it('.claude/settings.json::compact.threshold >= 0.85', () => {
    const raw = readFile('.claude/settings.json');
    const settings = JSON.parse(raw) as { compact?: { threshold?: number } };
    expect(settings.compact).toBeDefined();
    expect(typeof settings.compact?.threshold).toBe('number');
    expect(settings.compact?.threshold ?? 0).toBeGreaterThanOrEqual(0.85);
  });
});

/**
 * Drift-guard: dev-startup.md globs must NOT match test files.
 *
 * 2026-04-28 incident: a broad products/(double-star) glob matched
 * products/01-registry/tests/a2a-adapter.test.ts, causing test-runner agent to
 * auto-load dev impl rules during test verification → context overflow.
 *
 * Narrowed globs target impl directories explicitly: app/, canister-N/src/, etc.
 * Test directories (tests/) MUST NOT match.
 */
describe('dev-startup.md glob narrowness drift-guard', () => {
  it('dev-startup globs do not match products/*/tests/ paths', () => {
    const content = readFile('.claude/rules/dev-startup.md');
    const globsMatch = content.match(/globs:\s*\[([^\]]+)\]/);
    expect(globsMatch).not.toBeNull();
    const globs = globsMatch![1];
    // Must NOT contain the broad "products/**" pattern that matched test files
    expect(globs).not.toMatch(/"products\/\*\*\/\*\.\{ts,js,rs\}"/);
    // Must contain the narrow impl-only patterns
    expect(globs).toMatch(/products\/\*\/app/);
    expect(globs).toMatch(/products\/\*\/canister\*\/src/);
  });
});
