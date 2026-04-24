// runCrawler — orchestrates one ingestion pass for a single source adapter.
//
// Pure orchestration: pulls raw records via adapter.fetchAgents(), validates
// + projects each via adapter.toCanonical(), and upserts into storage. No
// HTTP, no DB, no clock — all deps injected through the function args.
//
// Returns a deterministic summary so callers (admin endpoint, scheduler,
// tests) can present per-source ingest stats and surface failures.
//
// Failure semantics:
//   - One bad record (toCanonical returns err) → counted as `parseErrors`,
//     iteration continues. We never abort the whole crawl on one bad row.
//   - One storage failure (upsert returns err) → counted as `storageErrors`,
//     iteration continues. Surfaces in the summary.
//   - Source-level error (fetchAgents itself throws) → counted once, then
//     iteration ends. Result reflects the partial progress.
//
// Bounded by `maxRecords` so a single trigger can't run away (e.g. a
// misbehaving source returning the same page forever). Caller chooses the
// budget — typical defaults: MVP one-shot trigger uses 5000.

import type {
  CrawlerSourceAdapter,
  AgentStorage,
} from '@paxio/interfaces';
import type { CrawlerSource } from '@paxio/types';

export interface CrawlerLogger {
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
}

export interface CrawlerSummary {
  readonly source: CrawlerSource;
  readonly processed: number;
  readonly upserted: number;
  readonly parseErrors: number;
  readonly storageErrors: number;
  readonly sourceErrors: number;
  readonly stoppedReason: 'completed' | 'max_records' | 'source_error';
}

export interface RunCrawlerDeps<TRaw> {
  readonly adapter: CrawlerSourceAdapter<TRaw>;
  readonly storage: AgentStorage;
  readonly logger?: CrawlerLogger;
  readonly maxRecords?: number;
  /**
   * Optional progress callback fired after every N processed records (default
   * 100). Useful for long-running ingests so the operator sees liveness.
   */
  readonly onProgress?: (processed: number) => void;
  readonly progressEvery?: number;
}

const DEFAULT_MAX_RECORDS = 5000;
const DEFAULT_PROGRESS_EVERY = 100;

const noopLogger: CrawlerLogger = Object.freeze({
  info: () => {
    /* noop */
  },
  warn: () => {
    /* noop */
  },
});

export const runCrawler = async <TRaw>(
  deps: RunCrawlerDeps<TRaw>,
): Promise<CrawlerSummary> => {
  const logger = deps.logger ?? noopLogger;
  const maxRecords = Math.max(1, deps.maxRecords ?? DEFAULT_MAX_RECORDS);
  const progressEvery = Math.max(
    1,
    deps.progressEvery ?? DEFAULT_PROGRESS_EVERY,
  );

  let processed = 0;
  let upserted = 0;
  let parseErrors = 0;
  let storageErrors = 0;
  let sourceErrors = 0;
  let stoppedReason: CrawlerSummary['stoppedReason'] = 'completed';

  logger.info('crawler_start', {
    source: deps.adapter.sourceName,
    maxRecords,
  });

  try {
    for await (const raw of deps.adapter.fetchAgents()) {
      if (processed >= maxRecords) {
        stoppedReason = 'max_records';
        break;
      }
      processed += 1;

      const projection = deps.adapter.toCanonical(raw);
      if (!projection.ok) {
        parseErrors += 1;
        logger.warn('crawler_parse_error', {
          source: deps.adapter.sourceName,
          code: projection.error.code,
          message: projection.error.message,
        });
      } else {
        // Defence-in-depth: contract says card.source MUST equal
        // adapter.sourceName. If the adapter is buggy and yields the wrong
        // source, count as a parse error rather than poisoning storage.
        if (projection.value.source !== deps.adapter.sourceName) {
          parseErrors += 1;
          logger.warn('crawler_source_mismatch', {
            adapterSource: deps.adapter.sourceName,
            cardSource: projection.value.source,
            did: projection.value.did,
          });
        } else {
          const upsertResult = await deps.storage.upsert(projection.value);
          if (upsertResult.ok) {
            upserted += 1;
          } else {
            storageErrors += 1;
            const e = upsertResult.error;
            logger.warn('crawler_storage_error', {
              source: deps.adapter.sourceName,
              did: projection.value.did,
              code: e.code,
              // Only the non-not_found variants carry a `message`; not_found
              // surfaces the offending DID instead.
              ...(e.code === 'not_found'
                ? { offendingDid: e.did }
                : { message: e.message }),
            });
          }
        }
      }

      if (processed % progressEvery === 0 && deps.onProgress) {
        deps.onProgress(processed);
      }
    }
  } catch (cause) {
    sourceErrors = 1;
    stoppedReason = 'source_error';
    logger.warn('crawler_source_threw', {
      source: deps.adapter.sourceName,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }

  const summary: CrawlerSummary = Object.freeze({
    source: deps.adapter.sourceName,
    processed,
    upserted,
    parseErrors,
    storageErrors,
    sourceErrors,
    stoppedReason,
  });

  logger.info('crawler_end', { ...summary });

  return summary;
};
