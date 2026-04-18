---
name: react-patterns
description: >
  React patterns for Paxio frontend.
  Use when building React components, hooks, or state management.
---

# React Patterns

## Server Components (RSC) — default in Next.js 15

```typescript
// app/app.paxio.network/agents/page.tsx — Server Component
import { db } from '@/lib/db';

export default async function AgentsPage() {
  const agents = await db.agent.findMany();
  return <AgentList agents={agents} />;
}
```

## Client Components — when you need interactivity

```typescript
'use client';

import { useState, useTransition } from 'react';

export function CreateAgentForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createAgent({
        did: formData.get('did') as string,
        name: formData.get('name') as string,
        capability: formData.get('capability') as string,
      });

      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      {error && <p className="text-red">{error}</p>}
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Agent'}
      </button>
    </form>
  );
}
```

## Data fetching pattern

```typescript
// hooks/useAgent.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useAgent(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/v1/agents/${id}` : null,
    fetcher
  );

  return {
    agent: data,
    isLoading,
    isError: error,
    mutate,
  };
}
```

## Compound component pattern

```typescript
// components/agent-card/index.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface AgentCardContext {
  expanded: boolean;
  toggle: () => void;
}

const Context = createContext<AgentCardContext | null>(null);

export function AgentCard({ agent, children }: { agent: Agent; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded(e => !e);

  return (
    <Context.Provider value={{ expanded, toggle }}>
      <div className="agent-card">
        {children}
      </div>
    </Context.Provider>
  );
}

export function AgentCardHeader({ children }: { children: ReactNode }) {
  const ctx = useContext(Context)!;
  return (
    <div onClick={ctx.toggle} className="cursor-pointer">
      {children}
    </div>
  );
}
```

## Form handling with React Hook Form

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateAgentSchema, type CreateAgentInput } from '@paxio/validators';

export function CreateAgentForm() {
  const form = useForm<CreateAgentInput>({
    resolver: zodResolver(CreateAgentSchema),
    defaultValues: { capability: 'REGISTRY' },
  });

  return (
    <form onSubmit={form.handleSubmit(console.log)}>
      <input {...form.register('did')} />
      {form.formState.errors.did && (
        <span>{form.formState.errors.did.message}</span>
      )}
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Optimistic updates

```typescript
function useAgentMutation(agentId: string) {
  const { mutate } = useSWRConfig();

  async function updateAgent(data: UpdateAgentInput) {
    // Optimistic update
    mutate(
      `/api/v1/agents/${agentId}`,
      async (current: Agent) => ({ ...current, ...data }),
      { rollbackOnError: true }
    );

    // Actual API call
    const result = await fetch(`/api/v1/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!result.ok) {
      // Revalidate to restore correct state
      mutate(`/api/v1/agents/${agentId}`);
    }
  }

  return { updateAgent };
}
```
