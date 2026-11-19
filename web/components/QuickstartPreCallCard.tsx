'use client';
// The first screen before a call: the ask, the language, the ways to start, and the payment screen
// every UPI user has seen, with its 12-digit reference carried into a finished sample complaint.
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PhoneCallStart } from './PhoneCallStart';
import { when } from './ComplaintCard';
import { STATES } from './StatePreview';
import { Logo } from './design/Logo';
import { ImpactBand, PhotoCredits } from './ImpactBand';
import Image from 'next/image';

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

// "Speak slowly": a slower voice for older callers (?slow=1, read by the call start) and larger text.
function SlowToggle() {
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
function ReadBack() {
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

const WHY = 'Live voice by Agora Conversational AI, with Sarvam speech-to-text and Murf Falcon voices in ten Indian languages.';

// Two more ways in, under the start controls: a recording of the whole flow, and a call to the caller's phone.
function MoreWays() {
  return (
    <div className="mt-5 flex flex-col items-start gap-3">
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

// Numbers on the first screen come from the fact sheet, each with its source below.
const FACTS: Array<[string, string, string]> = [
  ['UPI fraud incidents, FY2024-25', '12.64 lakh', 'Lok Sabha reply, via IANS, 15 Dec 2025'],
  ['Reported lost to cyber fraud, 2024', '₹22,845.73 crore', 'Lok Sabha reply, 22 Jul 2025'],
  ['Senior citizens lost, 2025', '₹4,005.12 crore', 'Rajya Sabha reply, 5 Aug 2026'],
  ['Held through 1930, till 30 Jun 2026', '₹11,158 crore+', 'Lok Sabha reply, Aug 2026'],
];

// The journey, outcome first, each step with one small proof line (STATE.md, JOURNEY HIGHLIGHT).
const JOURNEY: Array<[string, string, string]> = [
  [
    'During the scam',
    'It hears the call and tells you to hang up before you lose anything.',
    'Warned in 133 of 200 public scam calls it never saw (ICFD-31k back-test; keyword rules: 5). Names a UPI ID from an earlier complaint at once.',
  ],
  [
    "If money's gone",
    'It takes your complaint by voice, in your language, every detail right.',
    'Checked against your payment screenshot; 295 of 300 numbers exact in noise in our own break test.',
  ],
  [
    'It acts',
    "It finds your bank and branch, your bank's own fraud line, and your RBI deadline.",
    'Zero liability if your bank hears within 3 working days (RBI circular RBI/2017-18/15).',
  ],
  [
    'It hands you everything',
    'The 1930 script in your language, an English card for the operator, the bank letter and reminders. One tap brings family onto the call.',
    'Plus what the scammer said, timestamped with the red flags marked, and the RBI Ombudsman complaint ready for day 30.',
  ],
];

function Journey() {
  return (
    <section id="how" className="jr up-wrap" aria-labelledby="jr-title">
      <h2 id="jr-title" className="up-label">
        What UTR Pakka does for you
      </h2>
      <ol className="jr-grid">
        {JOURNEY.map(([k, outcome, proof], i) => (
          <li key={k} className="jr-step">
            <span className="jr-n" aria-hidden="true">
              {i + 1}
            </span>
            <p className="jr-k">{k}</p>
            <p className="jr-out">{outcome}</p>
            <p className="jr-proof">{proof}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Reported outcomes after a fast 1930 report. No faces here.
function Cases() {
  return (
    <section className="cs2 up-wrap" aria-label="Reported cases">
      <div className="cs2-card">
        <p className="cs2-num">₹17 lakh back</p>
        <p className="cs2-text">
          A 79-year-old in Mangaluru lost her life savings to a fake video &ldquo;arrest&rdquo;. Police reached the bank through
          1930 the same day and froze it before the money left. All of it came back.
        </p>
        <p className="jr-proof">The Mangalorean, 31 Oct 2025</p>
      </div>
      <div className="cs2-card">
        <p className="cs2-num">₹14 lakh back</p>
        <p className="cs2-text">A 44-year-old in Bengaluru called 1930 within the golden hour. All ₹14 lakh came back.</p>
        <p className="jr-proof">Telangana Today / PTI, 23 Sep 2025</p>
      </div>
    </section>
  );
}

function Below() {
  return (
    <>
      <section id="sources" className="up-wrap" style={{ paddingTop: 72, paddingBottom: 96 }}>
        <h2 className="up-label">Sources for the numbers on this page</h2>
        <ul className="mt-3 space-y-1 text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
          <li>Reported lost since 2021, and refunded: about ₹64,447 crore and about ₹323 crore. Home Ministry officials briefing the Prime Minister, reported by Pratidin Time, 9 Jul 2026, and the Indian Express.</li>
          {FACTS.map(([k, v, s]) => (
            <li key={k}>
              {k}: {v}. {s}.
            </li>
          ))}
          <li>Guard and number break tests: our own tests, described with their data in the README.</li>
        </ul>
        <p className="mt-6 text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
          UTR Pakka never asks for an OTP, PIN, password or card number. It does not file on the cybercrime portal for you and it
          cannot recover money.
        </p>
      </section>
    </>
  );
}

// 1930 exists, so what is this? The same call, alone and with UTR Pakka.
function Compare() {
  return (
    <section className="cmp" aria-labelledby="cmp-title">
      <h2 id="cmp-title" className="up-h2">
        1930 is the right number to call. UTR Pakka gets you ready for it.
      </h2>
      <div className="cmp-grid">
        <div className="cmp-col">
          <p className="up-label">Calling 1930 alone</p>
          <ul>
            <li>You read a 12-digit UTR out loud while you panic.</li>
            <li>In English or Hindi, whatever language you think in.</li>
            <li>Any wrong digit slows the freeze.</li>
          </ul>
        </div>
        <div className="cmp-col cmp-col--us">
          <p className="up-label">With UTR Pakka</p>
          <ul>
            <li>You speak your own language, in ten Indian languages.</li>
            <li>Every digit is read back in groups of four until you confirm it.</li>
            <li>The 1930 operator gets an English card with every number confirmed.</li>
            <li>You get your bank&apos;s own fraud line, the RBI deadline date and three calendar reminders, up to the day-30 Ombudsman step.</li>
          </ul>
        </div>
      </div>
      <div className="cmp-proof">
        <p>
          In June 2026 the Home Minister asked the 1930 helpline to add AI tools and multilingual support, because language
          barriers stop people from reporting promptly (Devdiscourse, 17 Jun 2026).
        </p>
      </div>
    </section>
  );
}

const DEADLINE = when(STATES['complaint-done']!.deadlines!.zeroLiabilityBy);

/* The payment screen every UPI user has seen, its 12-digit reference circled, and that number
   carried into the complaint (Fold's app system). */
export function QuickstartPreCallCard(p: QuickstartPreCallCardProps) {
  return (
    <div className="up-page" style={{ overflowX: 'clip' }}>
      <div className="up-wrap">
        <header className="up-header">
          <Logo />
          <nav className="up-nav">
            <a href="#how" className="fd-pill">How it works</a>
            <a href="#sources" className="fd-pill">Sources</a>
            <a href="tel:1930" className="fd-pill">Call 1930</a>
          </nav>
        </header>
        <section className="rc-hero">
          <div>
            <p className="up-label">UTR = the 12-digit payment reference. Pakka = for sure.</p>
            <h1 className="up-display" style={{ marginTop: 16 }}>
              Get your money frozen in the first hour.
            </h1>
            <p className="rc-stakes">
              About ₹64,447 crore reported lost since 2021; about ₹323 crore refunded. The first hour decides it.
              <span className="rc-src"> Home Ministry officials, reported by Pratidin Time, 9 Jul 2026</span>
            </p>
            <p className="up-lead" style={{ marginTop: 14, maxWidth: '34rem' }}>
              <strong className="rc-h1-accent">UTR Pakka is the calm voice beside you in that hour, in your language.</strong>
            </p>
            <div className="mt-7">
              <LanguageChips />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <StartButton {...p} />
              <ListenButton {...p} link />
            </div>
            <div className="mt-4">
              <SlowToggle />
            </div>
            {p.error && <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--bad)' }}>{p.error}</p>}
          </div>
          <div className="rc-stage">
            <div className="rc-phone" aria-label="Sample payment screen">
              <span className="rc-btn-vol" aria-hidden="true" />
              <div className="rc-screen">
                <span className="rc-cam" aria-hidden="true" />
                <div className="rc-status" aria-hidden="true">
                  <span>2:31</span>
                  <svg width="44" height="12" viewBox="0 0 44 12" fill="currentColor">
                    <rect x="0" y="8" width="3" height="4" rx="1" />
                    <rect x="5" y="5" width="3" height="7" rx="1" />
                    <rect x="10" y="2" width="3" height="10" rx="1" />
                    <rect x="22" y="1" width="20" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="24" y="3" width="13" height="6" rx="1.5" />
                  </svg>
                </div>
                <div className="rc-body">
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
                        <path d="M8 26 C 10 6, 150 4, 154 22 C 158 42, 20 48, 6 30 C 2 22, 30 10, 60 9" fill="none" stroke="var(--marker)" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div className="rc-done" aria-hidden="true">
                  Done
                </div>
                </div>
                <span className="rc-home" aria-hidden="true" />
              </div>
            </div>
            <svg className="rc-arrow" style={{ left: 300, top: 410, width: 160, height: 120 }} viewBox="0 0 160 120" aria-hidden="true">
              <path d="M6 8 C 70 6, 120 30, 130 96" fill="none" stroke="var(--marker)" strokeWidth="3" strokeLinecap="round" />
              <path d="M118 84 L131 100 L144 82" fill="none" stroke="var(--marker)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="rc-card up-card">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[1.125rem] font-bold">Your complaint</span>
                <span className="up-sample-tag">Sample</span>
              </div>
              <p className="mt-4 text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>UTR (transaction reference)</p>
              <ReadBack />
              <p className="mt-4 border-t pt-4 text-[1rem]" style={{ borderColor: 'var(--rule)' }}>
                Tell your bank by <strong>{DEADLINE}</strong> for zero liability (RBI, 3 working days).
              </p>
            </div>
          </div>
        </section>
      </div>
      <Journey />
      <Cases />
      <div className="up-wrap">
        <section className="mw" aria-label="More ways to try it">
          <MoreWays />
          <span className="fd-qr">
            <Image src="/design/qr-live.svg" alt="QR code to open UTR Pakka on your phone" width={76} height={76} unoptimized />
            <span>
              Scan to try it
              <br />
              on your phone
            </span>
          </span>
          <p className="mw-why">{WHY}</p>
        </section>
      </div>
      <ImpactBand />
      <div className="up-wrap">
        <Compare />
      </div>
      <Below />
      <PhotoCredits />
    </div>
  );
}
