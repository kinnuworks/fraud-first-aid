import { describe, expect, it } from 'vitest';
import { newComplaint } from './session';
import { canInterpret, interpretLine } from './interpret';
import { DEMO_1930_CLIPS, DEMO_COMPLAINT_STEPS, DEMO_COMPLAINT_FAST, demo1930Clips, nextComplaintClip, operatorReply, scamClipFor, seedDemo1930, seedDemoStory, waitBefore, DEMO_ACK } from './demo1930';

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
    // it starts as a finished complaint; the page then starts the interpreter through 'Speak to 1930 for me'
    expect(c.phase).toBe('complaint');
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
    c.phase = 'interpret'; // as /api/call/interpret sets it when the interpreter takes over
    const line = interpretLine(c, 'intro') ?? '';
    expect(line).toMatch(/25,000/);
    expect(line).toMatch(/r a m e s h at o k a x i s/);
    expect(line).toMatch(/State Bank of India/);
    expect(line).toMatch(/four zero two one/i);
  });
});

describe('the sample 1930 operator', () => {
  it('plays hello, asks for the name (the sample caller answers), then gives the acknowledgement number', () => {
    // no separate "tell me the UTR": the interpreter's opening summary already gives it (21 Nov: shorter demo)
    expect(DEMO_1930_CLIPS).toEqual(['operator-1-hello', 'operator-3-name', 'victim-8-name', 'operator-4-ack']);
  });
  it('confirms a read-back that is exact and corrects one that is not, as a real operator would', () => {
    expect(operatorReply(DEMO_ACK)).toBe('operator-5-confirm');
    expect(operatorReply('31512511200128')).toBe('operator-5-correct');
    expect(operatorReply('')).toBe(null);
  });
});

// "Watch it take a complaint": the labelled sample caller's lines play into a live complaint call,
// and the sample payment screenshot is added by itself after the UTR.
describe('the sample complaint caller', () => {
  it('says money has gone, gives the UTR with one group wrong, adds the screenshot, then backs the screenshot', () => {
    const i = (s: string) => DEMO_COMPLAINT_STEPS.indexOf(s);
    expect(DEMO_COMPLAINT_STEPS[0]).toBe('victim-1-lost');
    expect(i('victim-2-utr')).toBeLessThan(i('screenshot'));
    expect(i('screenshot')).toBeLessThan(i('victim-3-screenshot-right'));
  });
  it('then confirms the payee, the time on the screenshot and the bank', () => {
    for (const c of ['victim-5-payee', 'victim-6-when-shot', 'victim-7-bank']) expect(DEMO_COMPLAINT_STEPS).toContain(c);
    expect(DEMO_COMPLAINT_STEPS[DEMO_COMPLAINT_STEPS.length - 1]).toBe('victim-4-yes');
  });
});

describe('the 1930 demo in Hindi', () => {
  it('the sample caller answers the name question in Hindi; the operator lines stay English', () => {
    expect(demo1930Clips('hi')).toEqual(['operator-1-hello', 'operator-3-name', 'victim-8-name-hi', 'operator-4-ack']);
    expect(demo1930Clips('te')).toEqual(DEMO_1930_CLIPS);
  });
});

// After the UTR and the screenshot, the sample caller answers what the agent is asking, from the
// call's own state, instead of a fixed order (a fixed order cost an 82 s detour on 21 Nov).
describe('nextComplaintClip', () => {
  const f = (v: unknown, confirmed: boolean) => ({ value: v, confirmed });
  it('a detail read back and not yet confirmed gets a yes', () => {
    expect(nextComplaintClip({ fields: { payee: f('ramesh@okaxis', false) }, missing: ['payee (not confirmed)', 'victim_bank'] })).toBe('victim-4-yes');
  });
  it('a missing detail gets its line: the amount and the UPI ID backed from the screenshot, then the time, then the bank', () => {
    // 21 Nov: the agent asked for the amount and the caller had no line for it, then 'okaxis' was misheard
    // three times; backing the screenshot's amount and UPI ID cut about 80 s from the demo
    expect(nextComplaintClip({ fields: {}, missing: ['amount', 'payee', 'when', 'victim_bank'] })).toBe('victim-9-amount-shot');
    expect(nextComplaintClip({ fields: {}, missing: ['payee', 'when', 'victim_bank'] })).toBe('victim-5-payee-shot');
    expect(nextComplaintClip({ fields: {}, missing: ['when', 'victim_bank'] })).toBe('victim-6-when-shot');
    expect(nextComplaintClip({ fields: {}, missing: ['victim_bank'] })).toBe('victim-7-bank');
  });
  it('nothing left: no clip', () => {
    expect(nextComplaintClip({ fields: { utr: f('402177869910', true) }, missing: [] })).toBe(null);
  });
});

// "Watch it catch a scam call" plays the sample scam call in the chosen language where one exists:
// the guard hears in that language, so a Hindi call under Kannada was missed in 1 of 2 runs (21 Nov).
describe('scamClipFor', () => {
  it('Kannada gets the Kannada sample call; everything else the Hindi one', () => {
    expect(scamClipFor('kn')).toBe('/demo/sample-scam-call-kn.wav');
    expect(scamClipFor('hi')).toBe('/demo/sample-scam-call.wav');
    expect(scamClipFor(null)).toBe('/demo/sample-scam-call.wav');
  });
});

// The short complaint demo: what happened is already noted (labelled sample), so the caller's first
// line is the UTR with one group wrong, then the screenshot goes in and Agora cuts in.
describe('the short complaint demo', () => {
  it('starts at the UTR, then the screenshot, then backs the screenshot', () => {
    expect(DEMO_COMPLAINT_FAST).toEqual(['victim-2-utr', 'screenshot', 'victim-3-screenshot-right']);
  });
  it('notes what happened as sample data, so the pack still says how it happened', () => {
    const c = newComplaint('te', 'complaint');
    seedDemoStory(c);
    expect(c.story?.en).toMatch(/KYC/);
    expect((c.actions ?? []).some((a) => /sample/i.test(a.text) && /what happened/i.test(a.text))).toBe(true);
  });
});

// The cut-in: the screenshot goes in while the agent is still reading the UTR back, so Agora's speak
// API interrupts it mid-sentence every time (added after it went quiet, it only spoke up; 21 Nov).
describe('waitBefore', () => {
  it('before the screenshot, wait only until the agent starts speaking; otherwise until it has answered', () => {
    expect(waitBefore('screenshot')).toBe('speaking');
    expect(waitBefore('victim-3-screenshot-right')).toBe('answered');
    expect(waitBefore(undefined)).toBe('answered');
  });
});
