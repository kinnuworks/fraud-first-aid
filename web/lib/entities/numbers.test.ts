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

  it('mixes scripts and digits in one utterance (code-mixed speech)', () => {
    expect(spokenToDigits('98 चार पांच ೧೨ three')).toBe('98451' + '23');
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
  it('separates groups with a pause marker', () => {
    expect(readbackText('402177889910', 'en')).toBe(
      'four zero two one, seven seven eight eight, nine nine one zero',
    );
  });
});
