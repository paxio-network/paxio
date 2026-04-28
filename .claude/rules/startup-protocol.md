---
description: DEPRECATED — split into role-specific files (M-Q8). Use dev-startup.md for dev sessions. Architect/reviewer have inline protocols in their respective rules.
globs: []
---

# Startup protocol — deprecated stub

Split into role-aware files in M-Q8:

- **Devs** → `.claude/rules/dev-startup.md` (auto-loads on `apps/**`, `products/**`,
  `packages/**`, `platform/**`).
- **Architect** → `.claude/rules/architect-protocol.md::ФАЗА 1 SCAN` (already in
  `architect.md::Required reads`).
- **Reviewer** → Phase 0 + Phase N gates inline in `.claude/agents/reviewer.md`.

This file kept only so legacy links don't break. Has `globs: []` so it does not auto-load.
