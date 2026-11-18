// The complaint card on screen polls this: the fields so far for one call.
import { NextRequest, NextResponse } from 'next/server';
import { peekComplaint } from '@/lib/complaint/store';
import { missingFields, deadlines } from '@/lib/complaint/session';
import { buildPack } from '@/lib/complaint/pack';

export function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('session') ?? '';
  if (!/^[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: 'bad session' }, { status: 400 });
  const c = peekComplaint(id);
  if (!c) return NextResponse.json({ error: 'no such call' }, { status: 404 });
  return NextResponse.json({
    lang: c.lang,
    fields: c.fields,
    missing: missingFields(c),
    deadlines: c.fields.when ? deadlines(c.fields.when.value.slice(0, 10)) : null,
    pack: buildPack(c, new Date().toISOString().slice(0, 10)),
  });
}
