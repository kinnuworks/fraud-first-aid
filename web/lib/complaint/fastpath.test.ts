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

describe('UTR said in pieces across turns', () => {
  it('holds dictated digits silently until 12 arrive, then reads them all back', () => {
    const c = newComplaint('te');
    expect(complaintShortcut(c, 'UTR నంబర్ నాలుగు సున్నా రెండు ఒకటి')).toBe('<silent>');
    expect(complaintShortcut(c, 'ఏడు ఏడు ఎనిమిది ఎనిమిది')).toBe('<silent>');
    const say = complaintShortcut(c, 'తొమ్మిది తొమ్మిది ఒకటి సున్నా');
    expect(c.fields.utr?.value).toBe('402177889910');
    expect(say).toContain('ఇది సరైనదేనా?');
    expect(c.digitBuffer).toBe('');
  });
  it('does not buffer an amount or a story', () => {
    const c = newComplaint('te');
    expect(complaintShortcut(c, 'ఇరవై ఐదు వేల రూపాయలు పోయాయి')).toBeNull();
    expect(c.digitBuffer ?? '').toBe('');
  });
  it('starts over if the pieces add up to more than 12', () => {
    const c = newComplaint('en');
    complaintShortcut(c, 'four zero two one seven seven');
    complaintShortcut(c, 'eight eight nine nine');
    expect(complaintShortcut(c, 'one zero five five five')).toBe('<silent>');
    expect(c.digitBuffer).toBe('10555');
  });
});

describe('guardHandover', () => {
  it('switches to the complaint in code when money has gone, keeps the amount, and asks for the UTR', async () => {
    const { guardHandover } = await import('./fastpath');
    const c = newComplaint('te', 'guard');
    const say = guardHandover(c, 'అయ్యో, నేను ఇప్పటికే ఇరవై ఐదు వేల రూపాయలు పంపేశాను. KYC అని చెప్పి QR స్కాన్ చేయించారు.');
    expect(c.phase).toBe('complaint');
    expect(c.fields.amount).toEqual({ value: 25000, confirmed: false });
    expect(say).toContain('UTR');
    expect(c.story?.words).toContain('QR');
  });
  it('switches other languages too, leaving the words to the model', async () => {
    const { guardHandover } = await import('./fastpath');
    const c = newComplaint('ta', 'guard');
    expect(guardHandover(c, 'I already paid them')).toBeNull();
    expect(c.phase).toBe('complaint');
  });
  it('does nothing without loss words or outside guard', async () => {
    const { guardHandover } = await import('./fastpath');
    expect(guardHandover(newComplaint('te', 'guard'), 'హలో సర్')).toBeNull();
    expect(guardHandover(newComplaint('te', 'complaint'), 'I already paid')).toBeNull();
  });
});

describe('a UTR that stops short', () => {
  it('reads back the digits it has and asks again when the next turn brings no more', () => {
    const c = newComplaint('en');
    expect(complaintShortcut(c, 'four zero two one seven seven eight eight nine nine')).toBe('<silent>');
    const say = complaintShortcut(c, 'that is all');
    expect(say).toContain('10');
    expect(say).toContain('four zero two one');
    expect(say).toContain('12');
    expect(c.digitBuffer).toBe('');
  });
});
