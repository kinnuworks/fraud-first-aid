// Renders the README GIF's caption bars as PNGs (this ffmpeg has no text filter).
// Run: npx -y tsx@4.20.6 scripts/gif-captions.ts <out-dir>
import { chromium } from 'playwright';

const CAPS = [
  '1  One click: it listens to a scam call and warns you',
  '2  Every digit read back. The screenshot catches the wrong group',
  '3  It speaks to 1930 for you, every number exact',
];
(async () => {
  const out = process.argv[2] ?? '.';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 880, height: 60 } });
  for (const [i, c] of CAPS.entries()) {
    await p.setContent(`<html><body style="margin:0;background:#0d3b29;display:flex;align-items:center;justify-content:center;height:60px;font:700 25px -apple-system,Helvetica,Arial,sans-serif;color:#fff">${c}</body></html>`);
    await p.screenshot({ path: `${out}/cap${i + 1}.png` });
  }
  await b.close();
})();
