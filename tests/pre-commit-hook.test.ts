// M-Q1 T-2 — Drift-guard for .husky/pre-commit.
//
// Reads the hook script as text and asserts:
//   - identity mapping table covers all 7 roles
//   - scope rules cover all protected paths from scope-guard.md
//   - bash strict mode (`set -euo pipefail`)
//   - no `|| true` masking on critical exit paths
//
// If anyone weakens or removes a rule, this test fails. CI runs it via
// .github/workflows/root-tests.yml. Local pnpm exec vitest run also catches.

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const HOOK_PATH = resolve(__dirname, '..', '.husky', 'pre-commit');

const readHook = (): string => {
  try {
    return readFileSync(HOOK_PATH, 'utf8');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `.husky/pre-commit not found (${msg}). Architect must create it per M-Q1 T-2.`,
    );
  }
};

describe('M-Q1 .husky/pre-commit — file existence + executability', () => {
  it('hook file exists', () => {
    expect(() => statSync(HOOK_PATH)).not.toThrow();
  });

  it('hook is executable', () => {
    const stat = statSync(HOOK_PATH);
    // Mode 0o100 means owner-execute. Need at least owner-execute for husky to run.
    expect(stat.mode & 0o100).toBeGreaterThan(0);
  });
});

describe('M-Q1 .husky/pre-commit — bash safety', () => {
  it('uses set -euo pipefail (strict mode)', () => {
    const content = readHook();
    expect(content).toMatch(/set\s+-euo\s+pipefail/);
  });

  it('shebang is /usr/bin/env bash (not sh — needs arrays/locals)', () => {
    const content = readHook();
    expect(content.split('\n')[0]).toMatch(/^#!\/usr\/bin\/env bash$/);
  });

  it('no `|| true` masking critical exit paths', () => {
    const content = readHook();
    // `|| true` is allowed only on the `git diff` line where empty diff is
    // legitimate. Critical paths (exit 1, expected_email_for_name, check_scope
    // body) must NOT have `|| true` suffixed.
    const criticalMask = /\bexit 1[^\n]*\|\|\s*true\b/;
    expect(content).not.toMatch(criticalMask);
  });
});

describe('M-Q1 .husky/pre-commit — identity mapping covers all 7 roles', () => {
  const ROLES = [
    'architect',
    'reviewer',
    'backend-dev',
    'frontend-dev',
    'icp-dev',
    'registry-dev',
    'test-runner',
  ];

  for (const role of ROLES) {
    it(`includes ${role} → ${role}@paxio.network`, () => {
      const content = readHook();
      expect(content).toContain(`${role})`);
      expect(content).toContain(`${role}@paxio.network`);
    });
  }

  it('rejects mismatched name/email pair', () => {
    const content = readHook();
    // Hook must check $EMAIL against $EXPECTED and exit non-zero on mismatch
    expect(content).toMatch(/EMAIL.*!=.*EXPECTED/);
    expect(content).toMatch(/identity mismatch/i);
  });
});

describe('M-Q1 .husky/pre-commit — scope rules cover protected paths', () => {
  it('protects tests/ + products/*/tests/ + apps/frontend/*/tests/ — architect only', () => {
    const content = readHook();
    expect(content).toMatch(/tests\//);
    expect(content).toMatch(/products\/.*tests\//);
    expect(content).toMatch(/apps\/frontend\/.*tests\//);
  });

  it('protects docs/sprints/ + docs/feature-areas/ — architect only', () => {
    const content = readHook();
    expect(content).toMatch(/docs\/(sprints|feature-areas)/);
  });

  it('protects docs/tech-debt.md + docs/project-state.md — reviewer only', () => {
    const content = readHook();
    expect(content).toMatch(/docs\/(tech-debt|project-state)/);
    // The guard line for these must include reviewer@paxio.network
    const techDebtSection = content.split(/check_scope/).find(
      s => /tech-debt|project-state/.test(s),
    );
    expect(techDebtSection).toBeDefined();
    expect(techDebtSection).toContain('reviewer@paxio.network');
  });

  it('protects .claude/ + CLAUDE.md — architect or reviewer only', () => {
    const content = readHook();
    expect(content).toMatch(/\\\.claude\//);
    expect(content).toMatch(/CLAUDE\\\.md/);
    const claudeSection = content.split(/check_scope/).find(
      s => /\.claude/.test(s) && /CLAUDE/.test(s),
    );
    expect(claudeSection).toBeDefined();
    expect(claudeSection).toContain('architect@paxio.network');
    expect(claudeSection).toContain('reviewer@paxio.network');
  });
});

describe('M-Q1 .husky/pre-commit — diagnostic output on violation', () => {
  it('prints scope violation message with allowed identities', () => {
    const content = readHook();
    expect(content).toMatch(/scope violation/i);
    expect(content).toMatch(/allowed/i);
  });

  it('prints identity mismatch with fix instructions', () => {
    const content = readHook();
    expect(content).toMatch(/git config user\.email/);
  });

  it('mentions SCOPE VIOLATION REQUEST escape hatch', () => {
    const content = readHook();
    expect(content).toMatch(/!!! SCOPE VIOLATION REQUEST !!!/);
  });
});

describe('M-Q1 .husky/pre-commit — happy path semantics', () => {
  it('exits 0 with success message when all checks pass', () => {
    const content = readHook();
    expect(content).toMatch(/✅.*pre-commit OK/);
  });
});
