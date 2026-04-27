// M-Q4 — Drift-guard for context-budget enforcement.
//
// Verifies architect's fixes stay in place:
//   1. Heavy rule frontmatter globs are narrow (engineering-principles +
//      coding-standards-checklist + architect-protocol)
//   2. startup-protocol.md Step 2 + Step 5 use grep / head, role-conditional
//      (dev-agents narrow read; architect/reviewer full read)
//   3. EXTRACTED.md design tokens summary exists (saves frontend-dev from
//      reading 3300 lines of raw CSS)
//   4. 4 mini-milestones M-L10.{2,3,4,5} exist (small per-phase scope)
//   5. Rule files don't reference specific milestone IDs in frontmatter
//      (timeless principle, not changelog)

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = (...parts: string[]) => resolve(__dirname, '..', ...parts);
const readFile = (p: string) => readFileSync(root(p), 'utf8');

// ---------------------------------------------------------------------------
// 1. Heavy rules have narrow globs (not auto-injected on every dev session)
// ---------------------------------------------------------------------------

describe('M-Q4 — heavy rules narrow globs', () => {
  it('engineering-principles.md globs are NOT broad **/*', () => {
    const content = readFile('.claude/rules/engineering-principles.md');
    // Extract the globs line from frontmatter
    const m = content.match(/^globs:\s*(\[.*?\])/m);
    expect(m).not.toBeNull();
    const globs = m![1];
    // Must not contain catch-all "**/*" or "**/*.{ts,tsx,js,cjs,rs}"
    expect(globs).not.toMatch(/"\*\*\/\*"/);
    expect(globs).not.toMatch(/"\*\*\/\*\.{ts,tsx,js,cjs,rs}"/);
    // Should target architect-zone (packages/{types,…} OR docs/sprints,feature-areas)
    expect(globs).toMatch(/packages\/{types|docs\/sprints|docs\/feature-areas/);
  });

  it('coding-standards-checklist.md globs are NOT **/*', () => {
    const content = readFile('.claude/rules/coding-standards-checklist.md');
    const m = content.match(/^globs:\s*(\[.*?\])/m);
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/"\*\*\/\*"/);
  });

  it('architect-protocol.md globs target architect-zone files only', () => {
    const content = readFile('.claude/rules/architect-protocol.md');
    const m = content.match(/^globs:\s*(\[.*?\])/m);
    expect(m).not.toBeNull();
    const globs = m![1];
    // Must not match all .md files (used to be "docs/**/*.md")
    expect(globs).not.toMatch(/"docs\/\*\*\/\*\.md"/);
    // Must target sprints/feature-areas specifically
    expect(globs).toMatch(/docs\/sprints\/\*\*\/\*\.md|docs\/feature-areas/);
  });

  // M-Q5 follow-up: 3 more heavy rules narrowed to architect-zone.
  // Symptom: backend-dev was still hitting compaction loop after M-Q4 because
  // architecture.md (14 KB) + workflow.md (12 KB) + code-style.md (11 KB) had
  // broad globs (apps/**/*, products/**/*, packages/**/*) and auto-injected
  // 37 KB on EVERY backend-dev open of any TS/CJS file.
  // Fix: narrow these 3 to architect-zone (packages/{types,...}/, docs/sprints/,
  // docs/feature-areas/). Devs use domain-specific replacements which already
  // cover the relevant subset (backend-architecture.md, backend-code-style.md,
  // frontend-rules.md, rust-*.md).

  it('architecture.md globs are NOT broad apps/**/products/**', () => {
    const content = readFile('.claude/rules/architecture.md');
    const m = content.match(/^globs:\s*(\[.*?\])/m);
    expect(m).not.toBeNull();
    const globs = m![1];
    expect(globs).not.toMatch(/"apps\/\*\*\/\*\.{ts,tsx,cjs,js}"/);
    expect(globs).not.toMatch(/"products\/\*\*\/\*\.{ts,js,rs}"/);
    expect(globs).toMatch(/packages\/{types|docs\/sprints|docs\/feature-areas/);
  });

  it('workflow.md globs are NOT broad apps/**/products/**', () => {
    const content = readFile('.claude/rules/workflow.md');
    const m = content.match(/^globs:\s*(\[.*?\])/m);
    expect(m).not.toBeNull();
    const globs = m![1];
    expect(globs).not.toMatch(/"apps\/\*\*\/\*\.{ts,tsx,cjs,js}"/);
    expect(globs).not.toMatch(/"products\/\*\*\/\*\.{ts,js,rs}"/);
    expect(globs).toMatch(/docs\/sprints|docs\/feature-areas|scripts\/verify_/);
  });

  it('code-style.md globs are NOT broad apps/**/products/**', () => {
    const content = readFile('.claude/rules/code-style.md');
    const m = content.match(/^globs:\s*(\[.*?\])/m);
    expect(m).not.toBeNull();
    const globs = m![1];
    expect(globs).not.toMatch(/"apps\/\*\*\/\*\.{ts,tsx,cjs,js}"/);
    expect(globs).not.toMatch(/"products\/\*\*\/\*\.{ts,js,rs}"/);
    expect(globs).toMatch(/packages\/{types|docs\/sprints|docs\/feature-areas/);
  });
});

// ---------------------------------------------------------------------------
// 2. Rule frontmatter is timeless (no specific milestone refs)
// ---------------------------------------------------------------------------

describe('M-Q4 — rule frontmatter is timeless', () => {
  const heavyRules = [
    'engineering-principles.md',
    'coding-standards-checklist.md',
    'architect-protocol.md',
    // M-Q5 — additional rules narrowed to architect-zone
    'architecture.md',
    'workflow.md',
    'code-style.md',
  ];

  for (const rule of heavyRules) {
    it(`${rule} frontmatter has no specific milestone IDs (M-Q4, M-L10, etc.)`, () => {
      const content = readFile(`.claude/rules/${rule}`);
      // Extract frontmatter (between --- markers)
      const fm = content.match(/^---\n([\s\S]*?)\n---/);
      expect(fm).not.toBeNull();
      const frontmatter = fm![1];
      // Frontmatter MUST NOT mention specific milestone codes like
      // "M-Q4", "M-L10", "M-L1-launch", "TD-NN" — those belong in commit
      // messages and milestone docs, not in timeless rule frontmatter
      expect(frontmatter).not.toMatch(/M-Q\d+/);
      expect(frontmatter).not.toMatch(/M-L\d+/);
      expect(frontmatter).not.toMatch(/TD-\d+/);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. startup-protocol Step 2 + Step 5 are role-conditional with grep/head
// ---------------------------------------------------------------------------

describe('M-Q4 — startup-protocol Step 2 + 5 are role-conditional', () => {
  const readProtocol = () => readFile('.claude/rules/startup-protocol.md');

  it('Step 2 (tech-debt) tells dev-agents to use grep, NOT cat full file', () => {
    const content = readProtocol();
    expect(content).toMatch(/grep -E '🔴 OPEN'/);
    expect(content).toMatch(/НЕ читай.*tech-debt\.md.*целиком|НЕ читай.*docs\/tech-debt/);
  });

  it('Step 2 distinguishes architect/reviewer (full read) from dev (grep)', () => {
    const content = readProtocol();
    // Must mention BOTH branches: dev-agents narrow + architect/reviewer full
    expect(content).toMatch(/dev-агент/i);
    expect(content).toMatch(/architect.*или.*reviewer|architect.*reviewer/i);
    // Architect/reviewer branch must say "целиком" (read full)
    const protocolText = content;
    const archReviewerSection = protocolText.match(
      /architect.*или.*reviewer[\s\S]{0,400}целиком/i,
    );
    expect(archReviewerSection).not.toBeNull();
  });

  it('Step 5 (project-state) tells dev-agents to head -60, NOT cat full', () => {
    const content = readProtocol();
    expect(content).toMatch(/head -60 docs\/project-state\.md/);
  });

  it('Step 5 distinguishes architect/reviewer (full read) from dev (head)', () => {
    const content = readProtocol();
    // Find Step 5 region and look for both branches
    const step5Idx = content.search(/^Step 5:/m);
    const step6Idx = content.search(/^Step 6:/m);
    expect(step5Idx).toBeGreaterThan(0);
    expect(step6Idx).toBeGreaterThan(step5Idx);
    const step5Text = content.slice(step5Idx, step6Idx);
    expect(step5Text).toMatch(/dev-агент/i);
    expect(step5Text).toMatch(/architect.*reviewer/i);
    expect(step5Text).toMatch(/целиком/);
  });

  it('startup-protocol Step 2 + 5 do NOT contain milestone IDs', () => {
    const content = readProtocol();
    // Step 2 + Step 5 ONLY (Step 0 has M-Q3 which is intentional history note —
    // actually no, it had been there. Let's tighten: full file should not have
    // milestone refs in Step 2/5 instructions specifically)
    const step2Start = content.search(/^Step 2:/m);
    const step6Start = content.search(/^Step 6:/m);
    const step25Region = content.slice(step2Start, step6Start);
    expect(step25Region).not.toMatch(/M-Q\d+/);
    expect(step25Region).not.toMatch(/M-L\d+/);
  });
});

// ---------------------------------------------------------------------------
// 4. EXTRACTED.md design tokens summary
// ---------------------------------------------------------------------------

describe('M-Q4 — design tokens EXTRACTED.md', () => {
  it('docs/design/paxio-b5/EXTRACTED.md exists', () => {
    expect(() => statSync(root('docs/design/paxio-b5/EXTRACTED.md'))).not.toThrow();
  });

  it('lists key CSS variables (paper-0..3, ink-0..4, gold, gold-bright)', () => {
    const content = readFile('docs/design/paxio-b5/EXTRACTED.md');
    expect(content).toMatch(/--paper-0/);
    expect(content).toMatch(/--paper-1/);
    expect(content).toMatch(/--ink-0/);
    expect(content).toMatch(/--gold/);
    expect(content).toMatch(/--gold-bright/);
  });

  it('shows both light + dark theme blocks', () => {
    const content = readFile('docs/design/paxio-b5/EXTRACTED.md');
    expect(content).toMatch(/Light theme|light theme/);
    expect(content).toMatch(/Dark theme|dark theme/);
    expect(content).toMatch(/data-theme="dark"/);
  });

  it('mentions all 3 Google Fonts (Fraunces / Inter Tight / JetBrains Mono)', () => {
    const content = readFile('docs/design/paxio-b5/EXTRACTED.md');
    expect(content).toMatch(/Fraunces/);
    expect(content).toMatch(/Inter Tight/);
    expect(content).toMatch(/JetBrains Mono/);
  });

  it('describes core component contracts (.btn, .panel, .marquee, .ticker-stack)', () => {
    const content = readFile('docs/design/paxio-b5/EXTRACTED.md');
    expect(content).toMatch(/\.btn/);
    expect(content).toMatch(/\.panel/);
    expect(content).toMatch(/\.marquee/);
    expect(content).toMatch(/\.ticker-stack/);
  });

  it('is significantly shorter than raw CSS (under 30 KB)', () => {
    const stats = statSync(root('docs/design/paxio-b5/EXTRACTED.md'));
    expect(stats.size).toBeLessThan(30 * 1024);
  });
});

// ---------------------------------------------------------------------------
// 5. 4 mini-milestones for M-L10 phases 2-5
// ---------------------------------------------------------------------------

describe('M-Q4 — 4 mini-milestones for M-L10 phases', () => {
  const phases = [
    { id: 'M-L10.2', topic: 'css', file: 'M-L10.2-css-tokens.md' },
    { id: 'M-L10.3', topic: 'shell', file: 'M-L10.3-shell-components.md' },
    { id: 'M-L10.4', topic: 'hero', file: 'M-L10.4-hero.md' },
    { id: 'M-L10.5', topic: 'scroll', file: 'M-L10.5-scrolls-wiring.md' },
  ];

  for (const { id, topic, file } of phases) {
    it(`docs/sprints/${file} exists`, () => {
      expect(() => statSync(root(`docs/sprints/${file}`))).not.toThrow();
    });

    it(`${id} has thin promt block (≤60 lines fenced)`, () => {
      const content = readFile(`docs/sprints/${file}`);
      // Find the promt code block — `Промт для frontend-dev` section
      expect(content).toMatch(/Промт для frontend-dev/i);
      // Extract the first ``` block after that header
      const idx = content.search(/Промт для frontend-dev/i);
      const after = content.slice(idx);
      const block = after.match(/```\n?([\s\S]*?)```/);
      expect(block).not.toBeNull();
      const lines = block![1].split('\n').length;
      expect(lines).toBeLessThanOrEqual(60); // thin promt — context budget
    });

    it(`${id} mentions ${topic}-related work`, () => {
      const content = readFile(`docs/sprints/${file}`);
      expect(content.toLowerCase()).toContain(topic);
    });
  }
});

// ---------------------------------------------------------------------------
// 6. M-Q4 milestone doc + acceptance script
// ---------------------------------------------------------------------------

describe('M-Q4 milestone doc + acceptance', () => {
  it('docs/sprints/M-Q4-context-budget.md exists', () => {
    expect(() =>
      statSync(root('docs/sprints/M-Q4-context-budget.md')),
    ).not.toThrow();
  });

  it('scripts/verify_M-Q4.sh exists + executable', () => {
    const stat = statSync(root('scripts/verify_M-Q4.sh'));
    expect(stat.mode & 0o100).toBeGreaterThan(0); // owner-execute bit
  });
});
