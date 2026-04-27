---
description: Mandatory startup protocol — agent must announce what it found BEFORE writing code
globs: ["apps/**/*.{ts,tsx,cjs,js}", "products/**/*.{ts,js,rs}", "packages/**/*.{ts,tsx}", "platform/**/*.rs", "tests/**/*.{ts,tsx}", "docs/**/*.md", "scripts/**"]
---

# Startup Protocol — ОБЯЗАТЕЛЬНЫЙ для каждого агента

ПЕРЕД тем как написать хоть одну строчку кода:

Step 0: **Per-session worktree isolation (M-Q3)** — если ты не уверен, что другая
        сессия НЕ работает в `/home/nous/paxio` прямо сейчас, создай личный
        worktree и работай в нём:

        ```bash
        # ОДИН раз в начале сессии:
        cd /home/nous/paxio
        git fetch origin
        git worktree add /tmp/paxio-<your-session-name> -b feature/M-XX-name origin/dev
        cd /tmp/paxio-<your-session-name>
        git config user.name <your-agent-name>
        git config user.email <your-agent-name>@paxio.network
        pnpm install
        ```

        **Зачем worktree per session:**
        - Cross-user chmod EPERM: когда другая сессия (другой OS user, другой
          agent identity) уже владеет файлами в `node_modules/`, твой
          `pnpm install` или `node scripts/copy-api-handlers.mjs` падает с
          `EPERM: operation not permitted, chmod`. Group membership через
          `devteam` НЕ помогает — chmod требует owner ИЛИ root, а group bit
          даёт только read/write, не chmod. Per-session worktree решает это —
          каждая сессия владеет своим `node_modules/`.
        - Branch race condition: пока ты ждёшь reviewer, другая сессия может
          checkout'нуть свою feature-ветку в `/home/nous/paxio`, и твой
          следующий commit уйдёт не в ту ветку. Worktree isolation = stable
          HEAD на всю сессию.
        - Untracked WIP leakage: untracked files прошлой сессии не утекают в
          твой `git status`, потому что worktree клон чистый.

        **Cleanup в конце сессии (после merge или abandon):**
        ```bash
        cd /home/nous/paxio
        git worktree remove --force /tmp/paxio-<your-session-name>
        # --force нужен потому что products/04-security/guard — git
        # submodule, а git без --force отказывается удалять worktree
        # с initialized submodules. Если уже удалил каталог руками —
        # git worktree prune
        ```

        Если сессия одиночная и user явно подтвердил, что других сессий нет —
        можно работать прямо в `/home/nous/paxio`. По умолчанию используй
        worktree.

Step 1: Прочитай `CLAUDE.md` и `.claude/rules/scope-guard.md`
Step 2: Прочитай `docs/tech-debt.md` — есть ли 🔴 OPEN на тебя?
         - Если есть с тестом → СНАЧАЛА закрой долг, ПОТОМ milestone
         - Если есть без теста → НЕ БЕРИ задачу, сообщи "TD-N ждёт тест от architect'а"
Step 3: Прочитай контракты (Shared Kernel):
         `packages/types/src/` — типы + Zod schemas
         `packages/interfaces/src/` — port contracts
         `packages/errors/src/` — AppError hierarchy
Step 4: Прочитай тест-спецификации:
         `tests/**/*.test.ts` + `products/*/tests/**/*.test.ts` — unit тесты
         `platform/canister-shared/tests/*.rs` + `products/*/canister*/tests/*.rs` — Rust тесты
         `scripts/verify_*.sh` — acceptance scripts
Step 5: Прочитай `docs/project-state.md` и `docs/sprints/M*.md`
Step 6: Прочитай `docs/feature-areas/FA-*.md` релевантной подсистемы
Step 7: Прочитай текущий код своего модуля
Step 8: Запусти тесты — посмотри RED/GREEN:
         `pnpm typecheck && pnpm test -- --run`
         `cargo test --workspace` (если Rust)
Step 9: ВЫВЕДИ ОТЧЁТ:

═══════════════════════════════════════════════════
AGENT: [имя]
TASK FOUND: [milestone] — [задача]
═══════════════════════════════════════════════════

Tech debt: [OPEN на меня: N / нет]
Milestone: M0X
Feature Area: [файл]
Contract: [packages/types/src/*.ts]
Test spec: [файл с тестами]
Tests RED: N of total (мои задачи)
Tests GREEN: N of total (уже сделано)

Файлы которые буду реализовывать:
  - [path]/[file] — [что именно]

Зависимости от других модулей: [какие]

Приступаю к реализации.
═══════════════════════════════════════════════════

Step 10: ТОЛЬКО ПОСЛЕ ОТЧЁТА начинай код

Если ты начал писать код до Step 9 — ты нарушил протокол.
Если пользователь не видел твой отчёт — он не знает что ты делаешь.
