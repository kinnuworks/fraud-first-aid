// 1930 interpreter: the caller puts their 1930 call on speaker next to Fraud First Aid. It gives the
// operator the confirmed details in English (or Hindi), and tells the caller in their own language
// what the operator asks and says. Facts come only from the confirmed complaint, never from the model.
import type { Complaint } from './session';
import { readbackText, spokenToDigits, type ReadbackLang } from '../entities/numbers';
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
  const k = factsOf(c);
  const spoken = k ? [`UTR: "${k.utr}"`, `Amount: "${k.amount}"`, `When: "${k.when}"`, `Paid to: "${k.payee}"`].join('\n') : '';
  return `You are Fraud First Aid, an AI interpreter on a phone call to India's cyber fraud helpline, 1930. The caller has put their 1930 call on speaker next to you, so you hear everyone as one stream of text: the 1930 operator (or the helpline's recorded menu), who speaks English or Hindi, and the caller, who speaks ${lang}. Tell who is speaking from the language and from what they say. You speak aloud to both of them.

The caller's confirmed details (the only facts you may give; never add, guess or change one):
${facts}
${spoken ? `Spoken forms, to copy word for word whenever you say one of these (never work out a number yourself):
${spoken}
` : ''}
What to do on each turn:
1. Ringing, hold music, a recorded menu or anything not meant for you: if a recorded menu lists options, tell the caller in ${lang} in one sentence which option is for a financial or UPI fraud complaint; otherwise answer with exactly <silent>.
2. The first time a live operator speaks to you (a person, not a recorded menu or hold message), reply with only [[intro]]: your introduction and the case summary are then spoken for you, with every number exact.
2b. Whenever the operator asks for the UTR, transaction ID or reference number, or the amount, reply with only [[utr]]: the UTR and the amount are read out for you. For any other detail in the list, copy its spoken form exactly.
3. The operator asks for something in the details above: answer the operator directly, in English (in Hindi if the operator spoke Hindi). Read every number digit by digit in groups: the UTR in three groups of four ("four zero two one, seven seven eight eight, nine nine one zero"), a UPI ID letter by letter where it helps. Then tell the caller in one short ${lang} sentence what you told them.
4. The operator asks for something not in the details (the caller's name, address, mobile number, account number, the last digits of a card): ask the caller in ${lang}, in one short question, and wait.
5. The caller speaks in ${lang}: give it to the operator in English, starting with "The caller says", faithfully and briefly. If they gave a number, read it digit by digit.
6. The operator tells the caller something (an instruction, what happens next, a complaint or acknowledgement number): tell the caller in ${lang}. Read any number twice, slowly, digit by digit. If it is the complaint or acknowledgement number, reply with only the marker [[ack:<the digits and letters only>]]: the number is then read back to the operator and to the caller for you. If the operator then corrects it, reply with only the marker again, with the corrected number.
Never give or ask for an OTP, UPI PIN, password, CVV or full card number. If anyone asks for one, tell the caller in ${lang} not to share it: 1930 never needs it.
Never pretend to be the caller or a person. If you did not catch something, ask for it to be repeated, in that person's language.
Every reply is spoken: at most three short sentences per language, no lists, no markdown, no asterisks.`;
}

// The acknowledgement number from an [[ack:...]] marker: letters and digits, 6 to 30 long.
export function ackFrom(detail: string): string | null {
  const v = detail.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return v.length >= 6 && v.length <= 30 ? v : null;
}


// --- Numbers are never written by the model: code builds every reply that carries one. ---

const inr = (n: number) => n.toLocaleString('en-IN');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// "2026-11-19T14:30" -> "19 November 2026 at 2:30 pm"
export function spokenWhen(v: string): string {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return v;
  const day = `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  if (!m[4]) return day;
  const h = Number(m[4]);
  return `${day} at ${h % 12 || 12}:${m[5]} ${h < 12 ? 'am' : 'pm'}`;
}
// "ramesh@okaxis" -> "r a m e s h at o k a x i s"
export const spelled = (id: string) =>
  [...id.toLowerCase()].map((ch) => (ch === '@' ? 'at' : ch === '.' ? 'dot' : /\d/.test(ch) ? readbackText(ch, 'en') : ch)).join(' ').replace(/ +/g, ' ');
const spokenCode = (code: string, lang: ReadbackLang) =>
  /^\d+$/.test(code) ? readbackText(code, lang) : [...code].map((ch) => (/\d/.test(ch) ? readbackText(ch, lang) : ch)).join(' ');

type CallerLines = { told: string; gaveUtr: string; ack: (r: string) => string };
export const TO_CALLER: Record<ReadbackLang, CallerLines> = {
  en: { told: "I've told the operator what happened, with your UTR and amount.", gaveUtr: "I've given the operator your UTR and the amount.", ack: (r) => `Your complaint is registered. The acknowledgement number is ${r}. Once more: ${r}. It's saved on your screen.` },
  hi: { told: 'मैंने ऑपरेटर को बता दिया कि क्या हुआ, आपका UTR और रकम भी।', gaveUtr: 'मैंने ऑपरेटर को आपका UTR और रकम बता दी है।', ack: (r) => `आपकी शिकायत दर्ज हो गई है। एक्नॉलेजमेंट नंबर है ${r}। फिर से: ${r}। यह आपकी स्क्रीन पर सेव है।` },
  te: { told: 'ఏం జరిగిందో, మీ UTR, మొత్తం ఆపరేటర్‌కి చెప్పాను.', gaveUtr: 'ఆపరేటర్‌కి మీ UTR, మొత్తం చెప్పాను.', ack: (r) => `మీ ఫిర్యాదు నమోదైంది. అక్నాలెడ్జ్‌మెంట్ నంబర్ ${r}. మళ్ళీ చెబుతాను: ${r}. ఇది మీ స్క్రీన్ మీద సేవ్ అయింది.` },
  kn: { told: 'ಏನಾಯಿತು ಎಂದು, ನಿಮ್ಮ UTR ಮತ್ತು ಮೊತ್ತವನ್ನು ಆಪರೇಟರ್‌ಗೆ ಹೇಳಿದ್ದೇನೆ.', gaveUtr: 'ಆಪರೇಟರ್‌ಗೆ ನಿಮ್ಮ UTR ಮತ್ತು ಮೊತ್ತ ಹೇಳಿದ್ದೇನೆ.', ack: (r) => `ನಿಮ್ಮ ದೂರು ದಾಖಲಾಗಿದೆ. ಅಕ್ನಾಲೆಡ್ಜ್‌ಮೆಂಟ್ ಸಂಖ್ಯೆ ${r}. ಮತ್ತೊಮ್ಮೆ: ${r}. ಇದು ನಿಮ್ಮ ಸ್ಕ್ರೀನ್ ಮೇಲೆ ಉಳಿದಿದೆ.` },
  ta: { told: 'என்ன நடந்தது என்பதையும், உங்கள் UTR மற்றும் தொகையையும் ஆபரேட்டரிடம் சொல்லிவிட்டேன்.', gaveUtr: 'ஆபரேட்டரிடம் உங்கள் UTR மற்றும் தொகையைச் சொல்லிவிட்டேன்.', ack: (r) => `உங்கள் புகார் பதிவாகிவிட்டது. ஒப்புகை எண் ${r}. மீண்டும்: ${r}. இது உங்கள் திரையில் சேமிக்கப்பட்டுள்ளது.` },
  ml: { told: 'എന്താണ് സംഭവിച്ചതെന്നും നിങ്ങളുടെ UTR-ഉം തുകയും ഓപ്പറേറ്ററോട് പറഞ്ഞു.', gaveUtr: 'ഓപ്പറേറ്ററോട് നിങ്ങളുടെ UTR-ഉം തുകയും പറഞ്ഞു.', ack: (r) => `നിങ്ങളുടെ പരാതി രജിസ്റ്റർ ചെയ്തു. അക്നോളജ്മെന്റ് നമ്പർ ${r}. ഒരിക്കൽ കൂടി: ${r}. ഇത് നിങ്ങളുടെ സ്ക്രീനിൽ സേവ് ചെയ്തിട്ടുണ്ട്.` },
  mr: { told: 'काय झालं ते, तुमचा UTR आणि रक्कम मी ऑपरेटरला सांगितली आहे.', gaveUtr: 'मी ऑपरेटरला तुमचा UTR आणि रक्कम सांगितली आहे.', ack: (r) => `तुमची तक्रार नोंदवली गेली आहे. ॲक्नॉलेजमेंट नंबर आहे ${r}. पुन्हा एकदा: ${r}. तो तुमच्या स्क्रीनवर सेव्ह आहे.` },
  bn: { told: 'কী হয়েছে, আপনার UTR আর টাকার পরিমাণ অপারেটরকে জানিয়ে দিয়েছি।', gaveUtr: 'অপারেটরকে আপনার UTR আর টাকার পরিমাণ বলে দিয়েছি।', ack: (r) => `আপনার অভিযোগ নথিভুক্ত হয়েছে। অ্যাকনলেজমেন্ট নম্বর ${r}। আবার বলছি: ${r}। এটা আপনার স্ক্রিনে সেভ করা আছে।` },
  gu: { told: 'શું થયું તે, તમારો UTR અને રકમ મેં ઑપરેટરને કહી દીધાં છે.', gaveUtr: 'મેં ઑપરેટરને તમારો UTR અને રકમ કહી દીધાં છે.', ack: (r) => `તમારી ફરિયાદ નોંધાઈ ગઈ છે. એક્નોલેજમેન્ટ નંબર છે ${r}. ફરી એક વાર: ${r}. તે તમારી સ્ક્રીન પર સેવ છે.` },
  pa: { told: 'ਕੀ ਹੋਇਆ, ਤੁਹਾਡਾ UTR ਅਤੇ ਰਕਮ ਮੈਂ ਆਪਰੇਟਰ ਨੂੰ ਦੱਸ ਦਿੱਤੀ ਹੈ।', gaveUtr: 'ਮੈਂ ਆਪਰੇਟਰ ਨੂੰ ਤੁਹਾਡਾ UTR ਅਤੇ ਰਕਮ ਦੱਸ ਦਿੱਤੀ ਹੈ।', ack: (r) => `ਤੁਹਾਡੀ ਸ਼ਿਕਾਇਤ ਦਰਜ ਹੋ ਗਈ ਹੈ। ਐਕਨੌਲੇਜਮੈਂਟ ਨੰਬਰ ਹੈ ${r}। ਇੱਕ ਵਾਰ ਫਿਰ: ${r}। ਇਹ ਤੁਹਾਡੀ ਸਕ੍ਰੀਨ ਤੇ ਸੇਵ ਹੈ।` },
};

function factsOf(c: Complaint) {
  const f = c.fields;
  if (!f.utr || !f.amount || !f.when || !f.payee) return null;
  const payee = /^\d{10}$/.test(f.payee.value) ? `mobile number ${readbackText(f.payee.value, 'en')}` : spelled(f.payee.value);
  return {
    utr: `The UTR is ${readbackText(f.utr.value, 'en')}.`,
    amount: `The amount is Rs ${inr(f.amount.value)}.`,
    when: spokenWhen(f.when.value),
    payee,
  };
}

// What the interpreter says when the model marks the moment: [[intro]] when the live operator first
// speaks, [[utr]] when they ask for the UTR or the amount. The model decides who is speaking and
// when; code says every number.
export function interpretLine(c: Complaint, kind: 'intro' | 'utr'): string | null {
  if (c.phase !== 'interpret' || !canInterpret(c)) return null;
  const k = factsOf(c);
  if (!k) return null;
  const toCaller = (line: string) => (c.lang === 'en' ? '' : ` ${line}`);
  if (kind === 'intro') {
    c.interpIntro = true;
    return `Hello, I'm Fraud First Aid, an AI assistant helping this caller report a UPI fraud. The caller speaks ${LANG_NAME[c.lang]}, and I'll interpret. Rs ${inr(c.fields.amount!.value)} was debited on ${k.when}, paid to ${k.payee}. ${k.utr}${toCaller(TO_CALLER[c.lang].told)}`;
  }
  return `${k.utr} ${k.amount}${toCaller(TO_CALLER[c.lang].gaveUtr)}`;
}

// Runs of digits in what was heard ("1930" and "three one two one ..." are two runs).
function digitRuns(text: string): string[] {
  const runs: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    const d = spokenToDigits(w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
    if (d) cur += d;
    else if (cur) { runs.push(cur); cur = ''; }
  }
  if (cur) runs.push(cur);
  return runs;
}

// The acknowledgement number: the one the model marked, when the operator's own words hold it (in
// this turn, or across this and the turn before, when a pause between groups ended the first);
// otherwise the longest run of digits they said in this turn (6 to 30 long). Read back by code.
export function ackLine(c: Complaint, markerDetail: string, lastUser: string, recent = lastUser): { ack: string; say: string } | null {
  const marked = ackFrom(markerDetail);
  const runs = digitRuns(lastUser);
  const heardAll = `${runs.join('')} ${digitRuns(recent).join('')}`;
  const ack = marked && /^\d+$/.test(marked) && heardAll.includes(marked)
    ? marked
    : runs.filter((r) => r.length >= 6 && r.length <= 30).sort((a, b) => b.length - a.length)[0] ?? marked;
  if (!ack) return null;
  // The operator confirmed the number already read back (no digits in their turn): thank them once.
  // A second full read-back took half a minute on the live call (21 Nov). Digits said again are
  // read back, so a repeated mishearing is still heard.
  if (ack === c.ack1930 && runs.length === 0) return { ack, say: 'Thank you, I have saved that number.' };
  // read back to the operator first, as every number is: a misheard digit gets corrected on the call
  // (the model marks the corrected number again and this runs once more)
  const toOperator = `Let me read that back: ${spokenCode(ack, 'en')}. Please tell me if any digit is wrong.`;
  return { ack, say: `${toOperator} ${TO_CALLER[c.lang].ack(spokenCode(ack, c.lang))}` };
}
