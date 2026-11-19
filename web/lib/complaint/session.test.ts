import { describe, expect, it } from 'vitest';
import { newComplaint, recordNumber, correctGroup, confirmField, recordUpi, recordAmount, missingFields, deadlines } from './session';

describe('complaint session', () => {
  it('records a spoken UTR unconfirmed, with a grouped read-back in the victim language', () => {
    const c = newComplaint('te');
    const r = recordNumber(c, 'utr', 'నాలుగు సున్నా రెండు ఒకటి ఏడు ఏడు ఎనిమిది ఎనిమిది తొమ్మిది తొమ్మిది ఒకటి సున్నా');
    expect(r).toMatchObject({ ok: true, digits: '402177889910', groups: ['4021', '7788', '9910'] });
    expect(r.readback).toBe('నాలుగు సున్నా రెండు ఒకటి, ఏడు ఏడు ఎనిమిది ఎనిమిది, తొమ్మిది తొమ్మిది ఒకటి సున్నా');
    expect(c.fields.utr).toEqual({ value: '402177889910', confirmed: false });
  });

  it('rejects a UTR with the wrong digit count and says how many it heard', () => {
    const c = newComplaint('en');
    const r = recordNumber(c, 'utr', 'four zero two one seven seven');
    expect(r.ok).toBe(false);
    expect(r.problem).toBe('heard 6 digits, a UTR has 12');
    expect(c.fields.utr).toBeUndefined();
  });

  it('replaces only the corrected group and keeps it unconfirmed', () => {
    const c = newComplaint('en');
    recordNumber(c, 'utr', '4021 7788 9910');
    const r = correctGroup(c, 'utr', 2, 'seven seven eight six');
    expect(r).toMatchObject({ ok: true, digits: '402177869910' });
    expect(c.fields.utr?.confirmed).toBe(false);
    expect(correctGroup(c, 'utr', 2, 'seven seven').ok).toBe(false);
    expect(correctGroup(c, 'utr', 4, '1234').ok).toBe(false);
  });

  it('confirms a field only after it was recorded', () => {
    const c = newComplaint('en');
    expect(confirmField(c, 'utr').ok).toBe(false);
    recordNumber(c, 'utr', '402177889910');
    expect(confirmField(c, 'utr').ok).toBe(true);
    expect(c.fields.utr?.confirmed).toBe(true);
  });

  it('records the payee UPI ID and the amount', () => {
    const c = newComplaint('en');
    expect(recordUpi(c, 'ramesh at the rate okaxis')).toMatchObject({ ok: true, value: 'ramesh@okaxis' });
    expect(recordAmount(c, '25,000 rupees')).toMatchObject({ ok: true, value: 25000 });
    expect(recordAmount(c, 'a lot').ok).toBe(false);
  });

  it('lists what is still missing or unconfirmed', () => {
    const c = newComplaint('en');
    recordNumber(c, 'utr', '402177889910');
    confirmField(c, 'utr');
    recordAmount(c, '25000');
    expect(missingFields(c)).toEqual(['amount (not confirmed)', 'when', 'payee', 'victim_bank']);
  });

  it('computes the RBI reporting deadlines from the report date', () => {
    expect(deadlines('2026-11-19')).toEqual({ zeroLiabilityBy: '2026-11-23', boardPolicyAfter: '2026-11-27' });
  });
});

describe('addFlag fallback for a warning the model gave under another name', () => {
  it('records an unknown scam id as a suspicious call, once', async () => {
    const { addFlag, newComplaint } = await import('./session');
    const c = newComplaint('en', 'guard');
    expect(addFlag(c, 'fake_rbi_investigation', 'asked to move money to a "safe" account', 'move your money')).toBe(true);
    expect(c.flags[0].scam).toBe('suspicious_call');
    expect(addFlag(c, 'another_unknown', 'x', 'y')).toBe(false);
  });
});

// Scam-call evidence (20 Nov): on guard, every line heard on the speakerphone is kept with its time,
// so the pack can hand 1930 and the cyber cell the scammer's own words in order.
describe('logHeard', () => {
  it('keeps what was heard on guard, with the time, bounded', async () => {
    const { newComplaint, logHeard } = await import('./session');
    const c = newComplaint('te', 'guard');
    logHeard(c, 'Hello sir, I am calling from SBI', new Date('2026-11-19T09:00:05Z'));
    logHeard(c, '   ', new Date('2026-11-19T09:00:06Z'));
    expect(c.heard).toEqual([{ at: '2026-11-19T14:30:05', text: 'Hello sir, I am calling from SBI' }]);
    for (let i = 0; i < 100; i++) logHeard(c, `line ${i}`);
    expect(c.heard!.length).toBe(60);
    expect(c.heard![59].text).toBe('line 99');
  });
  it('keeps nothing once the call is a complaint', async () => {
    const { newComplaint, logHeard } = await import('./session');
    const c = newComplaint('te', 'complaint');
    logHeard(c, 'my UTR is 4021');
    expect(c.heard).toBeUndefined();
  });
});

// Privacy (20 Nov): the scam-call record must never keep an OTP, PIN or CVV a victim reads out.
describe('logHeard redacts short codes', () => {
  it('blanks 3 to 8 digit codes, spoken or written, and keeps 12-digit references and amounts with money words', async () => {
    const { newComplaint, logHeard } = await import('./session');
    const c = newComplaint('en', 'guard');
    logHeard(c, 'okay the OTP is 482913');
    logHeard(c, 'my pin is four eight two nine');
    logHeard(c, 'the CVV is 123');
    logHeard(c, 'send 5000 rupees to clear the case');
    expect(c.heard!.map((h) => h.text)).toEqual([
      'okay the OTP is [code removed]',
      'my pin is [code removed]',
      'the CVV is [code removed]',
      'send 5000 rupees to clear the case',
    ]);
  });
});

describe('red flags and the victim\'s words are redacted too', () => {
  it('a flag never stores the OTP it heard', async () => {
    const { newComplaint, addFlag } = await import('./session');
    const c = newComplaint('en', 'guard');
    addFlag(c, 'vishing_otp', 'asked for the OTP', 'sir the OTP is 482913, tell me');
    expect(c.flags[0].heard).toBe('sir the OTP is [code removed], tell me');
  });
});
