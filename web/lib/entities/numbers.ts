// Turns a spoken or transcribed number into exact digits, and reads digits back
// group by group. Handles ASCII digits, Devanagari and Kannada numerals, and
// digit words in English, Hindi, Kannada and Telugu, two-digit number words ("ninety eight",
// अट्ठानवे, ತೊಂಬತ್ತೆಂಟು), "double"/"triple" and code-mixed utterances.

export const READBACK_LANGS = ['en', 'hi', 'kn', 'te', 'ta', 'ml', 'bn', 'mr', 'gu', 'pa'] as const;
export type ReadbackLang = (typeof READBACK_LANGS)[number];

const NUMERALS: Record<string, string> = {};
'०१२३४५६७८९'.split('').forEach((c, i) => (NUMERALS[c] = String(i)));
'೦೧೨೩೪೫೬೭೮೯'.split('').forEach((c, i) => (NUMERALS[c] = String(i)));
'౦౧౨౩౪౫౬౭౮౯'.split('').forEach((c, i) => (NUMERALS[c] = String(i)));
// Tamil, Malayalam, Bengali, Gujarati, Gurmukhi
['௦௧௨௩௪௫௬௭௮௯', '൦൧൨൩൪൫൬൭൮൯', '০১২৩৪৫৬৭৮৯', '૦૧૨૩૪૫૬૭૮૯', '੦੧੨੩੪੫੬੭੮੯'].forEach((set) =>
  [...set].forEach((c, i) => (NUMERALS[c] = String(i))),
);

// Devanagari spellings vary in transcripts: nukta (ड़/ड), chandrabindu (ँ/ं) and a final
// वे/बे (अट्ठानवे/अट्ठानबे). Fold them so one table entry covers every variant.
function fold(tok: string): string {
  return tok
    .normalize('NFD')
    .replace(/\u093C/g, '')
    .replace(/\u0901/g, '\u0902')
    .replace(/वे$/, 'बे')
    .normalize('NFC');
}

const WORDS: Record<string, string> = {};
const add = (digit: number, words: string[]) =>
  words.forEach((w) => (WORDS[fold(w)] = String(digit)));
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

// Telugu, script
add(0, ['సున్నా', 'సున్న']);
add(1, ['ఒకటి']);
add(2, ['రెండు']);
add(3, ['మూడు']);
add(4, ['నాలుగు']);
add(5, ['ఐదు']);
add(6, ['ఆరు']);
add(7, ['ఏడు']);
add(8, ['ఎనిమిది']);
add(9, ['తొమ్మిది']);
// Telugu, Latin
add(0, ['sunna']);
add(1, ['okati']);
add(2, ['rendu']);
add(3, ['moodu', 'mudu']);
add(4, ['naalugu', 'nalugu']);
add(7, ['edu', 'yedu']);
add(8, ['enimidi']);
add(9, ['tommidi']);

// Two-digit words that stand alone (teens, every Hindi 10-99 word, Kannada joined compounds).
const PAIRS: Record<string, string> = {};
// Tens (20-90) that combine with a following unit word: "forty five" -> 45, alone -> 40.
const TENS: Record<string, number> = {};
const pair = (n: number, words: string[]) => words.forEach((w) => (PAIRS[fold(w)] = String(n)));
const tens = (n: number, words: string[]) => words.forEach((w) => (TENS[fold(w)] = n));

// English
pair(10, ['ten']);
['eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  .forEach((w, i) => pair(11 + i, [w]));
['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'].forEach((w, i) =>
  tens(20 + 10 * i, [w]),
);
// Hindi: every number from 10 to 99 has its own word.
`दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस
बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस
तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस
चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास
पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ
साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर
सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्यासी
अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी
नब्बे इक्यानबे बानबे तिरानबे चौरानबे पचानबे छियानबे सत्तानबे अट्ठानबे निन्यानबे`
  .split(/\s+/)
  .forEach((w, i) => pair(10 + i, [w]));
pair(15, ['पन्द्रह']);
pair(17, ['सतरह']);
pair(39, ['उंतालीस']);
pair(79, ['उनासी']);
// Telugu
pair(10, ['పది']);
['పదకొండు', 'పన్నెండు', 'పదమూడు', 'పద్నాలుగు', 'పదిహేను', 'పదహారు', 'పదిహేడు', 'పద్దెనిమిది', 'పందొమ్మిది']
  .forEach((w, i) => pair(11 + i, [w]));
[['ఇరవై'], ['ముప్పై', 'ముప్ఫై'], ['నలభై', 'నలబై'], ['యాభై', 'యాబై'], ['అరవై'], ['డెబ్బై'], ['ఎనభై', 'ఎనబై'], ['తొంభై', 'తొంబై']]
  .forEach((ws, i) => tens(20 + 10 * i, ws));
// Kannada: separate tens, teens, and tens joined with their unit (ಇಪ್ಪತ್ತು + ಐದು = ಇಪ್ಪತ್ತೈದು).
pair(10, ['ಹತ್ತು']);
['ಹನ್ನೊಂದು', 'ಹನ್ನೆರಡು', 'ಹದಿಮೂರು', 'ಹದಿನಾಲ್ಕು', 'ಹದಿನೈದು', 'ಹದಿನಾರು', 'ಹದಿನೇಳು', 'ಹದಿನೆಂಟು', 'ಹತ್ತೊಂಬತ್ತು']
  .forEach((w, i) => pair(11 + i, [w]));
const KN_JOINED: string[][] = [
  ['ತ್ತೊಂದು'], ['ತ್ತೆರಡು'], ['ತ್ಮೂರು', 'ತ್ತಮೂರು', 'ತ್ತುಮೂರು'], ['ತ್ನಾಲ್ಕು', 'ತ್ತನಾಲ್ಕು', 'ತ್ತುನಾಲ್ಕು'],
  ['ತ್ತೈದು'], ['ತ್ತಾರು'], ['ತ್ತೇಳು'], ['ತ್ತೆಂಟು'], ['ತ್ತೊಂಬತ್ತು'],
];
['ಇಪ್ಪತ್ತು', 'ಮೂವತ್ತು', 'ನಲವತ್ತು', 'ಐವತ್ತು', 'ಅರವತ್ತು', 'ಎಪ್ಪತ್ತು', 'ಎಂಬತ್ತು', 'ತೊಂಬತ್ತು'].forEach((w, i) => {
  const n = 20 + 10 * i;
  tens(n, [w]);
  const stem = w.slice(0, -'ತ್ತು'.length);
  KN_JOINED.forEach((ends, u) => pair(n + u + 1, ends.map((e) => stem + e)));
});

// Kannada fuses the hundreds into one word.
[['ಇನ್ನೂರು'], ['ಮುನ್ನೂರು'], ['ನಾನೂರು', 'ನಾನ್ನೂರು'], ['ಐನೂರು'], ['ಆರುನೂರು'], ['ಏಳುನೂರು'], ['ಎಂಟುನೂರು'], ['ಒಂಬೈನೂರು', 'ಒಂಬತ್ತುನೂರು']]
  .forEach((ws, i) => pair(200 + 100 * i, ws));

// Scale words: "four thousand eight hundred", "నాలుగు వేల ఎనిమిది వందల", "दो हज़ार".
const MULT: Record<string, number> = {};
const mult = (n: number, words: string[]) => words.forEach((w) => (MULT[fold(w)] = n));
mult(100, ['hundred', 'सौ', 'వంద', 'వందల', 'వందలు', 'నూరు', 'ನೂರು', 'ನೂರ']);
mult(1000, ['thousand', 'हज़ार', 'हजार', 'వెయ్యి', 'వేల', 'వేలు', 'ಸಾವಿರ', 'ಸಾವಿರದ']);
mult(1e5, ['lakh', 'lakhs', 'लाख', 'లక్ష', 'లక్షల', 'లక్షలు', 'ಲಕ್ಷ']);
mult(1e7, ['crore', 'crores', 'करोड़', 'కోటి', 'కోట్ల', 'ಕೋಟಿ']);
mult(1e6, ['million']);

// Scale words that mean one of themselves when said alone ("a hundred", "a thousand");
// plurals like వేలు (thousands) alone are not a number.
const LONE_SCALE = new Set(['వంద', 'వెయ్యి', 'ನೂರು', 'सौ'].map(fold));

// Tamil, Malayalam, Bengali, Marathi, Gujarati, Punjabi digit words (0-9)
const DIGIT_WORDS: string[][] = [
  ['பூஜ்ஜியம்', 'பூஜ்யம்', 'சுழியம்', 'ஜீரோ', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது'],
  ['പൂജ്യം', 'ഒന്ന്', 'രണ്ട്', 'മൂന്ന്', 'നാല്', 'അഞ്ച്', 'ആറ്', 'ഏഴ്', 'എട്ട്', 'ഒമ്പത്'],
  ['শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'],
  ['शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ'],
  ['શૂન્ય', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ'],
  ['ਸਿਫ਼ਰ', 'ਇੱਕ', 'ਦੋ', 'ਤਿੰਨ', 'ਚਾਰ', 'ਪੰਜ', 'ਛੇ', 'ਸੱਤ', 'ਅੱਠ', 'ਨੌਂ'],
];
DIGIT_WORDS.forEach((ws) => {
  // The Tamil row lists four words for zero before one..nine.
  const zeros = ws.length - 9;
  ws.forEach((w, i) => add(i < zeros ? 0 : i - zeros + 1, [w]));
});

add(9, ['ഒൻപത്']); // Malayalam nine, chillu spelling

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

const ARTICLE_ONE = new Set(['एक', 'ek', 'ಒಂದು', 'ondu', 'one', 'এক', 'એક', 'ਇੱਕ'].map(fold));

function tokenDigits(tok: string): string | null {
  if (/^[0-9]+$/.test(tok)) return tok;
  if ([...tok].every((c) => c in NUMERALS)) return [...tok].map((c) => NUMERALS[c]).join('');
  const f = fold(tok);
  if (f in TENS) return String(TENS[f]);
  return PAIRS[f] ?? WORDS[f] ?? null;
}

// A unit word 1-9 that can complete a tens word ("forty" + "five").
function unitAfterTens(tok: string | undefined): string | null {
  if (!tok || AMBIGUOUS.has(tok)) return null;
  const d = WORDS[fold(tok)];
  return d && d !== '0' ? d : null;
}

// Numerals inside a token that also has letters ("8वीं", "2008ರಲ್ಲಿ", "₹500").
function embeddedNumerals(tok: string): string | null {
  const d = [...tok].map((c) => (/[0-9]/.test(c) ? c : NUMERALS[c] ?? '')).join('');
  return d || null;
}

export function spokenToDigits(text: string): string {
  const tokens = text
    .toLowerCase()
    .replace(/[-–—_.,;:!?()।॥]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    // English puts "and" inside a number after "hundred" ("eight hundred and ninety-two").
    .filter((t, i, a) => !(t === 'and' && i > 0 && a[i - 1] === 'hundred' && i + 1 < a.length && tokenDigits(a[i + 1]) !== null));
  // Numerals always count. A lone "one" (एक, ಒಂದು, one) counts only next to another number
  // or when the whole utterance is numbers: in a sentence it is usually the article "a".
  const numeral = tokens.map((t) => embeddedNumerals(t) !== null);
  const word = tokens.map((t, i) => !numeral[i] && (tokenDigits(t) !== null || t in REPEAT));
  const isNum = tokens.map((t, i) => numeral[i] || (word[i] && !AMBIGUOUS.has(t)));
  const allNumbers = tokens.every((_, i) => numeral[i] || word[i]);
  // Runs of number words that contain a scale word are one composed number.
  const scale = tokens.map((t, i) => !numeral[i] && fold(t) in MULT);
  const inRun = tokens.map((t, i) => scale[i] || (word[i] && !(t in REPEAT)));
  const composed = new Map<number, { end: number; value: string }>();
  for (let i = 0; i < tokens.length; ) {
    if (!inRun[i]) { i++; continue; }
    let j = i;
    while (j < tokens.length && inRun[j]) j++;
    const big = (k: number) => scale[k] || Number(tokenDigits(tokens[k]) ?? 0) >= 100;
    if (j - i > 1 && tokens.slice(i, j).some((_, k) => big(i + k)) && !scale[i]) {
      let total = 0, cur = 0;
      for (let k = i; k < j; k++) {
        const m = MULT[fold(tokens[k])];
        if (m === 100) cur = (cur || 1) * 100;
        else if (m) { total += (cur || 1) * m; cur = 0; }
        else cur += Number(tokenDigits(tokens[k]));
      }
      composed.set(i, { end: j, value: String(total + cur) });
    } else if (j - i === 1 && scale[i] && !numeral[i - 1] && LONE_SCALE.has(fold(tokens[i]))) {
      composed.set(i, { end: j, value: String(MULT[fold(tokens[i])]) });
    }
    i = j;
  }
  let out = '';
  let repeat = 1;
  let skip = -1;
  let runEnd = -1;
  tokens.forEach((tok, i) => {
    if (i === skip || i < runEnd) return;
    const run = composed.get(i);
    if (run) {
      out += run.value;
      runEnd = run.end;
      repeat = 1;
      return;
    }
    if (numeral[i]) {
      out += embeddedNumerals(tok)!.repeat(repeat);
      repeat = 1;
      return;
    }
    const near = isNum[i - 1] || isNum[i + 1];
    if (!word[i] || (ARTICLE_ONE.has(fold(tok)) && !(near || allNumbers || repeat > 1))) {
      repeat = 1;
      return;
    }
    const f = fold(tok);
    if (f in TENS) {
      const unit = unitAfterTens(tokens[i + 1]);
      if (unit) skip = i + 1;
      out += (String(TENS[f] / 10) + (unit ?? '0')).repeat(repeat);
      repeat = 1;
      return;
    }
    if (tok in REPEAT) {
      repeat = REPEAT[tok];
      return;
    }
    if (AMBIGUOUS.has(tok) && !(isNum[i - 1] || isNum[i + 1] || repeat > 1)) return;
    out += tokenDigits(tok)!.repeat(repeat);
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
  te: ['సున్నా', 'ఒకటి', 'రెండు', 'మూడు', 'నాలుగు', 'ఐదు', 'ఆరు', 'ఏడు', 'ఎనిమిది', 'తొమ్మిది'],
  kn: ['ಸೊನ್ನೆ', 'ಒಂದು', 'ಎರಡು', 'ಮೂರು', 'ನಾಲ್ಕು', 'ಐದು', 'ಆರು', 'ಏಳು', 'ಎಂಟು', 'ಒಂಬತ್ತು'],
  ta: ['பூஜ்ஜியம்', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது'],
  ml: ['പൂജ്യം', 'ഒന്ന്', 'രണ്ട്', 'മൂന്ന്', 'നാല്', 'അഞ്ച്', 'ആറ്', 'ഏഴ്', 'എട്ട്', 'ഒമ്പത്'],
  bn: ['শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়'],
  mr: ['शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ'],
  gu: ['શૂન્ય', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ'],
  pa: ['ਸਿਫ਼ਰ', 'ਇੱਕ', 'ਦੋ', 'ਤਿੰਨ', 'ਚਾਰ', 'ਪੰਜ', 'ਛੇ', 'ਸੱਤ', 'ਅੱਠ', 'ਨੌਂ'],
};

export function readbackText(digits: string, lang: ReadbackLang): string {
  return groupForReadback(digits)
    .map((g) => [...g].map((d) => SAY[lang][Number(d)]).join(' '))
    .join(', ');
}
