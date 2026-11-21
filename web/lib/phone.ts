// Outbound phone calls: who may be called and how often. Only Indian mobile numbers, one live
// call per number, and a cap on calls per hour (cost and abuse limits).
export function indianMobile(input: string): string | null {
  let d = input.replace(/[^\d+]/g, '');
  if (d.startsWith('+91')) d = d.slice(3);
  else if (d.startsWith('91') && d.length === 12) d = d.slice(2);
  else if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

// PHONE_ALLOWED_NUMBERS (comma-separated): when set, the app rings only these numbers, so the public
// page can't be used to ring a stranger. Unset or empty: any Indian mobile. A list with no valid
// number refuses everyone rather than opening up.
export function mayCall(to: string, list: string | undefined): boolean {
  const entries = (list ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (entries.length === 0) return true;
  return entries.map(indianMobile).some((n) => n !== null && n === to);
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

// "Listen to my call": the phone line in guard mode. Allowed only with an allowlist (today, the
// presenter's number): a silent guard never rings a stranger. Anything else is the complaint.
export function phoneMode(requested: unknown, allowList: string | undefined): 'guard' | 'complaint' {
  return requested === 'guard' && !!allowList?.trim() ? 'guard' : 'complaint';
}

// What the guard says when the person answers, before they merge it into the call they are on.
const GUARD_GREETING: Record<string, string> = {
  en: "Fraud First Aid here. Tap merge to add me to your call. I'll stay quiet and warn you if the caller asks for a code, a scan or money.",
  hi: 'फ़्रॉड फ़र्स्ट एड बोल रही हूँ। मुझे अपनी कॉल में जोड़ने के लिए मर्ज दबाइए। मैं चुप रहूँगी, और अगर कॉलर कोड, स्कैन या पैसे माँगे तो आपको चेतावनी दूँगी।',
  kn: 'ಫ್ರಾಡ್ ಫಸ್ಟ್ ಏಡ್ ಮಾತಾಡ್ತಿದೀನಿ. ನನ್ನನ್ನು ನಿಮ್ಮ ಕರೆಗೆ ಸೇರಿಸಲು ಮರ್ಜ್ ಒತ್ತಿ. ನಾನು ಸುಮ್ಮನಿರ್ತೀನಿ, ಕರೆ ಮಾಡಿದವರು ಕೋಡ್, ಸ್ಕ್ಯಾನ್ ಅಥವಾ ಹಣ ಕೇಳಿದರೆ ನಿಮಗೆ ಎಚ್ಚರಿಕೆ ಕೊಡ್ತೀನಿ.',
};
export function guardPhoneGreeting(lang: string): string {
  return GUARD_GREETING[lang] ?? GUARD_GREETING.en;
}
