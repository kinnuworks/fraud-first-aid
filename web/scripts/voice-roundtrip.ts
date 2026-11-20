// Voice check: each language's greeting, spoken by the voice we plan for it (Murf Falcon), then
// heard back by Sarvam with automatic language detection. Passes when Sarvam hears the right
// language for every one. Small spend on the live keys (one short clip per language).
// Run: set -a && . ./.env.local && set +a && npx -y tsx@4.20.6 scripts/voice-roundtrip.ts
import { PRESETS } from '../lib/agent-config';
const MURF = process.env.MURF_API_KEY, SARVAM = process.env.SARVAM_API_KEY;
if (!MURF || !SARVAM) throw new Error('MURF_API_KEY and SARVAM_API_KEY must be set');
const only = process.argv.slice(2);
async function speak(text: string, voiceId: string, locale: string) {
  const r = await fetch('https://global.api.murf.ai/v1/speech/stream', { method: 'POST', headers: { 'api-key': MURF!, 'content-type': 'application/json' }, body: JSON.stringify({ text, voiceId, multiNativeLocale: locale, model: 'FALCON', format: 'WAV', sampleRate: 16000, channelType: 'MONO' }) });
  if (!r.ok) throw new Error(`murf ${voiceId} ${locale}: ${r.status} ${await r.text()}`);
  return await r.arrayBuffer();
}
async function hear(wav: ArrayBuffer) {
  const fd = new FormData();
  fd.append('file', new Blob([wav], { type: 'audio/wav' }), 'clip.wav');
  fd.append('model', 'saarika:v2.5');
  fd.append('language_code', 'unknown');
  const r = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': SARVAM! }, body: fd });
  if (!r.ok) throw new Error(`sarvam ${r.status} ${await r.text()}`);
  return (await r.json()) as { transcript: string; language_code: string };
}
(async () => {
  let bad = 0;
  for (const [code, p] of Object.entries(PRESETS)) {
    if (code === 'auto' || (only.length && !only.includes(code))) continue;
    const got = await hear(await speak(p.greeting, p.voiceId, p.locale));
    const ok = got.language_code === p.locale;
    if (!ok) bad++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${code} ${p.voiceId} -> heard ${got.language_code}: ${got.transcript.slice(0, 70)}`);
  }
  console.log(bad ? `${bad} FAILED` : 'ALL PASS');
  process.exit(bad ? 1 : 0);
})();
