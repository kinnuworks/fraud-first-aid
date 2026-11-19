import { describe, expect, it } from 'vitest';
import { createLimiter } from './ratelimit';

// From the bug check on 11a75db (20 Nov): starting a call starts a paid Agora agent, with no limit
// on how often. Each address gets a few starts per window, and the whole app a ceiling per hour.
describe('createLimiter', () => {
  const counts = new Map<string, number>();
  const incr = async (key: string) => { const n = (counts.get(key) ?? 0) + 1; counts.set(key, n); return n; };
  it('allows a few starts per address, then refuses', async () => {
    const allow = createLimiter({ incr, perAddress: 3, perHour: 100 });
    expect(await allow('1.2.3.4')).toBe(true);
    expect(await allow('1.2.3.4')).toBe(true);
    expect(await allow('1.2.3.4')).toBe(true);
    expect(await allow('1.2.3.4')).toBe(false);
    expect(await allow('5.6.7.8')).toBe(true);
  });
  it('refuses everyone past the hourly ceiling', async () => {
    counts.clear();
    const allow = createLimiter({ incr, perAddress: 100, perHour: 2 });
    expect(await allow('a')).toBe(true);
    expect(await allow('b')).toBe(true);
    expect(await allow('c')).toBe(false);
  });
  it('lets the call start if the store fails, so a store outage never blocks a victim', async () => {
    const allow = createLimiter({ incr: async () => { throw new Error('down'); }, perAddress: 1, perHour: 1 });
    expect(await allow('x')).toBe(true);
  });
});
