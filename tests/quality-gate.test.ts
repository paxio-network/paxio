// M-Q1 — Drift-guard for scripts/quality-gate.sh.
//
// scripts/quality-gate.sh is the single source of truth for what
// test-runner runs. If someone (LLM or human) silently removes a step,
// this test catches it.
//
// Reads the script as plain text and asserts:
//   1. set -euo pipefail (strict bash)
//   2. each of 6 mandatory commands present
//   3. exit codes propagated (no `|| true` masking)
//   4. apps detected from git diff, not hardcoded
//
// Pre-fix (M-Q1 RED): script does not exist OR is missing checks.
// Post-fix: drift-guard remains GREEN even after refactors.

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const SCRIPT_PATH = resolve(__dirname, '..', 'scripts', 'quality-gate.sh');

const readScript = (): string => {
  try {
    return readFileSync(SCRIPT_PATH, 'utf8');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `scripts/quality-gate.sh not found (${msg}). Architect must create it per M-Q1 milestone.`,
    );
  }
};

describe('M-Q1 quality-gate.sh — file existence', () => {
  it('script exists at scripts/quality-gate.sh', () => {
    expect(() => statSync(SCRIPT_PATH)).not.toThrow();
  });

  it('script is non-empty (>= 50 lines)', () => {
    const content = readScript();
    expect(content.split('\n').length).toBeGreaterThanOrEqual(50);
  });
});

describe('M-Q1 quality-gate.sh — bash safety', () => {
  it('uses set -euo pipefail (strict mode)', () => {
    const content = readScript();
    expect(content).toMatch(/set\s+-euo\s+pipefail/);
  });

  it('shebang is /usr/bin/env bash', () => {
    const content = readScript();
    expect(content.split('\n')[0]).toMatch(/^#!\/usr\/bin\/env bash$/);
  });

  it('takes milestone as required arg ($1) with usage error', () => {
    const content = readScript();
    expect(content).toMatch(/MILESTONE=.*\?usage/);
  });
});

describe('M-Q1 quality-gate.sh — 6 mandatory steps', () => {
  it('step 1: pnpm typecheck', () => {
    expect(readScript()).toMatch(/pnpm\s+typecheck/);
  });

  it('step 2: pnpm exec vitest run (ROOT, not --filter)', () => {
    const content = readScript();
    // Must run vitest at root level — `pnpm exec vitest run` or equivalent.
    // Not just `pnpm --filter <X> test` (that's per-app, step 3).
    expect(content).toMatch(/pnpm\s+exec\s+vitest\s+run/);
  });

  it('step 3: pnpm --filter <pkg> test (per touched app)', () => {
    const content = readScript();
    // Either literal `@paxio/<app>-app` OR `"$pkg"` where pkg is set to that
    // pattern. Both forms are valid — assert pkg is constructed AND used.
    expect(content).toMatch(/@paxio\/\$\{?app\}?-app/); // pkg construction
    expect(content).toMatch(/pnpm\s+--filter\s+["']?\$\{?pkg\}?["']?\s+test/); // usage
  });

  it('step 4: pnpm --filter <pkg> build (per touched app)', () => {
    const content = readScript();
    expect(content).toMatch(/pnpm\s+--filter\s+["']?\$\{?pkg\}?["']?\s+build/);
  });

  it('step 5: cargo test --workspace (conditional on Rust changes)', () => {
    const content = readScript();
    expect(content).toMatch(/cargo\s+test\s+--workspace/);
  });

  it('step 6: bash scripts/verify_<milestone>.sh', () => {
    const content = readScript();
    expect(content).toMatch(/scripts\/verify_\$\{?MILESTONE\}?/);
  });
});

describe('M-Q1 quality-gate.sh — Turborepo-aware app detection', () => {
  it('detects touched apps via git diff origin/dev..HEAD', () => {
    const content = readScript();
    expect(content).toMatch(/git\s+diff\s+--name-only\s+origin\/dev\.\.HEAD/);
  });

  it('apps not hardcoded — extracted via grep ^apps/frontend/', () => {
    const content = readScript();
    expect(content).toMatch(/grep[^|\n]*apps\/frontend\//);
  });

  it('Rust detection via grep on canister/platform paths', () => {
    const content = readScript();
    expect(content).toMatch(/canister|platform\/canister-shared|Cargo/);
  });
});

describe('M-Q1 quality-gate.sh — exit code propagation', () => {
  it('exits 1 on first FAIL (fail-fast)', () => {
    const content = readScript();
    // Each step's failure path must `exit 1` — not just bad() and continue.
    const exits = content.match(/exit\s+1/g) ?? [];
    expect(exits.length).toBeGreaterThanOrEqual(5); // ≥1 per critical step
  });

  it('no `|| true` masking critical commands', () => {
    const content = readScript();
    // `|| true` allowed only on auxiliary commands (e.g. tail, grep that may
    // empty-match). Critical commands (pnpm, cargo, bash verify_) must NOT
    // have `|| true` directly suffixed.
    const criticalWithMask =
      /\b(pnpm\s+typecheck|pnpm\s+exec\s+vitest\s+run|cargo\s+test|bash\s+\$ACC|bash\s+scripts\/verify_)[^\n]*\|\|\s*true\b/;
    expect(content).not.toMatch(criticalWithMask);
  });

  it('final line exits with $FAIL count (overall status)', () => {
    const content = readScript();
    expect(content).toMatch(/\[\s*\$FAIL\s+-eq\s+0\s*\]\s*$/m);
  });
});

describe('M-Q1 quality-gate.sh — observability', () => {
  it('counts PASS / FAIL and reports both', () => {
    const content = readScript();
    expect(content).toMatch(/PASS=0/);
    expect(content).toMatch(/FAIL=0/);
    expect(content).toMatch(/PASS=\$\{?PASS\}?\s+FAIL=\$\{?FAIL\}?/);
  });

  it('logs each step output to /tmp/qg-*.log for post-mortem', () => {
    const content = readScript();
    expect(content).toMatch(/\/tmp\/qg-/);
  });

  it('on failure, tails the relevant log to console (not silent)', () => {
    const content = readScript();
    expect(content).toMatch(/tail\s+-\d+\s+\/tmp\/qg-/);
  });
});
