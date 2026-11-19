// Fifth claim (EVAL_PLAN.md): our own break test with code-mixed speech. The 12-digit UTR and the
// 10-digit mobile said inside code-mixed sentences: native digits, English digits mixed across
// groups, English filler between groups, and English pairs ("ninety eight") inside a Hindi or Telugu
// sentence. 25 numbers (seed 7) x 4 templates x hi and te = 200 clips, Murf Falcon voices, no noise.
// Score exact digits: baseline = numerals in Sarvam's transcript, ours = spokenToDigits(transcript).
// Run: set -a; . web/.env.local; set +a; npx -y tsx@4.20.6 evidence/breaktest/codemixed.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spokenToDigits, readbackText, groupForReadback, type ReadbackLang } from '../../web/lib/entities/numbers';
import { PRESETS } from '../../web/lib/agent-config';

// Tests use their own Sarvam key so they can never use up the live app's credits (19 Nov outage).
const MURF = process.env.MURF_API_KEY, SARVAM = process.env.SARVAM_EVAL_KEY;
if (!MURF || !SARVAM) throw new Error('MURF_API_KEY and SARVAM_EVAL_KEY (a separate Sarvam key for tests) must be set');
const CACHE = join(__dirname, '..', '.cache', 'codemixed');
mkdirSync(CACHE, { recursive: true });

let seed = 7;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const numbers: string[] = [];
for (let i = 0; i < 25; i++) {
  const len = i % 2 ? 10 : 12;
  let d = i % 2 ? String(6 + Math.floor(rand() * 4)) : String(1 + Math.floor(rand() * 9));
  while (d.length < len) d += String(Math.floor(rand() * 10));
  numbers.push(d);
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const enDigits = (g: string) => [...g].map((c) => ONES[+c]).join(' ');
const pair = (p: string) => (p[0] === '0' ? `zero ${ONES[+p[1]]}` : p[0] === '1' ? TEENS[+p[1]] : TENS[+p[0]] + (p[1] === '0' ? '' : ' ' + ONES[+p[1]]));
const enPairs = (d: string) => (d.match(/../g) ?? []).map(pair).join(' ');
const nat = (g: string, lang: ReadbackLang) => readbackText(g, lang);

const T: Record<'hi' | 'te', Array<(d: string) => string>> = {
  hi: [
    (d) => `मेरा ${d.length === 12 ? 'UTR' : 'मोबाइल'} नंबर है ${groupForReadback(d).map((g) => nat(g, 'hi')).join(', ')}`,
    (d) => `${d.length === 12 ? 'UTR' : 'number'} है ${groupForReadback(d).map((g, i) => (i % 2 ? nat(g, 'hi') : enDigits(g))).join(', ')} बस`,
    (d) => `हाँ जी लिखिए, ${groupForReadback(d).map((g) => nat(g, 'hi')).join(', okay, ')}, done`,
    (d) => `पैसे चले गए, reference है ${enPairs(d)}`,
  ],
  te: [
    (d) => `నా ${d.length === 12 ? 'UTR' : 'మొబైల్'} నంబర్ ${groupForReadback(d).map((g) => nat(g, 'te')).join(', ')}`,
    (d) => `${d.length === 12 ? 'UTR' : 'number'} ${groupForReadback(d).map((g, i) => (i % 2 ? nat(g, 'te') : enDigits(g))).join(', ')} అంతే`,
    (d) => `అవునండి రాసుకోండి, ${groupForReadback(d).map((g) => nat(g, 'te')).join(', okay, ')}, done`,
    (d) => `డబ్బులు పోయాయి, reference ${enPairs(d)}`,
  ],
};

async function murfWav(text: string, lang: ReadbackLang): Promise<Buffer> {
  const p = PRESETS[lang];
  const r = await fetch('https://global.api.murf.ai/v1/speech/stream', { method: 'POST', headers: { 'api-key': MURF!, 'content-type': 'application/json' }, body: JSON.stringify({ text, voiceId: p.voiceId, multiNativeLocale: p.locale, model: 'FALCON', format: 'WAV', sampleRate: 16000, channelType: 'MONO' }) });
  if (!r.ok) throw new Error(`murf ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
async function sarvam(wav: Buffer, lang: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', new Blob([wav], { type: 'audio/wav' }), 'a.wav');
  fd.append('model', 'saarika:v2.5'); fd.append('language_code', lang);
  for (let a = 1; ; a++) {
    const r = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': SARVAM! }, body: fd });
    if (r.ok) return ((await r.json()) as { transcript: string }).transcript;
    if (a >= 5 || r.status < 429) throw new Error(`sarvam ${r.status}`);
    await new Promise((s) => setTimeout(s, 3000 * a));
  }
}
const NUM: Record<string, string> = {};
['०१२३४५६७८९', '౦౧౨౩౪౫౬౭౮౯'].forEach((s) => [...s].forEach((c, i) => (NUM[c] = String(i))));
const numerals = (t: string) => [...t].map((c) => (/[0-9]/.test(c) ? c : NUM[c] ?? '')).join('');

(async () => {
  const rows = ['lang,template,number,said,transcript,baseline_digits,ours_digits,baseline,ours'];
  for (const lang of ['hi', 'te'] as const) {
    for (const [ti, tmpl] of T[lang].entries()) {
      let ok = 0, okB = 0;
      for (const d of numbers) {
        const text = tmpl(d);
        const key = join(CACHE, `${lang}-${ti}-${d}`);
        if (!existsSync(key + '.wav')) writeFileSync(key + '.wav', await murfWav(text, lang));
        const t = existsSync(key + '.txt') ? readFileSync(key + '.txt', 'utf8') : await sarvam(readFileSync(key + '.wav'), PRESETS[lang].asrLanguage);
        writeFileSync(key + '.txt', t);
        const b = numerals(t), o = spokenToDigits(t);
        ok += +(o === d); okB += +(b === d);
        rows.push([lang, ti, d, JSON.stringify(text), JSON.stringify(t), b, o, +(b === d), +(o === d)].join(','));
      }
      console.log(`${lang} template ${ti}: ours ${ok}/25, baseline ${okB}/25`);
    }
  }
  writeFileSync(join(__dirname, '..', '.cache', 'codemixed-results.csv'), rows.join('\n') + '\n');
})();
