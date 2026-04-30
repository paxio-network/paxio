import { z } from 'zod';

// AgentCategory — 11 domain-based categories (M-L1-taxonomy).
//
// Single criterion: «Категория = область в которой агент создаёт ценность,
// а не технический способ которым он это делает.» (FA-01 §4.1)
//
// Replaces the legacy `Capability` enum which mixed three different
// principles (industry / technical function / asset) and lived only inside
// Paxio's own 5-layer mental model. Real agentic ecosystem categorises
// by domain — this enum mirrors how Bloomberg / industry observers slice
// the agent universe.
//
// Bitcoin is NOT a category — it's an attribute (`wallet.status`,
// `payment.accepts`). Same logic for x402: filter, not category.

export const AGENT_CATEGORIES = [
  'Finance', // trading, DCA, portfolio, payments, invoice, payroll, yield, expense
  'Legal & Compliance', // contract review, EU AI Act, GDPR, KYA, regulatory, legal translation
  'Security', // OWASP scan, Guard, secrets detection, fraud, AML, threat modeling
  'Developer', // code review, CI/CD, GitHub, docs gen, dependency audit
  'Data & Research', // web search, data feeds, price oracles, market research, scraping
  'Infrastructure', // databases, cloud, monitoring, DevOps, storage
  'Productivity', // email, calendar, CRM, task management, workflow automation
  'AI & ML', // model training, eval, fine-tuning, prompt optimisation
  'Language', // translation, transcription, localisation, multilingual
  'Entertainment', // gaming NPCs, AI streamers, social media, virtual characters
  'Customer Experience', // tier-1 support, onboarding, feedback, chatbots
] as const;

export type AgentCategory = (typeof AGENT_CATEGORIES)[number];

export const ZodAgentCategory = z.enum(AGENT_CATEGORIES);
