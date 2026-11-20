// Short "one moment" lines Agora speaks while our model is still thinking (filler words), and the
// prompt it gives when a frightened caller goes quiet (silence handling). Complaint mode only:
// on guard the agent must stay silent.
const ONE_MOMENT: Record<string, string[]> = {
  en: ['One moment.', 'Let me check that.'],
  // Agora's phone-call API refuses a phrase in an Indian script longer than 20 characters
  hi: ['एक सेकंड।', 'ज़रा रुकिए।'],
  te: ['ఒక్క నిమిషం.', 'ఒక్క క్షణం.'],
  kn: ['ಒಂದು ನಿಮಿಷ.', 'ಒಂದು ಕ್ಷಣ.'],
  ta: ['ஒரு நிமிடம்.', 'ஒரு கணம்.'],
  ml: ['ഒരു നിമിഷം.'],
  bn: ['এক মিনিট।'],
  mr: ['एक मिनिट.'],
  gu: ['એક મિનિટ.'],
  pa: ['ਇੱਕ ਮਿੰਟ।'],
  auto: ['One moment.', 'एक सेकंड।'],
};

export function fillerWords(lang: string) {
  return {
    enable: true,
    // fast-path turns answer in about 0.2 to 0.4 s, so only turns that go to the model hear this
    trigger: { mode: 'fixed_time' as const, fixed_time_config: { response_wait_ms: 1200 } },
    content: { mode: 'static' as const, static_config: { phrases: ONE_MOMENT[lang] ?? ONE_MOMENT.en, selection_rule: 'shuffle' as const } },
  };
}

// The model words the reminder in the caller's language ("think" passes it to our route).
export const SILENCE_PROMPT =
  'The caller has gone quiet for a while; they may be in shock. In one short, warm sentence in their language, tell them to take their time, then ask for the next missing detail.';
