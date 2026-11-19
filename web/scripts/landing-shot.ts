// Full-page screenshot of the live landing page for the stranger test (research/stranger, not committed output).
import { chromium } from 'playwright';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('https://fraudfirstaid.vercel.app/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(4000);
  await p.screenshot({ path: '/Users/kinnu/projects/agora-blr/research/stranger/landing-first-2026-11-20.png' });
  // scroll through so count-up numbers and lazy images settle
  for (let y = 0; y < 12000; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(250); }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: '/Users/kinnu/projects/agora-blr/research/stranger/landing-full-2026-11-20.png', fullPage: true });
  await b.close();
})();
