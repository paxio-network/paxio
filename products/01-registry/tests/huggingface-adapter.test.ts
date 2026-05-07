// M-L1-T10 RED — Hugging Face crawler adapter.
//
// Adapter MUST:
//   - GET https://huggingface.co/api/models?limit=N
//   - Paginate via Link header `rel="next"` cursor token
//   - Default sort: trendingScore desc (HF default)
//   - Stop after SAFETY_MAX_PAGES OR when no next link
//   - Yield ZodHuggingFaceModel-shaped records
//   - Project raw → canonical AgentCard via toCanonical:
//       did: did:paxio:huggingface:<owner--model>
//       name: from id
//       capability: INTELLIGENCE (default — most HF models are inference)
//       source: 'huggingface'
//       externalId: id.replace('/', '--')
//       sourceUrl: huggingFaceModelUrl(id)
//       createdAt: from raw.createdAt

import { describe, it, expect } from 'vitest';
import { createHuggingFaceAdapter } from '../app/domain/sources/huggingface.js';
import type { HuggingFaceModel } from '@paxio/types';

interface HttpResponse {
  status: number;
  headers: Map<string, string>;
  body: unknown;
}
interface HttpClient {
  fetch(req: {
    url: string;
    method: 'GET' | 'POST';
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<HttpResponse>;
}

const fakeHttp = (responses: ReadonlyArray<HttpResponse>): HttpClient => {
  let i = 0;
  return {
    async fetch() {
      const r = responses[i] ?? { status: 200, headers: new Map(), body: [] };
      i += 1;
      return r;
    },
  };
};

const validModel = {
  id: 'deepseek-ai/DeepSeek-V4-Pro',
  modelId: 'deepseek-ai/DeepSeek-V4-Pro',
  author: 'deepseek-ai',
  pipeline_tag: 'text-generation',
  library_name: 'transformers',
  tags: ['transformers', 'safetensors', 'text-generation'],
  likes: 3719,
  downloads: 946264,
  trendingScore: 355,
  gated: false,
  private: false,
  createdAt: '2026-04-22T06:04:45.000Z',
  lastModified: '2026-05-06T04:18:44.000Z',
};

describe('M-L1-T10 createHuggingFaceAdapter — factory', () => {
  it('returns frozen adapter with sourceName=huggingface + methods', () => {
    const adapter = createHuggingFaceAdapter({ httpClient: fakeHttp([]) });
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(adapter.sourceName).toBe('huggingface');
    expect(typeof adapter.fetchAgents).toBe('function');
    expect(typeof adapter.toCanonical).toBe('function');
  });
});

describe('M-L1-T10 HuggingFace fetchAgents — GET + Link-header pagination', () => {
  it('GETs /api/models with limit query param', async () => {
    const calls: Array<{ url: string; method: 'GET' | 'POST' }> = [];
    const httpClient: HttpClient = {
      async fetch(req) {
        calls.push({ url: req.url, method: req.method });
        return { status: 200, headers: new Map(), body: [] };
      },
    };
    const adapter = createHuggingFaceAdapter({ httpClient });
    for await (const _ of adapter.fetchAgents()) { /* noop */ }

    expect(calls[0].url).toMatch(/huggingface\.co\/api\/models/);
    expect(calls[0].url).toMatch(/limit=\d+/);
    expect(calls[0].method).toBe('GET');
  });

  it('yields one record per model in page', async () => {
    const adapter = createHuggingFaceAdapter({
      httpClient: fakeHttp([
        {
          status: 200,
          headers: new Map(),
          body: [validModel, { ...validModel, id: 'org/another-model' }],
        },
      ]),
    });
    const records: HuggingFaceModel[] = [];
    for await (const r of adapter.fetchAgents()) records.push(r);
    expect(records.length).toBeGreaterThanOrEqual(2);
  });

  it('paginates via Link header rel="next" cursor', async () => {
    let pageCount = 0;
    const httpClient: HttpClient = {
      async fetch(req) {
        pageCount += 1;
        if (pageCount === 1) {
          return {
            status: 200,
            headers: new Map([
              [
                'link',
                '<https://huggingface.co/api/models?limit=2&cursor=PAGE2>; rel="next"',
              ],
            ]),
            body: [validModel, { ...validModel, id: 'p1/b' }],
          };
        }
        if (pageCount === 2) {
          // 2nd response — no Link header → terminate
          return {
            status: 200,
            headers: new Map(),
            body: [{ ...validModel, id: 'p2/c' }],
          };
        }
        return { status: 200, headers: new Map(), body: [] };
      },
    };
    const adapter = createHuggingFaceAdapter({ httpClient });
    let count = 0;
    for await (const _ of adapter.fetchAgents()) count += 1;
    expect(count).toBe(3);
    expect(pageCount).toBe(2);
  });

  it('stops at SAFETY_MAX_PAGES (no infinite loop on bad upstream)', async () => {
    const httpClient: HttpClient = {
      async fetch() {
        // Always return next link → would never terminate without safety
        return {
          status: 200,
          headers: new Map([
            ['link', '<https://huggingface.co/api/models?cursor=X>; rel="next"'],
          ]),
          body: [validModel],
        };
      },
    };
    const adapter = createHuggingFaceAdapter({ httpClient });
    let count = 0;
    for await (const _ of adapter.fetchAgents()) {
      count += 1;
      if (count > 100000) break;
    }
    expect(count).toBeLessThanOrEqual(100000);
    expect(count).toBeGreaterThan(0);
  });

  it('terminates on non-2xx (e.g. 5xx) without throw', async () => {
    const httpClient: HttpClient = {
      async fetch() {
        return { status: 503, headers: new Map(), body: { error: 'service-unavailable' } };
      },
    };
    const adapter = createHuggingFaceAdapter({ httpClient });
    let threw = false;
    let count = 0;
    try { for await (const _ of adapter.fetchAgents()) count += 1; } catch { threw = true; }
    expect(threw).toBe(false);
    expect(count).toBe(0);
  });

  it('skips Zod-invalid records (e.g. missing id)', async () => {
    const adapter = createHuggingFaceAdapter({
      httpClient: fakeHttp([
        {
          status: 200,
          headers: new Map(),
          body: [
            validModel,
            { /* missing id, createdAt */ likes: 0 },
            { ...validModel, id: 'good/two' },
          ],
        },
      ]),
    });
    const records: HuggingFaceModel[] = [];
    for await (const r of adapter.fetchAgents()) records.push(r);
    expect(records.length).toBe(2); // skipped invalid
  });
});

describe('M-L1-T10 HuggingFace toCanonical — raw → canonical projection', () => {
  it('projects valid model to AgentCard with did:paxio:huggingface', () => {
    const adapter = createHuggingFaceAdapter({ httpClient: fakeHttp([]) });
    const result = adapter.toCanonical(validModel);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const card = result.value;
    expect(card.source).toBe('huggingface');
    // DID format: did:paxio:huggingface:<owner--model>
    expect(card.did).toBe('did:paxio:huggingface:deepseek-ai--DeepSeek-V4-Pro');
    expect(card.externalId).toBe('deepseek-ai--DeepSeek-V4-Pro');
    // sourceUrl points at HF model page
    expect(card.sourceUrl).toBe('https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro');
    // Display name from id (owner/model)
    expect(card.name).toBe('deepseek-ai/DeepSeek-V4-Pro');
    // createdAt preserved as ISO string
    expect(card.createdAt).toBe(validModel.createdAt);
  });

  it('returns parse_error on invalid model id (no slash)', () => {
    const adapter = createHuggingFaceAdapter({ httpClient: fakeHttp([]) });
    const result = adapter.toCanonical({
      ...validModel,
      id: 'no-slash-no-owner',
    } as unknown as HuggingFaceModel);
    expect(result.ok).toBe(false);
  });
});
