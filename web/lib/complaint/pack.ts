// The complaint pack: a dispute letter for the bank (English) and a script for the 1930
// helpline call in the caller's language. Built only from confirmed fields.
import { readbackText, type ReadbackLang } from '../entities/numbers';
import { missingFields, deadlines, type Complaint } from './session';

const inr = (n: number) => n.toLocaleString('en-IN');

const SCRIPT: Record<ReadbackLang, (f: Record<string, string>) => string> = {
  en: (f) => `Hello, I want to report a UPI fraud. Amount: ${f.amount} rupees. Date and time: ${f.when}. UTR number: ${f.utr}. The money went to: ${f.payee}. My bank: ${f.bank}.`,
  hi: (f) => `नमस्ते, मुझे UPI धोखाधड़ी की शिकायत दर्ज करनी है। रकम: ${f.amount} रुपये। तारीख और समय: ${f.when}। UTR नंबर: ${f.utr}। पैसा यहाँ गया: ${f.payee}। मेरा बैंक: ${f.bank}।`,
  te: (f) => `నమస్కారం, నేను UPI మోసం గురించి ఫిర్యాదు చేయాలి. మొత్తం: ${f.amount} రూపాయలు. తేదీ, సమయం: ${f.when}. UTR నంబర్: ${f.utr}. డబ్బు వెళ్ళింది: ${f.payee}. నా బ్యాంక్: ${f.bank}.`,
  kn: (f) => `ನಮಸ್ಕಾರ, ನಾನು UPI ವಂಚನೆ ಬಗ್ಗೆ ದೂರು ನೀಡಬೇಕು. ಮೊತ್ತ: ${f.amount} ರೂಪಾಯಿ. ದಿನಾಂಕ, ಸಮಯ: ${f.when}. UTR ಸಂಖ್ಯೆ: ${f.utr}. ಹಣ ಹೋಗಿದ್ದು: ${f.payee}. ನನ್ನ ಬ್ಯಾಂಕ್: ${f.bank}.`,
};

const LANG_NAME: Record<ReadbackLang, string> = { en: 'English', hi: 'Hindi', te: 'Telugu', kn: 'Kannada' };

export type Pack =
  | { ok: false; missing: string[] }
  | {
      ok: true;
      bankLetter: string;
      script1930: string;
      operatorCard: string;
      minutesSinceDebit: number | null;
      deadlines: ReturnType<typeof deadlines>;
    };

// The debit time is recorded as Indian local time without an offset.
export function minutesSince(whenIst: string, now: Date): number | null {
  const t = Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(whenIst) ? whenIst : `${whenIst.length === 16 ? `${whenIst}:00` : whenIst}+05:30`);
  if (Number.isNaN(t) || t > now.getTime()) return null;
  return Math.floor((now.getTime() - t) / 60000);
}

export function buildPack(c: Complaint, today: string, now: Date = new Date()): Pack {
  const missing = missingFields(c);
  if (missing.length) return { ok: false, missing };
  const f = c.fields as Required<Complaint['fields']>;
  const d = deadlines(today);
  const when = f.when.value.replace('T', ' ');
  const bankLetter = `To the Grievance Redressal Officer, ${f.victim_bank.value}

Subject: Fraudulent UPI transaction, UTR ${f.utr.value}

I am reporting a fraudulent UPI payment of Rs ${inr(f.amount.value)} made from my account on ${when} to ${f.payee.value}. The UTR (transaction reference) is ${f.utr.value}.

Please block further debits linked to this fraud, raise a dispute with the beneficiary bank, and credit the amount as set out in RBI circular RBI/2017-18/15 on customer protection in unauthorised electronic banking transactions. I am reporting on ${today}, within three working days (by ${d.zeroLiabilityBy}).

I am also reporting this to the National Cybercrime Helpline, 1930.`;
  const script1930 = SCRIPT[c.lang]({
    amount: inr(f.amount.value),
    when,
    utr: readbackText(f.utr.value, c.lang),
    payee: f.payee.value,
    bank: f.victim_bank.value,
  });
  const operatorCard = [
    'UPI fraud report, prepared by voice (UTR Pakka)',
    `Caller language: ${LANG_NAME[c.lang]}`,
    `UTR: ${f.utr.value.replace(/(\d{4})(?=\d)/g, '$1 ')} (confirmed by caller${c.shot?.utr === f.utr.value ? ', matches payment screenshot' : ''})`,
    `Amount: Rs ${inr(f.amount.value)}`,
    `Debited: ${when}`,
    `Paid to: ${f.payee.value}`,
    `Caller's bank: ${f.victim_bank.value}`,
    `Bank deadline (zero liability): ${d.zeroLiabilityBy}`,
    ...(c.story ? [`What happened: ${c.story.en}`, `Caller's words: "${c.story.words}"`] : []),
  ].join('\n');
  return { ok: true, bankLetter, script1930, operatorCard, minutesSinceDebit: minutesSince(f.when.value, now), deadlines: d };
}
