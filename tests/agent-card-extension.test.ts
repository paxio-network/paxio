/**
 * M-L1-contracts — AgentCard provenance extension.
 *
 * Validates backward compat + new fields (source, externalId, sourceUrl,
 * crawledAt) from packages/types/src/agent-card.ts. If backward compat ever
 * breaks (e.g. a native registration without source field fails Zod parse),
 * this spec goes RED loudly.
 */
import { describe, it, expect } from 'vitest';
import {
  ZodAgentCard,
  ZodCrawlerSource,
  CRAWLER_SOURCES,
  type CrawlerSource,
} from '@paxio/types';

// A minimal valid M00-shape AgentCard (no provenance fields).
const native = {
  did: 'did:paxio:icp:rdmx6-jaaaa-aaaaa-aaadq-cai',
  name: 'Paxio Native Agent',
  description: 'An agent registered directly via POST /registry/register',
  capability: 'REGISTRY',
  endpoint: 'https://agent.paxio.network',
  version: '1.0.0',
  createdAt: '2026-04-23T12:00:00.000Z',
};

describe('M-L1 — AgentCard provenance extension', () => {
  describe('backward compat (existing native callers)', () => {
    it('accepts M00-shape AgentCard without provenance fields', () => {
      const parsed = ZodAgentCard.safeParse(native);
      expect(parsed.success).toBe(true);
    });

    it('defaults `source` to "paxio-native" when omitted (M-L1-taxonomy)', () => {
      const parsed = ZodAgentCard.parse(native);
      expect(parsed.source).toBe('paxio-native');
    });

    it('leaves externalId / sourceUrl / crawledAt undefined for native cards', () => {
      const parsed = ZodAgentCard.parse(native);
      expect(parsed.externalId).toBeUndefined();
      expect(parsed.sourceUrl).toBeUndefined();
      expect(parsed.crawledAt).toBeUndefined();
    });
  });

  describe('crawled card (all provenance fields populated)', () => {
    const crawled = {
      ...native,
      did: 'did:paxio:base:0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
      source: 'erc8004' as CrawlerSource,
      externalId: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
      sourceUrl:
        'https://basescan.org/address/0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
      crawledAt: '2026-04-23T11:30:00.000Z',
    };

    it('accepts all 4 provenance fields', () => {
      const parsed = ZodAgentCard.safeParse(crawled);
      expect(parsed.success).toBe(true);
    });

    it('preserves source / externalId / sourceUrl / crawledAt verbatim', () => {
      const parsed = ZodAgentCard.parse(crawled);
      expect(parsed.source).toBe('erc8004');
      expect(parsed.externalId).toBe(crawled.externalId);
      expect(parsed.sourceUrl).toBe(crawled.sourceUrl);
      expect(parsed.crawledAt).toBe(crawled.crawledAt);
    });
  });

  describe('CrawlerSource enum', () => {
    it('includes all 8 known sources (M-L1-T2 added paxio-curated; M-L1-T10 added huggingface)', () => {
      expect([...CRAWLER_SOURCES]).toEqual([
        'native',
        'erc8004',
        'a2a',
        'mcp',
        'fetch-ai',
        'virtuals',
        'paxio-curated',
        'huggingface',
      ]);
    });

    it('Zod enum rejects unknown source values', () => {
      const bad = ZodCrawlerSource.safeParse('not-a-source');
      expect(bad.success).toBe(false);
    });

    it('each CRAWLER_SOURCES entry Zod-validates', () => {
      for (const s of CRAWLER_SOURCES) {
        expect(ZodCrawlerSource.safeParse(s).success).toBe(true);
      }
    });
  });

  describe('validation edge cases', () => {
    it('rejects invalid sourceUrl (not a URL)', () => {
      const bad = ZodAgentCard.safeParse({
        ...native,
        sourceUrl: 'not-a-url',
      });
      expect(bad.success).toBe(false);
    });

    it('rejects invalid crawledAt (not ISO datetime)', () => {
      const bad = ZodAgentCard.safeParse({
        ...native,
        crawledAt: '2026-04-23',
      });
      expect(bad.success).toBe(false);
    });

    it('rejects empty externalId', () => {
      const bad = ZodAgentCard.safeParse({
        ...native,
        externalId: '',
      });
      expect(bad.success).toBe(false);
    });

    it('rejects externalId longer than 500 chars', () => {
      const bad = ZodAgentCard.safeParse({
        ...native,
        externalId: 'x'.repeat(501),
      });
      expect(bad.success).toBe(false);
    });

    it('rejects unknown source string', () => {
      const bad = ZodAgentCard.safeParse({
        ...native,
        source: 'unknown-ecosystem',
      });
      expect(bad.success).toBe(false);
    });
  });
});
