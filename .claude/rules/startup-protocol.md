---
description: Mandatory startup protocol — agent announces what it found BEFORE writing code
globs: ["apps/**/*.{ts,tsx,cjs,js}", "products/**/*.{ts,js,rs}", "packages/**/*.{ts,tsx}", "platform/**/*.rs", "tests/**/*.{ts,tsx}", "docs/**/*.md", "scripts/**"]
---

# Startup Protocol

ПЕРЕД написанием кода:

1. Per-session worktree (см. `docs/dev/worktree-isolation.md`) — обязательно.
2. Прочитай `CLAUDE.md` и `.claude/rules/scope-guard.md`.
3. **Tech-debt**: dev-агенты — `grep -E '🔴 OPEN' docs/tech-debt.md | grep -i '<role>' | head -10`.
   architect/reviewer — читают целиком.
   - OPEN с тестом → закрой долг ПЕРЕД milestone.
   - OPEN без теста → не бери задачу, сообщи `TD-N ждёт тест`.
4. Прочитай контракты: `packages/types/src/`, `packages/interfaces/src/`, `packages/errors/src/`.
5. Прочитай тесты-спеки: `tests/**/*.test.ts`, `products/*/tests/**`, `scripts/verify_*.sh`.
6. **State**: dev — `head -60 docs/project-state.md`. architect/reviewer — целиком.
   Затем читай свой milestone: `docs/sprints/<id>.md`.
7. Прочитай текущий код своего модуля.
8. `pnpm typecheck && pnpm test -- --run` (+ `cargo test --workspace` если Rust).
9. **Отчёт:**

```
AGENT: [name]
TASK: [milestone] — [task]
Tests RED: N / Tests GREEN: M
Файлы: [list]
Приступаю.
```

10. ТОЛЬКО ПОСЛЕ отчёта — код.

Architect/reviewer дополнительно читают `docs/feature-areas/FA-*.md` и
heavy reference rules (см. `.claude/agents/{architect,reviewer}.md::Required reads`).
Devs **не читают** FA-файлы и heavy rules — у них domain-specific replacements
(`backend-architecture.md`, `frontend-rules.md`, `rust-*.md`) auto-load.
