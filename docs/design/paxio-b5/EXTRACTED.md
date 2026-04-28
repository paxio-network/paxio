# Paxio B5 — Design Tokens (Extracted)

> Architect-extracted condensed reference. Read THIS instead of the 5 raw CSS
> files (3300+ lines). Only what frontend-dev needs to port to Tailwind/CSS vars.
>
> Source: `docs/design/paxio-b5/styles/{paxio,hero_variants,landing_scrolls,paxio_b3_page,paxio_b5_fixes}.css`.
> Updated when raw CSS changes.

## Color tokens (CSS variables)

### Light theme (default)

```css
/* Paper palette (backgrounds) */
--paper-0: #F6EFDD;     /* warm cream — base bg */
--paper-1: #EFE6D0;     /* slightly darker — panel bg */
--paper-2: #E5D9BC;     /* raised — table head bg */
--paper-3: #D9C99F;     /* accent paper — selected row */

/* Ink palette (text + borders) */
--ink-0:   #1A1612;     /* near-black warm — primary text */
--ink-1:   #2A241C;     /* secondary text */
--ink-2:   #4A4132;     /* muted text */
--ink-3:   #6D6147;     /* placeholder */
--ink-4:   #948668;     /* disabled */

/* Bitcoin gold (USE SPARINGLY — only on actual BTC mentions) */
--gold:        #C08A2E;
--gold-bright: #D79F3C;
--gold-ink:    #6A4A14; /* dark gold for text on gold bg */

/* Semantic — muted, hand-drawn feel */
--up:    #4C7A3F;       /* trend positive */
--down:  #A54233;       /* trend negative */
--blue:  #35557A;       /* link / info */

/* Lines (borders) */
--line:        #1A1612;
--line-soft:   rgba(26, 22, 18, 0.24);
--line-xsoft:  rgba(26, 22, 18, 0.12);
```

### Dark theme — `html[data-theme="dark"]`

```css
--paper-0: #1d1a16;     /* warm dark base */
--paper-1: #25211c;
--paper-2: #2d2822;
--paper-3: #38322a;
--ink-0:   #f3eadb;     /* warm cream — primary text */
--ink-1:   #e6dcc9;
--ink-2:   #c5b698;
--ink-3:   #8a7c64;
--ink-4:   #6d6147;
--gold:        #d9a046;
--gold-bright: #efb858;
--gold-ink:    #f8e9c8;
--up:    #6fa55e;
--down:  #c8553d;
--blue:  #6f95c0;
--line:       #f3eadb;
--line-soft:  rgba(243, 234, 219, 0.24);
--line-xsoft: rgba(243, 234, 219, 0.10);
```

## Typography (Google Fonts)

```css
/* Import in app/layout.tsx via next/font/google */
--f-display: 'Fraunces', 'Times New Roman', serif;     /* h-xl, h-lg, h-md, h-sm, .logo */
--f-sans:    'Inter Tight', system-ui, sans-serif;     /* body, btn, nav-link */
--f-mono:    'JetBrains Mono', ui-monospace, monospace; /* .kicker, .chip, .mono, kv labels, did */
```

Variable axes:
- Fraunces — `wght: 400/500/600/700`, `opsz: 9..144`, italic + roman
- Inter Tight — `wght: 400/500/600/700`
- JetBrains Mono — `wght: 400/500/700`

Display scale:
```css
.h-xl { font: 500 clamp(48px, 7vw, 104px)/0.96 var(--f-display); letter-spacing: -0.02em; }
.h-lg { font: 500 clamp(36px, 5vw, 68px)/1.0  var(--f-display); letter-spacing: -0.01em; }
.h-md { font: 500 clamp(22px, 2.4vw, 32px)/1.1 var(--f-display); }
.h-sm { font: 500 20px/1.2 var(--f-display); }
.kicker { font: 11px/1.4 var(--f-mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); }
```

## Geometry / spacing

```css
--page-pad: clamp(24px, 4vw, 56px);   /* horizontal page gutter */
--ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
.page    { max-width: 1440px; margin: 0 auto; padding-inline: var(--page-pad); }
section  { padding-block: 88px; }
section.tight { padding-block: 48px; }
.grid-12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
```

Body has subtle paper grain via inline SVG noise — port это как single CSS rule на `body`
(см. `paxio.css` lines 84-87 for full data-URI).

## Component contracts (key classes)

### Buttons

```html
<button class="btn">         <!-- ghost on paper-0 -->
<button class="btn solid">   <!-- ink-0 fill -->
<button class="btn gold">    <!-- gold fill, BTC accent only -->
<button class="btn ghost">   <!-- transparent bg -->
<button class="btn sm">      <!-- smaller padding -->
```

Shadow effect = sketchy hand-drawn double-line:
```css
.btn { border: 1.5px solid var(--ink-0); box-shadow: 3px 3px 0 0 var(--ink-0); }
.btn:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 0 var(--ink-0); }
.btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 0 var(--ink-0); }
```

### Chips (filter pills)

```html
<span class="chip">                      <!-- default -->
<span class="chip gold">                 <!-- BTC marker -->
<span class="chip ink">                  <!-- inverted -->
<span class="chip"><span class="chip-dot"/> WALLET</span>
```

### Panels (cards)

```html
<div class="panel">           <!-- paper-0 + 1.5px border + 3px shadow -->
<div class="panel raised">    <!-- paper-1 bg, 4px shadow -->
<div class="panel paper-2">   <!-- paper-2 bg -->
<div class="panel-head">…</div>  <!-- header strip — mono caps, paper-2 bg -->
```

### Marquee (preview-ribbon + ticker)

CSS selectors: `.marquee` (container) + `.marquee-track` (animated row).

```html
<div class="marquee">
  <div class="marquee-track">
    <span>SIMULATED PREVIEW · LAUNCHING Q2 2026 · …</span>
    <span>SIMULATED PREVIEW · LAUNCHING Q2 2026 · …</span>  <!-- duplicate for seamless loop -->
  </div>
</div>
```
- `.marquee` border top + bottom `1.2px solid var(--ink-0)`
- `.marquee-track` `animation: marquee 60s linear infinite` translateX(0 → -50%)
- `[data-motion="off"]` disables animation (a11y `prefers-reduced-motion`)

### Sticky nav (header)

```html
<header class="nav">
  <div class="nav-inner page">          <!-- 64px height, grid auto / 1fr / auto -->
    <a class="logo">…</a>
    <nav class="nav-links">…</nav>
    <div class="hdr-actions">…</div>
  </div>
</header>
```
- Background: `rgba(paper-0, 0.88)` + `backdrop-filter: blur(10px)`
- Border-bottom: `1.5px solid var(--ink-0)`
- z-index 50

### Live ticker stack (B5 hero)

CSS selectors: `.ticker-stack`, `.ticker-stack.b5`, `.ticker-lane`,
`.ticker-lane-label`, `.ticker-scroll`, `.ticker-inner`.

```html
<div class="ticker-stack b5">
  <div class="ticker-lane">
    <div class="ticker-lane-label">INDICES</div>      <!-- 120px col, gold mono caps -->
    <div class="ticker-scroll">                       <!-- mask-image fade edges -->
      <div class="ticker-inner">                      <!-- 68s linear infinite -->
        …PAEI 1284.7 ▲ +0.82% · BTC 431.9 …
      </div>
    </div>
  </div>
  <!-- 2 more lanes: RAILS, ADOPTION -->
</div>
```

### Tables (B5 directory)

```html
<table class="reg-tbl">
  <thead><tr><th>NAME · DID</th><th>SOURCE</th><th>WALLET</th><th>VOL · 24H</th>…</tr></thead>
  <tbody>
    <tr onclick="…"><td>…</td>…</tr>   <!-- row clickable, hover paper-2 bg -->
  </tbody>
</table>
```
- Header `font-family: var(--f-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3);`
- Row hover `background: var(--paper-2); cursor: pointer;`
- Border-bottom dashed `var(--line-soft)`

### Sparkline (24h trend)

```jsx
<svg width={64} height={18} viewBox="0 0 64 18">
  <polyline points="…" fill="none" strokeWidth="1.2"
            stroke={trend ? "var(--up)" : "var(--down)"} opacity="0.9"/>
</svg>
```

### Footer (page-foot)

```html
<footer id="page-foot">
  <div class="foot-inner page grid-12">
    <div class="foot-brand col-span-4">           <!-- mark + tagline -->
    <div class="foot-cols col-span-8 grid-12">    <!-- Product / Builders / Company × 3 cols -->
  </div>
  <div class="foot-legal page">                   <!-- © 2026 + disclaimer -->
</footer>
```
- BG `var(--paper-1)`, border-top `1.5px solid var(--ink-0)`

## Misc effects

### Pulse dot (live indicator)

```css
.pulse-dot {
  width: 7px; height: 7px; border-radius: 999px; background: var(--up);
  animation: pulse 2s var(--ease-out) infinite;
}
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 rgba(76,122,63,0.5); }
  70%  { box-shadow: 0 0 0 8px rgba(76,122,63,0); }
  100% { box-shadow: 0 0 0 0 rgba(76,122,63,0); }
}
```

### Scribble underline (gold emphasis)

`.scribble` — inline SVG path as background-image, gold stroke. Used on emphasized words.
```css
.scribble {
  background-image: url("data:image/svg+xml;utf8,<svg …gold scribble…/>");
  background-position: 0 95%; background-size: 100% 0.35em;
}
```

### Reveal-on-scroll

```css
.reveal { opacity: 0; transform: translateY(16px); transition: 0.6s var(--ease-out); }
.reveal.in { opacity: 1; transform: none; }
[data-motion="off"] .reveal { opacity: 1; transform: none; }
```

JS toggles `.in` via IntersectionObserver. Honor `[data-motion="off"]`.

### Hand-drawn border helper

```css
.hand        { border: 1.5px solid var(--ink-0); box-shadow: 3px 3px 0 0 var(--ink-0); }
.hand.soft   { box-shadow: 2px 2px 0 0 var(--ink-0); }
```

Universal "sketchy" affordance. Apply to `.btn`, `.panel`, `.chip` and most cards.

## Layout grid breakpoints

```css
.grid-12       { grid-template-columns: repeat(12, 1fr); gap: 24px; }
.col-span-4 / .col-span-5 / .col-span-6 / .col-span-7 / .col-span-8 / .col-span-12

@media (max-width: 900px)  { /* mobile drawer kicks in, ticker collapses */ }
@media (max-width: 1100px) { /* sidebar stacks below main */ }
```

## Theme toggle script (vanilla, port to React `useEffect` + `'use client'`)

```javascript
// Persists in localStorage 'paxio-theme', defaults 'light'.
const root = document.documentElement;
const saved = localStorage.getItem('paxio-theme') ?? 'light';
root.setAttribute('data-theme', saved);

document.getElementById('hdr-theme-btn').addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('paxio-theme', next);
});
```

## What you DON'T need to port

These are prototype-isms:
- React 18 UMD CDN (`unpkg.com/react@…`) — use Next.js's React 19
- Babel-in-browser (`<script type="text/babel">`) — Next.js compiles tsx natively
- `data-density="regular"`, `data-accent="classic"` — leftovers from earlier variants, B5 doesn't use them
- `.tweaks` panel (lines 272-293) — design-time control panel, not in production
- `body { background-image: url("data:image/svg+xml;…noise…") }` — keep, it's the paper grain effect; port as-is in a single body rule

## Files this distills

| Source | Lines | Purpose |
|---|---|---|
| `paxio.css` | 298 | base tokens + .panel/.btn/.chip/.kv primitives |
| `hero_variants.css` | 384 | hero-specific layout (tabs, search-stage, terminal) |
| `landing_scrolls.css` | 783 | scroll sections (audiences, bitcoin, registry, pricing) |
| `paxio_b3_page.css` | 927 | B3 page-level layout inherited by B5 (table, ticker, doors) |
| `paxio_b5_fixes.css` | 908 | B5 overrides (ticker masked edges, ribbon polish, scroll polish) |
| **TOTAL** | **3300** | **→ this 250-line summary** |

If during port you NEED a specific selector not listed here, search the source files via:
```bash
grep -nB 2 -A 8 'class-name-here' docs/design/paxio-b5/styles/*.css
```
