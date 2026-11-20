// Tenth claim (EVAL_PLAN.md): the scam guard in eight of our ten languages, on INDICA's conversations
// (machine-translated into Indian languages; text, not audio). Every line, speaker labels removed (the
// app hears one stream on speaker), goes to the live model route in guard mode in that language; a
// conversation stops at the first warning. Baseline: our keyword rules alone on the same lines.
// Aggregate numbers only: the conversations are never copied out of the cache or quoted.
// Run: set -a; . web/.env; set +a; npx -y tsx@4.20.6 evidence/indica/run.ts check|test [base]
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { capFor } from '../../web/lib/capability';
import { detectRedFlag, saysHangUp } from '../../web/lib/complaint/redflags';
import { wilson } from '../wilson';

const SAMPLE = process.argv[2] === 'test' ? 'test' : 'check';
const BASE = process.argv[3] ?? 'https://fraudfirstaid.vercel.app';
const SECRET = process.env.LLM_SHARED_SECRET;
if (!SECRET) throw new Error('LLM_SHARED_SECRET must be set');
const CACHE = join(__dirname, '..', '.cache', 'indica');
const ROOT = join(CACHE, 'text', 'Text_samples');
mkdirSync(CACHE, { recursive: true });
if (!existsSync(ROOT)) {
  const tgz = join(CACHE, 'Text_samples.tar.gz');
  if (!existsSync(tgz)) execFileSync('curl', ['-sfL', '-o', tgz, 'https://huggingface.co/datasets/vikrant-vikram/INDICA/resolve/main/Text_samples.tar.gz']);
  mkdirSync(join(CACHE, 'text'), { recursive: true });
  execFileSync('tar', ['-xzf', tgz, '-C', join(CACHE, 'text')]);
}

const LANGS: Array<[string, string]> = [['telugu', 'te'], ['hindi', 'hi'], ['kannada', 'kn'], ['tamil', 'ta'], ['malayalam', 'ml'], ['bengali', 'bn'], ['gujarati', 'gu'], ['english', 'en']];
const MAX_LINES = 16;
const PER = SAMPLE === 'check' ? 10 : 25;

// Seeded shuffle (mulberry32), the same generator as the ICFD runner.
const shuffled = <T,>(xs: T[], s: number) => {
  let seed = s;
  const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
// Check sample: the first 10 of the seed-13 order; test sample: the first 25 of the seed-29 order that
// are not in the check sample (no overlap).
function pick(dir: string): string[] {
  const files = readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
  const check = shuffled(files, 13).slice(0, 10);
  if (SAMPLE === 'check') return check;
  const seen = new Set(check);
  return shuffled(files, 29).filter((f) => !seen.has(f)).slice(0, PER);
}

type Item = { lang: string; code: string; label: 'scam' | 'legit'; file: string };
const items: Item[] = LANGS.flatMap(([name, code]) =>
  (['scam', 'legit'] as const).flatMap((label) => pick(join(ROOT, `Text_${name}`, label)).map((file) => ({ lang: name, code, label, file }))),
);

async function turn(session: string, code: string, msgs: Array<{ role: string; content: string }>) {
  for (let a = 1; ; a++) {
    const r = await fetch(`${BASE}/api/call/chat/completions?session=${session}&lang=${code}&mode=guard`, { method: 'POST', headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' }, body: JSON.stringify({ messages: msgs }) });
    if (r.ok) return (await r.text()).split('\n\n').filter((l) => l.startsWith('data: {')).map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '').join('');
    if (a >= 4) throw new Error(`route ${r.status}`);
    await new Promise((s) => setTimeout(s, 2000 * a));
  }
}
async function card(session: string) {
  const r = await fetch(`${BASE}/api/call/complaint?session=${session}&cap=${capFor(session)}`);
  return r.ok ? ((await r.json()) as { flags?: unknown[]; phase?: string }) : null;
}

async function one(it: Item, idx: number) {
  const lines = readFileSync(join(ROOT, `Text_${it.lang}`, it.label, it.file), 'utf8')
    .split('\n').map((l) => l.replace(/^\s*Speaker\s*\d+\s*[:：]\s*/i, '').replace(/^"|"$/g, '').trim()).filter(Boolean).slice(0, MAX_LINES);
  const session = `indica-${SAMPLE}-${Date.now()}-${idx}`;
  const msgs: Array<{ role: string; content: string }> = [];
  let warnLine = -1, handover = -1;
  for (const [i, text] of lines.entries()) {
    msgs.push({ role: 'user', content: text });
    const said = await turn(session, it.code, msgs);
    msgs.push({ role: 'assistant', content: said });
    const k = await card(session);
    if ((k?.flags?.length ?? 0) > 0 || saysHangUp(said)) { warnLine = i; break; }
    if (k?.phase === 'complaint') { handover = i; break; }
  }
  const baseLine = lines.findIndex((t) => detectRedFlag(t));
  return { id: `${it.lang}/${it.label}/${it.file}`, lang: it.code, label: it.label, lines: lines.length, warnLine, handover, baseLine };
}

(async () => {
  const out = join(CACHE, `${SAMPLE}-results.jsonl`);
  const done = new Set(existsSync(out) ? readFileSync(out, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).id) : []);
  const todo = items.map((it, i) => [it, i] as const).filter(([it]) => !done.has(`${it.lang}/${it.label}/${it.file}`));
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < todo.length) {
      const [it, i] = todo[next++];
      const r = await one(it, i).catch((e) => ({ id: `${it.lang}/${it.label}/${it.file}`, lang: it.code, label: it.label, error: String(e) }));
      writeFileSync(out, JSON.stringify(r) + '\n', { flag: 'a' });
      process.stdout.write('error' in r ? 'x' : '.');
    }
  }));
  const rows = readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => !r.error);
  const errors = readFileSync(out, 'utf8').split('"error"').length - 1;
  const pct = (k: number, n: number) => { const [lo, hi] = wilson(k, n); return `${k}/${n} (${(100 * lo).toFixed(0)}-${(100 * hi).toFixed(0)}%)`; };
  console.log(`\n${SAMPLE} sample, ${rows.length} conversations, ${errors} errors`);
  const report = (code: string, rs: typeof rows) => {
    const s = rs.filter((r) => r.label === 'scam'), l = rs.filter((r) => r.label === 'legit');
    console.log(`${code.padEnd(6)} scam warned ${pct(s.filter((r) => r.warnLine >= 0).length, s.length)}, keyword rules ${s.filter((r) => r.baseLine >= 0).length}/${s.length}; legit warned ${pct(l.filter((r) => r.warnLine >= 0).length, l.length)}, keyword rules ${l.filter((r) => r.baseLine >= 0).length}/${l.length}; handed over ${rs.filter((r) => r.handover >= 0).length}`);
  };
  for (const [, code] of LANGS) report(code, rows.filter((r) => r.lang === code));
  report('all', rows);
  if (SAMPLE === 'test') {
    const date = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
    writeFileSync(join(__dirname, '..', 'results', `indica-test-${date}.csv`), ['lang,label,lines,warn_line,handover_line,baseline_line,ours,baseline', ...rows.map((r) => [r.lang, r.label, r.lines, r.warnLine, r.handover, r.baseLine, +(r.warnLine >= 0), +(r.baseLine >= 0)].join(','))].join('\n') + '\n');
  }
})();
