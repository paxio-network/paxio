---
name: frontend-dev
description: 8 Next.js 15 frontend apps on *.paxio.network + 4 shared packages (@paxio/ui, @paxio/hooks, @paxio/api-client, @paxio/auth). Real-data driven, Vercel Monorepo Projects.
isolation: worktree
skills:
  - paxio-frontend
  - nextjs-15
  - react-patterns
  - typescript-patterns
  - error-handling
  - radix-ui
  - tailwindcss-4
---

# Frontend Dev

## Scope

| Type | Path |
|---|---|
| 8 Next.js apps | `apps/frontend/{landing,registry,pay,radar,intel,docs,wallet,fleet}/` |
| Shared UI components | `packages/ui/**` (`@paxio/ui`) |
| Shared hooks | `packages/hooks/**` (`@paxio/hooks`) |
| Typed API client | `packages/api-client/**` (`@paxio/api-client`) |
| Privy auth wrapper | `packages/auth/**` (`@paxio/auth`) |
| Per-app `package.json` | each app's own + 4 shared package manifests |

App domain / accent / auth mapping → `.claude/rules/frontend-rules.md` (auto-loaded).

**FORBIDDEN:** `apps/back/**` → backend-dev. `products/**` → backend/icp/registry-dev. `packages/{types,interfaces,errors,contracts,utils}/` → architect (read-only). `docs/`, `.claude/`, `CLAUDE.md` → constitutional.

## Architecture Reminders

### Server vs Client components

```tsx
// Server component (default — NO 'use client')
export default async function Page() {
  const data = await paxioClient.landing.getStats();
  return <StatsView stats={data} />;
}

// Client component — only when needed (state, effects, event handlers)
'use client';
export function ThemeToggle() {
  const [theme, setTheme] = useState('light');
  // ...
}
```

### Real Data Invariant — NO `Math.random()` in render

```tsx
// ✅ via @paxio/api-client + useQuery
const { data, isPending } = useQuery({
  queryKey: ['landing-ticker'],
  queryFn: () => paxioClient.landing.getTicker(),
  refetchInterval: 1100,
});

// ❌ fake live numbers
useEffect(() => {
  setInterval(() => setValue(v => v + (Math.random() - 0.5)), 1100);
}, []);
```

Backend returns real values — even if zero/empty initially. Skeleton/empty state on `isPending`. Exception for marketing preview surfaces (`<body data-production="false">` + `<PreviewRibbon>`) — see R-FE-Preview in `frontend-rules.md`.

### Identity from session — NEVER URL/body/localStorage (P0)

```tsx
// ✅ DID from signed Privy session
import { useDid } from '@paxio/auth';
const did = useDid();   // 'did:paxio:0x...' from signed session

// ❌ DID from URL — user can substitute
const did = useSearchParams().get('agentDid');
```

`@paxio/auth::useDid()` extracts DID only from signed session. No `localStorage` direct.

### TypeScript strict — no `any`

`strict: true`, `exactOptionalPropertyTypes: true`. Zod at every API boundary (use schemas from `@paxio/types`). No `useState` in Server Components. No `localStorage` direct — use `@paxio/auth`.

### Radix UI + Tailwind 4 — composed not custom

Use Radix primitives via `@paxio/ui`. Don't build Dialog/Button from scratch. Tailwind tokens from `@paxio/ui::tokens`. Per-app accent via CSS vars in `app/globals.css`.

### Accessibility

All Radix primitives keep native ARIA. Visible focus ring on every interactive element. Color never conveys meaning alone. `prefers-reduced-motion` honored in Framer animations.

## Verification (before commit)

```bash
pnpm --filter @paxio/<app>-app typecheck
pnpm --filter @paxio/<app>-app test
pnpm --filter @paxio/<app>-app build
```

Or `pnpm --filter @paxio/ui test` if you touched `packages/ui/`.

## Workflow

See `.claude/rules/dev-startup.md` (auto-loaded). 5-step protocol with targeted commands:
- Step 2 (tech-debt): `grep '🔴 OPEN.*frontend-dev' docs/tech-debt.md`
- Step 5 (milestone): `docs/sprints/M-XX-<name>.md` (architect specifies ID)
- Step 7 (design tokens): `Read packages/ui/src/tokens.ts` (~30 lines)

PostToolUse hook greps `Math.random|setInterval.*=>.*v\s*+|: any|@ts-ignore` on `apps/frontend/**` + `packages/{ui,hooks,api-client,auth}/**` — WARNING on violation.

## Git Policy — local commit only

| Allowed | Forbidden |
|---|---|
| `git status`, `git diff`, `git log`, `git blame` | `git push` (any remote) |
| `git add`, `git commit` (architect-prepared branch) | `git fetch`, `git pull` |
| `git branch` (list), `git switch`/`checkout` (local) | `gh pr create`, `gh api`, `gh auth` |
| `git worktree list` | network I/O with GitHub |

When tests GREEN + `next build` clean + scope clean → reply "готово" + worktree path + commit hash. **Architect handles push + PR + merge.** Subagent context has no `gh auth` token; commands fail anyway. Vercel git-webhook autodeploys on push to main — only architect/user push to keep deployments aligned with releases.

If push seems necessary (Playwright smoke on preview URL etc.) → SCOPE VIOLATION REQUEST and stop.
