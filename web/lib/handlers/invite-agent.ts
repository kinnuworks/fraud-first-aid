import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Area,
  ExpiresIn,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import { presetFor } from '@/lib/agent-config';
import { buildAgent } from '@/lib/agent-builder';
import { startComplaint, getComplaint, persist } from '@/lib/complaint/store';
import { checkCap } from '@/lib/capability';
import { claimChannel, setAgent, releaseChannel } from '@/lib/handlers/agents';
import { READBACK_LANGS, type ReadbackLang } from '@/lib/entities/numbers';

// System prompt that defines the agent's personality and behavior.
// Swap this out to change what the agent talks about.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name } = body;
    const langArg = (body as unknown as { lang?: string }).lang;
    const preset = presetFor(langArg);
    const lang: ReadbackLang = (READBACK_LANGS as readonly string[]).includes(langArg ?? '')
      ? (langArg as ReadbackLang)
      : 'en';
    // Our own model route (complaint tools) once it has a public URL; until then Agora's
    // managed model runs the number-capture prototype prompt.
    const llmUrl = process.env.LLM_PUBLIC_URL;
    // Without our model route the agent has no complaint tools: refuse in production rather than
    // run a weaker agent quietly; in local development say so loudly.
    if (!llmUrl) {
      if (process.env.VERCEL_ENV === 'production') {
        return NextResponse.json({ error: 'LLM_PUBLIC_URL is not set: the complaint tools are unavailable' }, { status: 500 });
      }
      console.warn('[invite-agent] LLM_PUBLIC_URL not set: using Agora managed model WITHOUT complaint tools (local development only)');
    }

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }
    if (!/^[\w-]{1,64}$/.test(channel_name)) {
      return NextResponse.json({ error: 'bad channel_name' }, { status: 400 });
    }
    // Only the holder of this call's capability can start its agent, and only one agent per call.
    if (!checkCap(channel_name, (body as unknown as { cap?: string }).cap)) {
      return NextResponse.json({ error: 'not your call' }, { status: 403 });
    }
    if (!claimChannel(channel_name)) {
      return NextResponse.json({ error: 'an agent is already running for this call' }, { status: 409 });
    }
    const mode = (body as unknown as { mode?: string }).mode === 'guard' ? 'guard' : 'complaint';
    startComplaint(channel_name, lang, mode);
    if (langArg === 'auto') getComplaint(channel_name).autoLang = true;
    await persist(channel_name);

    // --- 2. Build and start the agent ---

    // AgoraClient authenticates API calls to the Agora Conversational AI service.
    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    const agent = buildAgent({ client, preset, lang, langArg, mode, channel: channel_name, llmUrl, surface: 'web', slow: (body as unknown as { slow?: boolean }).slow === true });

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.minutes(20), // a call never needs longer; caps cost if a capability leaks
      debug: false, // enable debug to show restful API calls in the console
    });

    let agentId: string;
    try {
      agentId = await session.start();
    } catch (e) {
      releaseChannel(channel_name);
      throw e;
    }
    setAgent(channel_name, agentId);

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json({ error: 'Failed to start the agent' }, { status: 500 });
  }
}
