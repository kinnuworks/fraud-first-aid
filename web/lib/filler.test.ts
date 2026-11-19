import { describe, expect, it } from 'vitest';
import { fillerWords } from './filler';

describe('fillerWords', () => {
  it('speaks the caller language, only after the model has been waiting a while', () => {
    const f = fillerWords('te');
    expect(f.trigger.fixed_time_config.response_wait_ms).toBeGreaterThanOrEqual(1000);
    expect(f.content.static_config.phrases[0]).toMatch(/[ఀ-౿]/);
  });
  it('falls back to English for a language without phrases', () => {
    expect(fillerWords('xx').content.static_config.phrases).toContain('One moment.');
  });
});
