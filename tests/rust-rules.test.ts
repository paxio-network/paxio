// M-Q2 T-6 — Drift-guard for 3 NEW Rust rule files.
//
// Validates that .claude/rules/rust-{error-handling,async,build}.md exist
// and contain key rule terms. Catches accidental deletion / regression of
// Rust standards documentation.
//
// Architect-only files (in .claude/rules/, protected by .husky/pre-commit hook).

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const rulePath = (name: string): string =>
  resolve(__dirname, '..', '.claude', 'rules', name);

const readRule = (name: string): string => {
  try {
    return readFileSync(rulePath(name), 'utf8');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `.claude/rules/${name} not found (${msg}). Architect must create it per M-Q2 T-6.`,
    );
  }
};

describe('M-Q2 T-6 .claude/rules/rust-error-handling.md', () => {
  it('file exists', () => {
    expect(() => statSync(rulePath('rust-error-handling.md'))).not.toThrow();
  });

  it('mentions thiserror as primary error mechanism', () => {
    const content = readRule('rust-error-handling.md');
    expect(content).toMatch(/thiserror/i);
    expect(content).toMatch(/derive\(.*[Tt]hiserror::[Ee]rror/);
  });

  it('mentions anyhow restriction (only in main, not libraries)', () => {
    const content = readRule('rust-error-handling.md');
    expect(content).toMatch(/anyhow/i);
    expect(content).toMatch(/main\(\)/);
  });

  it('forbids unwrap/panic in production paths', () => {
    const content = readRule('rust-error-handling.md');
    expect(content).toMatch(/unwrap\(\)/);
    expect(content).toMatch(/panic!\(/);
  });

  it('mentions expect with rationale comment requirement', () => {
    const content = readRule('rust-error-handling.md');
    expect(content).toMatch(/expect\(/);
  });

  it('mentions #[from] derive for auto error propagation', () => {
    const content = readRule('rust-error-handling.md');
    expect(content).toMatch(/#\[from\]/);
  });

  it('mentions color_eyre and wrap_err for context-rich errors', () => {
    const content = readRule('rust-error-handling.md');
    expect(content).toMatch(/color_eyre/);
    expect(content).toMatch(/wrap_err/);
  });

  it('mentions deny_unknown_fields and TryFrom validation pattern', () => {
    const content = readRule('rust-error-handling.md');
    expect(content).toMatch(/deny_unknown_fields/);
    expect(content).toMatch(/TryFrom/);
  });

  it('has Phase 0 reviewer checklist section', () => {
    const content = readRule('rust-error-handling.md');
    expect(content).toMatch(/Quick checklist/i);
  });
});

describe('M-Q2 T-6 .claude/rules/rust-async.md', () => {
  it('file exists', () => {
    expect(() => statSync(rulePath('rust-async.md'))).not.toThrow();
  });

  it('mentions tokio::fs not std::fs', () => {
    const content = readRule('rust-async.md');
    expect(content).toMatch(/tokio::fs/);
    expect(content).toMatch(/std::fs/);
  });

  it('mentions lock duration minimization across .await', () => {
    const content = readRule('rust-async.md');
    expect(content).toMatch(/\.await/);
    expect(content).toMatch(/lock/i);
  });

  it('mentions Arc<RwLock<T>> for shared async state', () => {
    const content = readRule('rust-async.md');
    expect(content).toMatch(/Arc<RwLock/);
  });

  it('forbids Rc<RefCell<T>> in async context', () => {
    const content = readRule('rust-async.md');
    expect(content).toMatch(/Rc<RefCell/);
  });

  it('mentions tokio::join! / try_join! / buffer_unordered for concurrency', () => {
    const content = readRule('rust-async.md');
    expect(content).toMatch(/tokio::(try_)?join!|join!/);
    expect(content).toMatch(/buffer_unordered|try_join!/);
  });

  it('mentions iterator chains without intermediate collect', () => {
    const content = readRule('rust-async.md');
    expect(content).toMatch(/collect/);
    expect(content).toMatch(/iter\(\)/);
  });

  it('mentions String type guidance: &str < String < Cow', () => {
    const content = readRule('rust-async.md');
    expect(content).toMatch(/&str/);
    expect(content).toMatch(/String/);
    expect(content).toMatch(/Cow/);
  });

  it('mentions newtype pattern for domain types', () => {
    const content = readRule('rust-async.md');
    expect(content).toMatch(/newtype/i);
    expect(content).toMatch(/struct\s+\w+\(/);
  });
});

describe('M-Q2 T-6 .claude/rules/rust-build.md', () => {
  it('file exists', () => {
    expect(() => statSync(rulePath('rust-build.md'))).not.toThrow();
  });

  it('mentions edition 2024', () => {
    const content = readRule('rust-build.md');
    expect(content).toMatch(/edition\s*=\s*"2024"/);
  });

  it('mentions clippy pedantic + nursery levels', () => {
    const content = readRule('rust-build.md');
    expect(content).toMatch(/pedantic/);
    expect(content).toMatch(/nursery/);
  });

  it('mentions release profile: lto, codegen-units=1, strip, panic=abort', () => {
    const content = readRule('rust-build.md');
    expect(content).toMatch(/lto\s*=\s*true/);
    expect(content).toMatch(/codegen-units\s*=\s*1/);
    expect(content).toMatch(/strip\s*=\s*true/);
    expect(content).toMatch(/panic\s*=\s*"abort"/);
  });

  it('mentions workspace structure with [workspace.dependencies]', () => {
    const content = readRule('rust-build.md');
    expect(content).toMatch(/\[workspace\.dependencies\]/);
    expect(content).toMatch(/workspace\s*=\s*true/);
  });

  it('mentions pub(crate) visibility convention', () => {
    const content = readRule('rust-build.md');
    expect(content).toMatch(/pub\(crate\)/);
  });

  it('mentions feature flags pattern (default = empty)', () => {
    const content = readRule('rust-build.md');
    expect(content).toMatch(/\[features\]/);
    expect(content).toMatch(/default\s*=\s*\[\]/);
  });

  it('mentions cargo-deny for supply chain security', () => {
    const content = readRule('rust-build.md');
    expect(content).toMatch(/cargo[- ]deny/i);
  });

  it('mentions zero warnings clippy CI gate', () => {
    const content = readRule('rust-build.md');
    expect(content).toMatch(/-D\s+warnings/);
  });
});

describe('M-Q2 T-6 cross-file consistency', () => {
  it('all 3 Rust rule files reference engineering-principles.md or each other', () => {
    const errHandling = readRule('rust-error-handling.md');
    const asyncRule = readRule('rust-async.md');
    const buildRule = readRule('rust-build.md');

    // each file должен иметь "See also" section
    expect(errHandling).toMatch(/See also/i);
    expect(asyncRule).toMatch(/See also/i);
    expect(buildRule).toMatch(/See also/i);
  });

  it('all 3 files reference coding-standards-checklist.md', () => {
    expect(readRule('rust-error-handling.md')).toMatch(/coding-standards-checklist\.md/);
    expect(readRule('rust-async.md')).toMatch(/coding-standards-checklist\.md/);
    expect(readRule('rust-build.md')).toMatch(/coding-standards-checklist\.md/);
  });
});
