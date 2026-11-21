import { describe, expect, it } from 'vitest';
import { newComplaint } from './session';
import { canInterpret, interpretLine } from './interpret';
import { DEMO_1930_CLIPS, operatorReply, seedDemo1930, DEMO_ACK } from './demo1930';

// "Watch it call 1930 for you": one click, no microphone, no complaint to finish first. A labelled
// sample complaint is loaded already confirmed, the interpreter starts at once, and the sample 1930
// operator's lines play into the call one at a time.
describe('seedDemo1930', () => {
  it('loads a sample complaint with every detail confirmed, so the interpreter can start at once', () => {
    const c = newComplaint('te', 'complaint');
    seedDemo1930(c, '2026-11-21');
    expect(canInterpret(c)).toBe(true);
    expect(c.fields.utr?.value).toBe('402177869910');
    expect(c.fields.amount?.value).toBe(25000);
    expect(c.fields.payee?.value).toBe('ramesh@okaxis');
    expect(c.fields.victim_bank?.value).toBe('State Bank of India');
    expect(c.fields.when?.value).toBe('2026-11-21T09:30');
    expect(c.phase).toBe('interpret');
  });
  it('says on screen that it is sample data', () => {
    const c = newComplaint('te', 'complaint');
    seedDemo1930(c, '2026-11-21');
    expect((c.actions ?? []).some((a) => /sample/i.test(a.text))).toBe(true);
  });
});

describe('the interpreter gives 1930 nearly everything itself', () => {
  it('its opening line names the amount, time, payee, UTR and the bank, all from code', () => {
    const c = newComplaint('te', 'complaint');
    seedDemo1930(c, '2026-11-21');
    const line = interpretLine(c, 'intro') ?? '';
    expect(line).toMatch(/25,000/);
    expect(line).toMatch(/r a m e s h at o k a x i s/);
    expect(line).toMatch(/State Bank of India/);
    expect(line).toMatch(/four zero two one/i);
  });
});

describe('the sample 1930 operator', () => {
  it('plays hello, asks for the UTR, the name (the sample caller answers), then gives the acknowledgement number', () => {
    expect(DEMO_1930_CLIPS).toEqual(['operator-1-hello', 'operator-2-utr', 'operator-3-name', 'victim-8-name', 'operator-4-ack']);
  });
  it('confirms a read-back that is exact and corrects one that is not, as a real operator would', () => {
    expect(operatorReply(DEMO_ACK)).toBe('operator-5-confirm');
    expect(operatorReply('31512511200128')).toBe('operator-5-correct');
    expect(operatorReply('')).toBe(null);
  });
});
