// Outbound phone calls: who may be called and how often. Only Indian mobile numbers, one live
// call per number, and a cap on calls per hour (cost and abuse limits).
export function indianMobile(input: string): string | null {
  let d = input.replace(/[^\d+]/g, '');
  if (d.startsWith('+91')) d = d.slice(3);
  else if (d.startsWith('91') && d.length === 12) d = d.slice(2);
  else if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

export class CallLimiter {
  private live = new Set<string>();
  private starts: number[] = [];
  constructor(private perHour = 20) {}
  take(number: string, now = Date.now()): boolean {
    this.starts = this.starts.filter((t) => now - t < 3_600_000);
    if (this.live.has(number) || this.starts.length >= this.perHour) return false;
    this.live.add(number);
    this.starts.push(now);
    return true;
  }
  end(number: string) {
    this.live.delete(number);
  }
}
