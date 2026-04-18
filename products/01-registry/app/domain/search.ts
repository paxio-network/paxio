// BM25 search over Agent Card name + description.
//
// Pure functions. Inputs are an iterable of AgentCards and a query string.
// Returns scored results sorted descending by score.
//
// BM25 formula (Okapi):
//   score(D, Q) = Σ_{t ∈ Q} IDF(t) · (f(t, D) · (k1 + 1)) / (f(t, D) + k1 · (1 - b + b · |D|/avgdl))
//   IDF(t) = ln((N - df(t) + 0.5) / (df(t) + 0.5) + 1)   // BM25+ smoothing
//
// Scores are normalised to [0, 1] across the result set so the top result
// always has score ∈ (0, 1]. This keeps the on-wire schema happy
// (ZodFindResult requires score ∈ [0, 1]).

import type { AgentCard, FindResult } from '@paxio/types';

const K1 = 1.5;
const B = 0.75;

// --- tokenisation ---------------------------------------------------------

const TOKEN_RE = /[a-z0-9]+/g;

const tokenize = (text: string): string[] => {
  const lower = text.toLowerCase();
  return lower.match(TOKEN_RE) ?? [];
};

const cardText = (card: AgentCard): string =>
  `${card.name} ${card.description ?? ''}`;

// --- BM25 core ------------------------------------------------------------

interface Document {
  readonly card: AgentCard;
  readonly tokens: readonly string[];
  readonly length: number;
  readonly tf: ReadonlyMap<string, number>;
}

const buildDocument = (card: AgentCard): Document => {
  const tokens = tokenize(cardText(card));
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return { card, tokens, length: tokens.length, tf };
};

const documentFrequency = (
  docs: readonly Document[],
  term: string,
): number => {
  let df = 0;
  for (const d of docs) if (d.tf.has(term)) df += 1;
  return df;
};

const idf = (n: number, df: number): number =>
  Math.log((n - df + 0.5) / (df + 0.5) + 1);

const bm25Score = (
  doc: Document,
  queryTerms: readonly string[],
  n: number,
  avgdl: number,
  docs: readonly Document[],
): number => {
  let score = 0;
  for (const term of queryTerms) {
    const tf = doc.tf.get(term);
    if (!tf) continue;
    const df = documentFrequency(docs, term);
    const num = tf * (K1 + 1);
    const denom = tf + K1 * (1 - B + B * (doc.length / (avgdl || 1)));
    score += idf(n, df) * (num / denom);
  }
  return score;
};

// --- public API -----------------------------------------------------------

export interface SearchOptions {
  readonly limit: number;
}

/**
 * Rank cards for the given query. Returns FindResult[] sorted by descending
 * score, with scores normalised to [0, 1]. Cards with score == 0 are filtered
 * out (not relevant).
 */
export const bm25Search = (
  cards: Iterable<AgentCard>,
  query: string,
  opts: SearchOptions,
): FindResult[] => {
  const docs: Document[] = [];
  for (const c of cards) docs.push(buildDocument(c));
  const n = docs.length;
  if (n === 0) return [];
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const totalLen = docs.reduce((s, d) => s + d.length, 0);
  const avgdl = totalLen / n;

  const raw: Array<{ card: AgentCard; score: number }> = docs.map((d) => ({
    card: d.card,
    score: bm25Score(d, queryTerms, n, avgdl, docs),
  }));

  const relevant = raw.filter((r) => r.score > 0);
  if (relevant.length === 0) return [];

  // Normalise to [0, 1]. Max score becomes 1 so the best match is clearly
  // the top. Minimum positive scores stay positive.
  const maxScore = relevant.reduce(
    (m, r) => (r.score > m ? r.score : m),
    0,
  );
  const normalised = relevant.map((r) => ({
    card: r.card,
    score: maxScore > 0 ? r.score / maxScore : 0,
  }));

  normalised.sort((a, b) => b.score - a.score);
  return normalised.slice(0, Math.max(0, opts.limit));
};
