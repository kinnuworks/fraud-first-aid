import { describe, expect, it } from 'vitest';
import { complaintTools } from './tools';
import { peekComplaint, startComplaint } from './store';
import { complaintSystem } from './prompt';

const run = (t: unknown, input: unknown = {}) =>
  (t as { execute: (i: unknown, o: unknown) => Promise<Record<string, unknown>> }).execute(input, {});

describe('complaint tools', () => {
  it("record_utr reads the caller's transcript, not model text", async () => {
    startComplaint('s1', 'hi');
    const tools = complaintTools('s1', 'मेरा यूटीआर है चार शून्य दो एक सात सात आठ आठ नौ नौ एक शून्य।');
    const r = await run(tools.record_utr);
    expect(r).toMatchObject({ ok: true, digits: '402177889910' });
    expect(peekComplaint('s1')?.fields.utr?.value).toBe('402177889910');
  });

  it('correct_group then confirm, and status lists what is left', async () => {
    startComplaint('s2', 'en');
    await run(complaintTools('s2', '4021 7788 9910').record_utr);
    await run(complaintTools('s2', 'seven seven eight six').correct_group, { field: 'utr', group: 2 });
    await run(complaintTools('s2', 'yes').confirm, { field: 'utr' });
    expect(peekComplaint('s2')?.fields.utr).toEqual({ value: '402177869910', confirmed: true });
    const s = await run(complaintTools('s2', '').status);
    expect(s.missing).toEqual(['amount', 'when', 'payee', 'victim_bank']);
  });
});

describe('complaintSystem', () => {
  it('names the language, the date and the never-ask rule, and shows the complaint so far', () => {
    startComplaint('s3', 'te');
    const p = complaintSystem('s3', '2026-11-19');
    expect(p).toContain('Telugu');
    expect(p).toContain('2026-11-19');
    expect(p).toMatch(/never ask for an OTP, PIN, password/i);
    expect(p).toContain('Still needed: utr, amount, when, payee, victim_bank');
  });
});
