// Text-only end-to-end check on the live model route (no audio): scam lines on guard, the
// hand-over, the complaint fields, then the pack. Confirms the scam-call record reaches the pack.
// Spends a few model calls. Run: set -a; . ./.env; set +a; npx -y tsx@4.20.6 scripts/pack-text-check.ts [base]
import { capFor } from '../lib/capability';

const BASE = process.argv[2] ?? 'https://utr-pakka.vercel.app';
const session = `packcheck-${Date.now()}`;
const msgs: Array<{ role: string; content: string }> = [];
async function say(text: string, mode: 'guard' | 'complaint' = 'guard') {
  msgs.push({ role: 'user', content: text });
  const r = await fetch(`${BASE}/api/call/chat/completions?session=${session}&lang=en&mode=${mode}`, { method: 'POST', headers: { authorization: `Bearer ${process.env.LLM_SHARED_SECRET}`, 'content-type': 'application/json' }, body: JSON.stringify({ messages: msgs }) });
  const out = (await r.text()).split('\n\n').filter((l) => l.startsWith('data: {')).map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '').join('');
  msgs.push({ role: 'assistant', content: out });
  console.log(`> ${text}\n  ${out.trim().slice(0, 110) || '(silent)'}`);
}
(async () => {
  await say('Hello madam, I am calling from your bank about your KYC.');
  await say('Your KYC expires tonight and your account will be blocked.');
  await say('An OTP has come on your phone, please tell it to me now.');
  await say('Oh no, I already paid 25,000 rupees to them, it was a scam.');
  await say('four zero two one seven seven eight eight nine nine one zero', 'complaint');
  for (const t of ['yes', 'yes', 'It went to ramesh at okaxis', 'yes', 'yesterday at 2:30 in the afternoon', 'yes', 'State Bank of India', 'yes', 'yes'])
    await say(t, 'complaint');
  const card = async () => (await fetch(`${BASE}/api/call/complaint?session=${session}&cap=${capFor(session)}`)).json();
  for (let i = 0; i < 3 && !(await card()).pack?.ok; i++) await say('yes', 'complaint');
  const st = await (await fetch(`${BASE}/api/call/complaint?session=${session}&cap=${capFor(session)}`)).json();
  const rec: string = st.pack?.callRecord ?? '';
  console.log(`pack ok: ${st.pack?.ok}; missing: ${JSON.stringify(st.missing)}`);
  console.log(rec || '(no call record)');
  // Reported before: a new guarded call where the caller names the same UPI ID gets an instant warning.
  const s2 = `packcheck2-${Date.now()}`;
  const r2 = await fetch(`${BASE}/api/call/chat/completions?session=${s2}&lang=en&mode=guard`, { method: 'POST', headers: { authorization: `Bearer ${process.env.LLM_SHARED_SECRET}`, 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Sir, just send the processing fee to ramesh at okaxis and your loan is approved.' }] }) });
  const said = (await r2.text()).split('\n\n').filter((l) => l.startsWith('data: {')).map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '').join('');
  const st2 = await (await fetch(`${BASE}/api/call/complaint?session=${s2}&cap=${capFor(s2)}`)).json();
  const rep = (st2.flags ?? []).some((f: { scam: string }) => f.scam === 'reported_payee');
  console.log(`reported before: ${rep ? 'WARNED' : 'not warned'}: ${said.trim()}`);
  process.exit(st.pack?.ok && /RED FLAG/.test(rec) && rep ? 0 : 1);
})();
