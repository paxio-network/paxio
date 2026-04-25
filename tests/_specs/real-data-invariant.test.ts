/**
 * TD-12 RED spec — Real Data Invariant (frontend-rules.md P0).
 *
 * Violations recorded by reviewer in commit 8db9315 (M01c Landing):
 *   (a) apps/frontend/landing/app/sections/04-pay.tsx — DEFAULT_RAILS with
 *       hardcoded fake fees ('0.18%', '0.10%', '1.9%+$0.30', 'flat sat fee').
 *       `data ?? DEFAULT_RAILS` fallback means if backend returns [] the user
 *       sees fake "Paxio FAP · 0.18%" that reads as real share data.
 *   (b) apps/frontend/landing/app/sections/05-network.tsx — emptySnapshot()
 *       generates 20 seeded-random Agent-01..Agent-20 nodes when data is
 *       undefined. `data ?? emptySnapshot()` presents a populated-looking
 *       network graph that has no basis in reality.
 *
 * Rule .claude/rules/frontend-rules.md::Real Data Invariant forbids:
 *   - Math.random() in render
 *   - Hardcoded "looks real" numbers / labels
 *   - Mock data imports in production components
 *
 * Correct pattern (already used in 06-doors.tsx):
 *   data?.length ? <Component data={data} /> : <Skeleton />
 *
 * This spec goes GREEN when both sections render skeleton/empty states
 * instead of hardcoded fallbacks.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAY_PATH = join(
  process.cwd(),
  'apps/frontend/landing/app/sections/04-pay.tsx',
);
const NETWORK_PATH = join(
  process.cwd(),
  'apps/frontend/landing/app/sections/05-network.tsx',
);

describe('TD-12 — Real Data Invariant (no hardcoded fallbacks)', () => {
  describe('04-pay.tsx', () => {
    const src = readFileSync(PAY_PATH, 'utf8');

    it('does NOT declare DEFAULT_RAILS with hardcoded rail objects', () => {
      expect(src).not.toMatch(/const\s+DEFAULT_RAILS\s*:\s*RailInfo\[\]/);
      expect(src).not.toMatch(/DEFAULT_RAILS\s*=\s*\[/);
    });

    it('does NOT contain hardcoded fee_description literals', () => {
      // These specific strings were called out by reviewer in TD-12.
      expect(src).not.toMatch(/'0\.18%'/);
      expect(src).not.toMatch(/'0\.10%'/);
      expect(src).not.toMatch(/'1\.9%\+\$0\.30'/);
      expect(src).not.toMatch(/'flat sat fee'/);
    });

    it('does NOT contain hardcoded rail names as string literals', () => {
      // Rail names must come from the API response (RailInfo[] from backend),
      // not be typed in the component.
      expect(src).not.toMatch(/'Paxio FAP'/);
      expect(src).not.toMatch(/'Coinbase x402'/);
      expect(src).not.toMatch(/'Skyfire'/);
      expect(src).not.toMatch(/name:\s*'BTC L1'/);
    });

    it('does NOT use `data ?? <hardcoded constant>` fallback pattern', () => {
      // Any `?? DEFAULT_RAILS`, `?? MOCK_`, `?? fakeRails()` — banned.
      expect(src).not.toMatch(/\?\?\s*DEFAULT_RAILS/);
      expect(src).not.toMatch(/\?\?\s*MOCK_/);
      expect(src).not.toMatch(/\?\?\s*fake[A-Z]/);
    });

    it('renders skeleton OR empty state when data is absent (conditional on length)', () => {
      // Expected pattern: `data?.length ? <FAPDiagram ... /> : <Skeleton />`
      // or `data && data.length > 0 ? ... : ...`
      // or `(data ?? []).length === 0 ? <Skeleton /> : <FAPDiagram>`
      // We require AT LEAST ONE of these branching patterns.
      const hasLengthBranch =
        /data\?\.length\s*\?/.test(src) ||
        /data\s*&&\s*data\.length\s*>\s*0\s*\?/.test(src) ||
        /data\.length\s*===\s*0/.test(src) ||
        /\(data\s*\?\?\s*\[\]\)\.length/.test(src);
      expect(hasLengthBranch).toBe(true);
    });
  });

  describe('05-network.tsx', () => {
    const src = readFileSync(NETWORK_PATH, 'utf8');

    it('does NOT declare emptySnapshot() / mockSnapshot() function', () => {
      expect(src).not.toMatch(/function\s+emptySnapshot\s*\(/);
      expect(src).not.toMatch(/function\s+mockSnapshot\s*\(/);
      expect(src).not.toMatch(/const\s+emptySnapshot\s*=/);
    });

    it('does NOT generate fake Agent-NN nodes', () => {
      // reviewer called this out specifically: `Agent-${String(i + 1).padStart...}`
      expect(src).not.toMatch(/`Agent-\$\{/);
      expect(src).not.toMatch(/'Agent-01'/);
      expect(src).not.toMatch(/'Agent-20'/);
    });

    it('does NOT call seededRandom() in the file scope', () => {
      // seededRandom was imported-or-defined solely to feed emptySnapshot.
      // After fix, seeded random has no place in Network section.
      expect(src).not.toMatch(/seededRandom\s*\(/);
    });

    it('does NOT contain new Date().toISOString() in render path', () => {
      // engineering-principles §6: render must be pure. `new Date()` in render
      // is impure (non-deterministic). If server time is needed, it must come
      // from useQuery data, not from render.
      // This grep is a heuristic — it's okay if `new Date()` appears in a
      // non-render utility, but emptySnapshot() is exactly render-path.
      const snapshotFnBlock = src.match(
        /function\s+\w*[Ss]napshot[^{]*\{[\s\S]*?\}/,
      );
      if (snapshotFnBlock) {
        expect(snapshotFnBlock[0]).not.toMatch(/new\s+Date\s*\(/);
      }
    });

    it('does NOT use `data ?? <generated snapshot>` fallback', () => {
      expect(src).not.toMatch(/\?\?\s*emptySnapshot\s*\(/);
      expect(src).not.toMatch(/\?\?\s*mockSnapshot\s*\(/);
      expect(src).not.toMatch(/\?\?\s*fake[A-Z][\w]*Snapshot/);
    });

    it('renders empty graph OR skeleton when data has no nodes', () => {
      const hasEmptyBranch =
        /data\s*&&\s*data\.nodes\.length\s*>\s*0\s*\?/.test(src) ||
        /data\?\.nodes\.length\s*\?/.test(src) ||
        /nodes\.length\s*===\s*0/.test(src) ||
        /<EmptyGraph/.test(src) ||
        /<NetworkGraphSkeleton/.test(src);
      expect(hasEmptyBranch).toBe(true);
    });
  });

  describe('cross-file grep', () => {
    const pay = readFileSync(PAY_PATH, 'utf8');
    const network = readFileSync(NETWORK_PATH, 'utf8');
    const combined = pay + '\n' + network;

    it('neither file declares DEFAULT_* or emptySnapshot symbols', () => {
      // Hard grep from reviewer's acceptance criteria:
      //   "grep DEFAULT_RAILS\|emptySnapshot in apps/frontend/landing/app/sections/
      //    → zero matches"
      expect(combined.match(/\bDEFAULT_RAILS\b/g) ?? []).toHaveLength(0);
      expect(combined.match(/\bemptySnapshot\b/g) ?? []).toHaveLength(0);
    });
  });
});
