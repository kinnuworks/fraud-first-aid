// Second source for the numbers: what the payment screenshot says, compared field by field
// with what the caller said. A mismatch is read back; nothing is silently overwritten.
import { groupForReadback } from '../entities/numbers';
import { isUtr } from './fields';
import type { Complaint } from './session';

export type Shot = { utr?: string; amount?: number; payee?: string; when?: string };
type Raw = { utr?: string | null; amount?: string | number | null; payee?: string | null; when?: string | null };

export function normalizeShot(raw: Raw): Shot {
  const utr = (raw.utr ?? '').replace(/\D/g, '');
  const amt = typeof raw.amount === 'number' ? raw.amount : Number(String(raw.amount ?? '').replace(/[^\d.]/g, ''));
  const payee = raw.payee?.trim().toLowerCase();
  return {
    utr: isUtr(utr) ? utr : undefined,
    amount: Number.isFinite(amt) && amt > 0 ? amt : undefined,
    payee: payee || undefined,
    when: raw.when?.trim() || undefined,
  };
}

export type FieldCheck =
  | { status: 'match'; spoken: string | number; screenshot: string | number }
  | { status: 'mismatch'; spoken: string | number; screenshot: string | number; groups?: number[] }
  | { status: 'spoken_only'; spoken: string | number }
  | { status: 'screenshot_only'; screenshot: string | number }
  | { status: 'missing' };

export function compareWithScreenshot(c: Complaint, shot: Shot): Record<'utr' | 'amount' | 'payee' | 'when', FieldCheck> {
  const one = (spoken: string | number | undefined, seen: string | number | undefined, same: boolean): FieldCheck => {
    if (spoken === undefined && seen === undefined) return { status: 'missing' };
    if (seen === undefined) return { status: 'spoken_only', spoken: spoken! };
    if (spoken === undefined) return { status: 'screenshot_only', screenshot: seen };
    return same ? { status: 'match', spoken, screenshot: seen } : { status: 'mismatch', spoken, screenshot: seen };
  };
  const utrS = c.fields.utr?.value;
  const utr = one(utrS, shot.utr, utrS === shot.utr);
  if (utr.status === 'mismatch' && utrS && shot.utr) {
    const a = groupForReadback(utrS), b = groupForReadback(shot.utr);
    utr.groups = a.flatMap((g, i) => (g !== b[i] ? [i + 1] : []));
  }
  const amtS = c.fields.amount?.value;
  const payS = c.fields.payee?.value;
  return {
    utr,
    amount: one(amtS, shot.amount, amtS === shot.amount),
    payee: one(payS, shot.payee, payS === shot.payee),
    // Spoken time is ISO and the screenshot's is free text: shown side by side, not compared.
    when: c.fields.when || shot.when ? one(c.fields.when?.value, shot.when, true) : { status: 'missing' },
  };
}
