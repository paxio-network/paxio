import { z } from 'zod';

// MCP (Model Context Protocol) server descriptor.
// Two primary crawl sources:
//   1. Smithery.ai — public REST API (`GET /v1/packages?q=`) — ~7K servers.
//   2. Anthropic MCP registry — official Anthropic directory (GitHub index).
//
// Both feeds are normalised to this single schema before validation; adapter
// distinguishes them via `registrySource` so we can attribute correctly.
//
// Notes on shape:
// - `slug` is the canonical identifier within MCP ecosystems (e.g. "fs",
//   "postgres", "brave-search"). Becomes the canonical `externalId`.
// - `runtime` — how the server is invoked ("stdio" / "http"). Used by Paxio
//   when configuring clients that want to call the agent.
// - `tools` is the set of MCP tools the server exposes; stored for
//   Intelligence-layer skill matching. We cap size to avoid pathological
//   payloads (real servers have <100 tools).
// - `installCount` / `rating` may be null (Anthropic directory has no usage
//   stats); when present they feed Paxio's reputation seed.

export const MCP_REGISTRY_SOURCES = ['smithery', 'anthropic'] as const;
export const MCP_RUNTIMES = ['stdio', 'http', 'unknown'] as const;

export const ZodMcpRegistrySource = z.enum(MCP_REGISTRY_SOURCES);
export const ZodMcpRuntime = z.enum(MCP_RUNTIMES);

export const ZodMcpTool = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const ZodMcpServerDescriptor = z.object({
  // 'smithery' or 'anthropic' — which crawl source produced this record.
  registrySource: ZodMcpRegistrySource,

  // Canonical slug in MCP ecosystem (e.g. "brave-search"). Required.
  slug: z.string().min(1).max(200),

  // Human-readable display name.
  displayName: z.string().min(1).max(300),

  description: z.string().max(2000).optional(),

  // Repository homepage (GitHub). Optional but usually present.
  repositoryUrl: z.string().url().optional(),

  // How the server expects to be invoked.
  runtime: ZodMcpRuntime,

  // List of tools the server exposes. Capped at 500 to defend against
  // pathological manifests.
  tools: z.array(ZodMcpTool).max(500).default([]),

  // Optional usage stats (Smithery only); null from Anthropic feed.
  installCount: z.number().int().nonnegative().nullable().default(null),
  rating: z.number().min(0).max(5).nullable().default(null),

  // Publisher / author of the MCP server.
  author: z.string().min(1).max(300).optional(),

  // ISO timestamp the server last published a new version. Used for
  // liveness signal (stale servers downranked).
  lastPublishedAt: z.string().datetime().optional(),
});

export type McpRegistrySource = z.infer<typeof ZodMcpRegistrySource>;
export type McpRuntime = z.infer<typeof ZodMcpRuntime>;
export type McpTool = z.infer<typeof ZodMcpTool>;
export type McpServerDescriptor = z.infer<typeof ZodMcpServerDescriptor>;
