// M-Q2 T-2 — Drift-guard for architect self-call reviewer Phase 0 invocation pattern.
//
// Validates that .claude/rules/architect-protocol.md has § 6.5 with sub-agent
// invocation pattern, and .claude/rules/workflow.md mentions Phase 0 spec-pass
// в Full Cycle. Catches accidental removal of self-call infrastructure.
//
// Architect-only files (in .claude/rules/, protected by .husky/pre-commit hook).

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const rulePath = (name: string): string =>
  resolve(__dirname, '..', '.claude', 'rules', name);

const readRule = (name: string): string => readFileSync(rulePath(name), 'utf8');

describe('M-Q2 T-2 architect-protocol.md — § 6.5 self-call reviewer Phase 0', () => {
  it('file exists', () => {
    expect(() => statSync(rulePath('architect-protocol.md'))).not.toThrow();
  });

  it('has § 6.5 Self-call reviewer Phase 0 section', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/###\s*6\.5\s*[—\-]?\s*Self-call reviewer Phase 0/i);
  });

  it('mentions Phase 0 happens BEFORE user handoff', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/BEFORE.*user handoff|до handoff/i);
  });

  it('has push + create PR + add spec-ready label sequence', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/git push -u origin/);
    expect(content).toMatch(/gh pr create/);
    expect(content).toMatch(/spec-ready/);
  });

  it('shows Agent tool sub-agent invocation pattern', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/Agent\(\{/);
    expect(content).toMatch(/subagent_type:\s*"reviewer"/);
  });

  it('prompt to sub-agent specifies "Phase 0" + "NOT impl review"', () => {
    const content = readRule('architect-protocol.md');
    // Find the prompt block
    const phase65Section = content.split(/###\s*6\.5/)[1]?.split(/###\s*6\.6/)[0] ?? '';
    expect(phase65Section).toMatch(/Phase 0/);
    expect(phase65Section).toMatch(/NOT impl review|pre-impl/i);
  });

  it('prompt instructs reviewer to NOT update tech-debt/project-state', () => {
    const content = readRule('architect-protocol.md');
    const phase65Section = content.split(/###\s*6\.5/)[1]?.split(/###\s*6\.6/)[0] ?? '';
    expect(phase65Section).toMatch(/DO NOT update.*tech-debt/i);
    expect(phase65Section).toMatch(/DO NOT update.*project-state|tech-debt.*project-state/i);
  });

  it('prompt references coding-standards-checklist.md walk', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/coding-standards-checklist\.md/);
  });

  it('describes verdict parsing (SPEC APPROVED / SPEC REJECTED)', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/SPEC APPROVED/);
    expect(content).toMatch(/SPEC REJECTED/);
    expect(content).toMatch(/dev-ready/);
  });

  it('has 3-rounds-then-escalate rule', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/3 round|three round/i);
    expect(content).toMatch(/escalat/i);
  });

  it('describes failure modes (sub-agent unavailable, perebdil, nedobdil)', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/[Ff]ailure mode/);
  });

  it('mentions cost / overhead consideration (~30s + 60s = ~90s)', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/[Cc]ost|overhead/);
    expect(content).toMatch(/30s|60s|90s/);
  });

  it('§ 6.6 — Скажи user (renamed from old 6.5) preserved', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/###\s*6\.6\s*[—\-]?\s*Скажи user/);
  });

  it('§ 6.6 includes Phase 0 APPROVED reviewer note in handoff message', () => {
    const content = readRule('architect-protocol.md');
    const section66 = content.split(/###\s*6\.6/)[1]?.split(/##\s*ФАЗА 7/)[0] ?? '';
    expect(section66).toMatch(/Phase 0 APPROVED|APPROVED reviewer/i);
  });

  it('mentions skip fallback if sub-agent infrastructure unavailable', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/Phase 0.*skip|skipped.*Phase 0/i);
    expect(content).toMatch(/fallback|infrastructure unavailable|manual review/i);
  });
});

describe('M-Q2 T-2 workflow.md — Full Cycle includes Phase 0', () => {
  it('Full Cycle section mentions Phase 0', () => {
    const content = readRule('workflow.md');
    expect(content).toMatch(/Phase 0/);
  });

  it('Full Cycle mentions spec-ready label trigger', () => {
    const content = readRule('workflow.md');
    expect(content).toMatch(/spec-ready/);
  });

  it('Full Cycle mentions self-call reviewer via Agent sub-agent', () => {
    const content = readRule('workflow.md');
    expect(content).toMatch(/SELF-CALL|self-call/i);
    expect(content).toMatch(/Agent.*subagent|subagent_type/i);
  });

  it('Full Cycle mentions APPROVED → dev-ready label', () => {
    const content = readRule('workflow.md');
    expect(content).toMatch(/dev-ready/);
  });

  it('Full Cycle mentions Phase N (impl review) preserved', () => {
    const content = readRule('workflow.md');
    expect(content).toMatch(/Phase N/);
  });

  it('Full Cycle mentions Phase 0 closes TD-30 class', () => {
    const content = readRule('workflow.md');
    expect(content).toMatch(/TD-30/);
  });
});

describe('M-Q2 T-2 — existing architect-protocol structure preserved', () => {
  it('all 7 phases still present', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/##\s*ФАЗА 1:?\s*SCAN/);
    expect(content).toMatch(/##\s*ФАЗА 2:?\s*PLAN/);
    expect(content).toMatch(/##\s*ФАЗА 3:?\s*CONTRACTS/);
    expect(content).toMatch(/##\s*ФАЗА 4:?\s*SPECS/);
    expect(content).toMatch(/##\s*ФАЗА 5:?\s*ENVIRONMENT/);
    expect(content).toMatch(/##\s*ФАЗА 6:?\s*COMMIT/);
    expect(content).toMatch(/##\s*ФАЗА 7:?\s*POST-MILESTONE/);
  });

  it('§ 6.1..6.4 (existing setup steps) preserved', () => {
    const content = readRule('architect-protocol.md');
    expect(content).toMatch(/###\s*6\.1\s*[—\-]?\s*Создай feature branch/);
    expect(content).toMatch(/###\s*6\.2\s*[—\-]?\s*Identity check/);
    expect(content).toMatch(/###\s*6\.3\s*[—\-]?\s*Коммить ВСЁ/);
    expect(content).toMatch(/###\s*6\.4\s*[—\-]?\s*Проверь после/);
  });
});
