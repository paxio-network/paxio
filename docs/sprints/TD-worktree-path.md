# TD-worktree-path — session worktrees under unified parent dir

**Status:** architect-only, no dev impl
**Owner:** architect
**Branch:** `feature/TD-worktree-path`

## Why

User feedback 2026-05-03: «каким образом мы посоздавали какое-то количество каталогов за пределами ~/paxio??? и зачем???»

Pre-TD-worktree-path layout:
- `/tmp/paxio-<session>` — per-protocol convention since M-Q3
- `/home/nous/paxio-<old-session>` — older flat sessions (paxio-contract-fix, paxio-no-push, etc.)

Two issues:
1. `/tmp/` is OS-managed temp — auto-cleared on reboot, drift between sessions
2. Flat `/home/nous/paxio-*` sprinkles homedir with one dir per session

Post-TD: single parent `/home/nous/paxio-worktrees/<session>/`. Persistent across reboot, clean homedir, easy to `ls` for inventory.

## Готово когда

1. Protocol docs reference `/home/nous/paxio-worktrees/` as worktree parent (7 files: 5 rules + 2 agents)
2. No stale `/tmp/paxio-<session>` worktree path refs in protocol (diagnostic log paths `/tmp/paxio-*.log` excluded)
3. `architect-protocol.md::ФАЗА 0.2` includes `mkdir -p /home/nous/paxio-worktrees`
4. Rationale documented (TD-worktree-path mention in protocol)
5. `bash scripts/verify_TD-worktree-path.sh` PASS=16 FAIL=0
6. Existing `/tmp/paxio-*` worktrees stay until their PRs merge — migration is for NEW worktrees only

## Implementation

Architect-only — sed replace in 7 protocol files + 1 quality-gate.sh + add mkdir step + rationale comment.

## Effect

```
Before:
  /tmp/paxio-arch-bodyfix
  /tmp/paxio-arch-ml1073
  /home/nous/paxio-contract-fix
  /home/nous/paxio-no-push
  ...

After:
  /home/nous/paxio                        # main checkout
  /home/nous/paxio-worktrees/             # parent dir
    arch-bodyfix
    arch-ml1073
    ...
```

Cleaner inventory: `ls /home/nous/paxio-worktrees/` shows all session worktrees one place.
