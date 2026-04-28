# M-Q11 — Remove `skills:` frontmatter from 4 dev agent files (eager-preload root cause)

**Тип**: Quality / context-budget (architect scope only).
**Зависимости**: M-Q10 merged (agent files slimmed via dedup).
**Worktree**: `/tmp/paxio-mq11`.
**Branch**: `feature/M-Q11-remove-eager-skills`.
**Estimated**: 20 min.

## Проблема

User report 2026-04-28: после `/clear` (fresh context) и paste prompt'а
backend-dev session показал «12% контекста» (88% уже использовано) **до того
как агент успел сделать хоть один Bash вызов**. То есть system prompt + user
prompt + минимальная активность съели 88% контекстного окна — компакт начался
до начала работы.

## Корневая причина

`skills:` frontmatter поле в agent definition **eager-preloads** SKILL.md
content в system prompt при старте сессии. Каждый skill = ~3-7 KB SKILL.md.

Per-agent eager preload measurement:

| Agent | skills count | SKILL.md size | + agent.md | Total at /clear |
|---|---|---|---|---|
| backend-dev | 8 | 36 KB | 4.7 KB | **41 KB** |
| frontend-dev | 7 | 31 KB | 4.8 KB | **36 KB** |
| icp-dev | 8 | 29 KB | 5.9 KB | **35 KB** |
| registry-dev | 8 | 33 KB | 6.7 KB | **40 KB** |

Plus CLAUDE.md (12 KB project instructions) auto-load → 47-53 KB system
prompt before the user has typed anything.

В контексте MiniMax-M2.7 CLI с эффективным контекстным окном меньше
заявленного 200K (вероятно ~65K по паттерну Anthropic Sonnet 4.5 default),
система съедает ~80%+ окна моментально.

## Сравнение с PROJECT donor (работает на MiniMax-M2.7)

`/home/openclaw/PROJECT/.claude/agents/{backend,frontend}-dev.md`:

```yaml
---
name: backend-dev
description: Implements API handlers, domain logic, and application services in Fastify + VM Sandbox
isolation: worktree
---
```

**NO skills frontmatter.** Total eager-load = `agent.md size only` = 3.5-3.7 KB.
Plus CLAUDE.md (14.8 KB) = ~18 KB system prompt. Comfortable headroom.

PROJECT works because it never preloads skills. Skills остаются доступны
on-demand через Skill tool — когда модель explicitly запрашивает паттерн (например,
"how do I structure thiserror enums?"), skill invokes тогда.

## Решение

Surgical: удалить `skills:` строку из frontmatter всех 4 dev agent файлов.

Skills directory `.claude/skills/` остаётся полностью intact — все 22+ skills
preserved. Они просто не preload eagerly. Когда дев работает над code и нужен
паттерн (например error-handling) — модель invoke'нет skill on-demand.

Architect/reviewer agent files **могут оставить** skills declaration если их
сессии менее context-bound (они не читают огромные impl файлы — только docs +
tests). M-Q11 scope строго: 4 dev файла.

## Готово когда

1. `.claude/agents/backend-dev.md` frontmatter без `skills:` поля.
2. `.claude/agents/frontend-dev.md` frontmatter без `skills:` поля.
3. `.claude/agents/icp-dev.md` frontmatter без `skills:` поля.
4. `.claude/agents/registry-dev.md` frontmatter без `skills:` поля.
5. Каждый файл сохраняет core fields: `name`, `description`, `isolation`.
6. Каждый файл ≤ 7 KB (eager-load budget).
7. `tests/m-q11-no-eager-skills.test.ts` drift-guard GREEN (8 tests).
8. `scripts/verify_M-Q11.sh` PASS=14 FAIL=0, idempotent ×2.
9. Baseline vitest GREEN (1058 passed, no regressions).

## Метод верификации

### Тип 1: Unit (drift-guard)

- Каждый из 4 dev файлов: NO `skills:` field в frontmatter
- Каждый сохраняет name + description + isolation

### Тип 2: Acceptance

- 5 шагов × 14 sub-checks
- Drift-guard runs as step 4
- Baseline vitest as step 5

## Анти-цели

- НЕ удаляем `.claude/skills/` directory — все skills preserved on disk
- НЕ удаляем `skills:` из `.claude/agents/architect.md` / `.claude/agents/reviewer.md`
  (их sessions не context-bound, eager preload OK там)
- НЕ модифицируем skill content — только frontmatter agent файлов

## После merge

System prompt at session start (post-/clear, before any user prompt):

| | Pre-M-Q11 | Post-M-Q11 | Saving |
|---|---|---|---|
| backend-dev | ~53 KB | ~17 KB | −36 KB (−68%) |
| frontend-dev | ~48 KB | ~17 KB | −31 KB (−65%) |
| icp-dev | ~47 KB | ~18 KB | −29 KB (−62%) |
| registry-dev | ~52 KB | ~19 KB | −33 KB (−63%) |

Plus dev impl session (когда реально читает файл и срабатывают globs):
auto-loaded rule files добавляются on top — но это уже on-demand, не eager.

PROJECT donor pattern restored: dev sessions имеют комфортный headroom для
реальной работы.

## Worktree commands

```bash
git worktree add /tmp/paxio-mq11 -b feature/M-Q11-remove-eager-skills origin/dev
cd /tmp/paxio-mq11
git config user.email architect@paxio.network
pnpm install --frozen-lockfile

# Verify
pnpm exec vitest run tests/m-q11-no-eager-skills.test.ts
bash scripts/verify_M-Q11.sh

# Commit + push + PR (architect-only)
git add .claude/agents/{backend,frontend,icp,registry}-dev.md \
        tests/m-q11-no-eager-skills.test.ts \
        scripts/verify_M-Q11.sh \
        docs/sprints/M-Q11-remove-eager-skills.md
git commit -m "feat(M-Q11): remove eager skills preload from 4 dev agents"
git push -u origin feature/M-Q11-remove-eager-skills
gh pr create ...

# Cleanup post-merge
cd /home/nous/paxio
git worktree remove --force /tmp/paxio-mq11
```
