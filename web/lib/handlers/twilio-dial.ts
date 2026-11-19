import { NextRequest, NextResponse } from 'next/server';
import { validTwilioRequest, sipDialTarget, dialTwiml } from '@/lib/twilio-dial';

// Twilio calls this when Agora's SIP INVITE reaches our SIP domain. The signature check uses the
// public URL Twilio was configured with.
export async function POST(request: NextRequest) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  const callerId = process.env.TWILIO_PHONE_NUMBER;
  const base = process.env.LLM_PUBLIC_URL;
  if (!token || !callerId || !base) return NextResponse.json({ error: 'telephony not configured' }, { status: 500 });
  const params = Object.fromEntries(new URLSearchParams(await request.text())) as Record<string, string>;
  if (!validTwilioRequest(token, `${base}/api/call/twilio-dial`, params, request.headers.get('x-twilio-signature'))) {
    return NextResponse.json({ error: 'bad signature' }, { status: 403 });
  }
  const to = sipDialTarget(params.To ?? '');
  console.log('[twilio-dial]', to ? `dialling ${to.slice(0, 5)}…` : 'rejected target');
  return new NextResponse(dialTwiml(to, callerId), { headers: { 'content-type': 'text/xml' } });
}
