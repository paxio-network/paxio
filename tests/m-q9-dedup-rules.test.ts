/**
 * M-Q9 — safety.md / testing.md moved to manual-load + dev startup protocols use targeted grep.
 *
 * Goal: dev sessions no longer auto-load safety.md/testing.md (content preserved, just not
 * auto-loaded on dev paths). 4 dev agent files use `grep '🔴 OPEN.*<role>'` for tech-debt
 * step instead of `Read tech-debt.md` whole.
 *
 * Files preserved (NOT deleted, just frontmatter or surgical edit):
 *   .claude/rules/safety.md
 *   .claude/rules/testing.md
 *   .claude/agents/{backend,frontend,icp,registry}-dev.md
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

function getFrontmatterField(content: string, field: string): string | null {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const re = new RegExp(`^${field}:\\s*(.*)$`, 'm');
  const m = fm[1].match(re);
  return m ? m[1].trim() : null;
}

describe('M-Q9 — safety.md + testing.md manual-load', () => {
  it('safety.md frontmatter globs: []', () => {
    const content = readFile('.claude/rules/safety.md');
    expect(getFrontmatterField(content, 'globs')).toBe('[]');
  });

  it('testing.md frontmatter globs: []', () => {
    const content = readFile('.claude/rules/testing.md');
    expect(getFrontmatterField(content, 'globs')).toBe('[]');
  });

  it('safety.md content preserved (≥ 5 KB — full reference, not stub)', () => {
    const content = readFile('.claude/rules/safety.md');
    expect(content.length).toBeGreaterThanOrEqual(5000);
  });

  it('testing.md content preserved (≥ 5 KB — full reference, not stub)', () => {
    const content = readFile('.claude/rules/testing.md');
    expect(content.length).toBeGreaterThanOrEqual(5000);
  });
});

describe('M-Q9 — dev agent startup protocols use targeted grep', () => {
  const agents = ['backend-dev', 'frontend-dev', 'icp-dev', 'registry-dev'];

  for (const agent of agents) {
    describe(`${agent}.md`, () => {
      it(`step 2 uses targeted grep '🔴 OPEN.*${agent}' for tech-debt`, () => {
        const content = readFile(`.claude/agents/${agent}.md`);
        expect(content).toMatch(new RegExp(`grep[^\\n]*🔴 OPEN[^\\n]*${agent}[^\\n]*tech-debt`));
      });

      it('does NOT have a "Read tech-debt.md" without grep filter (would pull paragraph rows)', () => {
        const content = readFile(`.claude/agents/${agent}.md`);
        // Match pattern: "Read tech-debt.md" or "Read `docs/tech-debt.md`" alone (no grep)
        // The original was: `Read tech-debt.md — есть ли 🔴 OPEN`
        // After fix: `grep '🔴 OPEN.*<role>' docs/tech-debt.md`
        // Must NOT match: `Read \`tech-debt.md\`` or `Read tech-debt.md` (alone in step)
        const badPattern = /^\d+\.\s+Read\s+`?(?:docs\/)?tech-debt\.md`?\s+—/m;
        expect(content).not.toMatch(badPattern);
      });
    });
  }
});
