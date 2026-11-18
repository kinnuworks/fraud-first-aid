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

export type Pack =
  | { ok: false; missing: string[] }
  | { ok: true; bankLetter: string; script1930: string; deadlines: ReturnType<typeof deadlines> };

export function buildPack(c: Complaint, today: string): Pack {
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
  return { ok: true, bankLetter, script1930, deadlines: d };
}
