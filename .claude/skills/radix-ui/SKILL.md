---
name: radix-ui
description: >
  Radix UI patterns for Paxio frontend.
  Use when building accessible UI primitives with Radix.
---

# Radix UI Patterns

## Why Radix

Radix provides accessible, unstyled primitives. We add styling via Tailwind.

## Dialog

```tsx
import * as Dialog from '@radix-ui/react-dialog';

<Dialog.Root>
  <Dialog.Trigger asChild>
    <button className="btn-primary">Open</button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-dark p-6 rounded-xl w-full max-w-md">
      <Dialog.Title className="text-lg font-display font-semibold">
        Create Agent
      </Dialog.Title>
      <Dialog.Description className="text-navy/60 mt-2">
        Add a new agent to your registry.
      </Dialog.Description>
      {children}
      <Dialog.Close asChild>
        <button className="absolute top-4 right-4">X</button>
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

## Dropdown Menu

```tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild>
    <button className="btn-ghost">Menu</button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content className="bg-dark border border-white/10 rounded-lg p-1 min-w-[160px]">
      <DropdownMenu.Item
        className="px-3 py-2 text-sm rounded cursor-pointer hover:bg-white/10 outline-none"
        onSelect={() => handleEdit()}
      >
        Edit
      </DropdownMenu.Item>
      <DropdownMenu.Separator className="h-px bg-white/10 my-1" />
      <DropdownMenu.Item
        className="px-3 py-2 text-sm text-red rounded cursor-pointer hover:bg-red/10 outline-none"
        onSelect={() => handleDelete()}
      >
        Delete
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

## Tabs

```tsx
import * as Tabs from '@radix-ui/react-tabs';

<Tabs.Root defaultValue="overview">
  <Tabs.List className="flex gap-4 border-b border-white/10">
    <Tabs.Trigger
      value="overview"
      className="pb-2 text-navy/60 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-accent"
    >
      Overview
    </Tabs.Trigger>
    <Tabs.Trigger value="settings" className="pb-2 text-navy/60 ...">
      Settings
    </Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">
    <Overview />
  </Tabs.Content>
  <Tabs.Content value="settings">
    <Settings />
  </Tabs.Content>
</Tabs.Root>
```

## Select

```tsx
import * as Select from '@radix-ui/react-select';

<Select.Root value={value} onValueChange={setValue}>
  <Select.Trigger className="flex items-center justify-between px-4 py-2 bg-navy/20 border border-white/10 rounded-lg">
    <Select.Value />
    <Select.Icon>Caret</Select.Icon>
  </Select.Trigger>
  <Select.Portal>
    <Select.Content className="bg-dark border border-white/10 rounded-lg p-1">
      <Select.Viewport>
        {capabilities.map(cap => (
          <Select.Item
            key={cap}
            value={cap}
            className="px-3 py-2 text-sm rounded cursor-pointer hover:bg-white/10 outline-none"
          >
            <Select.ItemText>{cap}</Select.ItemText>
          </Select.Item>
        ))}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>
```

## Toast notifications

```tsx
import * as Toast from '@radix-ui/react-toast';

<Toast.Provider>
  <Toast.Root
    className="bg-dark border border-white/10 rounded-lg p-4 data-[state=open]:animate-slideIn"
  >
    <Toast.Title className="font-semibold">Agent created</Toast.Title>
    <Toast.Description className="text-navy/60 mt-1">
      Your new agent is ready.
    </Toast.Description>
  </Toast.Root>
  <Toast.Viewport className="fixed bottom-4 right-4" />
</Toast.Provider>
```

## Tooltip

```tsx
import * as Tooltip from '@radix-ui/react-tooltip';

<Tooltip.Provider>
  <Tooltip.Root>
    <Tooltip.Trigger asChild>
      <button>?</button>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        className="bg-dark border border-white/10 rounded px-3 py-2 text-sm"
        sideOffset={5}
      >
        Help text here
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

## Accessibility always

```tsx
// Radix handles ARIA, but always test keyboard navigation:
// - Tab to navigate
// - Enter/Space to activate
// - Escape to close modals/dropdowns
// - Arrow keys for menus and tabs
```
