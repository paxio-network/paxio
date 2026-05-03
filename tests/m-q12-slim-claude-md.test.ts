/**
 * M-Q12 — slim CLAUDE.md by extracting reference sections to docs/architecture/.
 *
 * Goal: reduce eager-load at /clear. CLAUDE.md auto-loads as project instructions
 * for every agent session. Reference sections (Build Commands, ICP rationale,
 * monorepo rationale, full CI/CD table) live elsewhere; CLAUDE.md keeps only
 * actionable + scope content needed at session start.
 *
 * Files touched:
 *   CLAUDE.md  (12 KB → ~7 KB)
 *   docs/architecture/BUILD-COMMANDS.md  (NEW)
 *   docs/architecture/ICP-PRINCIPLE.md   (NEW)
 *
 * Critical content preserved (verified by this test): all 7 agents in File
 * Ownership, all 8 Architecture Principles, УСТАВНЫЕ ДОКУМЕНТЫ list, Branch
 * Model, both merge gates.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const claude = readFileSync(resolve(ROOT, 'CLAUDE.md'), 'utf8');

describe('M-Q12 — CLAUDE.md slim profile (eager-load reduction)', () => {
  it('CLAUDE.md ≤ 8500 chars (was 7700 pre-TD-dev-push; +~700 chars for push-policy block)', () => {
    expect(claude.length).toBeLessThanOrEqual(8500);
  });

  it('CLAUDE.md ≥ 5500 chars (not over-stripped — must keep 7-section minimum)', () => {
    expect(claude.length).toBeGreaterThanOrEqual(5500);
  });
});

describe('M-Q12 — required sections preserved in CLAUDE.md', () => {
  const requiredHeaders = [
    'Vision → Code Chain',
    'Workflow',
    'Team',
    'Architecture Principles',
    'File Ownership',
    'УСТАВНЫЕ ДОКУМЕНТЫ',
    'Branch Model',
  ];

  for (const header of requiredHeaders) {
    it(`section "${header}" present`, () => {
      const re = new RegExp(`^##\\s+${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm');
      expect(claude).toMatch(re);
    });
  }
});

describe('M-Q12 — File Ownership table covers all 7 agents', () => {
  const agents = [
    'architect',
    'backend-dev',
    'icp-dev',
    'registry-dev',
    'frontend-dev',
    'test-runner',
    'reviewer',
  ];

  for (const agent of agents) {
    it(`agent ${agent} listed`, () => {
      // Match in File Ownership table row
      const re = new RegExp(`\\|\\s+${agent}\\s+\\|`);
      expect(claude).toMatch(re);
    });
  }
});

describe('M-Q12 — all 8 Architecture Principles preserved', () => {
  const principles = [
    'Three-layer stack',
    'Backend `server/` + `app/`',
    'Non-custodial by default',
    'LLM-free for financial decisions',
    'Data externalization',
    'No hardcoded values',
    'Onion deps',
    'ICP только там где надо',
  ];

  for (const p of principles) {
    it(`principle "${p}" present`, () => {
      expect(claude).toContain(p);
    });
  }
});

describe('M-Q12 — both merge gates documented', () => {
  it('feature/* → dev gate (architect merges automatically)', () => {
    expect(claude).toContain('`feature/* → dev`');
    expect(claude).toMatch(/architect мержит сам/);
  });

  it('dev → main gate (user OK required)', () => {
    expect(claude).toContain('`dev → main`');
    expect(claude).toMatch(/явного OK от user/);
  });
});

describe('M-Q12 — extracted docs/ files exist + non-empty', () => {
  const extracted = [
    'docs/architecture/BUILD-COMMANDS.md',
    'docs/architecture/ICP-PRINCIPLE.md',
    'docs/architecture/MONOREPO.md', // pre-existing, still referenced
  ];

  for (const path of extracted) {
    it(`${path} exists with content`, () => {
      const stat = statSync(resolve(ROOT, path));
      expect(stat.isFile()).toBe(true);
      expect(stat.size).toBeGreaterThan(500); // not stub
    });
  }
});

describe('M-Q12 — CLAUDE.md links to extracted reference docs', () => {
  it('links to BUILD-COMMANDS.md', () => {
    expect(claude).toMatch(/docs\/architecture\/BUILD-COMMANDS\.md/);
  });

  it('links to ICP-PRINCIPLE.md', () => {
    expect(claude).toMatch(/docs\/architecture\/ICP-PRINCIPLE\.md/);
  });

  it('links to MONOREPO.md', () => {
    expect(claude).toMatch(/docs\/architecture\/MONOREPO\.md/);
  });

  it('links to docs/cicd.md (CI/CD reference)', () => {
    expect(claude).toMatch(/docs\/cicd\.md/);
  });
});
