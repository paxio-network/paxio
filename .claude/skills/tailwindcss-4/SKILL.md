---
name: tailwindcss-4
description: >
  Tailwind CSS 4 patterns for Paxio frontend.
  Use when styling components with Tailwind CSS 4.
---

# Tailwind CSS 4 Patterns

## CSS Variables (design tokens)

```css
/* app/globals.css — Tailwind CSS 4 with custom properties */
@import "tailwindcss";

@theme {
  --color-primary: #0F3460;
  --color-dark: #1A1A2E;
  --color-accent: #533483;
  --color-teal: #0F766E;
  --color-red: #991B1B;
  --color-bitcoin: #D97706;
  --color-navy: #1E3A5F;
  --color-green: #166534;

  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Syne", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

## Color usage

```tsx
// Use semantic color names, not raw hex
<div className="bg-primary text-white">Header</div>
<div className="bg-accent text-white">Intelligence Layer</div>
<div className="bg-teal text-white">Registry / Compliance</div>
<div className="bg-red text-white">Security Layer</div>
<div className="bg-bitcoin text-white">Bitcoin only</div>
<div className="bg-navy text-white">Wallet / Trust</div>
<div className="bg-green text-white">Success / Verified</div>
```

## Typography classes

```tsx
<h1 className="font-display text-4xl font-bold tracking-tight">
  Dashboard
</h1>
<h2 className="font-display text-2xl font-semibold">
  Agent Registry
</h2>
<p className="font-sans text-sm text-navy/60">
  Last updated: {date}
</p>
<code className="font-mono text-sm bg-dark/50 text-accent px-2 py-1 rounded">
  did:paxio:agent123
</code>
```

## Component patterns

```tsx
// Button variants
const buttonVariants = {
  primary: 'bg-primary text-white hover:bg-primary/90',
  secondary: 'bg-navy text-white hover:bg-navy/90',
  danger: 'bg-red text-white hover:bg-red/90',
  ghost: 'bg-transparent text-primary hover:bg-primary/10',
};

<button className={`px-4 py-2 rounded-lg font-medium transition-colors ${buttonVariants.primary}`}>
  Primary Button
</button>

// Card
<div className="bg-dark border border-white/10 rounded-xl p-6">
  {children}
</div>
```

## Responsive design

```tsx
// Mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <AgentCard />
  <AgentCard />
  <AgentCard />
</div>

// Sidebar responsive
<aside className="w-full md:w-64 lg:w-80">
  <Sidebar />
</aside>
```

## Animation

```tsx
// Use CSS transitions, not JS
<div className="transition-all duration-200 ease-out hover:scale-105">
  <AgentCard />
</div>

// For complex animations, use Framer Motion
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

## Dark mode (default for app)

```tsx
// Dark backgrounds, light text (app default)
<div className="bg-dark text-white">
  <div className="bg-navy/50">Card</div>
</div>

// Light backgrounds for marketing sections
<div className="bg-white text-dark">
  <div className="bg-navy/5">Subtle background</div>
</div>
```

## DO NOT use @apply for everything

```css
/* BAD — @apply abuse */
.btn-primary {
  @apply bg-primary text-white px-4 py-2 rounded-lg font-medium;
}

/* GOOD — use utility classes directly */
<button className="bg-primary text-white px-4 py-2 rounded-lg font-medium">
  Button
</button>

/* OK — only for repeated patterns */
.sr-only {
  @apply absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0;
}
```
