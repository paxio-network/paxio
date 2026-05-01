/**
 * M-L1-taxonomy — RED test specs for new AgentCard schema (9 attribute groups).
 *
 * Validates the domain-based taxonomy:
 *   1. AgentCategory enum (11 values, single principle: domain where
 *      agent creates value)
 *   2. AgentSource canonical kebab-style (7 + 2 legacy aliases)
 *   3. AgentFramework enum (10 values: technology under the hood)
 *   4. New attribute groups (wallet, payment, sla, reputation, security,
 *      compliance, ecosystem, developer)
 *
 * Architectural enforcement:
 *   - Bitcoin / x402 NOT categories — they are attributes
 *   - Single criterion for `category` — domain (not industry / function / asset)
 *   - Backward-compat: legacy paxio-layer `capability` field still parses
 *
 * Tests are spec — registry-dev MUST implement adapters projecting onto
 * this schema; storage migration 003 MUST backfill existing rows; frontend
 * MUST use AGENT_SOURCE_LABELS mapping for display.
 */
import { describe, it, expect } from 'vitest';
import {
  AGENT_CATEGORIES,
  AGENT_SOURCES,
  AGENT_FRAMEWORKS,
  AGENT_SOURCE_LABELS,
  ZodAgentCard,
  ZodAgentCategory,
  ZodAgentSource,
  ZodAgentFramework,
  ZodWallet,
  ZodPayment,
  ZodSla,
  ZodReputation,
  ZodSecurity,
  ZodCompliance,
  ZodEcosystem,
  type AgentCategory,
  type AgentSource,
  type AgentCard,
} from '@paxio/types';

// ─────────────────────────────────────────────────────────────────────────
// Group 1 — AgentCategory enum (single criterion: domain)
// ─────────────────────────────────────────────────────────────────────────

describe('M-L1-taxonomy — AgentCategory (11 domain-based values)', () => {
  it('enumerates exactly 11 domain categories', () => {
    expect(AGENT_CATEGORIES).toHaveLength(11);
  });

  it('contains all expected domain values from FA-01 §4', () => {
    expect(AGENT_CATEGORIES).toEqual([
      'Finance',
      'Legal & Compliance',
      'Security',
      'Developer',
      'Data & Research',
      'Infrastructure',
      'Productivity',
      'AI & ML',
      'Language',
      'Entertainment',
      'Customer Experience',
    ]);
  });

  it('does NOT include "Bitcoin" — Bitcoin is a wallet/payment attribute, not a domain', () => {
    expect(AGENT_CATEGORIES).not.toContain('Bitcoin' as AgentCategory);
  });

  it('does NOT include technical-function categories ("AI/ML" minus space, "DevTools")', () => {
    expect(AGENT_CATEGORIES).not.toContain('AI/ML' as AgentCategory);
    expect(AGENT_CATEGORIES).not.toContain('DevTools' as AgentCategory);
  });

  it('Zod schema accepts all valid categories', () => {
    for (const cat of AGENT_CATEGORIES) {
      expect(ZodAgentCategory.safeParse(cat).success).toBe(true);
    }
  });

  it('Zod schema rejects invalid category', () => {
    expect(ZodAgentCategory.safeParse('Bitcoin').success).toBe(false);
    expect(ZodAgentCategory.safeParse('finance').success).toBe(false); // case sensitive
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Group 2 — AgentSource enum (kebab canonical + legacy aliases)
// ─────────────────────────────────────────────────────────────────────────

describe('M-L1-expansion — AgentSource (13 canonical + 2 legacy aliases)', () => {
  it('contains all 13 canonical kebab values (M-L1-expansion)', () => {
    // Direct entry
    expect(AGENT_SOURCES).toContain('paxio-native');
    expect(AGENT_SOURCES).toContain('paxio-curated');
    // On-chain
    expect(AGENT_SOURCES).toContain('erc8004');
    expect(AGENT_SOURCES).toContain('a2a');
    expect(AGENT_SOURCES).toContain('bittensor');
    expect(AGENT_SOURCES).toContain('virtuals');
    // Framework hubs
    expect(AGENT_SOURCES).toContain('mcp');
    expect(AGENT_SOURCES).toContain('eliza');
    expect(AGENT_SOURCES).toContain('langchain-hub');
    expect(AGENT_SOURCES).toContain('fetch');
    // Discovery
    expect(AGENT_SOURCES).toContain('huggingface');
    expect(AGENT_SOURCES).toContain('vercel-ai');
    expect(AGENT_SOURCES).toContain('github-discovered');
  });

  it('contains 2 legacy aliases for migration 003 transition', () => {
    expect(AGENT_SOURCES).toContain('native' as AgentSource); // legacy → paxio-native
    expect(AGENT_SOURCES).toContain('fetch-ai' as AgentSource); // legacy → fetch
  });

  it('does NOT include x402 — payment.accepts attribute, not source', () => {
    expect(AGENT_SOURCES).not.toContain('x402' as AgentSource);
    expect(AGENT_SOURCES).not.toContain('x402-base' as AgentSource);
  });

  it('AGENT_SOURCE_LABELS maps every canonical kebab to display value', () => {
    // Direct
    expect(AGENT_SOURCE_LABELS['paxio-native']).toBe('paxio-native');
    expect(AGENT_SOURCE_LABELS['paxio-curated']).toBe('paxio-curated');
    // On-chain
    expect(AGENT_SOURCE_LABELS.erc8004).toBe('ERC-8004');
    expect(AGENT_SOURCE_LABELS.a2a).toBe('A2A');
    expect(AGENT_SOURCE_LABELS.bittensor).toBe('Bittensor');
    expect(AGENT_SOURCE_LABELS.virtuals).toBe('Virtuals');
    // Framework hubs
    expect(AGENT_SOURCE_LABELS.mcp).toBe('MCP');
    expect(AGENT_SOURCE_LABELS.eliza).toBe('ElizaOS');
    expect(AGENT_SOURCE_LABELS['langchain-hub']).toBe('LangChain Hub');
    expect(AGENT_SOURCE_LABELS.fetch).toBe('Fetch.ai');
    // Discovery
    expect(AGENT_SOURCE_LABELS.huggingface).toBe('Hugging Face');
    expect(AGENT_SOURCE_LABELS['vercel-ai']).toBe('Vercel AI');
    expect(AGENT_SOURCE_LABELS['github-discovered']).toBe('GitHub');
  });

  it('AGENT_SOURCE_LABELS is frozen (cannot be mutated at runtime)', () => {
    expect(Object.isFrozen(AGENT_SOURCE_LABELS)).toBe(true);
  });

  it('AGENT_SOURCE_LABELS covers EVERY enum value (exhaustive check)', () => {
    for (const src of AGENT_SOURCES) {
      expect(AGENT_SOURCE_LABELS[src]).toBeDefined();
      expect(AGENT_SOURCE_LABELS[src].length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Group 3 — AgentFramework enum
// ─────────────────────────────────────────────────────────────────────────

describe('M-L1-taxonomy — AgentFramework (technology-under-hood enum)', () => {
  it('lists major agentic frameworks + paxio-native + custom + unknown', () => {
    expect(AGENT_FRAMEWORKS).toContain('langchain');
    expect(AGENT_FRAMEWORKS).toContain('crewai');
    expect(AGENT_FRAMEWORKS).toContain('autogen');
    expect(AGENT_FRAMEWORKS).toContain('eliza');
    expect(AGENT_FRAMEWORKS).toContain('llamaindex');
    expect(AGENT_FRAMEWORKS).toContain('vercel-ai');
    expect(AGENT_FRAMEWORKS).toContain('autogpt');
    expect(AGENT_FRAMEWORKS).toContain('paxio-native');
    expect(AGENT_FRAMEWORKS).toContain('custom');
    expect(AGENT_FRAMEWORKS).toContain('unknown');
  });

  it('framework distinct from source (LangChain agent can be source=mcp)', () => {
    // sanity: parsing both independently does not conflate them
    expect(ZodAgentFramework.safeParse('langchain').success).toBe(true);
    expect(ZodAgentSource.safeParse('langchain').success).toBe(false);
    expect(ZodAgentSource.safeParse('mcp').success).toBe(true);
    expect(ZodAgentFramework.safeParse('mcp').success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Group 4 — Wallet sub-schema
// ─────────────────────────────────────────────────────────────────────────

describe('M-L1-taxonomy — Wallet attribute group', () => {
  it('accepts valid wallet (paxio-native + addresses + verified)', () => {
    const w = ZodWallet.parse({
      status: 'paxio-native',
      addresses: { btc: 'bc1q...', usdc: '0xabc...' },
      verified: true,
    });
    expect(w.status).toBe('paxio-native');
    expect(w.verified).toBe(true);
  });

  it('defaults verified=false + status=none + empty addresses', () => {
    const w = ZodWallet.parse({});
    expect(w.status).toBe('none');
    expect(w.verified).toBe(false);
    expect(w.addresses).toStrictEqual({});
  });

  it('rejects wallet.status outside enum (Bitcoin is NOT a status)', () => {
    expect(ZodWallet.safeParse({ status: 'Bitcoin' }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Group 5 — Payment sub-schema
// ─────────────────────────────────────────────────────────────────────────

describe('M-L1-taxonomy — Payment attribute group', () => {
  it('accepts canonical payment record', () => {
    const p = ZodPayment.parse({
      accepts: ['x402', 'usdc-base', 'btc-l1'],
      preferred: 'x402',
      facilitator: 'paxio',
      facilitatorVerified: true,
      pricing: {
        perCall: 0.003,
        currency: 'usdc',
        model: 'per_call',
      },
    });
    expect(p.accepts).toStrictEqual(['x402', 'usdc-base', 'btc-l1']);
    expect(p.facilitator).toBe('paxio');
    expect(p.pricing.model).toBe('per_call');
  });

  it('rejects unknown rail in payment.accepts', () => {
    const r = ZodPayment.safeParse({ accepts: ['paypal-cash'] });
    expect(r.success).toBe(false);
  });

  it('defaults facilitator=unknown + facilitatorVerified=false', () => {
    const p = ZodPayment.parse({});
    expect(p.facilitator).toBe('unknown');
    expect(p.facilitatorVerified).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Group 6 — SLA sub-schema (verified by us, not agent)
// ─────────────────────────────────────────────────────────────────────────

describe('M-L1-taxonomy — Sla attribute group', () => {
  it('accepts numeric latency + uptime', () => {
    const s = ZodSla.parse({
      p50Ms: 1200,
      p95Ms: 3400,
      p99Ms: 5000,
      uptime30d: 0.998,
      lastChecked: '2026-04-30T19:58:53Z',
    });
    expect(s.p50Ms).toBe(1200);
    expect(s.uptime30d).toBeCloseTo(0.998);
  });

  it('rejects uptime30d > 1', () => {
    expect(ZodSla.safeParse({ uptime30d: 1.5 }).success).toBe(false);
  });

  it('rejects negative p50Ms', () => {
    expect(ZodSla.safeParse({ p50Ms: -1 }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Group 7 — Reputation + Security
// ─────────────────────────────────────────────────────────────────────────

describe('M-L1-taxonomy — Reputation + Security groups', () => {
  it('reputation accepts canonical fields', () => {
    const r = ZodReputation.parse({
      score: 847,
      txCount: 12483,
      deliveryRate: 0.994,
      disputeRate: 0.002,
    });
    expect(r.score).toBe(847);
    expect(r.txCount).toBe(12483);
  });

  it('reputation rejects score > 1000', () => {
    expect(ZodReputation.safeParse({ score: 1500 }).success).toBe(false);
  });

  it('security accepts owasp_score (0=perfect, 1=worst)', () => {
    const s = ZodSecurity.parse({
      owaspScore: 0.12,
      badgeLevel: 'gold',
      lastScanned: '2026-04-10T00:00:00Z',
      guardConnected: true,
      guardIncidents30d: 0,
    });
    expect(s.owaspScore).toBeCloseTo(0.12);
    expect(s.badgeLevel).toBe('gold');
    expect(s.guardConnected).toBe(true);
  });

  it('security rejects owasp_score outside [0, 1]', () => {
    expect(ZodSecurity.safeParse({ owaspScore: 1.5 }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Group 8 — Compliance
// ─────────────────────────────────────────────────────────────────────────

describe('M-L1-taxonomy — Compliance attribute group', () => {
  it('accepts canonical compliance record', () => {
    const c = ZodCompliance.parse({
      euAiAct: 'certified',
      euAiActExpires: '2026-10-01T00:00:00Z',
      owaspCert: true,
      iso42001: 0.78,
      kyaCert: false,
      dataHandling: 'no-storage',
    });
    expect(c.euAiAct).toBe('certified');
    expect(c.dataHandling).toBe('no-storage');
  });

  it('rejects euAiAct outside enum', () => {
    expect(ZodCompliance.safeParse({ euAiAct: 'pending' }).success).toBe(false);
  });

  it('defaults euAiAct=none + dataHandling=ephemeral', () => {
    const c = ZodCompliance.parse({});
    expect(c.euAiAct).toBe('none');
    expect(c.dataHandling).toBe('ephemeral');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Group 9 — Ecosystem
// ─────────────────────────────────────────────────────────────────────────

describe('M-L1-taxonomy — Ecosystem attribute group', () => {
  it('accepts EVM ecosystem record', () => {
    const e = ZodEcosystem.parse({
      network: 'base',
      chainId: 8453,
      erc8004TokenId: '0x1234',
      openSource: 'https://github.com/example/agent',
      compatibleClients: ['claude', 'cursor', 'windsurf'],
    });
    expect(e.network).toBe('base');
    expect(e.chainId).toBe(8453);
    expect(e.compatibleClients).toEqual(['claude', 'cursor', 'windsurf']);
  });

  it('accepts openSource=null for closed-source agent', () => {
    const e = ZodEcosystem.parse({ network: 'none', openSource: null });
    expect(e.openSource).toBe(null);
  });

  it('rejects unknown network', () => {
    expect(ZodEcosystem.safeParse({ network: 'cardano' }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Full AgentCard end-to-end
// ─────────────────────────────────────────────────────────────────────────

describe('M-L1-taxonomy — Full AgentCard schema (9 groups composed)', () => {
  const minimal: AgentCard = ZodAgentCard.parse({
    did: 'did:paxio:icp:rdmx6-jaaaa-aaaaa-aaadq-cai',
    name: 'Test Agent',
    createdAt: '2026-04-30T00:00:00.000Z',
    category: 'Developer',
  });

  it('minimal valid card has required fields + sensible defaults', () => {
    expect(minimal.did).toMatch(/^did:paxio:/);
    expect(minimal.source).toBe('paxio-native'); // default
    expect(minimal.category).toBe('Developer');
  });

  it('accepts full payload (all 9 attribute groups populated)', () => {
    const full = ZodAgentCard.parse({
      // Group 1 — Identification
      did: 'did:paxio:base:0x1a2b3c',
      name: 'Legal Document Translator',
      description: 'Translates legal docs EN/DE/FR',
      version: '1.2.0',
      endpoint: 'https://agent.example.com/v1',
      source: 'paxio-native',
      sourceUrl: 'https://agent.example.com',
      createdAt: '2026-04-14T00:00:00.000Z',
      updatedAt: '2026-04-19T00:00:00.000Z',
      claimed: true,
      owner: '0x1234567890abcdef',

      // Group 2 — Capabilities
      category: 'Legal & Compliance',
      capabilities: ['legal-translation', 'contract-review', 'EN→DE'],
      inputTypes: ['text', 'file/pdf', 'file/docx'],
      outputTypes: ['text', 'file/docx'],
      languages: ['en', 'de', 'fr'],
      framework: 'langchain',

      // Group 3 — Wallet
      wallet: {
        status: 'paxio-native',
        addresses: { btc: 'bc1q...', usdc: '0xabc...' },
        verified: true,
      },

      // Group 4 — Payment
      payment: {
        accepts: ['x402', 'usdc-base'],
        preferred: 'x402',
        facilitator: 'paxio',
        facilitatorVerified: true,
        pricing: { perCall: 0.003, currency: 'usdc', model: 'per_call' },
      },

      // Group 5 — SLA
      sla: { p50Ms: 1200, p99Ms: 5000, uptime30d: 0.998 },

      // Group 6 — Reputation + Security
      reputation: {
        score: 847,
        txCount: 12483,
        deliveryRate: 0.994,
        disputeRate: 0.002,
      },
      security: {
        owaspScore: 0.12,
        badgeLevel: 'gold',
        guardConnected: true,
        guardIncidents30d: 0,
      },

      // Group 7 — Compliance
      compliance: {
        euAiAct: 'certified',
        euAiActExpires: '2026-10-01T00:00:00Z',
        owaspCert: true,
        iso42001: 0.78,
        dataHandling: 'no-storage',
      },

      // Group 8 — Ecosystem
      ecosystem: {
        network: 'base',
        chainId: 8453,
        openSource: 'https://github.com/example/agent',
        compatibleClients: ['claude', 'cursor'],
      },

      // Group 9 — Developer
      developer: {
        name: 'Acme Corp',
        verified: true,
        url: 'https://acme.example.com',
      },
    });
    expect(full.category).toBe('Legal & Compliance');
    expect(full.wallet?.verified).toBe(true);
    expect(full.payment?.facilitator).toBe('paxio');
    expect(full.security?.badgeLevel).toBe('gold');
    expect(full.compliance?.euAiAct).toBe('certified');
  });

  it('rejects card with category="Bitcoin" (Bitcoin is attribute, not category)', () => {
    const r = ZodAgentCard.safeParse({
      did: 'did:paxio:icp:test',
      name: 'Test',
      createdAt: '2026-04-30T00:00:00Z',
      category: 'Bitcoin',
    });
    expect(r.success).toBe(false);
  });

  it('legacy `capability` field still accepted as deprecated optional (back-compat)', () => {
    const r = ZodAgentCard.safeParse({
      did: 'did:paxio:icp:test',
      name: 'Test',
      capability: 'INTELLIGENCE', // old paxio-layer enum
      createdAt: '2026-04-30T00:00:00Z',
    });
    expect(r.success).toBe(true);
  });
});
