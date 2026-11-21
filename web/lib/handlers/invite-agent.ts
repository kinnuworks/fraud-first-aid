import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Area,
  ExpiresIn,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { agentUidFor } from '@/lib/agora';
import { presetFor, PRESETS } from '@/lib/agent-config';
import { buildAgent } from '@/lib/agent-builder';
import { startComplaint, getComplaint, persist } from '@/lib/complaint/store';
import { act } from '@/lib/complaint/session';
import { seedDemo1930 } from '@/lib/complaint/demo1930';
import { INTERPRET_GREETING } from '@/lib/complaint/interpret';
import { istToday } from '@/lib/complaint/today';
import { checkCap } from '@/lib/capability';
import { allowStart, clientAddress } from '@/lib/ratelimit';
import { claimChannel, setAgent, releaseChannel } from '@/lib/handlers/agents';
import { READBACK_LANGS, type ReadbackLang } from '@/lib/entities/numbers';

// System prompt that defines the agent's personality and behavior.
// Swap this out to change what the agent talks about.

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
    // A paid agent starts below: limit how often one address (and the whole app) can start calls,
    // counting only requests for a call the requester really holds.
    if (!(await allowStart(clientAddress(request.headers)))) {
      return NextResponse.json({ error: 'Too many calls started from here. Please wait a few minutes and try again, or call 1930 directly.' }, { status: 429 });
    }
    if (!claimChannel(channel_name)) {
      return NextResponse.json({ error: 'an agent is already running for this call' }, { status: 409 });
    }
    const rawMode = (body as unknown as { mode?: string }).mode;
    // demo1930: "Watch it call 1930 for you" (a labelled sample complaint, then the 1930 interpreter)
    const demo1930 = rawMode === 'demo1930';
    const mode = rawMode === 'guard' ? 'guard' : 'complaint';
    startComplaint(channel_name, lang, mode);
    if (langArg === 'auto') getComplaint(channel_name).autoLang = true;
    // the first step on screen says what is listening, so the Agora part is visible from the start
    if (demo1930) seedDemo1930(getComplaint(channel_name), istToday());
    else act(getComplaint(channel_name), 'heard', mode === 'guard'
      ? 'Listening through an Agora voice agent that stays silent until the caller asks for a code, a scan or money'
      : 'An Agora voice agent joined the call to take your report, in your language');
    await persist(channel_name);

    // --- 2. Build and start the agent ---

    // AgoraClient authenticates API calls to the Agora Conversational AI service.
    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    const agent = demo1930
      ? // the 1930 interpreter, as "Speak to 1930 for me" starts it (lib/handlers/interpret.ts)
        buildAgent({ client, preset: PRESETS.auto, lang, langArg: lang, mode: 'interpret', greeting: INTERPRET_GREETING[lang], channel: channel_name, llmUrl, surface: 'web' })
      : buildAgent({ client, preset, lang, langArg, mode, channel: channel_name, llmUrl, surface: 'web', slow: (body as unknown as { slow?: boolean }).slow === true });

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid: agentUidFor(channel_name),
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
    // remembered in the shared store, so the interpreter can replace this agent from any instance
    getComplaint(channel_name).agentId = agentId;
    if (demo1930) act(getComplaint(channel_name), 'tool', 'Started the 1930 interpreter: an Agora agent on this call, hearing English, Hindi and your language');
    await persist(channel_name);

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
