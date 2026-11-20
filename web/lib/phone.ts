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
  // a number counts as live until its call ends or the agent's 20-minute limit has passed
  private live = new Map<string, number>();
  private starts: number[] = [];
  constructor(private perHour = 20) {}
  take(number: string, now = Date.now()): boolean {
    this.starts = this.starts.filter((t) => now - t < 3_600_000);
    const until = this.live.get(number);
    if ((until !== undefined && until > now) || this.starts.length >= this.perHour) return false;
    this.live.set(number, now + 20 * 60_000);
    this.starts.push(now);
    return true;
  }
  end(number: string) {
    this.live.delete(number);
  }
}
