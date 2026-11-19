import { describe, expect, it } from 'vitest';
import { indianMobile, CallLimiter } from './phone';

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
