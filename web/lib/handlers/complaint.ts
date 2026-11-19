// The complaint card on screen polls this: the fields so far for one call.
import { NextRequest, NextResponse } from 'next/server';
import { peekComplaint } from '@/lib/complaint/store';
import { missingFields, deadlines } from '@/lib/complaint/session';
import { buildPack } from '@/lib/complaint/pack';
import { istToday } from '@/lib/complaint/today';
import { checkCap } from '@/lib/capability';
import { compareWithScreenshot } from '@/lib/complaint/screenshot';

export function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('session') ?? '';
  if (!/^[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: 'bad session' }, { status: 400 });
  if (!checkCap(id, request.nextUrl.searchParams.get('cap'))) return NextResponse.json({ error: 'not your call' }, { status: 403 });
  const c = peekComplaint(id);
  if (!c) return NextResponse.json({ error: 'no such call' }, { status: 404 });
  return NextResponse.json({
    lang: c.lang,
    phase: c.phase,
    hasEmail: Boolean(c.email),
    emailSent: c.emailSent ?? null,
    ...(process.env.DEBUG_TURNS === '1' ? { trace: c.trace ?? [] } : {}),
    flags: c.flags,
    fields: c.fields,
    missing: missingFields(c),
    deadlines: c.fields.when ? deadlines(c.fields.when.value.slice(0, 10)) : null,
    check: c.shot ? compareWithScreenshot(c, c.shot) : null,
    pack: buildPack(c, istToday()),
  });
}
