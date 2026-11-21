import { describe, expect, it } from 'vitest';
import { turnConfig } from './turn-config';

// When the agent takes its turn (silence) and how much speech cuts it off (interrupt).
// 21 Nov, venue rehearsal: in complaint mode the agent answered during the caller's short pauses
// (480 ms of silence ended the turn) and the hall's noise cut it off mid-sentence (160 ms of sound),
// so it talked over the caller and then started again.
const end = (c: ReturnType<typeof turnConfig>) => c.end_of_speech.vad_config.silence_duration_ms;
const cut = (c: ReturnType<typeof turnConfig>) => c.start_of_speech.vad_config.interrupt_duration_ms;

describe('turnConfig', () => {
  it('complaint: waits 800 ms of silence, so a pause between UTR groups does not end the turn', () => {
    expect(end(turnConfig('complaint', false))).toBe(800);
  });
  it('complaint and interpreter: only 400 ms of speech cuts the agent off, so a cough or hall noise does not', () => {
    expect(cut(turnConfig('complaint', false))).toBe(400);
    expect(cut(turnConfig('interpret', false))).toBe(400);
  });
  it('slow mode waits longest, for callers who pause mid-sentence', () => {
    expect(end(turnConfig('complaint', true))).toBe(1200);
    expect(end(turnConfig('complaint', true))).toBeGreaterThan(end(turnConfig('complaint', false)));
  });
  it('the 1930 interpreter keeps 800 ms, for an operator reading a number in groups', () => {
    expect(end(turnConfig('interpret', false))).toBe(800);
  });
  it('the guard stays quick: it has to cut in the moment the caller asks for the OTP', () => {
    expect(end(turnConfig('guard', false))).toBe(480);
    expect(cut(turnConfig('guard', false))).toBe(160);
  });
});
