import { describe, expect, it } from 'vitest';
import { newComplaint } from './session';
import { compareWithScreenshot, normalizeShot } from './screenshot';

describe('normalizeShot', () => {
  it('cleans what the vision model read: digits only for UTR, rupees as a number, lower-case UPI ID', () => {
    expect(normalizeShot({ utr: 'UTR: 4021 7788 9910', amount: '₹25,000.00', payee: 'Ramesh@OKAXIS', when: '19 Nov 2026, 2:30 pm' })).toEqual({
      utr: '402177889910', amount: 25000, payee: 'ramesh@okaxis', when: '19 Nov 2026, 2:30 pm',
    });
    expect(normalizeShot({ utr: '12345', amount: 'n/a' })).toEqual({ utr: undefined, amount: undefined, payee: undefined, when: undefined });
  });
});

describe('compareWithScreenshot', () => {
  it('marks each field match, mismatch, or found in one source only', () => {
    const c = newComplaint('te');
    c.fields.utr = { value: '402177889910', confirmed: true };
    c.fields.amount = { value: 2500, confirmed: false };
    const r = compareWithScreenshot(c, { utr: '402177889910', amount: 25000, payee: 'ramesh@okaxis' });
    expect(r.utr).toEqual({ status: 'match', spoken: '402177889910', screenshot: '402177889910' });
    expect(r.amount).toEqual({ status: 'mismatch', spoken: 2500, screenshot: 25000 });
    expect(r.payee).toEqual({ status: 'screenshot_only', screenshot: 'ramesh@okaxis' });
    expect(r.when).toEqual({ status: 'missing' });
  });

  it('points at the differing UTR group so the agent can re-ask only that group', () => {
    const c = newComplaint('en');
    c.fields.utr = { value: '402177889910', confirmed: false };
    const r = compareWithScreenshot(c, { utr: '402177869910' });
    expect(r.utr).toEqual({ status: 'mismatch', spoken: '402177889910', screenshot: '402177869910', groups: [2] });
  });
});
