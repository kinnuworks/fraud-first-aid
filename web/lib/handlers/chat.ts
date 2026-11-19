import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createLlmRoute } from '@/lib/llm-route';
import { complaintTools } from '@/lib/complaint/tools';
import { complaintSystem } from '@/lib/complaint/prompt';
import { getComplaint, hydrate, persist, hold, release } from '@/lib/complaint/store';
import { addFlag, logHeard } from '@/lib/complaint/session';
import { guardShortcut, saysHangUp } from '@/lib/complaint/redflags';
import { guardReported, reportOnce } from '@/lib/complaint/reported';
import { complaintShortcut, guardHandover, followLanguage } from '@/lib/complaint/fastpath';
import { READBACK_LANGS, spokenToDigits, type ReadbackLang } from '@/lib/entities/numbers';

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const POST = createLlmRoute({
  secret: process.env.LLM_SHARED_SECRET,
  model: anthropic(process.env.LLM_MODEL ?? 'claude-haiku-5-5'),
  streamTextImpl: streamText,
  tools: complaintTools,
  system: (session) => complaintSystem(session),
  shortcut: async (session, lastUser) => {
    const c = getComplaint(session);
    followLanguage(c, lastUser);
    // on guard, keep the scam call itself as evidence for the pack
    logHeard(c, lastUser);
    const before = `${c.phase}/${c.pending ?? '-'}/buf${(c.digitBuffer ?? '').length}`;
    // a UPI ID already named in an earlier complaint is the most specific warning, so it goes first
    const out = guardHandover(c, lastUser) ?? (await guardReported(c, lastUser)) ?? guardShortcut(c, lastUser) ?? complaintShortcut(c, lastUser);
    // Turn decisions for debugging, only with DEBUG_TURNS=1; never the caller's words.
    if (process.env.DEBUG_TURNS === '1') {
      const kind = out === null ? 'model' : out === '<silent>' ? 'silent' : 'fast';
      const line = `${before} -> ${c.phase}/${c.pending ?? '-'}/buf${(c.digitBuffer ?? '').length} len${lastUser.length} digits${spokenToDigits(lastUser).length} ${kind} fields=${Object.entries(c.fields).map(([k, f]) => `${k}${f!.confirmed ? '+' : '?'}`).join(',')}`;
      (c.trace ??= []).push(line);
      console.log(`[turn] ${session.slice(-6)} ${line}`);
    }
    return out;
  },
  // Load the call, then hold it while this turn's tools change it, so the card's poll can't load
  // an older copy over it (full-flow run, 20 Nov).
  load: async (session) => {
    const seen = await hydrate(session);
    hold(session);
    return seen;
  },
  save: async (session, seen) => {
    // a confirmed complaint counts its payee for the next caller's guard (a hash, once per call)
    await reportOnce(getComplaint(session));
    await persist(session, seen).finally(() => release(session));
  },
  // The guard warned aloud but wrote no marker: the warning still goes on the card (guard break test, 19 Nov).
  onReply: (session, spoken, lastUser) => {
    const c = getComplaint(session);
    // only a reply that tells them to hang up counts as a warning (not an answer to a question)
    if (c.phase === 'guard' && c.flags.length === 0 && saysHangUp(spoken)) addFlag(c, 'suspicious_call', 'pushed for action on the call, and Fraud First Aid told the user to hang up', lastUser);
  },
  onMarker: (session, id, detail, lastUser) => {
    addFlag(getComplaint(session), id, detail, lastUser);
  },
  // lang and mode ride on the URL Agora calls, so a restarted instance rebuilds the session right.
  init: (session, q) => {
    const lang = q.get('lang') ?? '';
    const c = getComplaint(
      session,
      (READBACK_LANGS as readonly string[]).includes(lang) ? (lang as ReadbackLang) : 'en',
      q.get('mode') === 'guard' ? 'guard' : 'complaint',
    );
    if (lang === 'auto') c.autoLang = true;
  },
});
