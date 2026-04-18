---
description: Backend architecture — server/app separation, VM sandbox, layered loading
globs: ["server/**/*.cjs", "app/**/*.js", "app/**/*.ts"]
---

# Backend Architecture — server/ vs app/

Два каталога, два мира. Не смешивать.

## Принцип

```
server/  = ИНФРАСТРУКТУРА (Fastify, WebSocket, external clients)
           CommonJS (.cjs), require() разрешён, I/O разрешён

app/     = БИЗНЕС-ЛОГИКА (domain, API handlers, config)
           Загружается через vm.Script в sandbox
           require() ЗАПРЕЩЁН, import ЗАПРЕЩЁН, I/O ЗАПРЕЩЁН
```

## VM Sandbox — изоляция app/

Каждый .js модуль в app/ загружается через `vm.Script` с `Object.freeze()` на контексте.
Это значит:

1. **НЕТ require()** — модуль не может подключить Node.js модули
2. **НЕТ import** — ESM не работает в VM context
3. **НЕТ fs/net/http** — никакого I/O из бизнес-логики
4. **НЕТ process/global** — только то что инжектировано через sandbox
5. **Timeout: 5000ms** — модуль который зависает = ошибка

### Что доступно внутри sandbox:

```javascript
// Инжектируется server/src/loader.cjs:
{
  setTimeout, clearTimeout, AbortController, Buffer,
  console,    // Pino logger (frozen)
  crypto,     // Node.js crypto (frozen)
  config,     // app/config/* (frozen)
  errors,     // AppError hierarchy (frozen)
  telemetry,  // WebSocket broadcaster (frozen)
  lib,        // app/lib/* (frozen, после загрузки)
  domain,     // app/domain/* (frozen, после загрузки)
}
```

### Порядок загрузки (СТРОГИЙ):

```
1. lib/         → sandbox.lib         (permissions, validation)
2. domain/      → sandbox.domain      (pure business logic)
3. api/         → sandbox.api         (HTTP handlers)
```

Каждый слой видит ТОЛЬКО предыдущие слои:
- `lib/` видит: config, errors, crypto
- `domain/` видит: lib + всё выше
- `api/` видит: domain, lib + всё выше

**api/ НЕ МОЖЕТ обращаться к другим api/ модулям напрямую.**
Общая логика — в domain/ или lib/.

## Формат модулей в app/

Каждый .js файл в app/ — это IIFE-выражение, возвращающее объект:

```javascript
// app/domain/registry/drone-state.js
const MAX_HISTORY = 100;

const updateDrone = (droneId, data) => { /* ... */ };
const getDrone = (droneId) => { /* ... */ };

({
  updateDrone,
  getDrone,
})
```

**НЕ export, НЕ module.exports** — просто объект в конце файла.
loader.cjs оборачивает код в `'use strict';\n{\n${src}\n}` и выполняет через vm.Script.

## server/ — что можно, что нельзя

### ✅ server/ МОЖЕТ:
- `require()` npm пакетов (fastify, pino, ws)
- Открывать TCP/UDP сокеты
- Создавать HTTP endpoints
- Управлять WebSocket connections
- Читать .env переменные
- Lazy-load infrastructure клиентов

### ❌ server/ НЕ МОЖЕТ:
- Содержать бизнес-логику (расчёты, FSM, валидация данных)
- Напрямую манипулировать domain objects
- Обходить sandbox (вызывать app/ код через require)

## app/ — что можно, что нельзя

### ✅ app/ МОЖЕТ:
- Чистая бизнес-логика (расчёты, FSM, state management)
- Использовать инжектированные сервисы (console, errors, telemetry)
- Возвращать данные через return (handler → Fastify → client)

### ❌ app/ НЕ МОЖЕТ:
- require() или import
- fs, net, http, child_process — любой I/O
- process.env — конфиг только через инжектированный `config`
- Модифицировать sandbox context (он frozen)
- Обращаться к Fastify API (request, reply) — только входные данные

## Onion слои (backend)

```
╔══════════════════════════════════╗
║  server/ (infrastructure)        ║  ← I/O, Fastify, WebSocket, TCP
║  ┌────────────────────────────┐  ║
║  │  app/api/ (presentation)   │  ║  ← HTTP handlers, routing
║  │  ┌──────────────────────┐  │  ║
║  │  │  app/domain/ (core)  │  │  ║  ← Pure logic, NO deps outward
║  │  └──────────────────────┘  │  ║
║  └────────────────────────────┘  ║
╚══════════════════════════════════╝
```

Зависимости направлены СТРОГО ВНУТРЬ:
- server/ → app/api/ → app/domain/ → app/lib/
- НИКОГДА: domain/ → api/, domain/ → server/, lib/ → domain/
