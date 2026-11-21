import { describe, expect, it } from 'vitest';
import { indianMobile, CallLimiter, mayCall, phoneMode, guardPhoneGreeting } from './phone';

describe('mayCall', () => {
  it('with no list set, any Indian mobile may be called', () => {
    expect(mayCall('+919845012345', undefined)).toBe(true);
    expect(mayCall('+919845012345', '')).toBe(true);
    expect(mayCall('+919845012345', ' , ')).toBe(true);
  });
  it('with a list, only the numbers on it, written in any common form', () => {
    const list = '98450 12345, +91-88005-56677';
    expect(mayCall('+919845012345', list)).toBe(true);
    expect(mayCall('+918800556677', list)).toBe(true);
    expect(mayCall('+917019283746', list)).toBe(false);
  });
  it('a list of only junk refuses everyone rather than opening up', () => {
    expect(mayCall('+919845012345', '1930, abc')).toBe(false);
  });
});

describe('indianMobile', () => {
  it('accepts Indian mobiles in common forms and returns E.164', () => {
    expect(indianMobile('98450 12345')).toBe('+919845012345');
    expect(indianMobile('+91-98450-12345')).toBe('+919845012345');
    expect(indianMobile('09845012345')).toBe('+919845012345');
  });
  it('refuses landlines, short codes, other countries and junk', () => {
    expect(indianMobile('1930')).toBeNull();
    expect(indianMobile('+15673495379')).toBeNull();
    expect(indianMobile('0802345678')).toBeNull();
    expect(indianMobile('5845012345')).toBeNull();
  });
});

describe('CallLimiter', () => {
  it('allows one live call per number and caps calls per hour', () => {
    const l = new CallLimiter(3);
    const t = 1_000_000;
    expect(l.take('+919845012345', t)).toBe(true);
    expect(l.take('+919845012345', t + 1000)).toBe(false); // already on a call
    l.end('+919845012345');
    expect(l.take('+919845012345', t + 2000)).toBe(true);
    l.end('+919845012345');
    expect(l.take('+918800556677', t + 3000)).toBe(true);
    expect(l.take('+917019283746', t + 4000)).toBe(false); // hourly cap of 3 reached
    expect(l.take('+917019283746', t + 3_700_000)).toBe(true); // an hour later
  });
});

// "Listen to my call": the agent rings the presenter, says who it is and asks them to merge it into the
// call they are on, then listens silently like the browser guard. A silent guard may ring only a number
// on the allowlist, never a stranger: with no list, the phone line stays the complaint.
describe('phoneMode', () => {
  it('guard only when asked for and an allowlist is set', () => {
    expect(phoneMode('guard', '+919845012345')).toBe('guard');
    expect(phoneMode('guard', undefined)).toBe('complaint');
    expect(phoneMode('guard', '  ')).toBe('complaint');
    expect(phoneMode('complaint', '+919845012345')).toBe('complaint');
    expect(phoneMode('anything', '+919845012345')).toBe('complaint');
  });
  it('the guard says who it is and asks to be merged, in Hindi, Kannada and English', () => {
    for (const l of ['hi', 'kn', 'en'] as const) expect(guardPhoneGreeting(l).length).toBeGreaterThan(20);
    expect(guardPhoneGreeting('en')).toMatch(/merge/i);
    expect(guardPhoneGreeting('ta')).toBe(guardPhoneGreeting('en'));
  });
});
