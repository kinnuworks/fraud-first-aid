// Ninth claim (EVAL_PLAN.md): an open benchmark of spoken payment references in ten Indian languages.
// Writes references.csv (published) and regenerates the audio with your own Murf key into
// evidence/.cache/benchmark/ (not published: generated audio is not redistributed).
//   30 numbers per language (15 twelve-digit UTRs, 15 ten-digit mobiles; seed 11), spoken digit by
//   digit by the Murf Falcon voice the app uses for that language, in three conditions:
//   clean, white noise at 10 dB SNR (seeded), and the G.711 mu-law 8 kHz phone codec.
// Run: set -a; . web/.env.local; set +a; npx -y tsx@4.20.6 evidence/benchmark/make.ts
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readbackText, READBACK_LANGS, type ReadbackLang } from '../../web/lib/entities/numbers';
import { PRESETS } from '../../web/lib/agent-config';

const MURF = process.env.MURF_API_KEY;
if (!MURF) throw new Error('MURF_API_KEY must be set');
const N = 30, RATE = 16000, SNR = 10;
const OUT = join(__dirname, '..', '.cache', 'benchmark');
mkdirSync(OUT, { recursive: true });

let seed = 11;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand());
const numbers: string[] = [];
for (let i = 0; i < N; i++) {
  const len = i % 2 ? 10 : 12;
  let d = i % 2 ? String(6 + Math.floor(rand() * 4)) : String(1 + Math.floor(rand() * 9));
  while (d.length < len) d += String(Math.floor(rand() * 10));
  numbers.push(d);
}

async function murfWav(text: string, lang: ReadbackLang): Promise<Buffer> {
  const p = PRESETS[lang];
  for (let a = 1; ; a++) {
    const r = await fetch('https://global.api.murf.ai/v1/speech/stream', { method: 'POST', headers: { 'api-key': MURF!, 'content-type': 'application/json' }, body: JSON.stringify({ text, voiceId: p.voiceId, multiNativeLocale: p.locale, model: 'FALCON', format: 'WAV', sampleRate: RATE, channelType: 'MONO' }) });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (a >= 4 || r.status < 429) throw new Error(`murf ${r.status}`);
    await new Promise((s) => setTimeout(s, 1500 * a));
  }
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
const codec = (src: string, dst: string) => {
  const mu = dst.replace(/\.wav$/, '.mulaw.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ar', '8000', '-ac', '1', '-c:a', 'pcm_mulaw', mu]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', mu, '-ar', '8000', '-ac', '1', '-c:a', 'pcm_s16le', dst]);
};

(async () => {
  const rows = ['id,lang,condition,digits,kind,spoken_text,file'];
  for (const lang of READBACK_LANGS) {
    for (const [i, d] of numbers.entries()) {
      const id = `${lang}-${String(i).padStart(2, '0')}`;
      const text = readbackText(d, lang).replace(/,\s*/g, ' ');
      const clean = join(OUT, `${id}-clean.wav`);
      if (!existsSync(clean)) writeFileSync(clean, await murfWav(text, lang));
      const noisy = join(OUT, `${id}-noise10.wav`);
      if (!existsSync(noisy)) writeFileSync(noisy, withNoise(readFileSync(clean), SNR));
      const phone = join(OUT, `${id}-phone.wav`);
      if (!existsSync(phone)) codec(clean, phone);
      for (const [cond, f] of [['clean', clean], ['noise10', noisy], ['phone', phone]] as const)
        rows.push([`${id}-${cond}`, lang, cond, d, d.length === 12 ? 'utr' : 'mobile', JSON.stringify(text), f.split('/').pop()].join(','));
    }
    process.stdout.write(`${lang} `);
  }
  writeFileSync(join(__dirname, 'references.csv'), rows.join('\n') + '\n');
  console.log(`\n${rows.length - 1} clips; references in evidence/benchmark/references.csv`);
})();
