// Eleventh claim (EVAL_PLAN.md), system (b): a general AI assistant on the seventh claim's ICFD-31k
// sample. The same model as our route (claude-haiku-5-5, through the same client library the app
// uses), given only the pre-registered prompt below, one call per line with the conversation so far;
// a conversation stops at the first warning. Warned: the reply tells the user to hang up or names
// the call a scam or fraud (the same rule applied to our guard's replies in run.ts --rule text).
// Run: set -a; . web/.env; set +a; npx -y tsx@4.20.6 evidence/icfd/generic.ts
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { saysHangUp } from '../../web/lib/complaint/redflags';
import { wilson } from '../wilson';

const req = createRequire(join(__dirname, '..', '..', 'web', 'package.json'));
const { generateText } = req('ai') as typeof import('ai');
const { createAnthropic } = req('@ai-sdk/anthropic') as typeof import('@ai-sdk/anthropic');
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-5-5';
const SYSTEM = 'You are a helpful AI assistant. The user has put a phone call on speaker so you can hear it; you get what is said, line by line. If you think the call is a scam, warn the user. Otherwise reply with exactly <silent>.';

const REV = 'e91937a718b4cec97b8c06820225a9bdc30dd84a';
const CACHE = join(__dirname, '..', '.cache', 'icfd');
const FILE = join(CACHE, 'cross_domain-00000-of-00001.zst');
if (!existsSync(FILE)) execFileSync('curl', ['-sfL', '-o', FILE, `https://huggingface.co/datasets/rishia2220/icfd-31k/resolve/${REV}/source_conversations/cross_domain-00000-of-00001.jsonl.zst`]);
type Turn = { speaker: string; text: string };
type Conv = { transcript: Turn[]; final_verdict: string; release_metadata: { conversation_uid: string } };
const all: Conv[] = execFileSync('zstd', ['-dcq', FILE], { maxBuffer: 1 << 28 }).toString().trim().split('\n').map((l) => JSON.parse(l));
// The seventh claim's sample, drawn exactly as evidence/icfd/run.ts draws it (seed 7).
let seed = 7;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const yes = all.filter((c) => c.final_verdict === 'YES');
for (let i = yes.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [yes[i], yes[j]] = [yes[j], yes[i]]; }
const TWELFTH = process.argv.includes('--twelfth');
function fresh(): Conv[] {
  const used = new Set(yes.slice(0, 200).map((c) => c.release_metadata.conversation_uid));
  const pool = all.filter((c) => c.final_verdict === 'YES');
  let s17 = 17;
  const r17 = () => { s17 |= 0; s17 = (s17 + 0x6d2b79f5) | 0; let t = Math.imul(s17 ^ (s17 >>> 15), 1 | s17); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r17() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.filter((c) => !used.has(c.release_metadata.conversation_uid)).slice(0, 200);
}
const sample = [...(TWELFTH ? fresh() : yes.slice(0, 200)), ...all.filter((c) => c.final_verdict === 'NO')];

export const NAMES_SCAM = /\b(scam|scammer|fraud|fraudulent|fake call)\b|धोखा|फ्रॉड|ठगी|स्कैम/i;
const warns = (reply: string) => reply.trim() !== '<silent>' && (saysHangUp(reply) || NAMES_SCAM.test(reply));

async function reply(messages: Array<{ role: 'user' | 'assistant'; content: string }>) {
  for (let a = 1; ; a++) {
    try {
      const r = await generateText({ model: anthropic(MODEL), system: SYSTEM, messages, maxOutputTokens: 300 });
      return r.text;
    } catch (e) {
      if (a >= 4) throw e;
      await new Promise((s) => setTimeout(s, 2000 * a));
    }
  }
}

async function one(c: Conv) {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let warnTurn = -1;
  for (const [i, t] of c.transcript.entries()) {
    messages.push({ role: 'user', content: `${t.speaker === 'Agent' ? 'Caller' : 'Me'}: ${t.text}` });
    const said = await reply(messages);
    messages.push({ role: 'assistant', content: said || '<silent>' });
    if (warns(said)) { warnTurn = i; break; }
  }
  return { uid: c.release_metadata.conversation_uid, verdict: c.final_verdict, turns: c.transcript.length, warnTurn };
}

(async () => {
  const tag = TWELFTH ? 'twelfth' : 'eleventh';
  const out = join(CACHE, TWELFTH ? 'generic-twelfth-results.jsonl' : 'generic-results.jsonl');
  const done = new Set(existsSync(out) ? readFileSync(out, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).uid) : []);
  const todo = sample.filter((c) => !done.has(c.release_metadata.conversation_uid));
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < todo.length) {
      const c = todo[next++];
      const r = await one(c).catch((e) => ({ uid: c.release_metadata.conversation_uid, error: String(e) }));
      writeFileSync(out, JSON.stringify(r) + '\n', { flag: 'a' });
      process.stdout.write('error' in r ? 'x' : '.');
    }
  }));
  const rows = readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => !r.error);
  const f = rows.filter((r) => r.verdict === 'YES'), n = rows.filter((r) => r.verdict === 'NO');
  const k = f.filter((r) => r.warnTurn >= 0).length, kn = n.filter((r) => r.warnTurn >= 0).length;
  const [lo, hi] = wilson(k, f.length), [lo2, hi2] = wilson(kn, n.length);
  console.log(`\ngeneral assistant (${MODEL}, plain prompt): fraud warned ${k}/${f.length} (${(100 * lo).toFixed(1)}-${(100 * hi).toFixed(1)}%); no-violation warned ${kn}/${n.length} (${(100 * lo2).toFixed(1)}-${(100 * hi2).toFixed(1)}%)`);
  const date = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  writeFileSync(join(__dirname, '..', 'results', TWELFTH ? `icfd-generic-twelfth-${date}.csv` : `icfd-generic-${date}.csv`), ['uid,verdict,turns,warn_turn,warned', ...rows.map((r) => [r.uid, r.verdict, r.turns, r.warnTurn, +(r.warnTurn >= 0)].join(','))].join('\n') + '\n');
})();
