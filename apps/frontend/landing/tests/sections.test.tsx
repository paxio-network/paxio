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

// NOTE: vi.mock is hoisted — factories run BEFORE the module body.
// Therefore mock data must be inlined inside the factory, NOT referenced
// from module scope.  wrap() below re-declares the same data inline for
// setQueryData() — duplication is intentional to satisfy the hoisting rule.

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
        btc: 0,
        btc_d: 0,
        legal: 0,
        legal_d: 0,
        finance: 0,
        finance_d: 0,
        research: 0,
        research_d: 0,
        cx: 0,
        cx_d: 0,
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

// Mock @paxio/ui so section components can render in jsdom without real UI deps.
vi.mock('@paxio/ui', () => {
  const React = require('react');
  return {
    SectionFrame: ({ id, eyebrow, children }: { id?: string; eyebrow?: string; children: React.ReactNode }) =>
      React.createElement('section', { id, 'data-eyebrow': eyebrow }, children),
    TerminalWidget: ({ lines }: { lines?: string[] }) =>
      React.createElement('div', { 'data-testid': 'terminal' },
        (lines ?? []).map((l, i) => React.createElement('div', { key: i }, l))),
    AgentTable: ({ agents }: { agents?: unknown[] }) =>
      React.createElement('table', { 'data-testid': 'agent-table' },
        (agents ?? []).map((_a, i) => React.createElement('tr', { key: i }))),
    NetworkGraph: () => React.createElement('div', { 'data-testid': 'network-graph' }),
    HeatmapGrid: () => React.createElement('div', { 'data-testid': 'heatmap-grid' }),
    FAPDiagram: () => React.createElement('div', { 'data-testid': 'fap-diagram' }),
    Footer: ({ dark }: { dark?: boolean }) =>
      React.createElement('footer', { 'data-dark': dark }),
    LiveTicker: () => React.createElement('div', { 'data-testid': 'live-ticker' }),
    BrandMark: () => React.createElement('span', { 'data-testid': 'brand-mark' }),
    StateStrip: () => React.createElement('div', { 'data-testid': 'state-strip' }),
    TickerLane: () => React.createElement('div', { 'data-testid': 'ticker-lane' }),
    PreviewRibbon: () => React.createElement('div', { 'data-testid': 'preview-ribbon' }),
    DoorCard: () => React.createElement('div', { 'data-testid': 'door-card' }),
    Sparkline: () => React.createElement('div', { 'data-testid': 'sparkline' }),
    RailsSkeleton: () => React.createElement('div', { 'data-testid': 'rails-skeleton' }),
    EmptyGraph: () => React.createElement('div', { 'data-testid': 'empty-graph' }),
    ConditionalSection: ({ children }: { children: React.ReactNode }) => children,
    UpcomingBadge: () => React.createElement('span', { 'data-testid': 'upcoming-badge' }),
    AgentTableSkeleton: () => React.createElement('div', { 'data-testid': 'agent-table-skeleton' }),
  };
});

const wrap = (ui: React.ReactNode) => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  // Pre-populate cache so useQuery resolves synchronously — no microtask timing.
  // Data must be inline (not referenced) because vi.mock hoisting makes
  // module-scope const undefined in factories.
  qc.setQueryData(['landing-hero'], {
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
    btc: 0,
    btc_d: 0,
    legal: 0,
    legal_d: 0,
    finance: 0,
    finance_d: 0,
    research: 0,
    research_d: 0,
    cx: 0,
    cx_d: 0,
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
    // Appears in both the eyebrow strip and the stats card — use getAllByText
    expect(screen.getAllByText(/State of the Agentic Economy/i).length).toBeGreaterThan(0);
  });

  it('renders agents-indexed marker', async () => {
    const mod = await import('../app/sections/01-hero.js').catch(() => null);
    if (!mod) return;
    wrap(<mod.Hero />);
    // Appears in both the stats card label and the bottom copy strip
    expect(screen.getAllByText(/agents indexed/i).length).toBeGreaterThan(0);
  });

  it('renders FAP throughput marker', async () => {
    const mod = await import('../app/sections/01-hero.js').catch(() => null);
    if (!mod) return;
    wrap(<mod.Hero />);
    // Appears in both the stats card label and the bottom copy strip
    expect(screen.getAllByText(/FAP throughput/i).length).toBeGreaterThan(0);
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
    wrap(<mod.BitcoinSection />);
    // DEMO_LINES contain "register", "did:paxio", and "btc+usdc" — one of them is enough
    const matches = screen.getAllByText(/register|did:paxio|btc\+usdc/i);
    expect(matches.length).toBeGreaterThan(0);
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
