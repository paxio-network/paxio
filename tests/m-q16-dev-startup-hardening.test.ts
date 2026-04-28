/**
 * M-Q16 — dev-startup.md hardening drift-guard.
 *
 * Pins critical invariants restored to dev auto-load context after the M-Q13
 * rules→skills migration freed budget. Three classes of pin:
 *
 *   1. Five Hard Rules (3 original + 2 new from PR #74 / registry-dev incidents):
 *      - Rule 4: NEVER amend/rebase commits authored by others (drop-by-amend
 *        erased architect's RED-test commit on PR #74)
 *      - Rule 5: NEVER «готово» without full vitest baseline (target-only run
 *        missed stub-adapters regression on registry-dev T-3 round 1)
 *
 *   2. P0 invariants section — security/correctness (multi-tenancy / VM sandbox
 *      / Rust no-panic / Real Data Invariant). Was auto-loaded via archived rules
 *      pre-M-Q13; now condensed into dev-startup.md to stay in context every session.
 *
 *   3. Process steps — Step 1 branch verify (`git symbolic-ref HEAD`) and Step 5
 *      clean-tree check (`git status --porcelain`). Both gaps caused PR #74
 *      detached-HEAD + untracked-test issues.
 *
 * If a future PR removes any of these markers, this test fails before merge.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const DEV_STARTUP = resolve(ROOT, '.claude/rules/dev-startup.md');

function readDevStartup(): string {
  return readFileSync(DEV_STARTUP, 'utf8');
}

describe('M-Q16 — Five Hard Rules (extended from Three)', () => {
  it('declares «Five Hard Rules» heading (was Three before M-Q16)', () => {
    const c = readDevStartup();
    expect(c).toMatch(/##\s+Five Hard Rules/);
  });

  it('Rule 1 — never touch other agents\' files', () => {
    const c = readDevStartup();
    expect(c).toMatch(/1\.\s*NEVER touch other agents'\s*files/);
  });

  it('Rule 2 — never modify tests, includes drop-by-amend extension', () => {
    const c = readDevStartup();
    expect(c).toMatch(/2\.\s*NEVER modify tests/);
    expect(c, 'rule 2 must extend TESTS SACRED to include drop-by-amend').toMatch(/drop-by-amend/);
  });

  it('Rule 3 — never git push or gh pr', () => {
    const c = readDevStartup();
    expect(c).toMatch(/3\.\s*NEVER `?git push`?/);
  });

  it('Rule 4 — NEVER amend/rebase on commits authored by others (PR #74 incident)', () => {
    const c = readDevStartup();
    expect(c).toMatch(/4\.\s*NEVER `?git commit --amend`?/);
    expect(c).toMatch(/rebase -i/);
    expect(c, 'rule 4 must reference the originating incident').toMatch(/PR #74|drop-by-amend/);
  });

  it('Rule 5 — NEVER «готово» without full vitest baseline (registry-dev T-3 round 1 incident)', () => {
    const c = readDevStartup();
    expect(c).toMatch(/5\.\s*NEVER reply «готово»/);
    expect(c).toMatch(/full baseline|FULL baseline/);
    expect(c, 'rule 5 must reference originating incident').toMatch(/stub-adapters|round 1/i);
  });
});

describe('M-Q16 — P0 invariants section restored from archived rules', () => {
  it('declares «P0 invariants» section heading', () => {
    const c = readDevStartup();
    expect(c).toMatch(/##\s+P0 invariants/);
  });

  it('multi-tenancy invariant — session.* not body.*', () => {
    const c = readDevStartup();
    expect(c).toMatch(/multi-tenancy/i);
    expect(c).toMatch(/session\.agentDid|session\.organizationId/);
    expect(c).toMatch(/body\.\*/);
  });

  it('multi-tenancy invariant — inter-canister via ic_cdk::caller()', () => {
    const c = readDevStartup();
    expect(c).toMatch(/ic_cdk::caller/);
  });

  it('VM sandbox invariant — forbidden globals listed', () => {
    const c = readDevStartup();
    expect(c).toMatch(/VM sandbox/i);
    expect(c).toMatch(/no\s+`?require/);
    expect(c).toMatch(/no\s+`?import/);
    expect(c).toMatch(/process\.env/);
    expect(c).toMatch(/Math\.random|Date\.now/);
  });

  it('Rust no-panic invariant — unwrap/panic forbidden in production', () => {
    const c = readDevStartup();
    expect(c).toMatch(/Rust panic-free|panic-free production/i);
    expect(c).toMatch(/unwrap/);
    expect(c).toMatch(/panic/);
    expect(c).toMatch(/Result<T,/);
  });

  it('Real Data Invariant (frontend) — Math.random() in render forbidden under data-production=true', () => {
    const c = readDevStartup();
    expect(c).toMatch(/Real Data Invariant/);
    expect(c).toMatch(/Math\.random/);
    expect(c).toMatch(/data-production/);
    expect(c).toMatch(/PreviewRibbon|R-FE-Preview/);
  });
});

describe('M-Q16 — Step 1 branch verify (detached-HEAD trap)', () => {
  it('Step 1 instructs `git symbolic-ref HEAD` check', () => {
    const c = readDevStartup();
    expect(c).toMatch(/git symbolic-ref HEAD/);
  });

  it('Step 1 mentions detached HEAD failure mode', () => {
    const c = readDevStartup();
    expect(c).toMatch(/detached HEAD|\(detached\)/i);
  });
});

describe('M-Q16 — Step 5 clean-tree + full-baseline checks', () => {
  it('Step 5 requires `pnpm exec vitest run` (full baseline) before «готово»', () => {
    const c = readDevStartup();
    expect(c).toMatch(/pnpm exec vitest run/);
    expect(c).toMatch(/FULL baseline|full baseline/);
  });

  it('Step 5 requires `git status --porcelain` empty before «готово»', () => {
    const c = readDevStartup();
    expect(c).toMatch(/git status --porcelain/);
  });

  it('Step 5 mentions untracked-as-scope-violation rule', () => {
    const c = readDevStartup();
    expect(c).toMatch(/untracked.*scope violation|scope violation.*untracked/i);
  });

  it('Step 5 requires `git diff --cached` review', () => {
    const c = readDevStartup();
    expect(c).toMatch(/git diff --cached/);
  });
});

describe('M-Q16 — file size + budget sanity', () => {
  it('dev-startup.md stays under 6 KB (auto-load budget — was 2 KB pre-Q16, target ≤ 6 KB)', () => {
    // Pre-M-Q16 baseline: ~2 KB. M-Q16 adds 5 Hard Rules + P0 invariants
    // + verify steps. Cap at 6 KB to keep auto-load tight while covering
    // restored invariants. Pre-M-Q13 dev got 22-31 KB of rules per turn —
    // this is still ~4× cheaper.
    const bytes = readFileSync(DEV_STARTUP).byteLength;
    expect(bytes, `dev-startup.md is ${bytes} bytes — too heavy for per-turn auto-load`).toBeLessThanOrEqual(
      6144,
    );
  });

  it('dev-startup.md still has the narrowed globs (M-Q13 — only impl dirs, not tests)', () => {
    const c = readDevStartup();
    expect(c).toMatch(/globs:\s*\[/);
    expect(c).toMatch(/apps\/(back|frontend)/);
    expect(c).not.toMatch(/"products\/\*\*\/\*\.\{ts,js,rs\}"/);
  });
});
