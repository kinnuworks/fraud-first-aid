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

// Read-only link for a second screen (the 1930 operator view, a family member): it can read the
// call's complaint but not start, upload to or stop the call.
export function viewCapFor(channel: string): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac('sha256', s).update(`view:${channel}`).digest('hex').slice(0, 40);
}

// Family link that can also speak into the call (it joins the Agora channel as a speaker). It can
// read the call like the view key, but not start, upload to or stop it. The operator view never
// gets it.
export function talkCapFor(channel: string): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac('sha256', s).update(`talk:${channel}`).digest('hex').slice(0, 40);
}

const same = (want: string | null, key: string | null | undefined) =>
  !!want && !!key && key.length === want.length && timingSafeEqual(Buffer.from(key), Buffer.from(want));

export const canTalk = (channel: string, key: string | null | undefined) => same(talkCapFor(channel), key);

export function canView(channel: string, key: string | null | undefined): boolean {
  if (checkCap(channel, key)) return true;
  return same(viewCapFor(channel), key) || canTalk(channel, key);
}
