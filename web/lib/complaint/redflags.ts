// Fast path for the scam-call guard: clear red-flag asks are caught by rules on the transcript
// (in every script Sarvam writes) and answered at once with a fixed warning in the caller's
// language, without waiting for the model. Subtler cases still go to the model.
import type { ReadbackLang } from '../entities/numbers';
import { addFlag, type Complaint } from './session';

const OTP = /\botp\b|ओटीपी|ఓటీపీ|ఓటిపి|ಒಟಿಪಿ|ಓಟಿಪಿ|ஓடிபி|ഒടിപി|ওটিপি|ઓટીપી|ਓਟੀਪੀ/i;
const CVV = /\bcvv\b|सीवीवी|సీవీవీ|ಸಿವಿವಿ/i;
// Tamil "பின்" also means "after", so Tamil PIN is left to the model.
const PIN = /\bm?pin\b|पिन|పిన్|ಪಿನ್|പിൻ|পিন|પિન|ਪਿੰਨ/i;
const RECEIVE = /receiv|refund|cashback|रिफंड|पैसे (लेने|पाने)|రిఫండ్|ರಿಫಂಡ್/i;
const QR = /\bqr\b|क्यूआर|క్యూఆర్|ಕ್ಯೂಆರ್|க்யூஆர்|ക്യുആർ|কিউআর|ક્યુઆર|ਕਿਊਆਰ/i;
const SCREEN = /any ?desk|team ?viewer|quick ?support|screen ?shar|एनीडेस्क|ఎనీడెస్క్|ಎನಿಡೆಸ್ಕ್/i;
const ARREST = /digital arrest|\barrest|डिजिटल अरेस्ट|अरेस्ट|गिरफ्तार|అరెస్ట్|ಅರೆಸ್ಟ್|கைது|അറസ്റ്റ്/i;
const KYC = /\bkyc\b|केवाईसी|కేవైసీ|ಕೆವೈಸಿ|கேஒய்சி|കെവൈസി/i;

// Words that say the money has already gone: the caller is telling their story, not on a live
// scam call, so the model should switch to the complaint instead of warning.
export const LOSS = /already|paid|lost|debited|deducted|gone|chale? gay|chala gaya|bhej diya|kat gaye|ఇప్పటికే|పంపేశా|పోయాయి|పోయింది|కట్ అయ్యా|पहले ही|भेज दिए|चले गए|कट गए|ಈಗಾಗಲೇ|ಕಳೆದು|ಹೋಯಿತು/i;

export type RedFlag = { scam: string; ask: string };

export function detectRedFlag(text: string): RedFlag | null {
  if (SCREEN.test(text)) return { scam: 'screen_share', ask: 'asked to install a screen-sharing app' };
  if (QR.test(text)) return { scam: 'qr_scan', ask: 'asked to scan a QR code' };
  if (PIN.test(text) && RECEIVE.test(text)) return { scam: 'pin_to_receive', ask: 'asked for a PIN to "receive" money' };
  if (ARREST.test(text)) return { scam: 'digital_arrest', ask: 'threatened arrest' };
  if (OTP.test(text) || CVV.test(text) || PIN.test(text)) {
    const ask = OTP.test(text) ? 'asked for the OTP' : CVV.test(text) ? 'asked for the CVV' : 'asked for the PIN';
    return { scam: KYC.test(text) ? 'fake_kyc' : 'vishing_otp', ask };
  }
  return null;
}

const WARNING: Record<ReadbackLang, string> = {
  en: 'This is a scam call. Hang up now. No bank, police or government office ever asks for an OTP, PIN, QR scan or payment on a call.',
  hi: 'यह धोखाधड़ी वाली कॉल है। अभी फ़ोन काट दीजिए। कोई भी बैंक, पुलिस या सरकारी दफ़्तर कॉल पर OTP, PIN, QR स्कैन या पैसे नहीं माँगता।',
  te: 'ఇది మోసపూరిత కాల్. వెంటనే ఫోన్ కట్ చేయండి. ఏ బ్యాంక్, పోలీస్ లేదా ప్రభుత్వ కార్యాలయం కూడా కాల్‌లో OTP, PIN, QR స్కాన్ లేదా డబ్బు అడగదు.',
  kn: 'ಇದು ವಂಚನೆಯ ಕರೆ. ಈಗಲೇ ಫೋನ್ ಕಟ್ ಮಾಡಿ. ಯಾವುದೇ ಬ್ಯಾಂಕ್, ಪೊಲೀಸ್ ಅಥವಾ ಸರ್ಕಾರಿ ಕಚೇರಿ ಕರೆಯಲ್ಲಿ OTP, PIN, QR ಸ್ಕ್ಯಾನ್ ಅಥವಾ ಹಣ ಕೇಳುವುದಿಲ್ಲ.',
  ta: 'இது ஒரு மோசடி அழைப்பு. உடனே அழைப்பைத் துண்டியுங்கள். எந்த வங்கியும், காவல்துறையும், அரசு அலுவலகமும் அழைப்பில் OTP, PIN, QR ஸ்கேன் அல்லது பணம் கேட்பதில்லை.',
  ml: 'ഇതൊരു തട്ടിപ്പ് കോളാണ്. ഉടൻ ഫോൺ കട്ട് ചെയ്യുക. ഒരു ബാങ്കും പോലീസും സർക്കാർ ഓഫീസും ഫോണിൽ OTP, PIN, QR സ്കാൻ അല്ലെങ്കിൽ പണം ചോദിക്കില്ല.',
  bn: 'এটা একটা প্রতারণার কল। এখনই ফোন কেটে দিন। কোনো ব্যাংক, পুলিশ বা সরকারি অফিস কখনও ফোনে OTP, PIN, QR স্ক্যান বা টাকা চায় না।',
  mr: 'हा फसवणुकीचा कॉल आहे. आत्ताच फोन कट करा. कोणतीही बँक, पोलीस किंवा सरकारी कार्यालय फोनवर OTP, PIN, QR स्कॅन किंवा पैसे मागत नाही.',
  gu: 'આ છેતરપિંડીનો કૉલ છે. હમણાં જ ફોન કાપી નાખો. કોઈ બેંક, પોલીસ કે સરકારી કચેરી ક્યારેય ફોન પર OTP, PIN, QR સ્કેન કે પૈસા માગતી નથી.',
  pa: "ਇਹ ਧੋਖਾਧੜੀ ਵਾਲੀ ਕਾਲ ਹੈ। ਹੁਣੇ ਫ਼ੋਨ ਕੱਟ ਦਿਓ। ਕੋਈ ਵੀ ਬੈਂਕ, ਪੁਲਿਸ ਜਾਂ ਸਰਕਾਰੀ ਦਫ਼ਤਰ ਫ਼ੋਨ 'ਤੇ OTP, PIN, QR ਸਕੈਨ ਜਾਂ ਪੈਸੇ ਨਹੀਂ ਮੰਗਦਾ।",
};

// The fixed warning to speak now, or null to let the model answer.
export function guardShortcut(c: Complaint, lastUser: string): string | null {
  if (c.phase !== 'guard' || LOSS.test(lastUser)) return null;
  const f = detectRedFlag(lastUser);
  if (!f || !addFlag(c, f.scam, f.ask, lastUser)) return null;
  return WARNING[c.lang];
}
