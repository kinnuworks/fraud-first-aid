'use client';
// The first screen before a call: the ask, the language, the two ways to start, and a finished
// sample complaint so a judge sees the outcome before talking.
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SampleSlip } from './SampleSlip';
import { Logo } from './design/Logo';

const LANGS = [
  ['te', 'తెలుగు'],
  ['hi', 'हिन्दी'],
  ['kn', 'ಕನ್ನಡ'],
  ['ta', 'தமிழ்'],
  ['ml', 'മലയാളം'],
  ['bn', 'বাংলা'],
  ['mr', 'मराठी'],
  ['gu', 'ગુજરાતી'],
  ['pa', 'ਪੰਜਾਬੀ'],
  ['en', 'English'],
] as const;

// The chosen language rides in ?lang=, which the call start reads.
function LanguageChips() {
  const [lang, setLang] = useState('te');
  function pick(code: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', code);
    window.history.replaceState(null, '', url);
    setLang(code);
  }
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q && LANGS.some(([c]) => c === q)) setLang(q);
    else pick('te');
  }, []);
  return (
    <div role="radiogroup" aria-label="Language" id="langs" className="up-chips">
      {LANGS.map(([code, label]) => (
        <button key={code} type="button" role="radio" aria-checked={lang === code} onClick={() => pick(code)} className="up-chip">
          {label}
        </button>
      ))}
    </div>
  );
}

type QuickstartPreCallCardProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: () => void;
};

type Actions = QuickstartPreCallCardProps & { arrow?: boolean };

function StartButton({ isLoading, onStartConversation, arrow }: Actions) {
  return (
    <button
      type="button"
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.delete('mode');
        window.history.replaceState(null, '', url);
        onStartConversation();
      }}
      disabled={isLoading}
      className="up-btn"
      aria-label={isLoading ? 'Starting conversation with AI agent' : 'Start conversation with AI agent'}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting… keep your bank SMS open.
        </>
      ) : (
        <>Start talking{arrow ? ' →' : ''}</>
      )}
    </button>
  );
}

function ListenButton({ isLoading, onStartConversation, link = false }: Actions & { link?: boolean }) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', 'guard');
        window.history.replaceState(null, '', url);
        onStartConversation();
      }}
      className={link ? 'up-link text-left text-[1.0625rem]' : 'up-btn up-btn--ghost'}
      style={link ? { background: 'none', border: 0, cursor: 'pointer', whiteSpace: 'normal' } : { whiteSpace: 'normal' }}
    >
      A scam call is happening? Let UTR Pakka listen
    </button>
  );
}

const SUB = 'Speak your language: ten to choose from. Keep your bank SMS open: it has the 12-digit UTR.';
const WHY = 'Live voice by Agora Conversational AI, with Sarvam speech-to-text and Murf Falcon voices in ten Indian languages.';

const NAV = (
  <>
    <a href="#how">How it works</a>
    <a href="#langs">Languages</a>
    <a href="#sources">Sources</a>
  </>
);

// Numbers on the first screen come from the fact sheet, each with its source on hover and below.
const FACTS: Array<[string, string, string]> = [
  ['UPI fraud incidents, FY2024-25', '12.64 lakh', 'Lok Sabha reply, via IANS, 15 Dec 2025'],
  ['Reported lost to cyber fraud, 2024', '₹22,845.73 crore', 'Lok Sabha reply, 22 Jul 2025'],
  ['Senior citizens lost, 2025', '₹4,005.12 crore', 'Rajya Sabha reply, 5 Aug 2026'],
  ['Held through 1930, till 30 Jun 2026', '₹11,158 crore+', 'Lok Sabha reply, Aug 2026'],
];

function Below() {
  return (
    <>
      <section id="how" className="up-wrap" style={{ paddingTop: 96 }}>
        <h2 className="up-display" style={{ fontSize: 'clamp(2rem, 1.4rem + 1.8vw, 2.75rem)' }}>
          One call: before, during and after the money goes.
        </h2>
        <div className="up-steps3" style={{ marginTop: 40 }}>
          <div className="up-card p-6">
            <span className="up-label">Before</span>
            <h3>Scam guard</h3>
            <p>
              Put the suspicious call on speaker near this device. UTR Pakka stays quiet and speaks up the moment the caller asks
              for an OTP, a PIN, a QR scan, an app install or money.
            </p>
          </div>
          <div className="up-card p-6">
            <span className="up-label">During</span>
            <h3>Complaint</h3>
            <p>
              Say the 12-digit UTR. It reads it back in groups of four, and you fix one group by voice. Add the payment screenshot
              and the numbers are double-checked.
            </p>
          </div>
          <div className="up-card p-6">
            <span className="up-label">After</span>
            <h3>The pack</h3>
            <p>
              What to say on 1930, a letter for your bank with the RBI 3-working-day date, an English summary for the operator, and
              two calendar reminders.
            </p>
          </div>
        </div>
      </section>
      <section id="sources" className="up-wrap" style={{ paddingTop: 72, paddingBottom: 120 }}>
        <h2 className="up-label">Sources for the numbers on this page</h2>
        <ul className="mt-3 space-y-1 text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
          {FACTS.map(([k, v, s]) => (
            <li key={k}>
              {k}: {v}. {s}.
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
          UTR Pakka never asks for an OTP, PIN, password or card number. It does not file on the cybercrime portal for you and it
          cannot recover money.
        </p>
      </section>
    </>
  );
}

/* Condensed caps headline left, the product window right with its step strip (Dayos system). */
function FirstScreen(p: QuickstartPreCallCardProps) {
  return (
    <div className="up-page">
      <div className="up-wrap">
        <header className="up-header" style={{ paddingTop: 8 }}>
          <Logo />
          <nav className="dy-nav">{NAV}</nav>
          <a href="tel:1930" className="up-btn up-btn--ghost" style={{ minHeight: 40, borderColor: 'var(--ink)' }}>
            Call 1930
          </a>
        </header>
        <section className="dy-hero">
          <div>
            <p className="up-label">UTR Pakka · UPI fraud complaint, spoken</p>
            <h1 className="up-display" style={{ marginTop: 20 }}>
              Lost money to a UPI scam? <span className="dy-grey">Tell me what happened.</span>
            </h1>
            <p className="up-lead" style={{ marginTop: 28 }}>
              {SUB}
            </p>
            <div className="dy-rows" style={{ marginTop: 24 }}>
              <div>
                <LanguageChips />
              </div>
              <div>
                <p className="text-[1rem]" style={{ color: 'var(--ink-2)' }}>
                  {WHY}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
              <StartButton {...p} arrow />
              <ListenButton {...p} link />
            </div>
            {p.error && <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--bad)' }}>{p.error}</p>}
          </div>
          <div className="up-window" style={{ background: 'var(--paper)' }}>
            <div className="up-window__bar" style={{ fontFamily: 'var(--label-font)', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink)' }}>
              <span>Complaint · Telugu</span>
              <span>
                <span className="up-dot" aria-hidden="true" />
                Sample data
              </span>
            </div>
            <div className="p-[clamp(12px,2.4vw,24px)]">
              <SampleSlip title={false} />
            </div>
            <div className="dy-steps" aria-label="Steps in this sample">
              <span>Listen</span>
              <span>Warn</span>
              <span>UTR</span>
              <span>Check</span>
              <span>Pack</span>
            </div>
          </div>
        </section>
        <div className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-3">
          <span className="up-label">Built on</span>
          <span className="text-[1.125rem] font-semibold">Agora Conversational AI</span>
          <span className="text-[1.125rem] font-semibold">Sarvam speech-to-text</span>
          <span className="text-[1.125rem] font-semibold">Murf Falcon</span>
        </div>
        <div className="dy-facts" aria-label="Why the first hour matters">
          {FACTS.map(([k, v, src]) => (
            <div key={k} title={src}>
              <span className="up-label">{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      </div>
      <Below />
    </div>
  );
}

export function QuickstartPreCallCard(props: QuickstartPreCallCardProps) {
  return <FirstScreen {...props} />;
}
