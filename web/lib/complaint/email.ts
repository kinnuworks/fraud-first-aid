// Sends the complaint pack to the caller's own email through Resend (an action the agent
// executes): the bank letter, the 1930 script, the operator summary and the calendar reminders.
type PackParts = { bankLetter: string; script1930: string; operatorCard: string; reminders: string };
type Sent = { ok: true; id: string } | { ok: false; problem: string };

export const isEmail = (s: string) => /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(s);

export async function sendPackEmail(to: string, p: PackParts, key = process.env.RESEND_API_KEY ?? '', fetchImpl: typeof fetch = fetch): Promise<Sent> {
  if (!key) return { ok: false, problem: 'email is not set up' };
  if (!isEmail(to)) return { ok: false, problem: 'not an email address' };
  const subject = p.bankLetter.split('\n').find((l) => l.startsWith('Subject:'))?.slice(9).trim() ?? 'Your UPI fraud complaint';
  const text = [
    'Your UPI fraud complaint, prepared by UTR Pakka.',
    '',
    '1. Call 1930 now and read this out:',
    p.script1930,
    '',
    '2. Send this letter to your bank:',
    p.bankLetter,
    '',
    '3. If the 1930 operator asks, share this summary:',
    p.operatorCard,
    '',
    'Two reminders (the bank deadline and the RBI credit date) are attached as a calendar file.',
    'UTR Pakka never asks for an OTP, PIN, password or card number.',
  ].join('\n');
  try {
    const r = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'UTR Pakka <onboarding@resend.dev>',
        to: [to],
        subject: `UTR Pakka: ${subject}`,
        text,
        attachments: [{ filename: 'utr-pakka-reminders.ics', content: Buffer.from(p.reminders).toString('base64') }],
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    return r.ok && j.id ? { ok: true, id: j.id } : { ok: false, problem: j.message ?? `email failed (${r.status})` };
  } catch {
    return { ok: false, problem: 'email service unreachable' };
  }
}
