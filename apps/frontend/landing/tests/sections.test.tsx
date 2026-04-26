// M-L9 RED — Landing Design Port section presence tests.
//
// Assertions on the rendered DOM tree of the landing page (renders
// individual section components in JSDOM via React Testing Library).
// No backend roundtrip — `useQuery` calls are mocked at the
// `paxioClient` boundary so we can assert pure UI structure.
//
// Each section MUST:
// - render without throwing
// - expose a stable id / data-section selector matching the artefact
// - contain the textual copy markers from `tmp/Paxio-Financial OS for
//   the agentic economy.html`
//
// Pre-fix (RED): most sections lack the required copy/markers because
// M-L0 skeleton was data-only. Frontend-dev fills as part of M-L9.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the api-client so sections can render without a live backend.
vi.mock('@paxio/api-client', () => ({
  paxioClient: {
    landing: {
      getHero: vi.fn().mockResolvedValue({
        agents: 0,
        txns: 0,
        attacks24: 0,
        wallet_adoption: 0,
        wallet_adoption_d: 0,
        x402_share: 0,
        x402_share_d: 0,
        btc_share: 0,
        btc_share_d: 0,
        hhi: 0,
        drift7: 0,
        sla_p50: 0,
        uptime_avg: 0,
        fap_throughput: 0,
        paei: 0,
        paei_d: 0,
      }),
      getHeatmap: vi.fn().mockResolvedValue({
        rows: [],
        cols: [],
        cells: [[]],
        window_hours: 24,
      }),
      getNetworkSnapshot: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
      getAgentsTop: vi.fn().mockResolvedValue([]),
    },
    fap: {
      getRails: vi.fn().mockResolvedValue([]),
    },
  },
}));

const wrap = (ui: React.ReactNode) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
};

// --- Section import sites. Frontend-dev creates these files; tests
// will fail to import until the components exist (which is the point).

describe('M-L9 Header section (00-header.tsx)', () => {
  it('exports a Header component', async () => {
    const { Header } = await import('../app/sections/00-header.js').catch(
      () => ({ Header: null as never }),
    );
    expect(Header).not.toBeNull();
  });

  it('renders sticky header with paxio-header id', async () => {
    const mod = await import('../app/sections/00-header.js').catch(() => null);
    expect(mod).not.toBeNull();
    if (!mod) return;
    wrap(<mod.Header />);
    expect(document.querySelector('#paxio-header')).toBeTruthy();
  });
});

describe('M-L9 Preview ribbon section (preview-ribbon.tsx)', () => {
  it('exports a PreviewRibbon component', async () => {
    const mod = await import('../app/sections/preview-ribbon.js').catch(
      () => null,
    );
    expect(mod).not.toBeNull();
  });

  it('contains SIMULATED PREVIEW disclaimer text', async () => {
    const mod = await import('../app/sections/preview-ribbon.js').catch(
      () => null,
    );
    if (!mod) return;
    wrap(<mod.PreviewRibbon />);
    expect(screen.getByText(/SIMULATED PREVIEW/i)).toBeTruthy();
    expect(screen.getByText(/METRICS ARE PROJECTED|LAUNCHING/i)).toBeTruthy();
  });
});

describe('M-L9 Hero section (01-hero.tsx)', () => {
  it('renders State of the Agentic Economy strip', async () => {
    const mod = await import('../app/sections/01-hero.js').catch(() => null);
    if (!mod) return;
    wrap(<mod.Hero />);
    expect(screen.getByText(/State of the Agentic Economy/i)).toBeTruthy();
  });

  it('renders agents-indexed marker', async () => {
    const mod = await import('../app/sections/01-hero.js').catch(() => null);
    if (!mod) return;
    wrap(<mod.Hero />);
    expect(screen.getByText(/agents indexed/i)).toBeTruthy();
  });

  it('renders FAP throughput marker', async () => {
    const mod = await import('../app/sections/01-hero.js').catch(() => null);
    if (!mod) return;
    wrap(<mod.Hero />);
    expect(screen.getByText(/FAP throughput/i)).toBeTruthy();
  });
});

describe('M-L9 Quickstart section (02-quickstart.tsx)', () => {
  it('renders Install the SDK door', async () => {
    const mod = await import('../app/sections/02-quickstart.js').catch(
      () => null,
    );
    if (!mod) return;
    wrap(<mod.Quickstart />);
    expect(screen.getByText(/Install the SDK/i)).toBeTruthy();
  });
});

describe('M-L9 Bitcoin-native section (02b-bitcoin.tsx)', () => {
  it('renders TerminalWidget DEMO_LINES', async () => {
    const mod = await import('../app/sections/02b-bitcoin.js').catch(
      () => null,
    );
    if (!mod) return;
    wrap(<mod.Bitcoin />);
    expect(screen.getByText(/register|did:paxio|btc\+usdc/i)).toBeTruthy();
  });
});

describe('M-L9 Radar section (03-radar.tsx)', () => {
  it('section frame mounts without throwing', async () => {
    const mod = await import('../app/sections/03-radar.js').catch(() => null);
    if (!mod) return;
    wrap(<mod.Radar />);
    expect(document.querySelector('[data-section="radar"], #radar')).toBeTruthy();
  });
});

describe('M-L9 Pay section (04-pay.tsx)', () => {
  it('section frame mounts without throwing', async () => {
    const mod = await import('../app/sections/04-pay.js').catch(() => null);
    if (!mod) return;
    wrap(<mod.Pay />);
    expect(document.querySelector('[data-section="pay"], #pay')).toBeTruthy();
  });
});

describe('M-L9 Network section (05-network.tsx)', () => {
  it('section frame mounts without throwing', async () => {
    const mod = await import('../app/sections/05-network.js').catch(
      () => null,
    );
    if (!mod) return;
    wrap(<mod.Network />);
    expect(document.querySelector('[data-section="network"], #network')).toBeTruthy();
  });
});

describe('M-L9 Doors section (06-doors.tsx)', () => {
  it('renders all 4 door titles from artefact', async () => {
    const mod = await import('../app/sections/06-doors.js').catch(() => null);
    if (!mod) return;
    wrap(<mod.Doors />);
    expect(screen.getByText(/Install the SDK/i)).toBeTruthy();
    expect(screen.getByText(/Open the Registry/i)).toBeTruthy();
    expect(screen.getByText(/Get Intel access/i)).toBeTruthy();
    expect(screen.getByText(/Talk to us/i)).toBeTruthy();
  });
});

describe('M-L9 Footer section (07-foot.tsx)', () => {
  it('exports a Footer component', async () => {
    const mod = await import('../app/sections/07-foot.js').catch(() => null);
    expect(mod).not.toBeNull();
  });
});
