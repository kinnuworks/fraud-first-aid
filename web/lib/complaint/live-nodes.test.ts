import { describe, expect, it } from 'vitest';
import { nodesForAction, nodesForState, flowsFor, nextFlash, isFlashing, stateCaption } from './live-nodes';

// The live "behind the scenes" panel on the call screen lights the parts that act, from two real
// signals: Agora's agent state (RTM) and each step the server logs (act()).
describe('nodesForState', () => {
  it('listening: your mic and Agora RTC carry your voice to Sarvam', () => {
    expect(nodesForState('listening').sort()).toEqual(['ag-agent', 'ag-rtc', 'ex-sarvam', 'you-call'].sort());
  });
  it('thinking: Agora hands the turn to our server', () => {
    expect(nodesForState('thinking').sort()).toEqual(['ag-agent', 'sv-model'].sort());
  });
  it('speaking: Murf Falcon speaks back over RTC', () => {
    expect(nodesForState('speaking').sort()).toEqual(['ag-agent', 'ag-rtc', 'ex-murf', 'you-call'].sort());
  });
  it('silent turn: our scam guard heard nothing risky, so the agent stays quiet', () => {
    expect(nodesForState('silent').sort()).toEqual(['ag-agent', 'sv-guard'].sort());
  });
  it('a caption for every agent state, and the join message only before the agent reports', () => {
    expect(stateCaption('silent', 'guard')).toMatch(/silent turn/i);
    expect(stateCaption('idle', 'complaint')).not.toMatch(/join/i);
    expect(stateCaption(null, 'guard')).toMatch(/join/i);
    expect(stateCaption('listening', 'guard')).toMatch(/on guard/i);
    expect(stateCaption('speaking', 'complaint')).toMatch(/murf/i);
  });
  it('nothing lit before the agent is on the call', () => {
    expect(nodesForState(null)).toEqual([]);
    expect(nodesForState('idle')).toEqual([]);
  });
});

describe('nodesForAction', () => {
  const cases: Array<[Parameters<typeof nodesForAction>[0], string, string[]]> = [
    [
      'flag',
      'Red flag on the call: the caller asked for the OTP sent to the phone. Told you to hang up (Fake KYC update)',
      ['sv-guard', 'ag-agent', 'ex-murf'],
    ],
    [
      'heard',
      'Listening through an Agora voice agent that stays silent until the caller asks for a code, a scan or money',
      ['ag-agent', 'ag-rtc'],
    ],
    ['tool', 'You said money has gone: switched from listening to taking your report', ['sv-model', 'ex-ai']],
    ['heard', 'Understood what happened: a fake KYC call', ['sv-model', 'ex-ai']],
    ['heard', 'Heard the UTR and read it back: 4021 7786 9910', ['sv-numbers']],
    ['heard', 'Heard the amount: Rs 25,000', ['sv-numbers']],
    ['tool', 'Looked up IFSC SBIN0000813 (Razorpay IFSC API): State Bank of India, Pune', ['sv-model', 'ex-ifsc']],
    ['check', 'Read your payment screenshot: it disagrees with what you said on the UTR', ['sv-shot', 'ex-ai']],
    ['tool', 'Cut in to say the screenshot differs (Agora speak, INTERRUPT)', ['ag-speak', 'ex-murf']],
    ['check', 'Corrected group 2 of the UTR: now 4021 7786 9910', ['sv-numbers']],
    ['done', 'Every detail confirmed: 1930 script, bank letter and reminders built', ['sv-pack']],
    ['ask', 'Asked for your yes before emailing the pack', ['sv-model']],
    ['done', 'You said yes: emailed the pack with the calendar reminders', ['sv-pack', 'ex-resend']],
    ['tool', 'Started the 1930 interpreter: a second Agora agent on this call, hearing English, Hindi and your language', ['ag-second']],
    ['done', 'Saved the 1930 acknowledgement number: 31512511200123', ['ag-second', 'sv-numbers']],
  ];
  it.each(cases)('%s "%s"', (kind, text, nodes) => {
    const got = nodesForAction(kind, text);
    for (const n of nodes) expect(got).toContain(n);
    // every step is saved to the shared store
    expect(got).toContain('ex-store');
  });
});

describe('flowsFor', () => {
  it('turns lit parts into the arrows that carry them', () => {
    expect(flowsFor(['you-call', 'ag-rtc', 'ex-sarvam', 'ag-agent'], 'listening')).toEqual(['you-ag']);
    expect(flowsFor(['ag-agent', 'sv-model'], 'thinking')).toEqual(['ag-sv']);
    expect(flowsFor(['sv-model', 'ex-ifsc', 'ex-store'], null)).toEqual(['sv-ex']);
    expect(flowsFor(['ag-agent', 'ex-murf', 'you-call', 'ag-rtc'], 'speaking')).toEqual(['ag-you']);
  });
});

// The newest step lights its parts for 5 s, then the panel goes back to Agora's agent state. The call
// screen re-polls every second or two and gets the same step back each time; that must not keep it lit.
describe('nextFlash / isFlashing', () => {
  it('a new step stays lit for 5 s, then goes out', () => {
    const rec = nextFlash(null, 'a', 1000);
    expect(isFlashing(rec, 'a', 5999)).toBe(true);
    expect(isFlashing(rec, 'a', 6000)).toBe(false);
  });
  it('the same step polled again neither restarts nor extends it', () => {
    const rec = nextFlash(null, 'a', 1000);
    const again = nextFlash(rec, 'a', 4000);
    expect(again).toBe(rec);
    expect(isFlashing(again, 'a', 6500)).toBe(false);
  });
  it('a newer step starts its own 5 s', () => {
    const rec = nextFlash(nextFlash(null, 'a', 1000), 'b', 7000);
    expect(isFlashing(rec, 'b', 11999)).toBe(true);
    expect(isFlashing(rec, 'a', 7001)).toBe(false);
  });
  it('no step, nothing lit', () => {
    expect(nextFlash(null, '', 1000)).toBe(null);
    expect(isFlashing(null, '', 1000)).toBe(false);
  });
});
