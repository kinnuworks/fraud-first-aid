// Places one outbound test call to TEST_CALLEE_NUMBER with the same agent as the app (Telugu,
// complaint mode), using the deployed model route. Prints the agent id and channel only.
// Run: set -a && . ./.env.local && set +a && npx -y tsx@4.20.6 scripts/phone-test.ts [lang] [mode]
import { AgoraClient, Area, ExpiresIn, generateRtcToken } from 'agora-agents';
import { buildAgent } from '../lib/agent-builder';
import { presetFor } from '../lib/agent-config';
import { newChannel } from '../lib/capability';
import { DEFAULT_AGENT_UID } from '../lib/agora';

const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`${k} must be set`); return v; };
(async () => {
  const appId = env('NEXT_PUBLIC_AGORA_APP_ID'), appCertificate = env('NEXT_AGORA_APP_CERTIFICATE');
  const lang = process.argv[2] ?? 'te', mode = process.argv[3] === 'guard' ? 'guard' : 'complaint';
  const llmUrl = process.env.LLM_PUBLIC_URL ?? 'https://fraudfirstaid.vercel.app';
  const client = new AgoraClient({ area: Area.US, appId, appCertificate, customerId: env('AGORA_CUSTOMER_ID'), customerSecret: env('AGORA_CUSTOMER_SECRET') });
  const channel = newChannel();
  const SIP_UID = 7001;
  const agent = buildAgent({ client, preset: presetFor(lang), lang, langArg: lang, mode, channel, llmUrl, surface: 'phone' });
  const properties = agent.toProperties({ channel, agentUid: String(DEFAULT_AGENT_UID), remoteUids: [String(SIP_UID)], idleTimeout: 30, appId, appCertificate, expiresIn: ExpiresIn.minutes(10) });
  const rtc_token = generateRtcToken({ appId, appCertificate, channel, uid: SIP_UID, expirySeconds: 900 });
  const r = await client.telephony.call({ appid: appId, name: `utrpakka-test-${Date.now()}`, sip: { to_number: env('TEST_CALLEE_NUMBER'), from_number: env('TWILIO_PHONE_NUMBER'), rtc_uid: String(SIP_UID), rtc_token }, properties } as never);
  console.log('CALL PLACED agent', (r as { agent_id?: string }).agent_id, 'channel', channel);
  console.log('live card (production state):', `${llmUrl}/watch?session=${channel}&key=${process.env.LLM_SHARED_SECRET ? '<view key>' : ''}&as=phone`);
})().catch((e) => { console.error('CALL FAILED:', String((e as Error).message).split('\n').slice(0, 4).join(' ')); process.exit(1); });
