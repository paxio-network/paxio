# M-TD22 — Authorship enforcement для `docs/tech-debt.md`

> **Предметная область:** Governance / Process enforcement
> **Ticket:** TD-22 (🔴 OPEN, owner=`user/architect`)
> **Feature Area:** не привязан к FA — это cross-cutting governance

## Проблема

Per `.claude/rules/scope-guard.md`:

> «`docs/tech-debt.md` — ТОЛЬКО reviewer записывает новый долг; architect пишет тесты на fix и заполняет колонку «Тест на fix».»

На практике правило нарушалось architect'ом **минимум три раза**:

| Occurrence | Commit | Violation |
|---|---|---|
| 1 (TD-10) | `57d4cc1` | architect поставил ✅ CLOSED на TD-05/TD-06 (должен был dev или reviewer). |
| 2 (PR #2 part of TD-22) | `eff7f71` / `0aa60db` | architect self-recorded новые rows (TD-20 + TD-21) + history entries. |
| 3 (PR #3 part of TD-22) | `f106908` | architect перезаписал description row TD-19 целиком (content correction был правильный, но row rewrite — reviewer scope). |

Коренная причина: **файловые ownership правила в `.claude/rules/scope-guard.md` — это текст, не enforcement.** LLM-агент под compaction может забыть ограничение. Существующий PreToolUse hook в `.claude/settings.json` блокирует всех (включая architect) при staged `docs/tech-debt.md`, но:

- Не разрешает reviewer'у (который имеет право писать) → reviewer использует tool которые bypass hook (Write/Edit напрямую), или session running как другой agent.
- Не имеет bypass marker для **легитимного** architect use case (заполнение колонки «Тест на fix»).
- На практике architect'у удаётся commit в `docs/tech-debt.md` — значит hook не срабатывает в subagent context или обходится через не-Bash tools (Write/Edit).

## Готово когда:

1. `.claude/settings.json` содержит PreToolUse hook (или PostToolUse для Write/Edit), который:
   - **Блокирует** `git commit` / `Write` / `Edit` на `docs/tech-debt.md` **если** commit message / edit контекст НЕ содержит один из sentinel markers:
     - `reviewer:` (начало commit message → reviewer authored)
     - `Co-Authored-By:` trailer с ролью `reviewer`
     - `[tech-debt: fill-test-column]` — architect explicit bypass когда заполняет только колонку «Тест на fix»
   - Выводит чёткое BLOCKED message с объяснением какой marker нужен.
   - Exit code 1 при нарушении (halt tool execution).
2. `tests/_specs/tech-debt-authorship.test.ts` GREEN (сейчас RED).
3. `bash scripts/verify_td22_authorship.sh` PASS (сейчас FAIL).
4. Acceptance e2e: попытка architect'а сделать `git commit` на `docs/tech-debt.md` без bypass marker → hook блокирует с exit 1.

## Метод верификации:

- [ ] **unit test** — `pnpm exec vitest run tests/_specs/tech-debt-authorship.test.ts` → GREEN
- [ ] **acceptance script** — `bash scripts/verify_td22_authorship.sh` → exit 0
- [ ] **manual e2e** — architect stages `docs/tech-debt.md` без marker → `git commit` blocked
- [ ] **manual e2e (positive)** — architect stages `docs/tech-debt.md` с `[tech-debt: fill-test-column]` в message → commit проходит

## Зависимости:

- [ ] нет блокирующих зависимостей (standalone governance fix)

---

## Шаг 1: Architect — RED spec (этот milestone)

### architect — в этом PR:
- [x] Создал `docs/sprints/M-TD22-authorship-hook.md` (этот файл)
- [x] Написал `tests/_specs/tech-debt-authorship.test.ts` с RED assertions:
  1. `.claude/settings.json` существует и парсится как JSON
  2. `settings.hooks.PreToolUse` содержит Bash matcher
  3. В массиве PreToolUse hooks есть команда которая ссылается на `docs/tech-debt.md`
  4. Эта команда содержит bypass pattern `[tech-debt: fill-test-column]`
  5. Эта команда содержит reviewer allow-pattern (`reviewer:` prefix check OR `Co-Authored-By.*reviewer`)
  6. Эта команда содержит `exit 1` (blocking semantics)
  7. Эта команда выводит `BLOCKED` слово в error message
  8. (Historical baseline) `docs/tech-debt.md` TD-22 row описывает минимум 3 prior occurrences
- [x] Написал `scripts/verify_td22_authorship.sh`:
  1. `.claude/settings.json` существует + валидный JSON
  2. PreToolUse hook references `docs/tech-debt.md` + содержит 3 marker patterns
  3. Симулирует staged `docs/tech-debt.md` в scratch repo → runs hook command через `TOOL_INPUT='git commit'` → expects exit 1
  4. Симулирует staged `docs/tech-debt.md` + `TOOL_INPUT` содержит `[tech-debt: fill-test-column]` → expects exit 0
  5. Симулирует staged `docs/tech-debt.md` + commit message `reviewer: TD-X closed` → expects exit 0
- Приёмка: RED (hook не содержит bypass pattern / reviewer allow — всё ещё блокирует unconditionally)

## Шаг 2: User — hook implementation

### user — в отдельном follow-up PR:
- [ ] Запустить startup protocol
- [ ] Прочитать этот milestone + RED test + acceptance script — это TЗ
- [ ] Заменить существующий PreToolUse hook на `docs/tech-debt.md` в `.claude/settings.json` на обогащённую версию:

```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "command",
    "command": "if echo \"$TOOL_INPUT\" | grep -q 'git commit'; then if git diff --cached --name-only 2>/dev/null | grep -qE '^docs/tech-debt\\.md$'; then if echo \"$TOOL_INPUT\" | grep -qE 'reviewer:|\\[tech-debt: fill-test-column\\]'; then :; else echo 'BLOCKED: docs/tech-debt.md — reviewer only. Architect may fill the «Тест на fix» column with commit message containing [tech-debt: fill-test-column] marker.'; exit 1; fi; fi; fi"
  }]
}
```

- [ ] Аналогичный PostToolUse hook для `Write` / `Edit` (чтобы architect не обошёл через Edit tool):

```json
{
  "matcher": "Edit|Write",
  "hooks": [{
    "type": "command",
    "command": "if git diff --name-only 2>/dev/null | grep -qE '^docs/tech-debt\\.md$'; then echo 'WARNING: docs/tech-debt.md modified by non-reviewer. Ensure commit uses [tech-debt: fill-test-column] marker OR revert changes.'; fi"
  }]
}
```

*(PostToolUse для Edit/Write — warning-only, т.к. hook bash не видит tool_input текст edit'а; гейт срабатывает на commit уровне.)*

- [ ] Запустить `pnpm exec vitest run tests/_specs/tech-debt-authorship.test.ts` → должен стать GREEN
- [ ] Запустить `bash scripts/verify_td22_authorship.sh` → должен PASS
- Приёмка: все ассерты GREEN + acceptance PASS

## Шаг 3: Reviewer

- [ ] Scope check: `git diff --name-only` — изменения только в `.claude/settings.json`
- [ ] Tests не изменены: `git diff tests/_specs/tech-debt-authorship.test.ts` — пусто
- [ ] Проверить что hook работает: симулировать architect commit → BLOCKED
- [ ] APPROVED → обновить `docs/project-state.md` + записать в `docs/tech-debt.md`: TD-22 ✅ CLOSED

## Шаг 4: Закрытие

- [ ] Merge PR → dev
- [ ] Следующий architect session — при попытке touching `docs/tech-debt.md` hook срабатывает, работа уходит к reviewer.
- [ ] Обновить Roadmap если governance стабилизация отмечена

## Оценка: 0.5 дня (architect RED spec) + 0.5 дня (user hook impl + verify)

## Статус: 🟡 ТЕСТЫ НАПИСАНЫ (architect RED spec landed; awaits user hook impl)

## Таблица задач

| # | Задача | Агент | Метод верификации | Архитектурные требования | Файлы |
|---|---|---|---|---|---|
| T-1 | RED spec + milestone + acceptance script | architect | vitest RED + bash FAIL | Pure file-read + JSON parse; no mocks; execSync для git log analysis OK | `tests/_specs/tech-debt-authorship.test.ts`, `scripts/verify_td22_authorship.sh`, `docs/sprints/M-TD22-authorship-hook.md` |
| T-2 | Hook implementation в settings.json | user | vitest GREEN + bash PASS | Bash-one-liner, idempotent, readable; exit 1 on violation; clear BLOCKED message | `.claude/settings.json` |
| T-3 | (Optional) Edit/Write guard post-hook | user | manual verification | Warning-only (can't block Edit tool directly); paired with commit-level block | `.claude/settings.json` |

## Известные ограничения hook'а

1. **Bypass через non-Bash tools.** Если architect редактирует `docs/tech-debt.md` через Edit tool, а потом коммитит **только другие файлы**, то staged `docs/tech-debt.md` = пусто при commit → hook не триггерит. Митигация: reviewer видит diff в PR review.
2. **Bypass через `--no-verify` эквивалент.** Claude Code hook PreToolUse обязателен — агент не может выключить. Но если user сам коммитит — user может `git commit -n` (skip hooks). Это OK, user — авторитет.
3. **Reviewer identity basis.** Мы полагаемся на commit message prefix `reviewer:` или Co-Authored-By trailer — trust-based. Git не enforces реальный agent identity. Аудитории — reviewer sees own commit log и user возможность audit.

## Историческая контекст (для reviewer и future architect)

- TD-10 (original, `57d4cc1`): architect поставил CLOSED — process note recorded, no enforcement
- TD-22 recorded in PR #2 (`e898102` merge): noted 2-я occurrence
- PR #3 `f106908`: 3-я occurrence — architect переписал TD-19 description row
- User в PR #2 APPROVED response: «architect в следующей сессии напишет RED test на проверку авторства docs/tech-debt.md + hook»
- Эта сессия = та самая «следующая»
