import { describe, expect, it } from 'vitest';
import { fillerWords } from './filler';

describe('fillerWords', () => {
  it('speaks the caller language, only after the model has been waiting a while', () => {
    const f = fillerWords('te');
    expect(f.trigger.fixed_time_config.response_wait_ms).toBeGreaterThanOrEqual(1000);
    expect(f.content.static_config.phrases[0]).toMatch(/[ఀ-౿]/);
  });
  it("keeps every phrase in an Indian script to 20 characters, or Agora's phone-call API refuses the agent (21 Nov)", () => {
    for (const lang of ['hi', 'te', 'kn', 'ta', 'ml', 'bn', 'mr', 'gu', 'pa', 'en', 'auto']) {
      for (const phrase of fillerWords(lang).content.static_config.phrases) {
        if (/[^\x00-\x7F]/.test(phrase)) expect(phrase.length, `${lang}: ${phrase}`).toBeLessThanOrEqual(20);
      }
    }
  });
  it('falls back to English for a language without phrases', () => {
    expect(fillerWords('xx').content.static_config.phrases).toContain('One moment.');
  });
});
