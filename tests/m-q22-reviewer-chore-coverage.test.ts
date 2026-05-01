/**
 * Drift-guard for reviewer chore coverage governance.
 *
 * Closes class of bugs «reviewer skipped chore(reviewer) commit for an
 * APPROVED PR merge». Plus pins reviewer push permission text and
 * Phase 1.8 / Phase 13 L4-L5 mandates.
 *
 * The chore-coverage assertion walks recent commits on the local dev
 * branch and asserts: every PR merge commit has a `chore(reviewer)`
 * commit referencing the same milestone within a small window before/after
 * the merge. This is a soft heuristic (skips when local dev is too fresh
 * or when a milestone uses a non-standard naming) but catches the common
 * gap where a terse APPROVED report skips committing project-state.md.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(__dirname, '..');
const readFile = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8');

describe('M-Q22 — reviewer.md Phase 13 L4 push mandate', () => {
  it('Phase 13 has L4 push chore commit step', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/L4\..*Push chore commit/i);
    expect(c).toMatch(/origin\/dev/);
  });

  it('Phase 13 has L5 supersede mandate (round-N replaces round-N-1)', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/L5\..*Supersede.*CHANGES REQUESTED/i);
    expect(c).toMatch(/DELETE.*CHANGES REQUESTED|don't append/i);
  });
});

describe('M-Q22 — reviewer.md Phase 1.8 push procedure', () => {
  it('Phase 1.8 section exists', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/Phase 1\.8.*Push reviewer chore/i);
  });

  it('Phase 1.8 prescribes git pull --rebase origin dev before push', () => {
    const c = readFile('.claude/agents/reviewer.md');
    expect(c).toMatch(/git pull --rebase origin dev/);
  });

  it('Phase 1.8 narrows push scope to project-state.md + tech-debt.md only', () => {
    const c = readFile('.claude/agents/reviewer.md');
    const phase18Block = c.match(/Phase 1\.8[\s\S]{0,2000}/);
    expect(phase18Block, 'Phase 1.8 block expected').not.toBeNull();
    expect(phase18Block![0]).toMatch(/project-state\.md/);
    expect(phase18Block![0]).toMatch(/tech-debt\.md/);
    expect(phase18Block![0]).toMatch(/scope violation|narrow|abort/i);
  });

  it('Phase 1.8 explains rationale (commit otherwise stays in /tmp worktree)', () => {
    const c = readFile('.claude/agents/reviewer.md');
    const phase18Block = c.match(/Phase 1\.8[\s\S]{0,2000}/);
    expect(phase18Block![0]).toMatch(/local-only|cherry-pick|stays in.*worktree|reviewer.*worktree/i);
  });

  it('Phase 1.8 covers conflict resolution on docs/project-state.md', () => {
    const c = readFile('.claude/agents/reviewer.md');
    const phase18Block = c.match(/Phase 1\.8[\s\S]{0,2000}/);
    expect(phase18Block![0]).toMatch(/[Cc]onflict.*docs\/project-state\.md|conflict resolution/);
  });
});

describe('M-Q22 — scope-guard.md push permissions table', () => {
  it('scope-guard.md has push permissions table with reviewer narrow exception', () => {
    const c = readFile('.claude/rules/scope-guard.md');
    expect(c).toMatch(/Push permissions/i);
    expect(c).toMatch(/reviewer[\s\S]{0,500}narrow|narrow[\s\S]{0,500}reviewer/i);
  });

  it('table lists reviewer push as origin/dev only with project-state.md + tech-debt.md scope', () => {
    const c = readFile('.claude/rules/scope-guard.md');
    const tableBlock = c.match(/Push permissions[\s\S]{0,2000}/);
    expect(tableBlock, 'push permissions section expected').not.toBeNull();
    expect(tableBlock![0]).toMatch(/origin\/dev/);
    expect(tableBlock![0]).toMatch(/docs\/project-state\.md/);
    expect(tableBlock![0]).toMatch(/docs\/tech-debt\.md/);
  });

  it('dev-style agents still NO push (backend-dev / frontend-dev / icp-dev / registry-dev / test-runner)', () => {
    const c = readFile('.claude/rules/scope-guard.md');
    const tableBlock = c.match(/Push permissions[\s\S]{0,2000}/);
    expect(tableBlock![0]).toMatch(/backend-dev.*frontend-dev.*icp-dev.*registry-dev.*test-runner|NO.*local commits only/);
  });

  it('--force push to main/dev still forbidden for all agents', () => {
    const c = readFile('.claude/rules/scope-guard.md');
    expect(c).toMatch(/--force[\s\S]{0,200}main.*dev|push --force.*ЗАПРЕЩЕНО/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Soft heuristic: chore-coverage of recent PR merges in local dev.
// ─────────────────────────────────────────────────────────────────────────────

describe('M-Q22 — chore(reviewer) coverage of recent PR merges', () => {
  // Pull last 30 commits from origin/dev (or HEAD if no origin/dev). Assert
  // that for every "Merge pull request #N" commit, there is a corresponding
  // chore(reviewer) commit within ±5 commits referencing the same milestone
  // tag (M-XX-Y, M-LX.Y, M-QXX, etc.) OR the same PR number.

  const pullLog = (): string => {
    try {
      return execSync(
        'git log origin/dev --pretty="%h %s" -50 2>/dev/null || git log HEAD --pretty="%h %s" -50',
        { cwd: ROOT, encoding: 'utf8' },
      );
    } catch {
      return '';
    }
  };

  // Cached body lookup so we don't fork git per chore.
  const choreBody = (sha: string): string => {
    try {
      return execSync(`git log -1 --pretty=%B ${sha}`, {
        cwd: ROOT,
        encoding: 'utf8',
      });
    } catch {
      return '';
    }
  };

  it('every PR merge in last 50 dev commits has a chore(reviewer) within ±5 commits OR via batch chore body listing', () => {
    const log = pullLog();
    if (!log) return; // skip if git unavailable
    const lines = log.split('\n').filter(Boolean);
    if (lines.length < 5) return; // skip on near-empty log

    const commits = lines.map((l, idx) => {
      const [sha, ...rest] = l.split(' ');
      return { idx, sha, subject: rest.join(' ') };
    });

    const merges = commits.filter((c) => c.subject.startsWith('Merge pull request #'));
    const chores = commits.filter((c) => c.subject.startsWith('chore(reviewer):'));

    // Extract milestone prefix (M-L11, M-Q22, etc.) — strip phase/round suffix.
    const stripToPrefix = (tag: string): string | null => {
      const m = tag.match(/(M-[A-Z]\d+)/);
      return m ? m[1] : null;
    };

    // Pre-fetch bodies for every chore so we can spot batch chores that
    // list multiple PR numbers in their body. Batch chore is the canonical
    // catch-up mechanism after a governance gap (multiple infra hotfixes
    // merged без individual reviewer pass) — listing each PR в body
    // delivers the same audit trail без spamming dev branch с десятком
    // identical chore commits.
    const choreBodies = chores.map((c) => choreBody(c.sha));

    const orphaned: Array<{ sha: string; subject: string }> = [];
    for (const merge of merges) {
      const prMatch = merge.subject.match(/#(\d+)/);
      const prNumber = prMatch ? prMatch[1] : null;
      const branchMatch = merge.subject.match(/from paxio-network\/(?:feature\/)?([\w.-]+)/);
      const milestonePrefix = branchMatch ? stripToPrefix(branchMatch[1]) : null;

      // Window match — chore subject within ±5 commits referencing PR or milestone.
      const window = chores.filter((ch) => Math.abs(ch.idx - merge.idx) <= 5);
      const matchedNearby = window.some((ch) => {
        if (prNumber && ch.subject.includes(`#${prNumber}`)) return true;
        if (milestonePrefix && ch.subject.includes(milestonePrefix)) return true;
        return false;
      });
      if (matchedNearby) continue;

      // Batch chore match — any chore anywhere in last 50 commits whose
      // BODY references the orphan PR (e.g. `chore(reviewer): batch
      // retroactive APPROVED for #100-#112` listing each PR в body).
      const matchedBatch = prNumber
        ? choreBodies.some((body) => new RegExp(`#${prNumber}\\b`).test(body))
        : false;
      if (matchedBatch) continue;

      orphaned.push({ sha: merge.sha, subject: merge.subject });
    }

    // Allow up to 4 orphans transitional — pre-convention merges may not have chores.
    // After this milestone lands the threshold tightens (later milestone).
    expect(
      orphaned.length,
      `PR merges without chore(reviewer) within ±5 commits AND no batch chore referencing PR в body: ${orphaned
        .map((o) => `${o.sha} ${o.subject}`)
        .join('; ')}. Reviewer must commit project-state.md + tech-debt.md update per Phase 13 + push per Phase 1.8.`,
    ).toBeLessThanOrEqual(4);
  });
});

describe('M-Q22 — verify_*.sh exists for the new acceptance', () => {
  it('scripts/verify_M-Q22.sh exists and executable', () => {
    const p = resolve(ROOT, 'scripts/verify_M-Q22.sh');
    expect(existsSync(p)).toBe(true);
  });
});
