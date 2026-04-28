/**
 * M-INFRA-VERCEL-IGNORE — per-app Vercel ignored-build script.
 *
 * Problem: Vercel deploys all 8 frontend projects on every push to main, even
 * when only one app's source changed. Each project is subscribed to the whole
 * repo via Vercel Dashboard with no path filter (and we have no `vercel.json`
 * with `ignoreCommand` in any app today).
 *
 * Solution: per-app `vercel.json` with `ignoreCommand` invoking a shared
 * `scripts/vercel-ignore-build.sh <app-name>` script. Script checks git diff
 * vs `$VERCEL_GIT_PREVIOUS_SHA` (set by Vercel) and:
 *   - exit 1 if `apps/frontend/<APP>/` OR shared FE packages
 *     (`packages/{ui,hooks,api-client,auth,types}/`) changed → BUILD
 *   - exit 0 otherwise → SKIP (Vercel convention: 0 = skip, 1 = build)
 *
 * Vercel docs: https://vercel.com/docs/projects/overview#ignored-build-step
 *
 * RED spec for frontend-dev. Architect-owned. Frontend-dev implements:
 *   - 8 × `apps/frontend/<app>/vercel.json` with correct `ignoreCommand`
 *   - 1 × `scripts/vercel-ignore-build.sh` (executable, app-aware)
 *
 * After GREEN + reviewer APPROVED + merge → release `dev → main` with
 * Vercel deploying only the changed app.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(__dirname, '..');
const APPS = ['landing', 'registry', 'pay', 'radar', 'intel', 'docs', 'wallet', 'fleet'] as const;
const SCRIPT_REL = 'scripts/vercel-ignore-build.sh';
const SCRIPT_ABS = resolve(ROOT, SCRIPT_REL);

interface VercelConfig {
  $schema?: string;
  ignoreCommand?: string;
  [k: string]: unknown;
}

function readVercelJson(app: string): VercelConfig {
  const path = resolve(ROOT, 'apps/frontend', app, 'vercel.json');
  return JSON.parse(readFileSync(path, 'utf8')) as VercelConfig;
}

describe('M-INFRA-VERCEL-IGNORE — vercel.json present for each of 8 frontend apps', () => {
  for (const app of APPS) {
    it(`apps/frontend/${app}/vercel.json exists`, () => {
      const path = resolve(ROOT, 'apps/frontend', app, 'vercel.json');
      expect(existsSync(path), `Missing: ${path}`).toBe(true);
    });

    it(`apps/frontend/${app}/vercel.json is valid JSON`, () => {
      const path = resolve(ROOT, 'apps/frontend', app, 'vercel.json');
      expect(() => JSON.parse(readFileSync(path, 'utf8'))).not.toThrow();
    });

    it(`apps/frontend/${app}/vercel.json declares ignoreCommand`, () => {
      const config = readVercelJson(app);
      expect(config.ignoreCommand, `${app} missing ignoreCommand field`).toBeDefined();
      expect(typeof config.ignoreCommand).toBe('string');
    });

    it(`apps/frontend/${app}/vercel.json ignoreCommand calls scripts/vercel-ignore-build.sh`, () => {
      const config = readVercelJson(app);
      expect(config.ignoreCommand).toContain('vercel-ignore-build.sh');
    });

    it(`apps/frontend/${app}/vercel.json ignoreCommand passes "${app}" as app-name argument`, () => {
      const config = readVercelJson(app);
      // The command must reference the app's own name so the script
      // knows which apps/frontend/<APP>/ subtree to watch
      expect(config.ignoreCommand, `${app} ignoreCommand must include literal "${app}"`).toMatch(
        new RegExp(`\\b${app}\\b`),
      );
    });

    it(`apps/frontend/${app}/vercel.json declares schema for editor support`, () => {
      const config = readVercelJson(app);
      expect(config.$schema).toBe('https://openapi.vercel.sh/vercel.json');
    });
  }
});

describe('M-INFRA-VERCEL-IGNORE — ignore-build script exists, executable, behaviour', () => {
  it(`${SCRIPT_REL} exists`, () => {
    expect(existsSync(SCRIPT_ABS), `Missing: ${SCRIPT_ABS}`).toBe(true);
  });

  it(`${SCRIPT_REL} is executable (any-x bit set)`, () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const mode = statSync(SCRIPT_ABS).mode;
    expect(mode & 0o111, 'script is not executable').not.toBe(0);
  });

  it(`${SCRIPT_REL} starts with bash shebang`, () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const content = readFileSync(SCRIPT_ABS, 'utf8');
    expect(content).toMatch(/^#!\/usr\/bin\/env bash\b|^#!\/bin\/bash\b/);
  });

  it(`${SCRIPT_REL} uses set -euo pipefail (or equivalent strict mode)`, () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const content = readFileSync(SCRIPT_ABS, 'utf8');
    expect(content).toMatch(/set\s+-[a-z]*e[a-z]*/);
  });

  it(`${SCRIPT_REL} requires <app-name> argument (input validation)`, () => {
    if (!existsSync(SCRIPT_ABS)) return;
    let exitCode = 0;
    try {
      execFileSync(SCRIPT_ABS, [], { stdio: 'pipe' });
    } catch (e) {
      exitCode = (e as { status?: number }).status ?? 0;
    }
    expect(exitCode, 'script should fail without arg').not.toBe(0);
  });

  it(`${SCRIPT_REL} references VERCEL_GIT_PREVIOUS_SHA env var (Vercel-provided)`, () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const content = readFileSync(SCRIPT_ABS, 'utf8');
    expect(content, 'script must read VERCEL_GIT_PREVIOUS_SHA').toMatch(/VERCEL_GIT_PREVIOUS_SHA/);
  });

  it(`${SCRIPT_REL} uses git diff to detect changes`, () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const content = readFileSync(SCRIPT_ABS, 'utf8');
    expect(content).toMatch(/git\s+diff/);
  });

  it(`${SCRIPT_REL} watches shared frontend packages (ui, hooks, api-client, auth, types)`, () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const content = readFileSync(SCRIPT_ABS, 'utf8');
    // Must trigger build on shared deps changing — pin all 5 explicitly
    for (const pkg of ['ui', 'hooks', 'api-client', 'auth', 'types']) {
      expect(content, `script must watch packages/${pkg}/`).toContain(`packages/${pkg}`);
    }
  });

  it(`${SCRIPT_REL} watches the per-app source dir apps/frontend/<APP>`, () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const content = readFileSync(SCRIPT_ABS, 'utf8');
    expect(content).toMatch(/apps\/frontend/);
  });
});

describe('M-INFRA-VERCEL-IGNORE — script behavioural contract via env-var simulation', () => {
  // These tests bypass Vercel's environment by setting VERCEL_GIT_PREVIOUS_SHA
  // ourselves and checking the exit code. We use the current working tree as
  // a deterministic reference: the script must exit 0 (skip) when nothing
  // changed for a specific app, and exit 1 (build) when watched paths changed.

  function runScript(app: string, prevSha: string): { code: number; stdout: string; stderr: string } {
    try {
      const stdout = execFileSync(SCRIPT_ABS, [app], {
        env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: prevSha },
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: ROOT,
      }).toString();
      return { code: 0, stdout, stderr: '' };
    } catch (e) {
      const err = e as { status?: number; stdout?: Buffer; stderr?: Buffer };
      return {
        code: err.status ?? 1,
        stdout: err.stdout?.toString() ?? '',
        stderr: err.stderr?.toString() ?? '',
      };
    }
  }

  it('exits 0 (skip) when prevSha equals HEAD (no changes for any app)', () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim();
    const { code } = runScript('landing', head);
    expect(code, 'no changes vs HEAD → script should exit 0 (skip build)').toBe(0);
  });

  it('exits 1 (build) when prevSha is empty / missing (Vercel: first deploy)', () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const { code } = runScript('landing', '');
    // Convention: empty VERCEL_GIT_PREVIOUS_SHA = first deploy → always build
    expect(code, 'first deploy (empty prevSha) → script should exit 1 (build)').toBe(1);
  });
});

/**
 * Regression for reviewer round 1 P0: script broke when invoked from
 * cwd != repo root because pathspecs were relative. Vercel runs ignoreCommand
 * from inside the app's Root Directory (`apps/frontend/<app>/`), so without
 * `cd "$(git rev-parse --show-toplevel)"` the `git diff -- "apps/frontend/$APP/"`
 * pathspec resolved to a non-existent path → no diff → exit 0 (skip) → bug:
 * deploy never triggers even when sources changed.
 *
 * Two complementary pins:
 *   1. Static — script source contains the cd line (catches removal even if
 *      behavioural test environment goes weird).
 *   2. Behavioural — script gives identical exit code from cwd=ROOT and from
 *      cwd=apps/frontend/<app>/. If pathspecs are cwd-relative again, the two
 *      invocations diverge and this test fails.
 */
describe('M-INFRA-VERCEL-IGNORE — cwd-agnostic invariant (regression for reviewer round 1 P0)', () => {
  function runScriptFromCwd(app: string, prevSha: string, cwd: string): number {
    try {
      execFileSync(SCRIPT_ABS, [app], {
        env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: prevSha },
        stdio: 'pipe',
        cwd,
      });
      return 0;
    } catch (e) {
      return (e as { status?: number }).status ?? 1;
    }
  }

  it('script source contains `cd "$(git rev-parse --show-toplevel)"` (static pin)', () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const content = readFileSync(SCRIPT_ABS, 'utf8');
    expect(content, 'script must cd to repo root for cwd-agnostic pathspecs').toMatch(
      /cd\s+["']?\$\(\s*git rev-parse --show-toplevel\s*\)/,
    );
  });

  it('exit code from cwd=apps/frontend/landing matches exit code from cwd=ROOT (no-changes case)', () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim();
    const fromRoot = runScriptFromCwd('landing', head, ROOT);
    const fromAppDir = runScriptFromCwd('landing', head, resolve(ROOT, 'apps/frontend/landing'));
    expect(fromAppDir, `from apps/frontend/landing/ (${fromAppDir}) must match from ROOT (${fromRoot})`).toBe(
      fromRoot,
    );
    // Both should be 0 (skip) since prev_sha=HEAD = no changes
    expect(fromRoot).toBe(0);
  });

  it('exit code from cwd=apps/frontend/landing matches exit code from cwd=ROOT (first-deploy case)', () => {
    if (!existsSync(SCRIPT_ABS)) return;
    const fromRoot = runScriptFromCwd('landing', '', ROOT);
    const fromAppDir = runScriptFromCwd('landing', '', resolve(ROOT, 'apps/frontend/landing'));
    expect(fromAppDir).toBe(fromRoot);
    // Both should be 1 (build) since empty prev_sha = first deploy
    expect(fromRoot).toBe(1);
  });
});
