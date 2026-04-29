/**
 * M-Q19 — drift-guard: agent cleanup mandate + test-runner own-worktree gate.
 *
 * Three problems closed by this PR:
 *   1. Devs / test-runner / reviewer had NO cleanup rule for /tmp/paxio-* worktrees.
 *      Result: 10+ stale worktrees on disk per dev day, breeding cross-user
 *      ownership pollution (root cause of TD-37 + 2026-04-29 test-runner EPERM).
 *   2. Test-runner had NO mandate to use own worktree. Sessions ran in shared
 *      /home/nous/paxio with node_modules/.vite/ owned by previous OS user → EPERM.
 *   3. quality-gate.sh allowed itself to run in shared checkout. No defensive guard.
 *
 * Three fixes pinned here:
 *   - dev-startup.md::Step 6 mandates `git worktree remove --force` after merge
 *   - test-runner.md::Workflow Step 0 mandates own worktree creation
 *   - test-runner.md::Workflow Step 6 mandates cleanup
 *   - reviewer.md::Phase 1.7 mandates cleanup after report
 *   - quality-gate.sh refuses to run in /home/nous/paxio with diagnostic
 *
 * TD-37 (verify_*.sh family TMPDIR sweep) deferred to follow-up M-Q19.5 PR
 * (script-modify pattern was too risky for one batch).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('M-Q19 — dev-startup.md Step 6 cleanup mandate', () => {
  it('dev-startup.md mentions cleanup step (Step 6)', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/Cleanup worktree/i);
  });

  it('cleanup uses git worktree remove --force', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/git worktree remove --force/);
  });

  it('explains rationale (M-Q19 ref + cross-user EPERM)', () => {
    const c = readFile('.claude/rules/dev-startup.md');
    expect(c).toMatch(/M-Q19/);
    expect(c).toMatch(/cross-user|EPERM|stale/i);
  });
});

describe('M-Q19 — test-runner.md Step 0 own-worktree mandate', () => {
  it('test-runner.md Workflow Step 0 mandates own worktree', () => {
    const c = readFile('.claude/agents/test-runner.md');
    expect(c).toMatch(/Step 0|0\.\s*\*\*Create own worktree/);
  });

  it('Step 0 mentions M-Q19 and cross-user EPERM rationale', () => {
    const c = readFile('.claude/agents/test-runner.md');
    expect(c).toMatch(/M-Q19/);
    expect(c).toMatch(/cross-user|EPERM/);
  });

  it('Step 0 has concrete bash recipe for worktree create', () => {
    const c = readFile('.claude/agents/test-runner.md');
    expect(c).toMatch(/git worktree add \/tmp\/paxio-test-/);
    expect(c).toMatch(/pnpm install/);
  });

  it('Step 6 cleanup recipe present', () => {
    const c = readFile('.claude/agents/test-runner.md');
    expect(c).toMatch(/Cleanup worktree/i);
    expect(c).toMatch(/git worktree remove --force/);
  });
});

describe('M-Q19 — reviewer.md Phase 1.7 cleanup mandate', () => {
  it('reviewer.md has Phase 1.7 cleanup section', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/Phase 1\.7|1\.7:.*Cleanup/);
  });

  it('cleanup recipe uses git worktree remove --force', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/Phase 1\.7[\s\S]{0,500}git worktree remove --force/);
  });

  it('mentions M-Q19 mandate context', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/M-Q19 mandate/);
  });
});

describe('M-Q19 — quality-gate.sh shared-checkout refusal', () => {
  it('quality-gate.sh refuses to run in /home/nous/paxio', () => {
    const c = readFile('scripts/quality-gate.sh');
    expect(c).toMatch(/\/home\/nous\/paxio.*\)/);
    expect(c).toMatch(/INFRASTRUCTURE|refused/);
  });

  it('refusal message references test-runner.md::Workflow Step 0', () => {
    const c = readFile('scripts/quality-gate.sh');
    expect(c).toMatch(/test-runner\.md.*Workflow Step 0/);
  });

  it('refusal exit code is 1 (not silent skip)', () => {
    const c = readFile('scripts/quality-gate.sh');
    // The case branch must include `exit 1`
    const caseMatch = c.match(/case "\$ROOT" in[\s\S]*?esac/);
    expect(caseMatch, 'case block expected').not.toBeNull();
    expect(caseMatch![0]).toMatch(/exit 1/);
  });

  it('refusal provides recovery commands (git worktree add + pnpm install)', () => {
    const c = readFile('scripts/quality-gate.sh');
    expect(c).toMatch(/git worktree add \/tmp\/paxio-test/);
    expect(c).toMatch(/pnpm install/);
  });
});

describe('M-Q19 — quality-gate.sh early TMPDIR sanity (M-Q17 reinforcement)', () => {
  it('quality-gate.sh checks TMPDIR for literal $HOME', () => {
    const c = readFile('scripts/quality-gate.sh');
    expect(c).toMatch(/TMPDIR.*\$HOME/);
    expect(c).toMatch(/Claude Code does NOT expand env/);
  });

  it('TMPDIR check exits 1 with diagnostic before pnpm install runs', () => {
    const c = readFile('scripts/quality-gate.sh');
    // Diagnostic must include absolute-path fix template
    expect(c).toMatch(/\/home\/<your-user>\/\.cache\/paxio-tmp/);
  });

  it('quality-gate.sh detects leftover literal $HOME/ directory at repo root', () => {
    const c = readFile('scripts/quality-gate.sh');
    expect(c).toMatch(/\$ROOT\/\\\$HOME/);
    expect(c).toMatch(/leftover|Leftover/);
  });

  it('leftover-dir check provides rm -rf cleanup recipe', () => {
    const c = readFile('scripts/quality-gate.sh');
    expect(c).toMatch(/rm -rf .*\$ROOT.*\$HOME/);
  });

  it('both TMPDIR + leftover checks run AFTER shared-checkout refusal but BEFORE main 6-step flow', () => {
    const c = readFile('scripts/quality-gate.sh');
    const sharedRefusalIdx = c.indexOf('quality-gate.sh refused: shared checkout');
    const tmpdirIdx = c.indexOf('TMPDIR contains literal');
    // Bash escape: `literal \$HOME/` in source — the backslash is real in the file
    const leftoverIdx = c.indexOf('literal \\$HOME/ directory at');
    const step1Idx = c.indexOf('1/6 pnpm typecheck');
    expect(sharedRefusalIdx, 'shared-checkout refusal block must exist').toBeGreaterThan(0);
    expect(tmpdirIdx, 'TMPDIR check must exist').toBeGreaterThan(0);
    expect(leftoverIdx, 'leftover check must exist').toBeGreaterThan(0);
    expect(step1Idx, 'step 1/6 typecheck must exist').toBeGreaterThan(0);
    // Order: shared-refusal < TMPDIR < leftover < step 1/6
    expect(sharedRefusalIdx).toBeLessThan(tmpdirIdx);
    expect(tmpdirIdx).toBeLessThan(leftoverIdx);
    expect(leftoverIdx).toBeLessThan(step1Idx);
  });
});
