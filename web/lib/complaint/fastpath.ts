// Fast path for the complaint in Telugu, Hindi, Kannada and English: a spoken 12-digit UTR is
// recorded and read back at once, and a plain "yes" confirms what was just read back and asks the
// next question, without waiting for the model. Everything else (no, corrections, the story,
// other languages) goes to the model.
import { spokenToDigits, readbackText, type ReadbackLang } from '../entities/numbers';
import { isUtr } from './fields';
import { REQUIRED, recordNumber, confirmField, deadlines, type Complaint, type FieldName } from './session';
import { istToday } from './today';

type Lang = 'te' | 'hi' | 'kn' | 'en';
const FAST: Lang[] = ['te', 'hi', 'kn', 'en'];

const P: Record<Lang, { heard: string; isRight: string; thanks: string; rupees: string; ask: Record<Exclude<FieldName, 'utr'>, string> & { utr: string }; done: (date: string) => string }> = {
  en: {
    heard: 'I heard', isRight: 'Is that right?', thanks: 'Thank you.', rupees: 'rupees',
    ask: { utr: 'Please say the 12-digit UTR from your bank SMS, one digit at a time.', amount: 'How much money left your account?', when: 'When did the money leave your account? A rough time is fine.', payee: 'Who was it paid to? Say the UPI ID or the phone number.', victim_bank: 'Which is your bank?' },
    done: (d) => `Your complaint is ready on the screen. Call 1930 now and read out the script. Tell your bank by ${d}. You can also add two reminders to your calendar.`,
  },
  hi: {
    heard: 'मैंने सुना:', isRight: 'क्या यह सही है?', thanks: 'धन्यवाद।', rupees: 'रुपये',
    ask: { utr: 'बैंक के SMS से 12 अंकों का UTR नंबर एक-एक अंक करके बताइए।', amount: 'आपके खाते से कितने पैसे गए?', when: 'पैसे कब कटे? अंदाज़े से समय बता दीजिए।', payee: 'पैसे किसको गए? UPI ID या फ़ोन नंबर बताइए।', victim_bank: 'आपका बैंक कौन सा है?' },
    done: (d) => `आपकी शिकायत स्क्रीन पर तैयार है। अभी 1930 पर कॉल करके यह पढ़ दीजिए। अपने बैंक को ${d} तक बता दीजिए। आप कैलेंडर में दो रिमाइंडर भी जोड़ सकते हैं।`,
  },
  te: {
    heard: 'నేను విన్నది:', isRight: 'ఇది సరైనదేనా?', thanks: 'ధన్యవాదాలు.', rupees: 'రూపాయలు',
    ask: { utr: 'బ్యాంక్ SMS లోని 12 అంకెల UTR నంబర్‌ను ఒక్కొక్క అంకెగా చెప్పండి.', amount: 'మీ ఖాతా నుంచి ఎంత డబ్బు పోయింది?', when: 'డబ్బు ఎప్పుడు కట్ అయింది? సుమారు సమయం చెప్పినా చాలు.', payee: 'డబ్బు ఎవరికి వెళ్ళింది? UPI ID లేదా ఫోన్ నంబర్ చెప్పండి.', victim_bank: 'మీ బ్యాంక్ ఏది?' },
    done: (d) => `మీ ఫిర్యాదు స్క్రీన్ మీద సిద్ధంగా ఉంది. ఇప్పుడే 1930 కి కాల్ చేసి ఇది చదవండి. మీ బ్యాంక్‌కి ${d} లోపు చెప్పండి. క్యాలెండర్‌లో రెండు రిమైండర్లు కూడా జోడించుకోవచ్చు.`,
  },
  kn: {
    heard: 'ನಾನು ಕೇಳಿದ್ದು:', isRight: 'ಇದು ಸರಿಯೇ?', thanks: 'ಧನ್ಯವಾದಗಳು.', rupees: 'ರೂಪಾಯಿ',
    ask: { utr: 'ಬ್ಯಾಂಕ್ SMS ನಲ್ಲಿರುವ 12 ಅಂಕಿಯ UTR ಸಂಖ್ಯೆಯನ್ನು ಒಂದೊಂದೇ ಅಂಕಿಯಾಗಿ ಹೇಳಿ.', amount: 'ನಿಮ್ಮ ಖಾತೆಯಿಂದ ಎಷ್ಟು ಹಣ ಹೋಯಿತು?', when: 'ಹಣ ಯಾವಾಗ ಕಡಿತವಾಯಿತು? ಅಂದಾಜು ಸಮಯ ಹೇಳಿದರೂ ಸಾಕು.', payee: 'ಹಣ ಯಾರಿಗೆ ಹೋಯಿತು? UPI ID ಅಥವಾ ಫೋನ್ ನಂಬರ್ ಹೇಳಿ.', victim_bank: 'ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಯಾವುದು?' },
    done: (d) => `ನಿಮ್ಮ ದೂರು ಪರದೆಯ ಮೇಲೆ ಸಿದ್ಧವಾಗಿದೆ. ಈಗಲೇ 1930ಗೆ ಕರೆ ಮಾಡಿ ಇದನ್ನು ಓದಿ. ನಿಮ್ಮ ಬ್ಯಾಂಕ್‌ಗೆ ${d} ಒಳಗೆ ತಿಳಿಸಿ. ಕ್ಯಾಲೆಂಡರ್‌ಗೆ ಎರಡು ಜ್ಞಾಪನೆಗಳನ್ನೂ ಸೇರಿಸಬಹುದು.`,
  },
};

const YES = /^(yes|yeah|yep|correct|right|that'?s right|ha+n?|haan ji|ji haan|sahi|sahi hai|हाँ|हां|जी|सही|ठीक|అవును|ఔను|సరే|సరిగ్గా|కరెక్ట్|ಹೌದು|ಸರಿ)/i;
const NO = /\b(no|not|wrong|nahi)\b|नहीं|गलत|ग़लत|లేదు|కాదు|తప్పు|ಇಲ್ಲ|ತಪ್ಪು/i;

function say(c: Complaint, f: FieldName, lang: Lang): string {
  const v = c.fields[f]!.value;
  const shown =
    f === 'utr' ? readbackText(String(v), c.lang as ReadbackLang)
    : f === 'amount' ? `${Number(v).toLocaleString('en-IN')} ${P[lang].rupees}`
    : f === 'when' ? String(v).replace('T', ', ')
    : String(v);
  c.pending = f;
  return `${P[lang].heard} ${shown}. ${P[lang].isRight}`;
}

function next(c: Complaint, lang: Lang, today: string): string {
  for (const f of REQUIRED) {
    const have = c.fields[f];
    if (!have) {
      c.pending = undefined;
      return P[lang].ask[f];
    }
    if (!have.confirmed) return say(c, f, lang);
  }
  c.pending = undefined;
  return P[lang].done(deadlines(today).zeroLiabilityBy);
}

export function complaintShortcut(c: Complaint, lastUser: string, today = istToday()): string | null {
  if (c.phase !== 'complaint' || !FAST.includes(c.lang as Lang)) return null;
  const lang = c.lang as Lang;
  const t = lastUser.trim().replace(/^[\s,.!।]+/, '');
  // A clean yes to what was just read back.
  if (c.pending && YES.test(t) && !NO.test(t) && t.length <= 40) {
    confirmField(c, c.pending);
    return `${P[lang].thanks} ${next(c, lang, today)}`;
  }
  // A spoken UTR while we still need one.
  if (!NO.test(t) && isUtr(spokenToDigits(t)) && !c.fields.utr?.confirmed) {
    recordNumber(c, 'utr', t);
    return say(c, 'utr', lang);
  }
  return null;
}
