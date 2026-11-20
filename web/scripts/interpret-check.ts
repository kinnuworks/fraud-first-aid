// Interpreter check: the full complaint with labelled sample voices (as in demo-full.ts), then
// 'Speak to 1930 for me' and a sample 1930 operator (English) on the same call. Passes when the
// interpreter gives the operator the confirmed UTR, relays the caller's Telugu answer in English,
// and keeps the acknowledgement number. Spends real credits.
// Run: npx -y tsx@4.20.6 scripts/interpret-check.ts [https://fraudfirstaid.vercel.app]
// (Original demo-full notes follow.)
// Records the whole story in one call, with labelled sample voices (no human speaking):
// BEFORE: the guard hears a sample scam call and warns in Telugu.
// DURING: a sample caller says money has gone, gives the UTR (misremembering one group), adds the
//         payment screenshot, the agent catches the difference, the caller confirms the screenshot.
// AFTER:  payee, time and bank are confirmed and the pack appears (1930, letter, reminders).
// Spends real Agora/Sarvam/Murf/model credits. Video: evidence/.cache/demo-full/
// Run: npx -y tsx@4.20.6 scripts/demo-full.ts [https://fraudfirstaid.vercel.app]
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.argv[2] ?? 'https://fraudfirstaid.vercel.app';
const HERE = new URL('.', import.meta.url).pathname;
const OUT = new URL('../../evidence/.cache/interpret/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const lat: Array<{ clip: string; ttlw?: number; ttfs?: number; ttfb?: number }> = [];
const log = (m: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

async function idle(page: Page, ms = 45000) {
  // wait for the agent to finish: no "Talking"/"Thinking" label for 2 s (after it has started replying)
  const end = Date.now() + ms;
  const busy = async () =>
    (await page.getByText('Talking', { exact: true }).isVisible().catch(() => false)) ||
    (await page.getByText('Thinking', { exact: true }).isVisible().catch(() => false));
  // first wait (up to 15 s) for the agent to start replying, then for it to finish
  const start = Date.now();
  while (Date.now() - start < 15000 && !(await busy())) await page.waitForTimeout(200);
  let since = 0;
  while (Date.now() < end) {
    if (!(await busy())) { if (!since) since = Date.now(); if (Date.now() - since > 2000) return; } else since = 0;
    await page.waitForTimeout(250);
  }
  log('  (agent still busy after timeout)');
}
const play = async (page: Page, clip: string) => {
  log(`play ${clip}`);
  const go = () => page.evaluate((u) => (window as unknown as { __utrPakkaPlay: (u: string) => Promise<void> }).__utrPakkaPlay(u), `/demo/${clip}.wav`);
  // a clip that fails to download (this machine's network, not the app) is fetched again, up to
  // three more times with a growing wait (a busy machine dropped two fetches in a row, 20 Nov)
  for (let a = 0; ; a++) {
    try { await go(); break; } catch (e) {
      if (a >= 3) throw e;
      log(`  clip fetch failed (${String(e).slice(0, 80)}); retrying`);
      await page.waitForTimeout(3000 * (a + 1));
    }
  }
  await idle(page);
  // Agora's live pipeline metrics for this turn, as shown in the call screen's pipeline bar
  // (the interpreter's screen has no pipeline bar: don't wait 30 s for one)
  const pipe = page.locator('.up-pipe').first();
  const bar = (await pipe.count()) ? (await pipe.innerText({ timeout: 2000 }).catch(() => '')) || '' : '';
  const n = (k: string) => { const m = bar.match(new RegExp(`${k}\\s*(\\d+)\\s*ms`)); return m ? Number(m[1]) : undefined; };
  lat.push({ clip, ttlw: n('ttlw'), ttfs: n('ttfs'), ttfb: n('ttfb') });
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${HERE}fixtures/silence.wav`, '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ recordVideo: { dir: OUT, size: { width: 1280, height: 800 } }, viewport: { width: 1280, height: 800 }, permissions: ['microphone'] });
  const page = await ctx.newPage();
  let session = '';
  let cap = '';
  page.on('request', (r) => { const m = r.url().match(/complaint\?session=([\w-]+)&cap=(\w+)/); if (m) { session = m[1]; cap = m[2]; } });
  await page.goto(`${BASE}/?lang=te&demo=1`);
  await page.getByRole('button', { name: /let it listen/i }).click();
  await page.getByTestId('guard-listening').waitFor({ timeout: 30000 });
  log('guard on; playing the sample scam call');
  await page.getByRole('button', { name: /Play a sample scam call/ }).click();
  await page.getByTestId('red-flags').waitFor({ timeout: 60000 });
  log('scam warning given');
  await idle(page);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}1-guard-warned.png` });

  await play(page, 'victim-1-lost');
  await play(page, 'victim-2-utr');
  await page.screenshot({ path: `${OUT}2-utr-read-back.png` });
  const input = page.locator('input[type=file]');
  if (await input.count()) {
    log('adding the payment screenshot');
    await input.setInputFiles(`${HERE}fixtures/sample-payment.png`);
    await page.locator('[data-check="mismatch"]').waitFor({ timeout: 60000 }).then(async () => { log('mismatch shown on the card'); await page.waitForTimeout(1500); await page.screenshot({ path: `${OUT}3-screenshot-mismatch.png` }); }).catch(() => log('no mismatch shown'));
  } else log('no screenshot input (still on guard?)');
  await play(page, 'victim-3-screenshot-right');
  await play(page, 'victim-4-yes');
  for (const clip of ['victim-5-payee', 'victim-4-yes', 'victim-6-when', 'victim-4-yes', 'victim-7-bank', 'victim-4-yes']) await play(page, clip);
  for (let i = 0; i < 3 && !(await page.getByTestId('pack').isVisible().catch(() => false)); i++) await play(page, 'victim-4-yes');
  const packed = await page.getByTestId('pack').isVisible().catch(() => false);
  log(packed ? 'PACK READY' : 'pack not ready');
  if (session) {
    const st = await (await fetch(`${BASE}/api/call/complaint?session=${session}&cap=${cap}`)).json();
    log(`state: ${JSON.stringify(st.fields)}`);
    for (const t of st.trace ?? []) log(`  turn: ${t}`);
  }
  if (!packed) { log('FAIL: no pack, so no interpreter'); await browser.close(); process.exit(1); }
  const agentText = async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    return (await page.locator('.up-transcript').first().innerText().catch(() => '')) || '';
  };
  await page.getByTestId('interpret-1930').click();
  await page.getByTestId('interpreter-on').waitFor({ timeout: 30000 });
  log('interpreter on; waiting for its greeting');
  await idle(page, 30000);
  await page.waitForTimeout(1500);
  await play(page, 'operator-1-hello');
  await agentText();
  await page.screenshot({ path: `${OUT}interp-hello.png` });
  await play(page, 'operator-2-utr');
  await page.screenshot({ path: `${OUT}interp-utr.png`, fullPage: true });
  const afterUtr = await agentText();
  await play(page, 'operator-3-name');
  await play(page, 'victim-8-name');
  await play(page, 'operator-4-ack');
  // wait for the number to reach the call (a busy machine has delayed the clip by a minute), then
  // for the read-back to finish, so the transcript holds the whole exchange
  const ackBy = Date.now() + 120000;
  let heard = '';
  while (Date.now() < ackBy && !heard) {
    heard = String((await (await fetch(`${BASE}/api/call/complaint?session=${session}&cap=${cap}`)).json().catch(() => ({}))).ack1930 ?? '');
    if (!heard) await page.waitForTimeout(2000);
  }
  log(heard ? `acknowledgement number saved: ${heard}` : 'no acknowledgement number after 2 minutes');
  await idle(page, 60000);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}interp-final.png`, fullPage: true });
  const all = await agentText();
  await page.screenshot({ path: `${OUT}interp-transcript.png` });
  (await import('fs')).writeFileSync(`${OUT}transcript.txt`, all);
  const st = await (await fetch(`${BASE}/api/call/complaint?session=${session}&cap=${cap}`)).json();
  const utr = String(st.fields?.utr?.value ?? '');
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine'];
  const spokenUtr = utr.split('').map((d) => words[Number(d)]).join(' ');
  const flat = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ');
  const gaveUtr = utr.length === 12 && (flat(afterUtr).replace(/ /g, '').includes(utr) || flat(afterUtr).includes(spokenUtr));
  const relayedName = /lakshmi|laxmi/i.test(all);
  const ack = st.ack1930;
  const steps: Array<{ text: string }> = st.actions ?? [];
  // the interpreter's turn shapes (lengths and digit counts, never words; only with DEBUG_TURNS=1)
  for (const t of (st.trace ?? []).filter((x: string) => x.startsWith('interpret'))) log(`  turn: ${t}`);
  log(`screenshot cut-in spoken (Agora speak): ${steps.some((a) => /Agora speak/.test(a.text))}`);
  log(`phase ${st.phase}; UTR ${utr}; gave UTR to operator: ${gaveUtr}; relayed the name: ${relayedName}; ack: ${ack}`);
  await page.getByRole('button', { name: /End conversation/i }).click().catch(() => {});
  await ctx.close();
  log(`video: ${await page.video()?.path()}`);
  await browser.close();
  const ok = st.phase === 'interpret' && gaveUtr && relayedName && ack === '3151251120012' + '3';
  log(ok ? 'INTERPRETER PASS' : 'INTERPRETER FAIL');
  process.exit(ok ? 0 : 1);
})();
