// Paxio Curated — manually maintained seed list of verified Paxio agents.
//
// Unlike external-ecosystem sources (ERC-8004, A2A, MCP, …), this source
// is not discovered via HTTP or blockchain. Agents are hand-curated by the
// Paxio team and stored in `products/01-registry/app/data/curated-agents.json`.
//
// Design goals:
//   - Seed data for the registry on first deploy (no live crawl needed)
//   - Quality-tier fallback: curated agents are verified / trusted
//   - DID is pre-committed in the JSON (team-assigned, not derived)
//
// Source name: `paxio-curated`.
//
// Note: `paxio-curated` must be added to the CRAWLER_SOURCES enum in
// `packages/types/src/crawler-source.ts` (architect-owned) before this
// source can be triggered via POST /api/admin/crawl?source=paxio-curated.

import { z } from 'zod';
import {
  type AgentCard,
  type AgentSource,
  type Capability,
  type Did,
  type Result,
  ok,
  err,
} from '@paxio/types';
import type {
  SourceAdapterError,
} from '@paxio/interfaces';

// ---------------------------------------------------------------------------
// Local Zod schema (packages/types is architect-owned — define here)
// ---------------------------------------------------------------------------

export const ZodCuratedAgent = z.object({
  // Full W3C DID URL (e.g. "did:paxio:base:0x...").
  did: z.string().min(1),

  // Human-readable display name.
  name: z.string().min(1).max(200),

  // Optional one-line description.
  description: z.string().max(1000).optional(),

  // Agent's primary capability (Paxio capability taxonomy).
  capability: z.enum(['REGISTRY', 'FACILITATOR', 'WALLET', 'SECURITY', 'INTELLIGENCE']),

  // Optional HTTPS endpoint.
  endpoint: z.string().url().optional(),

  // Semantic version (e.g. "1.0.0").
  version: z.string().min(1).optional(),

  // Attribution URL (e.g. GitHub repo, profile page).
  sourceUrl: z.string().url().optional(),

  // ISO-8601 creation timestamp (optional; epoch zero if absent).
  createdAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'invalid ISO-8601')
    .optional(),
});

export type CuratedAgent = z.infer<typeof ZodCuratedAgent>;

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

export interface PaxioCuratedAdapterDeps {
  /**
   * Absolute path to the curated agents JSON file.
   * Example: `/app/products/01-registry/app/data/curated-agents.json`
   * in the Docker container, or `<repo>/products/01-registry/app/data/curated-agents.json`
   * in local dev.
   */
  readonly curatedAgentsPath: string;

  /**
   * Node.js `fs` module stub — injected so the adapter stays testable without
   * real filesystem access. Tests pass a fake `fs` that returns canned JSON.
   * Production wiring passes `import('node:fs/promises')`.
   */
  readonly fs: {
    readFile(path: string, enc: string): Promise<string>;
  };
}

// SAFETY bound — curated agents list should be small (dozens, not thousands).
// If the JSON grows beyond this, something is wrong upstream.
const SAFETY_MAX_AGENTS = 10_000;

export const createPaxioCuratedAdapter = (
  deps: PaxioCuratedAdapterDeps,
) => {
  const sourceName = 'paxio-curated';

  async function* fetchAgents(): AsyncIterable<CuratedAgent> {
    let raw: string;
    try {
      raw = await deps.fs.readFile(deps.curatedAgentsPath, 'utf-8');
    } catch {
      // File missing / unreadable — end the stream gracefully.
      // runCrawler counts this as a source error.
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Malformed JSON — end the stream.
      return;
    }

    if (!Array.isArray(parsed)) {
      return;
    }

    let yielded = 0;
    for (const entry of parsed as unknown[]) {
      if (yielded >= SAFETY_MAX_AGENTS) break;
      if (typeof entry === 'object' && entry !== null) {
        yield entry as CuratedAgent;
        yielded += 1;
      }
    }
  }

  const toCanonical = (
    raw: CuratedAgent,
  ): Result<AgentCard, SourceAdapterError> => {
    const parsed = ZodCuratedAgent.safeParse(raw);
    if (!parsed.success) {
      return err({
        code: 'parse_error',
        message: parsed.error.issues[0]?.message ?? 'invalid curated agent',
        raw,
      });
    }

    const r = parsed.data;
    const card: AgentCard = {
      did: r.did as Did,
      name: r.name,
      ...(r.description !== undefined ? { description: r.description } : {}),
      capability: r.capability as Capability,
      ...(r.endpoint !== undefined ? { endpoint: r.endpoint } : {}),
      version: r.version ?? '0.0.1',
      createdAt: r.createdAt ?? '1970-01-01T00:00:00.000Z',
      source: sourceName as AgentSource,
      externalId: r.did,
      ...(r.sourceUrl !== undefined ? { sourceUrl: r.sourceUrl } : {}),
    };
    return ok(card);
  };

  return Object.freeze({
    sourceName,
    fetchAgents,
    toCanonical,
  });
};
