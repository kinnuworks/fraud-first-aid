// Records the whole story in one call, with labelled sample voices (no human speaking):
// BEFORE: the guard hears a sample scam call and warns in Telugu.
// DURING: a sample caller says money has gone, gives the UTR (misremembering one group), adds the
//         payment screenshot, the agent catches the difference, the caller confirms the screenshot.
// AFTER:  payee, time and bank are confirmed and the pack appears (1930, letter, reminders).
// Spends real Agora/Sarvam/Murf/model credits. Video: evidence/.cache/demo-full/
// Run: npx -y tsx@4.20.6 scripts/demo-full.ts [https://utr-pakka.vercel.app]
import { chromium, type Page } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.argv[2] ?? 'https://utr-pakka.vercel.app';
const HERE = new URL('.', import.meta.url).pathname;
const OUT = new URL('../../evidence/.cache/demo-full/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
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
  await page.evaluate((u) => (window as unknown as { __utrPakkaPlay: (u: string) => Promise<void> }).__utrPakkaPlay(u), `/demo/${clip}.wav`);
  await idle(page);
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${HERE}fixtures/silence.wav`, '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ recordVideo: { dir: OUT, size: { width: 1280, height: 800 } }, viewport: { width: 1280, height: 800 }, permissions: ['microphone'] });
  const page = await ctx.newPage();
  let session = '';
  page.on('request', (r) => { const m = r.url().match(/complaint\?session=([\w-]+)/); if (m) session = m[1]; });
  await page.goto(`${BASE}/?lang=te&demo=1`);
  await page.getByRole('button', { name: /Let UTR Pakka listen/ }).click();
  await page.getByTestId('guard-listening').waitFor({ timeout: 30000 });
  log('guard on; playing the sample scam call');
  await page.getByRole('button', { name: /Play a sample scam call/ }).click();
  await page.getByTestId('red-flags').waitFor({ timeout: 60000 });
  log('scam warning given');
  await idle(page);
  await page.waitForTimeout(3000);

  await play(page, 'victim-1-lost');
  await play(page, 'victim-2-utr');
  const input = page.locator('input[type=file]');
  if (await input.count()) {
    log('adding the payment screenshot');
    await input.setInputFiles(`${HERE}fixtures/sample-payment.png`);
    await page.locator('[data-check="mismatch"]').waitFor({ timeout: 60000 }).then(() => log('mismatch shown on the card')).catch(() => log('no mismatch shown'));
  } else log('no screenshot input (still on guard?)');
  await play(page, 'victim-3-screenshot-right');
  await play(page, 'victim-4-yes');
  for (const clip of ['victim-5-payee', 'victim-4-yes', 'victim-6-when', 'victim-4-yes', 'victim-7-bank', 'victim-4-yes']) await play(page, clip);
  for (let i = 0; i < 3 && !(await page.getByTestId('pack').isVisible().catch(() => false)); i++) await play(page, 'victim-4-yes');
  const packed = await page.getByTestId('pack').isVisible().catch(() => false);
  log(packed ? 'PACK READY' : 'pack not ready');
  if (session) log(`state: ${JSON.stringify((await (await fetch(`${BASE}/api/call/complaint?session=${session}`)).json()).fields)}`);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${OUT}final.png`, fullPage: true });
  await page.getByRole('button', { name: /End conversation/i }).click().catch(() => {});
  await ctx.close();
  log(`video: ${await page.video()?.path()}`);
  await browser.close();
  process.exit(packed ? 0 : 1);
})();
