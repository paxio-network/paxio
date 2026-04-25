# M-L0 — Progressive Reveal pattern

**Owner:** frontend-dev
**Branch:** `feature/m-l0-progressive-reveal`
**Depends on:** M01b ✅, M01c-frontend (рекомендуется сначала, но не блокирует)
**Estimate:** 1 день
**Status:** ⬜ QUEUED (за TD-08 → TD-09 → M01c-frontend)

## Зачем

На раннем этапе на landing много секций (Security, FAP, NetworkGraph, Heatmap), у которых данных **пока нет** — Guard не интегрирован, агенты ещё не зарегистрированы, транзакции не идут. Без Progressive Reveal страница выглядит пустой/сломанной: "0 атак", "пустая heatmap", "0 rails share".

**Правило:** секция рендерится ТОЛЬКО если есть не-нулевые данные. Landing честная, не показывает пустоту — вместо этого растёт по мере готовности продукта. Каждая новая интеграция ОЖИВЛЯЕТ свою секцию.

## Готово когда:
- [ ] `packages/ui/src/ConditionalSection.tsx` — компонент обёртка
- [ ] Принимает `show: boolean` ИЛИ predicate `(data) => boolean`
- [ ] Возвращает `null` если `show === false`
- [ ] Возвращает children если `show === true`
- [ ] Поддерживает fallback `<UpcomingBadge label="Launching with Guard v1" />` (опц. вариант вместо hide)
- [ ] Unit тест GREEN (8 assertions)
- [ ] `apps/frontend/landing/app/page.tsx` использует `<ConditionalSection>` вокруг Security, FAP share, NetworkGraph, Heatmap секций

## Метод верификации:
- [ ] **unit test** — `pnpm test -- --run tests/progressive-reveal.test.ts` → GREEN
- [ ] **визуальная проверка** — landing с пустым backend скрывает Security/Heatmap/NetworkGraph секции; не пустые секции (Hero, Quickstart, Bitcoin) остаются

## Scope (frontend-dev)

| File | Purpose |
|---|---|
| `packages/ui/src/ConditionalSection.tsx` | `<ConditionalSection show={boolean}>{children}</ConditionalSection>` — render if truthy |
| `packages/ui/src/UpcomingBadge.tsx` | Опциональный fallback — "Coming soon" badge с label |
| `packages/ui/src/index.ts` | Export `ConditionalSection, UpcomingBadge` |
| `apps/frontend/landing/app/page.tsx` | Обернуть Security / FAP share / NetworkGraph / Heatmap в `<ConditionalSection>` |

## Архитектурные требования

- Pure component — без `useState`, без side effects
- Принимает `show` как prop, не вычисляет внутри
- `UpcomingBadge` — server component (no 'use client')
- Tests: deterministic, Object.isFrozen на frozen props (React style)
- Нет hardcoded strings внутри — всё через props

## RED тест

`tests/progressive-reveal.test.ts` (architect напишет в начале M-L0):

```typescript
import { render } from '@testing-library/react';
import { ConditionalSection, UpcomingBadge } from '@paxio/ui';

describe('ConditionalSection', () => {
  it('renders children when show=true', () => {
    const { getByText } = render(
      <ConditionalSection show={true}>
        <div>inner content</div>
      </ConditionalSection>,
    );
    expect(getByText('inner content')).toBeTruthy();
  });

  it('renders nothing when show=false', () => {
    const { queryByText } = render(
      <ConditionalSection show={false}>
        <div>inner content</div>
      </ConditionalSection>,
    );
    expect(queryByText('inner content')).toBeNull();
  });

  it('renders fallback when show=false and fallback provided', () => {
    const { getByText } = render(
      <ConditionalSection show={false} fallback={<UpcomingBadge label="Launching Q2" />}>
        <div>inner</div>
      </ConditionalSection>,
    );
    expect(getByText(/Launching Q2/)).toBeTruthy();
  });

  it('UpcomingBadge renders label', () => {
    const { getByText } = render(<UpcomingBadge label="Coming soon" />);
    expect(getByText('Coming soon')).toBeTruthy();
  });

  it('is a pure presentation component (no fetch inside)', () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<ConditionalSection show={true}><span>x</span></ConditionalSection>);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
```

## Таблица задач

| # | Задача | Агент | Метод верификации | Архитектурные требования | Файлы |
|---|---|---|---|---|---|
| 1 | `ConditionalSection` компонент | frontend-dev | `tests/progressive-reveal.test.ts` GREEN | Pure component, no state | `packages/ui/src/ConditionalSection.tsx` |
| 2 | `UpcomingBadge` компонент | frontend-dev | unit test GREEN | Server component, label из props | `packages/ui/src/UpcomingBadge.tsx` |
| 3 | Export из `@paxio/ui` | frontend-dev | import works | — | `packages/ui/src/index.ts` |
| 4 | Обернуть секции landing | frontend-dev | visual проверка | `show={data.attacks24 > 0}` и т.п. | `apps/frontend/landing/app/page.tsx` |
