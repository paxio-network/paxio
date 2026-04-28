// M-Q2 T-5 — Drift-guard for 13 TypeScript gap-rules ported from /PROJECT donor.
//
// Validates that .claude/rules/code-style.md + architecture.md contain
// rule sections for R29, R30, R32, R34, R35, R36, R39, R40, R43, R44,
// R46, R47, R75 — additive only (existing rules не должны быть удалены).
//
// Architect-only files (in .claude/rules/, protected by .husky/pre-commit hook).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rulePath = (name: string): string =>
  resolve(__dirname, '..', '.claude', 'rules', name);

const readRule = (name: string): string =>
  readFileSync(rulePath(name), 'utf8');

describe('M-Q2 T-5 .claude/rules/code-style.md — TS gap-rules ported', () => {
  it('R29 [C57]: NO for...in — Object.keys + for...of', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/R29/);
    expect(content).toMatch(/for\.\.\.in/);
    expect(content).toMatch(/Object\.keys/);
    expect(content).toMatch(/for\.\.\.of/);
  });

  it('R30 [C58]: NO delete obj.prop — spread exclusion', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/R30/);
    expect(content).toMatch(/delete\s+\w+\./);
    expect(content).toMatch(/hidden class/i);
  });

  it('R32 [C59]: NO RxJS / generators / Deferred / Async.js', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/R32/);
    expect(content).toMatch(/RxJS/);
    expect(content).toMatch(/Deferred/);
    expect(content).toMatch(/async\/await/);
  });

  it('R34 [C61]: NO forEach с outer-scope mutation', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/R34/);
    expect(content).toMatch(/forEach/);
    expect(content).toMatch(/\.reduce|\.map/);
  });

  it('R35 [C62]: Return objects (named fields), not arrays', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/R35/);
    expect(content).toMatch(/named fields/i);
  });

  it('R36 [C63]: Consistent return shape — same fields all branches', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/R36/);
    expect(content).toMatch(/discriminated union/i);
  });

  it('R39 [C66]: Max file length 300 lines', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/R39/);
    expect(content).toMatch(/300 lines/);
  });

  it('R40 [C67]: Monomorphic objects — V8 hidden classes stable', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/R40/);
    expect(content).toMatch(/[Mm]onomorphic/);
    expect(content).toMatch(/hidden class/i);
  });

  it('R47 [C68]: Law of Demeter — no a.b.c.d.e()', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/R47/);
    expect(content).toMatch(/Law of Demeter/i);
  });

  it('R75 [C76]: Discriminated unions > optional fields', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/R75/);
    expect(content).toMatch(/[Dd]iscriminated union/);
  });
});

describe('M-Q2 T-5 .claude/rules/architecture.md — Architecture gap-rules ported', () => {
  it('R43 [C77]: CQS — Command Query Separation', () => {
    const content = readRule('architecture.md');
    expect(content).toMatch(/R43/);
    expect(content).toMatch(/CQS|Command Query Separation/);
  });

  it('R44 [C78]: Domain events — anemic objects, serializable', () => {
    const content = readRule('architecture.md');
    expect(content).toMatch(/R44/);
    expect(content).toMatch(/[Dd]omain event/);
    expect(content).toMatch(/serializable/i);
  });

  it('R46 [C79]: Idempotency через GUID для job queue / retry-prone ops', () => {
    const content = readRule('architecture.md');
    expect(content).toMatch(/R46/);
    expect(content).toMatch(/[Ii]dempotency/);
    expect(content).toMatch(/Idempotency-Key|idempotency_?[Kk]ey|idempotencyKey/);
  });
});

describe('M-Q2 T-5 — additive only invariant (existing rules preserved)', () => {
  it('code-style.md still has Naming section (existing rule)', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/##\s*General/);
    expect(content).toMatch(/snake_case|kebab-case|PascalCase|camelCase/);
  });

  it('code-style.md still has Error Handling section (existing rule)', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/Error Handling/);
    expect(content).toMatch(/Result<|NotFoundError/);
  });

  it('code-style.md still has Data Externalization section (existing rule)', () => {
    const content = readRule('code-style.md');
    expect(content).toMatch(/Data Externalization/);
    expect(content).toMatch(/PROTOCOL_FEES|app\/data/);
  });

  it('architecture.md still has Layer Separation diagram (existing rule)', () => {
    const content = readRule('architecture.md');
    expect(content).toMatch(/Layer Separation/);
  });

  it('architecture.md still has Dependency Rules section (existing rule)', () => {
    const content = readRule('architecture.md');
    expect(content).toMatch(/Dependency Rules/);
  });

  it('architecture.md still has Three Technical Levels diagram (existing rule)', () => {
    const content = readRule('architecture.md');
    expect(content).toMatch(/Three Technical Levels|INTERACTION LAYER/);
  });
});
