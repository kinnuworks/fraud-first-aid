// Sends a call's finished pack to the email the caller typed, and records the outcome.
import { buildPack } from './pack';
import { sendPackEmail } from './email';
import { istToday } from './today';
import type { Complaint } from './session';

export async function sendPack(c: Complaint) {
  if (!c.email) return { ok: false as const, problem: 'no email address on screen yet' };
  const pack = buildPack(c, istToday());
  if (!pack.ok) return { ok: false as const, problem: `not ready: ${pack.missing.join(', ')}` };
  const r = await sendPackEmail(c.email, pack);
  c.emailSent = r.ok ? { id: r.id, at: new Date().toISOString() } : { problem: r.problem };
  return r;
}
