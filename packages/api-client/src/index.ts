/**
 * @paxio/api-client — Typed REST + WebSocket client.
 * Consumes Zod schemas from @paxio/types.
 *
 * Usage:
 *   import { paxioClient } from '@paxio/api-client';
 *   const agents = await paxioClient.landing.getTopAgents(20);
 */

import type {
  AgentPreview,
  HeatGrid,
  HeroState,
  NetworkSnapshot,
  RailInfo,
  TickerLane,
} from '@paxio/types';

const BASE_URL = (
  typeof globalThis !== 'undefined'
    ? (globalThis as { env?: { NEXT_PUBLIC_API_URL?: string } }).env?.NEXT_PUBLIC_API_URL
    : undefined
) ?? (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ?? 'https://api.paxio.network';

const fetchJson = <T>(path: string, init?: RequestInit): Promise<T> =>
  fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<T>; });

export const paxioClient = {
  landing: {
    getTicker: () => fetchJson<TickerLane[]>('/api/landing/ticker'),
    getHero: () => fetchJson<HeroState>('/api/landing/hero'),
    getLanding: () => fetchJson('/api/landing'),
    getTopAgents: (limit = 20) => fetchJson<AgentPreview[]>(`/api/landing/agents/top?limit=${limit}`),
    getRails: () => fetchJson<RailInfo[]>('/api/landing/rails'),
    getNetworkSnapshot: () => fetchJson<NetworkSnapshot>('/api/landing/network/snapshot'),
    getHeatmap: () => fetchJson<HeatGrid>('/api/landing/heatmap'),
  },
  registry: {
    count: () => fetchJson('/api/registry/count'),
    find: (_query: unknown) => fetchJson('/api/registry/find'),
    resolve: (did: string) => fetchJson(`/api/registry/resolve?did=${encodeURIComponent(did)}`),
  },
  wallet: {
    getBalance: (agentDid: string) => fetchJson(`/api/wallet/balance?agentDid=${encodeURIComponent(agentDid)}`),
    getTransactions: (agentDid: string) => fetchJson(`/api/wallet/transactions?agentDid=${encodeURIComponent(agentDid)}`),
  },
  guard: {
    check: (agentDid: string) => fetchJson(`/api/guard/check?agentDid=${encodeURIComponent(agentDid)}`),
    getThreatLog: (agentDid: string) => fetchJson(`/api/guard/threat-log?agentDid=${encodeURIComponent(agentDid)}`),
  },
} as const;