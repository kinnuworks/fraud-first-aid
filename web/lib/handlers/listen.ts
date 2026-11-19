// Family on the call. With the view key: a token that can only subscribe (RtcRole.SUBSCRIBER), so
// they hear the call and can never speak into it. With the talk key the caller shared: a speaking
// token (RtcRole.PUBLISHER), so a son or daughter can talk to their parent during the call. The
// agent only processes the caller's own audio, so a family voice never becomes the complaint.
import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { canView, canTalk } from '../capability';

export async function GET(request: NextRequest) {
  const session = request.nextUrl.searchParams.get('session') ?? '';
  if (!/^[\w-]{1,64}$/.test(session) || !canView(session, request.nextUrl.searchParams.get('key'))) {
    return NextResponse.json({ error: 'not your call' }, { status: 403 });
  }
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID, cert = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!appId || !cert) return NextResponse.json({ error: 'agora not configured' }, { status: 500 });
  const canSpeak = canTalk(session, request.nextUrl.searchParams.get('key'));
  const uid = (canSpeak ? 80000 : 90000) + Math.floor(Math.random() * 9999);
  const exp = Math.floor(Date.now() / 1000) + 1800;
  const token = RtcTokenBuilder.buildTokenWithUid(appId, cert, session, uid, canSpeak ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER, exp, exp);
  return NextResponse.json({ appId, channel: session, uid, token, canSpeak });
}
