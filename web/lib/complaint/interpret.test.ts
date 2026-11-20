import { describe, expect, it } from 'vitest';
import { newComplaint, type Complaint } from './session';
import { canInterpret, interpretSystem, ackFrom, INTERPRET_GREETING, interpretLine, ackLine, spokenWhen, spelled } from './interpret';
import { buildPack } from './pack';
import { READBACK_LANGS } from '../entities/numbers';

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

describe('1930 interpreter', () => {
  it('starts only once every detail is confirmed', () => {
    const c = full('te');
    expect(canInterpret(c)).toBe(true);
    c.fields.payee!.confirmed = false;
    expect(canInterpret(c)).toBe(false);
  });

  it("gives the model only the confirmed details, the caller's language and the ack marker rule", () => {
    const p = interpretSystem(full('te'), '2026-11-19');
    expect(p).toContain('UTR: 4021 7788 9910');
    expect(p).toContain('Rs 25,000');
    expect(p).toContain('ramesh@okaxis');
    expect(p).toContain('speaks Telugu');
    expect(p).toContain('[[ack:');
    expect(p).toMatch(/Never give or ask for an OTP/);
  });

  it('has a greeting in every language the complaint supports', () => {
    for (const l of READBACK_LANGS) expect(INTERPRET_GREETING[l]).toContain('1930');
  });

  it('keeps only letters and digits of an acknowledgement number, 6 to 30 long', () => {
    expect(ackFrom('3151 2511 2001 23')).toBe('31512511200123');
    expect(ackFrom('ab-12')).toBeNull();
    expect(ackFrom('x'.repeat(31))).toBeNull();
  });

  it('puts the acknowledgement number on the operator card', () => {
    const c = full('te');
    c.ack1930 = '31512511200123';
    const p = buildPack(c, '2026-11-19');
    if (!p.ok) throw new Error('expected a pack');
    expect(p.operatorCard).toContain('1930 acknowledgement number: 31512511200123');
  });

  // The model marks the moment ([[intro]], [[utr]]); code says the words and every number (bug audit,
  // 20 Nov: keyword triggers fired on the caller's own "I'm calling 1930").
  it('introduces the case to the operator from code: the right date, the payee spelled, the UTR in words', () => {
    const c = full('te');
    c.phase = 'interpret';
    const intro = interpretLine(c, 'intro')!;
    expect(intro).toContain('19 November 2026 at 2:30 pm');
    expect(intro).toContain('r a m e s h at o k a x i s');
    expect(intro).toContain('The UTR is four zero two one, seven seven eight eight, nine nine one zero.');
    expect(intro).toContain('Rs 25,000');
    expect(intro).toContain('ఆపరేటర్‌కి');
  });

  it('reads the UTR and amount from code when asked, and nothing before the interpreter starts', () => {
    const c = full('te');
    c.fields.utr!.value = '402177869910';
    expect(interpretLine(c, 'utr')).toBeNull(); // still on the complaint
    c.phase = 'interpret';
    expect(interpretLine(c, 'utr')).toMatch(/^The UTR is four zero two one, seven seven eight six, nine nine one zero\. The amount is Rs 25,000\./);
  });

  it("reads the acknowledgement number back in the caller's language from the operator's own words", () => {
    const c = full('te');
    const got = ackLine(c, '3151 2511 2001 23', 'Your complaint is registered. Note the acknowledgement number: three one five one, two five one one, two zero zero one, two three.')!;
    expect(got.ack).toBe('31512511200123');
    expect(got.say).toContain('మూడు ఒకటి ఐదు ఒకటి, రెండు ఐదు ఒకటి ఒకటి, రెండు సున్నా సున్నా ఒకటి, రెండు మూడు');
  });

  it('speaks dates and IDs plainly', () => {
    expect(spokenWhen('2026-11-19T09:05')).toBe('19 November 2026 at 9:05 am');
    expect(spelled('ram.k1@ybl')).toBe('r a m dot k one at y b l');
  });
});
