'use client';
// The first screen's controls, shared by every hero layout: the language, the slow voice, the two
// ways to start, the read-back on the sample card and the sample scam call shown on the hero.
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export const LANGS = [
  ['en', 'English'],
  ['kn', 'ಕನ್ನಡ'],
  ['hi', 'हिन्दी'],
  ['te', 'తెలుగు'],
  ['ta', 'தமிழ்'],
  ['ml', 'മലയാളം'],
  ['bn', 'বাংলা'],
  ['mr', 'मराठी'],
  ['gu', 'ગુજરાતી'],
  ['pa', 'ਪੰਜਾਬੀ'],
  ['auto', 'Any language (auto)'],
] as const;

// The chosen language rides in ?lang=, which the call start reads.
export function LanguageChips({ className = 'up-langpick' }: { className?: string }) {
  const [lang, setLang] = useState('en');
  function pick(code: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', code);
    window.history.replaceState(null, '', url);
    setLang(code);
  }
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && LANGS.some(([c]) => c === q)) setLang(q);
    else pick('en');
  }, []);
  return (
    <label className={className} id="langs">
      <span className="up-label">Language</span>
      <select value={lang} onChange={(e) => pick(e.target.value)} className="up-select" aria-label="Language">
        {LANGS.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

// "Speak slowly": a slower voice for older callers (?slow=1, read by the call start) and larger text.
export function SlowToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('slow') === '1';
    setOn(q);
    if (q) document.documentElement.dataset.large = '';
  }, []);
  function toggle() {
    const next = !on;
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('slow', '1');
    else url.searchParams.delete('slow');
    window.history.replaceState(null, '', url);
    if (next) document.documentElement.dataset.large = '';
    else delete document.documentElement.dataset.large;
    setOn(next);
  }
  return (
    <button type="button" role="switch" aria-checked={on} onClick={toggle} className="up-switch" data-testid="slow-toggle">
      <span className="up-switch__track" aria-hidden="true" />
      Speak slowly, bigger text
    </button>
  );
}

// The sample card plays the read-back: each group of four is said back, then all three are confirmed.
export function ReadBack() {
  const groups = ['4021', '7788', '9910'];
  const [step, setStep] = useState(4);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let t: ReturnType<typeof setTimeout>;
    const seq = [0, 1, 2, 3, 4];
    const wait = [700, 900, 900, 900, 3600];
    let i = 0;
    const run = () => {
      setStep(seq[i]);
      t = setTimeout(() => {
        i = (i + 1) % seq.length;
        run();
      }, wait[i]);
    };
    t = setTimeout(run, 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <div className="mt-2">
        <span className="up-utr" aria-label="4021 7788 9910">
          {groups.map((g, i) => (
            <span key={g} className="up-utr__g" data-state={step === 4 ? 'ok' : i < step ? 'pending' : 'empty'}>
              {g}
            </span>
          ))}
        </span>
      </div>
      <p className="mt-2 rc-reading" aria-hidden={step === 4}>
        {step === 4 ? (
          <>
            <span className="up-tick" style={{ marginLeft: 0 }}>✓ confirmed</span>
            <span className="up-tick">(screenshot ✓)</span>
          </>
        ) : (
          'Reading back in groups of four…'
        )}
      </p>
    </>
  );
}

export type StartProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
};

type Actions = StartProps & { arrow?: boolean; className?: string };

export function StartButton({ isLoading, onStartConversation, arrow, className = 'up-btn' }: Actions) {
  return (
    <button
      type="button"
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('mode');
        url.searchParams.delete('watch');
        window.history.replaceState(null, '', url);
        onStartConversation();
      }}
      disabled={isLoading}
      className={className}
      aria-label={isLoading ? 'Starting conversation with AI agent' : 'Start conversation with AI agent'}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting… keep your bank SMS open.
        </>
      ) : (
        <>Lost money? Report it by voice{arrow ? ' →' : ''}</>
      )}
    </button>
  );
}

// One click from the first screen: a guarded call with no microphone, and the labelled sample scam
// call plays by itself, so a judge sees the silent listening and the warning in about 30 seconds.
export function WatchButton({ isLoading, onStartConversation, className = 'up-btn up-btn--bad' }: Actions) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', 'guard');
        url.searchParams.set('watch', '1');
        // the sample caller speaks Hindi: warn in Hindi unless the visitor picked a language
        if ((url.searchParams.get('lang') ?? 'en') === 'en') url.searchParams.set('lang', 'hi');
        window.history.replaceState(null, '', url);
        onStartConversation();
      }}
      className={className}
      data-testid="watch-scam"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting the sample call…
        </>
      ) : (
        <>
          <svg className="hc-play" aria-hidden="true" viewBox="0 0 12 14" width="12" height="14" fill="currentColor">
            <path d="M1 1.2v11.6c0 .8.9 1.3 1.6.8l9-5.8a1 1 0 0 0 0-1.6l-9-5.8C1.9-.1 1 .4 1 1.2Z" />
          </svg>
          Watch it catch a scam call
        </>
      )}
    </button>
  );
}

// One click: the labelled sample caller (Telugu) reports a fraud in a live complaint call; the sample
// payment screenshot is added by itself after the UTR. No microphone.
export function WatchComplaintButton({ isLoading, onStartConversation, className }: Actions) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', 'democomplaint');
        url.searchParams.set('watch', '1');
        url.searchParams.set('lang', 'te');
        window.history.replaceState(null, '', url);
        onStartConversation();
      }}
      className={className ?? 'up-link text-left text-[1.0625rem]'}
      style={{ background: 'none', border: 0, cursor: 'pointer', whiteSpace: 'normal' }}
      data-testid="watch-complaint"
    >
      Watch it take a complaint, with sample voices
    </button>
  );
}

// One click: a labelled sample complaint, already confirmed, and the 1930 interpreter calling a sample
// 1930 operator for you (sample voices, no microphone). The pack and the 1930 call on one screen.
export function Watch1930Button({ isLoading, onStartConversation, className }: Actions) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', 'demo1930');
        url.searchParams.set('watch', '1');
        // the sample caller answers in Telugu
        url.searchParams.set('lang', 'te');
        window.history.replaceState(null, '', url);
        onStartConversation();
      }}
      className={className ?? 'up-link text-left text-[1.0625rem]'}
      style={{ background: 'none', border: 0, cursor: 'pointer', whiteSpace: 'normal' }}
      data-testid="watch-1930"
    >
      Watch it call 1930 for you, with sample voices
    </button>
  );
}

export function ListenButton({ isLoading, onStartConversation, link = false, className }: Actions & { link?: boolean }) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', 'guard');
        url.searchParams.delete('watch');
        window.history.replaceState(null, '', url);
        onStartConversation();
      }}
      className={className ?? (link ? 'up-link text-left text-[1.0625rem]' : 'up-btn up-btn--ghost')}
      style={link ? { background: 'none', border: 0, cursor: 'pointer', whiteSpace: 'normal' } : { whiteSpace: 'normal' }}
    >
      Real scam call on now? Put it on speaker and let it listen
    </button>
  );
}

// The sample scam call the hero shows: silent through the pitch, then the warning in the caller's
// language. Labelled as a sample wherever it appears.
export function GuardSample({ tag = true }: { tag?: boolean }) {
  return (
    <div className="rc-body rc-guard">
      <p className="rc-guard__head">
        <span className="rc-guard__dot" aria-hidden="true" /> Listening on speaker
        {tag && <span className="up-sample-tag rc-guard__tag">Sample</span>}
      </p>
      <p className="rc-bubble">
        <span className="rc-bubble__who">Caller</span>
        Madam, your KYC expires tonight. Your account will be blocked.
      </p>
      <p className="rc-bubble rc-bubble--flag">
        <span className="rc-bubble__who">
          Caller <span className="rc-flagtag">red flag</span>
        </span>
        An OTP has come on your phone. Tell it to me now.
      </p>
      <p className="rc-bubble rc-bubble--agent">
        <span className="rc-bubble__who">It warns you, in your language</span>
        यह धोखाधड़ी वाली कॉल है। अभी फ़ोन काट दीजिए।
        <span className="rc-bubble__en">This is a scam call. Hang up now.</span>
      </p>
      <p className="rc-warn">Scam warning: fake KYC update</p>
    </div>
  );
}
