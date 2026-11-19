// Score spoken-number accuracy on a FLEURS split (see evidence/EVAL_PLAN.md).
// Each utterance is transcribed once by Sarvam saarika:v2.5 (cached), then:
//   reference = numerals in FLEURS raw_transcription, in order
//   baseline  = numerals in Sarvam's transcript, in order (the vendor's own formatting)
//   ours      = spokenToDigits(the same transcript)
// Writes evidence/.cache/fleurs/results-<split>.csv with 1/0 columns `ours` and `baseline`.
// Run: set -a; . web/.env.local; set +a; npx -y tsx@4.20.6 evidence/fleurs/score.ts dev
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spokenToDigits } from '../../web/lib/entities/numbers';

const split = process.argv[2] ?? 'dev';
// 'phone': the phone-band copies (third claim); 'six': ta, ml, bn, mr, gu, pa (fourth claim)
const variant = process.argv[3] ?? '';
// Tests use their own key so they can never use up the live app's credits (19 Nov outage).
const KEY = process.env.SARVAM_EVAL_KEY;
if (!KEY) throw new Error('SARVAM_EVAL_KEY must be set (a separate Sarvam key for tests, not the live app\'s)');
const ROOT = join(__dirname, '..', '.cache', 'fleurs');
const LANGS: Record<string, string> = variant === 'six'
  ? { ta_in: 'ta-IN', ml_in: 'ml-IN', bn_in: 'bn-IN', mr_in: 'mr-IN', gu_in: 'gu-IN', pa_in: 'pa-IN' }
  : { hi_in: 'hi-IN', te_in: 'te-IN', kn_in: 'kn-IN' };
const dirOf = (lang: string) => (variant === 'phone' ? `${split}-phone` : split);

const NUM: Record<string, string> = {};
['०१२३४५६७८९', '౦౧౨౩౪౫౬౭౮౯', '೦೧೨೩೪೫೬೭೮೯', '௦௧௨௩௪௫௬௭௮௯', '൦൧൨൩൪൫൬൭൮൯', '০১২৩৪৫৬৭৮৯', '૦૧૨૩૪૫૬૭૮૯', '੦੧੨੩੪੫੬੭੮੯'].forEach((s) => [...s].forEach((c, i) => (NUM[c] = String(i))));
const SKIP = '__over_30_seconds__';
const numerals = (t: string) => [...t].map((c) => (/[0-9]/.test(c) ? c : NUM[c] ?? '')).join('');

async function transcribe(path: string, lang: string): Promise<string> {
  const fd = new FormData();
  fd.append('file', new Blob([readFileSync(path)], { type: 'audio/wav' }), 'a.wav');
  fd.append('model', 'saarika:v2.5');
  fd.append('language_code', lang);
  for (let attempt = 1; ; attempt++) {
    const r = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': KEY! }, body: fd });
    if (r.ok) return ((await r.json()) as { transcript: string }).transcript;
    if (attempt >= 8 || r.status < 429) throw new Error(`sarvam ${r.status}: ${(await r.text()).slice(0, 200)}`);
    await new Promise((s) => setTimeout(s, 5000 * attempt));
  }
}

(async () => {
  const rows = ['lang,id,reference,baseline_digits,ours_digits,baseline,ours'];
  for (const [dir, code] of Object.entries(LANGS)) {
    const base = join(ROOT, dir, dirOf(dir));
    const cachePath = join(base, 'transcripts.json');
    const cache: Record<string, string> = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
    const items = readFileSync(join(base, 'items.tsv'), 'utf8').trim().split('\n').map((l) => l.split('\t'));
    let ok = 0, okBase = 0, skipped = 0;
    for (const [id, file, raw] of items) {
      if (!(file in cache)) {
        try {
          cache[file] = await transcribe(join(base, file), code);
        } catch (e) {
          // Sarvam's real-time endpoint takes at most 30 s of audio; such clips are left out
          // for both answers alike (EVAL_PLAN.md, changes after the first run).
          if (!/exceeds the maximum limit of 30 seconds/.test((e as Error).message)) throw e;
          cache[file] = SKIP;
        }
        writeFileSync(cachePath, JSON.stringify(cache, null, 1));
      }
      if (cache[file] === SKIP) { skipped++; continue; }
      const ref = numerals(raw);
      const b = numerals(cache[file]);
      const o = spokenToDigits(cache[file]);
      ok += +(o === ref); okBase += +(b === ref);
      rows.push([dir, id, ref, b, o, +(b === ref), +(o === ref)].join(','));
    }
    const n = items.length - skipped;
    console.log(`${dir} ${split}: ours ${ok}/${n}, baseline ${okBase}/${n} (${skipped} over 30 s left out)`);
  }
  writeFileSync(join(ROOT, `results-${split}${variant ? '-' + variant : ''}.csv`), rows.join('\n') + '\n');
})();
