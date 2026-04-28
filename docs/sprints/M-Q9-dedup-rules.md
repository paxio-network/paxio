# M-Q9 — Move safety/testing to manual-load + targeted grep in dev startup protocols

**Тип**: Quality / context-budget (architect scope only).
**Зависимости**: M-Q8 merged (dev-startup.md introduced).
**Worktree**: `/tmp/paxio-mq9`.
**Branch**: `feature/M-Q9-dedup-rules`.
**Estimated**: 30 min.

## Проблема

После M-Q8 dev session auto-load = ~70 KB (frontend) / ~78 KB (backend). Профиль bloat'а:
- `safety.md` 6.5 KB — Zod schemas в `packages/types/`, secrets в env, EPERM в worktree-isolation.md, "no any" в frontend-rules/backend-code-style → каждый его раздел уже есть в более узком файле
- `testing.md` 6.3 KB — test-first dev rules уже в `dev-startup.md`; thresholds + frameworks нужны architect'у когда пишет RED specs, не дев'у при impl
- В agent file'ах startup-protocol step 2 говорит «Read tech-debt.md» / «Check tech-debt.md» — дев интерпретирует как whole-read, получает ~15K tokens паргараф-rows вместо нужных 1-3K
- Step 5-6 говорят «Read project-state.md + docs/sprints/M*.md» — open-ended browse, expensive

## Решение

### `safety.md` + `testing.md` → `globs: []`

Файлы остаются (контент сохраняется). Architect/reviewer Read их manual когда пишут спеки / делают Phase N review. Дев их не auto-load'ит.

### Surgical fix step 2 + step 5-6 в 4 agent файлах

Минимальные правки — структура 9-step / 10-step протокола сохраняется:
- Step 2: `Read tech-debt.md` → `grep '🔴 OPEN.*<role>' docs/tech-debt.md` (targeted, 1-3 paragraph rows)
- Step 5: `docs/sprints/M*.md` → `docs/sprints/M-XX-<name>.md` (architect укажет ID)
- Step 6: `Read FA-0X-*.md` → `grep -nE '^##' FA + Read offset/limit` (TOC first)
- `docs/project-state.md` → `head -30` (last commits orientation)

## Готово когда

1. `.claude/rules/safety.md` имеет `globs: []`. Контент полностью сохранён.
2. `.claude/rules/testing.md` имеет `globs: []`. Контент полностью сохранён.
3. В 4 dev agent файлах:
   - Step "tech-debt" использует `grep '🔴 OPEN.*<role>'` (не «Read» whole file)
   - Step «milestone» указывает конкретный `M-XX-<name>.md`, не glob `M*.md`
   - Step «FA» использует `grep TOC` + offset/limit pattern
4. Структура агент-файлов и описание workflow в основном сохранены (никаких удалений секций — только expensive reads → cheap commands).
5. `tests/m-q9-dedup-rules.test.ts` drift-guard GREEN.
6. `scripts/verify_M-Q9.sh` PASS=N FAIL=0, idempotent ×2.

## Метод верификации

### Тип 1: Unit

- safety.md / testing.md frontmatter `globs: []`
- 4 agent файла содержат `grep '🔴 OPEN.*<role>'` для targeted tech-debt step
- 4 agent файла НЕ содержат `Read.*tech-debt.md` (без grep) в startup протоколе

### Тип 2: Acceptance

- File frontmatter checks (3 файла)
- Surgical edit checks (4 файла × 1-2 строк)
- Drift-guard test GREEN
- Idempotent ×2

## Анти-цели

- НЕ удаляем секции agent файлов (Tech Stack, Boundaries, Color Palette etc.) — пусть пока остаются, дублирование это отдельная M-Q10 если понадобится
- НЕ удаляем content из safety.md / testing.md — только меняем frontmatter
- НЕ упрощаем structure 9-step / 10-step протоколов — surgical правки только expensive строк

## После merge

Dev session auto-load:
- frontend-dev: 70 → 58 KB (−12 KB)
- backend-dev: 78 → 65 KB (−13 KB)

Plus startup runtime: targeted grep'ы вместо whole-reads экономят ещё ~8-10K tokens на каждой сессии.
