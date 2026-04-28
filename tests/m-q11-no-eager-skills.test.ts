/**
 * Per-role skills allowlist — positive drift-guard for 4 dev agents.
 *
 * History:
 *   1. M-Q11 (PR #59) removed `skills:` frontmatter from 4 dev agents
 *      because eager skill preload was overflowing MiniMax-M2.7 context.
 *      Drift-guard pinned the «NO skills» invariant.
 *   2. After Claude Code update (Apr 2026) skill listing handles efficiently;
 *      restore-dev-skills PR re-added per-role skill sets.
 *
 * This file kept the same name to preserve git history but inverts the
 * invariant: positive assertion that each agent's skills array MATCHES
 * the expected per-role allowlist. Future drift (skill added without
 * architect intent, skill removed accidentally) gets caught.
 *
 * To change skills: architect updates `EXPECTED_SKILLS` here AND the
 * agent's `.md` frontmatter in the same PR.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

function extractSkillsField(content: string): string[] | null {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const skillsLine = fm[1].match(/^skills:\s*\[(.*)\]\s*$/m);
  if (!skillsLine) return null;
  return skillsLine[1]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function hasFrontmatterField(content: string, field: string): boolean {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return false;
  const re = new RegExp(`^${field}:`, 'm');
  return re.test(fm[1]);
}

const EXPECTED_SKILLS: Record<string, readonly string[]> = {
  'backend-dev': [
    'typescript-patterns',
    'fastify-best-practices',
    'error-handling',
    'zod-validation',
    'sql-best-practices',
    'redis-cache',
    'metarhia-principles',
  ],
  'icp-dev': [
    'icp-rust',
    'rust-canister',
    'rust-error-handling',
    'rust-gof',
    'rust-data-structures',
    'icp-threshold-ecdsa',
    'bitcoin-icp',
    'chain-fusion',
    'complior-security',
  ],
  'registry-dev': [
    'typescript-patterns',
    'registry-patterns',
    'error-handling',
    'zod-validation',
    'sql-best-practices',
    'metarhia-principles',
    'icp-rust',
    'rust-canister',
    'rust-error-handling',
  ],
  'frontend-dev': [
    'typescript-patterns',
    'react-patterns',
    'nextjs-15',
    'tailwindcss-4',
    'radix-ui',
    'framer-motion',
    'error-handling',
    'zod-validation',
  ],
};

describe('Per-role skills allowlist — 4 dev agents', () => {
  for (const [agent, expected] of Object.entries(EXPECTED_SKILLS)) {
    it(`${agent}.md frontmatter declares skills array`, () => {
      const content = readFile(`.claude/agents/${agent}.md`);
      const skills = extractSkillsField(content);
      expect(skills).not.toBeNull();
      expect(Array.isArray(skills)).toBe(true);
    });

    it(`${agent}.md skills match expected allowlist (set equality)`, () => {
      const content = readFile(`.claude/agents/${agent}.md`);
      const actual = extractSkillsField(content) ?? [];
      expect([...actual].sort()).toStrictEqual([...expected].sort());
    });

    it(`${agent}.md still has required core fields (name, description, isolation)`, () => {
      const content = readFile(`.claude/agents/${agent}.md`);
      expect(hasFrontmatterField(content, 'name')).toBe(true);
      expect(hasFrontmatterField(content, 'description')).toBe(true);
      expect(hasFrontmatterField(content, 'isolation')).toBe(true);
    });
  }
});
