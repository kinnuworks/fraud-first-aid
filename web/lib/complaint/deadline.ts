// Bank working days, for the RBI reporting windows (3 and 7 working days, RBI/2017-18/15).
// Banks close on Sundays and on the 2nd and 4th Saturdays; pass the state's bank holidays too.
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function isBankHoliday(d: Date, holidays: string[] = []): boolean {
  if (d.getUTCDay() === 0) return true;
  if (d.getUTCDay() === 6) {
    const nth = Math.ceil(d.getUTCDate() / 7);
    if (nth === 2 || nth === 4) return true;
  }
  return holidays.includes(iso(d));
}

export function addBankWorkingDays(start: string, n: number, holidays: string[] = []): string {
  const d = new Date(`${start}T00:00:00Z`);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isBankHoliday(d, holidays)) left--;
  }
  return iso(d);
}
