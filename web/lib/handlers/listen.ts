// Read-only listening for a family member: with the call's view key, a token that can only
// subscribe (RtcRole.SUBSCRIBER), so the listener hears the call but can never speak into it.
import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { canView } from '../capability';

export async function GET(request: NextRequest) {
  const session = request.nextUrl.searchParams.get('session') ?? '';
  if (!/^[\w-]{1,64}$/.test(session) || !canView(session, request.nextUrl.searchParams.get('key'))) {
    return NextResponse.json({ error: 'not your call' }, { status: 403 });
  }
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID, cert = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!appId || !cert) return NextResponse.json({ error: 'agora not configured' }, { status: 500 });
  const uid = 90000 + Math.floor(Math.random() * 9999);
  const exp = Math.floor(Date.now() / 1000) + 1800;
  const token = RtcTokenBuilder.buildTokenWithUid(appId, cert, session, uid, RtcRole.SUBSCRIBER, exp, exp);
  return NextResponse.json({ appId, channel: session, uid, token });
}
