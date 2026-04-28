/**
 * M-Q8 — Dev startup protocol drift-guard.
 *
 * Goal: dev impl sessions auto-load `dev-startup.md` (terse, no tech-debt/state reads),
 * not the legacy `startup-protocol.md` which forced bloated doc reads.
 *
 * - `dev-startup.md` auto-loads on dev paths only (apps/**, products/**, packages/**, platform/**).
 *   Does NOT auto-load on docs/** so it doesn't trigger when devs open a sprint.
 * - `startup-protocol.md` becomes a deprecated stub with `globs: []` — no longer auto-loads.
 *
 * Architect/reviewer protocols unchanged (out of M-Q8 scope per user direction).
 *
 * If any of these invariants regress, this test goes RED.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function readRule(name: string): string {
  return readFileSync(resolve(ROOT, '.claude/rules', name), 'utf8');
}

function getFrontmatterField(content: string, field: string): string | null {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const re = new RegExp(`^${field}:\\s*(.*)$`, 'm');
  const m = fm[1].match(re);
  return m ? m[1].trim() : null;
}

describe('M-Q8 — Dev startup protocol', () => {
  describe('dev-startup.md', () => {
    it('exists and is non-empty', () => {
      const content = readRule('dev-startup.md');
      expect(content.length).toBeGreaterThan(100);
    });

    it('size ≤ 2500 chars (terse — 5 steps + Three Hard Rules + escalation template, no rationale dump)', () => {
      // Bumped from 1500 in M-Q10: dev-startup.md absorbs Three Hard Rules + escalation
      // template now that scope-guard.md is manual-load only. Devs need both at impl time.
      const content = readRule('dev-startup.md');
      expect(content.length).toBeLessThanOrEqual(2500);
    });

    it('frontmatter globs match dev paths (apps/**, products/**, packages/**, platform/**)', () => {
      const content = readRule('dev-startup.md');
      const globs = getFrontmatterField(content, 'globs');
      expect(globs).not.toBeNull();
      expect(globs).toMatch(/apps\/\*\*/);
      expect(globs).toMatch(/products\/\*\*/);
      expect(globs).toMatch(/packages\/\*\*/);
      expect(globs).toMatch(/platform\/\*\*/);
    });

    it('frontmatter globs do NOT include docs/** (so opening a sprint does NOT auto-load this)', () => {
      const content = readRule('dev-startup.md');
      const globs = getFrontmatterField(content, 'globs');
      expect(globs).not.toMatch(/docs\/\*\*/);
    });

    it('explicitly forbids reading tech-debt.md', () => {
      const content = readRule('dev-startup.md');
      expect(content).toMatch(/tech-debt\.md/);
      expect(content.toLowerCase()).toMatch(/не читай|forbidden|do not|never read/);
    });

    it('explicitly forbids reading project-state.md', () => {
      const content = readRule('dev-startup.md');
      expect(content).toMatch(/project-state\.md/);
    });

    it('explicitly forbids reading docs/feature-areas/ whole', () => {
      const content = readRule('dev-startup.md');
      expect(content).toMatch(/feature-areas/);
    });

    it('describes 5-step workflow (worktree, identity, read-only-assigned, impl, commit)', () => {
      const content = readRule('dev-startup.md');
      const lower = content.toLowerCase();
      expect(lower).toMatch(/worktree/);
      expect(lower).toMatch(/identit/);
      expect(lower).toMatch(/test|spec|red/);
      expect(lower).toMatch(/commit/);
    });

    it('reminds dev: NO push, NO gh pr (architect handles)', () => {
      const content = readRule('dev-startup.md');
      expect(content.toLowerCase()).toMatch(/no push|не push|gh pr/);
    });
  });

  describe('startup-protocol.md (deprecated)', () => {
    it('frontmatter globs is empty array (no longer auto-loads)', () => {
      const content = readRule('startup-protocol.md');
      const globs = getFrontmatterField(content, 'globs');
      expect(globs).toBe('[]');
    });

    it('content is a short redirect stub (≤ 800 bytes)', () => {
      const content = readRule('startup-protocol.md');
      expect(content.length).toBeLessThanOrEqual(800);
    });

    it('redirects devs to dev-startup.md', () => {
      const content = readRule('startup-protocol.md');
      expect(content).toMatch(/dev-startup\.md/);
    });
  });
});
