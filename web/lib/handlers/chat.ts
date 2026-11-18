import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createLlmRoute } from '@/lib/llm-route';
import { complaintTools } from '@/lib/complaint/tools';
import { complaintSystem } from '@/lib/complaint/prompt';
import { getComplaint } from '@/lib/complaint/store';
import { addFlag } from '@/lib/complaint/session';
import { guardShortcut } from '@/lib/complaint/redflags';
import { complaintShortcut, guardHandover } from '@/lib/complaint/fastpath';
import { READBACK_LANGS, spokenToDigits, type ReadbackLang } from '@/lib/entities/numbers';

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const POST = createLlmRoute({
  secret: process.env.LLM_SHARED_SECRET,
  model: anthropic(process.env.LLM_MODEL ?? 'claude-haiku-5-5'),
  streamTextImpl: streamText,
  tools: complaintTools,
  system: (session) => complaintSystem(session),
  shortcut: (session, lastUser) => {
    const c = getComplaint(session);
    const before = `${c.phase}/${c.pending ?? '-'}/buf${(c.digitBuffer ?? '').length}`;
    const out = guardHandover(c, lastUser) ?? guardShortcut(c, lastUser) ?? complaintShortcut(c, lastUser);
    // Turn decisions for debugging, only with DEBUG_TURNS=1; never the caller's words.
    if (process.env.DEBUG_TURNS === '1') {
      const kind = out === null ? 'model' : out === '<silent>' ? 'silent' : 'fast';
      const line = `${before} -> ${c.phase}/${c.pending ?? '-'}/buf${(c.digitBuffer ?? '').length} len${lastUser.length} digits${spokenToDigits(lastUser).length} ${kind} fields=${Object.entries(c.fields).map(([k, f]) => `${k}${f!.confirmed ? '+' : '?'}`).join(',')}`;
      (c.trace ??= []).push(line);
      console.log(`[turn] ${session.slice(-6)} ${line}`);
    }
    return out;
  },
  onMarker: (session, id, detail, lastUser) => {
    addFlag(getComplaint(session), id, detail, lastUser);
  },
  // lang and mode ride on the URL Agora calls, so a restarted instance rebuilds the session right.
  init: (session, q) => {
    const lang = q.get('lang') ?? '';
    getComplaint(
      session,
      (READBACK_LANGS as readonly string[]).includes(lang) ? (lang as ReadbackLang) : 'en',
      q.get('mode') === 'guard' ? 'guard' : 'complaint',
    );
  },
});
