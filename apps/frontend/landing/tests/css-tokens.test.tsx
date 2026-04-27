// M-L10.2 — CSS tokens + theme system + fonts (RED specs)
//
// Verifies frontend-dev's port of docs/design/paxio-b5/EXTRACTED.md tokens
// into apps/frontend/landing/app/globals.css + layout.tsx + ThemeProvider.
//
// Sections:
//   1. Light-theme CSS vars (paper / ink / gold / semantic / line / font / layout)
//   2. Dark-theme overrides via html[data-theme="dark"]
//   3. Body styling (paper-0 bg, ink-1 text, f-sans font, 15px / 1.55 line-height)
//   4. Google Fonts via next/font/google (Fraunces / Inter Tight / JetBrains Mono)
//      — NOT raw <link> CDN tag
//   5. ThemeProvider component ('use client', localStorage, default 'light')
//   6. Component primitive classes (.btn, .chip, .panel, .kicker, ...)
//   7. Display scale (.h-xl, .h-lg, .h-md, .h-sm)
//   8. Layout helpers (.page, .grid-12, .col-span-*, section padding)
//   9. Animations (.pulse-dot, .marquee + .marquee-track + @keyframes marquee)
//  10. Reveal-on-scroll + reduced-motion respect
//  11. Architectural enforcement
//      — body uses var(--paper-0)/var(--ink-1)/var(--f-sans), not hardcoded hex
//      — layout.tsx no <link rel=stylesheet href=fonts.googleapis> (use next/font)

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = (...parts: string[]) =>
  resolve(__dirname, '..', ...parts);
const safeRead = (p: string): string => {
  const full = root(p);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf8');
};

const globals = () => safeRead('app/globals.css');
const layout = () => safeRead('app/layout.tsx');
const themeProvider = () => safeRead('app/_components/ThemeProvider.tsx');

// ---------------------------------------------------------------------------
// 1. Light-theme CSS variables (24 tokens)
// ---------------------------------------------------------------------------

describe('M-L10.2 — light theme CSS tokens', () => {
  it('declares 5 paper tokens (--paper-0..3)', () => {
    const css = globals();
    expect(css).toMatch(/--paper-0\s*:/);
    expect(css).toMatch(/--paper-1\s*:/);
    expect(css).toMatch(/--paper-2\s*:/);
    expect(css).toMatch(/--paper-3\s*:/);
  });

  it('declares 5 ink tokens (--ink-0..4)', () => {
    const css = globals();
    expect(css).toMatch(/--ink-0\s*:/);
    expect(css).toMatch(/--ink-1\s*:/);
    expect(css).toMatch(/--ink-2\s*:/);
    expect(css).toMatch(/--ink-3\s*:/);
    expect(css).toMatch(/--ink-4\s*:/);
  });

  it('declares 3 gold tokens (--gold, --gold-bright, --gold-ink)', () => {
    const css = globals();
    expect(css).toMatch(/--gold\s*:/);
    expect(css).toMatch(/--gold-bright\s*:/);
    expect(css).toMatch(/--gold-ink\s*:/);
  });

  it('declares 3 semantic tokens (--up, --down, --blue)', () => {
    const css = globals();
    expect(css).toMatch(/--up\s*:/);
    expect(css).toMatch(/--down\s*:/);
    expect(css).toMatch(/--blue\s*:/);
  });

  it('declares 3 line tokens (--line, --line-soft, --line-xsoft)', () => {
    const css = globals();
    expect(css).toMatch(/--line\s*:/);
    expect(css).toMatch(/--line-soft\s*:/);
    expect(css).toMatch(/--line-xsoft\s*:/);
  });

  it('declares 3 font-family vars (--f-display, --f-sans, --f-mono)', () => {
    const css = globals();
    expect(css).toMatch(/--f-display\s*:/);
    expect(css).toMatch(/--f-sans\s*:/);
    expect(css).toMatch(/--f-mono\s*:/);
  });

  it('declares 2 layout vars (--page-pad, --ease-out)', () => {
    const css = globals();
    expect(css).toMatch(/--page-pad\s*:/);
    expect(css).toMatch(/--ease-out\s*:/);
  });

  it('paper-0 light value is warm cream (#F6EFDD or similar light)', () => {
    const css = globals();
    // Find the light :root block (NOT [data-theme="dark"]) — first occurrence
    const lightMatch = css.match(/:root\s*\{[\s\S]*?--paper-0\s*:\s*([^;]+);/);
    expect(lightMatch).not.toBeNull();
    const value = lightMatch![1].trim().toUpperCase();
    // Reference is #F6EFDD; allow case-insensitive any near-equivalent
    expect(value).toMatch(/#F[56][EF][EF]DD|#F6EFDD/i);
  });
});

// ---------------------------------------------------------------------------
// 2. Dark-theme overrides — html[data-theme="dark"]
// ---------------------------------------------------------------------------

describe('M-L10.2 — dark theme overrides', () => {
  it('defines html[data-theme="dark"] block', () => {
    expect(globals()).toMatch(/html\[data-theme=["']dark["']\]\s*\{/);
  });

  it('dark block overrides --paper-0 to dark value (e.g. #1d1a16)', () => {
    const css = globals();
    const darkMatch = css.match(
      /html\[data-theme=["']dark["']\]\s*\{[\s\S]*?--paper-0\s*:\s*([^;]+);/,
    );
    expect(darkMatch).not.toBeNull();
    const value = darkMatch![1].trim();
    // Should be hex starting with #1 or #2 (dark warm bg)
    expect(value).toMatch(/^#[12][a-fA-F0-9]{5}$/);
  });

  it('dark block overrides --ink-0 to light value (e.g. #f3eadb)', () => {
    const css = globals();
    const darkMatch = css.match(
      /html\[data-theme=["']dark["']\]\s*\{[\s\S]*?--ink-0\s*:\s*([^;]+);/,
    );
    expect(darkMatch).not.toBeNull();
    const value = darkMatch![1].trim();
    // Should be hex starting with #e or #f (cream)
    expect(value).toMatch(/^#[ef][a-fA-F0-9]{5}$/i);
  });

  it('dark block overrides --gold to brighter dark variant', () => {
    const css = globals();
    expect(css).toMatch(
      /html\[data-theme=["']dark["']\][\s\S]*?--gold\s*:\s*#[a-fA-F0-9]{6}/,
    );
  });

  it('dark block overrides --line to light value (inverted contrast)', () => {
    const css = globals();
    expect(css).toMatch(
      /html\[data-theme=["']dark["']\][\s\S]*?--line\s*:\s*#[ef][a-fA-F0-9]{5}/i,
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Body styling — uses tokens, not hardcoded values
// ---------------------------------------------------------------------------

describe('M-L10.2 — body uses tokens (no hardcoded hex on body)', () => {
  it('body { background uses var(--paper-0) }', () => {
    const css = globals();
    const bodyMatch = css.match(/(?:^|\})\s*body\s*\{([\s\S]*?)\}/);
    expect(bodyMatch).not.toBeNull();
    const body = bodyMatch![1];
    expect(body).toMatch(/background[^;]*var\(--paper-0\)/);
  });

  it('body { color uses var(--ink-1) }', () => {
    const css = globals();
    const bodyMatch = css.match(/(?:^|\})\s*body\s*\{([\s\S]*?)\}/);
    expect(bodyMatch).not.toBeNull();
    expect(bodyMatch![1]).toMatch(/color\s*:\s*var\(--ink-1\)/);
  });

  it('body { font-family uses var(--f-sans) }', () => {
    const css = globals();
    const bodyMatch = css.match(/(?:^|\})\s*body\s*\{([\s\S]*?)\}/);
    expect(bodyMatch).not.toBeNull();
    expect(bodyMatch![1]).toMatch(/font(?:-family)?\s*:[^;]*var\(--f-sans\)/);
  });

  it('body has font-size 15px and line-height 1.55', () => {
    const css = globals();
    const bodyMatch = css.match(/(?:^|\})\s*body\s*\{([\s\S]*?)\}/);
    expect(bodyMatch).not.toBeNull();
    const body = bodyMatch![1];
    // Either standalone props or inside font shorthand
    expect(body).toMatch(/font-size\s*:\s*15px|font\s*:[^;]*15px/);
    expect(body).toMatch(/line-height\s*:\s*1\.55|font\s*:[^;]*\/\s*1\.55/);
  });

  it('body has paper grain via SVG noise data-URI', () => {
    const css = globals();
    const bodyMatch = css.match(/(?:^|\})\s*body\s*\{([\s\S]*?)\}/);
    expect(bodyMatch).not.toBeNull();
    expect(bodyMatch![1]).toMatch(/background-image\s*:[^;]*data:image\/svg/i);
  });
});

// ---------------------------------------------------------------------------
// 4. Google Fonts via next/font/google (NOT CDN <link> tag)
// ---------------------------------------------------------------------------

describe('M-L10.2 — Google Fonts via next/font/google', () => {
  it('layout.tsx imports Fraunces from next/font/google', () => {
    const tsx = layout();
    expect(tsx).toMatch(/from\s+['"]next\/font\/google['"]/);
    expect(tsx).toMatch(/\bFraunces\b/);
  });

  it('layout.tsx imports Inter_Tight from next/font/google', () => {
    const tsx = layout();
    expect(tsx).toMatch(/\bInter_Tight\b/);
  });

  it('layout.tsx imports JetBrains_Mono from next/font/google', () => {
    const tsx = layout();
    expect(tsx).toMatch(/\bJetBrains_Mono\b/);
  });

  it('Fraunces declares variable (--f-display) for CSS var binding', () => {
    const tsx = layout();
    // Either explicit `variable: '--f-display'` or className applied to html
    expect(tsx).toMatch(/--f-display/);
  });

  it('Inter_Tight declares variable (--f-sans)', () => {
    const tsx = layout();
    expect(tsx).toMatch(/--f-sans/);
  });

  it('JetBrains_Mono declares variable (--f-mono)', () => {
    const tsx = layout();
    expect(tsx).toMatch(/--f-mono/);
  });

  it('layout.tsx does NOT use <link href=fonts.googleapis> CDN tag', () => {
    const tsx = layout();
    expect(tsx).not.toMatch(/href=["'][^"']*fonts\.googleapis\.com/);
  });

  it('layout.tsx does NOT preconnect to fonts.googleapis (next/font handles this)', () => {
    const tsx = layout();
    expect(tsx).not.toMatch(/preconnect[^>]*fonts\.googleapis\.com/);
  });
});

// ---------------------------------------------------------------------------
// 5. ThemeProvider — 'use client', localStorage, default 'light'
// ---------------------------------------------------------------------------

describe('M-L10.2 — ThemeProvider component', () => {
  it('apps/frontend/landing/app/_components/ThemeProvider.tsx exists', () => {
    expect(themeProvider().length).toBeGreaterThan(0);
  });

  it('ThemeProvider has \'use client\' directive', () => {
    expect(themeProvider()).toMatch(/^['"]use client['"]/m);
  });

  it('reads localStorage paxio-theme key on mount', () => {
    expect(themeProvider()).toMatch(/localStorage\.getItem\(['"]paxio-theme['"]\)/);
  });

  it('defaults to "light" when localStorage empty', () => {
    const tsx = themeProvider();
    // Either `?? 'light'` or `|| 'light'` or explicit conditional
    expect(tsx).toMatch(/['"]light['"]/);
  });

  it('writes localStorage paxio-theme key on change', () => {
    expect(themeProvider()).toMatch(/localStorage\.setItem\(['"]paxio-theme['"]/);
  });

  it('sets <html data-theme="..."> attribute', () => {
    expect(themeProvider()).toMatch(/setAttribute\(['"]data-theme['"]/);
  });

  it('exports useTheme hook', () => {
    const tsx = themeProvider();
    expect(tsx).toMatch(/export\s+(?:const|function)\s+useTheme/);
  });
});

// ---------------------------------------------------------------------------
// 6. Component primitives — buttons, chips, panels
// ---------------------------------------------------------------------------

describe('M-L10.2 — button primitives', () => {
  const buttonClasses = ['.btn', '.btn.solid', '.btn.gold', '.btn.ghost', '.btn.sm'];
  for (const cls of buttonClasses) {
    it(`globals.css declares ${cls}`, () => {
      // CSS may use either compound `.btn.solid` or attribute-style
      // — match either form. Escape dot for regex.
      const escaped = cls.replace(/\./g, '\\.');
      expect(globals()).toMatch(new RegExp(escaped));
    });
  }

  it('.btn has hand-drawn shadow (3px 3px 0 0 var(--ink-0) or similar)', () => {
    const css = globals();
    const btnMatch = css.match(/\.btn\s*\{([\s\S]*?)\}/);
    expect(btnMatch).not.toBeNull();
    expect(btnMatch![1]).toMatch(/box-shadow[^;]*var\(--ink-0\)/);
  });
});

describe('M-L10.2 — chip primitives', () => {
  const chipClasses = ['.chip', '.chip.gold', '.chip.ink', '.chip-dot'];
  for (const cls of chipClasses) {
    it(`globals.css declares ${cls}`, () => {
      const escaped = cls.replace(/\./g, '\\.');
      expect(globals()).toMatch(new RegExp(escaped));
    });
  }
});

describe('M-L10.2 — panel primitives', () => {
  const panelClasses = ['.panel', '.panel.raised', '.panel.paper-2', '.panel-head'];
  for (const cls of panelClasses) {
    it(`globals.css declares ${cls}`, () => {
      const escaped = cls.replace(/\./g, '\\.');
      expect(globals()).toMatch(new RegExp(escaped));
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Display scale + typography utility classes
// ---------------------------------------------------------------------------

describe('M-L10.2 — display scale (.h-xl/lg/md/sm) + typography utils', () => {
  it('declares .h-xl, .h-lg, .h-md, .h-sm', () => {
    const css = globals();
    expect(css).toMatch(/\.h-xl\s*\{/);
    expect(css).toMatch(/\.h-lg\s*\{/);
    expect(css).toMatch(/\.h-md\s*\{/);
    expect(css).toMatch(/\.h-sm\s*\{/);
  });

  it('.h-xl uses var(--f-display) and clamp font-size', () => {
    const css = globals();
    const m = css.match(/\.h-xl\s*\{([\s\S]*?)\}/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/var\(--f-display\)/);
    expect(m![1]).toMatch(/clamp\(/);
  });

  it('declares .kicker (mono caps) using var(--f-mono)', () => {
    const css = globals();
    const m = css.match(/\.kicker\s*\{([\s\S]*?)\}/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/var\(--f-mono\)/);
    expect(m![1]).toMatch(/uppercase/);
  });

  it('declares .mono / .serif / .italic / .scribble utility classes', () => {
    const css = globals();
    expect(css).toMatch(/\.mono\s*\{/);
    expect(css).toMatch(/\.serif\s*\{/);
    expect(css).toMatch(/\.italic\s*\{/);
    expect(css).toMatch(/\.scribble\s*\{/);
  });

  it('declares .kv / .kv .k / .kv .v (key-value rows)', () => {
    const css = globals();
    expect(css).toMatch(/\.kv\s*\{/);
    expect(css).toMatch(/\.kv\s+\.k\s*\{/);
    expect(css).toMatch(/\.kv\s+\.v\s*\{/);
  });
});

// ---------------------------------------------------------------------------
// 8. Layout helpers
// ---------------------------------------------------------------------------

describe('M-L10.2 — layout helpers', () => {
  it('declares .page (max-width 1440 + horizontal page-pad)', () => {
    const css = globals();
    const m = css.match(/\.page\s*\{([\s\S]*?)\}/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/max-width\s*:\s*1440px/);
    expect(m![1]).toMatch(/var\(--page-pad\)/);
  });

  it('declares .grid-12 (12-col grid)', () => {
    const css = globals();
    expect(css).toMatch(/\.grid-12\s*\{/);
    const m = css.match(/\.grid-12\s*\{([\s\S]*?)\}/);
    expect(m![1]).toMatch(/repeat\(12/);
  });

  it('declares col-span helpers (.col-span-{4,5,6,7,8,12})', () => {
    const css = globals();
    expect(css).toMatch(/\.col-span-4\s*\{/);
    expect(css).toMatch(/\.col-span-5\s*\{/);
    expect(css).toMatch(/\.col-span-6\s*\{/);
    expect(css).toMatch(/\.col-span-7\s*\{/);
    expect(css).toMatch(/\.col-span-8\s*\{/);
    expect(css).toMatch(/\.col-span-12\s*\{/);
  });

  it('declares section padding-block 88px (default) + .tight 48px', () => {
    const css = globals();
    expect(css).toMatch(/section\s*\{[^}]*padding-block\s*:\s*88px/);
    expect(css).toMatch(/section\.tight\s*\{[^}]*padding-block\s*:\s*48px/);
  });
});

// ---------------------------------------------------------------------------
// 9. Animations — pulse, blink, marquee
// ---------------------------------------------------------------------------

describe('M-L10.2 — animation primitives', () => {
  it('.pulse-dot uses @keyframes pulse', () => {
    const css = globals();
    expect(css).toMatch(/\.pulse-dot\s*\{/);
    expect(css).toMatch(/@keyframes\s+pulse\s*\{/);
  });

  it('.blink uses @keyframes blink', () => {
    const css = globals();
    expect(css).toMatch(/\.blink\s*\{/);
    expect(css).toMatch(/@keyframes\s+blink\s*\{/);
  });

  it('.marquee + .marquee-track + @keyframes marquee', () => {
    const css = globals();
    expect(css).toMatch(/\.marquee\s*\{/);
    expect(css).toMatch(/\.marquee-track\s*\{/);
    expect(css).toMatch(/@keyframes\s+marquee\s*\{/);
  });

  it('.marquee-track translates X(0) → translateX(-50%) for seamless loop', () => {
    const css = globals();
    const m = css.match(/@keyframes\s+marquee\s*\{([\s\S]*?)\}\s*(?:\.|@|$)/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/translateX\(0/);
    expect(m![1]).toMatch(/translateX\(-50%/);
  });
});

// ---------------------------------------------------------------------------
// 10. Reveal-on-scroll + reduced-motion respect
// ---------------------------------------------------------------------------

describe('M-L10.2 — reveal-on-scroll + reduced-motion', () => {
  it('declares .reveal + .reveal.in', () => {
    const css = globals();
    expect(css).toMatch(/\.reveal\s*\{/);
    expect(css).toMatch(/\.reveal\.in\s*\{/);
  });

  it('declares .hand + .hand.soft (universal sketchy border helper)', () => {
    const css = globals();
    expect(css).toMatch(/\.hand\s*\{/);
    expect(css).toMatch(/\.hand\.soft\s*\{/);
  });

  it('honors [data-motion="off"] for reduced-motion overrides', () => {
    const css = globals();
    expect(css).toMatch(/\[data-motion=["']off["']\]/);
  });
});

// ---------------------------------------------------------------------------
// 11. Architectural enforcement — no leakage of M-L9 era hardcoded hex on body
// ---------------------------------------------------------------------------

describe('M-L10.2 — architectural invariants', () => {
  it('body block does NOT contain hardcoded hex (#xxxxxx) — must use var()', () => {
    const css = globals();
    const m = css.match(/(?:^|\})\s*body\s*\{([\s\S]*?)\}/);
    expect(m).not.toBeNull();
    const body = m![1];
    // Strip out url() data: SVG noise (which includes hex inside data-URI legitimately)
    const stripped = body.replace(/url\([^)]*\)/g, '');
    expect(stripped).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(stripped).not.toMatch(/#[0-9a-fA-F]{3}\b/);
  });

  it('globals.css imports tailwindcss (kept from foundation)', () => {
    expect(globals()).toMatch(/@import\s+['"]tailwindcss['"]/);
  });

  it('globals.css does NOT use prefers-color-scheme media query (theme via data-theme attr only)', () => {
    expect(globals()).not.toMatch(/@media\s*\(\s*prefers-color-scheme/);
  });

  it('layout.tsx applies font CSS variable classes to <html> element', () => {
    const tsx = layout();
    // Either explicit className on html with font.variable, or className with template literal
    expect(tsx).toMatch(/<html[^>]*className=/);
  });

  it('body uses font-family variable, NOT direct \'Geist\' string (M-L9 leftover)', () => {
    const css = globals();
    const m = css.match(/(?:^|\})\s*body\s*\{([\s\S]*?)\}/);
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/['"]Geist['"]/);
  });
});
