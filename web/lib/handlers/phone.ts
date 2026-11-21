// POST /api/call/phone?session=&cap=  {to, lang, mode}: Fraud First Aid rings the caller's Indian mobile
// through Agora telephony (Twilio SIP trunk) and runs the same agent and complaint tools as the
// web call; the browser follows the call live on the complaint card.
import { NextRequest, NextResponse } from 'next/server';
import { AgoraClient, Area, ExpiresIn, generateRtcToken, generateConvoAIToken } from 'agora-agents';
import { checkCap } from '@/lib/capability';
import { presetFor } from '@/lib/agent-config';
import { buildAgent } from '@/lib/agent-builder';
import { startComplaint, getComplaint, persist } from '@/lib/complaint/store';
import { claimChannel, setAgent, releaseChannel } from '@/lib/handlers/agents';
import { indianMobile, CallLimiter, mayCall, phoneMode, guardPhoneGreeting } from '@/lib/phone';
import { act } from '@/lib/complaint/session';
import { READBACK_LANGS, type ReadbackLang } from '@/lib/entities/numbers';
import { agentUidFor } from '@/lib/agora';
import { allowStart, clientAddress } from '@/lib/ratelimit';

const limiter = new CallLimiter(Number(process.env.PHONE_CALLS_PER_HOUR ?? 20));
const SIP_UID = 7001; // the phone line's participant in the call's channel

export function agoraRestClient(appId: string, appCertificate: string) {
  const id = process.env.AGORA_CUSTOMER_ID, secret = process.env.AGORA_CUSTOMER_SECRET;
  return id && secret
    ? new AgoraClient({ area: Area.US, appId, appCertificate, customerId: id, customerSecret: secret })
    : new AgoraClient({ area: Area.US, appId, appCertificate, authToken: generateConvoAIToken({ appId, appCertificate, channelName: 'utr-pakka-rest', uid: 0, tokenExpire: 600 }) });
}

export async function POST(request: NextRequest) {
  // Off unless PHONE_CALLS_ENABLED=1, and limited to PHONE_ALLOWED_NUMBERS when that is set: calling
  // a number someone types would let them ring any mobile (security pass, 20 Nov).
  if (process.env.PHONE_CALLS_ENABLED !== '1') {
    return NextResponse.json({ error: 'Calls to your phone are paused for now. Open this page on your phone instead: it works the same in the browser.' }, { status: 503 });
  }
  const channel = request.nextUrl.searchParams.get('session') ?? '';
  if (!/^[\w-]{1,64}$/.test(channel) || !checkCap(channel, request.nextUrl.searchParams.get('cap'))) {
    return NextResponse.json({ error: 'not your call' }, { status: 403 });
  }
  // a phone call costs money too: the same limit as starting a call in the browser
  if (!(await allowStart(clientAddress(request.headers)))) {
    return NextResponse.json({ error: 'Too many calls started from here. Please wait a few minutes and try again, or call 1930 directly.' }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { to?: string; lang?: string; mode?: string };
  const to = indianMobile(String(body.to ?? ''));
  if (!to) return NextResponse.json({ error: 'enter an Indian mobile number' }, { status: 400 });
  if (!mayCall(to, process.env.PHONE_ALLOWED_NUMBERS)) {
    return NextResponse.json({ error: "Today it rings only the presenter's phone, so it can't be used to call a stranger. Scan the code to try it in your phone's browser." }, { status: 403 });
  }
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID, appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  const from = process.env.TWILIO_PHONE_NUMBER, llmUrl = process.env.LLM_PUBLIC_URL;
  if (!appId || !appCertificate || !from || !llmUrl) return NextResponse.json({ error: 'phone calls are not set up' }, { status: 500 });
  if (!limiter.take(to)) return NextResponse.json({ error: 'a call to this number is already running, or too many calls this hour' }, { status: 429 });
  if (!claimChannel(channel)) {
    limiter.end(to);
    return NextResponse.json({ error: 'an agent is already running for this call' }, { status: 409 });
  }
  const langArg = body.lang ?? 'te';
  const lang: ReadbackLang = (READBACK_LANGS as readonly string[]).includes(langArg) ? (langArg as ReadbackLang) : 'en';
  // the complaint, which greets the person it rings; or, only with an allowlist (the presenter's phone),
  // the guard, which says who it is and asks to be merged into the call: never a silent guard on a stranger
  const mode = phoneMode(body.mode, process.env.PHONE_ALLOWED_NUMBERS);
  startComplaint(channel, lang, mode);
  if (langArg === 'auto') getComplaint(channel).autoLang = true;
  if (mode === 'guard')
    act(getComplaint(channel), 'heard', 'Listening on your phone call through an Agora voice agent that stays silent until the caller asks for a code, a scan or money');
  await persist(channel);
  try {
    const client = agoraRestClient(appId, appCertificate);
    const agent = buildAgent({
      client,
      preset: presetFor(langArg),
      lang,
      langArg,
      mode,
      channel,
      llmUrl,
      surface: 'phone',
      ...(mode === 'guard' ? { greeting: guardPhoneGreeting(lang) } : {}),
    });
    const properties = agent.toProperties({
      channel,
      agentUid: agentUidFor(channel),
      remoteUids: [String(SIP_UID)],
      idleTimeout: 30,
      appId,
      appCertificate,
      expiresIn: ExpiresIn.minutes(20),
    });
    const rtc_token = generateRtcToken({ appId, appCertificate, channel, uid: SIP_UID, expirySeconds: 1200 });
    const r = await client.telephony.call({
      appid: appId,
      name: `firstaid-${channel.slice(-12)}`,
      sip: { to_number: to, from_number: from, rtc_uid: String(SIP_UID), rtc_token },
      properties,
    } as never);
    const agentId = (r as { agent_id?: string }).agent_id ?? '';
    setAgent(channel, agentId);
    return NextResponse.json({ ok: true, agent_id: agentId });
  } catch (e) {
    releaseChannel(channel);
    limiter.end(to);
    console.error('[phone] call failed:', (e as Error).message?.split('\n')[0]);
    return NextResponse.json({ error: 'the call could not be placed' }, { status: 502 });
  }
}
