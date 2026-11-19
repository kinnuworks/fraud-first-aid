// Eighth claim (EVAL_PLAN.md): our own break test of the scam guard on ordinary calls.
// 24 calls we wrote (en, hi, te), sent one turn at a time to the live model route in guard mode.
// Pass = silent for the whole call, no red flag on the card, no switch to taking a complaint.
// Run: set -a; . web/.env; set +a; npx -y tsx@4.20.6 evidence/breaktest/ordinary.ts [base]
import { writeFileSync, mkdirSync } from 'fs';
import { capFor } from '../../web/lib/capability';

const BASE = process.argv[2] ?? 'https://utr-pakka.vercel.app';
const SECRET = process.env.LLM_SHARED_SECRET;
if (!SECRET) throw new Error('LLM_SHARED_SECRET must be set');

const CALLS: Array<[string, string[]]> = [
  ['en', ["Hello, I'm from the courier, I'm near your building.", 'Okay, come to the second floor.', 'Should I leave it with the security?', 'Yes, please leave it there, thank you.']],
  ['en', ['Hey, did you get the 500 I sent on GPay for dinner?', 'Yes, got it, thanks.', 'Cool, see you on Saturday.']],
  ['en', ['Good afternoon, this is a reminder from your bank that your credit card bill of 12,400 rupees is due on the 25th.', "Okay, I'll pay it from the app.", 'Thank you, have a nice day.']],
  ['en', ['Did you eat? Your father is asking when you are coming home.', "I'll come by eight.", 'Bring milk on the way.']],
  ['en', ['Your appointment with Dr Rao is confirmed for tomorrow at 11.', 'Can I move it to 12?', 'Yes, 12 is fine. See you then.']],
  ['en', ['Did you pay the electricity bill?', 'Yes, I already paid it yesterday on PhonePe.', 'Good, the due date was today.']],
  ['en', ['The meeting moved to 4 pm, can you share the deck?', "Sure, I'll email it now.", 'Thanks, see you there.']],
  ['en', ['Hi, about the rent for this month.', 'I transferred 15,000 this morning.', 'Got it, thanks.']],
  ['hi', ['Beta, khana kha liya?', 'Haan maa, kha liya.', 'Theek hai, jaldi so jana.']],
  ['hi', ['Bhaiya, main gate pe khada hoon, parcel le lo.', 'Aa raha hoon, do minute.']],
  ['hi', ['Kal ki train ka ticket book ho gaya?', 'Haan, PNR ka message aa gaya hai.', 'Badhiya.']],
  ['hi', ['मैंने बिजली का बिल भर दिया है।', 'अच्छा, कितना आया?', 'दो हज़ार तीन सौ।']],
  ['hi', ['Doston ke saath movie chal rahe ho?', 'Haan, ticket maine book kar diye.', 'Paise baad mein de dunga.']],
  ['hi', ['Sir, aapka gas cylinder kal subah aayega.', 'Theek hai, ghar pe koi hoga.']],
  ['hi', ['Dukaan band ho gayi kya?', 'Nahi, nau baje tak khuli hai.']],
  ['hi', ['Maine tumhe 200 rupaye bhej diye, chai ke.', 'Mil gaye, thanks.']],
  ['te', ['అమ్మా, భోజనం చేశావా?', 'చేశాను రా, నువ్వు?', 'ఇప్పుడే తిన్నా.']],
  ['te', ['సార్, మీ పార్సిల్ వచ్చింది, గేట్ దగ్గర ఉన్నాను.', 'వస్తున్నా, రెండు నిమిషాలు.']],
  ['te', ['రేపు మీటింగ్ పది గంటలకు.', 'సరే, నేను వస్తాను.']],
  ['te', ['కరెంట్ బిల్ కట్టావా?', 'కట్టాను, నిన్నే ఫోన్‌పేలో.']],
  ['te', ['డాక్టర్ అపాయింట్‌మెంట్ సాయంత్రం ఐదుకి.', 'సరే, థాంక్స్.']],
  ['te', ['బస్ ఎప్పుడు వస్తుంది?', 'ఇంకో పది నిమిషాల్లో.']],
  ['te', ['నీకు ఐదు వందలు పంపాను, చూసుకో.', 'వచ్చింది, థాంక్స్.']],
  ['te', ['పిల్లలు స్కూల్ నుంచి వచ్చారా?', 'వచ్చారు, హోంవర్క్ చేస్తున్నారు.']],
];

async function turn(session: string, lang: string, msgs: Array<{ role: string; content: string }>) {
  for (let a = 1; ; a++) {
    const r = await fetch(`${BASE}/api/call/chat/completions?session=${session}&lang=${lang}&mode=guard`, {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' },
      body: JSON.stringify({ messages: msgs }),
    });
    if (r.ok) return (await r.text()).split('\n\n').filter((l) => l.startsWith('data: {')).map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '').join('');
    if (a >= 4) throw new Error(`route ${r.status}`);
    await new Promise((s) => setTimeout(s, 2000 * a));
  }
}
async function card(session: string) {
  const r = await fetch(`${BASE}/api/call/complaint?session=${session}&cap=${capFor(session)}`);
  if (!r.ok) throw new Error(`card ${r.status}`);
  return (await r.json()) as { flags?: unknown[]; phase?: string };
}

(async () => {
  const rows = ['lang,call,passed,what,turn,line,said'];
  let pass = 0;
  for (const [i, [lang, turns]] of CALLS.entries()) {
    const session = `ordinary-${Date.now()}-${i}`;
    const msgs: Array<{ role: string; content: string }> = [];
    let what = '', at = -1, line = '', said = '';
    for (const [k, t] of turns.entries()) {
      msgs.push({ role: 'user', content: t });
      const s = await turn(session, lang, msgs);
      msgs.push({ role: 'assistant', content: s });
      const c = await card(session);
      what = c.phase === 'complaint' ? 'switched to a complaint' : (c.flags?.length ?? 0) > 0 ? 'flagged' : s.trim() ? 'spoke' : '';
      if (what) { at = k; line = t; said = s.trim(); break; }
    }
    if (!what) pass++;
    console.log(`${i} ${lang} ${what ? `FAIL (${what}) at turn ${at + 1}: "${line}" -> ${said.slice(0, 90)}` : 'silent'}`);
    rows.push([lang, i, +!what, what, at + 1, JSON.stringify(line), JSON.stringify(said.slice(0, 200))].join(','));
  }
  console.log(`Ordinary calls: ${pass}/${CALLS.length} passed (silent, no flag, no switch)`);
  mkdirSync(new URL('../.cache/', import.meta.url).pathname, { recursive: true });
  writeFileSync(new URL('../.cache/guard-ordinary.csv', import.meta.url).pathname, rows.join('\n') + '\n');
})();
