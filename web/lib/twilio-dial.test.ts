import { describe, expect, it } from 'vitest';
import { createHmac } from 'crypto';
import { twilioSignature, validTwilioRequest, sipDialTarget, dialTwiml } from './twilio-dial';

const url = 'https://utr-pakka.vercel.app/api/call/twilio-dial';
const params = { To: 'sip:+919845012345@utrpakka.sip.twilio.com', From: 'sip:+15673495379@1.2.3.4', CallSid: 'CA1' };

describe('twilioSignature', () => {
  it('is HMAC-SHA1 of the URL plus the sorted params, base64', () => {
    const data = url + 'CallSid' + 'CA1' + 'From' + params.From + 'To' + params.To;
    expect(twilioSignature('tok', url, params)).toBe(createHmac('sha1', 'tok').update(data).digest('base64'));
  });
  it('accepts a correct signature and rejects a wrong token, a changed param or none', () => {
    const sig = twilioSignature('tok', url, params);
    expect(validTwilioRequest('tok', url, params, sig)).toBe(true);
    expect(validTwilioRequest('other', url, params, sig)).toBe(false);
    expect(validTwilioRequest('tok', url, { ...params, To: 'sip:+447700900000@x' }, sig)).toBe(false);
    expect(validTwilioRequest('tok', url, params, null)).toBe(false);
  });
});

describe('sipDialTarget', () => {
  it('takes the Indian mobile out of the SIP request URI', () => {
    expect(sipDialTarget('sip:+919845012345@utrpakka.sip.twilio.com')).toBe('+919845012345');
    expect(sipDialTarget('sip:919845012345@utrpakka.sip.twilio.com;transport=udp')).toBe('+919845012345');
  });
  it('refuses anything that is not an Indian mobile (no toll fraud through our domain)', () => {
    expect(sipDialTarget('sip:+447700900000@utrpakka.sip.twilio.com')).toBeNull();
    expect(sipDialTarget('sip:+911123456789@utrpakka.sip.twilio.com')).toBeNull();
    expect(sipDialTarget('nonsense')).toBeNull();
  });
});

describe('dialTwiml', () => {
  it('dials the number with our caller ID', () => {
    const x = dialTwiml('+919845012345', '+15673495379');
    expect(x).toContain('<Dial callerId="+15673495379"');
    expect(x).toContain('<Number>+919845012345</Number>');
  });
  it('hangs up when there is nothing to dial', () => {
    expect(dialTwiml(null, '+15673495379')).toContain('<Reject');
  });
});
