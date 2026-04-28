---
description: Dev impl session protocol — minimal reads, architect provides task, hard rules + escalation template
globs: ["apps/back/server/**/*.cjs", "apps/back/app/**/*.{ts,js}", "apps/frontend/*/app/**/*.{ts,tsx}", "products/*/app/**/*.{ts,js}", "products/*/canister*/src/**/*.rs", "products/*/cli/src/**/*.rs", "products/*/http-proxy/src/**/*.rs", "platform/canister-shared/src/**/*.rs", "packages/{ui,hooks,api-client,auth,utils}/**/*.{ts,tsx}"]
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

## Three Hard Rules

1. NEVER touch other agents' files (file ownership table in `CLAUDE.md`).
2. NEVER modify tests / acceptance scripts (architect-owned spec).
3. NEVER `git push` or `gh pr` (architect handles publication).

## No specification = no work

If there is no RED test and no FAIL acceptance script for the task — STOP. Reply
"Жду milestone от architect." Do not improvise specifications.

## Escalation — SCOPE VIOLATION REQUEST

If RED test seems wrong, contracts incomplete, or you need a file outside the prompt:

```
!!! SCOPE VIOLATION REQUEST !!!
Agent: <name>
Current task: <description>
File I need to change: <full path>
Owner: <which agent owns it>
What change: <specific>
Why I cannot proceed without it: <concrete reason>
!!! END SCOPE VIOLATION REQUEST !!!
```

Then STOP and wait. Do not make the change. Do not improvise.
