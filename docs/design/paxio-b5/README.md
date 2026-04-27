# Paxio B5 Landing — Design Package (vendored reference)

**Read-only.** Source assets from Claude Design (claude.ai/design) handoff bundle, used as
reference during the M-L10 port to Next.js 15.

## Source

- **Canonical handoff bundle** — `https://api.anthropic.com/v1/design/h/8VPHiIOvC-dtoA-BN4Od7Q`
- **Last edited** — 2026-04-26 (per `?v=20260426-btcv2e` query strings)
- **User's selection** — Variant **B5** (Bloomberg-mode Directory hero + landing scrolls).
  See `SOURCE_README.md` (original handoff README) for context on how the design was
  chosen during the iterative chat with Claude Design.

## Files

```
_design/
├── README.md                          ← this file
├── SOURCE_README.md                   ← original handoff bundle README
├── Paxio-B5.html                      ← entry point (header + hero + scrolls + footer)
├── components/
│   ├── v_hero_b5.jsx                  ← HeroVariantB5 (PAEI ticker + agents table + market movers)
│   └── landing_scrolls_b5.jsx         ← PaxioLandingScrollsB5 (rest of the page)
└── styles/
    ├── paxio.css                      ← base tokens (paper/ink/gold, type, density)
    ├── hero_variants.css              ← hero layout grid
    ├── landing_scrolls.css            ← scrolls grid + cards
    ├── paxio_b3_page.css              ← B3 page-level styles inherited by B5
    ├── paxio_b5_fixes.css             ← B5-specific overrides
    └── paxio_mark.svg                 ← favicon mark (5-node graph, gold accent)
```

## NOT for production

- **No** `import` from anywhere in `app/` or `packages/` to `_design/**`. The `tsconfig.json`
  excludes this folder. ESLint will reject any reference.
- **No** copying React 18 UMD CDN scripts (`react.development.js`, `react-dom.development.js`,
  `babel.min.js`) into the Next.js bundle — the design uses CDN+Babel-in-browser for
  prototyping, the port uses Next.js + tsx.
- **No** copying hardcoded data arrays (`AGENTS`, `useTicker` initial state) verbatim into
  domain modules — the port's data goes through `app/data/preview.ts` with explicit
  `// TODO M-L11: replace with real API` markers per export.

## Use during port (M-L10)

1. **Read the HTML top-to-bottom** to understand structure (header → ribbon → hero → scrolls → footer).
2. **Extract CSS tokens** from `styles/paxio.css` → port to `app/globals.css` as CSS variables.
3. **Recreate components** in `app/sections/*-b5.tsx` matching visual output, NOT prototype's
   React structure (CDN React + Babel-in-browser is not idiomatic Next.js).
4. **Wire data** through `app/data/preview.ts` (frozen exports) — do NOT inline simulated
   numbers into JSX.
5. **Keep PreviewRibbon visible** — ribbon discloses the simulation. See `frontend-rules.md::R-FE-Preview`.

## Pixel-perfect target

The port's `next build` output for `/` should visually match `Paxio-B5.html` rendered in a
browser at 1280×800 viewport, both light and dark themes. Scroll-pixels-down behavior should
match: ribbon stays at top (sticky during scroll), header sticks below ribbon, hero fills
viewport, scrolls follow.

## After port lands (M-L11+)

When real backend lands for a section:
1. Replace export in `app/data/preview.ts` with `useQuery` hook from `@paxio/api-client`
2. Remove the `// TODO` marker for that export
3. When all `// TODO` markers are gone, flip `<body data-production="true">` and remove
   `<PreviewRibbon>` (or downgrade to "BETA" disclosure)
