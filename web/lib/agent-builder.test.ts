// How long each kind of call waits for silence before it treats a turn as finished.
import { describe, expect, it, vi } from 'vitest';
import { buildAgent } from './agent-builder';
import { PRESETS } from './agent-config';

vi.stubEnv('SARVAM_API_KEY', 'test');
vi.stubEnv('MURF_API_KEY', 'test');
vi.stubEnv('LLM_SHARED_SECRET', 'test');

const wait = (mode: 'guard' | 'complaint' | 'interpret', slow = false) =>
  buildAgent({ client: {} as never, preset: PRESETS.auto, lang: 'te', mode, channel: 'c1', llmUrl: 'https://example.org', surface: 'web', slow })
    .turnDetection?.config?.end_of_speech?.vad_config?.silence_duration_ms;

describe('when a turn ends', () => {
  it('the 1930 interpreter waits through the pauses of an operator reading out a number in groups', () => {
    // a live run split the acknowledgement number at a pause between groups (20 Nov)
    expect(wait('interpret')).toBeGreaterThanOrEqual(800);
  });
  it('a normal call stays quick, and slow mode still waits longest', () => {
    expect(wait('complaint')).toBe(480);
    expect(wait('guard')).toBe(480);
    expect(wait('complaint', true)).toBe(900);
    expect(wait('interpret', true)).toBe(900);
  });
});
