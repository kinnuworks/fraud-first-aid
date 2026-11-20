// One outbound test call to TEST_CALLEE_NUMBER with the same agent as the app (Telugu complaint),
// then Agora's status for it every 4 s for 60 s. Prints no keys or full numbers. AREA=AP uses Agora's
// Asia-Pacific region. 21 Nov: every call stayed CALLING and never reached Twilio (see STATE.md).
// Run: set -a && . ./.env && . ./.env.local && set +a && npx -y tsx@4.20.6 scripts/phone-test.ts
import { AgoraClient, Area, ExpiresIn, generateRtcToken } from 'agora-agents';
import { buildAgent } from '../lib/agent-builder';
import { presetFor } from '../lib/agent-config';
import { newChannel } from '../lib/capability';
import { agentUidFor } from '../lib/agora';
const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`${k} must be set`); return v; };
const mask = (s: string) => s.replace(/\+?\d{10,13}/g, (m) => '•••' + m.slice(-3));
(async () => {
  const appId = env('NEXT_PUBLIC_AGORA_APP_ID'), appCertificate = env('NEXT_AGORA_APP_CERTIFICATE');
  const client = new AgoraClient({ area: (process.env.AREA === 'AP' ? Area.AP : Area.US) as never, appId, appCertificate, customerId: env('AGORA_CUSTOMER_ID'), customerSecret: env('AGORA_CUSTOMER_SECRET') });
  const channel = newChannel();
  const SIP_UID = 7001;
  const agent = buildAgent({ client, preset: presetFor('te'), lang: 'te', langArg: 'te', mode: 'complaint', channel, llmUrl: 'https://fraudfirstaid.vercel.app', surface: 'phone' });
  const properties = agent.toProperties({ channel, agentUid: agentUidFor(channel), remoteUids: [String(SIP_UID)], idleTimeout: 30, appId, appCertificate, expiresIn: ExpiresIn.minutes(5) });
  const rtc_token = generateRtcToken({ appId, appCertificate, channel, uid: SIP_UID, expirySeconds: 600 });
  const t0 = Date.now();
  const r = (await client.telephony.call({ appid: appId, name: `ffa-test-${Date.now()}`, sip: { to_number: env('TEST_CALLEE_NUMBER'), from_number: env('TWILIO_PHONE_NUMBER'), rtc_uid: String(SIP_UID), rtc_token }, properties } as never)) as Record<string, unknown>;
  const agentId = String(r.agent_id ?? '');
  console.log('placed', agentId ? 'agent ' + agentId.slice(0, 8) : JSON.stringify(r).slice(0, 200));
  let last = '';
  while (Date.now() - t0 < 60000 && agentId) {
    await new Promise((s) => setTimeout(s, 4000));
    try {
      const g = (await client.telephony.get({ appid: appId, agent_id: agentId } as never)) as Record<string, unknown>;
      const line = mask(JSON.stringify(g)).slice(0, 260);
      if (line !== last) { console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s`, line); last = line; }
      if (/ANSWERED|HANGUP|FAILED|ENDED|BUSY|NO_ANSWER/i.test(line) && !/CALLING/.test(line)) break;
    } catch (e) { console.log('get failed', String((e as Error).message).split('\n')[0].slice(0, 120)); }
  }
  try { await client.telephony.hangup({ appid: appId, agent_id: agentId } as never); console.log('hung up'); } catch { console.log('hangup: nothing to hang up'); }
})().catch((e) => { console.error('CALL FAILED:', mask(String((e as Error).message)).replace(/\s+/g, ' ').slice(0, 900)); process.exit(1); });
