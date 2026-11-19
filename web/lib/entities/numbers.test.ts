import { describe, expect, it } from 'vitest';
import { spokenToDigits, groupForReadback, readbackText } from './numbers';

describe('spokenToDigits', () => {
  it('keeps plain ASCII digits and drops separators', () => {
    expect(spokenToDigits('4021 7788 9910')).toBe('402177889910');
    expect(spokenToDigits('98450-12345')).toBe('9845012345');
  });

  it('converts Devanagari and Kannada numerals', () => {
    expect(spokenToDigits('५००')).toBe('500');
    expect(spokenToDigits('೯೮೪೫')).toBe('9845');
  });

  it('reads digit-by-digit English words, including double and triple', () => {
    expect(spokenToDigits('nine eight four five')).toBe('9845');
    expect(spokenToDigits('double seven triple zero one')).toBe('770001');
  });

  it('reads Hindi digit words in Devanagari and Latin script', () => {
    expect(spokenToDigits('नौ आठ चार पांच')).toBe('9845');
    expect(spokenToDigits('nau aath chaar paanch')).toBe('9845');
    expect(spokenToDigits('छह')).toBe('6');
  });

  it('reads Kannada digit words', () => {
    expect(spokenToDigits('ಒಂಬತ್ತು ಎಂಟು ನಾಲ್ಕು ಐದು')).toBe('9845');
    expect(spokenToDigits('ombattu entu naalku aidu')).toBe('9845');
  });

  it('reads Telugu digit words and numerals', () => {
    expect(spokenToDigits('తొమ్మిది ఎనిమిది నాలుగు ఐదు')).toBe('9845');
    expect(spokenToDigits('tommidi enimidi naalugu aidu')).toBe('9845');
    expect(spokenToDigits('౯౮౪౫')).toBe('9845');
    expect(spokenToDigits('సున్నా ఒకటి రెండు మూడు ఆరు ఏడు')).toBe('012367');
  });

  it('mixes scripts and digits in one utterance (code-mixed speech)', () => {
    expect(spokenToDigits('98 चार पांच ೧೨ three')).toBe('98451' + '23');
  });

  it('strips the Hindi danda and double danda that end Sarvam transcripts', () => {
    expect(spokenToDigits('मेरा नंबर है नौ एक शून्य आठ।')).toBe('9108');
    expect(spokenToDigits('पाँच॥')).toBe('5');
  });

  // Raw Sarvam saarika:v2.5 transcripts of numbers spoken in pairs (pairs probe, 18 Nov 2026).
  it('reads Hindi two-digit number words, including spelling variants', () => {
    expect(spokenToDigits('मेरा नंबर है सत्तर उन्नीस अट्ठाईस सैंतीस छियालीस।')).toBe('7019283746');
    expect(spokenToDigits('अट्ठानवे पैंतालीस शून्य एक तेईस पैंतालीस')).toBe('9845012345');
    expect(spokenToDigits('अट्ठानबे अड़तीस अड़सठ')).toBe('983868');
    expect(spokenToDigits('दस ग्यारह निन्यानबे')).toBe('101199');
  });

  it('reads Telugu tens followed by a unit as one pair', () => {
    expect(
      spokenToDigits('నా నంబర్ తొంభై ఎనిమిది నలభై ఐదు సున్నా ఒకటి ఇరవై మూడు నలభై ఐదు'),
    ).toBe('9845012345');
    expect(spokenToDigits('నా నంబర్ డెబ్బై పందొమ్మిది ఇరవై ఎనిమిది ముప్పై ఏడు నలభై ఆరు')).toBe(
      '7019283746',
    );
    expect(spokenToDigits('పది యాభై')).toBe('1050');
  });

  it('reads Kannada joined and separate two-digit words', () => {
    expect(
      spokenToDigits('ನನ್ನ ನಂಬರ್ ತೊಂಬತ್ತೆಂಟು ನಲವತ್ತೈದು ಸೊನ್ನೆ ಒಂದು ಇಪ್ಪತ್ಮೂರು ನಲವತ್ತೈದು.'),
    ).toBe('9845012345');
    expect(spokenToDigits('ಎಪ್ಪತ್ತು ಹತ್ತೊಂಬತ್ತು ಇಪ್ಪತ್ತು ಎಂಟು')).toBe('701928');
  });

  it('reads English tens and teens', () => {
    expect(spokenToDigits('ninety eight forty five zero one twenty three forty-five')).toBe(
      '9845012345',
    );
    expect(spokenToDigits('seventy nineteen')).toBe('7019');
  });

  // From the FLEURS building slice (dev), 19 Nov 2026.
  it('keeps numerals that carry a suffix (8वीं, 2008ರಲ್ಲಿ, ₹500)', () => {
    expect(spokenToDigits('2008ರಲ್ಲಿ 14 ಸಾವಿರ')).toBe('200814');
    expect(spokenToDigits('यह 8वीं बार है')).toBe('8');
    expect(spokenToDigits('₹500 दिए')).toBe('500');
  });

  it('ignores a lone "one" that is really the article "a" (एक दिन, ಒಂದು ದಿನ)', () => {
    expect(spokenToDigits('एक दिन उसने 1636 में लिखा')).toBe('1636');
    expect(spokenToDigits('ಒಂದು ದಿನ ಅವನು ಬಂದ')).toBe('');
    // other lone number words are real numbers (Sarvam writes Telugu numbers as words)
    expect(spokenToDigits('ఆరు గంటలకు వచ్చారు')).toBe('6');
    // ...but a run of two or more number words is a number
    expect(spokenToDigits('एक दो तीन')).toBe('123');
    expect(spokenToDigits('नौ 8')).toBe('98');
  });

  it('composes numbers said with hundreds, thousands, lakhs and crores', () => {
    expect(spokenToDigits('నాలుగు వేల ఎనిమిది వందల తొంభై రెండు')).toBe('4892');
    expect(spokenToDigits('పది వేల ఎనిమిది వందల యాభై ఆరు')).toBe('10856');
    expect(spokenToDigits('నాలుగు లక్షల')).toBe('400000');
    expect(spokenToDigits('వంద')).toBe('100');
    expect(spokenToDigits('दो हज़ार दस')).toBe('2010');
    expect(spokenToDigits('एक सौ पाँच लोग')).toBe('105');
    expect(spokenToDigits('ಎರಡು ಸಾವಿರದ ಎಂಟು')).toBe('2008');
    expect(spokenToDigits('ಇನ್ನೂರು ಐವತ್ತು')).toBe('250');
    expect(spokenToDigits('four thousand eight hundred ninety two')).toBe('4892');
    expect(spokenToDigits('twenty five thousand rupees')).toBe('25000');
  });

  it('keeps digit-by-digit dictation as digits, and a numeral before a scale word as written', () => {
    expect(spokenToDigits('nine eight four five')).toBe('9845');
    expect(spokenToDigits('14 ಸಾವಿರ ಜನ')).toBe('14');
  });

  it('reads Tamil and Malayalam digit words and numerals', () => {
    expect(spokenToDigits('ஒன்பது எட்டு நான்கு ஐந்து பூஜ்ஜியம்')).toBe('98450');
    expect(spokenToDigits('௯௮௪௫')).toBe('9845');
    expect(spokenToDigits('ഒമ്പത് എട്ട് നാല് അഞ്ച് പൂജ്യം')).toBe('98450');
    expect(spokenToDigits('൯൮൪൫')).toBe('9845');
    // Sarvam writes nine with the chillu letter too (pairs probe, 19 Nov)
    expect(spokenToDigits('ഏഴ് പൂജ്യം ഒന്ന് ഒൻപത്')).toBe('7019');
  });

  it('reads Bengali, Marathi, Gujarati and Punjabi digit words and numerals', () => {
    expect(spokenToDigits('নয় আট চার পাঁচ শূন্য')).toBe('98450');
    expect(spokenToDigits('৯৮৪৫')).toBe('9845');
    expect(spokenToDigits('नऊ आठ चार पाच दोन')).toBe('98452');
    expect(spokenToDigits('નવ આઠ ચાર પાંચ શૂન્ય')).toBe('98450');
    expect(spokenToDigits('૯૮૪૫')).toBe('9845');
    expect(spokenToDigits('ਨੌਂ ਅੱਠ ਚਾਰ ਪੰਜ ਸਿਫ਼ਰ')).toBe('98450');
    expect(spokenToDigits('੯੮੪੫')).toBe('9845');
  });

  it('returns an empty string when there is no number', () => {
    expect(spokenToDigits('mera paisa chala gaya')).toBe('');
  });
});

describe('groupForReadback', () => {
  it('groups a 12-digit reference into fours', () => {
    expect(groupForReadback('402177889910')).toEqual(['4021', '7788', '9910']);
  });
  it('groups a 10-digit mobile as 5 and 5', () => {
    expect(groupForReadback('9845012345')).toEqual(['98450', '12345']);
  });
  it('leaves a short number whole', () => {
    expect(groupForReadback('500')).toEqual(['500']);
  });
});

describe('readbackText', () => {
  it('reads each digit in Hindi, group by group', () => {
    expect(readbackText('9845', 'hi')).toBe('नौ आठ चार पांच');
  });
  it('reads each digit in Kannada', () => {
    expect(readbackText('9845', 'kn')).toBe('ಒಂಬತ್ತು ಎಂಟು ನಾಲ್ಕು ಐದು');
  });
  it('reads each digit in Telugu', () => {
    expect(readbackText('9845', 'te')).toBe('తొమ్మిది ఎనిమిది నాలుగు ఐదు');
  });
  it('reads each digit in Tamil, Malayalam, Bengali, Marathi, Gujarati and Punjabi', () => {
    expect(readbackText('9845', 'ta')).toBe('ஒன்பது எட்டு நான்கு ஐந்து');
    expect(readbackText('9845', 'ml')).toBe('ഒമ്പത് എട്ട് നാല് അഞ്ച്');
    expect(readbackText('9845', 'bn')).toBe('নয় আট চার পাঁচ');
    expect(readbackText('9845', 'mr')).toBe('नऊ आठ चार पाच');
    expect(readbackText('9845', 'gu')).toBe('નવ આઠ ચાર પાંચ');
    expect(readbackText('9845', 'pa')).toBe('ਨੌਂ ਅੱਠ ਚਾਰ ਪੰਜ');
  });
  it('separates groups with a pause marker', () => {
    expect(readbackText('402177889910', 'en')).toBe(
      'four zero two one, seven seven eight eight, nine nine one zero',
    );
  });
});

// Found while writing the README, 20 Nov: English says "and" inside a number.
describe('spokenToDigits: "and" inside an English number', () => {
  it('reads "four thousand eight hundred and ninety-two" as 4892', () => {
    expect(spokenToDigits('four thousand eight hundred and ninety-two')).toBe('4892');
    expect(spokenToDigits('one hundred and five')).toBe('105');
  });
  it('keeps "and" between two separate numbers', () => {
    expect(spokenToDigits('four and five')).toBe('45');
  });
});

describe('spokenToDigits: "and" only after hundred (review 20 Nov)', () => {
  it('leaves "a thousand and five hundred" alone', () => {
    expect(spokenToDigits('a thousand and five hundred')).toBe('500');
  });
});
