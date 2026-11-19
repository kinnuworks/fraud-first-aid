// POST /api/call/phone?session=&cap=  {to, lang, mode}: UTR Pakka rings the caller's Indian mobile
// through Agora telephony (Twilio SIP trunk) and runs the same agent and complaint tools as the
// web call; the browser follows the call live on the complaint card.
import { NextRequest, NextResponse } from 'next/server';
import { AgoraClient, Area, ExpiresIn, generateRtcToken, generateConvoAIToken } from 'agora-agents';
import { checkCap } from '@/lib/capability';
import { presetFor } from '@/lib/agent-config';
import { buildAgent } from '@/lib/agent-builder';
import { startComplaint, getComplaint, persist } from '@/lib/complaint/store';
import { claimChannel, setAgent, releaseChannel } from '@/lib/handlers/agents';
import { indianMobile, CallLimiter } from '@/lib/phone';
import { READBACK_LANGS, type ReadbackLang } from '@/lib/entities/numbers';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
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
  const mode = body.mode === 'guard' ? 'guard' : 'complaint';
  startComplaint(channel, lang, mode);
  if (langArg === 'auto') getComplaint(channel).autoLang = true;
  await persist(channel);
  try {
    const client = agoraRestClient(appId, appCertificate);
    const agent = buildAgent({ client, preset: presetFor(langArg), lang, langArg, mode, channel, llmUrl, surface: 'phone' });
    const properties = agent.toProperties({
      channel,
      agentUid: String(DEFAULT_AGENT_UID),
      remoteUids: [String(SIP_UID)],
      idleTimeout: 30,
      appId,
      appCertificate,
      expiresIn: ExpiresIn.minutes(20),
    });
    const rtc_token = generateRtcToken({ appId, appCertificate, channel, uid: SIP_UID, expirySeconds: 1200 });
    const r = await client.telephony.call({
      appid: appId,
      name: `utrpakka-${channel.slice(-12)}`,
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
