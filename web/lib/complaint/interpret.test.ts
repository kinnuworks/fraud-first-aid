import { describe, expect, it } from 'vitest';
import { newComplaint, type Complaint } from './session';
import { canInterpret, interpretSystem, ackFrom, INTERPRET_GREETING } from './interpret';
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
});
