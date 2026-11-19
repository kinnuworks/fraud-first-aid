// Follow-up reminders as a calendar file, from RBI circular RBI/2017-18/15: zero liability when the
// bank is told within 3 working days, and the bank credits the amount within 10 working days of
// the customer's notice. A third reminder on day 30: if the bank hasn't replied, the RBI Ombudsman
// can take the complaint (the pack holds the draft).
import { addBankWorkingDays } from './deadline';

export const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

type R = { utr: string; amount: number; reportedOn: string; bank: string; debitOn?: string; ombudsman?: string };

const day = (iso: string) => iso.replace(/-/g, '');
const esc = (t: string) =>
  t.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').replace(/([,;\\])/g, '\\$1').replace(/\r?\n|\r/g, '\\n');

function event(uid: string, date: string, summary: string, description: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@utr-pakka`,
    `DTSTAMP:${day(date)}T000000Z`,
    `DTSTART;VALUE=DATE:${day(date)}`,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT9H',
    `DESCRIPTION:${esc(summary)}`,
    'END:VALARM',
    'END:VEVENT',
  ];
}

export function reminderIcs({ utr, amount, reportedOn, bank, debitOn, ombudsman }: R): string {
  const u = utr.replace(/(\d{4})(?=\d)/g, '$1 ');
  const rs = `Rs ${amount.toLocaleString('en-IN')}`;
  const zero = addBankWorkingDays(debitOn ?? reportedOn, 3);
  const credit = addBankWorkingDays(reportedOn, 10);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UTR Pakka//complaint reminders//EN',
    ...event(`zero-${utr}`, zero, `Last day: make sure ${bank} has your fraud complaint (UTR ${u})`, `RBI: zero liability if the bank is told within 3 working days. UPI fraud of ${rs}, UTR ${u}. If you haven't, call your bank and 1930 today.`),
    ...event(`credit-${utr}`, credit, `${bank} should have credited ${rs} back (UTR ${u})`, `RBI: the bank credits the amount within 10 working days of your notice. If it hasn't, escalate to the RBI Ombudsman at cms.rbi.org.in.`),
    ...event(`ombudsman-${utr}`, plusDays(reportedOn, 30), `Did ${bank} reply to your fraud complaint? (UTR ${u})`, `30 days since you reported the UPI fraud of ${rs}. If ${bank} hasn't replied, or said no, file with the RBI Ombudsman at cms.rbi.org.in (free; helpline 14448). ${ombudsman ? `The complaint, ready to paste:\n\n${ombudsman}` : ''}`),
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
