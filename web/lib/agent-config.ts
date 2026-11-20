// Language presets for the voice agent: which Sarvam ASR language code and which Murf
// Falcon voice to use. Voices are Murf's own picks for each language (the organisers' recommended-
// voices sheet) and are checked against Murf's live list (GET /v1/speech/voices?model=falcon-2.1)
// and by scripts/voice-roundtrip.ts.
export type LangCode = 'hi' | 'kn' | 'te' | 'en' | 'ta' | 'ml' | 'bn' | 'mr' | 'gu' | 'pa' | 'auto';

export type LangPreset = {
  asrLanguage: string; // Sarvam code, or "unknown" for automatic detection
  voiceId: string;
  locale: string;
  greeting: string;
};

export const PRESETS: Record<LangCode, LangPreset> = {
  hi: {
    asrLanguage: 'hi-IN',
    voiceId: 'en-IN-pooja',
    locale: 'hi-IN',
    greeting: 'नमस्ते! मैं आपकी मदद के लिए यहाँ हूँ। बताइए, क्या हुआ?',
  },
  kn: {
    asrLanguage: 'kn-IN',
    voiceId: 'en-IN-pooja',
    locale: 'kn-IN',
    greeting: 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ. ಏನಾಯಿತು ಹೇಳಿ?',
  },
  te: {
    asrLanguage: 'te-IN',
    voiceId: 'en-IN-pooja',
    locale: 'te-IN',
    greeting: 'నమస్కారం! నేను మీకు సహాయం చేయడానికి ఇక్కడ ఉన్నాను. ఏమైందో చెప్పండి?',
  },
  en: {
    asrLanguage: 'en-IN',
    voiceId: 'en-IN-anisha',
    locale: 'en-IN',
    greeting: "Hello! I'm here to help. Tell me what happened.",
  },
  ta: {
    asrLanguage: 'ta-IN',
    voiceId: 'en-IN-pooja',
    locale: 'ta-IN',
    greeting: 'வணக்கம்! நான் உங்களுக்கு உதவ இங்கே இருக்கிறேன். என்ன நடந்தது என்று சொல்லுங்கள்.',
  },
  ml: {
    asrLanguage: 'ml-IN',
    voiceId: 'gu-IN-diya',
    locale: 'ml-IN',
    greeting: 'നമസ്കാരം! ഞാൻ നിങ്ങളെ സഹായിക്കാൻ ഇവിടെയുണ്ട്. എന്താണ് സംഭവിച്ചതെന്ന് പറയൂ.',
  },
  bn: {
    asrLanguage: 'bn-IN',
    voiceId: 'bn-IN-debarati',
    locale: 'bn-IN',
    greeting: 'নমস্কার! আমি আপনাকে সাহায্য করতে এখানে আছি। কী হয়েছে বলুন।',
  },
  mr: {
    asrLanguage: 'mr-IN',
    voiceId: 'gu-IN-diya',
    locale: 'mr-IN',
    greeting: 'नमस्कार! मी तुमची मदत करायला इथे आहे. काय झालं ते सांगा.',
  },
  gu: {
    asrLanguage: 'gu-IN',
    voiceId: 'gu-IN-diya',
    locale: 'gu-IN',
    greeting: 'નમસ્તે! હું તમારી મદદ કરવા અહીં છું. શું થયું તે કહો.',
  },
  pa: {
    asrLanguage: 'pa-IN',
    voiceId: 'pa-IN-harpreet',
    locale: 'pa-IN',
    greeting: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡੀ ਮਦਦ ਲਈ ਇੱਥੇ ਹਾਂ। ਦੱਸੋ ਕੀ ਹੋਇਆ।',
  },
  // Any language (and the 1930 interpreter): Sarvam detects it; Rachna, Murf's pick for Hindi,
  // speaks English and all nine Indian languages here.
  auto: {
    asrLanguage: 'unknown',
    voiceId: 'hi-IN-rachna',
    locale: 'hi-IN',
    greeting: 'నమస్కారం! नमस्ते! ನಮಸ್ಕಾರ! வணக்கம்! Hello! Speak in your own language and tell me what happened.',
  },
};

export function presetFor(lang: unknown): LangPreset {
  return PRESETS[(lang as LangCode) in PRESETS ? (lang as LangCode) : 'hi'];
}

// Prototype instructions: capture a phone number and read it back digit by digit in groups.
export function prototypeInstructions(p: LangPreset): string {
  return `You are a helpful voice assistant for people in India. Speak only in the user's language (${p.locale}), in short spoken sentences, never lists. For this test, ask the user for their 10-digit mobile number. When you have it, read it back digit by digit in two groups of five, each digit as a word in the user's language, and ask whether it is correct. If they say a digit is wrong, ask only for that group again. Never ask for OTPs or PINs.`;
}
