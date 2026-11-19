// Scores the open benchmark (ninth claim): Sarvam saarika:v2.5 transcribes every clip once (cached);
// baseline = the numerals in that transcript, ours = UTR Pakka's number layer on the same transcript.
// Writes evidence/results/benchmark-<date>.csv with ours/baseline columns for evidence/interval.py.
// Run: set -a; . web/.env.local; set +a; npx -y tsx@4.20.6 evidence/benchmark/score.ts
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { spokenToDigits } from '../../web/lib/entities/numbers';
import { PRESETS } from '../../web/lib/agent-config';

const KEY = process.env.SARVAM_EVAL_KEY;
if (!KEY) throw new Error('SARVAM_EVAL_KEY must be set (the test account, never the live key)');
const AUDIO = join(__dirname, '..', '.cache', 'benchmark');
const NUM: Record<string, string> = {};
['०१२३४५६७८९', '০১২৩৪৫৬৭৮৯', '੦੧੨੩੪੫੬੭੮੯', '૦૧૨૩૪૫૬૭૮૯', '௦௧௨௩௪௫௬௭௮௯', '౦౧౨౩౪౫౬౭౮౯', '೦೧೨೩೪೫೬೭೮೯', '൦൧൨൩൪൫൬൭൮൯']
  .forEach((s) => [...s].forEach((c, i) => (NUM[c] = String(i))));
const numerals = (t: string) => [...t].map((c) => (/[0-9]/.test(c) ? c : NUM[c] ?? '')).join('');

async function sarvam(file: string, lang: string): Promise<string> {
  for (let a = 1; ; a++) {
    const fd = new FormData();
    fd.append('file', new Blob([readFileSync(file)], { type: 'audio/wav' }), 'a.wav');
    fd.append('model', 'saarika:v2.5'); fd.append('language_code', lang);
    const r = await fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': KEY! }, body: fd });
    if (r.ok) return ((await r.json()) as { transcript: string }).transcript;
    if (a >= 4 || r.status < 429) throw new Error(`sarvam ${r.status}: ${(await r.text()).slice(0, 120)}`);
    await new Promise((s) => setTimeout(s, 2000 * a));
  }
}

(async () => {
  const refs = readFileSync(join(__dirname, 'references.csv'), 'utf8').trim().split('\n').slice(1).map((l) => {
    const [id, lang, condition, digits, kind] = l.split(',');
    return { id, lang, condition, digits, kind, file: l.split(',').pop()! };
  });
  const rows = ['id,lang,condition,kind,reference,baseline_digits,ours_digits,baseline,ours'];
  for (const r of refs) {
    const cache = join(AUDIO, `${r.id}.txt`);
    const t = existsSync(cache) ? readFileSync(cache, 'utf8') : await sarvam(join(AUDIO, r.file), PRESETS[r.lang as keyof typeof PRESETS].asrLanguage);
    writeFileSync(cache, t);
    const b = numerals(t), o = spokenToDigits(t);
    rows.push([r.id, r.lang, r.condition, r.kind, r.digits, b, o, +(b === r.digits), +(o === r.digits)].join(','));
  }
  const out = join(__dirname, '..', 'results', `benchmark-${new Date().toISOString().slice(0, 10)}.csv`);
  writeFileSync(out, rows.join('\n') + '\n');
  const data = rows.slice(1).map((l) => l.split(','));
  for (const lang of [...new Set(data.map((d) => d[1]))]) {
    const cells = ['clean', 'noise10', 'phone'].map((c) => {
      const x = data.filter((d) => d[1] === lang && d[2] === c);
      return `${c} ours ${x.filter((d) => d[8] === '1').length}/${x.length} base ${x.filter((d) => d[7] === '1').length}/${x.length}`;
    });
    console.log(`${lang}: ${cells.join(' | ')}`);
  }
  console.log(`results: ${out}`);
})();
