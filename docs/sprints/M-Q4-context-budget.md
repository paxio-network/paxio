# M-Q4 — Context Budget (rule globs + startup-protocol slim)

**Тип**: Quality / Process milestone (architect-only foundation).
**Branch**: `feature/M-Q4-context-budget`.
**Worktree**: `/tmp/paxio-context-fix`.

## Проблема

Запущенные dev-сессии (frontend-dev на M-L10 + backend-dev на M-L1-expansion)
застряли в compaction loop: читали ~750 KB на startup, превышали context window
до начала работы, компактились, теряли work-in-progress, читали то же самое снова.

Точные цифры:
- `docs/tech-debt.md` — 175 KB (расширенная история TD-30 + TD-31 incidents)
- `docs/project-state.md` — 126 KB (verification logs за каждый APPROVED merge)
- 17 rule files в `.claude/rules/` — 218 KB суммарно, многие auto-инжектятся через
  `globs: ["**/*"]` или `globs: ["apps/**/*.{ts,tsx,...}"]`
- 5 raw CSS files в `docs/design/paxio-b5/styles/` — 100 KB (3300 строк)
- 2 raw JSX files — 87 KB
- CLAUDE.md + milestone docs — еще 40 KB

Source bug: мой промт frontend-dev'у говорил «прочитай всё это», плюс auto-injected
правила добавляли сверху неконтролируемо.

## Готово когда

1. **Heavy rule globs narrowed** (3 worst offenders):
   - `engineering-principles.md` (32 KB) — было `["**/*.{ts,tsx,js,cjs,rs}", "docs/**/*.md"]`,
     стало architect-zone narrow (`packages/{types,interfaces,errors,contracts}/**/*.ts`,
     `docs/sprints/`, `docs/feature-areas/`)
   - `coding-standards-checklist.md` (19 KB) — было `["**/*"]`, стало то же narrow
   - `architect-protocol.md` (26 KB) — было `["docs/**/*.md", ...]`, стало
     architect-zone-only (sprint docs, feature areas, contracts, tests, verify scripts)

2. **Startup-protocol Step 2 + Step 5 role-conditional**:
   - **Dev-агенты** (`backend-dev`, `frontend-dev`, `icp-dev`, `registry-dev`,
     `test-runner`) используют `grep` на `tech-debt.md` и `head -60` на
     `project-state.md` — context-friendly slice
   - **Architect / reviewer** читают оба файла **целиком** — им нужен полный обзор
     для планирования / обновления

3. **Design tokens extracted** в `docs/design/paxio-b5/EXTRACTED.md`:
   - 250 строк концентрированной CSS reference вместо 3300 строк raw CSS
   - Покрывает: paper/ink/gold tokens, both themes, fonts, key component contracts
   - Frontend-dev читает только эту выжимку для CSS work

4. **4 mini-milestone docs** для M-L10 Phases 2-5:
   - `M-L10.2-css-tokens.md` (~150 lines, ~30-line промт)
   - `M-L10.3-shell-components.md`
   - `M-L10.4-hero.md`
   - `M-L10.5-scrolls-wiring.md`
   - Каждый = одна узкая фаза с тонким промтом для frontend-dev

5. **Drift-guard tests** в `tests/context-budget-drift.test.ts`:
   - Heavy rules globs not broad
   - Frontmatter timeless (no specific milestone refs like M-Q4 / M-L10 / TD-N)
   - Step 2 + 5 grep-based, role-conditional
   - EXTRACTED.md present + key content
   - 4 mini-milestone docs present с thin промтами

6. **Acceptance script** `scripts/verify_M-Q4.sh` idempotent.

## Декомпозиция (6 задач, все architect zone)

| # | Task | Files |
|---|------|-------|
| T-1 | Narrow 3 heavy rule globs | `.claude/rules/{engineering-principles,coding-standards-checklist,architect-protocol}.md` (frontmatter only) |
| T-2 | Slim startup-protocol Step 2 + Step 5 (role-conditional) | `.claude/rules/startup-protocol.md` |
| T-3 | Extract design tokens | `docs/design/paxio-b5/EXTRACTED.md` (new) |
| T-4 | 4 mini-milestone docs | `docs/sprints/M-L10.{2,3,4,5}-*.md` (new) |
| T-5 | Drift-guard tests + acceptance | `tests/context-budget-drift.test.ts`, `scripts/verify_M-Q4.sh` |
| T-6 | Commit + Phase 0 + autonomous merge | (architect process) |

## Анти-цели

- НЕ удалять архитектурные правила — только narrow их globs
- НЕ запрещать architect/reviewer читать tech-debt/project-state целиком (им нужно)
- НЕ добавлять specific milestone refs обратно в frontmatter (timeless principle)
- НЕ начинать M-L10 Phase 2-5 impl в этом PR — только spec'ает их
- НЕ переписывать CLAUDE.md (не Q4 zone) — он 26 KB, ОК для startup

## Acceptance criteria (для reviewer Phase 0)

- [ ] `pnpm exec vitest run tests/context-budget-drift.test.ts` GREEN
- [ ] `bash scripts/verify_M-Q4.sh` PASS=N FAIL=0 (idempotent 2× run)
- [ ] All 11+ files в architect zone
- [ ] No `package.json` / `pnpm-lock.yaml` changes
- [ ] No specific milestone IDs в rule frontmatter

## После merge

User дает frontend-dev'у новый промт по `docs/sprints/M-L10.2-css-tokens.md`. Узкий,
читает только EXTRACTED.md + globals.css + tests. Context budget ~30K вместо 187K.

Если frontend-dev на M-L10.2 успешно завершит — открываем M-L10.3 (shell) ПОСЛЕДОВАТЕЛЬНО.
Параллелить разные phases можно (M-L10.2 + M-L10.3 разные packages), но не обязательно.
