// Follow-up reminders as a calendar file, from RBI circular RBI/2017-18/15: zero liability when the
// bank is told within 3 working days, and the bank credits the amount within 10 working days of
// the customer's notice.
import { addBankWorkingDays } from './deadline';

type R = { utr: string; amount: number; reportedOn: string; bank: string };

const day = (iso: string) => iso.replace(/-/g, '');
const esc = (t: string) => t.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

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

export function reminderIcs({ utr, amount, reportedOn, bank }: R): string {
  const u = utr.replace(/(\d{4})(?=\d)/g, '$1 ');
  const rs = `Rs ${amount.toLocaleString('en-IN')}`;
  const zero = addBankWorkingDays(reportedOn, 3);
  const credit = addBankWorkingDays(reportedOn, 10);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UTR Pakka//complaint reminders//EN',
    ...event(`zero-${utr}`, zero, `Last day: make sure ${bank} has your fraud complaint (UTR ${u})`, `RBI: zero liability if the bank is told within 3 working days. UPI fraud of ${rs}, UTR ${u}. If you haven't, call your bank and 1930 today.`),
    ...event(`credit-${utr}`, credit, `${bank} should have credited ${rs} back (UTR ${u})`, `RBI: the bank credits the amount within 10 working days of your notice. If it hasn't, escalate to the RBI Ombudsman at cms.rbi.org.in.`),
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
