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

const SCALE: Record<string, number> = { thousand: 1e3, hazaar: 1e3, hazar: 1e3, 'हज़ार': 1e3, 'हजार': 1e3, lakh: 1e5, lac: 1e5, 'लाख': 1e5, crore: 1e7, 'करोड़': 1e7 };
const SMALL: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twenty: 20, fifty: 50 };

// Rupee amounts as digits ("₹25,000"), or a number with a scale word ("two lakh", "1.5 lakh").
// Returns null when unsure; the agent then asks for the amount digit by digit.
export function parseAmount(text: string): number | null {
  const t = text.toLowerCase().replace(/(\d),(?=\d)/g, '$1').replace(/₹/g, ' ');
  const nums = Object.keys(SMALL).join('|');
  const scales = Object.keys(SCALE).join('|');
  // Indian-language amounts in words ("ఇరవై ఐదు వేలు", "पच्चीस हज़ार"): the number layer composes them.
  if (!/[0-9]/.test(t)) {
    const d = spokenToDigits(t);
    if (d && d.length <= 9 && Number(d) >= 100) return Number(d);
  }
  const m = t.match(new RegExp(`(\\d+(?:\\.\\d+)?|\\b(?:${nums})\\b)\\s*(${scales})?`));
  if (!m) return null;
  const n = /\d/.test(m[1]) ? Number(m[1]) : SMALL[m[1]];
  return Math.round(n * (m[2] ? SCALE[m[2]] : 1));
}
