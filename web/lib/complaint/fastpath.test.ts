import { describe, expect, it } from 'vitest';
import { newComplaint } from './session';
import { complaintShortcut } from './fastpath';

describe('complaintShortcut', () => {
  it('records a spoken 12-digit UTR at once and reads it back in the caller language', () => {
    const c = newComplaint('te');
    const say = complaintShortcut(c, 'UTR నంబర్ నాలుగు సున్నా రెండు ఒకటి, ఏడు ఏడు ఎనిమిది ఎనిమిది, తొమ్మిది తొమ్మిది ఒకటి సున్నా.');
    expect(c.fields.utr).toEqual({ value: '402177889910', confirmed: false });
    expect(say).toContain('నాలుగు సున్నా రెండు ఒకటి, ఏడు ఏడు ఎనిమిది ఎనిమిది');
    expect(say).toContain('ఇది సరైనదేనా?');
    expect(c.pending).toBe('utr');
  });

  it('a plain yes confirms what was just read back and asks the next thing', () => {
    const c = newComplaint('hi');
    complaintShortcut(c, 'चार शून्य दो एक सात सात आठ आठ नौ नौ एक शून्य');
    const say = complaintShortcut(c, 'हाँ, सही है');
    expect(c.fields.utr?.confirmed).toBe(true);
    expect(say).toContain('कितने पैसे');
  });

  it('reads back a field the model recorded but nobody confirmed yet', () => {
    const c = newComplaint('en');
    c.fields.utr = { value: '402177889910', confirmed: true };
    c.fields.amount = { value: 25000, confirmed: false };
    c.pending = 'utr';
    const say = complaintShortcut(c, 'yes');
    expect(say).toContain('25,000 rupees');
    expect(c.pending).toBe('amount');
  });

  it('says the pack is ready with the bank date once everything is confirmed', () => {
    const c = newComplaint('en');
    c.fields = {
      utr: { value: '402177889910', confirmed: true },
      amount: { value: 25000, confirmed: true },
      when: { value: '2026-11-19T14:30', confirmed: true },
      payee: { value: 'ramesh@okaxis', confirmed: true },
      victim_bank: { value: 'SBI', confirmed: false },
    };
    c.pending = 'victim_bank';
    expect(complaintShortcut(c, 'yes that is right', '2026-11-19')).toContain('2026-11-23');
  });

  it('leaves no, corrections, other languages and free talk to the model', () => {
    const c = newComplaint('te');
    complaintShortcut(c, 'నాలుగు సున్నా రెండు ఒకటి ఏడు ఏడు ఎనిమిది ఎనిమిది తొమ్మిది తొమ్మిది ఒకటి సున్నా');
    expect(complaintShortcut(c, 'లేదు, రెండో గ్రూప్ తప్పు')).toBeNull();
    expect(complaintShortcut(c, 'మోసగాడు నాకు KYC అని కాల్ చేశాడు')).toBeNull();
    expect(complaintShortcut(newComplaint('ta'), 'ஆம்')).toBeNull();
    expect(complaintShortcut(newComplaint('te', 'guard'), 'అవును')).toBeNull();
  });
});
