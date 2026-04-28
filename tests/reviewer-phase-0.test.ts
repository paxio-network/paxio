// M-Q2 T-1 — Drift-guard for .claude/agents/reviewer.md Phase 0 section.
//
// Validates that reviewer.md has the new Phase 0 spec-review section with
// 6-step process, output format, boundaries, and references to checklist.
// Catches accidental removal/weakening of Phase 0 procedure.
//
// Architect-only file (in .claude/agents/, protected by .husky/pre-commit hook).

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const REVIEWER_PATH = resolve(__dirname, '..', '.claude', 'agents', 'reviewer.md');

const readReviewer = (): string => {
  try {
    return readFileSync(REVIEWER_PATH, 'utf8');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`reviewer.md not found (${msg})`);
  }
};

describe('M-Q2 T-1 reviewer.md — two-phase model intro', () => {
  it('file exists', () => {
    expect(() => statSync(REVIEWER_PATH)).not.toThrow();
  });

  it('has "Two-phase review model" section explaining Phase 0 vs Phase N', () => {
    const content = readReviewer();
    expect(content).toMatch(/##\s*Two-phase review model/i);
  });

  it('mentions both Phase 0 (spec) and Phase N (impl)', () => {
    const content = readReviewer();
    expect(content).toMatch(/Phase 0/);
    expect(content).toMatch(/Phase N/);
  });

  it('explains Phase 0 trigger via Agent sub-agent invocation', () => {
    const content = readReviewer();
    expect(content).toMatch(/subagent_type.*reviewer|Agent.*subagent/);
  });

  it('explains Phase N trigger via user invocation', () => {
    const content = readReviewer();
    expect(content).toMatch(/user invokes|user[- ]invoked/i);
  });
});

describe('M-Q2 T-1 reviewer.md — Phase 0 boundaries', () => {
  it('explicitly states Phase 0 does NOT update tech-debt.md', () => {
    const content = readReviewer();
    // Look for Phase 0 boundary section that mentions NOT update
    const phase0Section = content.split(/##\s*Phase N/)[0]; // everything before Phase N
    expect(phase0Section).toMatch(/NO update|DO NOT update.*tech-debt/i);
  });

  it('explicitly states Phase 0 does NOT update project-state.md', () => {
    const content = readReviewer();
    const phase0Section = content.split(/##\s*Phase N/)[0];
    expect(phase0Section).toMatch(/NO update|DO NOT update.*project-state/i);
  });

  it('Phase 0 output под 500 words', () => {
    const content = readReviewer();
    expect(content).toMatch(/under 500 words|Output под 500/i);
  });
});

describe('M-Q2 T-1 reviewer.md — Phase 0 process (6 steps)', () => {
  it('has Phase 0 section', () => {
    const content = readReviewer();
    expect(content).toMatch(/##\s*Phase 0:?\s*Spec Review/);
  });

  it('Phase 0 mentions 6-step process', () => {
    const content = readReviewer();
    expect(content).toMatch(/6 steps|6-step|Process.*\(6/i);
  });

  it('Phase 0 step: Read milestone "Готово когда"', () => {
    const content = readReviewer();
    expect(content).toMatch(/Read milestone[\s\S]{0,100}Готово когда/);
  });

  it('Phase 0 step: Run vitest на новых файлах', () => {
    const content = readReviewer();
    expect(content).toMatch(/Run vitest|pnpm exec vitest/);
  });

  it('Phase 0 step: Walk coding-standards-checklist.md top-down', () => {
    const content = readReviewer();
    expect(content).toMatch(/Walk.*coding-standards-checklist/i);
    expect(content).toMatch(/top[- ]down/i);
  });

  it('Phase 0 step: Verify infrastructure clean (frozen-lockfile)', () => {
    const content = readReviewer();
    expect(content).toMatch(/--frozen-lockfile/);
  });

  it('Phase 0 step: Verify acceptance script idempotent (run twice)', () => {
    const content = readReviewer();
    expect(content).toMatch(/idempoten/i);
    expect(content).toMatch(/twice|2[×x] run|run.*two/i);
  });
});

describe('M-Q2 T-1 reviewer.md — Phase 0 verdict format', () => {
  it('has SPEC APPROVED verdict label', () => {
    const content = readReviewer();
    expect(content).toMatch(/SPEC APPROVED/);
  });

  it('has SPEC REJECTED verdict label', () => {
    const content = readReviewer();
    expect(content).toMatch(/SPEC REJECTED/);
  });

  it('REJECTED includes must-fix list with C-N references + file:line', () => {
    const content = readReviewer();
    expect(content).toMatch(/must-fix list/i);
    expect(content).toMatch(/C-?N|C-\d+|\*\*C\d+/);
    expect(content).toMatch(/file:line/i);
  });

  it('mentions 3-rounds-then-escalate rule', () => {
    const content = readReviewer();
    expect(content).toMatch(/3 reject|3 round|three round/i);
    expect(content).toMatch(/escalate/i);
  });
});

describe('M-Q2 T-1 reviewer.md — checklist severity rules', () => {
  it('P0 violations → automatic SPEC REJECTED', () => {
    const content = readReviewer();
    expect(content).toMatch(/P0[\s\S]{0,200}automatic.*REJECTED/i);
  });

  it('P1 violations → SPEC REJECTED unless SCOPE REQUEST rationale', () => {
    const content = readReviewer();
    expect(content).toMatch(/P1[\s\S]{0,200}SCOPE REQUEST/);
  });

  it('P2 violations → must-fix or defer to TD', () => {
    const content = readReviewer();
    expect(content).toMatch(/P2[\s\S]{0,200}(must-fix|TD|tech[- ]debt)/i);
  });
});

describe('M-Q2 T-1 reviewer.md — Phase N (existing flow) preserved', () => {
  it('Phase N section still exists', () => {
    const content = readReviewer();
    expect(content).toMatch(/##\s*Phase N:?\s*Implementation/);
  });

  it('Phase N retains existing 13 phases (Build & Test Gate, etc.)', () => {
    const content = readReviewer();
    expect(content).toMatch(/Phase 1:.*Build.*Test Gate/);
    expect(content).toMatch(/Phase 2:.*Multi[- ]Tenancy/);
    expect(content).toMatch(/Phase 13:.*Documentation/);
  });

  it('Phase N still has Severity Levels table (BLOCKER/WARNING/NOTE)', () => {
    const content = readReviewer();
    expect(content).toMatch(/##\s*Severity Levels/);
    expect(content).toMatch(/BLOCKER/);
    expect(content).toMatch(/WARNING/);
  });
});

describe('M-Q2 T-1 reviewer.md — references checklist', () => {
  it('Key References section mentions coding-standards-checklist.md', () => {
    const content = readReviewer();
    expect(content).toMatch(/coding-standards-checklist\.md/);
  });

  it('coding-standards-checklist.md described as single source of truth', () => {
    const content = readReviewer();
    expect(content).toMatch(/single source of truth/i);
  });

  it('References include 3 NEW Rust rule files (M-Q2 T-6)', () => {
    const content = readReviewer();
    expect(content).toMatch(/rust-error-handling\.md/);
    expect(content).toMatch(/rust-async\.md/);
    expect(content).toMatch(/rust-build\.md/);
  });
});
