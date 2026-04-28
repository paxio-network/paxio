/**
 * M-Q17 — drift-guard: project-level .claude/settings.json must NOT set env.TMPDIR.
 *
 * Incident (commit 72c2853, Apr 28 2026): architect added `TMPDIR=$HOME/...`
 * to shared `.claude/settings.json::env`, expecting Claude Code to expand `$HOME`
 * at runtime per OS user. It does NOT expand — env values pass to subprocesses
 * literally. Result: any tool that does `mkdir -p "$TMPDIR/..."` without shell
 * expansion creates a literal `./\$HOME/.cache/...` directory in the repo root.
 *
 * Observed in /home/nous/paxio/$HOME/.cache/paxio-tmp/{gh-cli-cache,node-compile-cache}/
 * after gh CLI invocations from sessions where user-level `~/.claude/settings.json`
 * did NOT override TMPDIR.
 *
 * Fix: TMPDIR is removed from project-level settings.json. Per-user setup in
 * `~/.claude/settings.json` with absolute path is mandatory (documented in CLAUDE.md).
 *
 * This test pins the invariant so the bug cannot return.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

describe('M-Q17 — project .claude/settings.json::env has no TMPDIR', () => {
  it('.claude/settings.json::env does NOT include TMPDIR key', () => {
    const raw = readFileSync(resolve(ROOT, '.claude/settings.json'), 'utf8');
    const settings = JSON.parse(raw) as { env?: Record<string, string> };
    const envKeys = Object.keys(settings.env ?? {});
    expect(envKeys, `env block must not declare TMPDIR (Claude Code does not expand $HOME — caused literal ./\$HOME/ dir bug)`).not.toContain(
      'TMPDIR',
    );
  });

  it('.claude/settings.json::env value, if any, contains no literal "$HOME" token', () => {
    const raw = readFileSync(resolve(ROOT, '.claude/settings.json'), 'utf8');
    const settings = JSON.parse(raw) as { env?: Record<string, string> };
    for (const [key, value] of Object.entries(settings.env ?? {})) {
      expect(value, `env.${key} must not contain literal "$HOME" — pass absolute paths via per-user ~/.claude/settings.json instead`).not.toContain(
        '$HOME',
      );
    }
  });
});

describe('M-Q17 — repo root is clean of literal $HOME dir', () => {
  // CI gate. Locally, sessions started BEFORE this PR merged inherit the bad
  // TMPDIR=$HOME/... in their environment — vitest forks then create literal
  // $HOME/ on every invocation. Skip if current process env still has the bug
  // (means «restart claude-code after this PR merges» applies to your session).
  const sessionHasBadTmpdir = (process.env.TMPDIR ?? '').includes('$HOME');

  it.skipIf(sessionHasBadTmpdir)(
    'no literal `$HOME` directory at repo root — CI canary for regression',
    () => {
      const literalHomeDir = resolve(ROOT, '$HOME');
      expect(existsSync(literalHomeDir), 'literal `$HOME/` dir means TMPDIR var was unexpanded again').toBe(
        false,
      );
    },
  );
});

describe('M-Q17 — .gitignore protects against future regression', () => {
  it('.gitignore lists literal $HOME/', () => {
    const raw = readFileSync(resolve(ROOT, '.gitignore'), 'utf8');
    expect(raw).toMatch(/^\$HOME\/$/m);
  });

  it('.gitignore lists Pi runtime artifacts (.pi/, .claude/{extensions,worktrees,wrappers}/)', () => {
    const raw = readFileSync(resolve(ROOT, '.gitignore'), 'utf8');
    expect(raw).toMatch(/^\.pi\/$/m);
    expect(raw).toMatch(/^\.claude\/extensions\/$/m);
    expect(raw).toMatch(/^\.claude\/worktrees\/$/m);
    expect(raw).toMatch(/^\.claude\/wrappers\/$/m);
  });
});

describe('M-Q17 — CLAUDE.md documents per-user TMPDIR setup', () => {
  it('CLAUDE.md mentions per-user TMPDIR requirement + absolute path rule', () => {
    const raw = readFileSync(resolve(ROOT, 'CLAUDE.md'), 'utf8');
    expect(raw).toMatch(/Per-OS-user setup|TMPDIR/);
    expect(raw).toMatch(/~\/\.claude\/settings\.json/);
    expect(raw).toMatch(/absolute path/i);
  });
});
