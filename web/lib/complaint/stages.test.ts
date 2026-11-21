import { describe, expect, it } from 'vitest';
import { stageOf, stagesSeen, STAGE_NAMES } from './stages';

// The organisers' five stages (FAQ 44). Every step text below is one the server logs (act() calls).
describe('stageOf', () => {
  const cases: Array<[Parameters<typeof stageOf>[0], string, number]> = [
    ['heard', 'Listening through an Agora voice agent that stays silent until the caller asks for a code, a scan or money', 0],
    ['heard', 'An Agora voice agent joined the call to take your report, in your language', 0],
    ['flag', 'Red flag on the call: the caller asked for the OTP sent to the phone. Told you to hang up (Fake KYC update)', 1],
    ['tool', 'You said money has gone: switched from listening to taking your report', 1],
    ['tool', 'Switched from listening to taking your report', 1],
    ['heard', 'Understood what happened: a fake KYC call', 1],
    ['heard', 'Heard the UTR and read it back: 4021 7786 9910', 2],
    ['heard', 'Heard the amount: Rs 25,000', 2],
    ['heard', "Heard the payee's UPI ID: ramesh@okaxis", 2],
    ['heard', 'Worked out when it happened: 2026-11-21, 09:30 IST', 2],
    ['heard', 'Noted your bank: State Bank of India', 2],
    ['tool', 'Looked up IFSC SBIN0000813 (Razorpay IFSC API): State Bank of India, Pune', 2],
    ['check', 'Took the UTR from your payment screenshot', 2],
    ['done', 'Every detail confirmed: 1930 script, bank letter and reminders built', 2],
    ['check', 'Read your payment screenshot: it disagrees with what you said on the UTR', 3],
    ['tool', 'Cut in to say the screenshot differs (Agora speak, INTERRUPT)', 3],
    ['tool', 'Said the screenshot matches (Agora speak)', 3],
    ['check', 'Corrected group 2 of the UTR: now 4021 7786 9910', 3],
    ['done', 'You confirmed the UTR', 3],
    ['ask', 'Asked for your yes before emailing the pack', 3],
    ['check', 'Could not email the pack: error', 3],
    ['done', 'You said yes: emailed the pack with the calendar reminders', 4],
    ['done', 'You pressed Send: emailed the pack with the calendar reminders', 4],
    ['tool', 'Told you aloud the pack was emailed (Agora speak)', 4],
    ['tool', 'Started the 1930 interpreter: a second Agora agent on this call, hearing English, Hindi and your language', 4],
    ['done', 'Saved the 1930 acknowledgement number: 31512511200123', 4],
  ];
  it.each(cases)('%s "%s" is stage %i', (kind, text, stage) => {
    expect(stageOf(kind, text)).toBe(stage);
  });

  it('has the five stage names in order', () => {
    expect(STAGE_NAMES).toEqual(['Initiate', 'Understand and plan', 'Execute', 'Confirm', 'Follow up']);
  });
});

describe('stagesSeen', () => {
  it('lists each stage reached on this call, once', () => {
    const seen = stagesSeen([
      { kind: 'heard', text: 'An Agora voice agent joined the call to take your report, in your language' },
      { kind: 'heard', text: 'Heard the UTR and read it back: 4021 7786 9910' },
      { kind: 'done', text: 'You confirmed the UTR' },
      { kind: 'done', text: 'You confirmed the amount' },
    ]);
    expect([...seen].sort()).toEqual([0, 2, 3]);
  });
  it('counts the call as initiated once any step is logged, even if the join step scrolled out of the record', () => {
    const seen = stagesSeen([{ kind: 'done', text: 'You confirmed the UTR' }]);
    expect(seen.has(0)).toBe(true);
  });
  it('is empty with no steps', () => {
    expect(stagesSeen(undefined).size).toBe(0);
  });
});
