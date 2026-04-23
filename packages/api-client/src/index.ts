/**
 * @paxio/api-client — Typed REST + WebSocket client.
 * Consumes Zod schemas from @paxio/types.
 *
 * Usage:
 *   import { paxioClient } from '@paxio/api-client';
 *   const agents = await paxioClient.landing.getTopAgents(20);
 */

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
    getTicker: () => fetchJson('/api/landing/ticker'),
    getHero: () => fetchJson('/api/landing/hero'),
    getLanding: () => fetchJson('/api/landing/landing'),
    getTopAgents: (limit = 20) => fetchJson(`/api/landing/agents/top?limit=${limit}`),
    getRails: () => fetchJson('/api/landing/rails'),
    getNetworkSnapshot: () => fetchJson('/api/landing/network/snapshot'),
    getHeatmap: () => fetchJson('/api/landing/heatmap'),
  },
  registry: {
    count: () => fetchJson('/api/registry/count'),
    find: (_query: unknown) => fetchJson('/api/registry/find'),
    resolve: (did: string) => fetchJson(`/api/registry/resolve?did=${encodeURIComponent(did)}`),
  },
} as const;