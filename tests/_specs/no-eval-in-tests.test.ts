/**
 * TD-15 RED spec — no eval() / new Function() in test harnesses.
 *
 * `.claude/rules/safety.md::No Dynamic Code Execution`:
 *   "Never use eval(), new Function(), exec() with user input.
 *    Never construct SQL queries with string concatenation."
 *
 * Violation in commit 85e04cf (tests/errors-cjs-sync.test.ts:53):
 *   const fn = eval(wrappedCode);
 *
 * Context: the test loads a CJS file (apps/back/server/lib/errors.cjs) with
 * a controlled __dirname so that the CJS file's require('../../../dist/...')
 * resolves against server/ dir, not the test's cwd. The input IS controlled
 * (local source), so it's not a security exploit — but eval in a VM-sandbox
 * project where eval is systemically banned is a bad architectural signal.
 *
 * Correct alternatives (per reviewer note on TD-15):
 *   - `createRequire(import.meta.url)(cjsPath)` — Node.js module API
 *   - `await import(pathToFileURL(cjsPath))` — dynamic import
 *   - Execute with `vm.Script` + explicit sandbox (already used by loader.cjs)
 *
 * This spec goes GREEN when eval is removed from the test harness.
 * Scope: all tests/** source files. If ever a test legitimately needs eval,
 * it's a !!! SCOPE VIOLATION REQUEST !!! to add an explicit allow-list entry
 * with security rationale.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TESTS_DIR = join(process.cwd(), 'tests');

function walkTestFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      walkTestFiles(p, out);
    } else if (
      stat.isFile() &&
      (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx'))
    ) {
      out.push(p);
    }
  }
  return out;
}

describe('TD-15 — no eval/new Function in test harnesses', () => {
  const files = walkTestFiles(TESTS_DIR);

  it('finds test files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // Allowlist: this spec file itself mentions the banned patterns in regex
  // literals and comments. Exclude self to avoid false-positive recursion.
  const SELF = 'tests/_specs/no-eval-in-tests.test.ts';

  describe.each(
    files
      .filter((f) => !f.endsWith(SELF))
      .map((f) => ({
        path: f,
        rel: f.slice(process.cwd().length + 1),
        src: readFileSync(f, 'utf8'),
      })),
  )('$rel', ({ src, rel }) => {
    it('does not call eval(...)', () => {
      // Strip comments + string literals to avoid false positives.
      // This is a best-effort grep; the spec author accepts that pathological
      // code can defeat it (e.g. `const e = 'ev' + 'al'`) — real protection
      // is in runtime VM sandbox, this is architecture enforcement.
      const stripped = src
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/'[^'\n]*'/g, "''")
        .replace(/"[^"\n]*"/g, '""')
        .replace(/`[^`]*`/g, '``');
      expect(
        stripped,
        `${rel} uses eval() — see tech-debt.md TD-15 for the replacement (createRequire or dynamic import)`,
      ).not.toMatch(/\beval\s*\(/);
    });

    it('does not call new Function(...)', () => {
      const stripped = src
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/'[^'\n]*'/g, "''")
        .replace(/"[^"\n]*"/g, '""')
        .replace(/`[^`]*`/g, '``');
      expect(
        stripped,
        `${rel} uses new Function() — replace with a safer module loading primitive`,
      ).not.toMatch(/\bnew\s+Function\s*\(/);
    });
  });
});
