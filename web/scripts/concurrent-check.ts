// Several scam calls at once: N browsers press "Watch it catch a scam call" together, each with its
// own Agora agent, and each must get the warning card. Prints the time to the warning per call and
// writes evidence/results/concurrent-<date>.csv. Spends real credits (about one minute per call).
// Run: npx -y tsx@4.20.6 scripts/concurrent-check.ts [base] [n=5]
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = process.argv[2] ?? 'https://fraudfirstaid.vercel.app';
const N = Number(process.argv[3] ?? 5);
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const one = async (i: number) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    try {
      await page.goto(BASE);
      const t0 = Date.now();
      await page.getByTestId('watch-scam').click();
      await page.getByTestId('guard-listening').waitFor({ timeout: 45000 });
      const listening = (Date.now() - t0) / 1000;
      await page.getByTestId('red-flags').waitFor({ timeout: 90000 });
      const warned = (Date.now() - t0) / 1000;
      await page.getByRole('button', { name: /End conversation/i }).click().catch(() => {});
      return { i, ok: true, listening, warned };
    } catch (e) {
      return { i, ok: false, listening: NaN, warned: NaN, error: String(e).slice(0, 120) };
    } finally {
      await page.waitForTimeout(1500);
      await ctx.close();
    }
  };
  const results = await Promise.all(Array.from({ length: N }, (_, i) => one(i + 1)));
  await browser.close();
  for (const r of results) console.log(`call ${r.i}: ${r.ok ? `listening ${r.listening.toFixed(1)} s, warning ${r.warned.toFixed(1)} s` : `FAILED ${'error' in r ? r.error : ''}`}`);
  const ok = results.filter((r) => r.ok);
  const date = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  writeFileSync(`../evidence/results/concurrent-${date}.csv`, ['call,ok,listening_s,warning_s', ...results.map((r) => `${r.i},${r.ok},${r.listening},${r.warned}`)].join('\n') + '\n');
  console.log(`${ok.length} of ${N} calls at once got the warning`);
  process.exit(ok.length === N ? 0 : 1);
})();
