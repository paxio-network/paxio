// CronScheduler — periodic crawler trigger (M-L1-launch T-4).
//
// Замысел: бэкенд держит долгоживущий scheduler, который каждые
// `tickIntervalMs` (default 60_000 = 1 min) пробуждается, проходит по
// списку enabled sources и для каждого проверяет: «сколько прошло с
// последнего successful run по `crawlRuns.lastRunForSource`?». Если
// прошло >= `minIntervalPerSourceMs` (default 5*60_000 = 5 min, чтобы
// совпасть с handler rate-limit из T-2) — триггерит `runCrawler` для
// этого источника. Иначе пропускает до следующего tick.
//
// Этот тип конфига замораживается в `apps/back/server/wiring/01-registry.cjs`
// и инжектируется в scheduler factory.

import { z } from 'zod';
import { ZodCrawlerSource } from './crawler-source';

export const ZodCronTickConfig = z.object({
  /**
   * Period между ticks. Каждые tick'и scheduler пробуждается, оценивает
   * лимиты и максимум trigger'ит ОДИН run для одного source (round-robin).
   * Default: 60_000 (1 min) — частые tick'и, дешёвые проверки.
   */
  tickIntervalMs: z.number().int().positive().default(60_000),

  /**
   * Минимальный интервал между runs для ОДНОГО источника. Совпадает с
   * handler rate-limit (5 min) — scheduler не должен агрессивнее
   * ручных trigger'ов нагружать external API.
   * Default: 5*60_000 (5 min).
   */
  minIntervalPerSourceMs: z.number().int().positive().default(5 * 60_000),

  /**
   * Какие источники scheduler берёт в round-robin. Disabled источники
   * scheduler пропускает (их можно запускать ручным `POST /api/admin/crawl`).
   * Default: все 6 (`CRAWLER_SOURCES`).
   */
  enabledSources: z.array(ZodCrawlerSource).readonly().default([
    'native',
    'erc8004',
    'a2a',
    'mcp',
    'fetch-ai',
    'virtuals',
  ]),

  /**
   * Глобальный outbound concurrency cap — никогда не более N одновременных
   * `runCrawler` вызовов. Защита от случая когда tick'и накладываются
   * (например adapter висит на 30s timeout).
   * Default: 1 (единичная очередь).
   */
  maxConcurrentRuns: z.number().int().positive().default(1),
});
export type CronTickConfig = z.infer<typeof ZodCronTickConfig>;

/**
 * Reason почему scheduler пропустил (или triggered) source на tick'е.
 * Discriminated union для exhaustive logging + monitoring.
 */
export type SchedulerTickDecision =
  | { kind: 'triggered'; source: import('./crawler-source').CrawlerSource }
  | {
      kind: 'skipped_rate_limit';
      source: import('./crawler-source').CrawlerSource;
      lastRunAt: string;
      msUntilNextEligible: number;
    }
  | {
      kind: 'skipped_disabled';
      source: import('./crawler-source').CrawlerSource;
    }
  | {
      kind: 'skipped_concurrency';
      source: import('./crawler-source').CrawlerSource;
      activeRuns: number;
    }
  | { kind: 'no_sources_due' };
