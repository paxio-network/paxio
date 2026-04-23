/**
 * M01b Frontend Bootstrap — RED test spec.
 * Architecture spec: `docs/sprints/M01b-frontend-bootstrap.md`.
 *
 * This test is a SPECIFICATION — architect writes, dev implements to GREEN.
 * MUST NOT modify to make implementation pass.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

const FRONTEND_APPS = [
  'landing',
  'registry',
  'pay',
  'radar',
  'intel',
  'docs',
  'wallet',
  'fleet',
] as const;

const FRONTEND_PACKAGES = ['ui', 'hooks', 'api-client', 'auth'] as const;

// App → expected accent color token (from M01b spec table)
const APP_ACCENT: Record<(typeof FRONTEND_APPS)[number], string> = {
  landing: '#0F3460',
  registry: '#0F766E',
  pay: '#533483',
  radar: '#533483',
  intel: '#533483',
  docs: '#1A1A2E',
  wallet: '#1E3A5F',
  fleet: '#1A1A2E',
};

describe('M01b Frontend Bootstrap', () => {
  describe('8 frontend app directories', () => {
    for (const app of FRONTEND_APPS) {
      const appDir = join(ROOT, 'apps', 'frontend', app);

      it(`apps/frontend/${app}/ exists as directory`, () => {
        expect(existsSync(appDir), `apps/frontend/${app}/ does not exist`).toBe(true);
      });

      it(`apps/frontend/${app}/package.json exists`, () => {
        const pkg = join(appDir, 'package.json');
        expect(existsSync(pkg), `apps/frontend/${app}/package.json not found`).toBe(true);
      });

      it(`apps/frontend/${app}/package.json contains @paxio/ui dependency`, () => {
        const pkg = join(appDir, 'package.json');
        const content: string = readFileSync(pkg, 'utf-8');
        const parsed = JSON.parse(content);
        const deps = { ...parsed.dependencies, ...parsed.devDependencies };
        expect(
          deps['@paxio/ui'],
          `apps/frontend/${app}/package.json missing @paxio/ui dependency`,
        ).toBeTruthy();
      });

      it(`apps/frontend/${app}/app/page.tsx exists`, () => {
        const page = join(appDir, 'app', 'page.tsx');
        expect(existsSync(page), `apps/frontend/${app}/app/page.tsx not found`).toBe(true);
      });

      it(`apps/frontend/${app}/app/layout.tsx exists`, () => {
        const layout = join(appDir, 'app', 'layout.tsx');
        expect(existsSync(layout), `apps/frontend/${app}/app/layout.tsx not found`).toBe(true);
      });

      it(`apps/frontend/${app}/app/globals.css exists`, () => {
        const css = join(appDir, 'app', 'globals.css');
        expect(existsSync(css), `apps/frontend/${app}/app/globals.css not found`).toBe(true);
      });

      it(`apps/frontend/${app}/next.config.ts exists`, () => {
        const nextConfig = join(appDir, 'next.config.ts');
        expect(existsSync(nextConfig), `apps/frontend/${app}/next.config.ts not found`).toBe(true);
      });

      it(`apps/frontend/${app}/tsconfig.json exists`, () => {
        const tsconfig = join(appDir, 'tsconfig.json');
        expect(existsSync(tsconfig), `apps/frontend/${app}/tsconfig.json not found`).toBe(true);
      });

      it(`apps/frontend/${app}/tailwind.config.ts exists`, () => {
        const tailwind = join(appDir, 'tailwind.config.ts');
        expect(existsSync(tailwind), `apps/frontend/${app}/tailwind.config.ts not found`).toBe(true);
      });

      it(`apps/frontend/${app}/public/favicon.svg exists`, () => {
        const favicon = join(appDir, 'public', 'favicon.svg');
        expect(existsSync(favicon), `apps/frontend/${app}/public/favicon.svg not found`).toBe(true);
      });

      it(`apps/frontend/${app}/app/globals.css sets --color-accent to ${APP_ACCENT[app]}`, () => {
        const css = join(appDir, 'app', 'globals.css');
        const content: string = readFileSync(css, 'utf-8');
        expect(
          content.includes(`--color-accent: ${APP_ACCENT[app]}`),
          `apps/frontend/${app}/app/globals.css missing --color-accent: ${APP_ACCENT[app]}`,
        ).toBe(true);
      });
    }
  });

  describe('4 shared frontend packages', () => {
    for (const pkg of FRONTEND_PACKAGES) {
      const pkgDir = join(ROOT, 'packages', pkg);

      it(`packages/${pkg}/ exists as directory`, () => {
        expect(existsSync(pkgDir), `packages/${pkg}/ does not exist`).toBe(true);
      });

      it(`packages/${pkg}/package.json exists`, () => {
        const pkgJson = join(pkgDir, 'package.json');
        expect(existsSync(pkgJson), `packages/${pkg}/package.json not found`).toBe(true);
      });

      it(`packages/${pkg}/package.json name is @paxio/${pkg}`, () => {
        const content: string = readFileSync(join(pkgDir, 'package.json'), 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed.name, `packages/${pkg}/package.json name should be @paxio/${pkg}`).toBe(
          `@paxio/${pkg}`,
        );
      });

      it(`packages/${pkg}/tsconfig.json exists`, () => {
        const tsconfig = join(pkgDir, 'tsconfig.json');
        expect(existsSync(tsconfig), `packages/${pkg}/tsconfig.json not found`).toBe(true);
      });

      it(`packages/${pkg}/src/index.ts exists`, () => {
        const index = join(pkgDir, 'src', 'index.ts');
        expect(existsSync(index), `packages/${pkg}/src/index.ts not found`).toBe(true);
      });
    }
  });

  describe('@paxio/ui tokens', () => {
    it('packages/ui/src/tokens.ts exports design tokens', () => {
      const tokens = join(ROOT, 'packages', 'ui', 'src', 'tokens.ts');
      expect(existsSync(tokens), 'packages/ui/src/tokens.ts not found').toBe(true);
      const content: string = readFileSync(tokens, 'utf-8');
      // Should contain all required color tokens per M01b spec
      const required = [
        'primary',
        'dark',
        'accent',
        'teal',
        'red',
        'bitcoin',
        'navy',
        'green',
        'amber',
      ];
      for (const token of required) {
        expect(
          content.includes(token),
          `tokens.ts missing color token: ${token}`,
        ).toBe(true);
      }
    });

    it('packages/ui/src/tokens.ts contains primary #0F3460', () => {
      const tokens = join(ROOT, 'packages', 'ui', 'src', 'tokens.ts');
      const content: string = readFileSync(tokens, 'utf-8');
      expect(content.includes('#0F3460')).toBe(true);
    });

    it('packages/ui/src/tokens.ts contains accent #533483', () => {
      const tokens = join(ROOT, 'packages', 'ui', 'src', 'tokens.ts');
      const content: string = readFileSync(tokens, 'utf-8');
      expect(content.includes('#533483')).toBe(true);
    });
  });

  describe('pnpm-workspace.yaml includes all new paths', () => {
    it('includes apps/frontend/*', () => {
      const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf-8');
      expect(yaml.includes('apps/frontend/*')).toBe(true);
    });
  });

  describe('turbo.json has dev task', () => {
    it('turbo.json defines dev pipeline task', () => {
      const turboRaw = readFileSync(join(ROOT, 'turbo.json'), 'utf-8');
      const turbo = JSON.parse(turboRaw);
      expect(turbo.tasks.dev, 'turbo.json missing tasks.dev').toBeTruthy();
      expect(turbo.tasks.dev.cache, 'turbo.json tasks.dev.cache should be false').toBe(false);
      expect(turbo.tasks.dev.persistent, 'turbo.json tasks.dev.persistent should be true').toBe(true);
    });
  });
});
