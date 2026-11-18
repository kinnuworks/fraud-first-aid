import { describe, expect, it } from 'vitest';
import { reminderIcs } from './reminder';

describe('reminderIcs', () => {
  const ics = reminderIcs({ utr: '402177889910', amount: 25000, reportedOn: '2026-11-19', bank: 'State Bank of India' });
  it('is a calendar file with two all-day reminders and alarms', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });
  it('puts the zero-liability day and the 10-working-day refund window on the right dates', () => {
    // 19 Nov 2026 + 3 working days = 23 Nov; + 10 working days = 2 Dec (2nd/4th Saturdays and Sundays skipped)
    expect(ics).toContain('DTSTART;VALUE=DATE:20261123');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261202');
    expect(ics).toContain('UTR 4021 7788 9910');
    expect(ics).toContain('State Bank of India');
  });
});
