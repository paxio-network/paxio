---
description: Dev impl session protocol — minimal reads, architect provides task, hard rules + escalation template
globs: ["apps/back/server/**/*.cjs", "apps/back/app/**/*.{ts,js}", "apps/frontend/*/app/**/*.{ts,tsx}", "products/*/app/**/*.{ts,js}", "products/*/canister*/src/**/*.rs", "products/*/cli/src/**/*.rs", "products/*/http-proxy/src/**/*.rs", "platform/canister-shared/src/**/*.rs", "packages/{ui,hooks,api-client,auth,utils}/**/*.{ts,tsx}"]
---

# Dev startup — 5 steps

You implement a SPECIFIC task assigned by architect. Do NOT browse for work.

1. **Worktree + identity + branch verify**. `cd <path-from-prompt>`, then in worktree:
   - `git config user.name <agent>` + `git config user.email <agent>@paxio.network`
   - **Verify branch (not detached HEAD):** `git symbolic-ref HEAD` must print `refs/heads/<branch>`. If `(detached)` — `git checkout <branch>` from spec, otherwise `amend`/commit lands on no-branch limbo.
   - Worktree inherits stale config from main repo — always re-set identity.

2. **Read ONLY what architect listed**. Typically: 1 RED test (the spec, sacred) +
   1-2 type/interface files. Do NOT read `docs/tech-debt.md`, `docs/project-state.md`,
   `docs/feature-areas/`, or `docs/sprints/M-XX.md` whole. They are architect/reviewer
   reference, not work directives.

3. **Implement** to make RED test GREEN. Tests are sacred — never edit, weaken, skip.

4. **Verify**: `pnpm typecheck && pnpm exec vitest run <test-file>`. Rust: `cargo test -p <crate>`.

5. **Commit local + clean-tree check**. Before saying «готово»:
   - `pnpm exec vitest run` (FULL baseline, NOT just target test) — catches regression in adjacent files
   - `git status --porcelain` must be empty — untracked = scope violation, escalate
   - `git diff --cached` review — confirm only your scope files
   - NO `git push`, NO `gh pr` — architect handles
   - Reply: «готово» + worktree path + commit hash + full baseline result

6. **Cleanup worktree after merge** (M-Q19 mandate). When architect confirms merge, run:
   ```bash
   cd /home/nous/paxio
   git worktree remove --force /tmp/paxio-<your-session>
   git worktree prune
   ```
   Stale worktrees pollute disk + cross-user EPERM (test-runner sees broken cache). `--force` needed because Paxio uses git submodules. **Don't remove your own worktree until architect's «merged» — that's where reviewer/test-runner re-checks impl.**

## Five Hard Rules

1. NEVER touch other agents' files (file ownership table in `CLAUDE.md`).
2. NEVER modify tests / acceptance scripts (architect-owned spec) — this includes **drop-by-amend**: `git commit --amend` / `git rebase -i` that erases an architect-authored test commit is the same violation as deleting the file.
3. NEVER `git push` or `gh pr` (architect handles publication).
4. NEVER `git commit --amend` / `git rebase -i` on commits whose author ≠ you. If a fix is needed on top of architect's RED test or another agent's code — make a NEW commit, not amend. Drop-by-amend caused PR #74 round-2 reject.
5. NEVER reply «готово» without `pnpm exec vitest run` (full baseline). Target-test-only run misses regressions in adjacent test files (registry-dev round 1 incident with `stub-adapters.test.ts`).

## P0 invariants — hold in context every session

These must hold across **every** dev change. Violating any = automatic REJECT, severity=CRITICAL. Skill `paxio-backend-architecture` / `rust-error-handling` / `paxio-frontend` carry the full reasoning; below is the eyes-closed checklist.

- **Multi-tenancy filter (backend):** every SQL/Qdrant/Redis read of agent or organization data takes the identity from `session.agentDid` / `session.organizationId`, **never** from `body.*` (client can spoof). Public endpoints in explicit whitelist only — see `paxio-backend-architecture::Public exceptions`. Inter-canister: `ic_cdk::caller()`, never argument.
- **VM sandbox (backend `app/`):** no `require()`, no `import`, no `fs/net/http`, no `process.env`, no `process.cwd`, no `Date.now()`/`new Date()`/`Math.random()` directly. Use injected `config`, `lib`, `domain`, `console`, `errors`, `crypto`, `clock`/`prng`. See `paxio-backend-architecture::VM sandbox`.
- **Rust panic-free production:** public `#[ic_cdk::update]` / `#[ic_cdk::query]` always return `Result<T, ConcreteError>`. NO `unwrap()` / `panic!()` in production paths. `expect("…")` only with rationale comment. See `rust-error-handling::R-EH-2`.
- **Real Data Invariant (frontend):** under `<body data-production="true">`, no `Math.random()` in render, no `setInterval` simulating live data, no hardcoded "looks-real" numbers. Use `@paxio/api-client` + React Query. R-FE-Preview exception only under `data-production="false"` + `<PreviewRibbon>`. See `paxio-frontend::Real Data Invariant`.

## No specification = no work

If there is no RED test and no FAIL acceptance script for the task — STOP. Reply
«Жду milestone от architect.» Do not improvise specifications.

## Escalation — SCOPE VIOLATION REQUEST

If RED test seems wrong, contracts incomplete, you need a file outside the prompt, OR you discover an unrelated regression in adjacent files (e.g., your impl signature change broke an existing test in another file):

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
