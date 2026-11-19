import { describe, expect, it } from 'vitest';
import { createShared } from './shared';

function fakeRedis() {
  const db = new Map<string, string>();
  const calls: unknown[][] = [];
  const fetchImpl = (async (_url: string, init: { body: string; headers: Record<string, string> }) => {
    const cmd = JSON.parse(init.body) as string[];
    calls.push(cmd);
    if (init.headers.Authorization !== 'Bearer tok') return new Response('{"error":"unauthorized"}', { status: 401 });
    if (cmd[0] === 'SET') { db.set(cmd[1], cmd[2]); return Response.json({ result: 'OK' }); }
    if (cmd[0] === 'GET') return Response.json({ result: db.get(cmd[1]) ?? null });
    return Response.json({ error: 'unknown' }, { status: 400 });
  }) as unknown as typeof fetch;
  return { db, calls, fetchImpl };
}

describe('shared call store (Upstash Redis REST)', () => {
  it('writes a call with a two-hour expiry and reads it back on another instance', async () => {
    const r = fakeRedis();
    const a = createShared({ url: 'https://x.upstash.io', token: 'tok', fetchImpl: r.fetchImpl })!;
    await a.put('up-1', { phase: 'complaint', fields: { utr: { value: '402177889910' } } }, 'hello');
    expect(r.calls[0].slice(0, 2)).toEqual(['SET', 'call:up-1']);
    expect(r.calls[0].slice(3)).toEqual(['EX', '7200']);
    const b = createShared({ url: 'https://x.upstash.io', token: 'tok', fetchImpl: r.fetchImpl })!;
    expect(await b.get('up-1')).toEqual({ c: { phase: 'complaint', fields: { utr: { value: '402177889910' } } }, seen: 'hello' });
  });
  it('returns nothing for an unknown call', async () => {
    const r = fakeRedis();
    expect(await createShared({ url: 'https://x.upstash.io', token: 'tok', fetchImpl: r.fetchImpl })!.get('up-2')).toBeUndefined();
  });
  it('throws on a store error instead of quietly losing the call', async () => {
    const r = fakeRedis();
    const bad = createShared({ url: 'https://x.upstash.io', token: 'wrong', fetchImpl: r.fetchImpl })!;
    await expect(bad.get('up-1')).rejects.toThrow(/401/);
  });
  it('is off without a URL and token', () => {
    expect(createShared({ url: '', token: '' })).toBeNull();
  });
});
