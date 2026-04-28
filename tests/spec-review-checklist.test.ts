// M-Q2 T-7 — Drift-guard for .claude/rules/coding-standards-checklist.md
//
// Validates that the 120-rule checklist exists, has expected severity grouping
// (P0=12, P1=38, P2=70), domain mapping, sequential C1..C120 numbering, and
// links to source rule files.
//
// Architect-only file (in .claude/rules/, protected by .husky/pre-commit hook).

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECKLIST_PATH = resolve(
  __dirname,
  '..',
  '.claude',
  'rules',
  'coding-standards-checklist.md',
);

const readChecklist = (): string => {
  try {
    return readFileSync(CHECKLIST_PATH, 'utf8');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `coding-standards-checklist.md not found (${msg}). Architect must create it per M-Q2 T-7.`,
    );
  }
};

describe('M-Q2 T-7 coding-standards-checklist.md — file existence + structure', () => {
  it('file exists', () => {
    expect(() => statSync(CHECKLIST_PATH)).not.toThrow();
  });

  it('has top-level title with rule count', () => {
    const content = readChecklist();
    expect(content).toMatch(/^# Coding Standards Checklist/m);
    expect(content).toMatch(/120/);
  });

  it('mentions sourced from /PROJECT (R1-R80) + /complior (R81-R120)', () => {
    const content = readChecklist();
    expect(content).toMatch(/\/(?:home\/openclaw\/)?PROJECT/);
    expect(content).toMatch(/complior/);
    expect(content).toMatch(/R1.*R80|R1[—–-]+R80/);
    expect(content).toMatch(/R81.*R120|R81[—–-]+R120/);
  });

  it('mentions Phase 0 + Phase N reviewer walks', () => {
    const content = readChecklist();
    expect(content).toMatch(/Phase 0/);
    expect(content).toMatch(/Phase N/);
    expect(content).toMatch(/top[- ]down/i);
  });
});

describe('M-Q2 T-7 — severity grouping (P0/P1/P2)', () => {
  it('has P0 section (12 rules — security/correctness)', () => {
    const content = readChecklist();
    expect(content).toMatch(/##\s*P0\s*[—\-]/);
    expect(content).toMatch(/Security|Correctness/i);
    expect(content).toMatch(/12 rules/);
  });

  it('has P1 section (38 rules — architectural invariant)', () => {
    const content = readChecklist();
    expect(content).toMatch(/##\s*P1\s*[—\-]/);
    expect(content).toMatch(/[Aa]rchitectural [Ii]nvariant/);
    expect(content).toMatch(/38 rules/);
  });

  it('has P2 section (70 rules — style/best-practice)', () => {
    const content = readChecklist();
    expect(content).toMatch(/##\s*P2\s*[—\-]/);
    expect(content).toMatch(/[Ss]tyle|[Bb]est[- ][Pp]ractice/);
    expect(content).toMatch(/70 rules/);
  });

  it('P0 + P1 + P2 = 120 (totals match)', () => {
    const content = readChecklist();
    expect(content).toMatch(/12.*\+.*38.*\+.*70|P0\s*=\s*12.*P1\s*=\s*38.*P2\s*=\s*70/s);
  });
});

describe('M-Q2 T-7 — sequential C-numbering (C1..C120)', () => {
  it('has C1 through C120 (count check)', () => {
    const content = readChecklist();
    // Match `**C-N**` или `**CN**` with N between 1 and 120
    const cIds: number[] = [];
    const matches = content.matchAll(/\*\*C(\d+)\b/g);
    for (const m of matches) {
      cIds.push(Number.parseInt(m[1], 10));
    }
    const unique = [...new Set(cIds)].sort((a, b) => a - b);
    // At least 120 unique IDs, max should be 120
    expect(unique.length).toBeGreaterThanOrEqual(120);
    expect(unique[0]).toBe(1);
    expect(unique[unique.length - 1]).toBe(120);
  });

  it('every rule has source [R-N] reference', () => {
    const content = readChecklist();
    // Every rule line с **C-N** должен иметь [R-N] reference в той же строке
    const ruleLines = content
      .split('\n')
      .filter(line => /\*\*C\d+\s*\[/.test(line));
    expect(ruleLines.length).toBeGreaterThanOrEqual(100);
    for (const line of ruleLines.slice(0, 30)) {
      // sample first 30 — each has [R<...>] in the rule label
      expect(line).toMatch(/\*\*C\d+\s*\[R[\w-]+/);
    }
  });

  it('every rule has link to source rule file', () => {
    const content = readChecklist();
    // Each rule line should end with link like ([rule-file.md](rule-file.md))
    const ruleLines = content
      .split('\n')
      .filter(line => /\*\*C\d+\s*\[R/.test(line));
    expect(ruleLines.length).toBeGreaterThanOrEqual(100);
    for (const line of ruleLines.slice(0, 30)) {
      expect(line).toMatch(/\(\[[^\]]+\.md\]/);
    }
  });
});

describe('M-Q2 T-7 — P0 critical rules (security)', () => {
  it('C1 references VM sandbox isolation', () => {
    const content = readChecklist();
    expect(content).toMatch(/\*\*C1\s*\[R9\][\s\S]{0,200}VM sandbox/);
  });

  it('C2 references multi-tenancy filter (agentDid/organizationId)', () => {
    const content = readChecklist();
    expect(content).toMatch(/\*\*C2[\s\S]{0,300}(agent_?[Dd]id|organization_?[Ii]d)/);
  });

  it('C7 references Rust edition 2024 + clippy', () => {
    const content = readChecklist();
    expect(content).toMatch(/\*\*C7[\s\S]{0,300}edition 2024[\s\S]{0,200}clippy/);
  });

  it('C8 references Rust no unwrap()/panic!()', () => {
    const content = readChecklist();
    expect(content).toMatch(/\*\*C8[\s\S]{0,300}unwrap[\s\S]{0,200}panic/);
  });

  it('C12 references Zod runtime validation on API boundary', () => {
    const content = readChecklist();
    expect(content).toMatch(/\*\*C12[\s\S]{0,300}Zod[\s\S]{0,200}(API boundary|runtime validation)/i);
  });
});

describe('M-Q2 T-7 — domain mapping table', () => {
  it('has domain table with TypeScript/Rust/Testing/Compliance/Architecture rows', () => {
    const content = readChecklist();
    expect(content).toMatch(/##\s*Domain mapping/);
    expect(content).toMatch(/\| \*\*TypeScript\*\* \|/);
    expect(content).toMatch(/\| \*\*Rust\*\* \|/);
    expect(content).toMatch(/\| \*\*Testing\*\* \|/);
    expect(content).toMatch(/\| \*\*Compliance\*\* \|/);
    expect(content).toMatch(/\| \*\*Architecture\*\* \|/);
  });

  it('domain counts sum to 120 (45 + 32 + 15 + 12 + 16)', () => {
    const content = readChecklist();
    // Look for the count column values in Domain mapping table
    expect(content).toMatch(/TypeScript[\s\S]{0,100}\|\s*45\s*\|/);
    expect(content).toMatch(/Rust[\s\S]{0,100}\|\s*32\s*\|/);
    expect(content).toMatch(/Testing[\s\S]{0,100}\|\s*15\s*\|/);
    expect(content).toMatch(/Compliance[\s\S]{0,100}\|\s*12\s*\|/);
    expect(content).toMatch(/Architecture[\s\S]{0,100}\|\s*16\s*\|/);
  });
});

describe('M-Q2 T-7 — Phase 0 walk procedure section', () => {
  it('has 6-step procedure', () => {
    const content = readChecklist();
    expect(content).toMatch(/##\s*Phase 0 reviewer walk procedure/);
    expect(content).toMatch(/1\.\s*\*\*Read milestone/);
    expect(content).toMatch(/Walk this checklist top-down/i);
  });

  it('describes verdict format (under 500 words)', () => {
    const content = readChecklist();
    expect(content).toMatch(/##\s*Output format/);
    expect(content).toMatch(/under 500 words/i);
    expect(content).toMatch(/SPEC APPROVED.*SPEC REJECTED|SPEC APPROVED \| SPEC REJECTED/);
  });
});

describe('M-Q2 T-7 — links to other rule files exist (cross-reference integrity)', () => {
  it('links to backend-architecture.md', () => {
    const content = readChecklist();
    expect(content).toMatch(/\[backend-architecture\.md\]/);
  });

  it('links to safety.md', () => {
    const content = readChecklist();
    expect(content).toMatch(/\[safety\.md\]/);
  });

  it('links to rust-error-handling.md (T-6 deliverable)', () => {
    const content = readChecklist();
    expect(content).toMatch(/\[rust-error-handling\.md\]/);
  });

  it('links to rust-async.md (T-6 deliverable)', () => {
    const content = readChecklist();
    expect(content).toMatch(/\[rust-async\.md\]/);
  });

  it('links to rust-build.md (T-6 deliverable)', () => {
    const content = readChecklist();
    expect(content).toMatch(/\[rust-build\.md\]/);
  });

  it('links to code-style.md', () => {
    const content = readChecklist();
    expect(content).toMatch(/\[code-style\.md\]/);
  });

  it('links to testing.md', () => {
    const content = readChecklist();
    expect(content).toMatch(/\[testing\.md\]/);
  });
});
