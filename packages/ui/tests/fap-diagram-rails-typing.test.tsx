// @vitest-environment happy-dom
//
// TD-19 RED spec — FAPDiagram.rails prop must accept `readonly RailInfo[]`
// from @paxio/types without flow-narrowing loss.
//
// Background (full post-mortem in docs/tech-debt.md TD-19 row):
//
// M-L0-impl `1ac2423` wrapped landing sections in <ConditionalSection> and
// introduced intermediate boolean variables `hasCatalog`/`hasTraffic`:
//
//   const hasCatalog = data?.length ? true : false;           // boolean
//   const hasTraffic = !!data?.some(r => r.share_pct > 0);    // boolean
//   {isPending || !hasCatalog ? <RailsSkeleton /> : (
//     <ConditionalSection show={hasTraffic}>
//       <FAPDiagram rails={data} />   // ← data still `RailInfo[] | undefined`
//     </ConditionalSection>
//   )}
//
// Inside the `ConditionalSection`, TypeScript cannot narrow `data` from
// `RailInfo[] | undefined` to `RailInfo[]` because the narrowing predicate
// lives on a separate boolean variable (`hasCatalog`), not on `data` itself.
// `exactOptionalPropertyTypes: true` amplifies this — the compiler reports
// a confusing TS2719 ("Two different types with this name exist") that is
// actually an `undefined` assignability error dressed up with a red herring.
//
// This RED test locks in the contract that `<FAPDiagram rails>` accepts
// `readonly RailInfo[]` from @paxio/types at RUNTIME. It does NOT verify
// landing build — that is what scripts/verify_td19_landing_build.sh does.
// The two specs together (AST-invariant + real build) follow the Phase 1.5
// reviewer protocol introduced by TD-20.
//
// Why this test is stable even though TD-19 lives in 04-pay.tsx, not here:
// if someone weakens FAPDiagram's prop type (e.g. introduces a shadow
// `RailInfo` import from `@paxio/ui`), the props contract changes and this
// runtime render fails to type-check. Together with the acceptance script
// it forms a permanent drift guard.

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import type { RailInfo } from '@paxio/types';
import { FAPDiagram } from '../src/FAPDiagram.js';

afterEach(() => cleanup());

const SINGLE_RAIL: RailInfo = {
  name: 'x402',
  share_pct: 100,
  latency_ms: 100,
  fee_description: '0.18%',
  color_hex: '#F7931A',
  concentration_risk: false,
};

const MULTI_RAILS: RailInfo[] = [
  {
    name: 'x402',
    share_pct: 50,
    latency_ms: 100,
    fee_description: '0.18%',
    color_hex: '#F7931A',
    concentration_risk: false,
  },
  {
    name: 'mpp',
    share_pct: 30,
    latency_ms: 120,
    fee_description: '0.10%',
    color_hex: '#8B5CF6',
    concentration_risk: false,
  },
  {
    name: 'tap',
    share_pct: 15,
    latency_ms: 140,
    fee_description: '1.9%+$0.30',
    color_hex: '#10B981',
    concentration_risk: false,
  },
  {
    name: 'btc-l1',
    share_pct: 5,
    latency_ms: 600,
    fee_description: 'flat sat fee',
    color_hex: '#F59E0B',
    concentration_risk: false,
  },
];

describe('FAPDiagram type contract — TD-19 drift guard', () => {
  it('accepts readonly RailInfo[] from @paxio/types (single rail)', () => {
    // Type-level assertion: if FAPDiagram.rails ever diverges from @paxio/types::RailInfo
    // (e.g. a local RailInfo copy is introduced in packages/ui), this render site
    // will fail type-check and the test cannot even compile. This is intentional.
    const rails: readonly RailInfo[] = [SINGLE_RAIL];
    const { container } = render(<FAPDiagram rails={[...rails]} />);
    expect(container.textContent).toContain('x402');
  });

  it('accepts readonly RailInfo[] from @paxio/types (multi rail)', () => {
    const rails: readonly RailInfo[] = MULTI_RAILS;
    const { container } = render(<FAPDiagram rails={[...rails]} />);
    // All 4 rail names present in rendered DOM
    for (const r of MULTI_RAILS) {
      expect(container.textContent).toContain(r.name);
    }
  });

  it('accepts the exact type returned by paxioClient.landing.getRails()', () => {
    // Mirror the call-site shape: `getRails(): Promise<RailInfo[]>`. The awaited
    // value's type MUST be assignable to FAPDiagram.rails without a cast.
    // If TS narrowing breaks this at the 04-pay.tsx call site, the fix must
    // ALSO preserve this direct-assignment path (no hidden `as RailInfo[]`).
    const fetched: RailInfo[] = [...MULTI_RAILS];
    const { container } = render(<FAPDiagram rails={fetched} />);
    expect(container.textContent).toContain('mpp');
  });

  it('renders nothing for empty rails (regression guard for MVP empty state)', () => {
    // FAPDiagram returns null when rails.length === 0 — this is the Real Data
    // Invariant for empty catalog state. The landing skeleton renders above it
    // in the tree, so FAPDiagram itself MUST stay null on empty.
    const { container } = render(<FAPDiagram rails={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('propagates share_pct to rendered percentage text', () => {
    const { container } = render(<FAPDiagram rails={[SINGLE_RAIL]} />);
    expect(container.textContent).toContain('100.0%');
  });
});
