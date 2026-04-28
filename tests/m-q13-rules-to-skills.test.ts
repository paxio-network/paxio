/**
 * M-Q13 — rule files migrated to skills, auto-load disabled.
 *
 * Context: claude-code auto-loaded ~22-31 KB of rule content per turn for dev
 * agents (CLAUDE.md + 3-5 matching .claude/rules/*.md files). Pi (alternate
 * agent harness) loads ~10 KB for the same task. Difference = enough to
 * overflow MiniMax-M2.7 before first impl line.
 *
 * Solution (Step 1): port rule content into skills (description-matched,
 * on-demand). Disable rule auto-load via `globs: []`. Files preserved as
 * archive — git history intact, but never auto-injected into context.
 *
 * Step 2 (separate PR) will refactor skills to metaskills format (compact,
 * examples, cross-links).
 *
 * Invariants pinned here:
 *   1. Only dev-startup.md has non-empty globs (the entry-point for devs).
 *   2. Each ported rule has banner pointing to its skill counterpart.
 *   3. Each new/extended skill exists with proper frontmatter.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');
const RULES_DIR = resolve(ROOT, '.claude/rules');
const SKILLS_DIR = resolve(ROOT, '.claude/skills');

function readRule(name: string): string {
  return readFileSync(resolve(RULES_DIR, name), 'utf8');
}
function readSkill(name: string): string {
  return readFileSync(resolve(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
}
function getFrontmatterField(content: string, field: string): string | null {
  const fm = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) return null;
  const m = fm[1].match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return m ? m[1] : null;
}

describe('M-Q13 — only dev-startup.md auto-loads, all other rules archived', () => {
  it('only dev-startup.md has non-empty globs frontmatter', () => {
    const ruleFiles = readdirSync(RULES_DIR).filter(f => f.endsWith('.md'));
    const withBroadGlobs: string[] = [];
    for (const file of ruleFiles) {
      const content = readRule(file);
      const globs = getFrontmatterField(content, 'globs') ?? '';
      // Empty array `[]` or no frontmatter = OK. Anything containing a path-like
      // pattern = auto-load enabled, must be ONLY dev-startup.md.
      if (/[a-zA-Z]/.test(globs) && globs.trim() !== '[]') {
        if (file !== 'dev-startup.md') {
          withBroadGlobs.push(file);
        }
      }
    }
    expect(withBroadGlobs, `These rules still auto-load (should be globs: []): ${withBroadGlobs.join(', ')}`).toEqual([]);
  });

  it('dev-startup.md still has non-empty globs (it is the dev entry-point)', () => {
    const content = readRule('dev-startup.md');
    const globs = getFrontmatterField(content, 'globs') ?? '';
    expect(globs).toMatch(/apps/);
    expect(globs).toMatch(/products/);
  });
});

describe('M-Q13 — archived rules carry banner pointing to skill', () => {
  const archived: Array<[string, string]> = [
    ['backend-api-patterns.md', 'paxio-backend-api'],
    ['backend-architecture.md', 'paxio-backend-architecture'],
    ['backend-code-style.md', 'typescript-patterns'],
    ['frontend-rules.md', 'paxio-frontend'],
    ['rust-async.md', 'rust-canister'],
    ['rust-build.md', 'rust-build'],
    ['rust-error-handling.md', 'rust-error-handling'],
  ];

  for (const [rule, skill] of archived) {
    it(`${rule} banner mentions skill \`${skill}\``, () => {
      const content = readRule(rule);
      expect(content).toMatch(/ARCHIVED in M-Q13/);
      expect(content).toContain(`.claude/skills/${skill}/SKILL.md`);
    });

    it(`${rule} has globs: [] (auto-load disabled)`, () => {
      const content = readRule(rule);
      const globs = getFrontmatterField(content, 'globs') ?? '';
      expect(globs.trim()).toBe('[]');
    });
  }
});

describe('M-Q13 — new + extended skills exist with frontmatter', () => {
  const newSkills = ['paxio-backend-api', 'paxio-backend-architecture', 'paxio-frontend', 'rust-build'];
  const extendedSkills = ['typescript-patterns', 'rust-canister', 'rust-error-handling'];

  for (const skill of newSkills) {
    it(`new skill \`${skill}\` exists with name + description frontmatter`, () => {
      const path = join(SKILLS_DIR, skill, 'SKILL.md');
      expect(existsSync(path), `Missing: ${path}`).toBe(true);
      const content = readSkill(skill);
      const name = getFrontmatterField(content, 'name');
      expect(name).toBe(skill);
      // description may span multiple lines via YAML `>` folded scalar
      expect(content).toMatch(/^description:/m);
    });
  }

  for (const skill of extendedSkills) {
    it(`extended skill \`${skill}\` includes Paxio Extensions section`, () => {
      const content = readSkill(skill);
      expect(content).toMatch(/Paxio Extensions|Paxio Async Patterns|Paxio Backend Code Style/);
      expect(content).toMatch(/ported from/);
    });
  }
});
