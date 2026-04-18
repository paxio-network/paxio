# E2E: [Название сценария]

## Среда
- [ ] testnet (ICP local replica)
- [ ] mainnet
- [ ] hardware

## Предусловия
```
- DFX installed and running
- Wallet canister deployed: dfx canister id wallet
- Registry canister deployed: dfx canister id registry
- Test agent registered: did:paxio:test-agent-001
- Test BTC address funded: bc1q...
```

## Шаги

### 1. Регистрация агента
```bash
dfx canister call registry register '(record {
  did = "did:paxio:test-agent-001";
  name = "Test Agent";
  capability = "REGISTRY";
})'
```
**Ожидаемый результат:** 返回 ok

### 2. Проверка регистрации
```bash
dfx canister call registry resolve '("did:paxio:test-agent-001")'
```
**Ожидаемый результат:** DID document with correct metadata

### 3. Создание кошелька
```bash
dfx canister call wallet derive_address '([])'
```
**Ожидаемый результат:** bc1q... address

### 4. Проверка баланса
```bash
dfx canister call wallet get_balance '("bc1q...")'
```
**Ожидаемый результат:** { "satoshis": 0 }

## Постусловия
- Все canister'ы работают корректно
- Логи доступны: `dfx canister call audit_log get_log ...`

## Критерии успеха
- [ ] Регистрация прошла успешно
- [ ] Адрес получен
- [ ] Баланс запрос成功的
- [ ] Логи записаны в audit_log

## Контакты для эскалации
[Кто звонит если E2E FAIL]
