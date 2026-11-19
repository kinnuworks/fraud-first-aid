import { NextResponse } from 'next/server';
import { AgoraClient, Area } from 'agora-agents';
import { checkCap } from '@/lib/capability';
import { agentFor } from '@/lib/handlers/agents';

function isAgentAlreadyStoppingOrStopped(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const maybeErr = error as {
    statusCode?: number;
    body?: { detail?: string; reason?: string };
    message?: string;
  };

  const statusCode = maybeErr.statusCode;
  const reason = maybeErr.body?.reason?.toLowerCase();
  const detail = maybeErr.body?.detail?.toLowerCase() ?? maybeErr.message?.toLowerCase() ?? '';

  if (statusCode === 404) return true;
  if (reason === 'invalidrequest' && detail.includes('already in the process of shutting down')) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { channel?: string; cap?: string };
    // Only the call's own holder can stop it, and only the agent that call started.
    if (!body.channel || !checkCap(body.channel, body.cap)) {
      return NextResponse.json({ error: 'not your call' }, { status: 403 });
    }
    const agent_id = agentFor(body.channel);
    if (!agent_id) return NextResponse.json({ success: true, state: 'no-agent' });

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
    if (!appId || !appCertificate) {
      throw new Error(
        'Missing Agora configuration. Set NEXT_PUBLIC_AGORA_APP_ID and NEXT_AGORA_APP_CERTIFICATE.',
      );
    }

    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });
    try {
      await client.stopAgent(agent_id);
    } catch (error) {
      if (isAgentAlreadyStoppingOrStopped(error)) {
        // Treat stop as idempotent: agent is already exiting (or gone).
        return NextResponse.json({ success: true, state: 'already-stopping' });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error stopping conversation:', error);
    return NextResponse.json({ error: 'Failed to stop the agent' }, { status: 500 });
  }
}
