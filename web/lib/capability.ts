// A call's channel name is created by the server and comes with a capability: an HMAC of the
// channel signed with a server secret. Every call route checks it, so knowing or guessing a
// channel name is not enough to join, read, upload to, start or stop someone else's call.
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const secret = () => process.env.LLM_SHARED_SECRET || '';

export const newChannel = () => `up-${randomBytes(16).toString('hex')}`;

export function capFor(channel: string): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac('sha256', s).update(`cap:${channel}`).digest('hex').slice(0, 40);
}

export function checkCap(channel: string, cap: string | null | undefined): boolean {
  const want = capFor(channel);
  if (!want || !cap || cap.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(cap), Buffer.from(want));
}
