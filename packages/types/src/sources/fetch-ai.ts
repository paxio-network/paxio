import { z } from 'zod';

// Fetch.ai Agentverse — https://agentverse.ai
//
// Schema rewrite (M-L1-T3c, 2026-05-03) — was authored against IMAGINED API.
// Real API verified by curl POST /v1/search/agents:
//
//   POST https://agentverse.ai/v1/search/agents
//   Content-Type: application/json
//   { "search_text":"", "filters":{}, "sort":"relevancy",
//     "direction":"asc", "offset":0, "limit":100 }
//
//   200 OK
//   { "agents": [
//       {
//         "address": "agent1q000e4kxnlv0rwcms3al3vfpaa2fy83x6jtrz79ghfq9d87n79cpwaj8695",
//         "prefix": "test-agent",
//         "name": "HF: silviasapora/ge",
//         "description": "",
//         "readme": "",
//         "protocols": [],
//         "avatar_href": null,
//         "total_interactions": 0,
//         "recent_interactions": 0,
//         "rating": 0.0,
//         "status": "inactive",
//         "unresponsive": false,
//         "type": "hosted",
//         "featured": false,
//         "category": "community",
//         "system_wide_tags": [],
//         "geo_location": null,
//         "handle": null,
//         "domain": null,
//         "metadata": null,
//         "last_updated": "2025-07-02T09:19:17Z",
//         "created_at": "2025-07-02T09:19:17Z",
//         "recent_success_rate": null,
//         "recent_eval_success_rate": null,
//         "owner": "34ee31a80edb390dd0ccc1c12a17918cff09073b6d047932",
//         "recent_verified_interactions": 0,
//         "recent_success_verified_interactions": 0
//       }, ...
//     ]
//   }
//
// Total ~10K agents in API (offset cap 9999, verified 2026-05-03).
//
// The Zod schema below mirrors the RAW API response. Adapter
// `toCanonical(raw) → AgentCard` does projection (snake_case → camelCase,
// status → isOnline, rating × 20 → reputationScore 0..100, etc.).

// Agentverse-hosted agent address (NOT native fetch1 wallet).
// Prefix `agent1` + 50-64 lowercase alphanumeric chars (bech32-like).
// Real production addresses observed up to 59 body chars (65 total length);
// upper bound 64 leaves headroom without admitting obvious garbage.
const AGENTVERSE_ADDRESS = /^agent1[a-z0-9]{50,64}$/;

export const ZodFetchAiAgent = z
  .object({
    // Bech32-like Agentverse address (e.g. "agent1q000e4kx...").
    address: z.string().regex(AGENTVERSE_ADDRESS, 'invalid agentverse address'),

    // Optional namespace prefix (e.g. "test-agent", "hf-bridge", null).
    prefix: z.string().nullable().optional(),

    // Display name. CAN be empty string in real API ("" is common).
    name: z.string().max(200).default(''),

    // About text. Often empty.
    description: z.string().max(5000).default(''),

    // Long-form readme. Often empty.
    readme: z.string().default(''),

    // Supported protocols (e.g. ["chat", "agentchat"]). Often empty.
    protocols: z.array(z.string()).default([]),

    // Avatar URL or null.
    avatar_href: z.string().nullable().optional(),

    // Activity counters.
    total_interactions: z.number().int().nonnegative().default(0),
    recent_interactions: z.number().int().nonnegative().default(0),
    recent_verified_interactions: z.number().int().nonnegative().default(0),
    recent_success_verified_interactions: z.number().int().nonnegative().default(0),

    // Star rating 0..5 (NOT 0..100). Adapter scales to reputation score.
    rating: z.number().nonnegative().default(0),

    // Status string. Observed: "active" | "inactive". Other values tolerated.
    status: z.string().default('inactive'),

    // True when Agentverse marked it unresponsive recently.
    unresponsive: z.boolean().default(false),

    // Hosting type. Observed: "hosted". Other values tolerated.
    type: z.string().default('hosted'),

    // Featured by Agentverse curators.
    featured: z.boolean().default(false),

    // Free-form category ("community", "finance", "trading", ...).
    category: z.string().max(100).default(''),

    // Tags (system-wide).
    system_wide_tags: z.array(z.string()).default([]),

    // Optional metadata fields — preserved as `unknown` (audit log keeps raw).
    geo_location: z.unknown().nullable().optional(),
    handle: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    metadata: z.unknown().nullable().optional(),

    // Timestamps — ISO 8601 strings (NOT Unix ms).
    last_updated: z.string().datetime({ offset: true }).optional(),
    created_at: z.string().datetime({ offset: true }),

    // Success-rate metrics (often null).
    recent_success_rate: z.number().nullable().optional(),
    recent_eval_success_rate: z.number().nullable().optional(),

    // Owner address (hex, no prefix).
    owner: z.string().default(''),
  })
  // Forward-compat: ignore unknown fields (Agentverse may add fields without notice).
  .passthrough();

export type FetchAiAgent = z.infer<typeof ZodFetchAiAgent>;

// Convenience: helpers to derive canonical fields from raw record.
// Adapter uses these in toCanonical projection.

/** Construct Agentverse profile URL from agent address. */
export const fetchAiProfileUrl = (address: string): string =>
  `https://agentverse.ai/agents/details/${address}`;

/** Project rating 0..5 → reputation score 0..100. Returns null if rating is 0
 * (treated as "no rating yet" rather than worst possible score). */
export const fetchAiRatingToReputation = (rating: number): number | null =>
  rating > 0 ? Math.min(100, Math.round(rating * 20)) : null;

/** Project status string → online flag. Tolerant: only "active" → true. */
export const fetchAiStatusToOnline = (status: string): boolean =>
  status.toLowerCase() === 'active';

/** Display name fallback chain: name (non-empty) → prefix → address[6:14]. */
export const fetchAiDisplayName = (raw: FetchAiAgent): string => {
  if (raw.name && raw.name.trim().length > 0) return raw.name.trim();
  if (raw.prefix && raw.prefix.trim().length > 0) return raw.prefix.trim();
  return `agent ${raw.address.slice(6, 14)}`;
};
