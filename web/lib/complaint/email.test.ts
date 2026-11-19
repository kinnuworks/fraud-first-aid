import { describe, expect, it } from 'vitest';
import { sendPackEmail, isEmail } from './email';

const pack = { bankLetter: 'Subject: Fraudulent UPI transaction, UTR 402177889910\nletter', script1930: 'script', operatorCard: 'card', reminders: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n' };

describe('isEmail', () => {
  it('accepts ordinary addresses only', () => {
    expect(isEmail('a.b@example.in')).toBe(true);
    expect(isEmail('nope')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('x@y.com\nBcc: z@w.com')).toBe(false);
  });
});

describe('sendPackEmail', () => {
  it('posts the pack to Resend with the reminders attached and returns the message id', async () => {
    let sent: { url: string; body: Record<string, unknown>; auth: string } | null = null;
    const fake = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)), auth: String((init.headers as Record<string, string>).Authorization) };
      return new Response(JSON.stringify({ id: 'msg_123' }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await sendPackEmail('a.b@example.in', pack, 'k3y', fake);
    expect(r).toEqual({ ok: true, id: 'msg_123' });
    expect(sent!.url).toBe('https://api.resend.com/emails');
    expect(sent!.auth).toBe('Bearer k3y');
    expect(sent!.body.to).toEqual(['a.b@example.in']);
    expect(String(sent!.body.subject)).toContain('402177889910');
    expect(String(sent!.body.text)).toContain('script');
    expect((sent!.body.attachments as Array<{ filename: string }>)[0].filename).toBe('utr-pakka-reminders.ics');
  });

  it('reports a refusal plainly and never throws', async () => {
    const fake = (async () => new Response(JSON.stringify({ message: 'You can only send testing emails to your own email address' }), { status: 403 })) as unknown as typeof fetch;
    expect(await sendPackEmail('x@y.com', pack, 'k', fake)).toEqual({ ok: false, problem: 'You can only send testing emails to your own email address' });
    expect(await sendPackEmail('bad', pack, 'k', fake)).toEqual({ ok: false, problem: 'not an email address' });
    expect(await sendPackEmail('x@y.com', pack, '', fake)).toEqual({ ok: false, problem: 'email is not set up' });
  });
});

describe('email: three reminders and the Ombudsman draft (review 20 Nov)', () => {
  it('says three reminders and includes the draft', async () => {
    const { sendPackEmail } = await import('./email');
    let body = '';
    const fake = (async (_u: string, init: RequestInit) => { body = String(init.body); return new Response(JSON.stringify({ id: 'x' }), { status: 200 }); }) as unknown as typeof fetch;
    await sendPackEmail('a@b.co', { bankLetter: 'Subject: s', script1930: 's', operatorCard: 'o', reminders: 'r', ombudsmanDraft: 'OMBUDSMAN DRAFT' }, 'key', fake);
    const text = JSON.parse(body).text as string;
    expect(text).toMatch(/Three reminders/);
    expect(text).toMatch(/OMBUDSMAN DRAFT/);
  });
});
