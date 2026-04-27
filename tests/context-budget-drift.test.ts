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

describe('heavy rules — manual-load only (globs: [])', () => {
  // Heavy reference rules (>10 KB) are manual-load only. globs: [] forces
  // architect / reviewer to Read explicitly via instructions in their agent
  // definition. Devs never see these — they have domain-specific replacements
  // (backend-code-style, frontend-rules, rust-*) auto-loading on narrow globs.
  //
  // Earlier narrow-to-architect-zone attempts ALSO included docs/sprints/ and
  // docs/feature-areas/, which devs read on startup → still triggered 114 KB
  // auto-load → compaction loop. globs: [] is the only correct answer.

  const heavyRules = [
    'engineering-principles.md',
    'coding-standards-checklist.md',
    'architect-protocol.md',
    'architecture.md',
    'workflow.md',
    'code-style.md',
  ];

  for (const rule of heavyRules) {
    it(`${rule} has empty globs (manual-load only)`, () => {
      const content = readFile(`.claude/rules/${rule}`);
      const m = content.match(/^globs:\s*(\[.*?\])/m);
      expect(m).not.toBeNull();
      // Must be empty array — no patterns at all
      expect(m![1].replace(/\s/g, '')).toBe('[]');
    });
  }
});

describe('heavy rules — agent definitions Read them explicitly', () => {
  const heavyRules = [
    'architect-protocol.md',
    'coding-standards-checklist.md',
    'engineering-principles.md',
    'architecture.md',
    'workflow.md',
    'code-style.md',
  ];

  for (const rule of heavyRules) {
    it(`architect.md instructs Read ${rule}`, () => {
      const content = readFile('.claude/agents/architect.md');
      expect(content).toMatch(new RegExp(`Read \\.claude/rules/${rule.replace('.', '\\.')}`));
    });

    it(`reviewer.md instructs Read ${rule}`, () => {
      const content = readFile('.claude/agents/reviewer.md');
      expect(content).toMatch(new RegExp(`Read \\.claude/rules/${rule.replace('.', '\\.')}`));
    });
  }
});

describe('heavy rules — devs do NOT auto-load them', () => {
  // Regression-guard: if anyone re-adds globs to heavy rules, dev sessions
  // hit compaction loop. This test asserts neither sprint docs nor feature
  // areas nor any dev-zone path is in heavy rule globs.
  const devReadPaths = [
    'docs/sprints',
    'docs/feature-areas',
    'apps/',
    'products/',
    'packages/',
    'platform/',
    'tests/',
    'scripts/',
  ];
  const heavyRules = [
    'engineering-principles.md',
    'coding-standards-checklist.md',
    'architect-protocol.md',
    'architecture.md',
    'workflow.md',
    'code-style.md',
  ];

  for (const rule of heavyRules) {
    it(`${rule} globs do not include any dev-read path`, () => {
      const content = readFile(`.claude/rules/${rule}`);
      const m = content.match(/^globs:\s*(\[.*?\])/m);
      expect(m).not.toBeNull();
      const globs = m![1];
      for (const path of devReadPaths) {
        expect(globs).not.toContain(path);
      }
    });
  }
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
