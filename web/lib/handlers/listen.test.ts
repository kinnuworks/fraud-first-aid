import { describe, expect, it, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

beforeAll(() => {
  process.env.NEXT_PUBLIC_AGORA_APP_ID = 'a'.repeat(32);
  process.env.NEXT_AGORA_APP_CERTIFICATE = 'b'.repeat(32);
  process.env.LLM_SHARED_SECRET ??= 'test-secret-for-caps';
});

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
