// M-Q2 T-4 — Drift-guard for .github/workflows/spec-review.yml structure.
//
// Validates: PR label `spec-ready` gate, frozen-lockfile + typecheck + vitest
// + drift-guard tests steps, timeout 5min, fast (<90s target).
//
// Architect-only file (.github/ — protected by .husky/pre-commit hook scope rules).

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const WORKFLOW_PATH = resolve(
  __dirname,
  '..',
  '.github',
  'workflows',
  'spec-review.yml',
);

const readWorkflow = (): string => {
  try {
    return readFileSync(WORKFLOW_PATH, 'utf8');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`spec-review.yml not found (${msg})`);
  }
};

describe('M-Q2 T-4 spec-review.yml — file existence + structure', () => {
  it('file exists', () => {
    expect(() => statSync(WORKFLOW_PATH)).not.toThrow();
  });

  it('has GitHub Actions yaml structure (name + on + jobs)', () => {
    const content = readWorkflow();
    expect(content).toMatch(/^name:/m);
    expect(content).toMatch(/^on:/m);
    expect(content).toMatch(/^jobs:/m);
  });

  it('has descriptive name (Spec Review / Phase 0)', () => {
    const content = readWorkflow();
    expect(content).toMatch(/Spec Review|Phase 0/i);
  });
});

describe('M-Q2 T-4 spec-review.yml — trigger conditions (PR label spec-ready)', () => {
  it('triggers on pull_request labeled events', () => {
    const content = readWorkflow();
    expect(content).toMatch(/pull_request:/);
    expect(content).toMatch(/types:.*labeled/);
  });

  it('also triggers on workflow_dispatch (manual)', () => {
    const content = readWorkflow();
    expect(content).toMatch(/workflow_dispatch/);
  });

  it('gates job execution on spec-ready label', () => {
    const content = readWorkflow();
    expect(content).toMatch(/contains\(github\.event\.pull_request\.labels\.\*\.name,\s*'spec-ready'\)/);
  });

  it('targets dev and main branches', () => {
    const content = readWorkflow();
    expect(content).toMatch(/branches:\s*\[?(dev,\s*main|main,\s*dev)/);
  });
});

describe('M-Q2 T-4 spec-review.yml — required steps', () => {
  it('has pnpm install --frozen-lockfile step', () => {
    const content = readWorkflow();
    expect(content).toMatch(/pnpm install --frozen-lockfile/);
  });

  it('has pnpm typecheck step', () => {
    const content = readWorkflow();
    expect(content).toMatch(/pnpm typecheck/);
  });

  it('has pnpm exec vitest run step (ROOT, not per-app filter)', () => {
    const content = readWorkflow();
    expect(content).toMatch(/pnpm exec vitest run(?!\s+--filter)/);
  });

  it('runs M-Q2 drift-guard tests', () => {
    const content = readWorkflow();
    expect(content).toMatch(/spec-review-checklist|reviewer-phase-0|architect-self-review|rust-rules/);
  });

  it('uses pnpm action-setup with workspace version', () => {
    const content = readWorkflow();
    expect(content).toMatch(/pnpm\/action-setup/);
  });

  it('uses Node 22 with pnpm cache', () => {
    const content = readWorkflow();
    // Matches both literal `node-version: 22` and env-referenced
    // `node-version: ${{ env.NODE_VERSION }}` with NODE_VERSION='22' set in env block
    expect(content).toMatch(
      /node-version:\s*(['"]?22|\$\{\{\s*env\.NODE_VERSION\s*\}\})/,
    );
    if (/node-version:\s*\$\{\{\s*env\.NODE_VERSION/.test(content)) {
      // env-indirection used — verify NODE_VERSION env var is set to '22'
      expect(content).toMatch(/NODE_VERSION:\s*['"]22['"]/);
    }
    expect(content).toMatch(/cache:\s*['"]pnpm['"]/);
  });
});

describe('M-Q2 T-4 spec-review.yml — performance constraints', () => {
  it('has timeout-minutes (≤ 5)', () => {
    const content = readWorkflow();
    expect(content).toMatch(/timeout-minutes:\s*[1-5]\b/);
  });

  it('has concurrency group with cancel-in-progress', () => {
    const content = readWorkflow();
    expect(content).toMatch(/concurrency:/);
    expect(content).toMatch(/cancel-in-progress:\s*true/);
  });

  it('does NOT include cargo build or per-app build (out of scope for spec-review)', () => {
    const content = readWorkflow();
    // Spec-review must NOT trigger cargo or per-app frontend build (those are heavy)
    expect(content).not.toMatch(/cargo build|cargo test/);
    expect(content).not.toMatch(/pnpm --filter @paxio\/.*-app build/);
  });
});

describe('M-Q2 T-4 spec-review.yml — status-check aggregator', () => {
  it('has status-check job aggregating spec-review result', () => {
    const content = readWorkflow();
    expect(content).toMatch(/status-check|All Spec Review/i);
  });

  it('status-check needs: [spec-review]', () => {
    const content = readWorkflow();
    expect(content).toMatch(/needs:\s*\[\s*spec-review\s*\]/);
  });

  it('status-check verifies success of spec-review', () => {
    const content = readWorkflow();
    expect(content).toMatch(/needs\.spec-review\.result/);
  });
});

describe('M-Q2 T-4 spec-review.yml — documentation comments', () => {
  it('comments mention M-Q2 T-4 reference', () => {
    const content = readWorkflow();
    expect(content).toMatch(/M-Q2\s+T-4/);
  });

  it('comments explain Phase 0 spec-pass model', () => {
    const content = readWorkflow();
    expect(content).toMatch(/Phase 0/);
  });

  it('comments reference coding-standards-checklist.md walk', () => {
    const content = readWorkflow();
    expect(content).toMatch(/coding-standards-checklist/);
  });

  it('comments reference 90s runtime target', () => {
    const content = readWorkflow();
    expect(content).toMatch(/90s|<\s*90/);
  });
});
