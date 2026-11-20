// Things that happen on screen, not in speech (the payment screenshot is read, the pack is emailed
// from the Send button), are said aloud at once through Agora's speak API, in the caller's language.
// A screenshot that disagrees interrupts the agent (priority INTERRUPT); a confirmation waits for it
// to finish (APPEND).
import { AgoraClient, Area, generateConvoAIToken } from 'agora-agents';
import type { ReadbackLang } from '../entities/numbers';
import type { Complaint } from './session';

type Lines = { shotGroup: (g: number) => string; shotDiffers: string; shotMatches: string; emailed: string };
export const ANNOUNCE: Record<ReadbackLang, Lines> = {
  en: {
    shotGroup: (g) => `I've read your screenshot. Group ${g} of the UTR is different from what you said. Which one is right?`,
    shotDiffers: "I've read your screenshot. Something on it is different from what you said; it's marked on the screen. Which is right?",
    shotMatches: "I've read your screenshot. It matches what you told me.",
    emailed: "Done. I've emailed your pack and the reminders.",
  },
  hi: {
    shotGroup: (g) => `मैंने आपका स्क्रीनशॉट पढ़ लिया। UTR का ग्रुप ${g} आपकी बताई संख्या से अलग है। कौन-सा सही है?`,
    shotDiffers: 'मैंने आपका स्क्रीनशॉट पढ़ लिया। उसमें कुछ आपकी बताई बात से अलग है, स्क्रीन पर दिखाया है। कौन-सा सही है?',
    shotMatches: 'मैंने आपका स्क्रीनशॉट पढ़ लिया, यह आपकी बताई बातों से मेल खाता है।',
    emailed: 'हो गया। मैंने आपका पैक और रिमाइंडर ईमेल कर दिए हैं।',
  },
  te: {
    shotGroup: (g) => `మీ స్క్రీన్‌షాట్ చదివాను. UTR లో ${g}వ గ్రూప్ మీరు చెప్పిన దానికి వేరుగా ఉంది. ఏది సరైనది?`,
    shotDiffers: 'మీ స్క్రీన్‌షాట్ చదివాను. అందులో ఒకటి మీరు చెప్పిన దానికి వేరుగా ఉంది, స్క్రీన్ మీద చూపించాను. ఏది సరైనది?',
    shotMatches: 'మీ స్క్రీన్‌షాట్ చదివాను, మీరు చెప్పిన దానితో సరిపోతోంది.',
    emailed: 'అయిపోయింది. మీ ప్యాక్, రిమైండర్లు ఈమెయిల్ చేశాను.',
  },
  kn: {
    shotGroup: (g) => `ನಿಮ್ಮ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಓದಿದೆ. UTR ನ ${g}ನೇ ಗುಂಪು ನೀವು ಹೇಳಿದ್ದಕ್ಕಿಂತ ಬೇರೆ ಇದೆ. ಯಾವುದು ಸರಿ?`,
    shotDiffers: 'ನಿಮ್ಮ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಓದಿದೆ. ಅದರಲ್ಲಿ ಒಂದು ನೀವು ಹೇಳಿದ್ದಕ್ಕಿಂತ ಬೇರೆ ಇದೆ, ಸ್ಕ್ರೀನ್ ಮೇಲೆ ತೋರಿಸಿದ್ದೇನೆ. ಯಾವುದು ಸರಿ?',
    shotMatches: 'ನಿಮ್ಮ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಓದಿದೆ, ನೀವು ಹೇಳಿದ್ದಕ್ಕೆ ಹೊಂದುತ್ತದೆ.',
    emailed: 'ಆಯಿತು. ನಿಮ್ಮ ಪ್ಯಾಕ್ ಮತ್ತು ರಿಮೈಂಡರ್‌ಗಳನ್ನು ಈಮೇಲ್ ಮಾಡಿದ್ದೇನೆ.',
  },
  ta: {
    shotGroup: (g) => `உங்கள் ஸ்கிரீன்ஷாட்டைப் படித்தேன். UTR-இன் ${g}வது குழு நீங்கள் சொன்னதிலிருந்து வேறுபடுகிறது. எது சரி?`,
    shotDiffers: 'உங்கள் ஸ்கிரீன்ஷாட்டைப் படித்தேன். அதில் ஒன்று நீங்கள் சொன்னதிலிருந்து வேறுபடுகிறது, திரையில் காட்டியுள்ளேன். எது சரி?',
    shotMatches: 'உங்கள் ஸ்கிரீன்ஷாட்டைப் படித்தேன், நீங்கள் சொன்னதோடு பொருந்துகிறது.',
    emailed: 'முடிந்தது. உங்கள் தொகுப்பையும் நினைவூட்டல்களையும் மின்னஞ்சல் செய்துவிட்டேன்.',
  },
  ml: {
    shotGroup: (g) => `നിങ്ങളുടെ സ്ക്രീൻഷോട്ട് വായിച്ചു. UTR-ലെ ${g}-ാം ഗ്രൂപ്പ് നിങ്ങൾ പറഞ്ഞതിൽ നിന്ന് വ്യത്യസ്തമാണ്. ഏതാണ് ശരി?`,
    shotDiffers: 'നിങ്ങളുടെ സ്ക്രീൻഷോട്ട് വായിച്ചു. അതിലൊന്ന് നിങ്ങൾ പറഞ്ഞതിൽ നിന്ന് വ്യത്യസ്തമാണ്, സ്ക്രീനിൽ കാണിച്ചിട്ടുണ്ട്. ഏതാണ് ശരി?',
    shotMatches: 'നിങ്ങളുടെ സ്ക്രീൻഷോട്ട് വായിച്ചു, നിങ്ങൾ പറഞ്ഞതുമായി ഒത്തുപോകുന്നു.',
    emailed: 'കഴിഞ്ഞു. നിങ്ങളുടെ പാക്കും ഓർമ്മപ്പെടുത്തലുകളും ഇമെയിൽ ചെയ്തു.',
  },
  mr: {
    shotGroup: (g) => `मी तुमचा स्क्रीनशॉट वाचला. UTR चा ${g} वा गट तुम्ही सांगितलेल्यापेक्षा वेगळा आहे. कोणता बरोबर आहे?`,
    shotDiffers: 'मी तुमचा स्क्रीनशॉट वाचला. त्यातलं काहीतरी तुम्ही सांगितलेल्यापेक्षा वेगळं आहे, स्क्रीनवर दाखवलं आहे. कोणतं बरोबर आहे?',
    shotMatches: 'मी तुमचा स्क्रीनशॉट वाचला, तो तुम्ही सांगितलेल्याशी जुळतो.',
    emailed: 'झालं. मी तुमचा पॅक आणि रिमाइंडर ईमेल केले आहेत.',
  },
  bn: {
    shotGroup: (g) => `আপনার স্ক্রিনশট পড়লাম। UTR-এর ${g} নম্বর গ্রুপ আপনি যা বলেছেন তার থেকে আলাদা। কোনটা ঠিক?`,
    shotDiffers: 'আপনার স্ক্রিনশট পড়লাম। তাতে একটা জিনিস আপনি যা বলেছেন তার থেকে আলাদা, স্ক্রিনে দেখানো আছে। কোনটা ঠিক?',
    shotMatches: 'আপনার স্ক্রিনশট পড়লাম, আপনি যা বলেছেন তার সঙ্গে মিলে যাচ্ছে।',
    emailed: 'হয়ে গেছে। আপনার প্যাক আর রিমাইন্ডার ইমেল করে দিয়েছি।',
  },
  gu: {
    shotGroup: (g) => `મેં તમારો સ્ક્રીનશૉટ વાંચ્યો. UTR નો ${g} મો ગ્રુપ તમે કહ્યું તેનાથી અલગ છે. કયો સાચો છે?`,
    shotDiffers: 'મેં તમારો સ્ક્રીનશૉટ વાંચ્યો. તેમાં કંઈક તમે કહ્યું તેનાથી અલગ છે, સ્ક્રીન પર બતાવ્યું છે. કયું સાચું છે?',
    shotMatches: 'મેં તમારો સ્ક્રીનશૉટ વાંચ્યો, તે તમે કહ્યું તેની સાથે મેળ ખાય છે.',
    emailed: 'થઈ ગયું. મેં તમારો પૅક અને રિમાઇન્ડર ઈમેલ કરી દીધા છે.',
  },
  pa: {
    shotGroup: (g) => `ਮੈਂ ਤੁਹਾਡਾ ਸਕ੍ਰੀਨਸ਼ਾਟ ਪੜ੍ਹ ਲਿਆ। UTR ਦਾ ${g} ਨੰਬਰ ਗਰੁੱਪ ਤੁਹਾਡੇ ਦੱਸੇ ਨਾਲੋਂ ਵੱਖਰਾ ਹੈ। ਕਿਹੜਾ ਸਹੀ ਹੈ?`,
    shotDiffers: 'ਮੈਂ ਤੁਹਾਡਾ ਸਕ੍ਰੀਨਸ਼ਾਟ ਪੜ੍ਹ ਲਿਆ। ਉਸ ਵਿੱਚ ਕੁਝ ਤੁਹਾਡੇ ਦੱਸੇ ਨਾਲੋਂ ਵੱਖਰਾ ਹੈ, ਸਕ੍ਰੀਨ ਤੇ ਦਿਖਾਇਆ ਹੈ। ਕਿਹੜਾ ਸਹੀ ਹੈ?',
    shotMatches: 'ਮੈਂ ਤੁਹਾਡਾ ਸਕ੍ਰੀਨਸ਼ਾਟ ਪੜ੍ਹ ਲਿਆ, ਇਹ ਤੁਹਾਡੀ ਦੱਸੀ ਗੱਲ ਨਾਲ ਮੇਲ ਖਾਂਦਾ ਹੈ।',
    emailed: 'ਹੋ ਗਿਆ। ਮੈਂ ਤੁਹਾਡਾ ਪੈਕ ਅਤੇ ਰਿਮਾਈਂਡਰ ਈਮੇਲ ਕਰ ਦਿੱਤੇ ਹਨ।',
  },
};

// What to say after the screenshot is read: the first UTR group that differs, any other difference,
// or that it all matches. Null when the screenshot had nothing to compare yet.
export function shotLine(lang: ReadbackLang, check: Record<string, { status: string; groups?: number[] }>): { text: string; interrupt: boolean } | null {
  const L = ANNOUNCE[lang];
  const utr = check.utr;
  if (utr?.status === 'mismatch' && utr.groups?.length) return { text: L.shotGroup(utr.groups[0]), interrupt: true };
  if (Object.values(check).some((v) => v.status === 'mismatch')) return { text: L.shotDiffers, interrupt: true };
  if (Object.values(check).some((v) => v.status === 'match')) return { text: L.shotMatches, interrupt: false };
  return null;
}

// Say it now through the running agent (Agora speak API). Fails loudly in the log, never the request.
export async function announce(c: Complaint, text: string, interrupt: boolean): Promise<boolean> {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;
  if (!c.agentId || !appId || !appCertificate || c.phase !== 'complaint') return false;
  try {
    const client = new AgoraClient({ area: Area.US, appId, appCertificate });
    // The low-level REST call needs the same token header the SDK's own stopAgent() builds; without it
    // Agora answers 401 "Invalid authentication type" (seen in production, 20 Nov).
    const token = generateConvoAIToken({ appId, appCertificate, channelName: 'speak', uid: 0 });
    await client.agents.speak(
      { appid: appId, agentId: c.agentId, text, priority: interrupt ? 'INTERRUPT' : 'APPEND', interruptable: true },
      { headers: { Authorization: `agora token=${token}` } },
    );
    return true;
  } catch (e) {
    console.error('[announce] Agora speak failed:', e);
    return false;
  }
}
