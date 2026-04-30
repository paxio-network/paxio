import { z } from 'zod';

// AgentFramework — какой framework/протокол agent использует (M-L1-taxonomy).
//
// Технологический классификатор: что под капотом. Отделён от `category`
// (что агент делает) и от `source` (где он зарегистрирован).
//
// Important: framework и source не collinear. Например LangChain agent
// может быть зарегистрирован в Smithery (source=mcp) или прямо в Paxio
// (source=paxio-native). ElizaOS agent почти всегда source=eliza, но
// может быть проиндексирован через ERC-8004 если задеплоен on-chain.

export const AGENT_FRAMEWORKS = [
  'langchain',
  'crewai',
  'autogen',
  'eliza',
  'llamaindex',
  'vercel-ai',
  'autogpt',
  'paxio-native',
  'custom', // proprietary / one-off implementation
  'unknown', // crawler couldn't determine
] as const;

export type AgentFramework = (typeof AGENT_FRAMEWORKS)[number];

export const ZodAgentFramework = z.enum(AGENT_FRAMEWORKS);
