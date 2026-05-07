# M-L1-T3e — pg storage upsertParams defaults for CHECK-constrained columns

**Status:** RED → GREEN gate
**Owner:** registry-dev

## Why

Production bug 2026-05-07 12:02 UTC after PR #129 (T-3d body-stringify) merged. **Adapter now successfully fetches 9226 records from Agentverse** (huge jump from processed:0 across PR #120/#124/#125/#126/#129) — but **storageErrors:9226, upserted:0**.

Root cause: pg CHECK constraints on new taxonomy columns DO NOT allow NULL — only enum values. Adapter doesn't populate these fields (Zod-optional in AgentCard). `upsertParams` uses `?? undefined` → pg coerces undefined → NULL → CHECK violation → all 9226 inserts fail.

Affected columns:
- `framework IN ('langchain','crewai','autogen','eliza','llamaindex','vercel-ai','autogpt','paxio-native','custom','unknown')` DEFAULT `'unknown'`
- `wallet_status IN ('paxio-native','external','none')` DEFAULT `'none'`
- `payment_facilitator IN ('paxio','coinbase','skyfire','stripe','self','unknown')` DEFAULT `'unknown'`
- `security_badge_level IN (...)` DEFAULT `'none'`

## Готово когда

1. New T-3e test in `products/01-registry/tests/postgres-storage.test.ts` GREEN — asserts upsertParams emits DEFAULT-equivalent strings for these 4 fields when AgentCard doesn't set them.
2. NO undefined values in any params position.
3. Existing 27 tests in postgres-storage.test.ts STAY GREEN.
4. Production smoke (post-merge): fetch-ai crawl returns `upserted > 0`, agents count rises ~9K.

## Architecture Requirements

- Replace `?? undefined` with proper defaults matching SQL DEFAULT for CHECK-constrained columns:
  - `fw ?? undefined` → `fw ?? 'unknown'`
  - `walletStatus ?? undefined` → `walletStatus ?? 'none'`
  - `paymentFacilitator ?? undefined` → `paymentFacilitator ?? 'unknown'`
  - `secBadge ?? undefined` → `secBadge ?? 'none'`
- For non-CHECK-constrained optional fields (capabilities[], inputTypes[], etc.) replace `?? undefined` with `?? null` (pg 8.x doesn't accept undefined cleanly).

## Tasks

| # | Task | Agent | Directory | Verification |
|---|---|---|---|---|
| T-1 | Update `upsertParams` defaults in `products/01-registry/app/infra/postgres-storage.ts` | registry-dev | `products/01-registry/app/infra/` | 28/28 postgres-storage tests GREEN, baseline GREEN |

## Slim spec for registry-dev session

```
You are registry-dev. Task: fix upsertParams defaults for CHECK-constrained
pg columns. Production bug — fetch-ai crawl gets 9226 storageErrors all from
NULL violating CHECK constraints.

Setup:
  cd /home/nous/paxio
  mkdir -p /home/nous/paxio-worktrees
  git worktree add /home/nous/paxio-worktrees/rd-t3e -B feature/M-L1-T3e-storage-defaults origin/feature/M-L1-T3e-storage-defaults
  cd /home/nous/paxio-worktrees/rd-t3e
  git config user.name registry-dev
  git config user.email registry-dev@paxio.network
  pnpm install

Read ONLY (2 файла):
  products/01-registry/tests/postgres-storage.test.ts   (RED spec, sacred — 28 tests, T-3e is новый)
  products/01-registry/app/infra/postgres-storage.ts    (file to modify)

Implement в `upsertParams` function (около line 526):

Replace these `?? undefined` defaults with proper SQL DEFAULT-matching values:

   const fw = card.framework;
   // ...
   const walletStatus = w?.status;
   // ...
   const paymentFacilitator = p?.facilitator;
   // ...
   const secBadge = sec?.badgeLevel;

Then in the return array params:
  $18 framework:           was `fw ?? undefined`           →  `fw ?? 'unknown'`
  $21 wallet_status:       was `walletStatus ?? undefined` →  `walletStatus ?? 'none'`
  $26 payment_facilitator: was `paymentFacilitator ?? undefined` → `paymentFacilitator ?? 'unknown'`
  $39 security_badge_level: was `secBadge ?? undefined`   →  `secBadge ?? 'none'`

Also replace ALL other `?? undefined` in upsertParams with `?? null` (pg 8.x
doesn't accept undefined params cleanly):
  - $14 capabilities, $15 input_types, $16 output_types, $17 languages
  - $24 payment_accepts
  - $43 compliance_eu_ai_act, $48 compliance_data_handling
  - $49 ecosystem_network, $53 ecosystem_compatible_clients

DO NOT touch:
  - tests/* (architect-owned)
  - other files

Verify (3 commands):
  pnpm typecheck
  pnpm exec vitest run products/01-registry/tests/postgres-storage.test.ts   # 28/28 GREEN
  pnpm exec vitest run                                                         # full baseline

Commit message:
  fix(M-L1-T3e): upsertParams defaults for CHECK-constrained columns

  Production bug after PR #129 merge: fetch-ai crawl returned 9226
  storageErrors / 0 upserted. Root cause: pg CHECK constraints on new
  taxonomy columns reject NULL; adapter doesn't populate these
  (Zod-optional); upsertParams used `?? undefined` → pg coerced to NULL
  → CHECK violation on every insert.

  Fix: emit SQL-DEFAULT-matching enum values for CHECK-constrained columns:
  framework='unknown', wallet_status='none', payment_facilitator='unknown',
  security_badge_level='none'. Replace remaining `?? undefined` with `?? null`
  for non-enum fields.

  28/28 postgres-storage tests GREEN.

Push:
  git push origin feature/M-L1-T3e-storage-defaults

Reply «готово» + worktree path + commit sha + remote head + verification.
NO `gh pr` — architect handles PR.

Skills доступны on-demand: (none beyond registry-dev's always-on allowlist —
sql-best-practices covers schema/CHECK semantics).
```
