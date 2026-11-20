// Field checks and spoken-form parsing for a UPI fraud complaint.
import { spokenToDigits } from '../entities/numbers';

export const isUtr = (s: string) => /^\d{12}$/.test(s);
export const isIfsc = (s: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s.toUpperCase());
export const isMobile = (s: string) => /^[6-9]\d{9}$/.test(s);

// "ramesh at the rate okaxis" -> "ramesh@okaxis". Digit words before the @ become digits
// (UPI IDs are often the mobile number). Returns null when no handle is spoken.
export function spokenUpiId(text: string): string | null {
  const t = text
    .toLowerCase()
    .replace(/\bat the rate( of)?\b/g, '@')
    .replace(/\s+at\s+/g, ' @ ')
    .replace(/\bdot\b/g, '.');
  const m = t.match(/(.+?)\s*@\s*([a-z][a-z0-9]*)\s*$/);
  if (!m) return null;
  const words = m[1].trim().split(/\s+/);
  // Keep only the words that make up the ID: everything after the last word that isn't part
  // of it is hard to know, so take the trailing run of ID-like tokens.
  const digits = spokenToDigits(m[1]);
  const local =
    digits.length >= 10 && digits.length === words.length
      ? digits
      : words.join('').replace(/\.+/g, '.');
  return /^[a-z0-9.\-_]{2,}$/.test(local) ? `${local}@${m[2]}` : null;
}

const SCALE: Record<string, number> = {
  k: 1e3, thousand: 1e3, hazaar: 1e3, hazar: 1e3, 'हज़ार': 1e3, 'हजार': 1e3, 'వేలు': 1e3, 'వేల': 1e3, 'ಸಾವಿರ': 1e3, 'ஆயிரம்': 1e3,
  lakh: 1e5, lakhs: 1e5, lac: 1e5, 'लाख': 1e5, 'లక్ష': 1e5, 'లక్షలు': 1e5, 'ಲಕ್ಷ': 1e5, 'லட்சம்': 1e5,
  crore: 1e7, crores: 1e7, 'करोड़': 1e7,
};
const SMALL: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, fifty: 50 };
const MONEY_WORD = /(rs\b|rs\.|inr|rupee|rupay|रुपय|रुपए|రూపాయ|ರೂಪಾಯ|ரூபாய்)/;

// Rupee amounts as digits ("₹25,000", "Rs 5,000.50", "25k"), or numbers with scale words, added up
// ("2 lakh 50 thousand"). Dates ("19th") and times ("3:30") are skipped; when several amounts appear,
// the one next to a money word wins, else the largest. Returns null when unsure; the agent then asks
// for the amount digit by digit.
export function parseAmount(text: string): number | null {
  const t = text.toLowerCase().replace(/(\d),(?=\d)/g, '$1').replace(/₹/g, ' rs ');
  // Indian-language amounts in words ("ఇరవై ఐదు వేలు", "पच्चीस हज़ार"): the number layer composes them.
  if (!/[0-9]/.test(t)) {
    const d = spokenToDigits(t);
    if (d && d.length <= 9 && Number(d) >= 100) return Number(d);
  }
  const nums = Object.keys(SMALL).join('|');
  const scales = Object.keys(SCALE).sort((a, b) => b.length - a.length).join('|');
  const re = new RegExp(`(\\d+(?:\\.\\d+)?|\\b(?:${nums})\\b)\\s*(${scales})?(?![\\p{L}\\d])`, 'gu');
  type Part = { value: number; scale: number; start: number; end: number };
  const parts: Part[] = [];
  for (const m of t.matchAll(re)) {
    const start = m.index ?? 0, end = start + m[0].length;
    const before = t.slice(Math.max(0, start - 1), start), after = t.slice(end, end + 3);
    // a time ("3:30") or a date ("19th", "19/11") is not an amount
    if (before === ':' || /^\s*[:/]/.test(after) || /^(st|nd|rd|th)\b/.test(t.slice(end - 0, end + 2)) || /^(st|nd|rd|th)\b/.test(after)) continue;
    const n = /\d/.test(m[1]) ? Number(m[1]) : SMALL[m[1]];
    const scale = m[2] ? SCALE[m[2]] : 1;
    parts.push({ value: n * scale, scale, start, end });
  }
  if (!parts.length) return null;
  // join "2 lakh" + "50 thousand" when the scales go down and only spaces or "and" sit between
  const groups: Part[] = [];
  for (const p of parts) {
    const last = groups[groups.length - 1];
    if (last && p.scale < last.scale && p.scale > 1 && /^\s*(and\s+)?$/.test(t.slice(last.end, p.start))) {
      last.value += p.value;
      last.scale = p.scale;
      last.end = p.end;
    } else groups.push({ ...p });
  }
  const near = (g: Part) => MONEY_WORD.test(t.slice(Math.max(0, g.start - 12), g.start)) || MONEY_WORD.test(t.slice(g.end, g.end + 12));
  const pick = groups.find(near) ?? groups.reduce((a, b) => (b.value > a.value ? b : a));
  return Math.round(pick.value * 100) / 100;
}

// UPI handles people pay to: "at okaxis" means a UPI ID; "at home" does not.
export const UPI_HANDLE = /^(ok[a-z]+|ybl|ibl|axl|paytm|pt[a-z]+|upi|apl|yapl|wa[a-z]+|icici|sbi|hdfcbank|axisbank|axis|kotak|kmbl|kbl|airtel|jio|fbl|idfc[a-z]*|indus|yesbank[a-z]*|freecharge|naviaxis|superyes|barodampay|unionbank|pnb|cnrb|boi|ubi|federal|rbl|dbs|sib|kvb|aubank|equitas|citi|hsbc|amazon|ikwik|jupiteraxis|fam|slice[a-z]*|abfspay|tapicici|timecosmos|mahb|idbi|iob|csbpay|dlb|indianbank|centralbank|pockets)$/i;
