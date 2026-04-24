/**
 * TD-22 RED spec — `docs/tech-debt.md` authorship enforcement.
 *
 * Per `.claude/rules/scope-guard.md`:
 *   «`docs/tech-debt.md` — ТОЛЬКО reviewer записывает новый долг;
 *    architect пишет тесты на fix и заполняет колонку «Тест на fix».»
 *
 * Pattern was violated by architect minimum three times (TD-10, PR #2, PR #3 `f106908`).
 * This RED spec locks in что `.claude/settings.json::hooks::PreToolUse` contains
 * a Bash hook который:
 *   (a) detects `git commit` on staged `docs/tech-debt.md`,
 *   (b) ALLOWS commit if message matches either `reviewer:` prefix OR contains
 *       `[tech-debt: fill-test-column]` bypass marker (architect filling 5-th column),
 *   (c) BLOCKS otherwise с exit 1 + human-readable message.
 *
 * Currently RED — hook exists but blocks unconditionally / doesn't distinguish
 * reviewer vs architect vs bypass marker.
 *
 * See `docs/sprints/M-TD22-authorship-hook.md` for milestone + T-2 impl contract.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const SETTINGS_PATH = join(REPO_ROOT, '.claude/settings.json');
const TECH_DEBT_PATH = join(REPO_ROOT, 'docs/tech-debt.md');

interface Hook {
  readonly type: string;
  readonly command: string;
}

interface HookGroup {
  readonly matcher?: string;
  readonly hooks?: readonly Hook[];
}

interface Settings {
  readonly hooks?: {
    readonly PreToolUse?: readonly HookGroup[];
    readonly PostToolUse?: readonly HookGroup[];
  };
}

function loadSettings(): Settings {
  const raw = readFileSync(SETTINGS_PATH, 'utf-8');
  return JSON.parse(raw) as Settings;
}

function bashCommandsIn(groups: readonly HookGroup[] | undefined): readonly string[] {
  if (!groups) return [];
  return groups
    .filter((g) => g.matcher === 'Bash')
    .flatMap((g) => (g.hooks ?? []).map((h) => h.command));
}

function findTechDebtHookCommand(settings: Settings): string | undefined {
  const all = bashCommandsIn(settings.hooks?.PreToolUse);
  // Accept any reference to docs/tech-debt (with or without .md extension
  // and with or without escaped dots) — existing hook uses bare `docs/tech-debt`
  // inside a grep pattern group; the enriched hook may be more specific.
  return all.find((cmd) => /docs\/tech-debt/.test(cmd));
}

describe('TD-22: docs/tech-debt.md authorship enforcement', () => {
  describe('.claude/settings.json baseline', () => {
    it('.claude/settings.json exists', () => {
      expect(existsSync(SETTINGS_PATH)).toBe(true);
    });

    it('settings.json parses as valid JSON', () => {
      expect(() => loadSettings()).not.toThrow();
    });

    it('has hooks.PreToolUse array with at least one Bash matcher', () => {
      const settings = loadSettings();
      const preHooks = settings.hooks?.PreToolUse ?? [];
      const bashGroups = preHooks.filter((g) => g.matcher === 'Bash');
      expect(bashGroups.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Tech-debt-specific hook exists and is structured correctly', () => {
    it('at least one PreToolUse Bash hook command references docs/tech-debt.md', () => {
      const settings = loadSettings();
      const hit = findTechDebtHookCommand(settings);
      expect(
        hit,
        'expected PreToolUse Bash hook command to contain the path docs/tech-debt.md',
      ).toBeDefined();
    });

    it('the tech-debt hook command recognises the `[tech-debt: fill-test-column]` bypass marker', () => {
      const settings = loadSettings();
      const cmd = findTechDebtHookCommand(settings);
      expect(cmd).toBeDefined();
      expect(
        cmd!,
        'hook must allow architect to fill «Тест на fix» column via [tech-debt: fill-test-column] commit-message marker',
      ).toMatch(/\[tech-debt:\s*fill-test-column\]/);
    });

    it('the tech-debt hook command recognises reviewer commits via `reviewer:` prefix', () => {
      const settings = loadSettings();
      const cmd = findTechDebtHookCommand(settings);
      expect(cmd).toBeDefined();
      // Either literal `reviewer:` prefix check OR Co-Authored-By trailer check
      expect(
        cmd!,
        'hook must allow reviewer commits (reviewer: prefix OR Co-Authored-By reviewer trailer)',
      ).toMatch(/reviewer:|Co-Authored-By[^\\n]*reviewer/i);
    });

    it('the tech-debt hook exits with code 1 on violation (halts tool execution)', () => {
      const settings = loadSettings();
      const cmd = findTechDebtHookCommand(settings);
      expect(cmd).toBeDefined();
      expect(cmd!, 'hook must call `exit 1` to stop the blocked tool invocation').toMatch(
        /exit\s+1/,
      );
    });

    it('the tech-debt hook emits a BLOCKED message naming docs/tech-debt.md', () => {
      const settings = loadSettings();
      const cmd = findTechDebtHookCommand(settings);
      expect(cmd).toBeDefined();
      // Require both `BLOCKED` keyword and the string `tech-debt` somewhere
      // in the hook command — order-independent (grep/echo pattern can be
      // either before or after).
      expect(cmd!, 'hook command must contain `BLOCKED` keyword').toMatch(/BLOCKED/);
      // Stronger requirement: BLOCKED message text itself must reference
      // docs/tech-debt.md so architect understands which file is guarded.
      // Hook shape: `...; echo 'BLOCKED: docs/tech-debt.md — ...'; exit 1; ...`
      expect(
        cmd!,
        "BLOCKED message should mention 'tech-debt' so architect sees which file is guarded",
      ).toMatch(/BLOCKED[^']*tech-debt|echo[^;]*tech-debt/);
    });

    it('the tech-debt hook message mentions the fill-test-column marker so architect knows how to proceed', () => {
      const settings = loadSettings();
      const cmd = findTechDebtHookCommand(settings);
      expect(cmd).toBeDefined();
      expect(
        cmd!,
        'BLOCKED message должен подсказывать architect что доступен bypass marker [tech-debt: fill-test-column]',
      ).toMatch(/fill-test-column/);
    });
  });

  describe('Historical baseline — TD-22 occurrences documented', () => {
    it('docs/tech-debt.md exists', () => {
      expect(existsSync(TECH_DEBT_PATH)).toBe(true);
    });

    it('TD-22 row lists minimum 3 prior occurrences (TD-10, PR #2, commit f106908)', () => {
      const content = readFileSync(TECH_DEBT_PATH, 'utf-8');
      const td22Line = content
        .split('\n')
        .find((line) => /\|\s*TD-22\s*\|/.test(line));
      expect(td22Line, 'expected row for TD-22 in docs/tech-debt.md').toBeDefined();
      expect(td22Line!).toMatch(/TD-10/);
      expect(td22Line!).toMatch(/PR #2|eff7f71|0aa60db/);
      expect(td22Line!).toMatch(/PR #3|f106908/);
    });
  });
});
