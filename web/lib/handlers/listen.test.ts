import { describe, expect, it, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

beforeAll(() => {
  process.env.NEXT_PUBLIC_AGORA_APP_ID = 'a'.repeat(32);
  process.env.NEXT_AGORA_APP_CERTIFICATE = 'b'.repeat(32);
  process.env.LLM_SHARED_SECRET ??= 'test-secret-for-caps';
});
// Load the handler once before the tests, with its own time limit: on a busy machine the first
// import took longer than a test's 5 s and failed a test that never ran (21 Nov, load ~40). Each
// test keeps its own 5 s for what it checks.
beforeAll(async () => {
  await import('./listen');
  await import('../capability');
}, 60_000);

describe('listen: a read-only RTC token for family', () => {
  it('refuses without the view key', async () => {
    const { GET } = await import('./listen');
    const r = await GET(new NextRequest('http://x/api/call/listen?session=up-1&key=nope'));
    expect(r.status).toBe(403);
  });
  it('gives a subscriber token for the call channel with a listener uid', async () => {
    const { GET } = await import('./listen');
    const { viewCapFor } = await import('../capability');
    const r = await GET(new NextRequest(`http://x/api/call/listen?session=up-1&key=${viewCapFor('up-1')}`));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.channel).toBe('up-1');
    expect(j.uid).toBeGreaterThanOrEqual(90000);
    expect(typeof j.token).toBe('string');
  });
});

// Family joins the call (20 Nov): a separate talk key lets a family member speak into the call;
// the view key (also given to the 1930 operator view) still only listens.
describe('listen: family can talk only with the talk key', () => {
  it('the view key listens and cannot speak', async () => {
    const { GET } = await import('./listen');
    const { viewCapFor } = await import('../capability');
    const j = await (await GET(new NextRequest(`http://x/api/call/listen?session=up-2&key=${viewCapFor('up-2')}`))).json();
    expect(j.canSpeak).toBe(false);
  });
  it('the talk key gets a speaking token and can also read the call', async () => {
    const { GET } = await import('./listen');
    const { talkCapFor, canView } = await import('../capability');
    const key = talkCapFor('up-2')!;
    const r = await GET(new NextRequest(`http://x/api/call/listen?session=up-2&key=${key}`));
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.canSpeak).toBe(true);
    expect(j.uid).toBeGreaterThanOrEqual(80000);
    expect(j.uid).toBeLessThan(90000);
    expect(canView('up-2', key)).toBe(true);
  });
  it('a talk key for one call does not work on another', async () => {
    const { GET } = await import('./listen');
    const { talkCapFor } = await import('../capability');
    const r = await GET(new NextRequest(`http://x/api/call/listen?session=up-3&key=${talkCapFor('up-2')}`));
    expect(r.status).toBe(403);
  });
  it('the talk key differs from the view key', async () => {
    const { talkCapFor, viewCapFor } = await import('../capability');
    expect(talkCapFor('up-2')).not.toBe(viewCapFor('up-2'));
  });
});
