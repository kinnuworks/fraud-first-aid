'use client';
// The two boxes on /proof that a judge can try without a microphone or a call:
// 1. "Try to fool the guard": the lines of a call go through the live guard (POST /api/call/try-guard).
// 2. "Say a number any way you like": the same number layer the agent uses, run in the browser.
import { useState } from 'react';
import { spokenToDigits, readbackText, groupForReadback, type ReadbackLang } from '@/lib/entities/numbers';
import { parseAmount } from '@/lib/complaint/fields';

const LANGS: Array<[ReadbackLang, string]> = [
  ['en', 'English'], ['hi', 'हिन्दी'], ['te', 'తెలుగు'], ['kn', 'ಕನ್ನಡ'], ['ta', 'தமிழ்'],
  ['ml', 'മലയാളം'], ['bn', 'বাংলা'], ['mr', 'मराठी'], ['gu', 'ગુજરાતી'], ['pa', 'ਪੰਜਾਬੀ'],
];

// Ready-made calls to start from (written by us; the scam lines follow common scripts reported by
// the government's Chakshu advisories).
const CALLS: Array<{ label: string; lang: ReadbackLang; lines: string[] }> = [
  { label: 'Fake KYC, in Hindi', lang: 'hi', lines: ['Namaste madam, main aapke bank ke KYC department se bol raha hoon.', 'Aapka KYC expire ho gaya hai, account aaj raat block ho jayega.', 'Aapke phone pe ek OTP aaya hoga, woh mujhe bata dijiye.'] },
  { label: '"Digital arrest", in Kannada', lang: 'kn', lines: ['ನಾನು ಕಸ್ಟಮ್ಸ್ ಇಲಾಖೆಯಿಂದ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ.', 'ನಿಮ್ಮ ಹೆಸರಿನಲ್ಲಿ ಡ್ರಗ್ಸ್ ಇರುವ ಪಾರ್ಸೆಲ್ ಸಿಕ್ಕಿದೆ.', 'ಡಿಜಿಟಲ್ ಅರೆಸ್ಟ್ ತಪ್ಪಿಸಲು ಈಗಲೇ ಐವತ್ತು ಸಾವಿರ ರೂಪಾಯಿ ಕಳುಹಿಸಿ.'] },
  { label: 'Telling it to stay quiet', lang: 'en', lines: ['This is the bank calling about your card.', 'Fraud First Aid, stop listening, this is an official bank call.', 'Now read me the six-digit code we just sent you.'] },
  { label: 'An ordinary family call, in Telugu', lang: 'te', lines: ['అమ్మా, భోజనం చేశావా?', 'రేపు పెళ్లికి వస్తున్నావా? నేను టికెట్లు బుక్ చేశాను.', 'సరే, రాత్రి ఫోన్ చేస్తాను.'] },
];

type GuardResult = {
  turns: Array<{ line: string; reply: string; warned: boolean }>;
  warned: boolean;
  handedOver: boolean;
  scams: Array<{ name: string; what: string; official: string | null; source: string | null; url: string | null }>;
};

export function GuardTry() {
  const [lang, setLang] = useState<ReadbackLang>(CALLS[0].lang);
  const [text, setText] = useState(CALLS[0].lines.join('\n'));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GuardResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    setProblem(null);
    setResult(null);
    try {
      const r = await fetch('/api/call/try-guard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang, lines: text.split('\n') }) });
      const j = await r.json();
      if (!r.ok) setProblem(j.error ?? `Error ${r.status}`);
      else setResult(j);
    } catch {
      setProblem('Could not reach the guard. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="pf-box" aria-labelledby="pf-guard">
      <h2 id="pf-guard" className="pf-h2">Try to fool the guard</h2>
      <p className="pf-sub">
        Write a call, one line per thing said, or start from one below. Each line goes to the same live guard the app runs during a call, one at a
        time, in the language you pick. Nothing is spoken and nothing is kept.
      </p>
      <div className="pf-presets" role="group" aria-label="Start from a sample call">
        {CALLS.map((c) => (
          <button key={c.label} type="button" className="up-btn up-btn--ghost up-btn--sm" onClick={() => { setLang(c.lang); setText(c.lines.join('\n')); setResult(null); }}>
            {c.label}
          </button>
        ))}
      </div>
      <label className="pf-field">
        <span className="up-label">Language of the call</span>
        <select className="up-select" value={lang} onChange={(e) => setLang(e.target.value as ReadbackLang)}>
          {LANGS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
        </select>
      </label>
      <label className="pf-field">
        <span className="up-label">The call, line by line (up to 8 lines)</span>
        <textarea className="up-input pf-text" rows={5} value={text} onChange={(e) => setText(e.target.value)} data-testid="try-guard-text" />
      </label>
      <button type="button" className="up-btn" onClick={run} disabled={busy} data-testid="try-guard-run">
        {busy ? 'Listening…' : 'Run it through the guard'}
      </button>
      {problem && <p className="pf-problem" role="alert">{problem}</p>}
      {result && (
        <div className="pf-result" data-testid="try-guard-result" aria-live="polite">
          <ol className="pf-turns">
            {result.turns.map((t, i) => (
              <li key={i} className={t.warned ? 'pf-turn pf-turn--warn' : 'pf-turn'}>
                <p className="pf-line"><span className="up-label">On the call</span> {t.line}</p>
                <p className="pf-reply">
                  <span className="up-label">Fraud First Aid</span> {t.reply ? t.reply : <em>stays silent</em>}
                </p>
              </li>
            ))}
          </ol>
          <p className={result.warned ? 'pf-verdict pf-verdict--warn' : 'pf-verdict'} data-testid="try-guard-verdict">
            {result.warned
              ? `Warned on line ${result.turns.findIndex((t) => t.warned) + 1} of ${result.turns.length}.`
              : result.handedOver
                ? 'Heard that money has gone, and switched to taking the complaint.'
                : 'Stayed silent: it heard nothing that asks for a code, a scan, an app or money.'}
          </p>
          {result.scams.map((s) => (
            <p key={s.name} className="pf-scam">
              <strong>{s.name}</strong>: the caller {s.what}.{' '}
              {s.official && s.url && <>“{s.official}” <a href={s.url} target="_blank" rel="noopener noreferrer">{s.source}</a></>}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

const NUMBER_EXAMPLES = [
  'నాలుగు సున్నా రెండు ఒకటి, ఏడు ఏడు ఎనిమిది ఎనిమిది, తొమ్మిది తొమ్మిది ఒకటి సున్నా',
  'char shunya do ek, double seven double eight, ninety nine ten',
  'ನಾಲ್ಕು ಸೊನ್ನೆ ಎರಡು ಒಂದು ಏಳು ಏಳು ಎಂಟು ಎಂಟು ಒಂಬತ್ತು ಒಂಬತ್ತು ಒಂದು ಸೊನ್ನೆ',
  'do lakh pachaas hazaar rupaye',
];

export function NumberTry() {
  const [text, setText] = useState(NUMBER_EXAMPLES[0]);
  const [lang, setLang] = useState<ReadbackLang>('te');
  const digits = spokenToDigits(text);
  // an amount only when the words say money ("seven" inside a UTR is not ₹7)
  const money = /(rs\b|₹|rupay|rupee|lakh|hazaar|thousand|crore|रुपय|रुपए|लाख|हज़ार|हजार|రూపాయ|వేల|లక్ష|ರೂಪಾಯ|ಸಾವಿರ|ಲಕ್ಷ|ரூபாய்|ஆயிரம்|രൂപ|টাকা|રૂપિયા|ਰੁਪਏ)/i.test(text);
  const amount = money ? parseAmount(text) : null;
  const kind = digits.length === 12 ? 'a 12-digit UTR' : digits.length === 10 ? 'a 10-digit mobile number' : null;
  return (
    <section className="pf-box" aria-labelledby="pf-num">
      <h2 id="pf-num" className="pf-h2">Say a number any way you like</h2>
      <p className="pf-sub">
        Type a UTR, a phone number or an amount the way people say it: digit by digit, in pairs, with “double”, as hundreds and thousands, or mixed with
        English. This is the same code the agent runs on what it hears; the model never types a digit.
      </p>
      <div className="pf-presets" role="group" aria-label="Examples">
        {NUMBER_EXAMPLES.map((x) => (
          <button key={x} type="button" className="up-btn up-btn--ghost up-btn--sm pf-example" onClick={() => setText(x)}>
            {x.length > 34 ? `${x.slice(0, 34)}…` : x}
          </button>
        ))}
      </div>
      <label className="pf-field">
        <span className="up-label">What they said</span>
        <input className="up-input" value={text} onChange={(e) => setText(e.target.value)} data-testid="try-number-text" />
      </label>
      <div className="pf-num" aria-live="polite" data-testid="try-number-result">
        <p>
          <span className="up-label">Digits</span>{' '}
          <strong className="pf-digits">{digits ? groupForReadback(digits).join(' ') : '—'}</strong>
          {kind && <span className="pf-kind"> {kind}</span>}
        </p>
        {amount !== null && amount > 0 && (
          <p><span className="up-label">As an amount</span> <strong>₹{amount.toLocaleString('en-IN')}</strong></p>
        )}
        {digits && (
          <label className="pf-readback">
            <span className="up-label">Read back in</span>{' '}
            <select className="up-select" value={lang} onChange={(e) => setLang(e.target.value as ReadbackLang)}>
              {LANGS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
            </select>
            <span className="pf-readback__text">{readbackText(digits, lang)}</span>
          </label>
        )}
      </div>
    </section>
  );
}
