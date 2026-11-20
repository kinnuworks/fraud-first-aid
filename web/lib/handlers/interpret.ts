// Switch a finished complaint call into the 1930 interpreter. The running agent hears one language,
// and Agora can't change a running agent's speech recognition, so this stops it and starts the
// interpreter on the same call: it hears any language and keeps the confirmed complaint.
import { NextRequest, NextResponse } from 'next/server';
import { AgoraClient, Area, ExpiresIn } from 'agora-agents';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { PRESETS } from '@/lib/agent-config';
import { buildAgent } from '@/lib/agent-builder';
import { hydrate, peekComplaint, persist } from '@/lib/complaint/store';
import { canInterpret, INTERPRET_GREETING } from '@/lib/complaint/interpret';
import { checkCap } from '@/lib/capability';
import { allowStart, clientAddress } from '@/lib/ratelimit';
import { agentFor, claimChannel, releaseChannel, setAgent } from '@/lib/handlers/agents';

const gone = (e: unknown) => {
  const err = e as { statusCode?: number; body?: { detail?: string }; message?: string };
  const detail = (err?.body?.detail ?? err?.message ?? '').toLowerCase();
  return err?.statusCode === 404 || detail.includes('shutting down') || detail.includes('not found');
};

export async function POST(request: NextRequest) {
  try {
    if (!(await allowStart(clientAddress(request.headers)))) {
      return NextResponse.json({ error: 'Too many calls started from here. Please wait a few minutes.' }, { status: 429 });
    }
    const body = (await request.json().catch(() => ({}))) as { channel?: string; cap?: string; uid?: string | number };
    const channel = body.channel ?? '';
    if (!/^[\w-]{1,64}$/.test(channel) || !checkCap(channel, body.cap)) {
      return NextResponse.json({ error: 'not your call' }, { status: 403 });
    }
    const llmUrl = process.env.LLM_PUBLIC_URL;
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
    if (!llmUrl || !appId || !appCertificate) {
      return NextResponse.json({ error: 'The interpreter needs the model route and Agora keys' }, { status: 500 });
    }
    await hydrate(channel);
    const c = peekComplaint(channel);
    if (!c || !canInterpret(c)) {
      return NextResponse.json({ error: 'Finish and confirm the complaint first: the interpreter only gives 1930 confirmed details.' }, { status: 409 });
    }

    const client = new AgoraClient({ area: Area.US, appId, appCertificate });
    // Stop the complaint agent (whichever server instance started it), then wait for it to leave.
    const old = agentFor(channel) || c.agentId;
    if (old) {
      try {
        await client.stopAgent(old);
      } catch (e) {
        if (!gone(e)) throw e;
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    releaseChannel(channel);
    claimChannel(channel);

    c.phase = 'interpret';
    await persist(channel);

    const agent = buildAgent({
      client,
      // any language in, one Falcon voice that speaks English and every Indian language out
      preset: PRESETS.auto,
      lang: c.lang,
      langArg: c.lang,
      mode: 'interpret',
      greeting: INTERPRET_GREETING[c.lang],
      channel,
      llmUrl,
      surface: 'web',
    });
    const uid = body.uid != null && /^\d{1,10}$/.test(String(body.uid)) ? String(body.uid) : undefined;
    const session = agent.createSession({
      channel,
      agentUid: String(DEFAULT_AGENT_UID),
      remoteUids: uid ? [uid] : ['*'], // '*': everyone in the call
      idleTimeout: 30,
      expiresIn: ExpiresIn.minutes(20),
      debug: false,
    });
    let agentId: string;
    try {
      agentId = await session.start();
    } catch (e) {
      releaseChannel(channel);
      throw e;
    }
    setAgent(channel, agentId);
    c.agentId = agentId;
    await persist(channel);
    return NextResponse.json({ agent_id: agentId, state: 'RUNNING', phase: 'interpret' });
  } catch (error) {
    console.error('[interpret] failed:', error);
    return NextResponse.json({ error: 'Could not start the interpreter' }, { status: 500 });
  }
}
