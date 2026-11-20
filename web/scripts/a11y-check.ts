// Accessibility check of the live screens with axe-core (WCAG 2.1 A and AA rules).
// Fails on any serious or critical violation. Run: npx -y tsx@4.20.6 scripts/a11y-check.ts [base]
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'https://fraudfirstaid.vercel.app';
const PAGES = ['/', '/?state=complaint-done', '/?state=complaint-mismatch', '/?state=guard-flagged', '/?state=complaint-interpret', '/proof', '/watch?as=operator'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  let bad = 0;
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js' });
    const res = await page.evaluate(async () => (window as unknown as { axe: { run: (o: unknown) => Promise<{ violations: Array<{ id: string; impact: string; help: string; nodes: Array<{ target: string[] }> }> }> } }).axe.run({ runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
    const serious = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    bad += serious.length;
    console.log(`${p}: ${res.violations.length} violations, ${serious.length} serious or critical`);
    for (const v of res.violations) console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  }
  await browser.close();
  if (bad) { console.error(`A11Y CHECK FAILED: ${bad} serious or critical rule(s)`); process.exit(1); }
  console.log('A11Y CHECK PASSED');
})();
