# E2E: M00 Foundation Canary

## Scenario
Свежий клон Paxio репозитория → рабочее dev окружение за ≤15 минут.

## Среда
- [x] Developer laptop (clean shell, no Paxio artifacts)

## Предусловия
- Node.js ≥ 22 installed (`node --version`)
- npm ≥ 10 installed (`npm --version`)
- git installed
- TypeScript-compatible editor (optional for canary)

## Шаги

### 1. Fresh clone
```bash
cd /tmp
rm -rf paxio-canary
git clone /home/nous/paxio paxio-canary   # or remote URL when available
cd paxio-canary
```
**Ожидаемое:** клонирование без ошибок, `.git` и все файлы на месте.

**Проверка:** `ls -la` показывает `CLAUDE.md`, `package.json`, `app/`, `server/`, `canisters/`, `packages/`, `docs/`, `tests/`, `scripts/`, `.claude/`.

### 2. Install dependencies
```bash
npm install
```
**Ожидаемое:** установка без ошибок. Создаётся `node_modules/`. Workspaces (`packages/sdk`, `packages/mcp-server`) resolved. Нет warning'ов про missing peer deps (некритично).

### 3. TypeScript typecheck
```bash
npm run typecheck
```
**Ожидаемое:** 0 TypeScript errors. Exit code 0.

### 4. Unit tests
```bash
npm run test -- --run
```
**Ожидаемое:** все 6 тест-файлов зелёные (result, types, errors, logger, clock, contracts). Минимум 50 passed assertions, 0 failed.

### 5. Lint
```bash
npm run lint
```
**Ожидаемое:** нет ошибок линтера. Prettier форматирование проходит.

### 6. Acceptance script
```bash
bash scripts/verify_foundation.sh
```
**Ожидаемое:** все 11 проверок PASS, финальный вывод `✅ M00 Foundation: ALL 11 CHECKS PASSED`.

### 7. Server dry-run (no DB, no ICP — просто старт)
```bash
PORT=8999 timeout 3 node server/main.cjs 2>&1 | head -20
```
**Ожидаемое:** server bootstrap проходит, печатает «Paxio Server v0.1.0» и «Listening on 0.0.0.0:8999». Graceful shutdown по timeout.

Warning про «Application path not found» — ОК (нет dist/app/ до `npm run build`).

### 8. Health endpoint (параллельно запущенный server)
```bash
PORT=8999 node server/main.cjs &
sleep 2
curl -sS http://localhost:8999/health | grep -q '"status":"ok"' && echo HEALTH OK
kill %1 2>/dev/null
```
**Ожидаемое:** `HEALTH OK`.

## Постусловия
- Репозиторий готов для разработки M01-M13
- Любой dev-агент может выполнить startup protocol и начать реализацию без доп. инфраструктуры

## Критерии успеха
- [ ] Все 8 шагов пройдены подряд без ручных фиксов
- [ ] Время от `git clone` до `HEALTH OK` ≤ 15 минут на среднем laptop (ограничение — npm install скорость)

## Что идёт НЕ так (типичные fix'ы)
| Симптом | Причина | Фикс |
|---|---|---|
| `npm install` падает на Rust build | Cargo не установлен, но package.json не требует Rust | Проверить что нет `postinstall: cargo ...` — не должно быть |
| typecheck ругается на `app/errors/` | backend-dev ещё не реализовал | Ожидаемо в RED-фазе. M00 считается complete только после implement'а |
| vitest не находит `app/types/...` | alias в vitest.config.ts не работает | Проверить `resolve.alias.app` = absolute path |
| Server падает с «MODULE_NOT_FOUND» | Отсутствует dependency | `npm install` пере-запустить |

## Контакты для эскалации
- E2E FAIL → architect создаёт hotfix milestone `M00.1-<issue>`
- Если прошло > 30 минут и not green — stop, write `!!! SCOPE VIOLATION REQUEST !!!` format
