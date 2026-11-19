// Agora's SIP calls arrive at our Twilio SIP domain; Twilio asks this route what to do and we answer
// with TwiML that dials the Indian mobile as an ordinary Twilio voice call. (Twilio's Elastic SIP
// Trunking fails calls to India at once, while its voice calls to India go through.)
// Only signed Twilio requests, and only Indian mobile numbers, so the domain can't be used for toll fraud.
import { createHmac, timingSafeEqual } from 'crypto';
import { indianMobile } from './phone';

export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('');
  return createHmac('sha1', authToken).update(data).digest('base64');
}

export function validTwilioRequest(authToken: string, url: string, params: Record<string, string>, signature: string | null): boolean {
  if (!signature) return false;
  const want = Buffer.from(twilioSignature(authToken, url, params));
  const got = Buffer.from(signature);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function sipDialTarget(toUri: string): string | null {
  const m = /^sips?:([^@;]+)@/.exec(toUri.trim());
  return m ? indianMobile(m[1]) : null;
}

export function dialTwiml(number: string | null, callerId: string): string {
  if (!number) return '<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="rejected"/></Response>';
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${callerId}" timeout="40" answerOnBridge="true"><Number>${number}</Number></Dial></Response>`;
}
