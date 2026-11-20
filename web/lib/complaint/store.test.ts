import { beforeAll, describe, expect, it, vi } from 'vitest';

// A shared store held in this test's memory, standing in for Upstash.
const db = new Map<string, string>();
vi.mock('./shared', () => ({
  shared: {
    async get(id: string) { const v = db.get(id); return v ? JSON.parse(v) : undefined; },
    async put(id: string, c: unknown, seen?: string) { db.set(id, JSON.stringify({ c, seen })); },
  },
}));

// From the full-flow run on the live app, 20 Nov: the card polls about once a second, and each
// poll loaded the call from the store over this instance's copy. A model turn takes 3 to 8 s, so a
// poll in the middle replaced the object its tools were writing to, and the payee, the time and
// the screenshot choice were lost. A poll must never undo a turn that is still running.
// Load the store once before the tests, with its own time limit: on a busy machine the first import
// took longer than a test's 5 s (21 Nov, load ~40). Each test keeps its own 5 s.
beforeAll(async () => {
  await import('./store');
}, 60_000);

describe('store: a poll during a turn', () => {
  it('keeps what the running turn wrote', async () => {
    const { hydrate, persist, getComplaint, hold, release, peekComplaint } = await import('./store');
    const id = 'call-1';
    getComplaint(id, 'te', 'complaint');
    await persist(id, '');
    // a turn starts: load, then hold the call while it runs
    await hydrate(id);
    hold(id);
    getComplaint(id).fields.payee = { value: 'ramesh@okaxis', confirmed: false };
    // the card polls in the middle of the turn
    await hydrate(id);
    expect(peekComplaint(id)?.fields.payee?.value).toBe('ramesh@okaxis');
    // the turn ends and saves
    await persist(id, 'seen');
    release(id);
    // a later poll on any instance sees it
    await hydrate(id);
    expect(peekComplaint(id)?.fields.payee?.value).toBe('ramesh@okaxis');
  });
  it('a stuck hold expires, so the call is not frozen on this instance', async () => {
    vi.useFakeTimers();
    const { hydrate, getComplaint, hold, peekComplaint } = await import('./store');
    const id = 'call-2';
    db.set(id, JSON.stringify({ c: { ...getComplaint(id, 'en'), lang: 'hi' } }));
    hold(id);
    vi.advanceTimersByTime(61_000);
    await hydrate(id);
    expect(peekComplaint(id)?.lang).toBe('hi');
    vi.useRealTimers();
  });
});

// Review 20 Nov: holds belong to each turn. A turn that ends must not release a newer turn's hold.
describe('store: overlapping turns', () => {
  it('keeps the hold while any turn is still running', async () => {
    const { hydrate, persist, getComplaint, hold, release, peekComplaint } = await import('./store');
    const id = 'call-3';
    getComplaint(id, 'te', 'complaint');
    await persist(id, '');
    hold(id); // turn A
    hold(id); // turn B, the caller interrupted
    release(id); // A ends
    getComplaint(id).fields.amount = { value: 500, confirmed: false }; // B writes
    await hydrate(id); // a poll
    expect(peekComplaint(id)?.fields.amount?.value).toBe(500);
    release(id);
  });
});
