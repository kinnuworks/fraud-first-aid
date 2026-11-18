// Our own break test (EVAL_PLAN.md, second claim): spoken UTRs and mobiles in noise.
// Murf Falcon speaks each number digit by digit (once per language); white noise is mixed in at
// 20, 10 and 5 dB SNR (seeded); Sarvam saarika:v2.5 transcribes; we score exact digits for
//   baseline = numerals in Sarvam's transcript, ours = spokenToDigits(transcript).
// Synthetic voices: measures robustness, not real callers.
// Run: set -a; . web/.env.local; set +a; npx -y tsx@4.20.6 evidence/breaktest/run.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spokenToDigits, readbackText, type ReadbackLang } from '../../web/lib/entities/numbers';
import { PRESETS } from '../../web/lib/agent-config';

const MURF = process.env.MURF_API_KEY, SARVAM = process.env.SARVAM_API_KEY;
if (!MURF || !SARVAM) throw new Error('MURF_API_KEY and SARVAM_API_KEY must be set');
const LANGS: ReadbackLang[] = ['hi', 'te', 'kn', 'en'];
const SNRS = [20, 10, 5];
const N = 25;
const RATE = 16000;
const CACHE = join(__dirname, '..', '.cache', 'breaktest');
mkdirSync(CACHE, { recursive: true });

// seeded PRNG (mulberry32) and Gaussian noise
let seed = 7;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());

// numbers: half 12-digit UTRs, half 10-digit mobiles (6-9 first digit), from the same seed
const numbers: string[] = [];
for (let i = 0; i < N; i++) {
  const len = i % 2 ? 10 : 12;
  let d = i % 2 ? String(6 + Math.floor(rand() * 4)) : String(1 + Math.floor(rand() * 9));
  while (d.length < len) d += String(Math.floor(rand() * 10));
  numbers.push(d);
}

async function murfWav(text: string, lang: ReadbackLang): Promise<Buffer> {
  const p = PRESETS[lang];
  const r = await fetch('https://global.api.murf.ai/v1/speech/stream', { method: 'POST', headers: { 'api-key': MURF!, 'content-type': 'application/json' }, body: JSON.stringify({ text, voiceId: p.voiceId, multiNativeLocale: p.locale, model: 'FALCON', format: 'WAV', sampleRate: RATE, channelType: 'MONO' }) });
  if (!r.ok) throw new Error(`murf ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

function withNoise(wav: Buffer, snrDb: number): Buffer {
  const at = wav.indexOf('data') + 8;
  const pcm = new Int16Array(wav.buffer.slice(wav.byteOffset + at, wav.byteOffset + wav.length - ((wav.length - at) % 2)));
  let p = 0; for (const s of pcm) p += s * s; const rms = Math.sqrt(p / pcm.length);
  const sigma = rms / Math.pow(10, snrDb / 20);
  const out = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] + sigma * gauss())));
  return Buffer.concat([wav.subarray(0, at), Buffer.from(out.buffer)]);
}

async function sarvam(wav: Buffer, lang: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', new Blob([wav], { type: 'audio/wav' }), 'a.wav');
  fd.append('model', 'saarika:v2.5'); fd.append('language_code', lang);
  for (let a = 1; ; a++) {
    const r = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': SARVAM! }, body: fd });
    if (r.ok) return ((await r.json()) as { transcript: string }).transcript;
    if (a >= 3 || r.status < 429) throw new Error(`sarvam ${r.status}`);
    await new Promise((s) => setTimeout(s, 2000 * a));
  }
}

const NUM: Record<string, string> = {};
['०१२३४५६७८९', '౦౧౨౩౪౫౬౭౮౯', '೦೧೨೩೪೫೬೭೮೯'].forEach((s) => [...s].forEach((c, i) => (NUM[c] = String(i))));
const numerals = (t: string) => [...t].map((c) => (/[0-9]/.test(c) ? c : NUM[c] ?? '')).join('');

(async () => {
  const rows = ['lang,snr,number,baseline_digits,ours_digits,baseline,ours'];
  for (const lang of LANGS) {
    for (const d of numbers) {
      const raw = join(CACHE, `${lang}-${d}.wav`);
      if (!existsSync(raw)) writeFileSync(raw, await murfWav(readbackText(d, lang), lang));
      const clean = readFileSync(raw);
      for (const snr of SNRS) {
        const tp = join(CACHE, `${lang}-${d}-${snr}.txt`);
        const t = existsSync(tp) ? readFileSync(tp, 'utf8') : await sarvam(withNoise(clean, snr), PRESETS[lang].asrLanguage);
        writeFileSync(tp, t);
        const b = numerals(t), o = spokenToDigits(t);
        rows.push([lang, snr, d, b, o, +(b === d), +(o === d)].join(','));
      }
    }
    const mine = rows.filter((r) => r.startsWith(lang + ','));
    console.log(lang, SNRS.map((s) => { const x = mine.filter((r) => r.split(',')[1] === String(s)); return `${s}dB ours ${x.filter((r) => r.endsWith(',1')).length}/${x.length} base ${x.filter((r) => r.split(',')[5] === '1').length}/${x.length}`; }).join(' | '));
  }
  writeFileSync(join(__dirname, '..', '.cache', 'breaktest-results.csv'), rows.join('\n') + '\n');
})();
