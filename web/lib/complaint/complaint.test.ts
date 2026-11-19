import { describe, expect, it } from 'vitest';
import { isUtr, isIfsc, isMobile, spokenUpiId, parseAmount } from './fields';
import { addBankWorkingDays } from './deadline';
import { lookupIfsc } from './ifsc';

describe('field checks', () => {
  it('accepts only 12-digit UTRs', () => {
    expect(isUtr('402177889910')).toBe(true);
    expect(isUtr('40217788991')).toBe(false);
    expect(isUtr('4021778899100')).toBe(false);
  });
  it('checks IFSC shape (4 letters, 0, 6 letters or digits)', () => {
    expect(isIfsc('SBIN0000813')).toBe(true);
    expect(isIfsc('sbin0000813')).toBe(true);
    expect(isIfsc('SBIN1000813')).toBe(false);
  });
  it('accepts Indian mobiles starting 6-9', () => {
    expect(isMobile('9845012345')).toBe(true);
    expect(isMobile('5845012345')).toBe(false);
  });
});

describe('spokenUpiId', () => {
  it('turns "at the rate" and "at" into @ and drops spaces', () => {
    expect(spokenUpiId('ramesh at the rate okaxis')).toBe('ramesh@okaxis');
    expect(spokenUpiId('Ramesh 99 at ybl')).toBe('ramesh99@ybl');
    expect(spokenUpiId('nine eight four five zero one two three four five at paytm')).toBe(
      '9845012345@paytm',
    );
    expect(spokenUpiId('ramesh dot kumar @ oksbi')).toBe('ramesh.kumar@oksbi');
  });
  it('returns null when there is no handle', () => {
    expect(spokenUpiId('I sent it to Ramesh')).toBeNull();
  });
});

describe('parseAmount', () => {
  it('reads rupee amounts in digits and with thousand/lakh words', () => {
    expect(parseAmount('₹25,000')).toBe(25000);
    expect(parseAmount('25000 rupees')).toBe(25000);
    expect(parseAmount('two lakh')).toBe(200000);
    expect(parseAmount('15 thousand')).toBe(15000);
    expect(parseAmount('1.5 lakh')).toBe(150000);
    expect(parseAmount('ఇరవై ఐదు వేలు')).toBe(25000);
    expect(parseAmount('पच्चीस हज़ार रुपये')).toBe(25000);
    expect(parseAmount('ಇಪ್ಪತ್ತೈದು ಸಾವಿರ')).toBe(25000);
  });
});

describe('addBankWorkingDays', () => {
  // RBI: banks close on Sundays and on the 2nd and 4th Saturdays.
  it('skips Sundays and 2nd/4th Saturdays', () => {
    // Thu 19 Nov 2026 + 3 working days: Fri 20, Sat 21 (3rd Sat, open), Mon 23.
    expect(addBankWorkingDays('2026-11-19', 3)).toBe('2026-11-23');
    // Fri 13 Nov 2026 + 1: Sat 14 is the 2nd Saturday (closed), Sun 15 closed -> Mon 16.
    expect(addBankWorkingDays('2026-11-13', 1)).toBe('2026-11-16');
  });
  it('skips listed holidays', () => {
    expect(addBankWorkingDays('2026-11-19', 1, ['2026-11-20'])).toBe('2026-11-21');
  });
});

describe('lookupIfsc', () => {
  it('maps the public IFSC API response to bank and branch', async () => {
    const fake = async () =>
      new Response(
        JSON.stringify({ BANK: 'State Bank of India', BRANCH: 'BANGALORE', CITY: 'BANGALORE URBAN', STATE: 'KARNATAKA', IFSC: 'SBIN0000813' }),
        { status: 200 },
      );
    expect(await lookupIfsc('sbin0000813', fake as typeof fetch)).toEqual({
      ifsc: 'SBIN0000813', bank: 'State Bank of India', branch: 'BANGALORE', city: 'BANGALORE URBAN', state: 'KARNATAKA',
    });
  });
  it('returns null for an unknown code and throws on a server error', async () => {
    expect(await lookupIfsc('XXXX0000000', (async () => new Response('Not Found', { status: 404 })) as typeof fetch)).toBeNull();
    await expect(lookupIfsc('SBIN0000813', (async () => new Response('', { status: 503 })) as typeof fetch)).rejects.toThrow();
  });
  it('rejects a malformed code without calling the API', async () => {
    let called = false;
    await expect(lookupIfsc('HELLO', (async () => { called = true; return new Response('{}'); }) as typeof fetch)).resolves.toBeNull();
    expect(called).toBe(false);
  });
});

// From the bug check on 11a75db (20 Nov): amounts the parser missed or got wrong.
describe('parseAmount: bug check 20 Nov', () => {
  it('Telugu "one lakh twenty thousand"', () => {
    expect(parseAmount('ఒక లక్ష ఇరవై వేలు')).toBe(120000);
    expect(parseAmount('ఒక లక్ష')).toBe(100000);
  });
  it('romanized Hindi "ek lakh bees hazaar"', () => {
    expect(parseAmount('ek lakh bees hazaar')).toBe(120000);
    expect(parseAmount('pachchis hazaar rupaye')).toBe(25000);
  });
  it('colloquial Telugu "paatika" (twenty-five) thousand', () => {
    expect(parseAmount('పాతిక వేలు')).toBe(25000);
  });
});
