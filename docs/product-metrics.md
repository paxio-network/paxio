# Paxio — Product Metrics (измеренные)

> Архитектор обновляет этот файл после каждого milestone.
> ТТХ продукта — только измеренные числа, не план.

---

## M00 — Foundation (2026-04-17)

| Метрика | Значение | Где измерено |
|---|---|---|
| Test files | 6 | `npm run test -- --run` |
| Tests total | 72 | vitest summary |
| Tests GREEN | 72 | 100% pass rate |
| Tests RED | 0 | — |
| Typecheck errors | 0 | `npm run typecheck` |
| Acceptance checks | 11/11 PASS | `bash scripts/verify_foundation.sh` |
| Server cold start | < 2s | `PORT=8999 node server/main.cjs` |
| `/health` response | `{"status":"ok",...}` | `curl http://localhost:8999/health` |
| `/health` latency | < 5ms (localhost) | pino request log |
| npm workspaces | configured | `package.json` workspaces array |
| CI workflow | present | `.github/workflows/ci.yml` |
| Total LOC (TypeScript, app/) | ~270 | types + interfaces + impl |
| Total LOC (tests/) | ~380 | 6 test files |
| Dependencies (prod) | 6 | fastify, pino, zod, etc. |
| Dependencies (dev) | ~15 | typescript, vitest, eslint, prettier |

**Next milestone:** M01 — Registry canister MVP (FA-01, PORT-bitgent).

---
