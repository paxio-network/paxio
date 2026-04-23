/**
 * @paxio/auth — Privy provider + DID helpers + SIWE.
 *
 * Pattern:
 * - <PaxioPrivyProvider appId={...}> wraps app root
 * - useUser() → Privy user object
 * - useDid() → 'did:paxio:0x...' from signed session
 *
 * Stubs until M01c — implementation requires PRIVY_APP_ID env vars.
 */

// Privy provider stub (SSR-safe — 'use client' on real impl)
export function PaxioPrivyProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Auth hooks — stubs
export function useUser() {
  return { user: null, isLoading: true };
}

export function useDid(): string {
  return 'did:paxio:pending';
}

// DID helpers — pure functions, no side effects
export function formatDid(did: string, chars = 6): string {
  if (did.length <= chars * 2 + 13) return did;
  return `${did.slice(0, chars + 13)}…${did.slice(-chars)}`;
}

export function parseDid(did: string): { method: string; id: string } | null {
  const match = did.match(/^did:([^:]+):(.+)$/);
  if (!match) return null;
  return { method: match[1], id: match[2] };
}