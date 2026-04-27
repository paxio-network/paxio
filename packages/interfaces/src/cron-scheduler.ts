// CronScheduler port — domain contract для T-4 auto-scheduler.
//
// Pure interface (no I/O assumption). Реализация в
// `products/01-registry/app/domain/cron-scheduler.ts` (registry-dev).
// Composition root в `apps/back/server/wiring/01-registry.cjs`
// (backend-dev) запускает `start()` на startup и держит handle для
// graceful shutdown.
//
// Правила:
//   - Pure factory pattern: `createCronScheduler(deps) → frozen object`
//   - НЕ выполняет I/O напрямую. Использует injected `crawlRuns`,
//     `crawler`, `crawlerAdapters`, `clock`, `logger`.
//   - Один tick = одно решение (round-robin по `enabledSources`):
//     если есть due source И есть свободный concurrency slot → trigger.
//     Иначе skipped с явным `SchedulerTickDecision`.
//   - `runCrawler` запускается с `triggeredBy: 'cron'`, summary
//     persistится через `crawlRuns.recordRun`.

import type {
  CronTickConfig,
  CrawlerSource,
  Result,
  SchedulerTickDecision,
} from '@paxio/types';

export type CronSchedulerError =
  | { code: 'already_started'; message: string }
  | { code: 'not_started'; message: string };

export interface CronScheduler {
  /**
   * Запустить scheduler. Internally: `setInterval(tick, config.tickIntervalMs)`.
   * Idempotent: повторный `start()` без stop → `already_started`.
   * НЕ блокирует — возвращает сразу.
   */
  start(): Result<void, CronSchedulerError>;

  /**
   * Stop scheduler — clears interval. Активные runs дорабатывают,
   * но scheduler не запускает новые. Idempotent.
   */
  stop(): Result<void, CronSchedulerError>;

  /**
   * Manual tick — вызывается из tests или admin tooling. Возвращает
   * массив decisions (одна на каждый source проверенный в этом tick'е).
   * Используется в RED тестах для assertion'а round-robin поведения
   * без waiting'а на setInterval.
   */
  tickOnce(): Promise<readonly SchedulerTickDecision[]>;

  /**
   * Конфиг snapshot — для observability. Возвращает frozen copy.
   */
  getConfig(): CronTickConfig;

  /**
   * Сколько runs сейчас активно (не завершились). Для healthcheck +
   * concurrency cap.
   */
  getActiveRunsCount(): number;

  /**
   * Какой источник будет следующим в round-robin (для debugging).
   * Не side-effect — read-only state.
   */
  peekNextSource(): CrawlerSource | null;
}
