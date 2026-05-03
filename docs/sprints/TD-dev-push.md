# TD-dev-push — Devs push their own feature/* branches

**Status:** architect-only (no dev impl needed)
**Owner:** architect
**Branch:** `feature/TD-dev-push`

## Why

Before TD-dev-push, devs were `commit-only` — every «готово» from a dev session required architect to pull the commit + push it, creating an architect bottleneck on every dev cycle.

User feedback 2026-05-03: «Сейчас же нам после дева понадобился ты. ЗАЧЕМ???» — clear pain point.

The historical reason was credential-leak isolation (compromised dev session shouldn't push malicious code). Mechanical pre-push enforcement gives the same guarantee:
- Compromised dev session can only push `feature/*` (architect's gate-1 merge still catches malicious code before it reaches `dev`)
- `dev` and `main` remain architect-only
- Force-push to `dev`/`main` blocked for everyone (architect+user included)

## Готово когда

1. `.husky/pre-push` exists + executable
2. Hook recognises 7 known role identities
3. Hook ALLOWS dev identities pushing `feature/*` branches
4. Hook REJECTS dev/test-runner identities pushing `dev` or `main`
5. Hook REJECTS non-fast-forward (force-push) to `dev`/`main` for ANY identity
6. `.claude/rules/scope-guard.md::Push permissions` table updated
7. `CLAUDE.md::Branch Model` Push policy section updated
8. `.claude/rules/dev-startup.md` Step 5 + Five Hard Rules updated
9. `.claude/rules/workflow.md` push policy section updated
10. `.claude/rules/architect-protocol.md` slim spec template + fix-iteration template added
11. 4 existing tests updated to reflect new policy: m-q22 (push permissions), m-q16 (Rule 3 + size), m-q8 (size), m-q10 (Rule 3), m-q12 (CLAUDE.md size)
12. `bash scripts/verify_TD-dev-push.sh` PASS=19 FAIL=0
13. `pnpm exec vitest run` baseline GREEN (no regression)

## Architecture Requirements

- **Mechanical, not LLM-memory.** Hook enforces — agent doesn't have to remember «I can push my feature branch».
- **Same machine, single user.** Credential isolation between architect and dev is ceremonial in practice; merge gate is the real guard.
- **Test-runner stays read-only.** Quality gate doesn't publish.
- **Reviewer narrow push preserved.** `origin/dev` for chore commits (project-state + tech-debt only) — existing pattern.
- **Force-push to dev/main remains absolutely forbidden.**

## Implementation

Architect-only PR — no dev session needed. All changes in architect scope:
- `.husky/pre-push` (new)
- `.claude/rules/scope-guard.md` (push permissions table)
- `CLAUDE.md` (Branch Model Push policy)
- `.claude/rules/dev-startup.md` (Step 5 + Rule 3)
- `.claude/rules/workflow.md` (push policy)
- `.claude/rules/architect-protocol.md` (slim spec + fix-iter template)
- `scripts/verify_TD-dev-push.sh` (acceptance)
- 5 existing test files updated for new policy

## Effect

Before:
```
dev impl → «готово» → user pings architect → architect pulls dev's worktree, pushes →
test-runner can pull updated remote → reviewer Phase N → architect merge
                ↑↑↑ architect bottleneck on every dev cycle
```

After:
```
dev impl → «готово» (after own push) → test-runner pulls remote directly →
reviewer Phase N → architect merge
                ↑↑↑ architect involved only at merge gate, not on every cycle
```
