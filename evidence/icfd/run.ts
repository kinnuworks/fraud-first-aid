// Seventh claim (EVAL_PLAN.md): the scam guard on ICFD-31k's held-out cross-domain conversations.
// Synthetic conversations (written by a language model), English and Hinglish, text not audio.
// Every turn (both speakers) goes to the live model route in guard mode; a conversation stops at the
// first warning (a red flag on the call's card). Baseline: our keyword rules alone on the same turns.
// Run: set -a; . web/.env; set +a; npx -y tsx@4.20.6 evidence/icfd/run.ts [base]
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { capFor } from '../../web/lib/capability';
import { detectRedFlag } from '../../web/lib/complaint/redflags';

const BASE = process.argv[2] ?? 'https://utr-pakka.vercel.app';
const SECRET = process.env.LLM_SHARED_SECRET;
if (!SECRET) throw new Error('LLM_SHARED_SECRET must be set');
const REV = 'e91937a718b4cec97b8c06820225a9bdc30dd84a';
const CACHE = join(__dirname, '..', '.cache', 'icfd');
mkdirSync(CACHE, { recursive: true });
const FILE = join(CACHE, 'cross_domain-00000-of-00001.zst');
if (!existsSync(FILE)) execFileSync('curl', ['-sfL', '-o', FILE, `https://huggingface.co/datasets/rishia2220/icfd-31k/resolve/${REV}/source_conversations/cross_domain-00000-of-00001.jsonl.zst`]);

type Turn = { speaker: string; text: string; timestamp_end: number };
type Conv = { transcript: Turn[]; chunk_level_analysis: Array<{ timestamp: number; verdict_at_chunk: string }>; final_verdict: string; release_metadata: { conversation_uid: string }; scenario: { case_type: string } };
const all: Conv[] = execFileSync('zstd', ['-dcq', FILE], { maxBuffer: 1 << 28 }).toString().trim().split('\n').map((l) => JSON.parse(l));

let seed = 7;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const yes = all.filter((c) => c.final_verdict === 'YES');
for (let i = yes.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [yes[i], yes[j]] = [yes[j], yes[i]]; }
const sample = [...yes.slice(0, 200), ...all.filter((c) => c.final_verdict === 'NO')];

const HANGUP = /hang up|cut the call|phone cut|kaat|काट/i;
async function turn(session: string, msgs: Array<{ role: string; content: string }>) {
  for (let a = 1; ; a++) {
    const r = await fetch(`${BASE}/api/call/chat/completions?session=${session}&lang=en&mode=guard`, { method: 'POST', headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' }, body: JSON.stringify({ messages: msgs }) });
    if (r.ok) return (await r.text()).split('\n\n').filter((l) => l.startsWith('data: {')).map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '').join('');
    if (a >= 4) throw new Error(`route ${r.status}`);
    await new Promise((s) => setTimeout(s, 2000 * a));
  }
}
async function card(session: string) {
  const r = await fetch(`${BASE}/api/call/complaint?session=${session}&cap=${capFor(session)}`);
  if (!r.ok) return null;
  return (await r.json()) as { flags?: unknown[]; phase?: string };
}

async function one(c: Conv, idx: number) {
  const session = `icfd-${Date.now()}-${idx}`;
  const firstYesTs = c.chunk_level_analysis.find((k) => k.verdict_at_chunk === 'YES')?.timestamp;
  const labelTurn = firstYesTs === undefined ? -1 : c.transcript.findIndex((t) => t.timestamp_end >= firstYesTs);
  const baseTurn = c.transcript.findIndex((t) => detectRedFlag(t.text));
  const msgs: Array<{ role: string; content: string }> = [];
  let warnTurn = -1, handover = -1, unavailable = false;
  for (const [i, t] of c.transcript.entries()) {
    msgs.push({ role: 'user', content: `${t.speaker === 'Agent' ? 'Caller' : 'Me'}: ${t.text}` });
    const said = await turn(session, msgs);
    msgs.push({ role: 'assistant', content: said });
    const k = await card(session);
    if (k === null) unavailable = true;
    if ((k?.flags?.length ?? 0) > 0 || (k === null && HANGUP.test(said))) { warnTurn = i; break; }
    if (k?.phase === 'complaint') { handover = i; break; }
  }
  return { uid: c.release_metadata.conversation_uid, verdict: c.final_verdict, type: c.scenario.case_type, turns: c.transcript.length, labelTurn, warnTurn, baseTurn, handover, unavailable };
}

(async () => {
  const out = join(CACHE, 'results.jsonl');
  const done = new Map<string, unknown>(existsSync(out) ? readFileSync(out, 'utf8').trim().split('\n').filter(Boolean).map((l) => { const r = JSON.parse(l); return [r.uid, r]; }) : []);
  const todo = sample.map((c, i) => [c, i] as const).filter(([c]) => !done.has(c.release_metadata.conversation_uid));
  let next = 0;
  await Promise.all(Array.from({ length: 1 }, async () => {
    while (next < todo.length) {
      const [c, i] = todo[next++];
      const r = await one(c, i).catch((e) => ({ uid: c.release_metadata.conversation_uid, error: String(e) }));
      writeFileSync(out, JSON.stringify(r) + '\n', { flag: 'a' });
      process.stdout.write('.');
    }
  }));
  const rows = readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => !r.error);
  const csv = ['uid,verdict,type,turns,label_turn,warn_turn,baseline_turn,handover_turn,ours,baseline,early', ...rows.map((r) => [r.uid, r.verdict, r.type, r.turns, r.labelTurn, r.warnTurn, r.baseTurn, r.handover, +(r.warnTurn >= 0), +(r.baseTurn >= 0), +(r.warnTurn >= 0 && r.labelTurn >= 0 && r.warnTurn <= r.labelTurn)].join(','))];
  writeFileSync(join(CACHE, 'results.csv'), csv.join('\n') + '\n');
  const f = rows.filter((r) => r.verdict === 'YES'), n = rows.filter((r) => r.verdict === 'NO');
  const warned = f.filter((r) => r.warnTurn >= 0);
  const med = warned.map((r) => r.warnTurn + 1).sort((a, b) => a - b)[Math.floor(warned.length / 2)];
  console.log(`\nfraud: ours ${warned.length}/${f.length}, keyword baseline ${f.filter((r) => r.baseTurn >= 0).length}/${f.length}; at or before the dataset's first fraud label: ${f.filter((r) => r.warnTurn >= 0 && r.labelTurn >= 0 && r.warnTurn <= r.labelTurn).length}/${f.length}; median turn of first warning ${med}; handed over to a complaint instead: ${f.filter((r) => r.handover >= 0).length}`);
  console.log(`no-violation (NO): ours warned ${n.filter((r) => r.warnTurn >= 0).length}/${n.length}, baseline ${n.filter((r) => r.baseTurn >= 0).length}/${n.length}; errors: ${readFileSync(out, 'utf8').split('"error"').length - 1}`);
})();
