import { bankFraudLine } from './banks';
// The complaint pack: a dispute letter for the bank (English) and a script for the 1930
// helpline call in the caller's language. Built only from confirmed fields.
import { readbackText, type ReadbackLang } from '../entities/numbers';
import { missingFields, deadlines, type Complaint } from './session';
import { scamById } from './scams';
import { reminderIcs, plusDays } from './reminder';

const inr = (n: number) => n.toLocaleString('en-IN');

const SCRIPT: Record<ReadbackLang, (f: Record<string, string>) => string> = {
  en: (f) => `Hello, I want to report a UPI fraud. Amount: ${f.amount} rupees. Date and time: ${f.when}. UTR number: ${f.utr}. The money went to: ${f.payee}. My bank: ${f.bank}.`,
  hi: (f) => `नमस्ते, मुझे UPI धोखाधड़ी की शिकायत दर्ज करनी है। रकम: ${f.amount} रुपये। तारीख और समय: ${f.when}। UTR नंबर: ${f.utr}। पैसा यहाँ गया: ${f.payee}। मेरा बैंक: ${f.bank}।`,
  te: (f) => `నమస్కారం, నేను UPI మోసం గురించి ఫిర్యాదు చేయాలి. మొత్తం: ${f.amount} రూపాయలు. తేదీ, సమయం: ${f.when}. UTR నంబర్: ${f.utr}. డబ్బు వెళ్ళింది: ${f.payee}. నా బ్యాంక్: ${f.bank}.`,
  ta: (f) => `வணக்கம், நான் ஒரு UPI மோசடி பற்றி புகார் செய்ய வேண்டும். தொகை: ${f.amount} ரூபாய். தேதி, நேரம்: ${f.when}. UTR எண்: ${f.utr}. பணம் சென்றது: ${f.payee}. என் வங்கி: ${f.bank}.`,
  ml: (f) => `നമസ്കാരം, എനിക്ക് ഒരു UPI തട്ടിപ്പിനെക്കുറിച്ച് പരാതി നൽകണം. തുക: ${f.amount} രൂപ. തീയതി, സമയം: ${f.when}. UTR നമ്പർ: ${f.utr}. പണം പോയത്: ${f.payee}. എന്റെ ബാങ്ക്: ${f.bank}.`,
  bn: (f) => `নমস্কার, আমি একটি UPI প্রতারণার অভিযোগ জানাতে চাই। পরিমাণ: ${f.amount} টাকা। তারিখ ও সময়: ${f.when}। UTR নম্বর: ${f.utr}। টাকা গেছে: ${f.payee}। আমার ব্যাংক: ${f.bank}।`,
  mr: (f) => `नमस्कार, मला UPI फसवणुकीची तक्रार नोंदवायची आहे. रक्कम: ${f.amount} रुपये. तारीख आणि वेळ: ${f.when}. UTR क्रमांक: ${f.utr}. पैसे गेले: ${f.payee}. माझी बँक: ${f.bank}.`,
  gu: (f) => `નમસ્તે, મારે UPI છેતરપિંડીની ફરિયાદ નોંધાવવી છે. રકમ: ${f.amount} રૂપિયા. તારીખ અને સમય: ${f.when}. UTR નંબર: ${f.utr}. પૈસા ગયા: ${f.payee}. મારી બેંક: ${f.bank}.`,
  pa: (f) => `ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਮੈਂ UPI ਧੋਖਾਧੜੀ ਦੀ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰਨੀ ਹੈ। ਰਕਮ: ${f.amount} ਰੁਪਏ। ਤਾਰੀਖ ਅਤੇ ਸਮਾਂ: ${f.when}। UTR ਨੰਬਰ: ${f.utr}। ਪੈਸੇ ਗਏ: ${f.payee}। ਮੇਰਾ ਬੈਂਕ: ${f.bank}।`,
  kn: (f) => `ನಮಸ್ಕಾರ, ನಾನು UPI ವಂಚನೆ ಬಗ್ಗೆ ದೂರು ನೀಡಬೇಕು. ಮೊತ್ತ: ${f.amount} ರೂಪಾಯಿ. ದಿನಾಂಕ, ಸಮಯ: ${f.when}. UTR ಸಂಖ್ಯೆ: ${f.utr}. ಹಣ ಹೋಗಿದ್ದು: ${f.payee}. ನನ್ನ ಬ್ಯಾಂಕ್: ${f.bank}.`,
};

export const LANG_NAME: Record<ReadbackLang, string> = {
  en: 'English', hi: 'Hindi', te: 'Telugu', kn: 'Kannada', ta: 'Tamil', ml: 'Malayalam', bn: 'Bengali', mr: 'Marathi', gu: 'Gujarati', pa: 'Punjabi',
};

export type Pack =
  | { ok: false; missing: string[] }
  | {
      ok: true;
      bankLetter: string;
      script1930: string;
      operatorCard: string;
      reminders: string;
      bankLine: { bank: string; phone: string; source: string; also?: string } | null;
      portalSheet: string;
      nextSteps: string;
      ombudsmanDraft: string;
      callRecord: string;
      minutesSinceDebit: number | null;
      deadlines: ReturnType<typeof deadlines>;
    };

// The debit time is recorded as Indian local time without an offset.
export function minutesSince(whenIst: string, now: Date): number | null {
  const t = Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(whenIst) ? whenIst : `${whenIst.length === 16 ? `${whenIst}:00` : whenIst}+05:30`);
  if (Number.isNaN(t) || t > now.getTime()) return null;
  return Math.floor((now.getTime() - t) / 60000);
}

// Chakshu (sancharsaathi.gov.in/sfc) category for each scam we flag, in Chakshu's own words.
const CHAKSHU: Record<string, string> = {
  fake_kyc: 'KYC and Payment related to Bank / Electricity / Gas / Insurance etc',
  vishing_otp: 'KYC and Payment related to Bank / Electricity / Gas / Insurance etc',
  digital_arrest: 'Impersonation as Police, CBI, Customs, Aadhaar, RBI etc',
  mobile_disconnection: 'Impersonation as DoT / TRAI',
  fake_customer_care: 'Fake Customer Care Helpline',
  job_task: 'Online job / lottery /gifts/loan offers',
  lottery: 'Online job / lottery /gifts/loan offers',
  impersonation: 'Impersonation as a relative / friend',
};

export function buildPack(c: Complaint, today: string, now: Date = new Date()): Pack {
  const missing = missingFields(c);
  if (missing.length) return { ok: false, missing };
  const f = c.fields as Required<Complaint['fields']>;
  // RBI/2017-18/15 counts the three working days from the bank's alert, which comes with the debit.
  const debitDay = f.when.value.slice(0, 10);
  const d = deadlines(debitDay);
  const inTime = today <= d.zeroLiabilityBy;
  const when = f.when.value.replace('T', ' ');
  const line = bankFraudLine(f.victim_bank.value);

  const bankLetter = `To the Grievance Redressal Officer, ${f.victim_bank.value}

Subject: Fraudulent UPI transaction, UTR ${f.utr.value}

I am reporting a fraudulent UPI payment of Rs ${inr(f.amount.value)} made from my account on ${when} to ${f.payee.value}. The UTR (transaction reference) is ${f.utr.value}.

Please block further debits linked to this fraud, raise a dispute with the beneficiary bank, and credit the amount as set out in RBI circular RBI/2017-18/15 on customer protection in unauthorised electronic banking transactions. I am reporting on ${today}${inTime ? `, within three working days of the debit (by ${d.zeroLiabilityBy})` : ''}.

I am also reporting this to the National Cybercrime Helpline, 1930.`;
  const script1930 = SCRIPT[c.lang]({
    amount: inr(f.amount.value),
    when,
    utr: readbackText(f.utr.value, c.lang),
    payee: f.payee.value,
    bank: f.victim_bank.value,
  });
  // The scam call as heard on speaker, with the red-flag lines marked: evidence for 1930 and the cyber cell.
  const flagFor = (text: string) => c.flags.find((x) => x.heard && text.startsWith(x.heard.slice(0, 80)));
  const callRecord = c.heard?.length
    ? [
        `The scam call, as Fraud First Aid heard it on speaker (India time, ${c.heard[0].at.slice(0, 10)}). Both sides of the call are in one stream.`,
        ...c.heard.map((h) => {
          const fl = flagFor(h.text);
          return `${h.at.slice(11, 19)}  ${fl ? `RED FLAG (${fl.red_flag}): ` : ''}${h.text}`;
        }),
      ].join('\n')
    : '';
  const operatorCard = [
    'UPI fraud report, prepared by voice (Fraud First Aid)',
    `Caller language: ${LANG_NAME[c.lang]}`,
    `UTR: ${f.utr.value.replace(/(\d{4})(?=\d)/g, '$1 ')} (confirmed by caller${c.shot?.utr === f.utr.value ? ', matches payment screenshot' : ''})`,
    `Amount: Rs ${inr(f.amount.value)}`,
    `Debited: ${when}`,
    `Paid to: ${f.payee.value}`,
    `Caller's bank: ${f.victim_bank.value}`,
    ...(line ? [`Bank fraud line: ${line.phone}`] : []),
    `Bank deadline (zero liability): ${d.zeroLiabilityBy}`,
    ...c.flags.map((f) => `Scam red flag heard live: ${scamById(f.scam)?.name ?? f.scam} (caller ${f.red_flag})`),
    ...(c.story ? [`What happened: ${c.story.en}`, `Caller's words: "${c.story.words}"`] : []),
    ...(c.heard?.length ? [`Scam call record: ${c.heard.length} lines heard on speaker, from ${c.heard[0].at.slice(11, 19)} to ${c.heard[c.heard.length - 1].at.slice(11, 19)} (in the pack)`] : []),
  ].join('\n');
  const bankLine = line ? { bank: line.bank, phone: line.phone, source: line.source, ...(line.also ? { also: line.also } : {}) } : null;
  const [date, time = ''] = f.when.value.split('T');
  // The portal's own order (National Cybercrime Reporting Portal instructions): incident, then the
  // transaction, then the suspect.
  const portalSheet = [
    'cybercrime.gov.in > Report Cyber Crime > Financial Fraud',
    'Incident details',
    '  Category: Online Financial Fraud',
    '  Sub-category: UPI Related Frauds',
    `  Date and time of incident: ${date} ${time}`.trimEnd(),
    '  Did you lose money? Yes',
    'Transaction details',
    '  Mode: UPI',
    `  Bank: ${f.victim_bank.value}`,
    '  Account number or UPI ID the money left from: (your own, from your bank app)',
    `  Transaction ID / UTR: ${f.utr.value}`,
    `  Amount: ${f.amount.value}`,
    `  Transaction date and time: ${date} ${time}`.trimEnd(),
    'Suspect details (optional)',
    `  UPI ID or number paid: ${f.payee.value}`,
    'Evidence: the payment screenshot (files up to 10 MB)',
    'The portal asks for an OTP to your mobile and a captcha: only you can do those.',
  ].join('\n');
  const chakshu = c.flags.map((x) => CHAKSHU[x.scam]).find(Boolean) ?? 'Any Other Suspected Fraud';
  const nextSteps = [
    `1. Call your bank's fraud line now${line ? `: ${line.phone} (${line.bank}, from ${new URL(line.source).hostname})` : ' (the number on the back of your card)'}, and keep the complaint number they give you.`,
    '2. If the bank does not reply within 30 days, or rejects your complaint, complain to the RBI Ombudsman at cms.rbi.org.in. It is free; the RBI helpline is 14448. Attach the bank letter and the bank\'s complaint number.',
    `3. Report the caller's number on Sanchar Saathi (Chakshu), sancharsaathi.gov.in/sfc, within 30 days: medium "Call", category "${chakshu}".`,
  ].join('\n');
  const ombudsmanDraft = `For the RBI Ombudsman, at cms.rbi.org.in (free; RBI helpline 14448). Use it from ${plusDays(today, 30)} if ${f.victim_bank.value.split(',')[0]} has not replied, or if it rejects your complaint.

Bank: ${f.victim_bank.value}
Date I complained to the bank: ${today}
Bank's complaint number: (the number your bank gave you)

What happened: on ${when}, Rs ${inr(f.amount.value)} left my account by UPI to ${f.payee.value} in a fraud. The UTR (transaction reference) is ${f.utr.value}. I reported it to the bank on ${today}${inTime ? `, within three working days of the debit (by ${d.zeroLiabilityBy})` : ''}, and to the National Cybercrime Helpline, 1930.

What I ask: a refund of Rs ${inr(f.amount.value)}, under RBI circular RBI/2017-18/15 on customer protection in unauthorised electronic banking transactions.

Attached: my letter to the bank, the bank's reply if any, and the payment screenshot.`;
  const reminders = reminderIcs({ utr: f.utr.value, amount: f.amount.value, reportedOn: today, debitOn: debitDay, bank: f.victim_bank.value.split(',')[0], ombudsman: ombudsmanDraft });
  return { ok: true, bankLetter, script1930, operatorCard, reminders, bankLine, portalSheet, nextSteps, ombudsmanDraft, callRecord, minutesSinceDebit: minutesSince(f.when.value, now), deadlines: d };
}
