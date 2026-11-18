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
    // Before the loss: a scam still in progress comes first.
    expect(p).toMatch(/still on the line|still talking to/i);
    expect(p).toMatch(/hang up/i);
    expect(p).toMatch(/do not (scan|share)/i);
  });
});

describe('screenshot in the call', () => {
  it('take_from_screenshot copies a field unconfirmed and returns the read-back', async () => {
    startComplaint('s4', 'te');
    peekComplaint('s4')!.shot = { utr: '402177889910', amount: 25000 };
    const r = await run(complaintTools('s4', '').take_from_screenshot, { field: 'utr' });
    expect(r).toMatchObject({ ok: true, digits: '402177889910' });
    expect(peekComplaint('s4')?.fields.utr).toEqual({ value: '402177889910', confirmed: false });
    const a = await run(complaintTools('s4', '').take_from_screenshot, { field: 'amount' });
    expect(a).toMatchObject({ ok: true, value: 25000 });
    expect((await run(complaintTools('s4', '').take_from_screenshot, { field: 'payee' })).ok).toBe(false);
  });

  it('the prompt tells the agent about a screenshot mismatch and which group differs', () => {
    startComplaint('s5', 'en');
    const c = peekComplaint('s5')!;
    c.fields.utr = { value: '402177889910', confirmed: false };
    c.shot = { utr: '402177869910' };
    const p = complaintSystem('s5', '2026-11-19');
    expect(p).toContain('Screenshot check');
    expect(p).toContain('utr: MISMATCH (said 402177889910, screenshot 402177869910, group 2)');
  });
});

describe('scam-call guard phase', () => {
  it('a guard session listens silently, names the red flags, and can hand over to the complaint', async () => {
    startComplaint('g1', 'te', 'guard');
    const p = complaintSystem('g1', '2026-11-19');
    expect(p).toContain('<silent>');
    expect(p).toMatch(/OTP/);
    expect(p).toMatch(/QR/);
    expect(p).toMatch(/AnyDesk|screen-sharing/);
    expect(p).toMatch(/digital arrest/i);
    expect(p).toContain('fake_kyc');
    expect(p).toContain('[[flag:');
    expect(p).toContain('start_complaint');
    expect(p).not.toContain('Still needed');
    const r = await run(complaintTools('g1', 'naa dabbulu poyayi').start_complaint);
    expect(r).toMatchObject({ ok: true });
    expect(peekComplaint('g1')?.phase).toBe('complaint');
    expect(complaintSystem('g1', '2026-11-19')).toContain('Still needed');
  });

});

describe('addFlag', () => {
  it('keeps one flag per scam type', async () => {
    const { addFlag } = await import('./session');
    startComplaint('g3', 'te', 'guard');
    const c = peekComplaint('g3')!;
    addFlag(c, 'fake_kyc', 'asked for the OTP', 'OTP bata dijiye');
    addFlag(c, 'fake_kyc', 'threatened to block the account', 'block ho jayega');
    addFlag(c, 'not_a_scam_id', 'x', 'y');
    expect(c.flags).toEqual([{ scam: 'fake_kyc', red_flag: 'asked for the OTP', heard: 'OTP bata dijiye' }]);
  });
});
