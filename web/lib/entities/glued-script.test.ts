import { describe, expect, it } from 'vitest';
import { spokenToDigits } from './numbers';

// 21 Nov, production: speech-to-text glued an English word to the first Telugu digit
// ("UTR Numberనాలుగు సున్నా ..."); the "four" was lost, 11 digits were heard, and the complaint
// waited silently for a twelfth. A word in English letters next to an Indian script is two words.
describe('an English word glued to an Indian-script number word', () => {
  it('Telugu: "UTR Numberనాలుగు ..." keeps all 12 digits', () => {
    expect(spokenToDigits('UTR Numberనాలుగు సున్నా రెండు ఒకటి ఏడు ఏడు ఎనిమిది ఎనిమిది తొమ్మిది తొమ్మిది ఒకటి సున్నా')).toBe('402177889910');
  });
  it('Hindi: "UTRचार शून्य ..." keeps the first digit', () => {
    expect(spokenToDigits('UTRचार शून्य दो एक')).toBe('4021');
  });
  it('a digit word glued to English after it is split too', () => {
    expect(spokenToDigits('నాలుగుnumber సున్నా')).toBe('40');
  });
});
