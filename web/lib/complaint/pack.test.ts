import { describe, expect, it } from 'vitest';
import { newComplaint, type Complaint } from './session';
import { buildPack } from './pack';

function full(lang: Complaint['lang']): Complaint {
  const c = newComplaint(lang);
  c.fields = {
    utr: { value: '402177889910', confirmed: true },
    amount: { value: 25000, confirmed: true },
    when: { value: '2026-11-19T14:30', confirmed: true },
    payee: { value: 'ramesh@okaxis', confirmed: true },
    victim_bank: { value: 'State Bank of India, BANGALORE (SBIN0000813)', confirmed: true },
  };
  return c;
}

describe('buildPack', () => {
  it('refuses until every field is confirmed', () => {
    const c = full('en');
    c.fields.utr!.confirmed = false;
    expect(buildPack(c, '2026-11-19')).toEqual({ ok: false, missing: ['utr (not confirmed)'] });
  });

  it('writes the bank letter in English with every field and the RBI deadline', () => {
    const p = buildPack(full('te'), '2026-11-19');
    if (!p.ok) throw new Error('expected a pack');
    expect(p.bankLetter).toContain('UTR 402177889910');
    expect(p.bankLetter).toContain('Rs 25,000');
    expect(p.bankLetter).toContain('ramesh@okaxis');
    expect(p.bankLetter).toContain('RBI/2017-18/15');
    expect(p.bankLetter).toContain('2026-11-23');
    expect(p.deadlines).toEqual({ zeroLiabilityBy: '2026-11-23', boardPolicyAfter: '2026-11-27' });
  });

  it("writes the 1930 script in the caller's language with the UTR in spoken groups", () => {
    const te = buildPack(full('te'), '2026-11-19');
    if (!te.ok) throw new Error('expected a pack');
    expect(te.script1930).toContain('UPI');
    expect(te.script1930).toContain('నాలుగు సున్నా రెండు ఒకటి, ఏడు ఏడు ఎనిమిది ఎనిమిది');
    expect(te.script1930).toContain('25,000');
    const hi = buildPack(full('hi'), '2026-11-19');
    if (!hi.ok) throw new Error('expected a pack');
    expect(hi.script1930).toContain('चार शून्य दो एक');
  });
});

describe('operator card and golden-hour clock', () => {
  it('builds an English 1930 operator ticket with the caller language and story', () => {
    const c = full('te');
    c.story = { en: 'Caller got a fake KYC-update call and scanned a QR code to "receive" money.', words: 'KYC update ani call vachindi' };
    const p = buildPack(c, '2026-11-19', new Date('2026-11-19T15:10:00+05:30'));
    if (!p.ok) throw new Error('expected a pack');
    expect(p.operatorCard).toContain('Caller language: Telugu');
    expect(p.operatorCard).toContain('UTR: 4021 7788 9910');
    expect(p.operatorCard).toContain('fake KYC-update call');
    expect(p.operatorCard).toContain('Bank deadline (zero liability): 2026-11-23');
    expect(p.minutesSinceDebit).toBe(40);
  });

  it('leaves the clock empty when the debit time is unknown or in the future', () => {
    const c = full('en');
    const p = buildPack(c, '2026-11-19', new Date('2026-11-19T14:00:00+05:30'));
    if (!p.ok) throw new Error('expected a pack');
    expect(p.minutesSinceDebit).toBeNull();
  });
});

describe('pack: bank fraud line, portal sheet and next steps', () => {
  it('adds the bank fraud line, a portal sheet in the portal order and the escalation steps', async () => {
    const { newComplaint } = await import('./session');
    const { buildPack } = await import('./pack');
    const c = newComplaint('en');
    c.fields = {
      utr: { value: '402177889910', confirmed: true },
      amount: { value: 25000, confirmed: true },
      payee: { value: 'ramesh@okaxis', confirmed: true },
      when: { value: '2026-11-19T14:30', confirmed: true },
      victim_bank: { value: 'State Bank of India, BANGALORE (SBIN0000813)', confirmed: true },
    } as never;
    c.flags = [{ scam: 'fake_kyc', red_flag: 'asked for the OTP', heard: 'otp' }];
    const p = buildPack(c, '2026-11-19');
    if (!p.ok) throw new Error('pack not ok');
    expect(p.bankLine?.phone).toMatch(/1800 1234/);
    expect(p.portalSheet).toMatch(/Online Financial Fraud/);
    expect(p.portalSheet).toMatch(/UPI Related Frauds/);
    expect(p.portalSheet.indexOf('Transaction ID / UTR')).toBeGreaterThan(p.portalSheet.indexOf('Incident'));
    expect(p.nextSteps).toMatch(/cms\.rbi\.org\.in/);
    expect(p.nextSteps).toMatch(/14448/);
    expect(p.nextSteps).toMatch(/KYC and Payment related/);
    // ready for day 30: the Ombudsman complaint, filled in from the confirmed details
    expect(p.ombudsmanDraft).toMatch(/cms\.rbi\.org\.in/);
    expect(p.ombudsmanDraft).toMatch(/State Bank of India, BANGALORE \(SBIN0000813\)/);
    expect(p.ombudsmanDraft).toMatch(/402177889910/);
    expect(p.ombudsmanDraft).toMatch(/Rs 25,000/);
    expect(p.ombudsmanDraft).toMatch(/2026-11-19/);
    expect(p.ombudsmanDraft).toMatch(/RBI\/2017-18\/15/);
    expect(p.ombudsmanDraft).toMatch(/2026-12-19/);
  });
});

// Review 20 Nov: the zero-liability date counts from the debit, and the letters say "within three
// working days" only when it is true.
describe('pack: deadline from the debit date', () => {
  const make = async (when: string) => {
    const { newComplaint } = await import('./session');
    const c = newComplaint('en');
    c.fields = {
      utr: { value: '402177889910', confirmed: true },
      amount: { value: 25000, confirmed: true },
      payee: { value: 'ramesh@okaxis', confirmed: true },
      when: { value: when, confirmed: true },
      victim_bank: { value: 'State Bank of India', confirmed: true },
    } as never;
    return c;
  };
  it('a debit today: within three working days', async () => {
    const { buildPack } = await import('./pack');
    const p = buildPack(await make('2026-11-19T14:30'), '2026-11-19');
    if (!p.ok) throw new Error('pack');
    expect(p.deadlines.zeroLiabilityBy).toBe('2026-11-23');
    expect(p.bankLetter).toMatch(/within three working days/);
  });
  it('a debit eight days ago: no such claim, and the deadline is in the past', async () => {
    const { buildPack } = await import('./pack');
    const p = buildPack(await make('2026-11-11T10:00'), '2026-11-19');
    if (!p.ok) throw new Error('pack');
    expect(p.deadlines.zeroLiabilityBy < '2026-11-19').toBe(true);
    expect(p.bankLetter).not.toMatch(/within three working days/);
    expect(p.ombudsmanDraft).not.toMatch(/within three working days/);
  });
  it('the reminders carry the Ombudsman draft itself, since the call is not kept', async () => {
    const { buildPack } = await import('./pack');
    const p = buildPack(await make('2026-11-19T14:30'), '2026-11-19');
    if (!p.ok) throw new Error('pack');
    expect(p.reminders).toMatch(/Bank's complaint number/);
  });
});

describe('pack: the scam call as evidence', () => {
  it('lists what was heard with times and marks the red-flag lines', async () => {
    const { newComplaint } = await import('./session');
    const { buildPack } = await import('./pack');
    const c = newComplaint('te');
    c.fields = {
      utr: { value: '402177889910', confirmed: true },
      amount: { value: 25000, confirmed: true },
      payee: { value: 'ramesh@okaxis', confirmed: true },
      when: { value: '2026-11-19T14:30', confirmed: true },
      victim_bank: { value: 'State Bank of India', confirmed: true },
    } as never;
    c.heard = [
      { at: '2026-11-19T14:20:05', text: 'Hello, I am calling from your bank, KYC update' },
      { at: '2026-11-19T14:20:31', text: 'An OTP has come on your phone, tell it to me' },
    ];
    c.flags = [{ scam: 'fake_kyc', red_flag: 'asked for the OTP', heard: 'An OTP has come on your phone, tell it to me' }];
    const p = buildPack(c, '2026-11-19');
    if (!p.ok) throw new Error('pack');
    expect(p.callRecord).toMatch(/14:20:05 {2}Hello, I am calling from your bank/);
    expect(p.callRecord).toMatch(/14:20:31 {2}RED FLAG \(asked for the OTP\): An OTP has come/);
    expect(p.operatorCard).toMatch(/Scam call record: 2 lines heard/);
  });
  it('has no call record when nothing was heard on guard', async () => {
    const { newComplaint } = await import('./session');
    const { buildPack } = await import('./pack');
    const c = newComplaint('en');
    c.fields = { utr: { value: '402177889910', confirmed: true }, amount: { value: 1, confirmed: true }, payee: { value: 'a@b', confirmed: true }, when: { value: '2026-11-19T14:30', confirmed: true }, victim_bank: { value: 'SBI', confirmed: true } } as never;
    const p = buildPack(c, '2026-11-19');
    if (!p.ok) throw new Error('pack');
    expect(p.callRecord).toBe('');
  });
});
