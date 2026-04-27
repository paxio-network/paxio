# Per-session worktree isolation

`/home/nous/paxio` — общий рабочий каталог. Несколько agent-сессий
параллельно создают три класса инцидентов:

1. **Cross-user chmod EPERM**: чужие OS-identity владеют `node_modules/`,
   `pnpm install` падает с `EPERM: chmod`. Group `devteam` НЕ помогает —
   chmod требует owner ИЛИ root.
2. **Branch race condition**: пока ждёшь reviewer, другая сессия checkout'ит
   свою feature-ветку в `/home/nous/paxio` → твой следующий commit уйдёт не
   в ту ветку.
3. **Untracked WIP leakage**: untracked файлы прошлой сессии видны в твоём
   `git status`.

Worktree даёт separate HEAD per session, isolated branch, own `node_modules/`.

## Setup

```bash
cd /home/nous/paxio
git fetch origin
git worktree remove --force /tmp/paxio-<session> 2>/dev/null || true
git worktree add /tmp/paxio-<session> -B feature/<branch-name> origin/dev
cd /tmp/paxio-<session>
git config user.name <agent-name>
git config user.email <agent-name>@paxio.network
pnpm install
```

`-B` (capital) **сбрасывает** существующую local branch до origin/dev. Без
этого stale local branch с прошлых сессий будет переиспользована и picky
старый код.

## Cleanup

```bash
cd /home/nous/paxio
git worktree remove --force /tmp/paxio-<session>
```

`--force` обязателен из-за `products/04-security/guard` (git submodule).
