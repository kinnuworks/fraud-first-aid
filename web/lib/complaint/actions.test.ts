import { describe, expect, it } from 'vitest';
import { newComplaint, recordNumber, confirmField, recordAmount, recordUpi, recordText, addFlag, act } from './session';

describe("the agent's step list", () => {
  it('logs each step it takes, in India time, with the number grouped as read back', () => {
    const c = newComplaint('te');
    recordNumber(c, 'utr', '4 0 2 1 7 7 8 8 9 9 1 0');
    confirmField(c, 'utr');
    expect(c.actions?.map((a) => a.text)).toEqual([
      'Heard the UTR and read it back: 4021 7788 9910',
      'You confirmed the UTR',
    ]);
    expect(c.actions?.[0].at).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('says when every detail is confirmed, once the last field is', () => {
    const c = newComplaint('en');
    recordNumber(c, 'utr', '402177889910');
    recordAmount(c, '25000');
    recordUpi(c, 'ramesh at okaxis');
    recordText(c, 'when', '2026-11-19T14:30');
    recordText(c, 'victim_bank', 'State Bank of India');
    for (const f of ['utr', 'amount', 'payee', 'when', 'victim_bank'] as const) confirmField(c, f);
    expect(c.actions?.at(-1)?.text).toMatch(/^Every detail confirmed/);
  });

  it('logs a red flag once and skips the same step twice in a row', () => {
    const c = newComplaint('hi');
    addFlag(c, 'fake_kyc', 'asked for the OTP', 'give me the OTP');
    addFlag(c, 'fake_kyc', 'asked for the OTP', 'give me the OTP');
    act(c, 'ask', 'Asked for your yes before emailing the pack');
    act(c, 'ask', 'Asked for your yes before emailing the pack');
    expect(c.actions?.map((a) => a.kind)).toEqual(['flag', 'ask']);
  });
});
