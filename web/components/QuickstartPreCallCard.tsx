'use client';
// The landing page before a call: the hero (Hero.tsx, on Tines' system), then the journey, the
// reported cases, the way into /proof, the QR to open it on a phone, the numbers, 1930 alone vs with
// Fraud First Aid, and the sources.
import { type StartProps } from './HeroControls';
import { Hero } from './Hero';
import { Logo } from './design/Logo';
import { ImpactBand } from './ImpactBand';
import Image from 'next/image';

// Another way in: open it on a phone (QR); plus a recording of the whole flow. Calls to the caller's phone are paused on the server.
function MoreWays() {
  return (
    <section className="mw" aria-labelledby="mw-title">
      <span className="fd-qr">
        <Image src="/design/qr-live.svg" alt="QR code to open Fraud First Aid on your phone" width={76} height={76} unoptimized />
      </span>
      <div className="mw-body">
        <h2 id="mw-title" className="mw-title">Try it on your phone</h2>
        <p className="mw-sub">Scan the code to open it on your phone.</p>
      </div>
      <a
        className="up-link mw-rec"
        href="/demo/full-flow.mp4"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="watch-recording"
      >
        Or watch a 4-minute screen recording (sample voices, no audio)
      </a>
    </section>
  );
}

// Numbers on the first screen come from the fact sheet, each with its source below.
const FACTS: Array<[string, string, string]> = [
  ['UPI fraud incidents, FY2024-25', '12.64 lakh', 'Lok Sabha reply, via IANS, 15 Dec 2025'],
  ['Reported lost to cyber fraud, 2024', '₹22,845.73 crore across 36,37,288 incidents', 'Lok Sabha reply, 22 Jul 2025'],
  ['Senior citizens lost, 2025', '₹4,005.12 crore', 'Rajya Sabha reply, 5 Aug 2026'],
  ['Karnataka, lost and recovered over three years', '₹5,474 crore lost, ₹627 crore back', 'Karnataka Home Minister, Assembly reply, via The News Minute, 10 Dec 2025'],
  ['Held through 1930, till 30 Jun 2026', '₹11,158 crore+', 'Lok Sabha reply, Aug 2026'],
];

// The journey, outcome first, each step with one small proof line (STATE.md, JOURNEY HIGHLIGHT).
const JOURNEY: Array<[string, string, string]> = [
  [
    'During the scam',
    'It hears the call and tells you to hang up.',
    'Warned on 198 of 200 scam calls in eight Indian languages, and on none of 200 normal ones (INDICA back-test). It knows a UPI ID from an earlier complaint.',
  ],
  [
    "If money's gone",
    'It takes your complaint by voice and gets every number right.',
    'Each number is read back and checked against your payment screenshot. 295 of 300 exact in noise in our own break test.',
  ],
  [
    'It acts',
    "It finds your bank's own fraud line and your RBI deadline.",
    'Zero liability if your bank hears within 3 working days (RBI circular RBI/2017-18/15).',
  ],
  [
    'It hands you everything',
    'A 1930 script, an English card, a bank letter and reminders.',
    'Plus a timestamped record of the call with the red flags marked. One tap brings family onto the call.',
  ],
  [
    'On the 1930 call',
    'It speaks to the operator for you, and tells you what they ask.',
    'English to the operator, your language to you. Every number it gives them comes from your confirmed complaint, never from the AI model.',
  ],
];

// Numbers in a proof line or a case, bold and marked like a highlighter, so the evidence reads at a
// glance ("198 of 200", "3 working days", "₹14 lakh"). Codes like RBI/2017-18/15 and ages stay plain.
const NUM = /((?<![\w/-])₹?\d[\d,]*(?:\.\d+)?(?: (?:lakh|crore))?(?: of \d[\d,]*)?(?: working days)?(?![\w/-]))/g;
function withNumbers(text: string) {
  return text.split(NUM).map((part, i) =>
    i % 2 ? (
      <strong key={i} className="num-hi">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function Journey() {
  return (
    <section id="how" className="jr up-wrap" aria-labelledby="jr-title">
      <h2 id="jr-title" className="up-label">
        What Fraud First Aid does for you
      </h2>
      <ol className="jr-grid">
        {JOURNEY.map(([k, outcome, proof], i) => (
          <li key={k} className="jr-step">
            <span className="jr-n" aria-hidden="true">
              {i + 1}
            </span>
            <p className="jr-k">{k}</p>
            <p className="jr-out">{outcome}</p>
            <p className="jr-proof">{withNumbers(proof)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Reported outcomes after a fast 1930 report. No faces here.
function Cases() {
  return (
    <section className="cs2 up-wrap" id="cases" aria-label="Reported cases">
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
        <p className="cs2-text">{withNumbers('A 44-year-old in Bengaluru called 1930 within the golden hour. All ₹14 lakh came back.')}</p>
        <p className="jr-proof">Telangana Today / PTI, 23 Sep 2025</p>
      </div>
    </section>
  );
}

// The footer: the promise, the page's links, Call 1930 and the sources, on a deep green band.
function Below() {
  return (
    <section id="sources" className="ft" aria-label="Sources">
      <div className="up-wrap ft-in">
        <div>
          <Logo />
          <p className="src-never">
            Fraud First Aid never asks for an OTP, PIN, password or card number. It does not file on the cybercrime portal for you and it
            cannot recover money.
          </p>
          <a href="tel:1930" className="ta-btn ta-btn--sos ta-btn--nav ft-call">
            Call 1930
          </a>
        </div>
        <nav className="ft-links" aria-label="On this page">
          <a href="#how">How it works</a>
          <a href="#cases">Real cases</a>
          <a href="/proof">Check it yourself</a>
          <a href="#try">Try it on your phone</a>
        </nav>
      <details className="src-list">
        <summary>Sources for every number on this page</summary>
        <ul>
          <li>Reported lost since 2021, and refunded: about ₹64,447 crore and about ₹323 crore. Home Ministry officials briefing the Prime Minister, reported by Pratidin Time, 9 Jul 2026, and the Indian Express.</li>
          {FACTS.map(([k, v, s]) => (
            <li key={k}>
              {k}: {v}. {s}.
            </li>
          ))}
          <li>Guard and number break tests: our own tests, described with their data in the README.</li>
        </ul>
      </details>
      </div>
    </section>
  );
}

// 1930 exists, so what is this? The same call, alone and with Fraud First Aid.
function Compare() {
  return (
    <section className="cmp" aria-labelledby="cmp-title">
      <h2 id="cmp-title" className="up-h2">
        1930 is the right number to call. Fraud First Aid gets you ready for it.
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
          <p className="up-label">With Fraud First Aid</p>
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

export type QuickstartPreCallCardProps = StartProps;

export function QuickstartPreCallCard(p: QuickstartPreCallCardProps) {
  return (
    <div className="up-page" style={{ overflowX: 'clip' }}>
      <Hero {...p} />
      <Journey />
      <Cases />
      <section className="ck up-wrap" aria-label="Check it yourself">
        <div className="ck-card">
          <div>
            <p className="ck-title">Don&apos;t take our word for it.</p>
            <p className="ck-text">Try to fool the scam guard, say a UTR any way you like, and see every result with the file behind it.</p>
          </div>
          <a href="/proof" className="up-btn ck-btn" data-testid="open-proof">Check it yourself</a>
        </div>
      </section>
      <div className="up-wrap" id="try">
        <MoreWays />
      </div>
      <ImpactBand />
      <div className="up-wrap" id="compare">
        <Compare />
      </div>
      <Below />
    </div>
  );
}
