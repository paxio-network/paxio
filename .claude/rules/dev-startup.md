---
description: Dev impl session protocol — minimal reads, architect provides task, no debt/state browsing
globs: ["apps/**/*.{ts,tsx,cjs,js}", "products/**/*.{ts,js,rs}", "packages/**/*.{ts,tsx}", "platform/**/*.rs"]
---

# Dev startup — 5 steps

You implement a SPECIFIC task assigned by architect. Do NOT browse for work.

1. **Worktree + identity**. `cd <path-from-prompt>`, then in worktree:
   `git config user.name <agent>` + `git config user.email <agent>@paxio.network`.
   Worktree inherits stale config from main repo — always re-set.

2. **Read ONLY what architect listed**. Typically: 1 RED test (the spec, sacred) +
   1-2 type/interface files. Do NOT read `docs/tech-debt.md`, `docs/project-state.md`,
   `docs/feature-areas/`, or `docs/sprints/M-XX.md` whole. They are architect/reviewer
   reference, not work directives.

3. **Implement** to make RED test GREEN. Tests are sacred — never edit, weaken, skip.

4. **Verify**: `pnpm typecheck && pnpm exec vitest run <test-file>`. Rust: `cargo test -p <crate>`.

5. **Commit local**. NO `git push`, NO `gh pr` — architect handles. Reply: "готово" +
   worktree path + commit hash + tests/build status.

If RED test seems wrong, contracts incomplete, or you need a file outside the prompt →
STOP, escalate `!!! SCOPE VIOLATION REQUEST !!!`. Do not improvise.
