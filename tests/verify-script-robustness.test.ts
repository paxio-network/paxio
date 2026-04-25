/**
 * TD-11 RED spec — verify scripts MUST run without filesystem preflight.
 *
 * Each `scripts/verify_*.sh` is an acceptance script the user or CI runs
 * standalone — it MUST NOT fail because of missing directories, missing
 * env vars, or other preflight assumptions. Infrastructure failures
 * (mkdir, missing $HOME, etc.) are indistinguishable from real test
 * failures in `ok/bad` output and hide the real signal.
 *
 * This spec codifies TWO invariants:
 *   (a) any `set -euo pipefail` acceptance script using $HOME/tmp/ MUST
 *       `mkdir -p` that directory before redirecting into it.
 *   (b) verify scripts should be runnable from a clean $HOME with no
 *       pre-existing tmp/ dir.
 *
 * If this spec goes RED again, architect needs to update verify-script
 * templates and fix the offender.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SCRIPTS_DIR = join(process.cwd(), 'scripts');

function loadVerifyScripts(): Array<{ name: string; content: string }> {
  return readdirSync(SCRIPTS_DIR)
    .filter((f) => f.startsWith('verify_') && f.endsWith('.sh'))
    .map((f) => ({
      name: f,
      content: readFileSync(join(SCRIPTS_DIR, f), 'utf8'),
    }));
}

describe('TD-11 — verify_*.sh robustness', () => {
  const scripts = loadVerifyScripts();

  it('finds at least one verify script in scripts/', () => {
    expect(scripts.length).toBeGreaterThan(0);
  });

  describe.each(scripts)('$name', ({ name, content }) => {
    const usesHomeTmp = /\$HOME\/tmp\//.test(content);

    it('uses set -euo pipefail (strict bash)', () => {
      expect(content).toMatch(/set -euo pipefail/);
    });

    it('has shebang', () => {
      expect(content.startsWith('#!')).toBe(true);
    });

    if (usesHomeTmp) {
      it('mkdir -p "$HOME/tmp" BEFORE first redirect (TD-11 invariant)', () => {
        // Walk non-comment lines, track the first `mkdir -p "$HOME/tmp"` and
        // the first `>>"$HOME/tmp/..."` redirect. The mkdir must come first.
        const lines = content.split('\n');
        let mkdirLine = -1;
        let firstRedirectLine = -1;
        for (let i = 0; i < lines.length; i++) {
          const stripped = lines[i].replace(/^\s*/, '');
          if (stripped.startsWith('#')) continue; // skip pure comment lines
          if (mkdirLine === -1 && /mkdir -p "\$HOME\/tmp"/.test(lines[i])) {
            mkdirLine = i;
          }
          if (firstRedirectLine === -1 && />>?\s*"?\$HOME\/tmp\//.test(lines[i])) {
            firstRedirectLine = i;
          }
        }

        expect(
          mkdirLine,
          `${name} redirects to $HOME/tmp/ but has no 'mkdir -p "$HOME/tmp"' in non-comment code`,
        ).toBeGreaterThan(-1);
        expect(firstRedirectLine).toBeGreaterThan(-1);
        expect(
          mkdirLine,
          `${name}: mkdir -p "$HOME/tmp" (line ${mkdirLine + 1}) must appear BEFORE first redirect (line ${firstRedirectLine + 1})`,
        ).toBeLessThan(firstRedirectLine);
      });
    }
  });
});
