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
    expect(guardHandover(c, 'I already paid them, it was a scam')).toBeNull();
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

describe('followLanguage (auto mode)', () => {
  it("switches the call's language to whatever the caller is speaking, only in auto mode", async () => {
    const { followLanguage } = await import('./fastpath');
    const c = newComplaint('en');
    c.autoLang = true;
    followLanguage(c, 'నా డబ్బు పోయింది');
    expect(c.lang).toBe('te');
    followLanguage(c, 'ok');
    expect(c.lang).toBe('te');
    followLanguage(c, 'मेरे पैसे चले गए');
    expect(c.lang).toBe('hi');
    const fixed = newComplaint('kn');
    followLanguage(fixed, 'నా డబ్బు పోయింది');
    expect(fixed.lang).toBe('kn');
  });
});

describe('fast payee and bank', () => {
  const ready = () => {
    const c = newComplaint('te');
    c.fields.utr = { value: '402177889910', confirmed: true };
    c.fields.amount = { value: 25000, confirmed: true };
    c.fields.when = { value: '2026-11-19T14:30', confirmed: true };
    return c;
  };
  it('records a spoken UPI ID when the payee is next, and reads it back', () => {
    const c = ready();
    const say = complaintShortcut(c, 'డబ్బు ramesh at okaxis కి వెళ్ళింది.');
    expect(c.fields.payee).toEqual({ value: 'ramesh@okaxis', confirmed: false });
    expect(say).toContain('ramesh@okaxis');
    expect(c.pending).toBe('payee');
  });
  it('records a known bank in any script when the bank is next', () => {
    const c = ready();
    c.fields.payee = { value: 'ramesh@okaxis', confirmed: true };
    complaintShortcut(c, 'నా బ్యాంక్ స్టేట్ బ్యాంక్ ఆఫ్ ఇండియా.');
    expect(c.fields.victim_bank).toEqual({ value: 'State Bank of India', confirmed: false });
    const h = ready();
    h.lang = 'hi';
    h.fields.payee = { value: 'x@ybl', confirmed: true };
    complaintShortcut(h, 'मेरा बैंक एचडीएफसी है');
    expect(h.fields.victim_bank?.value).toBe('HDFC Bank');
  });
  it('leaves an unknown bank or unclear payee to the model', () => {
    const c = ready();
    expect(complaintShortcut(c, 'ramesh ki taraf gaya')).toBeNull();
    c.fields.payee = { value: 'x@ybl', confirmed: true };
    expect(complaintShortcut(c, 'my cooperative society bank')).toBeNull();
  });
});

describe('payee out of order', () => {
  it('takes a UPI ID whenever the payee is still missing, even if the time is not given yet', () => {
    const c = newComplaint('te');
    c.fields.utr = { value: '402177889910', confirmed: true };
    c.fields.amount = { value: 25000, confirmed: true };
    complaintShortcut(c, 'డబ్బు ramesh at okaxis కి వెళ్ళింది.');
    expect(c.fields.payee?.value).toBe('ramesh@okaxis');
  });
});

describe('bank out of order', () => {
  it('takes a named bank whenever the bank is still missing', () => {
    const c = newComplaint('te');
    c.fields.utr = { value: '402177889910', confirmed: true };
    complaintShortcut(c, 'నా బ్యాంక్ స్టేట్ బ్యాంక్ ఆఫ్ ఇండియా.');
    expect(c.fields.victim_bank?.value).toBe('State Bank of India');
  });
});

// From the ordinary-calls break test, 20 Nov: on guard, a payment alone ("I already paid it
// yesterday on PhonePe", "I transferred 15,000", "maine 200 rupaye bhej diye") is everyday life,
// not a loss. It hands over only with a sign of fraud: an earlier warning on this call, a red flag
// or a fraud word in the line, or money that went without them (lost, gone, debited).
describe('guardHandover: a payment alone is not a fraud', () => {
  it('stays on guard for ordinary payments', async () => {
    const { guardHandover } = await import('./fastpath');
    for (const [lang, t] of [
      ['en', 'Yes, I already paid it yesterday on PhonePe.'],
      ['en', 'I transferred 15,000 this morning.'],
      ['hi', 'Maine tumhe 200 rupaye bhej diye, chai ke.'],
    ] as const) {
      const c = newComplaint(lang, 'guard');
      expect(guardHandover(c, t), t).toBeNull();
      expect(c.phase, t).toBe('guard');
    }
  });
  it('hands over once the call was already flagged', async () => {
    const { guardHandover } = await import('./fastpath');
    const c = newComplaint('en', 'guard');
    c.flags.push({ scam: 'fake_kyc', red_flag: 'asked for the OTP', heard: 'tell me the OTP' });
    guardHandover(c, 'I transferred 15,000 this morning.');
    expect(c.phase).toBe('complaint');
  });
  it('hands over on a fraud word or money that went without them', async () => {
    const { guardHandover } = await import('./fastpath');
    for (const t of ['I paid 25,000 and now I think it was a scam', 'my money got deducted from my account', 'I lost 40,000 rupees', 'मेरे पैसे कट गए', 'maine 10,000 bhej diye, dhokha ho gaya']) {
      const c = newComplaint('en', 'guard');
      guardHandover(c, t);
      expect(c.phase, t).toBe('complaint');
    }
  });
});
