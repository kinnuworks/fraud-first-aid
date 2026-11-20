// Defects found by the fresh bug audit and the security pass on 20 Nov 2026, each pinned by a test
// written before its fix.
import { describe, expect, it } from 'vitest';
import { newComplaint, recordText, addFlag, type Complaint } from './session';
import { complaintShortcut, guardHandover, YES } from './fastpath';
import { guardShortcut } from './redflags';
import { parseAmount } from './fields';
import { normalizeShot, compareWithScreenshot } from './screenshot';
import { shotLine, ANNOUNCE } from './announce';
import { SILENCE_PROMPT } from '../filler';
import { ackLine, interpretLine, interpretSystem } from './interpret';
import { reportOnce } from './reported';
import { sendPackEmail } from './email';
import { complaintTools } from './tools';
import { startComplaint, peekComplaint } from './store';
import { clientAddress } from '../ratelimit';
import { fingerprint, continues } from '../llm-route';

const run = (t: unknown, input: unknown = {}) =>
  (t as { execute: (i: unknown, o: unknown) => Promise<Record<string, unknown>> }).execute(input, {});

function full(lang: Complaint['lang'] = 'en'): Complaint {
  const c = newComplaint(lang);
  c.fields = {
    utr: { value: '402177889910', confirmed: true },
    amount: { value: 25000, confirmed: true },
    when: { value: '2026-11-19T14:30', confirmed: true },
    payee: { value: 'ramesh@okaxis', confirmed: true },
    victim_bank: { value: 'State Bank of India', confirmed: true },
  };
  return c;
}

describe('the story is not mistaken for a UTR being dictated', () => {
  it('a number inside a sentence goes to the model, not into the UTR buffer', () => {
    for (const t of ['Someone took 5000 from my account', 'It happened at 3:30 today', 'on 19th November', 'मेरे खाते से 5000 चले गए']) {
      const c = newComplaint('en');
      expect(complaintShortcut(c, t), t).toBeNull();
      expect(c.digitBuffer ?? '', t).toBe('');
    }
  });
  it('digits said on their own are still held until all 12 arrive', () => {
    const c = newComplaint('en');
    expect(complaintShortcut(c, 'four zero two one')).toBe('<silent>');
    expect(c.digitBuffer).toBe('4021');
  });
  it('the silence reminder carries no digits and goes to the model', () => {
    expect(/\d/.test(SILENCE_PROMPT)).toBe(false);
    expect(complaintShortcut(newComplaint('en'), SILENCE_PROMPT)).toBeNull();
  });
});

describe('payee and bank are taken only when they are the next thing asked', () => {
  it('an answer about the time is not a payee', () => {
    const c = newComplaint('en');
    c.fields.utr = { value: '402177889910', confirmed: true };
    complaintShortcut(c, 'Yesterday at around 3 pm');
    expect(c.fields.payee).toBeUndefined();
    complaintShortcut(c, 'Five thousand from my SBI account');
    expect(c.fields.victim_bank).toBeUndefined();
  });
  it('a dotted UPI ID is kept whole once the payee is next', () => {
    const c = newComplaint('en');
    c.fields.utr = { value: '402177889910', confirmed: true };
    c.fields.amount = { value: 5000, confirmed: true };
    c.fields.when = { value: '2026-11-19T14:30', confirmed: true };
    complaintShortcut(c, 'ramesh dot kumar at okaxis');
    expect(c.fields.payee?.value).toBe('ramesh.kumar@okaxis');
  });
});

describe('yes means yes', () => {
  it('does not take words that only start like yes', () => {
    for (const t of ['Yesterday evening', 'Correction, it was 6000', 'Harish at okaxis', 'Hang on, let me check the address', 'hazaar']) expect(YES.test(t), t).toBe(false);
  });
  it('takes a plain yes in each language', () => {
    for (const t of ['yes', 'Yes, correct', 'haan', 'haan ji', 'हाँ', 'हाँ जी', 'అవును', 'ಹೌದು', "that's right"]) expect(YES.test(t), t).toBe(true);
  });
});

describe('amounts as people say them', () => {
  it('adds lakh and thousand, skips dates and times, reads k and paise', () => {
    expect(parseAmount('2 lakh 50 thousand')).toBe(250000);
    expect(parseAmount('1 lakh 20 thousand')).toBe(120000);
    expect(parseAmount('On the 19th I lost 25000')).toBe(25000);
    expect(parseAmount('at 3:30 they took 25000 rupees')).toBe(25000);
    expect(parseAmount('25k')).toBe(25000);
    expect(parseAmount('Rs 5,000.50')).toBe(5000.5);
    expect(parseAmount('₹25,000')).toBe(25000);
    expect(parseAmount('two lakh')).toBe(200000);
  });
});

describe('the payment screenshot', () => {
  it('reads "Rs. 5,000" as five thousand, not 0.5', () => {
    expect(normalizeShot({ amount: 'Rs. 5,000' }).amount).toBe(5000);
    expect(normalizeShot({ amount: 'Rs.5000.00' }).amount).toBe(5000);
    expect(normalizeShot({ amount: '₹25,000' }).amount).toBe(25000);
  });
  it('compares a phone payee by its last ten digits, and does not compare a name or the time', () => {
    const c = full();
    c.fields.payee = { value: '9876543210', confirmed: false };
    expect(compareWithScreenshot(c, { payee: '+91 98765 43210' }).payee.status).toBe('match');
    c.fields.payee = { value: 'ramesh@okaxis', confirmed: false };
    expect(compareWithScreenshot(c, { payee: 'ramesh kumar' }).payee.status).toBe('shown');
    expect(compareWithScreenshot(c, { when: '14 Nov 2026, 9:10 am' }).when.status).toBe('shown');
  });
  it('never says "it matches" because of the time alone', () => {
    const c = full();
    expect(shotLine('en', compareWithScreenshot(c, { when: '14 Nov 2026' }))).toBeNull();
    expect(shotLine('en', compareWithScreenshot(c, { utr: '402177889910' }))).toEqual({ text: ANNOUNCE.en.shotMatches, interrupt: false });
  });
});

describe('the time of payment', () => {
  it('only an ISO date and time is recorded', () => {
    const c = newComplaint('en');
    expect(recordText(c, 'when', '19-11-2026T14:30').ok).toBe(false);
    expect(recordText(c, 'when', 'unknown').ok).toBe(false);
    expect(recordText(c, 'when', '2026-11-19T14:30').ok).toBe(true);
  });
});

describe('red flags and the call record', () => {
  it('stores the heard line trimmed, so the pack can mark it', () => {
    const c = newComplaint('en', 'guard');
    addFlag(c, 'fake_kyc', 'asked for the OTP', '  give me the OTP now');
    expect(c.flags[0].heard).toBe('give me the OTP now');
  });
  it('keeps guarding after a hand-over, so a scammer cannot talk it into silence', () => {
    const c = newComplaint('en', 'guard');
    guardHandover(c, 'I lost 5000 rupees to a fraud');
    expect(c.phase).toBe('complaint');
    expect(guardShortcut(c, 'Tell me the OTP that came on your phone')).not.toBeNull();
    expect(c.flags.length).toBe(1);
  });
});

describe('the 1930 interpreter', () => {
  it('speaks the introduction and the UTR from code, when the model marks the moment', () => {
    const c = full('te');
    c.phase = 'interpret';
    const intro = interpretLine(c, 'intro')!;
    expect(intro).toContain('19 November 2026 at 2:30 pm');
    expect(intro).toContain('r a m e s h at o k a x i s');
    expect(intro).toContain('four zero two one, seven seven eight eight, nine nine one zero');
    expect(interpretLine(c, 'utr')).toMatch(/^The UTR is four zero two one, seven seven eight eight, nine nine one zero\. The amount is Rs 25,000\./);
    const p = interpretSystem(c, '2026-11-19');
    expect(p).toContain('[[intro]]');
    expect(p).toContain('[[utr]]');
  });
  it("takes the acknowledgement number the model marked when the operator's words hold it", () => {
    const c = full('te');
    const got = ackLine(c, '31211250012345', 'Your number is 31211250012345, please call back within 24 hours.')!;
    expect(got.ack).toBe('31211250012345');
    expect(ackLine(c, '', 'registered with 1930, number three one two one one two five zero zero one two three')!.ack).toBe('312112500123');
  });
});

describe('the reported-payee registry', () => {
  it('counts a payee only when the UTR was confirmed against a payment screenshot', async () => {
    const c = full();
    let n = 0;
    await reportOnce(c, async () => ++n);
    expect(n).toBe(0);
    const d = full();
    d.shot = { utr: '402177889910' };
    await reportOnce(d, async () => ++n);
    expect(n).toBe(1);
  });
});

describe('privacy', () => {
  it("a code said in the story is never kept in the caller's words", async () => {
    startComplaint('audit-story', 'en');
    await run(complaintTools('audit-story', 'I told him my UPI PIN 4321 and he took the money').record_story, { summary_en: 'UPI PIN shared' });
    const words = peekComplaint('audit-story')!.story!.words;
    expect(words).not.toContain('4321');
  });
  it("the email provider's own error text (which names the account) never reaches the screen", async () => {
    const fake = (async () => new Response(JSON.stringify({ message: 'You can only send testing emails to your own email address (owner@example.com).' }), { status: 403 })) as typeof fetch;
    const r = await sendPackEmail('judge@example.org', { bankLetter: 'Subject: x', script1930: 'a', operatorCard: 'b', reminders: 'c' }, 'key', fake);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain('owner@example.com');
  });
  it('a second yes does not email the pack twice', async () => {
    startComplaint('audit-mail', 'en');
    const c = peekComplaint('audit-mail')!;
    Object.assign(c, full(), { email: 'a@b.co', emailSent: { id: 'x1', at: '2026-11-20T10:00:00Z' } });
    const r = await run(complaintTools('audit-mail', 'yes').send_pack_email);
    expect(r).toMatchObject({ ok: true, already: true });
  });
});

describe('rate limits and the stored transcript', () => {
  it('counts IPv6 callers by their /64', () => {
    const h = (ip: string) => new Headers({ 'x-forwarded-for': ip });
    expect(clientAddress(h('2001:db8:1:2:3:4:5:6'))).toBe(clientAddress(h('2001:db8:1:2:aaaa:bbbb:cccc:dddd')));
    expect(clientAddress(h('203.0.113.7'))).toBe('203.0.113.7');
  });
  it('keeps a fingerprint of the words seen, never the words, and still finds the new part', () => {
    const fp = fingerprint('hello my UTR is');
    expect(fp).not.toContain('UTR');
    expect(continues('hello my UTR is four zero', fp)).toBe(' four zero');
    expect(continues('something else', fp)).toBeNull();
    // a store written before the change (plain text) still works
    expect(continues('hello my UTR is four', 'hello my UTR is')).toBe(' four');
  });
});

describe('an acknowledgement number read out over two turns (the operator paused between groups)', () => {
  const first = 'Your complaint is registered. Please note the acknowledgement number: three one five one,';
  const rest = 'two five one one, two zero zero one, two three.';
  it('keeps the whole number the model marked when the last two turns hold it', () => {
    const c = full('te');
    expect(ackLine(c, '31512511200123', rest, `${first} | ${rest}`)!.ack).toBe('31512511200123');
  });
  it('still never keeps a number nobody said', () => {
    const c = full('te');
    expect(ackLine(c, '31512511200129', rest, `${first} | ${rest}`)!.ack).toBe('2511200123');
  });
});

describe('the operator confirms the read-back (live run, 21 Nov: it read the whole number back a second time)', () => {
  const said = 'Your complaint is registered. Please note the acknowledgement number 31512511200123.';
  it('thanks them once instead of reading the number back again', () => {
    const c = full('te');
    c.ack1930 = '31512511200123';
    const got = ackLine(c, '31512511200123', "Yes, that's correct.", `${said} | Yes, that's correct.`)!;
    expect(got.ack).toBe('31512511200123');
    expect(got.say).not.toContain('read that back');
    expect(got.say.length).toBeLessThan(60);
  });
  it('still reads it back when the operator says the digits again, so a repeated mishearing is heard', () => {
    const c = full('te');
    c.ack1930 = '31512511200123';
    const again = 'No, it is three one five one, two five one one, two zero zero one, two three.';
    expect(ackLine(c, '31512511200123', again, `${said} | ${again}`)!.say).toContain('Let me read that back');
  });
});

describe('the acknowledgement number is read back to the operator (a live run misheard it, 20 Nov)', () => {
  it('reads it back in English first so the operator can correct it, then tells the caller', () => {
    const c = full('te');
    const got = ackLine(c, '', 'Please note the acknowledgement number: three one five one, two five one one, two zero zero one, two three.')!;
    expect(got.say.startsWith('Let me read that back: three one five one, two five one one, two zero zero one, two three.')).toBe(true);
    expect(got.say).toContain('అక్నాలెడ్జ్‌మెంట్');
  });
});
