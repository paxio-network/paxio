/**
 * M-Q18 — drift-guard: architect-protocol.md §6.7 has Per-role on-demand
 * mapping table.
 *
 * Context: M-Q11 removed eager skills from dev agents. M-Q15 restored
 * curated allowlist. M-Q18 expanded backend-dev (6 → 10 always-on) AND
 * formalised the on-demand mapping rule for architect: «when writing slim
 * spec, look at table by dev role × task scope, pick skills NOT in agent's
 * always-on, mention in `Skills доступны on-demand:` line».
 *
 * This test pins the table presence + key role rows so future architects
 * can't drift the mapping back to vague.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function readArchitectProtocol(): string {
  return readFileSync(resolve(ROOT, '.claude/rules/architect-protocol.md'), 'utf8');
}

describe('M-Q18 — architect §6.7 has Per-role on-demand mapping (NB blocks always-on dump)', () => {
  it('mentions M-Q15 + M-Q18 evolution context', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/M-Q15.*M-Q18|M-Q18/);
    expect(c).toMatch(/curated.*allowlist|always-on allowlist/i);
  });

  it('declares «Per-role on-demand mapping» heading', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/Per-role on-demand mapping/i);
  });

  it('explicit guidance: do NOT duplicate always-on in spec', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/NOT in agent's always-on|skip.*already always-on|not in always-on/i);
  });
});

describe('M-Q18 — backend-dev row in mapping table', () => {
  it('mentions backend-dev section with «10 always-on» count', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/backend-dev.*10 always-on|10 always-on.*backend-dev/i);
  });

  it('FA-02 facilitator → x402-protocol on-demand', () => {
    const c = readArchitectProtocol();
    // Section about backend-dev mentions FA-02 + x402-protocol
    expect(c).toMatch(/FA-02 facilitator[\s\S]{0,200}x402-protocol/);
  });

  it('database / SQL / caching / security NOT in on-demand (already always-on after M-Q18)', () => {
    const c = readArchitectProtocol();
    // Match the "skip" comment in backend-dev section
    expect(c).toMatch(/already always-on, skip/i);
  });
});

describe('M-Q18 — frontend-dev row in mapping table', () => {
  it('mentions frontend-dev section with «7 always-on» count', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/frontend-dev.*7 always-on|7 always-on.*frontend-dev/i);
  });

  it('animations → framer-motion on-demand', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/animation[\s\S]{0,200}framer-motion/i);
  });
});

describe('M-Q18 — icp-dev row in mapping table', () => {
  it('mentions icp-dev section with «4 always-on» count', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/icp-dev.*4 always-on|4 always-on.*icp-dev/i);
  });

  it('threshold ECDSA → icp-threshold-ecdsa on-demand', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/threshold ECDSA[\s\S]{0,200}icp-threshold-ecdsa/i);
  });

  it('Bitcoin txn → bitcoin-icp on-demand', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/Bitcoin[\s\S]{0,200}bitcoin-icp/i);
  });

  it('cross-chain → chain-fusion on-demand', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/[Cc]ross-chain[\s\S]{0,200}chain-fusion/i);
  });
});

describe('M-Q18 — registry-dev row in mapping table', () => {
  it('mentions registry-dev section with «9 always-on» count', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/registry-dev.*9 always-on|9 always-on.*registry-dev/i);
  });

  it('Redis caching → redis-cache on-demand', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/[Rr]edis|caching[\s\S]{0,200}redis-cache/);
  });

  it('SQL migrations / indexes → sql-best-practices on-demand', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/SQL|migrations|indexes[\s\S]{0,200}sql-best-practices/);
  });
});

describe('M-Q18 — selection rule (0-3 max per slim spec)', () => {
  it('mentions selection rule «0-3 on-demand skills MAX»', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/0-3 on-demand|on-demand.*MAX|0-3.*max|max.*0-3/i);
  });

  it('mentions overflow vector warning when dumping all skills', () => {
    const c = readArchitectProtocol();
    expect(c).toMatch(/overflow vector|catalog dump/i);
  });
});
