---
name: framer-motion
description: >
  Framer Motion patterns for Paxio frontend.
  Use when adding animations to pages, components, or charts.
---

# Framer Motion Patterns

## Page transitions

```tsx
// app/layout.tsx
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

## Staggered list reveal

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function AgentList({ agents }: { agents: Agent[] }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {agents.map(agent => (
        <motion.div key={agent.id} variants={itemVariants}>
          <AgentCard agent={agent} />
        </motion.div>
      ))}
    </motion.div>
  );
}
```

## Hover animation

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="bg-primary text-white px-4 py-2 rounded-lg"
>
  Hover me
</motion.button>
```

## Chart animations

```tsx
import { motion } from 'framer-motion';

// For Recharts, wrap the component
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5, delay: 0.2 }}
>
  <AreaChart data={data}>
    <XAxis dataKey="date" />
    <YAxis />
    <Area
      type="monotone"
      dataKey="reputation"
      stroke="var(--color-accent)"
      fill="var(--color-accent)"
      fillOpacity={0.3}
    />
  </AreaChart>
</motion.div>
```

## Modal animation

```tsx
<Dialog.Root>
  <Dialog.Portal>
    <Dialog.Overlay asChild>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50"
      />
    </Dialog.Overlay>
    <Dialog.Content asChild>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ..."
      >
        <Dialog.Title>Agent Details</Dialog.Title>
      </motion.div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

## AnimatePresence for mount/unmount

```tsx
import { AnimatePresence } from 'framer-motion';

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <AnimatePresence mode="popLayout">
      {toasts.map(toast => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
          className="..."
        >
          {toast.message}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

## Shared layout animation

```tsx
// When routing changes, animate the layout
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```
