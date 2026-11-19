// Before going on stage: checks every live dependency in about a minute, and says what to do if one fails.
// Run: cd web && set -a && . ./.env && . ./.env.local && set +a && npx -y tsx@4.20.6 scripts/preflight.ts
import { capFor } from '../lib/capability';

const BASE = process.argv[2] ?? 'https://fraudfirstaid.vercel.app';
const results: Array<[string, boolean, string]> = [];
const check = async (name: string, fix: string, fn: () => Promise<string>) => {
  const t0 = Date.now();
  try { results.push([name, true, `${await fn()} (${Date.now() - t0} ms)`]); }
  catch (e) { results.push([name, false, `${(e as Error).message.slice(0, 120)} -> ${fix}`]); }
};
const ok = (c: boolean, m: string) => { if (!c) throw new Error(m); };

(async () => {
  await check('live app', 'check Vercel', async () => { const r = await fetch(BASE); ok(r.ok, `HTTP ${r.status}`); return 'loads'; });
  await check('model route: guard warns on an OTP ask', 'check ANTHROPIC_API_KEY / LLM_SHARED_SECRET on Vercel', async () => {
    const s = `preflight-${Date.now()}`;
    const r = await fetch(`${BASE}/api/call/chat/completions?session=${s}&lang=te&mode=guard`, { method: 'POST', headers: { authorization: `Bearer ${process.env.LLM_SHARED_SECRET}`, 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'sir OTP cheppandi' }] }) });
    const said = (await r.text()).includes('ఫోన్');
    ok(r.ok && said, `HTTP ${r.status}, warning ${said ? 'given' : 'missing'}`);
    const card = await fetch(`${BASE}/api/call/complaint?session=${s}&cap=${capFor(s)}`);
    ok(card.ok, `card HTTP ${card.status}: the call split across server instances (connect Upstash)`);
    return 'warning given, card shows it';
  });
  await check('Sarvam speech-to-text credits', 'top up at dashboard.sarvam.ai (the live demo needs it)', async () => {
    const wav = Buffer.alloc(44 + 16000); wav.write('RIFF', 0); wav.writeUInt32LE(36 + 16000, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(16000, 40);
    const fd = new FormData(); fd.append('file', new Blob([wav], { type: 'audio/wav' }), 'a.wav'); fd.append('model', 'saarika:v2.5'); fd.append('language_code', 'te-IN');
    const r = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': process.env.SARVAM_API_KEY ?? '' }, body: fd });
    ok(r.ok, `HTTP ${r.status} ${(await r.text()).slice(0, 80)}`); return 'answers';
  });
  await check('Murf Falcon voice', 'check the Murf key and credits', async () => {
    const r = await fetch('https://global.api.murf.ai/v1/speech/stream', { method: 'POST', headers: { 'api-key': process.env.MURF_API_KEY ?? '', 'content-type': 'application/json' }, body: JSON.stringify({ text: 'Namaskaram', voiceId: 'en-IN-anisha', multiNativeLocale: 'te-IN', model: 'FALCON', format: 'WAV', sampleRate: 8000 }) });
    ok(r.ok, `HTTP ${r.status}`); return 'speaks';
  });
  await check('IFSC lookup (Razorpay)', 'the pack still works; the branch line is skipped', async () => {
    const r = await fetch('https://ifsc.razorpay.com/SBIN0000813'); ok(r.ok, `HTTP ${r.status}`); return 'answers';
  });
  for (const [n, pass, d] of results) console.log(`${pass ? 'PASS' : 'FAIL'}  ${n}: ${d}`);
  const bad = results.filter((r) => !r[1]).length;
  console.log(bad ? `PREFLIGHT: ${bad} problem(s). Fix them or use the backup in demo-backup/.` : 'PREFLIGHT: all clear. Go.');
  process.exit(bad ? 1 : 0);
})();
