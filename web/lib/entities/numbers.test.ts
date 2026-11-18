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
  it('separates groups with a pause marker', () => {
    expect(readbackText('402177889910', 'en')).toBe(
      'four zero two one, seven seven eight eight, nine nine one zero',
    );
  });
});
