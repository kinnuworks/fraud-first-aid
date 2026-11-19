// One-time telephony setup (idempotent): Twilio Elastic SIP trunk + credential list (alphanumeric
// username, generated password saved to .env.local, never printed), the number attached to the
// trunk, and the number registered with Agora for outbound calls.
/* eslint-disable @typescript-eslint/no-explicit-any -- Twilio/Agora JSON responses */
// Run: set -a && . ./.env.local && set +a && npx -y tsx@4.20.6 scripts/telephony-setup.ts
import { appendFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { AgoraClient, Area } from 'agora-agents';

// Twilio's SIP signalling ranges (current block plus the long-standing regional ones), allowed inbound.
const TWILIO_SIGNALING = ['168.86.128.0/18', '54.172.60.0/30', '54.244.51.0/30', '54.171.127.192/30', '35.156.191.128/30', '54.65.63.192/30', '54.169.127.128/30', '54.252.254.64/30', '177.71.206.192/30'];
const env = (k: string) => { const v = process.env[k]; if (!v) throw new Error(`${k} must be set`); return v; };
const SID = env('TWILIO_ACCOUNT_SID'), TOK = env('TWILIO_AUTH_TOKEN'), NUMBER = env('TWILIO_PHONE_NUMBER').replace(/\s/g, '');
const auth = 'Basic ' + Buffer.from(`${SID}:${TOK}`).toString('base64');
async function tw(method: string, url: string, form?: Record<string, string>) {
  const r = await fetch(url, { method, headers: { Authorization: auth, ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, body: form ? new URLSearchParams(form) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 409) throw new Error(`twilio ${method} ${url.split('/').slice(-2).join('/')} ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j as Record<string, any>;
}

(async () => {
  // credentials (alphanumeric username: Agora rejects "_" and "-")
  let user = process.env.SIP_USERNAME, pass = process.env.SIP_PASSWORD;
  if (!user || !pass) {
    user = 'utrpakka' + randomBytes(3).toString('hex');
    pass = 'Up' + randomBytes(12).toString('base64').replace(/[^A-Za-z0-9]/g, '') + '7a';
    appendFileSync('.env.local', `\nSIP_USERNAME=${user}\nSIP_PASSWORD=${pass}\n`);
    console.log('generated SIP credentials and saved them to .env.local');
  }
  // trunk
  const trunks = await tw('GET', 'https://trunking.twilio.com/v1/Trunks?PageSize=50');
  let trunk = (trunks.trunks ?? []).find((t: any) => t.friendly_name === 'utr-pakka');
  if (!trunk) trunk = await tw('POST', 'https://trunking.twilio.com/v1/Trunks', { FriendlyName: 'utr-pakka', DomainName: `utr-pakka-${randomBytes(3).toString('hex')}.pstn.twilio.com` });
  console.log('trunk', trunk.sid, 'termination domain', trunk.domain_name);
  // credential list
  const base = `https://api.twilio.com/2010-04-01/Accounts/${SID}/SIP/CredentialLists`;
  const lists = await tw('GET', `${base}.json`);
  let cl = (lists.credential_lists ?? []).find((l: any) => l.friendly_name === 'utrpakka');
  if (!cl) cl = await tw('POST', `${base}.json`, { FriendlyName: 'utrpakka' });
  const creds = await tw('GET', `${base}/${cl.sid}/Credentials.json`);
  if (!(creds.credentials ?? []).some((c: any) => c.username === user)) await tw('POST', `${base}/${cl.sid}/Credentials.json`, { Username: user!, Password: pass! });
  const attached = await tw('GET', `https://trunking.twilio.com/v1/Trunks/${trunk.sid}/CredentialLists`);
  if (!(attached.credential_lists ?? []).some((c: any) => c.sid === cl.sid)) await tw('POST', `https://trunking.twilio.com/v1/Trunks/${trunk.sid}/CredentialLists`, { CredentialListSid: cl.sid });
  console.log('credential list attached');
  // phone number on the trunk
  const nums = await tw('GET', `https://api.twilio.com/2010-04-01/Accounts/${SID}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(NUMBER)}`);
  const pn = nums.incoming_phone_numbers?.[0];
  if (!pn) throw new Error('the number is not on this account');
  const onTrunk = await tw('GET', `https://trunking.twilio.com/v1/Trunks/${trunk.sid}/PhoneNumbers`);
  if (!(onTrunk.phone_numbers ?? []).some((p: any) => p.sid === pn.sid)) await tw('POST', `https://trunking.twilio.com/v1/Trunks/${trunk.sid}/PhoneNumbers`, { PhoneNumberSid: pn.sid });
  console.log('number attached to trunk');
  // Agora: register the number for outbound calls through the trunk
  const appId = env('NEXT_PUBLIC_AGORA_APP_ID'), appCertificate = env('NEXT_AGORA_APP_CERTIFICATE');
  const agora = new AgoraClient({ area: Area.US, appId, appCertificate, customerId: env('AGORA_CUSTOMER_ID'), customerSecret: env('AGORA_CUSTOMER_SECRET') });
  const existing = await (agora as any).phoneNumbers.list().catch((e: Error) => ({ error: e.message }));
  console.log('agora numbers before:', JSON.stringify(existing).slice(0, 200).replace(/[A-Za-z0-9]{16,}:[^@"]+@/g, '***@'));
  const has = Array.isArray(existing) ? existing.some((n: any) => n.phone_number === NUMBER) : JSON.stringify(existing).includes(NUMBER);
  if (!has) {
    const r = await (agora as any).phoneNumbers.add({ provider: 'byo', phone_number: NUMBER, label: 'utr-pakka', inbound: false, outbound: true, inbound_config: { allowed_addresses: TWILIO_SIGNALING }, outbound_config: { address: `${user}:${pass}@${trunk.domain_name}`, transport: 'tcp' } });
    console.log('agora number added:', JSON.stringify(r).replace(/:[^:@"]+@/g, ':***@').slice(0, 200));
  } else console.log('agora number already registered');
})().catch((e) => { console.error('SETUP FAILED:', String(e.message ?? e).replace(/:[^:@"\s]+@/g, ':***@')); process.exit(1); });
