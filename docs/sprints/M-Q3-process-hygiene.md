# M-Q3 — Process Hygiene & Worktree Isolation

**Тип**: Quality / Process milestone (зона architect — `.claude/rules/`,
`.claude/agents/`, `tests/`, `scripts/`, `docs/sprints/`).
**Статус**: 🟢 ACTIVE
**Branch**: `feature/M-Q3-process-hygiene`
**Worktree**: `/tmp/paxio-mq3` (architect)
**Зависимости**: M-Q1 (pre-commit hook), M-Q2 (spec-review gate, sub-agent invocation).

---

## Цель

Закрыть три класса процессуальных багов, наблюдавшихся в session 2026-04-27:

1. **Cross-user chmod EPERM** — несколько OS-юзеров (`nous`, `minimax`)
   делят `/home/nous/paxio`. `pnpm install`, `node scripts/copy-api-handlers.mjs`,
   `pnpm build` падают с `EPERM: operation not permitted, chmod` потому
   что POSIX chmod требует владельца ИЛИ root (group bit'ов
   недостаточно). Group `devteam` НЕ помогает.
2. **Branch race condition** — пока reviewer гонит проверку в одной
   сессии, другая сессия `git checkout`'ит свою feature-ветку в shared
   working tree → следующий commit reviewer'а уходит в чужую ветку.
   2026-04-27 у registry-dev session.
3. **Untracked WIP leakage** — untracked файлы прошлой сессии видны в
   `git status`, и могут случайно быть включены в коммит. Случилось у
   registry-dev attempt-1: 5 файлов scope violations засветились через
   `git status` next session'а.

Решение: **per-session git worktree** + **reviewer Phase 1.6 porcelain
checkpoint** + **safety.md документация cross-user pattern**.

## Готово когда

1. `.claude/rules/startup-protocol.md` имеет Step 0 с командой
   `git worktree add /tmp/paxio-<name>`, объяснением EPERM/chmod, и
   cleanup-командой (`git worktree remove`).
2. `.claude/rules/architect-protocol.md` имеет ФАЗА 0 (перед ФАЗА 1)
   с полным setup workflow для architect, идентичным паттерну в
   startup-protocol но с архитектурной мотивацией (3 класса багов).
3. `.claude/rules/workflow.md` Architect и Dev sections имеют Step 0
   для setup worktree.
4. `.claude/rules/scope-guard.md` имеет секцию «Per-session worktree
   isolation» с 3 классами багов + canonical command + cleanup +
   ссылкой на reviewer Phase 1.6.
5. `.claude/agents/reviewer.md` Phase 1 имеет под-секцию Phase 1.6
   «Working tree hygiene» с `git status --porcelain` checkpoint
   ПЕРЕД любым commit'ом в `docs/project-state.md` или
   `docs/tech-debt.md`. Объясняет foreign-WIP rationale.
6. `.claude/rules/safety.md` имеет секцию «Cross-user file ownership /
   chmod EPERM» с полным explainer'ом + workaround.
7. `tests/process-hygiene-drift.test.ts` (architect-only file) имеет
   ≥15 assertions покрывающих T-1..T-2 + T-5 deliverables.
8. `scripts/verify_M-Q3.sh` запускается idempotent, тестирует:
   (a) deliverables exist, (b) drift-guard GREEN, (c) worktree create +
   isolate + cleanup contract, (d) reviewer.md содержит porcelain rule,
   (e) safety.md cross-user section non-trivial.

## Декомпозиция (5 задач)

| # | Task | Agent | Verification | Architecture Requirements | Files |
|---|------|-------|--------------|---------------------------|-------|
| T-1 | Per-session worktree convention | architect | drift-guard tests 11/19 GREEN + acceptance section 6 | 4 файла (startup-protocol, architect-protocol, workflow, scope-guard) согласованно описывают паттерн; canonical command идентичен между файлами; cleanup mentioned | `.claude/rules/{startup-protocol,architect-protocol,workflow,scope-guard}.md` |
| T-2 | Reviewer Phase 1.6 porcelain checkpoint | architect | drift-guard tests 4/19 GREEN + acceptance section 4 | Phase 1.6 stands BEFORE Phase 2 numerically; references foreign-WIP rationale; ссылка на scope-guard worktree section | `.claude/agents/reviewer.md` |
| T-3 | Drift-guard test для T-1/T-2/T-5 | architect | RED before T-1/T-2/T-5, GREEN after | Test-first; 19+ assertions; uses `readFileSync` patterns identical to architect-self-review.test.ts | `tests/process-hygiene-drift.test.ts` |
| T-4 | Acceptance script verifying worktree contract | architect | `bash scripts/verify_M-Q3.sh` PASS=N FAIL=0 (idempotent 2× run) | Trap для cleanup worktrees; tests isolation contract (HEAD A moves, HEAD B unchanged); section 3 doesn't fail on second run | `scripts/verify_M-Q3.sh` |
| T-5 | safety.md cross-user chmod documentation | architect | drift-guard tests 4/19 GREEN + acceptance section 5 | Section explains: (a) POSIX rule chmod requires owner OR root, (b) group `devteam` НЕ помогает, (c) workaround = per-session worktree, (d) common failures = pnpm install + copy-api-handlers; English + Russian wording | `.claude/rules/safety.md` |

## Метод верификации

**Тип 1 (логика):** unit test RED → GREEN. `tests/process-hygiene-drift.test.ts`.
**Тип 2 (интеграция):** acceptance script. `scripts/verify_M-Q3.sh`.

Оба должны PASS перед merge в `dev`.

## Архитектурные требования (architect-only diff)

- Все 7 файлов diff'а — architect zone (`.claude/rules/*`, `.claude/agents/*`,
  `tests/*.test.ts`, `scripts/verify_*.sh`, `docs/sprints/*.md`)
- НЕТ изменений в `apps/`, `products/`, `packages/`, `platform/`
- НЕТ зависимостей: ни `package.json`, ни `pnpm-lock.yaml`, ни `Cargo.toml`
- TESTS SACRED — drift-guard test (T-3) написан до T-1/T-2/T-5;
  T-3 not modified after initial RED commit

## Анти-цели

- **НЕ** менять husky pre-commit hook (отдельный milestone если нужно)
- **НЕ** добавлять в hook проверку chmod owner (это runtime concern,
  не commit-time)
- **НЕ** автоматизировать `git worktree add` через скрипт wrapping —
  пусть каждый агент явно создаёт. Wrapper скрывает важный контекст
- **НЕ** удалять `/home/nous/paxio` как working tree (некоторые сессии
  могут продолжать его использовать когда worktree излишен)

## Predusловия среды

- pnpm install clean
- pnpm typecheck clean
- vitest baseline GREEN
- `/home/nous/paxio` доступен с git remote `origin` указывающим на
  `paxio-network/paxio`

## Рисков и митигации

| Риск | Митигация |
|------|-----------|
| Worktree остаётся живым после merge → засоряет /tmp | M-Q3 не автоматизирует cleanup. Architect/dev делают `git worktree remove` руками. Acceptance script это документирует |
| Worktree командует `cd /home/nous/paxio` как первый шаг — но если агент уже в /tmp/paxio-XXX, эта cd ломает текущий контекст | Команда документирована для FRESH session. Если агент уже в worktree, шаг 0 пропускает |
| Две сессии создают `/tmp/paxio-mq3` одновременно | `git worktree add` падает атомарно если path занят. Каждая сессия выбирает уникальное имя через milestone-id |
| Reviewer Phase 1.6 ловит legitimate work-in-progress | Правило: porcelain checkpoint только ПЕРЕД commit'ом доков. Если reviewer пишет ad-hoc заметки — он не commit'ит их |

## Acceptance criteria (для reviewer Phase 0)

- [ ] Все 8 «Готово когда» имеют конкретный test или acceptance check
- [ ] T-3 drift-guard test покрывает все ассерты, изложенные в «Готово когда»
- [ ] T-4 acceptance script idempotent (2× прогон без manual cleanup)
- [ ] Все измененные файлы — architect zone
- [ ] CHANGELOG-style комментарии в diff: T-1/T-2/T-5 marker references

## Связанные TD

- TD-30 (architect-as-frontend-dev): worktree не решает напрямую, но
  reviewer Phase 1.6 ловит untracked файлы вне ownership scope как
  secondary signal
- Реestrующих conflicts с TD-33/34/35 нет (на момент этого milestone эти
  ID ещё не записаны)

## Следующее после merge

После APPROVED + merge в `dev`:
- Все будущие architect milestones открываются через
  `git worktree add /tmp/paxio-<name>`
- Все dev sessions запускаются с тем же step 0
- Reviewer Phase 1.6 включается автоматически при каждом review
