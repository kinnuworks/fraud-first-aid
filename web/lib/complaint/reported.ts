// "Reported before": every confirmed complaint counts a one-way hash of the payee's UPI ID, so a
// later guarded call can warn the moment a caller names an ID already in a fraud complaint. Only a
// keyed hash is stored (never the ID), counts expire after 90 days, and the warning says "named in
// an earlier complaint", never that anyone is a criminal.
import { createHmac } from 'crypto';
import { shared } from './shared';
import type { Complaint } from './session';
import { addFlag, missingFields } from './session';
import { isLoss } from './redflags';

const UPI = /([a-z0-9][a-z0-9._-]{1,})\s*(?:@|\bat the rate(?: of)?\b|\bat\b)\s*([a-z][a-z0-9]{1,})/i;
export function upiIn(text: string): string | null {
  const m = text.match(UPI);
  return m ? `${m[1]}@${m[2]}`.toLowerCase() : null;
}

type Deps = { secret: string; incr: (key: string) => Promise<number>; get: (key: string) => Promise<number> };
export function createReported({ secret, incr, get }: Deps) {
  const key = (upi: string) => `rep:${createHmac('sha256', secret).update(upi.trim().toLowerCase()).digest('hex').slice(0, 32)}`;
  return {
    report: (upi: string) => incr(key(upi)),
    times: (upi: string) => get(key(upi)),
  };
}

const memory = new Map<string, number>();
const TTL = 90 * 24 * 3600;
export const reported = createReported({
  secret: process.env.CAP_SECRET || process.env.LLM_SHARED_SECRET || 'local-dev',
  incr: shared ? (k) => shared!.incr(k, TTL) : async (k) => { const n = (memory.get(k) ?? 0) + 1; memory.set(k, n); return n; },
  get: shared ? (k) => shared!.count(k) : async (k) => memory.get(k) ?? 0,
});


const SAY: Partial<Record<Complaint['lang'], string>> = {
  en: "Stop. This UPI ID was named in an earlier fraud complaint. Don't pay anything. Hang up now.",
  hi: 'रुकिए। यह UPI ID पहले एक धोखाधड़ी की शिकायत में आ चुकी है। कोई पैसा मत भेजिए। अभी फ़ोन काट दीजिए।',
  te: 'ఆగండి. ఈ UPI ID ఇంతకుముందు ఒక మోసం ఫిర్యాదులో వచ్చింది. ఏ డబ్బూ పంపకండి. వెంటనే ఫోన్ కట్ చేయండి.',
  kn: 'ನಿಲ್ಲಿ. ಈ UPI ID ಹಿಂದೆ ಒಂದು ವಂಚನೆ ದೂರಿನಲ್ಲಿ ಬಂದಿದೆ. ಯಾವುದೇ ಹಣ ಕಳುಹಿಸಬೇಡಿ. ಈಗಲೇ ಫೋನ್ ಕಟ್ ಮಾಡಿ.',
};

// On guard: if the caller names a UPI ID already in an earlier complaint, warn at once.
export async function guardReported(c: Complaint, lastUser: string, times: (upi: string) => Promise<number> = reported.times): Promise<string | null> {
  if (c.phase !== 'guard' || isLoss(lastUser)) return null;
  const upi = upiIn(lastUser);
  if (!upi) return null;
  const n = await times(upi).catch((e) => {
    console.error('[reported] lookup failed:', e);
    return 0;
  });
  if (n < 1) return null;
  if (!addFlag(c, 'reported_payee', `named a UPI ID (${upi}) that was already in an earlier fraud complaint`, lastUser)) return null;
  return SAY[c.lang] ?? SAY.en!;
}

// Once every field is confirmed, count the payee (once per call), but only when the UTR the caller
// confirmed matches their payment screenshot: a made-up complaint can't mark someone's UPI ID.
export async function reportOnce(c: Complaint, report: (upi: string) => Promise<number> = reported.report): Promise<void> {
  const p = c.fields.payee;
  if (c.reportedPayee || !p?.confirmed || missingFields(c).length) return;
  if (!c.shot?.utr || c.shot.utr !== c.fields.utr?.value) return;
  c.reportedPayee = true;
  await report(p.value).catch((e) => console.error('[reported] count failed:', e));
}
