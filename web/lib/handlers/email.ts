// POST /api/call/email?session=&cap=  {email, send?}: the caller's email for the pack; with
// send=true the pack goes out now (the on-screen button), otherwise the agent sends it on a yes.
import { NextRequest, NextResponse } from 'next/server';
import { checkCap } from '@/lib/capability';
import { peekComplaint, hydrate, persist } from '@/lib/complaint/store';
import { isEmail } from '@/lib/complaint/email';
import { sendPack } from '@/lib/complaint/send';
import { act } from '@/lib/complaint/session';
import { announce, ANNOUNCE } from '@/lib/complaint/announce';

export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('session') ?? '';
  if (!/^[\w-]{1,64}$/.test(id) || !checkCap(id, request.nextUrl.searchParams.get('cap'))) {
    return NextResponse.json({ error: 'not your call' }, { status: 403 });
  }
  await hydrate(id);
  const c = peekComplaint(id);
  if (!c) return NextResponse.json({ error: 'no such call' }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { email?: string; send?: boolean };
  const email = String(body.email ?? '').trim();
  if (!isEmail(email)) return NextResponse.json({ error: 'not an email address' }, { status: 400 });
  c.email = email;
  if (!body.send) {
    await persist(id);
    return NextResponse.json({ ok: true });
  }
  if (c.emailSent && 'id' in c.emailSent) return NextResponse.json({ ok: true, already: true });
  const sent = await sendPack(c);
  act(c, sent.ok ? 'done' : 'check', sent.ok ? 'You pressed Send: emailed the pack with the calendar reminders' : `Could not email the pack: ${sent.problem}`);
  // the agent confirms it aloud once it finishes what it's saying (Agora speak API, APPEND)
  if (sent.ok && (await announce(c, ANNOUNCE[c.lang].emailed, false))) act(c, 'tool', 'Told you aloud the pack was emailed (Agora speak)');
  await persist(id);
  return NextResponse.json(sent);
}
