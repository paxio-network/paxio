---
name: nextjs-15
description: >
  Next.js 15 App Router patterns for Paxio.
  Use when building pages, layouts, or routing in app.paxio.network.
---

# Next.js 15 Patterns

## App Router structure

```
app/
├── app.paxio.network/
│   ├── layout.tsx          # Root layout for app subdomain
│   ├── page.tsx            # Dashboard home
│   ├── agents/
│   │   ├── page.tsx        # Agent list
│   │   ├── [id]/
│   │   │   └── page.tsx    # Agent detail
│   │   └── new/
│   │       └── page.tsx    # Create agent
│   └── layout.tsx          # App-specific layout (sidebar, nav)
├── paxio.network/         # Marketing site
│   ├── layout.tsx
│   ├── page.tsx
│   ├── pricing/
│   └── docs/
└── docs.paxio.network/    # Docs portal
    ├── layout.tsx
    └── [...slug]/
```

## Layouts

```typescript
// app/app.paxio.network/layout.tsx
import { Inter } from 'next/font/google';
import { AppShell } from '@/components/app-shell';

const inter = Inter({ subsets: ['latin'] });

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

## Route handlers (API routes in App Router)

```typescript
// app/api/v1/agents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { CreateAgentSchema } from '@paxio/validators';
import { createAgent } from '@/services/agent';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = CreateAgentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.format() },
      { status: 400 }
    );
  }

  const result = await createAgent(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.value, { status: 201 });
}
```

## Server Actions

```typescript
// actions/agent.ts
'use server';

import { revalidatePath } from 'next/cache';
import { CreateAgentSchema } from '@paxio/validators';

export async function createAgentAction(formData: FormData) {
  const data = {
    did: formData.get('did') as string,
    name: formData.get('name') as string,
    capability: formData.get('capability') as string,
  };

  const parsed = CreateAgentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.format() };
  }

  const result = await createAgent(parsed.data);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath('/agents');
  return { success: true };
}
```

## Parallel routes

```typescript
// app/@modal/(.)agents/new/page.tsx — modal overlay
// When visiting /agents/new, modal appears over /agents list
export default function NewAgentModal() {
  return (
    <div className="fixed inset-0 z-50">
      <AgentForm onSuccess={() => closeModal()} />
    </div>
  );
}
```

## Loading states

```typescript
// app/agents/loading.tsx
export default function AgentsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse bg-navy/20 rounded" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 animate-pulse bg-navy/10 rounded" />
        ))}
      </div>
    </div>
  );
}
```

## Error states

```typescript
// app/agents/error.tsx
'use client';

export default function AgentsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-red">Failed to load agents</h2>
      <p className="text-navy/60 mt-2">{error.message}</p>
      <button onClick={reset} className="mt-4 btn-primary">
        Try again
      </button>
    </div>
  );
}
```

## Metadata

```typescript
// app/app.paxio.network/agents/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agents | Paxio',
  description: 'Manage your agent registry',
};

export default function AgentsPage() {
  return <AgentList />;
}
```
