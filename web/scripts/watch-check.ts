// Live check of the first screen's one-click demo: a browser with NO microphone permission presses
// "Watch it catch a scam call"; the sample scam call plays by itself and the warning card appears.
// Also records the screen (evidence/.cache/watch-video/) for the README GIF.
// Run: npx -y tsx@4.20.6 scripts/watch-check.ts [base]
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'https://fraudfirstaid.vercel.app';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: '../evidence/.cache/watch-video/', size: { width: 1280, height: 800 } } });
  const page = await ctx.newPage();
  const asked: string[] = [];
  page.on('console', (m) => { if (/getUserMedia|NotAllowed|Permission/i.test(m.text())) asked.push(m.text().slice(0, 120)); });
  await page.goto(BASE);
  const t0 = Date.now();
  await page.getByTestId('watch-scam').click();
  await page.getByTestId('guard-listening').waitFor({ timeout: 45000 });
  console.log(`guard listening after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await page.getByTestId('red-flags').waitFor({ timeout: 90000 });
  console.log(`WATCH CHECK PASSED: warning card after ${((Date.now() - t0) / 1000).toFixed(1)} s, no microphone used`);
  if (asked.length) console.log('mic-related console lines:', asked);
  await page.screenshot({ path: '../evidence/.cache/watch-check.png' });
  await page.waitForTimeout(6000); // the spoken warning finishes; the video keeps the card on screen
  await page.getByRole('button', { name: /End conversation/i }).click().catch(() => {});
  await ctx.close();
  console.log(`video: ${await page.video()?.path()}`);
  await browser.close();
})().catch((e) => { console.error('WATCH CHECK FAILED:', e.message); process.exit(1); });
