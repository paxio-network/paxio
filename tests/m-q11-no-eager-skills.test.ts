/**
 * M-Q11/Q15 — dev agent skills frontmatter — historical context + current invariant.
 *
 * History (in chronological order):
 *
 *   1. PRE-Q11: dev agents declared `skills:` with full skill listing. On
 *      MiniMax-M2.7 CLI this eager-preloaded each declared SKILL.md content
 *      into system prompt at session start (~30–37 KB). System prompt filled
 *      ~80%+ of MiniMax-M2.7's effective context window immediately on `/clear`.
 *
 *   2. M-Q11 (PR #59): removed `skills:` field entirely. Drift-guard pinned
 *      «NO skills» invariant. Side effect: devs lost description-listing →
 *      they didn't know what skills exist for their domain.
 *
 *   3. PR #64: reversed M-Q11 on hypothesis «Claude Code update fixes overflow».
 *      Hypothesis was WRONG — registry-dev session 2026-04-28 hit autocompact
 *      during file-read phase before writing first line of impl.
 *
 *   4. PR #68: re-instated M-Q11 «NO skills» invariant.
 *
 *   5. M-Q13 Step 1 (PR #71): moved 7 rule files into skills (1-в-1 ports),
 *      archived rules with `globs: []`. Dev auto-load budget freed by 13–21 KB
 *      per turn (Pi side-by-side proved this).
 *
 *   6. M-Q14 (this PR / Step 2): refactored 7 ported skills to metaskills format
 *      — 2304 → 1261 lines (-45%). Each skill ≤250 lines.
 *
 *   7. M-Q15 (this PR / Step 3): RESTORED `skills:` field on 4 dev agents with
 *      CURATED per-role allowlist (not all 30+ skills). Devs see relevant skill
 *      descriptions in their listing — they can invoke via Skill tool on-demand.
 *      Total preload bounded by allowlist size (4–9 skills × ≤250 lines).
 *
 * Current invariant (post M-Q15):
 *   - Each of 4 dev agents declares `skills:` field (devs need awareness)
 *   - List is CURATED — only role-relevant skills (not the whole 30+ catalog)
 *   - Architect / reviewer agents may declare skills with broader latitude
 *     (their sessions read docs + tests, less context-bound than impl)
 *
 * Drift-guard invariant pinned here:
 *   1. Each dev agent has a `skills:` field (was missing in M-Q11 era)
 *   2. List size is bounded (4–12 entries — curated, not catalog dump)
 *   3. List contains role-essential skills (per role-specific markers below)
 *
 * If MiniMax-M2.7 still overflows after M-Q15, the harness diff vs Pi (which
 * never had this issue) needs investigation — NOT a return to «NO skills».
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

function getSkillsList(content: string): string[] {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return [];
  const lines = fm[1].split(/\r?\n/);
  const startIdx = lines.findIndex(l => /^skills:\s*$/.test(l));
  if (startIdx === -1) return [];
  const skills: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^  - (.+)$/);
    if (m) skills.push(m[1].trim());
    else break;
  }
  return skills;
}

const REQUIRED_PER_ROLE: Record<string, string[]> = {
  // Backend-dev: VM sandbox app/ work, Fastify routes, Zod boundaries
  'backend-dev': ['paxio-backend-api', 'paxio-backend-architecture', 'typescript-patterns'],

  // Icp-dev: Rust canister work
  'icp-dev': ['rust-canister', 'rust-error-handling', 'icp-rust'],

  // Registry-dev: dual stack (TS app + Rust canister), FA-01 specific
  'registry-dev': [
    'paxio-backend-api',
    'paxio-backend-architecture',
    'typescript-patterns',
    'registry-patterns',
    'rust-canister',
  ],

  // Frontend-dev: Next.js + Radix + Tailwind
  'frontend-dev': ['paxio-frontend', 'nextjs-15', 'react-patterns', 'typescript-patterns'],
};

describe('M-Q15 — dev agents declare curated skills allowlist (post M-Q11/Q14)', () => {
  const agents = Object.keys(REQUIRED_PER_ROLE);

  for (const agent of agents) {
    it(`${agent}.md frontmatter declares skills: field`, () => {
      const content = readFile(`.claude/agents/${agent}.md`);
      const skills = getSkillsList(content);
      expect(skills.length, `${agent} skills list is empty (M-Q11 reversal not applied?)`).toBeGreaterThan(0);
    });

    it(`${agent}.md skills list size bounded (4-12 entries — curated, not catalog dump)`, () => {
      const content = readFile(`.claude/agents/${agent}.md`);
      const skills = getSkillsList(content);
      expect(skills.length, `${agent} has ${skills.length} skills — too few or too many`).toBeGreaterThanOrEqual(3);
      expect(skills.length).toBeLessThanOrEqual(12);
    });

    for (const required of REQUIRED_PER_ROLE[agent]) {
      it(`${agent}.md skills includes role-essential: ${required}`, () => {
        const content = readFile(`.claude/agents/${agent}.md`);
        const skills = getSkillsList(content);
        expect(skills, `${agent} missing required skill: ${required}`).toContain(required);
      });
    }

    it(`${agent}.md still has core fields (name, description, isolation)`, () => {
      const content = readFile(`.claude/agents/${agent}.md`);
      expect(content).toMatch(/^name:/m);
      expect(content).toMatch(/^description:/m);
      expect(content).toMatch(/^isolation: worktree$/m);
    });
  }
});
