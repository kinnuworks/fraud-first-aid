import { describe, expect, it } from 'vitest';
import { createReported, upiIn } from './reported';

// "Reported before" (20 Nov): each confirmed complaint counts a one-way hash of the payee's UPI ID;
// on a later guarded call, a caller who names that ID gets an instant warning. Only the hash is kept.
describe('reported payees', () => {
  const store = new Map<string, number>();
  const r = createReported({
    secret: 'pepper',
    incr: async (k) => { const n = (store.get(k) ?? 0) + 1; store.set(k, n); return n; },
    get: async (k) => store.get(k) ?? 0,
  });
  it('counts a payee once reported, matched however it is spelled or spoken', async () => {
    expect(await r.times('ramesh@okaxis')).toBe(0);
    await r.report('Ramesh@OKAXIS');
    expect(await r.times('ramesh@okaxis')).toBe(1);
    expect(await r.times(upiIn('send it to ramesh at okaxis right now')!)).toBe(1);
  });
  it('keeps only a hash, never the UPI ID', () => {
    expect([...store.keys()].join(' ')).not.toMatch(/ramesh|okaxis/);
  });
  it('finds a UPI ID in a spoken line, or none', () => {
    expect(upiIn('pay to suresh.k at the rate ybl')).toBe('suresh.k@ybl');
    expect(upiIn('hello madam how are you')).toBeNull();
  });
});

describe('guardReported: the warning on a guarded call', () => {
  it('warns at once, in the caller language, when the caller names a reported UPI ID', async () => {
    const { guardReported } = await import('./reported');
    const { newComplaint } = await import('./session');
    const c = newComplaint('te', 'guard');
    const say = await guardReported(c, 'sir please send the fee to ramesh at okaxis', async () => 2);
    expect(say).toMatch(/UPI ID/);
    expect(c.flags[0].scam).toBe('reported_payee');
    expect(c.flags[0].red_flag).toMatch(/ramesh@okaxis/);
  });
  it('stays out of it for an unknown ID, outside guard, or when the line is the victim\'s loss', async () => {
    const { guardReported } = await import('./reported');
    const { newComplaint } = await import('./session');
    expect(await guardReported(newComplaint('en', 'guard'), 'send to new.person@ybl', async () => 0)).toBeNull();
    expect(await guardReported(newComplaint('en', 'complaint'), 'send to ramesh@okaxis', async () => 3)).toBeNull();
    expect(await guardReported(newComplaint('en', 'guard'), 'I already paid 5000 to ramesh@okaxis, it was a scam', async () => 3)).toBeNull();
  });
});

describe('reportOnce: a confirmed complaint counts its payee once', () => {
  it('reports when every field is confirmed, and only once', async () => {
    const { reportOnce } = await import('./reported');
    const { newComplaint } = await import('./session');
    const c = newComplaint('en');
    c.fields = { utr: { value: '402177889910', confirmed: true }, amount: { value: 1, confirmed: true }, payee: { value: 'ramesh@okaxis', confirmed: true }, when: { value: '2026-11-19T14:30', confirmed: true }, victim_bank: { value: 'SBI', confirmed: true } } as never;
    const seen: string[] = [];
    await reportOnce(c, async (u) => { seen.push(u); return 1; });
    await reportOnce(c, async (u) => { seen.push(u); return 1; });
    expect(seen).toEqual(['ramesh@okaxis']);
  });
  it('does not report an unconfirmed payee', async () => {
    const { reportOnce } = await import('./reported');
    const { newComplaint } = await import('./session');
    const c = newComplaint('en');
    c.fields = { payee: { value: 'ramesh@okaxis', confirmed: false } } as never;
    const seen: string[] = [];
    await reportOnce(c, async (u) => { seen.push(u); return 1; });
    expect(seen).toEqual([]);
  });
});
