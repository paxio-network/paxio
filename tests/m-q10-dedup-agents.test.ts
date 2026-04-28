/**
 * M-Q10 — dev agent files slimmed by dedup (topic moved to single auto-loaded source).
 *
 * Goal: each dev agent file lives at ~PROJECT-donor size (3.5–7 KB depending on stack
 * complexity), with one auth source per topic. scope-guard.md moved to manual-load
 * (architect/reviewer reference only); dev-startup.md absorbs Three Hard Rules +
 * escalation template that devs need at impl time.
 *
 * Files preserved (NOT deleted, just frontmatter or surgical edit + content compaction):
 *   .claude/rules/scope-guard.md       (full content kept; globs: [])
 *   .claude/rules/dev-startup.md       (added Three Hard Rules + escalation block)
 *   .claude/agents/{backend,frontend,icp,registry}-dev.md  (slimmed via dedup)
 *
 * Anti-pattern guard: rule descriptions are timeless, do NOT carry milestone IDs
 * (e.g. "M-Q10 dedup" in description: would couple file to a sprint).
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

describe('M-Q10 — scope-guard.md manual-load + dev-startup.md absorbs hard rules', () => {
  it('scope-guard.md frontmatter globs: []', () => {
    const content = readFile('.claude/rules/scope-guard.md');
    expect(getFrontmatterField(content, 'globs')).toBe('[]');
  });

  it('scope-guard.md content preserved (≥ 12 K chars — full reference, not stub; UTF-8 size higher due to Cyrillic)', () => {
    const content = readFile('.claude/rules/scope-guard.md');
    expect(content.length).toBeGreaterThanOrEqual(12000);
  });

  it('scope-guard.md description does NOT carry milestone IDs (timeless rule, not sprint-tagged)', () => {
    const content = readFile('.claude/rules/scope-guard.md');
    const desc = getFrontmatterField(content, 'description') ?? '';
    expect(desc).not.toMatch(/\bM-Q\d+\b/);
    expect(desc).not.toMatch(/\bM-L\d+\b/);
    expect(desc).not.toMatch(/\bdedup\b/);
  });

  it('dev-startup.md auto-loads on impl paths (globs cover apps/ + products/ + packages/ + platform/)', () => {
    const content = readFile('.claude/rules/dev-startup.md');
    const globs = getFrontmatterField(content, 'globs') ?? '';
    expect(globs).toMatch(/apps\/\*\*/);
    expect(globs).toMatch(/products\/\*\*/);
    expect(globs).toMatch(/packages\/\*\*/);
    expect(globs).toMatch(/platform\/\*\*/);
  });

  it('dev-startup.md contains Three Hard Rules block (devs need it at impl time, scope-guard.md no longer auto-loads)', () => {
    const content = readFile('.claude/rules/dev-startup.md');
    expect(content).toMatch(/Three Hard Rules/i);
    // Three rules should be enumerated
    expect(content).toMatch(/NEVER touch other agents'\s*files/i);
    expect(content).toMatch(/NEVER modify tests/i);
    expect(content).toMatch(/NEVER\s+`?git push`?/i);
  });

  it('dev-startup.md contains SCOPE VIOLATION REQUEST escalation template', () => {
    const content = readFile('.claude/rules/dev-startup.md');
    expect(content).toMatch(/!!! SCOPE VIOLATION REQUEST !!!/);
    expect(content).toMatch(/!!! END SCOPE VIOLATION REQUEST !!!/);
    expect(content).toMatch(/Agent:\s*<name>/);
    expect(content).toMatch(/File I need to change:/);
    expect(content).toMatch(/Why I cannot proceed without it:/);
  });
});

describe('M-Q10 — 4 dev agent files slimmed (single source per topic)', () => {
  type AgentSpec = {
    file: string;
    maxBytes: number;     // upper bound — slim, not stub
    minBytes: number;     // lower bound — not over-stripped
  };

  // PROJECT donor sizes: backend-dev=3582, frontend-dev=3739
  // ICP/registry have unique content (DFX env, dual stack) so allowance is higher
  const agents: AgentSpec[] = [
    { file: '.claude/agents/backend-dev.md',  maxBytes: 5500, minBytes: 3500 },
    { file: '.claude/agents/frontend-dev.md', maxBytes: 5500, minBytes: 3500 },
    { file: '.claude/agents/icp-dev.md',      maxBytes: 6800, minBytes: 4500 },
    { file: '.claude/agents/registry-dev.md', maxBytes: 7500, minBytes: 5000 },
  ];

  for (const { file, maxBytes, minBytes } of agents) {
    describe(file, () => {
      it(`size in slim range [${minBytes}, ${maxBytes}] bytes`, () => {
        const content = readFile(file);
        expect(content.length).toBeLessThanOrEqual(maxBytes);
        expect(content.length).toBeGreaterThanOrEqual(minBytes);
      });

      it('has Scope section header', () => {
        const content = readFile(file);
        expect(content).toMatch(/^##\s+Scope\s*$/m);
      });

      it('has Architecture Reminders section header', () => {
        const content = readFile(file);
        expect(content).toMatch(/^##\s+Architecture Reminders\s*$/m);
      });

      it('has Verification section header', () => {
        const content = readFile(file);
        expect(content).toMatch(/^##\s+Verification/m);
      });

      it('has Workflow section header (links to dev-startup.md)', () => {
        const content = readFile(file);
        expect(content).toMatch(/^##\s+Workflow\s*$/m);
        expect(content).toMatch(/dev-startup\.md/);
      });

      it('has Git Policy section header', () => {
        const content = readFile(file);
        expect(content).toMatch(/^##\s+Git Policy/m);
      });

      it('does NOT inline full Multi-Tenancy P0 BLOCKER section (lives in backend-architecture.md / shared)', () => {
        const content = readFile(file);
        // Brief reminder OK ("Multi-tenancy" header или 3-7 lines).
        // Inline duplicate of backend-architecture.md section (B1-B7 enumeration с "reviewer Phase B" heading) — NOT OK.
        expect(content).not.toMatch(/B1-B7|reviewer Phase B/);
      });

      it('does NOT duplicate Three Hard Rules (lives in dev-startup.md after M-Q10)', () => {
        const content = readFile(file);
        // Brief link OK; full enumeration — NOT OK
        expect(content).not.toMatch(/^##\s+Three Hard Rules/m);
        expect(content).not.toMatch(/Rule 1: DO NOT touch/);
      });

      it('does NOT duplicate Scope violation Level 1/2/3 enumeration (lives in scope-guard.md / workflow.md)', () => {
        const content = readFile(file);
        expect(content).not.toMatch(/Scope violation levels/);
        expect(content).not.toMatch(/^\*\*Level 1\*\*/m);
      });

      it('does NOT have full Startup Protocol enumeration (10-step block — lives in dev-startup.md)', () => {
        const content = readFile(file);
        // Bare numbered list "1.." through "10.." or "ОБЯЗАТЕЛЬНЫЙ" header marker
        expect(content).not.toMatch(/^##\s+Startup Protocol/m);
        expect(content).not.toMatch(/^\d+\.\s+Прочитай\s+`CLAUDE\.md`/m);
      });
    });
  }
});

describe('M-Q10 — dedup invariant: each topic lives in ONE auto-loaded source', () => {
  it('Three Hard Rules enumerated only in dev-startup.md (NOT in agent files)', () => {
    // Search for the explicit "Three Hard Rules" heading + numbered enumeration
    const startup = readFile('.claude/rules/dev-startup.md');
    expect(startup).toMatch(/Three Hard Rules/i);

    const agentFiles = ['backend-dev', 'frontend-dev', 'icp-dev', 'registry-dev'];
    for (const a of agentFiles) {
      const content = readFile(`.claude/agents/${a}.md`);
      // Heading "## Three Hard Rules" should NOT appear (deduped)
      expect(content).not.toMatch(/^##\s+Three Hard Rules/m);
    }
  });

  it('SCOPE VIOLATION REQUEST template lives in dev-startup.md + scope-guard.md only (NOT inlined per agent)', () => {
    const startup = readFile('.claude/rules/dev-startup.md');
    expect(startup).toMatch(/!!! SCOPE VIOLATION REQUEST !!!/);

    const scopeGuard = readFile('.claude/rules/scope-guard.md');
    expect(scopeGuard).toMatch(/!!! SCOPE VIOLATION REQUEST !!!/);

    // Agent files may MENTION the marker (saying "use SCOPE VIOLATION REQUEST"),
    // but should NOT carry the full 7-line template block (deduped).
    const agentFiles = ['backend-dev', 'frontend-dev', 'icp-dev', 'registry-dev'];
    for (const a of agentFiles) {
      const content = readFile(`.claude/agents/${a}.md`);
      // Full template would have BOTH start AND end markers
      const hasStart = /!!! SCOPE VIOLATION REQUEST !!!/.test(content);
      const hasEnd = /!!! END SCOPE VIOLATION REQUEST !!!/.test(content);
      // Either both absent (deduped) or only mention without END marker
      expect(hasEnd).toBe(false);
    }
  });
});
