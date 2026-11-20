// 1930 interpreter: the caller puts their 1930 call on speaker next to Fraud First Aid. It gives the
// operator the confirmed details in English (or Hindi), and tells the caller in their own language
// what the operator asks and says. Facts come only from the confirmed complaint, never from the model.
import type { Complaint } from './session';
import type { ReadbackLang } from '../entities/numbers';
import { buildPack, LANG_NAME } from './pack';
import { istToday } from './today';

// Spoken when the interpreter joins: what to do next, in the caller's language.
export const INTERPRET_GREETING: Record<ReadbackLang, string> = {
  en: "Call 1930 now and put that phone on speaker, close to me. When the operator answers, I'll give them your details and tell you what they say.",
  hi: 'अब 1930 पर कॉल करें और फ़ोन का स्पीकर ऑन करके मेरे पास रखें। ऑपरेटर के बोलते ही मैं उन्हें आपकी पूरी जानकारी दूँगी, और उनकी हर बात आपको हिंदी में बताऊँगी।',
  te: 'ఇప్పుడు 1930 కి కాల్ చేసి, ఫోన్ స్పీకర్ ఆన్ చేసి నా దగ్గర పెట్టండి. ఆపరేటర్ మాట్లాడగానే మీ వివరాలు నేను వాళ్ళకి చెబుతాను, వాళ్ళు చెప్పేది మీకు తెలుగులో చెబుతాను.',
  kn: 'ಈಗ 1930 ಗೆ ಕರೆ ಮಾಡಿ, ಫೋನ್ ಸ್ಪೀಕರ್ ಆನ್ ಮಾಡಿ ನನ್ನ ಹತ್ತಿರ ಇಡಿ. ಆಪರೇಟರ್ ಮಾತನಾಡಿದ ತಕ್ಷಣ ನಿಮ್ಮ ವಿವರಗಳನ್ನು ನಾನು ಅವರಿಗೆ ಹೇಳುತ್ತೇನೆ, ಅವರು ಹೇಳುವುದನ್ನು ನಿಮಗೆ ಕನ್ನಡದಲ್ಲಿ ಹೇಳುತ್ತೇನೆ.',
  ta: 'இப்போது 1930-க்கு அழைத்து, போனின் ஸ்பீக்கரை ஆன் செய்து என் அருகில் வையுங்கள். ஆபரேட்டர் பேசியவுடன் உங்கள் விவரங்களை நான் அவர்களிடம் சொல்கிறேன், அவர்கள் சொல்வதை உங்களுக்குத் தமிழில் சொல்கிறேன்.',
  ml: 'ഇപ്പോൾ 1930-ൽ വിളിച്ച്, ഫോണിന്റെ സ്പീക്കർ ഓണാക്കി എന്റെ അടുത്ത് വെക്കൂ. ഓപ്പറേറ്റർ സംസാരിച്ചാലുടൻ നിങ്ങളുടെ വിവരങ്ങൾ ഞാൻ അവരോട് പറയാം, അവർ പറയുന്നത് നിങ്ങളോട് മലയാളത്തിൽ പറയാം.',
  mr: 'आता 1930 वर कॉल करा आणि फोनचा स्पीकर चालू करून माझ्या जवळ ठेवा. ऑपरेटर बोलताच मी त्यांना तुमची माहिती देईन, आणि ते जे सांगतील ते तुम्हाला मराठीत सांगेन.',
  bn: 'এখন 1930-এ ফোন করুন, আর ফোনের স্পিকার চালু করে আমার কাছে রাখুন। অপারেটর কথা বললেই আমি ওঁদের আপনার তথ্য জানাব, আর ওঁরা যা বলবেন তা আপনাকে বাংলায় বলব।',
  gu: 'હવે 1930 પર કૉલ કરો અને ફોનનું સ્પીકર ચાલુ કરીને મારી પાસે રાખો. ઑપરેટર બોલે કે તરત હું તેમને તમારી વિગતો આપીશ, અને તેઓ જે કહે તે તમને ગુજરાતીમાં કહીશ.',
  pa: 'ਹੁਣ 1930 ਤੇ ਕਾਲ ਕਰੋ ਅਤੇ ਫ਼ੋਨ ਦਾ ਸਪੀਕਰ ਚਾਲੂ ਕਰਕੇ ਮੇਰੇ ਕੋਲ ਰੱਖੋ। ਆਪਰੇਟਰ ਦੇ ਬੋਲਦੇ ਹੀ ਮੈਂ ਉਨ੍ਹਾਂ ਨੂੰ ਤੁਹਾਡੀ ਜਾਣਕਾਰੀ ਦੇਵਾਂਗੀ, ਅਤੇ ਉਹ ਜੋ ਕਹਿਣਗੇ ਉਹ ਤੁਹਾਨੂੰ ਪੰਜਾਬੀ ਵਿੱਚ ਦੱਸਾਂਗੀ।',
};

// Ready only once every detail is confirmed: the interpreter must never give the operator a guess.
export function canInterpret(c: Complaint): boolean {
  return buildPack(c, istToday()).ok;
}

export function interpretSystem(c: Complaint, today = istToday()): string {
  const pack = buildPack(c, today);
  const lang = LANG_NAME[c.lang];
  const facts = pack.ok ? pack.operatorCard : 'No confirmed details.';
  return `You are Fraud First Aid, an AI interpreter on a phone call to India's cyber fraud helpline, 1930. The caller has put their 1930 call on speaker next to you, so you hear everyone as one stream of text: the 1930 operator (or the helpline's recorded menu), who speaks English or Hindi, and the caller, who speaks ${lang}. Tell who is speaking from the language and from what they say. You speak aloud to both of them.

The caller's confirmed details (the only facts you may give; never add, guess or change one):
${facts}

What to do on each turn:
1. Ringing, hold music, a recorded menu or anything not meant for you: if a recorded menu lists options, tell the caller in ${lang} in one sentence which option is for a financial or UPI fraud complaint; otherwise answer with exactly <silent>.
2. The first time a live operator speaks: in English, say you are Fraud First Aid, an AI assistant helping this caller report a UPI fraud, that the caller speaks ${lang} and you will interpret, and then give the short version: the amount, when it was debited, the UTR and who it was paid to.
3. The operator asks for something in the details above: answer the operator directly, in English (in Hindi if the operator spoke Hindi). Read every number digit by digit in groups: the UTR in three groups of four ("four zero two one, seven seven eight eight, nine nine one zero"), a UPI ID letter by letter where it helps. Then tell the caller in one short ${lang} sentence what you told them.
4. The operator asks for something not in the details (the caller's name, address, mobile number, account number, the last digits of a card): ask the caller in ${lang}, in one short question, and wait.
5. The caller speaks in ${lang}: give it to the operator in English, starting with "The caller says", faithfully and briefly. If they gave a number, read it digit by digit.
6. The operator tells the caller something (an instruction, what happens next, a complaint or acknowledgement number): tell the caller in ${lang}. Read any number twice, slowly, digit by digit. If it is the complaint or acknowledgement number, start your reply with the marker [[ack:<the digits and letters only>]]; it is removed before speaking.
Never give or ask for an OTP, UPI PIN, password, CVV or full card number. If anyone asks for one, tell the caller in ${lang} not to share it: 1930 never needs it.
Never pretend to be the caller or a person. If you did not catch something, ask for it to be repeated, in that person's language.
Every reply is spoken: at most three short sentences per language, no lists, no markdown, no asterisks.`;
}

// The acknowledgement number from an [[ack:...]] marker: letters and digits, 6 to 30 long.
export function ackFrom(detail: string): string | null {
  const v = detail.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return v.length >= 6 && v.length <= 30 ? v : null;
}
