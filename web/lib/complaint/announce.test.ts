import { describe, expect, it } from 'vitest';
import { ANNOUNCE, shotLine } from './announce';
import { READBACK_LANGS } from '../entities/numbers';

describe('spoken announcements', () => {
  it('has every line in every language, within the 512-byte speak limit', () => {
    for (const l of READBACK_LANGS) {
      const L = ANNOUNCE[l];
      for (const t of [L.shotGroup(2), L.shotDiffers, L.shotMatches, L.emailed]) {
        expect(t.length).toBeGreaterThan(5);
        expect(new TextEncoder().encode(t).length).toBeLessThanOrEqual(512);
      }
    }
  });
  it('interrupts with the differing UTR group, else any difference, else says it matches', () => {
    expect(shotLine('en', { utr: { status: 'mismatch', groups: [2] } })).toEqual({ text: ANNOUNCE.en.shotGroup(2), interrupt: true });
    expect(shotLine('te', { amount: { status: 'mismatch' }, utr: { status: 'match' } })).toEqual({ text: ANNOUNCE.te.shotDiffers, interrupt: true });
    expect(shotLine('hi', { utr: { status: 'match' } })).toEqual({ text: ANNOUNCE.hi.shotMatches, interrupt: false });
    expect(shotLine('hi', { utr: { status: 'missing' } })).toBeNull();
  });
});
