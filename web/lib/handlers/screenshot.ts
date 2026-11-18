// POST /api/call/screenshot?session=<channel>: the caller's payment screenshot, read and
// compared with what they said.
import { NextRequest, NextResponse } from 'next/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { peekComplaint } from '@/lib/complaint/store';
import { readScreenshot } from '@/lib/complaint/vision';
import { compareWithScreenshot } from '@/lib/complaint/screenshot';

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('session') ?? '';
  const c = /^[\w-]{1,64}$/.test(id) ? peekComplaint(id) : undefined;
  if (!c) return NextResponse.json({ error: 'no such call' }, { status: 404 });
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'attach the screenshot as file' }, { status: 400 });
  if (!TYPES.includes(file.type)) return NextResponse.json({ error: 'PNG, JPEG or WebP only' }, { status: 415 });
  if (file.size > MAX) return NextResponse.json({ error: 'image over 5 MB' }, { status: 413 });
  const r = await readScreenshot(
    new Uint8Array(await file.arrayBuffer()),
    file.type,
    anthropic(process.env.VISION_MODEL ?? 'claude-sonnet-5-5'),
  );
  if (!r.ok) return NextResponse.json({ error: r.problem }, { status: 422 });
  c.shot = r.shot;
  return NextResponse.json({ shot: r.shot, check: compareWithScreenshot(c, r.shot) });
}
