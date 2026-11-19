'use client';
// The first screen before a call: the ask, the language, the two ways to start, and a finished
// sample complaint so a judge sees the outcome before talking.
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SampleSlip } from './SampleSlip';
import { PhoneCallStart } from './PhoneCallStart';
import { UtrGroups, when } from './ComplaintCard';
import { STATES } from './StatePreview';
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

// Two more ways in, under the start controls: a recording of the whole flow, and a call to the caller's phone.
function MoreWays({ center = false }: { center?: boolean }) {
  return (
    <div className={`mt-5 flex flex-col gap-3 ${center ? 'items-center' : 'items-start'}`}>
      <PhoneCallStart />
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
  );
}

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
            </div>
            <MoreWays />
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
        <MoreWays center />
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

/* G: the Fold system. Corner pills, a pile of everyday things from the moment, a big navy headline,
   the start card with a QR to open it on a phone, and the complaint coming up out of a phone outline. */
function DirectionG(p: QuickstartPreCallCardProps) {
  return (
    <div className="up-page" style={{ overflowX: 'clip' }}>
      <section className="fd-hero up-wrap" style={{ maxWidth: 1440 }}>
        <div className="fd-corner" style={{ left: 20, alignItems: 'flex-start' }}>
          <Logo />
          <a href="tel:1930" className="fd-pill">Call 1930</a>
          <a href="#langs" className="fd-pill">Ten languages</a>
        </div>
        <div className="fd-corner" style={{ right: 20, alignItems: 'flex-end' }}>
          <a href="#how" className="fd-pill">How it works</a>
          <a href="#sources" className="fd-pill">Sources</a>
        </div>
        <Image src="/design/pile.png" alt="Illustration: a keypad phone, a bank SMS, rupee notes, a QR stand, a glass of chai, a rubber stamp and a carbon receipt book" width={1100} height={733} className="fd-pile" priority />
        <h1 className="up-display" style={{ marginInline: 'auto', maxWidth: '15ch' }}>
          Lost money to a UPI scam? Tell me what happened.
        </h1>
        <p className="up-lead" style={{ marginTop: 24, marginInline: 'auto', maxWidth: '38rem' }}>
          {SUB} {WHY}
        </p>
        <div className="fd-start">
          <div className="flex max-w-[34rem] flex-col gap-4">
            <LanguageChips />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <StartButton {...p} />
              <ListenButton {...p} link />
            </div>
            <MoreWays />
          </div>
          <div className="fd-qr">
            <Image src="/design/qr-live.svg" alt="QR code to open UTR Pakka on your phone" width={84} height={84} unoptimized />
            <span>
              Scan to try it
              <br />
              on your phone
            </span>
          </div>
        </div>
        {p.error && <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--bad)' }}>{p.error}</p>}
        <div className="fd-phone">
          <SampleSlip />
        </div>
      </section>
      <Below />
    </div>
  );
}

// A rubber stamp, inked on: the moment a UTR is read back and confirmed.
function PakkaStamp({ date }: { date: string }) {
  return (
    <svg className="tk-stamp" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <filter id="ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.35" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" result="c" />
          <feDisplacementMap in="c" in2="n" scale="2.2" />
        </filter>
        <path id="ring" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0" />
      </defs>
      <g filter="url(#ink)" fill="none" stroke="var(--stamp)" style={{ color: 'var(--stamp)' }}>
        <circle cx="100" cy="100" r="92" strokeWidth="5" />
        <circle cx="100" cy="100" r="82" strokeWidth="2" />
        <text fontFamily="var(--font-anek-latin), sans-serif" fontSize="15" fontWeight="700" letterSpacing="3" fill="var(--stamp)" stroke="none">
          <textPath href="#ring" startOffset="2%">UTR READ BACK · EVERY DIGIT CHECKED ·</textPath>
        </text>
        <rect x="34" y="78" width="132" height="44" strokeWidth="3" />
        <text x="100" y="111" textAnchor="middle" fontFamily="var(--font-anek-latin), sans-serif" fontSize="34" fontWeight="800" letterSpacing="2" fill="var(--stamp)" stroke="none">
          PAKKA
        </text>
        <text x="100" y="146" textAnchor="middle" fontFamily="var(--font-plex-mono), monospace" fontSize="13" fontWeight="600" fill="var(--stamp)" stroke="none">
          {date}
        </text>
      </g>
    </svg>
  );
}

/* H: the Acctual system in UPI's saffron and green. The complaint is a ticket-style slip with
   bilingual labels and a PAKKA stamp; the desk objects stay. */
function DirectionH(p: QuickstartPreCallCardProps) {
  return (
    <div className="up-page" style={{ overflowX: 'clip' }}>
      <div className="tk-tricolour" aria-hidden="true" />
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
        <MoreWays center />
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
          <Image src="/design/desk-slips.png" alt="" width={240} height={240} className="ac-desk" style={{ left: '-10%', bottom: 0, transform: 'rotate(-8deg)' }} />
          <div className="tk-ticket">
            <div className="tk-head">
              <b>Complaint slip</b>
              <span className="up-script">ఫిర్యాదు · शिकायत · ದೂರು</span>
              <span className="up-sample-tag">Sample</span>
            </div>
            <SampleSlip title={false} />
            <PakkaStamp date="19 NOV 2026" />
          </div>
        </div>
      </section>
      <Below />
    </div>
  );
}

const DEADLINE = when(STATES['complaint-done']!.deadlines!.zeroLiabilityBy);

/* I: the Fold app system. The payment screen every UPI user has seen, its 12-digit reference circled,
   and that number carried into the complaint. */
function DirectionI(p: QuickstartPreCallCardProps) {
  return (
    <div className="up-page" style={{ overflowX: 'clip' }}>
      <div className="up-wrap">
        <header className="up-header" style={{ minHeight: 88 }}>
          <Logo />
          <nav className="flex gap-2">
            <a href="#how" className="fd-pill">How it works</a>
            <a href="#sources" className="fd-pill">Sources</a>
            <a href="tel:1930" className="fd-pill">Call 1930</a>
          </nav>
        </header>
        <section className="rc-hero">
          <div>
            <h1 className="up-display">Lost money to a UPI scam? Tell me what happened.</h1>
            <p className="up-lead" style={{ marginTop: 24, maxWidth: '34rem' }}>
              {SUB}
            </p>
            <div className="mt-7">
              <LanguageChips />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <StartButton {...p} />
              <ListenButton {...p} link />
            </div>
            <MoreWays />
            {p.error && <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--bad)' }}>{p.error}</p>}
            <p className="mt-6 text-[1rem]" style={{ color: 'var(--ink-2)', maxWidth: '34rem' }}>
              {WHY}
            </p>
          </div>
          <div className="rc-stage">
            <div className="rc-phone" aria-label="Sample payment screen">
              <p className="text-center">
                <span className="up-sample-tag">Sample</span>
              </p>
              <div className="rc-tick" aria-hidden="true">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
              <p className="rc-amount">₹25,000</p>
              <p className="rc-meta">Paid to ramesh@okaxis</p>
              <p className="rc-meta">19 Nov 2026, 2:30 pm</p>
              <div className="rc-rows">
                <div>
                  <span>From</span>
                  <span>State Bank of India</span>
                </div>
                <div>
                  <span>UTR / UPI Ref. No.</span>
                  <span className="rc-ref">
                    402177889910
                    <svg className="rc-circle" viewBox="0 0 160 50" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M8 26 C 10 6, 150 4, 154 22 C 158 42, 20 48, 6 30 C 2 22, 30 10, 60 9" fill="none" stroke="#ed6a12" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
            <svg className="rc-arrow" style={{ left: 250, top: 330, width: 160, height: 120 }} viewBox="0 0 160 120" aria-hidden="true">
              <path d="M6 8 C 70 6, 120 30, 130 96" fill="none" stroke="#ed6a12" strokeWidth="3" strokeLinecap="round" />
              <path d="M118 84 L131 100 L144 82" fill="none" stroke="#ed6a12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="rc-card up-slip p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[1.125rem] font-semibold">Your complaint</span>
                <span className="up-sample-tag">Sample</span>
              </div>
              <p className="mt-4 text-[0.875rem]" style={{ color: 'var(--ink-3)' }}>UTR (transaction reference)</p>
              <div className="mt-2">
                <UtrGroups value="402177889910" state="ok" />
              </div>
              <p className="mt-2">
                <span className="up-tick" style={{ marginLeft: 0 }}>✓ confirmed</span>
                <span className="up-tick">(screenshot ✓)</span>
              </p>
              <p className="mt-4 border-t pt-4 text-[1rem]" style={{ borderColor: 'var(--rule)' }}>
                Tell your bank by <strong>{DEADLINE}</strong> for zero liability (RBI, 3 working days).
              </p>
            </div>
          </div>
        </section>
      </div>
      <Below />
    </div>
  );
}
export function QuickstartPreCallCard(props: QuickstartPreCallCardProps) {
  const d = useDirection();
  if (d === 'b') return <DirectionB {...props} />;
  if (d === 'g') return <DirectionG {...props} />;
  if (d === 'h') return <DirectionH {...props} />;
  if (d === 'i') return <DirectionI {...props} />;
  return <FirstScreen {...props} />;
}
