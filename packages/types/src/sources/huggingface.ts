import { z } from 'zod';

// Hugging Face — https://huggingface.co
//
// Public API (no auth for read-only model browse):
//   GET https://huggingface.co/api/models?limit=N&cursor=<base64>
//
// Pagination via Link header: `Link: <...?cursor=XYZ>; rel="next"`.
// Default sort: trendingScore desc.
// X-Total-Count header reports total available (~600K+ models).
//
// Filter strategy (M-L1-T10):
//   - Crawl WITHOUT filter → all models (huge surface — 600K+).
//   - Default cron crawls top-N by trendingScore (limit=100, ~200 pages = top 20K).
//     Adapter caller chooses cursor/limit budget per crawl_runs row.
//   - Future iteration may add tag filter (e.g. `pipeline_tag=text-generation`)
//     to focus on agent-shaped models.
//
// Real API response sample (curl 2026-05-07):
//   {
//     "_id": "69e864fd6b68f7e6cfc63ca3",
//     "id": "deepseek-ai/DeepSeek-V4-Pro",
//     "author": "deepseek-ai",
//     "gated": false,
//     "lastModified": "2026-05-06T04:18:44.000Z",
//     "likes": 3719,
//     "trendingScore": 355,
//     "private": false,
//     "downloads": 946264,
//     "tags": ["transformers","safetensors","deepseek_v4","text-generation",...],
//     "pipeline_tag": "text-generation",
//     "library_name": "transformers",
//     "createdAt": "2026-04-22T06:04:45.000Z",
//     "modelId": "deepseek-ai/DeepSeek-V4-Pro"
//   }

// HuggingFace model id format: <owner>/<model>. Both are slug-style:
// lowercase + digits + `_-.` separators. Length 1..96 each segment.
const HF_MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}\/[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;

export const ZodHuggingFaceModel = z
  .object({
    // Owner/model slug — primary identifier.
    id: z.string().regex(HF_MODEL_ID, 'invalid HF model id (expected owner/model)'),

    // Internal MongoDB-style id (HF backend). Optional — not always emitted.
    _id: z.string().optional(),

    // Convenience duplicate of id (HF emits both fields).
    modelId: z.string().optional(),

    // Owner namespace (org or user). Slug-safe.
    author: z.string().max(96).optional(),

    // Pipeline / task tag (text-generation, embeddings, ...). Used for
    // capability inference + AgentCategory mapping.
    pipeline_tag: z.string().max(80).nullable().optional(),

    // Primary library (transformers, sentence-transformers, peft, ...).
    library_name: z.string().max(80).nullable().optional(),

    // Free-form tags array. May include `agent`, `tools`, `function-calling`
    // etc. — used by future tag-filter cron strategy.
    tags: z.array(z.string().max(120)).default([]),

    // Engagement metrics — fed into reputation projection.
    likes: z.number().int().nonnegative().default(0),
    downloads: z.number().int().nonnegative().default(0),
    trendingScore: z.number().nullable().optional(),

    // Boolean flags — gated models behind auth, private models hidden,
    // both rare for community models.
    gated: z.union([z.boolean(), z.string()]).optional(),
    private: z.boolean().default(false),

    // ISO 8601 timestamps.
    createdAt: z.string().datetime({ offset: true }),
    lastModified: z.string().datetime({ offset: true }).optional(),

    // Commit sha (optional, only on `?full=true` queries).
    sha: z.string().optional(),
  })
  // Forward-compat: HF adds new fields (siblings, model_card, etc.) without
  // breaking parse.
  .passthrough();

export type HuggingFaceModel = z.infer<typeof ZodHuggingFaceModel>;

// ---------------------------------------------------------------------------
// Helpers — adapter uses these in toCanonical
// ---------------------------------------------------------------------------

/** Canonical model URL (web page) — used as sourceUrl. */
export const huggingFaceModelUrl = (id: string): string =>
  `https://huggingface.co/${id}`;

/** DID-safe externalId: replace `/` with `--` (slash not allowed in DID id segment). */
export const huggingFaceExternalId = (id: string): string => id.replace('/', '--');

/** Display name fallback: id (owner/model) → modelId → '<unnamed>'. */
export const huggingFaceDisplayName = (m: HuggingFaceModel): string => {
  if (m.id && m.id.length > 0) return m.id;
  if (m.modelId && m.modelId.length > 0) return m.modelId;
  return '<unnamed huggingface model>';
};

/**
 * Reputation 0..100 from likes count, log-scaled. 1 like = ~7, 10 = ~14,
 * 100 = ~21, 1k = ~28, 10k = ~36, 100k = ~43.
 * Returns null if likes === 0 (no signal yet).
 */
export const huggingFaceLikesToReputation = (likes: number): number | null => {
  if (likes <= 0) return null;
  // log10(likes+1) * 14, capped at 100
  const score = Math.round(Math.log10(likes + 1) * 14);
  return Math.min(100, Math.max(1, score));
};
