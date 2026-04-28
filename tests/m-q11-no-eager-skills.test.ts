/**
 * M-Q11 — remove `skills:` frontmatter field from 4 dev agent files.
 *
 * Root cause of dev session early termination on MiniMax-M2.7 CLI:
 * the `skills:` frontmatter field eagerly preloads each declared SKILL.md
 * into the system prompt at session start. Per-agent eager-load was 30–37 KB
 * BEFORE any user work begins — system prompt fills ~80%+ of MiniMax-M2.7's
 * effective context window immediately on `/clear`.
 *
 * History:
 *   1. M-Q11 (PR #59) removed skills, drift-guard pinned «NO skills» invariant.
 *   2. PR #64 reversed M-Q11 on hypothesis «Claude Code update fixes overflow».
 *      Hypothesis was WRONG — registry-dev session 2026-04-28 hit autocompact
 *      during file-read phase BEFORE writing first line of impl.
 *   3. This PR reverts PR #64. Skills stay invokable on-demand via Skill tool;
 *      they just don't preload eagerly.
 *
 * PROJECT donor (/home/openclaw/PROJECT/.claude/agents/{backend,frontend}-dev.md)
 * works fine on MiniMax-M2.7 specifically because it does NOT declare skills.
 *
 * DO NOT reverse this invariant again without first proving on a live
 * MiniMax-M2.7 session that the dev can complete a non-trivial task without
 * autocompact triggering during setup phase.
 *
 * Drift-guard invariant: NO `skills:` field in any of the 4 dev agent
 * frontmatters. Architect/reviewer agents may still declare skills if they
 * benefit from eager load (their sessions are less context-bound — they read
 * docs + tests, not large impl files).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

function hasFrontmatterField(content: string, field: string): boolean {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return false;
  const re = new RegExp(`^${field}:`, 'm');
  return re.test(fm[1]);
}

describe('M-Q11 — dev agent frontmatters do NOT declare skills (no eager preload)', () => {
  const agents = ['backend-dev', 'frontend-dev', 'icp-dev', 'registry-dev'];

  for (const agent of agents) {
    it(`${agent}.md frontmatter has NO skills: field`, () => {
      const content = readFile(`.claude/agents/${agent}.md`);
      expect(hasFrontmatterField(content, 'skills')).toBe(false);
    });

    it(`${agent}.md still has required core fields (name, description, isolation)`, () => {
      const content = readFile(`.claude/agents/${agent}.md`);
      expect(hasFrontmatterField(content, 'name')).toBe(true);
      expect(hasFrontmatterField(content, 'description')).toBe(true);
      expect(hasFrontmatterField(content, 'isolation')).toBe(true);
    });
  }
});
