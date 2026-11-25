'use client';

import { useEffect, useState } from 'react';

// Where the idea came from, in the builder's own words, in four languages. Sits after the reported cases.
// Opens in the page's ?lang= when it is one of the four, else English.
type Lang = 'en' | 'hi' | 'te' | 'ta';

const STORY: Record<Lang, { tab: string; q: string; body: string; em: string; by: string }> = {
  en: {
    tab: 'English',
    q: 'Where did the idea come from?',
    body:
      "My aunt in Guntur sends me videos about UPI scams and tells me about people she knows who lost money, so that I'd be more careful. Her stories made me wonder who helps those people once the money is gone.",
    em: 'Fraud First Aid is my answer.',
    by: 'Dhiraj Kavuri, who built Fraud First Aid',
  },
  hi: {
    tab: 'हिन्दी',
    q: 'यह आइडिया कहाँ से आया?',
    body:
      'गुंटूर में रहने वाली मेरी आंटी मुझे UPI स्कैम के वीडियो भेजती हैं, और अपनी जान-पहचान के उन लोगों के बारे में बताती हैं जिनके पैसे चले गए, ताकि मैं और सावधान रहूँ। उनकी बातें सुनकर मेरे मन में सवाल आया: पैसा जाने के बाद उन लोगों की मदद कौन करता है?',
    em: 'Fraud First Aid मेरा जवाब है।',
    by: 'धीरज कावुरी, जिन्होंने Fraud First Aid बनाया',
  },
  te: {
    tab: 'తెలుగు',
    q: 'ఈ ఆలోచన ఎక్కడి నుంచి వచ్చింది?',
    body:
      'గుంటూరులో ఉండే మా అత్తయ్య నాకు UPI మోసాల వీడియోలు పంపిస్తుంటారు, తనకు తెలిసినవాళ్లు డబ్బు ఎలా పోగొట్టుకున్నారో చెబుతుంటారు, నేను ఇంకా జాగ్రత్తగా ఉండాలని. ఆ కథలు విన్నాక నాకు ఒక ప్రశ్న వచ్చింది: డబ్బు పోయాక వాళ్లకు ఎవరు సాయం చేస్తారు?',
    em: 'Fraud First Aid నా సమాధానం.',
    by: 'ధీరజ్ కావూరి, Fraud First Aid తయారు చేసినవారు',
  },
  ta: {
    tab: 'தமிழ்',
    q: 'இந்த யோசனை எங்கிருந்து வந்தது?',
    body:
      'குண்டூரில் இருக்கும் என் அத்தை UPI மோசடி வீடியோக்களை எனக்கு அனுப்புவார், பணத்தை இழந்த தனக்குத் தெரிந்தவர்களைப் பற்றியும் சொல்வார், நான் இன்னும் கவனமாக இருக்க வேண்டும் என்பதற்காக. அந்தக் கதைகளைக் கேட்டதும் ஒரு கேள்வி எழுந்தது: பணம் போன பிறகு அவர்களுக்கு யார் உதவுவார்கள்?',
    em: 'Fraud First Aid தான் என் பதில்.',
    by: 'தீரஜ் காவூரி, Fraud First Aid-ஐ உருவாக்கியவர்',
  },
};
const LANGS = Object.keys(STORY) as Lang[];

export function OriginStory() {
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && (LANGS as string[]).includes(q)) setLang(q as Lang);
  }, []);
  const s = STORY[lang];

  return (
    <section className="og up-wrap" aria-labelledby="og-q" data-testid="origin-story">
      <div className="og-card">
        <span className="og-mark og-mark--open" aria-hidden="true">
          &ldquo;
        </span>
        <div className="og-langs" role="group" aria-label="Read this in">
          <svg className="og-langs__icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
          </svg>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              className="og-lang"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
            >
              {STORY[l].tab}
            </button>
          ))}
        </div>
        <div lang={lang} key={lang} className="og-body">
          <p id="og-q" className="og-q">
            {s.q}
          </p>
          <blockquote className="og-quote">
            <p>
              {s.body} <em>{s.em}</em>
            </p>
          </blockquote>
          <p className="og-by">
            <span className="og-rule" aria-hidden="true" />
            {s.by}
          </p>
        </div>
        <span className="og-mark og-mark--close" aria-hidden="true">
          &rdquo;
        </span>
      </div>
    </section>
  );
}
