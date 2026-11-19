// Walks the live demo path in a real browser and records a video of it (the rough cut).
// Spends real Agora, Sarvam, Murf and model credits, so it runs at milestones, not on every stop.
// Run: set -a; . ./.env; set +a; npx -y tsx@4.20.6 scripts/demo-check.ts [https://utr-pakka.vercel.app]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { capFor } from '../lib/capability';

const BASE = process.argv[2] ?? 'https://utr-pakka.vercel.app';
const SECRET = process.env.LLM_SHARED_SECRET;
const OUT = new URL('../../evidence/.cache/demo-video/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const fail = (m: string) => { console.error(`DEMO CHECK FAILED: ${m}`); process.exit(1); };

async function sse(path: string, content: string, session: string, extra = '') {
  const r = await fetch(`${BASE}/api/call/chat/completions?session=${session}${extra}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content }] }),
  });
  return (await r.text()).split('\n\n').filter((l) => l.startsWith('data: {')).map((l) => JSON.parse(l.slice(6)).choices[0].delta.content ?? '').join('');
}

(async () => {
  // 1. The guard, in a real browser, with the sample scam call
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ recordVideo: { dir: OUT, size: { width: 1280, height: 800 } }, viewport: { width: 1280, height: 800 }, permissions: ['microphone'] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?lang=te`);
  await page.getByRole('button', { name: /Let UTR Pakka listen/ }).click();
  await page.getByTestId('guard-listening').waitFor({ timeout: 30000 }).catch(() => fail('guard did not start'));
  await page.getByRole('button', { name: /Play a sample scam call/ }).click();
  await page.getByTestId('red-flags').waitFor({ timeout: 60000 }).catch(() => fail('no scam warning within 60 s of the sample call'));
  const flagged = await page.getByTestId('red-flags').innerText();
  console.log('guard flagged:', flagged.split('\n').slice(0, 2).join(' / '));
  await page.waitForTimeout(6000);
  // The caller's words must show in the live transcript, not only in the warning card.
  const bubbles = await page.locator('.up-bubble').count();
  console.log('transcript bubbles:', bubbles);
  if (bubbles === 0) fail('the live transcript stayed empty during the guard run');
  await page.getByRole('button', { name: /End conversation/i }).click().catch(() => {});
  await ctx.close();
  console.log('video:', await page.video()?.path());
  await browser.close();

  // 2. The complaint through the live model route (no microphone needed)
  if (!SECRET) fail('LLM_SHARED_SECRET not set');
  const s = `demo-check-${Date.now()}`;
  const said = await sse('', 'UTR నాలుగు సున్నా రెండు ఒకటి ఏడు ఏడు ఎనిమిది ఎనిమిది తొమ్మిది తొమ్మిది ఒకటి సున్నా', s, '&lang=te&mode=complaint');
  const c = await (await fetch(`${BASE}/api/call/complaint?session=${s}&cap=${capFor(s)}`)).json();
  if (c.fields?.utr?.value !== '402177889910') fail(`UTR not captured exactly: ${JSON.stringify(c.fields)}`);
  console.log('complaint: UTR captured', c.fields.utr.value, '| agent said:', said.slice(0, 80));
  console.log('DEMO CHECK PASSED');
})();
