// Language presets for the voice agent: which Sarvam ASR language code and which Murf
// Falcon voice to use. Voice IDs come from Murf's live voice list (GET /v1/speech/voices).
export type LangCode = 'hi' | 'kn' | 'te' | 'en' | 'auto';

export type LangPreset = {
  asrLanguage: string; // Sarvam code, or "unknown" for automatic detection
  voiceId: string;
  locale: string;
  greeting: string;
};

export const PRESETS: Record<LangCode, LangPreset> = {
  hi: {
    asrLanguage: 'hi-IN',
    voiceId: 'hi-IN-namrita',
    locale: 'hi-IN',
    greeting: 'नमस्ते! मैं आपकी मदद के लिए यहाँ हूँ। बताइए, क्या हुआ?',
  },
  kn: {
    asrLanguage: 'kn-IN',
    voiceId: 'kn-IN-harshitha',
    locale: 'kn-IN',
    greeting: 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ. ಏನಾಯಿತು ಹೇಳಿ?',
  },
  te: {
    asrLanguage: 'te-IN',
    voiceId: 'en-IN-anisha',
    locale: 'te-IN',
    greeting: 'నమస్కారం! నేను మీకు సహాయం చేయడానికి ఇక్కడ ఉన్నాను. ఏమైందో చెప్పండి?',
  },
  en: {
    asrLanguage: 'en-IN',
    voiceId: 'en-IN-anisha',
    locale: 'en-IN',
    greeting: "Hello! I'm here to help. Tell me what happened.",
  },
  auto: {
    asrLanguage: 'unknown',
    voiceId: 'en-IN-nikhil',
    locale: 'hi-IN',
    greeting: 'नमस्ते! Namaskara! Hello! आप किसी भी भाषा में बात कर सकते हैं।',
  },
};

export function presetFor(lang: unknown): LangPreset {
  return PRESETS[(lang as LangCode) in PRESETS ? (lang as LangCode) : 'hi'];
}

// Prototype instructions: capture a phone number and read it back digit by digit in groups.
export function prototypeInstructions(p: LangPreset): string {
  return `You are a helpful voice assistant for people in India. Speak only in the user's language (${p.locale}), in short spoken sentences, never lists. For this test, ask the user for their 10-digit mobile number. When you have it, read it back digit by digit in two groups of five, each digit as a word in the user's language, and ask whether it is correct. If they say a digit is wrong, ask only for that group again. Never ask for OTPs or PINs.`;
}
