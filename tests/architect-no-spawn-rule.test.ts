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
