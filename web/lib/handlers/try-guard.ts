// POST /api/call/try-guard: the "Try to fool the guard" box on /proof. A judge types the lines of a
// call; each line goes through the same model route the live agent uses (in guard mode, in the chosen
// language), one at a time, exactly as Agora would send them, and the reply and any red flag come
// back. Nothing is spoken and no agent starts. Rate-limited; nothing is kept beyond the call store's
// two hours.
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { POST as chat } from '@/lib/handlers/chat';
import { peekComplaint } from '@/lib/complaint/store';
import { scamById } from '@/lib/complaint/scams';
import { saysHangUp } from '@/lib/complaint/redflags';
import { READBACK_LANGS } from '@/lib/entities/numbers';
import { allowTry, clientAddress } from '@/lib/ratelimit';

const MAX_LINES = 8;
const MAX_CHARS = 300;

export async function POST(request: NextRequest) {
  if (!(await allowTry(clientAddress(request.headers)))) {
    return NextResponse.json({ error: 'Too many tries from here. Please wait a few minutes.' }, { status: 429 });
  }
  const secret = process.env.LLM_SHARED_SECRET;
  if (!secret) return NextResponse.json({ error: 'The guard is not configured here.' }, { status: 500 });
  const body = (await request.json().catch(() => ({}))) as { lines?: unknown; lang?: unknown };
  const lang = typeof body.lang === 'string' && (READBACK_LANGS as readonly string[]).includes(body.lang) ? body.lang : 'en';
  const lines = (Array.isArray(body.lines) ? body.lines : [])
    .filter((l): l is string => typeof l === 'string')
    .map((l) => l.trim().slice(0, MAX_CHARS))
    .filter(Boolean)
    .slice(0, MAX_LINES);
  if (!lines.length) return NextResponse.json({ error: 'Type at least one line of the call.' }, { status: 400 });

  const session = `try-${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const origin = request.nextUrl.origin;
  const messages: Array<{ role: string; content: string }> = [];
  const turns: Array<{ line: string; reply: string; warned: boolean }> = [];
  for (const line of lines) {
    messages.push({ role: 'user', content: line });
    // the same route Agora calls during a live call, with the same shared secret
    const res = await chat(
      new NextRequest(`${origin}/api/call/chat/completions?session=${session}&lang=${lang}&mode=guard`, {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
        body: JSON.stringify({ messages }),
      }),
    );
    if (!res.ok) return NextResponse.json({ error: 'The guard could not answer just now. Try again.' }, { status: 502 });
    const reply = (await res.text())
      .split('\n\n')
      .filter((l) => l.startsWith('data: {'))
      .map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '')
      .join('')
      .trim();
    messages.push({ role: 'assistant', content: reply });
    const c = peekComplaint(session);
    const warned = (c?.flags.length ?? 0) > 0 || saysHangUp(reply);
    turns.push({ line, reply, warned });
    if (warned || c?.phase === 'complaint') break;
  }
  const c = peekComplaint(session);
  return NextResponse.json({
    lang,
    turns,
    warned: turns.some((t) => t.warned),
    handedOver: c?.phase === 'complaint',
    scams: (c?.flags ?? []).map((f) => ({ name: scamById(f.scam)?.name ?? f.scam, what: f.red_flag, official: scamById(f.scam)?.official ?? null, source: scamById(f.scam)?.source ?? null, url: scamById(f.scam)?.url ?? null })),
  });
}
