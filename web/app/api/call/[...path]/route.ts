// One function for everything that shares a call's complaint state (agent start, the model
// route Agora calls, and the screen's poll), so they run in the same server instance.
import { NextRequest, NextResponse } from 'next/server';
import { POST as inviteAgent } from '@/lib/handlers/invite-agent';
import { POST as chat } from '@/lib/handlers/chat';
import { GET as complaint } from '@/lib/handlers/complaint';
import { GET as listen } from '@/lib/handlers/listen';
import { POST as screenshot } from '@/lib/handlers/screenshot';
import { POST as stop } from '@/lib/handlers/stop';
import { POST as email } from '@/lib/handlers/email';
import { POST as phone } from '@/lib/handlers/phone';

type Ctx = { params: Promise<{ path: string[] }> };
const notFound = () => NextResponse.json({ error: 'not found' }, { status: 404 });

export async function POST(request: NextRequest, { params }: Ctx) {
  const path = (await params).path.join('/');
  if (path === 'invite-agent') return inviteAgent(request);
  if (path === 'chat/completions') return chat(request);
  if (path === 'screenshot') return screenshot(request);
  if (path === 'stop') return stop(request);
  if (path === 'email') return email(request);
  if (path === 'phone') return phone(request);
  return notFound();
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const path = (await params).path.join('/');
  if (path === 'complaint') return complaint(request);
  if (path === 'listen') return listen(request);
  return notFound();
}
