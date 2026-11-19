// Live check: the caller starts a guarded call, sends "Bring family into the call", a second
// browser opens that link, joins, presses Talk, and the caller's browser receives the family
// member's audio track. Spends a short Agora session. Run: npx -y tsx@4.20.6 scripts/family-check.ts [base]
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'https://utr-pakka.vercel.app';
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const caller = await (await browser.newContext({ permissions: ['microphone'] })).newPage();
  await caller.goto(`${BASE}/?lang=te&demo=1`);
  await caller.getByRole('button', { name: /Let UTR Pakka listen/ }).click();
  await caller.getByTestId('guard-listening').waitFor({ timeout: 45000 });
  const href = await caller.getByTestId('invite-family-talk').getAttribute('href');
  if (!href) throw new Error('no family invite link');
  const link = decodeURIComponent(href.split('text=')[1]).match(/https?:\/\/\S+/)![0];
  console.log('invite link found');
  const family = await (await browser.newContext({ permissions: ['microphone'] })).newPage();
  await family.goto(link);
  await family.getByRole('button', { name: /Listen to the call live/ }).click();
  await family.getByTestId('family-talk').waitFor({ timeout: 30000 });
  console.log('family joined; Talk button shown');
  await family.getByTestId('family-talk').click();
  await family.getByText('They can hear you', { exact: false }).waitFor({ timeout: 15000 });
  console.log('family is talking');
  // the caller's page renders one hidden RemoteUser per remote user, tagged with its uid
  let ok = false;
  for (let i = 0; i < 30 && !ok; i++) {
    // family speakers join with uids 80000-89999
    ok = await caller.evaluate(() => [...document.querySelectorAll('[data-remote-uid]')].some((e) => /^8\d{4}$/.test(e.getAttribute('data-remote-uid') ?? '')));
    if (!ok) await caller.waitForTimeout(500);
  }
  console.log(ok ? 'FAMILY CHECK PASSED: the caller receives the family audio' : 'family audio not seen on the caller side');
  await caller.getByRole('button', { name: /End conversation/i }).click().catch(() => {});
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
