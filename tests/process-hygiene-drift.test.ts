// M-Q3 T-3 — Drift-guard for process-hygiene & worktree-isolation rules.
//
// Locks in the M-Q3 additions so they cannot silently regress:
//   T-1: per-session worktree convention в startup-protocol + architect-protocol
//        + workflow + scope-guard
//   T-2: reviewer.md Phase N "git status --porcelain clean" pre-commit checkpoint
//   T-5: safety.md cross-user chmod section
//
// Pre-fix: each describe block FAILS because the relevant section/text doesn't
// exist yet. Post-fix (T-1/T-2/T-5 land): all GREEN.
//
// Architect-only files (in .claude/rules/ + .claude/agents/, protected by
// .husky/pre-commit hook).

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const rulePath = (name: string): string =>
  resolve(__dirname, '..', '.claude', 'rules', name);

const agentPath = (name: string): string =>
  resolve(__dirname, '..', '.claude', 'agents', name);

const readRule = (name: string): string => readFileSync(rulePath(name), 'utf8');
const readAgent = (name: string): string => readFileSync(agentPath(name), 'utf8');

// ---------------------------------------------------------------------------
// T-1: Per-session worktree convention
// ---------------------------------------------------------------------------

describe('M-Q3 T-1 startup-protocol.md — per-session worktree convention', () => {
  it('file exists', () => {
    expect(() => statSync(rulePath('startup-protocol.md'))).not.toThrow();
  });

  it('mentions git worktree as the per-session isolation primitive', () => {
    const content = readRule('startup-protocol.md');
    expect(content).toMatch(/git worktree/);
  });

  it('shows the canonical worktree creation command', () => {
    const content = readRule('startup-protocol.md');
    // Allow either /tmp/paxio-<name> or any absolute path — but the command itself
    // must be present in copy-pasteable form.
    expect(content).toMatch(/git worktree add\s+\/tmp\/paxio-/);
  });

  it('mentions the cross-user chmod / EPERM problem worktree solves', () => {
    const content = readRule('startup-protocol.md');
    expect(content).toMatch(/EPERM|cross-user|chmod/i);
  });

  it('explains worktree cleanup (git worktree remove)', () => {
    const content = readRule('startup-protocol.md');
    expect(content).toMatch(/git worktree remove|worktree prune/);
  });
});

describe('M-Q3 T-1 architect-protocol.md — § 1.0 worktree setup', () => {
  it('has § 1.0 (or § 0) worktree setup section BEFORE phase 1 scan', () => {
    const content = readRule('architect-protocol.md');
    // Either "ФАЗА 0" / "### 0." / "### 1.0" pattern, all acceptable
    expect(content).toMatch(/(ФАЗА\s*0|###\s*0\.|###\s*1\.0)/);
  });

  it('worktree section appears before § 1.1 tech-debt scan', () => {
    const content = readRule('architect-protocol.md');
    const worktreeIdx = content.search(/git worktree add/);
    const techDebtIdx = content.search(/###\s*1\.1\s*[—\-]?\s*Tech-debt/);
    expect(worktreeIdx).toBeGreaterThan(0);
    expect(techDebtIdx).toBeGreaterThan(0);
    expect(worktreeIdx).toBeLessThan(techDebtIdx);
  });

  it('mentions branch isolation (separate HEAD per session)', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/separate HEAD|isolated branch|branch isolation|изолирован/i);
  });
});

describe('M-Q3 T-1 workflow.md — worktree mention в Full Cycle', () => {
  it('file references worktree creation as part of architect flow', () => {
    const content = readRule('workflow.md');
    expect(content).toMatch(/git worktree/);
  });
});

describe('M-Q3 T-1 scope-guard.md — branch race condition section', () => {
  it('mentions per-session worktree as defense against branch race conditions', () => {
    const content = readRule('scope-guard.md');
    expect(content).toMatch(/worktree/i);
  });

  it('warns against multiple agents sharing /home/.../paxio working tree', () => {
    const content = readRule('scope-guard.md');
    // Must explicitly call out the shared-tree antipattern
    expect(content).toMatch(/shared (working )?tree|cross-session|race condition/i);
  });
});

// ---------------------------------------------------------------------------
// T-2: Reviewer Phase N tree-clean checkpoint
// ---------------------------------------------------------------------------

describe('M-Q3 T-2 reviewer.md — Phase N tree-clean pre-commit checkpoint', () => {
  it('file exists', () => {
    expect(() => statSync(agentPath('reviewer.md'))).not.toThrow();
  });

  it('Phase N (or Phase 1 build/test gate) requires git status --porcelain clean', () => {
    const content = readAgent('reviewer.md');
    expect(content).toMatch(/git status --porcelain/);
  });

  it('tree-clean checkpoint runs BEFORE updating project-state/tech-debt', () => {
    const content = readAgent('reviewer.md');
    // Treat the docs section as an anchor — porcelain check must appear before
    // the "ПОСЛЕ каждого approved merge" section that lists the doc updates.
    const porcelainIdx = content.search(/git status --porcelain/);
    const updateDocsIdx = content.search(/ПОСЛЕ каждого approved merge|обновлённый project-state/);
    expect(porcelainIdx).toBeGreaterThan(0);
    expect(updateDocsIdx).toBeGreaterThan(0);
    expect(porcelainIdx).toBeLessThan(updateDocsIdx);
  });

  it('explains rationale: untracked WIP from foreign session must not be committed', () => {
    const content = readAgent('reviewer.md');
    expect(content).toMatch(/foreign|untracked|cross-session|чужой/i);
  });
});

// ---------------------------------------------------------------------------
// T-5: safety.md cross-user chmod documentation
// ---------------------------------------------------------------------------

describe('M-Q3 T-5 safety.md — cross-user file ownership section', () => {
  it('has explicit section about cross-user file ownership', () => {
    const content = readRule('safety.md');
    expect(content).toMatch(/Cross-user|cross-user|EPERM/i);
  });

  it('explains that group membership does NOT confer chmod permission', () => {
    const content = readRule('safety.md');
    expect(content).toMatch(/chmod requires owner|group.*not.*chmod|chmod.*owner.*root/i);
  });

  it('points dev-agents to per-session worktree as workaround', () => {
    const content = readRule('safety.md');
    expect(content).toMatch(/worktree/);
  });

  it('mentions pnpm install + copy-api-handlers as common failure points', () => {
    const content = readRule('safety.md');
    expect(content).toMatch(/pnpm install/);
    expect(content).toMatch(/copy-api-handlers|copy-handlers/i);
  });
});
