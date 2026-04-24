/**
 * M-L0 RED spec — Progressive Reveal pattern in @paxio/ui.
 *
 * The landing (paxio.network) renders many sections (Security, FAP share,
 * NetworkGraph, Heatmap) that will sit at zero-state for weeks/months while
 * upstream dependencies land (Guard from a3ka team, agent registrations,
 * FAP routing, etc.). We refuse the choice between (a) showing an empty
 * grid that looks broken or (b) faking data.
 *
 * Progressive Reveal = sections render ONLY when they have non-zero data.
 * Honest, grows organically as the product ships. Pattern:
 *
 *   <ConditionalSection show={data && data.length > 0}>
 *     <FAPDiagram rails={data} />
 *   </ConditionalSection>
 *
 * Optional fallback for intermediate state ("launching soon"):
 *
 *   <ConditionalSection
 *     show={attacks24 > 0}
 *     fallback={<UpcomingBadge label="Launching with Guard v1" />}
 *   >
 *     <Heatmap grid={...} />
 *   </ConditionalSection>
 *
 * This spec stays RED until frontend-dev extracts `<ConditionalSection>` +
 * `<UpcomingBadge>` into @paxio/ui and wraps the 4 zero-state-prone landing
 * sections (Security, FAPDiagram share, NetworkGraph, Heatmap).
 *
 * Runtime rendering tests go in packages/ui/tests/conditional-section.test.tsx
 * (frontend-dev's scope — jsdom environment). This spec is source-level
 * (file + export existence) to stay in architect territory + keep
 * pnpm test:specs fast (no DOM needed).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const UI_SRC = join(process.cwd(), 'packages/ui/src');
const UI_TESTS = join(process.cwd(), 'packages/ui/tests');
const CONDITIONAL = join(UI_SRC, 'ConditionalSection.tsx');
const UPCOMING = join(UI_SRC, 'UpcomingBadge.tsx');
const UI_INDEX = join(UI_SRC, 'index.tsx');
const CONDITIONAL_TEST = join(UI_TESTS, 'conditional-section.test.tsx');
const UPCOMING_TEST = join(UI_TESTS, 'upcoming-badge.test.tsx');

describe('M-L0 — Progressive Reveal pattern files exist', () => {
  it('packages/ui/src/ConditionalSection.tsx exists', () => {
    expect(existsSync(CONDITIONAL)).toBe(true);
  });

  it('packages/ui/src/UpcomingBadge.tsx exists', () => {
    expect(existsSync(UPCOMING)).toBe(true);
  });

  it('packages/ui/tests/conditional-section.test.tsx exists (runtime tests)', () => {
    expect(existsSync(CONDITIONAL_TEST)).toBe(true);
  });

  it('packages/ui/tests/upcoming-badge.test.tsx exists (runtime tests)', () => {
    expect(existsSync(UPCOMING_TEST)).toBe(true);
  });
});

describe('M-L0 — component signatures (source-level)', () => {
  it('ConditionalSection exports a function/component', () => {
    if (!existsSync(CONDITIONAL)) return;
    const src = readFileSync(CONDITIONAL, 'utf8');
    // Either `export function ConditionalSection` or `export const ConditionalSection = `
    const hasExport =
      /export\s+function\s+ConditionalSection\s*\(/.test(src) ||
      /export\s+const\s+ConditionalSection\s*[:=]/.test(src);
    expect(hasExport).toBe(true);
  });

  it('ConditionalSection accepts `show` prop', () => {
    if (!existsSync(CONDITIONAL)) return;
    const src = readFileSync(CONDITIONAL, 'utf8');
    expect(src).toMatch(/show\s*:\s*boolean/);
  });

  it('ConditionalSection accepts optional `fallback` prop', () => {
    if (!existsSync(CONDITIONAL)) return;
    const src = readFileSync(CONDITIONAL, 'utf8');
    expect(src).toMatch(/fallback\?\s*:/);
  });

  it('UpcomingBadge exports a function/component', () => {
    if (!existsSync(UPCOMING)) return;
    const src = readFileSync(UPCOMING, 'utf8');
    const hasExport =
      /export\s+function\s+UpcomingBadge\s*\(/.test(src) ||
      /export\s+const\s+UpcomingBadge\s*[:=]/.test(src);
    expect(hasExport).toBe(true);
  });

  it('UpcomingBadge accepts `label` prop', () => {
    if (!existsSync(UPCOMING)) return;
    const src = readFileSync(UPCOMING, 'utf8');
    expect(src).toMatch(/label\s*:\s*string/);
  });
});

describe('M-L0 — @paxio/ui barrel exports', () => {
  it('packages/ui/src/index.tsx re-exports ConditionalSection', () => {
    if (!existsSync(UI_INDEX)) return;
    const src = readFileSync(UI_INDEX, 'utf8');
    expect(src).toMatch(/ConditionalSection/);
  });

  it('packages/ui/src/index.tsx re-exports UpcomingBadge', () => {
    if (!existsSync(UI_INDEX)) return;
    const src = readFileSync(UI_INDEX, 'utf8');
    expect(src).toMatch(/UpcomingBadge/);
  });
});

describe('M-L0 — purity invariant (no fetch/setInterval inside components)', () => {
  const files = [CONDITIONAL, UPCOMING].filter((f) => existsSync(f));

  describe.each(files.map((f) => ({ path: f, rel: f.slice(process.cwd().length + 1) })))(
    '$rel',
    ({ path }) => {
      const src = existsSync(path) ? readFileSync(path, 'utf8') : '';

      it('does not call fetch()', () => {
        const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        expect(stripped).not.toMatch(/\bfetch\s*\(/);
      });

      it('does not call setInterval()', () => {
        const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        expect(stripped).not.toMatch(/\bsetInterval\s*\(/);
      });

      it('does not call Math.random()', () => {
        const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        expect(stripped).not.toMatch(/Math\.random\s*\(/);
      });

      it('does not call new Date() at module scope', () => {
        const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        // Heuristic: `new Date(` at top of file outside any function is bad.
        // Inside a component body it's acceptable only if wrapped in useMemo
        // with proper deps. Easier to just forbid altogether for these thin
        // components — `show` is the only prop.
        expect(stripped).not.toMatch(/new\s+Date\s*\(/);
      });
    },
  );
});
