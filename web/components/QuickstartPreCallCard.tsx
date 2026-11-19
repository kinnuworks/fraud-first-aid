'use client';
// The first screen before a call: the ask, the language, the two ways to start, and a finished
// sample complaint so a judge sees the outcome before talking.
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SampleSlip } from './SampleSlip';
import { Logo } from './design/Logo';
import Image from 'next/image';
import { useDirection } from './design/useDirection';

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
  ['auto', 'Any language (auto)'],
] as const;

// The chosen language rides in ?lang=, which the call start reads.
function LanguageChips({ center = false }: { center?: boolean }) {
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
    <div role="radiogroup" aria-label="Language" id="langs" className={`up-chips${center ? ' justify-center' : ''}`}>
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
            <p className="up-label" style={{ opacity: 0.7 }}>UTR = the 12-digit payment reference. Pakka = for sure.</p>
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
              <a
                className="up-link text-left text-[0.9375rem]"
                href="/demo/full-flow.mp4"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="watch-recording"
              >
                Watch it work: a 4-minute screen recording (sample voices, no audio)
              </a>
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

/* B: the Acctual system. Centred headline, a pill, check row, the complaint slip as the paper on a desk. */
function DirectionB(p: QuickstartPreCallCardProps) {
  return (
    <div className="up-page" style={{ overflowX: 'clip' }}>
      <div className="up-wrap" style={{ maxWidth: 1040 }}>
        <header className="up-header ac-bar">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="up-nav" style={{ color: 'var(--ink-2)' }}>{NAV}</nav>
          </div>
          <a href="tel:1930" className="up-btn" style={{ minHeight: 40, padding: '0 16px' }}>
            Call 1930
          </a>
        </header>
      </div>
      <section className="ac-hero up-wrap">
        <Image src="/design/desk-stamp.png" alt="" width={200} height={200} className="ac-desk" style={{ left: '-14%', top: 120, transform: 'rotate(-12deg)' }} />
        <Image src="/design/desk-phone.png" alt="" width={260} height={260} className="ac-desk" style={{ right: '-16%', top: 40, transform: 'rotate(18deg)' }} />
        <span className="ac-pill">12.64 lakh UPI fraud incidents in FY2024-25</span>
        <h1 className="up-display" style={{ marginTop: 20, marginInline: 'auto', maxWidth: '20ch' }}>
          Lost money to a UPI scam? Tell me what happened.
        </h1>
        <p className="up-lead" style={{ marginTop: 20, marginInline: 'auto', maxWidth: '36rem', color: 'var(--ink-3)' }}>
          {SUB}
        </p>
        <div className="mt-8 flex justify-center">
          <LanguageChips center />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <StartButton {...p} />
          <ListenButton {...p} />
        </div>
        {p.error && <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--bad)' }}>{p.error}</p>}
        <p className="mx-auto mt-6 max-w-[38rem] text-[1rem]" style={{ color: 'var(--ink-2)' }}>
          {WHY}
        </p>
        <div className="ac-checks">
          <span>UTR read back in groups of four</span>
          <span>Screenshot cross-check</span>
          <span>RBI deadline date</span>
        </div>
        <div className="ac-stage">
          <div className="ac-under" style={{ transform: 'rotate(-4deg) translate(-90px, 18px)' }} aria-hidden="true" />
          <div className="ac-under" style={{ transform: 'rotate(3deg) translate(110px, 30px)' }} aria-hidden="true" />
          <Image src="/design/desk-slips.png" alt="" width={240} height={240} className="ac-desk" style={{ left: '-10%', bottom: 0, transform: 'rotate(-8deg)' }} />
          <SampleSlip />
        </div>
      </section>
      <Below />
    </div>
  );
}

// What the guard listens for, from the scam list (lib/complaint/scams.ts).
const SIGNS: Array<[string, string, string, boolean?]> = [
  ['OTP', '8%', '12%', true],
  ['UPI PIN “to receive money”', '4%', '34%'],
  ['KYC expiring tonight', '6%', '58%'],
  ['Scan this QR code', '9%', '80%', true],
  ['Install AnyDesk', '80%', '14%'],
  ['“Digital arrest”', '82%', '38%', true],
  ['SIM will be blocked', '79%', '62%'],
  ['Parcel with drugs', '83%', '84%'],
];

/* D: the Quin system. Ruled column, big centred grotesk, mono caps controls, the slip on a wooden desk. */
function DirectionD(p: QuickstartPreCallCardProps) {
  return (
    <div className="up-page">
      <div className="up-wrap">
        <header className="up-header qn-header">
          <Logo />
          <nav className="qn-nav">{NAV}</nav>
          <a href="tel:1930" className="up-btn up-btn--sm" style={{ background: 'var(--pill-bg)', borderColor: 'var(--pill-bg)', color: 'var(--ink)', fontFamily: 'var(--label-font)', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.8125rem' }}>
            Call 1930
          </a>
        </header>
        <section className="qn-hero">
          <h1 className="up-display" style={{ marginInline: 'auto', maxWidth: '15ch' }}>
            Lost money to a UPI scam? Tell me what happened.
          </h1>
          <p className="up-lead" style={{ marginTop: 22, marginInline: 'auto', maxWidth: '34rem', color: 'var(--ink-3)' }}>
            {SUB} {WHY}
          </p>
          <div className="mt-7 flex justify-center">
            <LanguageChips center />
          </div>
          {p.error && <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--bad)' }}>{p.error}</p>}
        </section>
        <div className="qn-ruled">
          <span className="flex flex-wrap">
            <ListenButton {...p} />
            <StartButton {...p} arrow />
          </span>
        </div>
        <div className="qn-desk">
          {SIGNS.map(([t, x, y, hot]) => (
            <span key={t} className="qn-tag" data-hot={hot ? '' : undefined} style={{ left: x, top: y }}>
              {t}
            </span>
          ))}
          <SampleSlip />
        </div>
      </div>
      <Below />
    </div>
  );
}

/* E: the Paper system. Paper-grey page, two-tone headline, a ruled backdrop, the product in an app window. */
function DirectionE(p: QuickstartPreCallCardProps) {
  return (
    <div className="up-page" style={{ overflowX: 'clip' }}>
      <div className="pp-header">
        <div className="up-wrap">
          <header className="up-header">
            <Logo />
            <nav className="pp-nav">{NAV}</nav>
            <a href="tel:1930" className="text-[1.125rem]">
              Call 1930
            </a>
          </header>
        </div>
      </div>
      <section className="pp-hero up-wrap">
        <div className="pp-backdrop" aria-hidden="true" />
        <h1 className="up-display" style={{ maxWidth: '20ch' }}>
          Lost money to a UPI scam? <span className="pp-grey">Tell me what happened.</span>
        </h1>
        <p className="up-lead" style={{ marginTop: 16, maxWidth: '38rem', color: 'var(--ink-3)' }}>
          {SUB} {WHY}
        </p>
        <div className="mt-6">
          <LanguageChips />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
          <StartButton {...p} />
          <ListenButton {...p} link />
        </div>
        {p.error && <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--bad)' }}>{p.error}</p>}
        <div className="pp-window">
          <div className="pp-tabs">
            <i />
            <i />
            <i />
            <span aria-current="page">Complaint · sample</span>
            <span>Scam guard</span>
            <span>1930 pack</span>
          </div>
          <div className="pp-body">
            <div className="pp-side">
              <span>UTR <b>✓</b></span>
              <span>Amount lost <b>✓</b></span>
              <span>When <b>✓</b></span>
              <span>Money went to <b>✓</b></span>
              <span>Your bank <b>✓</b></span>
              <span>Screenshot <b>✓</b></span>
            </div>
            <div className="p-[clamp(12px,2.4vw,24px)]">
              <SampleSlip />
            </div>
          </div>
        </div>
      </section>
      <Below />
    </div>
  );
}

/* F: the Kitchen.co system. Bold centred headline, one red button, small print, the before-and-after drawings. */
function DirectionF(p: QuickstartPreCallCardProps) {
  return (
    <div className="up-page">
      <div className="up-wrap">
        <header className="up-header kt-header">
          <Logo />
          <nav className="kt-nav">{NAV}</nav>
          <a href="tel:1930" className="up-btn up-btn--sm" style={{ background: 'var(--ink)', borderColor: 'var(--ink)', color: '#fff', fontWeight: 700 }}>
            Call 1930
          </a>
        </header>
        <section className="kt-hero">
          <p className="kt-kicker">Your UPI fraud complaint, spoken.</p>
          <h1 className="up-display" style={{ marginTop: 14, marginInline: 'auto', maxWidth: '19ch' }}>
            Lost money to a UPI scam? Tell me what happened.
          </h1>
          <p className="up-lead" style={{ marginTop: 22, marginInline: 'auto', maxWidth: '40rem', color: 'var(--ink-2)' }}>
            {SUB}
          </p>
          <div className="mt-7 flex justify-center">
            <LanguageChips center />
          </div>
          <div className="mt-7 flex justify-center">
            <StartButton {...p} />
          </div>
          <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--ink-2)' }}>
            Never asks for an OTP, PIN or password.
          </p>
          <div className="mt-5 flex justify-center">
            <ListenButton {...p} link />
          </div>
          {p.error && <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--bad)' }}>{p.error}</p>}
          <p className="mx-auto mt-6 max-w-[40rem] text-[1rem]" style={{ color: 'var(--ink-2)' }}>
            {WHY}
          </p>
          <div className="kt-ways">
            <div>
              <h2>An English web form, while you panic</h2>
              <Image src="/design/way-panic.png" alt="Illustration: a man on the phone, panicking, surrounded by a bank SMS, a long form and a clock" width={1000} height={667} />
            </div>
            <hr />
            <div>
              <h2>Your language, every digit checked</h2>
              <Image src="/design/way-voice.png" alt="Illustration: a man calmly speaking into his phone while a ticked complaint slip comes together" width={1000} height={667} />
            </div>
          </div>
        </section>
      </div>
      <div className="kt-band">
        <div className="up-wrap" style={{ maxWidth: 680 }}>
          <SampleSlip />
        </div>
      </div>
      <Below />
    </div>
  );
}

export function QuickstartPreCallCard(props: QuickstartPreCallCardProps) {
  const d = useDirection();
  if (d === 'b') return <DirectionB {...props} />;
  if (d === 'd') return <DirectionD {...props} />;
  if (d === 'e') return <DirectionE {...props} />;
  if (d === 'f') return <DirectionF {...props} />;
  return <FirstScreen {...props} />;
}
