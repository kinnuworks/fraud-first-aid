// Turns a spoken or transcribed number into exact digits, and reads digits back
// group by group. Handles ASCII digits, Devanagari and Kannada numerals, and
// digit words in English, Hindi (Devanagari and Latin) and Kannada (script and Latin),
// including "double"/"triple" and code-mixed utterances.

export type ReadbackLang = 'en' | 'hi' | 'kn';

const NUMERALS: Record<string, string> = {};
'०१२३४५६७८९'.split('').forEach((c, i) => (NUMERALS[c] = String(i)));
'೦೧೨೩೪೫೬೭೮೯'.split('').forEach((c, i) => (NUMERALS[c] = String(i)));

const WORDS: Record<string, string> = {};
const add = (digit: number, words: string[]) => words.forEach((w) => (WORDS[w] = String(digit)));
// English
add(0, ['zero', 'oh', 'o']);
add(1, ['one']);
add(2, ['two']);
add(3, ['three']);
add(4, ['four']);
add(5, ['five']);
add(6, ['six']);
add(7, ['seven']);
add(8, ['eight']);
add(9, ['nine']);
// Hindi, Devanagari
add(0, ['शून्य', 'जीरो', 'ज़ीरो']);
add(1, ['एक']);
add(2, ['दो']);
add(3, ['तीन']);
add(4, ['चार']);
add(5, ['पांच', 'पाँच']);
add(6, ['छह', 'छः', 'छे']);
add(7, ['सात']);
add(8, ['आठ']);
add(9, ['नौ']);
// Hindi, Latin
add(0, ['shunya', 'shoonya']);
add(1, ['ek']);
add(2, ['do']);
add(3, ['teen']);
add(4, ['chaar', 'char']);
add(5, ['paanch', 'panch']);
add(6, ['chhah', 'chhe', 'che', 'chah']);
add(7, ['saat']);
add(8, ['aath', 'aat']);
add(9, ['nau', 'no']);
// Kannada, script
add(0, ['ಸೊನ್ನೆ', 'ಶೂನ್ಯ']);
add(1, ['ಒಂದು']);
add(2, ['ಎರಡು']);
add(3, ['ಮೂರು']);
add(4, ['ನಾಲ್ಕು']);
add(5, ['ಐದು']);
add(6, ['ಆರು']);
add(7, ['ಏಳು']);
add(8, ['ಎಂಟು']);
add(9, ['ಒಂಬತ್ತು']);
// Kannada, Latin
add(0, ['sonne']);
add(1, ['ondu']);
add(2, ['eradu']);
add(3, ['mooru', 'muru']);
add(4, ['naalku', 'nalku']);
add(5, ['aidu', 'aydu']);
add(6, ['aaru']);
add(7, ['elu', 'yelu']);
add(8, ['entu', 'yentu']);
add(9, ['ombattu']);

const REPEAT: Record<string, number> = {
  double: 2,
  triple: 3,
  'डबल': 2,
  'ट्रिपल': 3,
  'ಡಬಲ್': 2,
  'ಟ್ರಿಪಲ್': 3,
};

// Words that are ambiguous outside a number context ("do", "no", "o", "oh", "che").
// They only count as digits when a neighbouring token is a number.
const AMBIGUOUS = new Set(['do', 'no', 'o', 'oh', 'che', 'char', 'aat']);

function tokenDigits(tok: string): string | null {
  if (/^[0-9]+$/.test(tok)) return tok;
  if ([...tok].every((c) => c in NUMERALS)) return [...tok].map((c) => NUMERALS[c]).join('');
  return WORDS[tok] ?? null;
}

export function spokenToDigits(text: string): string {
  const tokens = text
    .toLowerCase()
    .replace(/[-–—_.,;:!?()।॥]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const isNum = tokens.map((t) => tokenDigits(t) !== null && !AMBIGUOUS.has(t));
  let out = '';
  let repeat = 1;
  tokens.forEach((tok, i) => {
    if (tok in REPEAT) {
      repeat = REPEAT[tok];
      return;
    }
    const d = tokenDigits(tok);
    if (d === null) {
      repeat = 1;
      return;
    }
    if (AMBIGUOUS.has(tok) && !(isNum[i - 1] || isNum[i + 1] || repeat > 1)) return;
    out += d.repeat(repeat);
    repeat = 1;
  });
  return out;
}

export function groupForReadback(digits: string): string[] {
  if (digits.length <= 4) return [digits];
  if (digits.length === 10) return [digits.slice(0, 5), digits.slice(5)];
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) groups.push(digits.slice(i, i + 4));
  return groups;
}

const SAY: Record<ReadbackLang, string[]> = {
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
  hi: ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पांच', 'छह', 'सात', 'आठ', 'नौ'],
  kn: ['ಸೊನ್ನೆ', 'ಒಂದು', 'ಎರಡು', 'ಮೂರು', 'ನಾಲ್ಕು', 'ಐದು', 'ಆರು', 'ಏಳು', 'ಎಂಟು', 'ಒಂಬತ್ತು'],
};

export function readbackText(digits: string, lang: ReadbackLang): string {
  return groupForReadback(digits)
    .map((g) => [...g].map((d) => SAY[lang][Number(d)]).join(' '))
    .join(', ');
}
