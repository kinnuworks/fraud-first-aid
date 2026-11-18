// Prototype probe: does a spoken 10-digit mobile number survive Murf Falcon speech ->
// Sarvam speech-to-text -> our spokenToDigits? Synthetic audio (Murf voices), so it is a
// smoke test of the pipeline, not evidence about real callers.
// Run: pnpm tsx scripts/numbers-probe.ts   (reads MURF_API_KEY, SARVAM_API_KEY from env)
import { spokenToDigits, readbackText } from '../lib/entities/numbers';

const MURF = process.env.MURF_API_KEY!;
const SARVAM = process.env.SARVAM_API_KEY!;
if (!MURF || !SARVAM) throw new Error('MURF_API_KEY and SARVAM_API_KEY must be set');

type Case = { lang: 'hi' | 'kn' | 'te'; voice: string; locale: string; sarvamLang: string; digits: string; phrase: (spoken: string) => string };

const numbers = ['9845012345', '7019283746', '8800556677', '6362904518', '9108273645'];
const only = process.env.PROBE_LANGS?.split(',');
const cases: Case[] = [];
for (const d of numbers) {
  cases.push({ lang: 'hi', voice: 'hi-IN-namrita', locale: 'hi-IN', sarvamLang: 'hi-IN', digits: d, phrase: (s) => `मेरा नंबर है ${s}` });
  cases.push({ lang: 'te', voice: 'en-IN-anisha', locale: 'te-IN', sarvamLang: 'te-IN', digits: d, phrase: (s) => `నా నంబర్ ${s}` });
  cases.push({ lang: 'kn', voice: 'kn-IN-harshitha', locale: 'kn-IN', sarvamLang: 'kn-IN', digits: d, phrase: (s) => `ನನ್ನ ನಂಬರ್ ${s}` });
}

async function murf(text: string, voiceId: string, locale: string): Promise<ArrayBuffer> {
  // Falcon is served by the streaming endpoint; it returns raw audio bytes.
  const r = await fetch('https://global.api.murf.ai/v1/speech/stream', {
    method: 'POST',
    headers: { 'api-key': MURF, 'content-type': 'application/json' },
    body: JSON.stringify({ text, voiceId, multiNativeLocale: locale, model: 'FALCON', format: 'WAV', sampleRate: 16000 }),
  });
  if (!r.ok) throw new Error(`murf ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.arrayBuffer();
}

async function sarvam(audio: ArrayBuffer, lang: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', new Blob([audio], { type: 'audio/wav' }), 'a.wav');
  fd.append('model', 'saarika:v2.5');
  fd.append('language_code', lang);
  const r = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: { 'api-subscription-key': SARVAM },
    body: fd,
  });
  if (!r.ok) throw new Error(`sarvam ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return ((await r.json()) as { transcript: string }).transcript;
}

(async () => {
  let ok = 0;
  const run = only ? cases.filter((c) => only.includes(c.lang)) : cases;
  for (const c of run) {
    const spoken = readbackText(c.digits, c.lang); // digits as words, grouped 5+5
    const text = c.phrase(spoken);
    try {
      const transcript = await sarvam(await murf(text, c.voice, c.locale), c.sarvamLang);
      const got = spokenToDigits(transcript);
      const pass = got === c.digits;
      if (pass) ok++;
      console.log(`${pass ? 'PASS' : 'FAIL'} ${c.lang} ${c.digits} -> ${got || '(none)'} | ${transcript}`);
    } catch (e) {
      console.log(`ERROR ${c.lang} ${c.digits}: ${(e as Error).message}`);
    }
  }
  console.log(`\n${ok}/${run.length} numbers exact`);
})();
