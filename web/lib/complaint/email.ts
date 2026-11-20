// Sends the complaint pack to the caller's own email through Resend (an action the agent
// executes): the bank letter, the 1930 script, the operator summary and the calendar reminders.
type PackParts = { bankLetter: string; script1930: string; operatorCard: string; reminders: string; ombudsmanDraft?: string; callRecord?: string };
type Sent = { ok: true; id: string } | { ok: false; problem: string };

export const isEmail = (s: string) => /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(s);

export async function sendPackEmail(to: string, p: PackParts, key = process.env.RESEND_API_KEY ?? '', fetchImpl: typeof fetch = fetch): Promise<Sent> {
  if (!key) return { ok: false, problem: 'email is not set up' };
  if (!isEmail(to)) return { ok: false, problem: 'not an email address' };
  const subject = p.bankLetter.split('\n').find((l) => l.startsWith('Subject:'))?.slice(9).trim() ?? 'Your UPI fraud complaint';
  const text = [
    'Your UPI fraud complaint, prepared by Fraud First Aid.',
    '',
    '1. Call 1930 now and read this out:',
    p.script1930,
    '',
    '2. Send this letter to your bank:',
    p.bankLetter,
    '',
    '3. If the 1930 operator asks, share this summary:',
    p.operatorCard.split('\n').filter((l) => !l.startsWith("Caller's words")).join('\n'),
    '',
    ...(p.callRecord ? ['The scam call as Fraud First Aid heard it (evidence for 1930 and the cyber cell):', p.callRecord, ''] : []),
    'Three reminders (the bank deadline, the RBI credit date and day 30) are attached as a calendar file.',
    ...(p.ombudsmanDraft ? ['', '4. On day 30, if the bank has not replied, file this with the RBI Ombudsman:', p.ombudsmanDraft, ''] : []),
    'Fraud First Aid never asks for an OTP, PIN, password or card number.',
  ].join('\n');
  try {
    const r = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Fraud First Aid <onboarding@resend.dev>',
        to: [to],
        subject: `Fraud First Aid: ${subject}`,
        text,
        attachments: [{ filename: 'fraud-first-aid-reminders.ics', content: Buffer.from(p.reminders).toString('base64') }],
      }),
    });
    const j = (await r.json().catch(() => ({}))) as { id?: string; message?: string };
    if (r.ok && j.id) return { ok: true, id: j.id };
    // the provider's own text can name our account (Resend's test sender says whose inbox it
    // delivers to): log it here, show the caller a plain line
    console.error('[email] send failed:', r.status, j.message);
    return { ok: false, problem: 'email could not be sent to this address right now; copy the pack from the screen instead' };
  } catch {
    return { ok: false, problem: 'email service unreachable' };
  }
}
