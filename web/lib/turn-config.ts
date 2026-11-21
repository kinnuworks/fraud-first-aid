// When the agent takes its turn and what cuts it off, per mode (Agora's VAD turn detection).
// - end of speech: ms of silence before the caller's turn ends and the agent answers.
// - interrupt: ms of the caller's speech before the agent stops talking.
// The guard is quick, so it can cut in the moment a caller asks for the OTP. The complaint waits for
// pauses between UTR groups and ignores short noise (a busy room); the 1930 interpreter waits for an
// operator reading a number in groups (a live run split the acknowledgement number at a pause, 20 Nov);
// slow mode waits longest, for callers who pause mid-sentence.
export type AgentMode = 'guard' | 'complaint' | 'interpret';

export function turnConfig(mode: AgentMode, slow: boolean) {
  const silence = slow ? 1200 : mode === 'guard' ? 480 : 800;
  const interrupt = mode === 'guard' ? 160 : 400;
  return {
    speech_threshold: 0.5,
    start_of_speech: {
      mode: 'vad' as const,
      vad_config: {
        interrupt_duration_ms: interrupt, // ms of speech before interruption triggers
        prefix_padding_ms: 300, // audio captured before speech is detected
      },
    },
    end_of_speech: {
      mode: 'vad' as const,
      vad_config: { silence_duration_ms: silence },
    },
  };
}
