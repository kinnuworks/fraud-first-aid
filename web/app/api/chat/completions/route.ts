import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createLlmRoute } from '@/lib/llm-route';
import { complaintTools } from '@/lib/complaint/tools';
import { complaintSystem } from '@/lib/complaint/prompt';

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const POST = createLlmRoute({
  secret: process.env.LLM_SHARED_SECRET,
  model: anthropic(process.env.LLM_MODEL ?? 'claude-haiku-5-5'),
  streamTextImpl: streamText,
  tools: complaintTools,
  system: (session) => complaintSystem(session),
});
