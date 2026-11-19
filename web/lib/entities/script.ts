// Which language a transcript is in, from its script (Sarvam writes each language in its own
// script). Devanagari is read as Hindi. Returns null when there is too little to tell.
import type { ReadbackLang } from './numbers';

const BLOCKS: Array<[ReadbackLang, number, number]> = [
  ['hi', 0x0900, 0x097f],
  ['bn', 0x0980, 0x09ff],
  ['pa', 0x0a00, 0x0a7f],
  ['gu', 0x0a80, 0x0aff],
  ['ta', 0x0b80, 0x0bff],
  ['te', 0x0c00, 0x0c7f],
  ['kn', 0x0c80, 0x0cff],
  ['ml', 0x0d00, 0x0d7f],
];

export function scriptLang(text: string): ReadbackLang | null {
  const count = new Map<ReadbackLang, number>();
  let latin = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (/[a-z]/i.test(ch)) latin++;
    for (const [lang, lo, hi] of BLOCKS) if (cp >= lo && cp <= hi) count.set(lang, (count.get(lang) ?? 0) + 1);
  }
  let best: ReadbackLang | null = null;
  let n = 0;
  for (const [lang, c] of count) if (c > n) [best, n] = [lang, c];
  if (best && n >= 3) return best;
  return latin >= 8 ? 'en' : null;
}
