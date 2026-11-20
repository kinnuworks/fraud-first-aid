'use client';
// The first screen, on Tines' system (tines.com): a two-part pill, the headline and serif lead, the
// ten languages where Tines has its logo strip, two pill buttons, then the product in a lilac window
// with a playback bar marking the red flag, and our own Indian flowers bursting from behind it.
// Every word comes from the design brief; the sample call is labelled as a sample.
import { Logo } from './design/Logo';
import {
  LanguageChips,
  SlowToggle,
  ReadBack,
  StartButton,
  WatchButton,
  ListenButton,
  GuardSample,
  LANGS,
  type StartProps,
} from './HeroControls';
import { STATES } from './StatePreview';
import { when } from './ComplaintCard';

const DEADLINE = when(STATES['complaint-done']!.deadlines!.zeroLiabilityBy);
const SPOKEN = LANGS.filter(([c]) => c !== 'auto');

// Why it needs its technology, at reading size (three parts, no dot strings).
function Tech({ className = '' }: { className?: string }) {
  return (
    <ul className={`hc-tech ${className}`} aria-label="How it runs">
      <li>Agora Conversational AI runs the live call</li>
      <li>Sarvam hears 10 Indian languages</li>
      <li>Murf Falcon speaks back</li>
    </ul>
  );
}

function ComplaintSample() {
  return (
    <div className="hc-complaint">
      <div className="hc-complaint__head">
        <span className="hc-complaint__title">Your complaint</span>
        <span className="up-sample-tag">Sample</span>
      </div>
      <p className="hc-complaint__k">UTR (transaction reference)</p>
      <ReadBack />
      <p className="hc-complaint__deadline">
        Tell your bank by <strong>{DEADLINE}</strong> for zero liability (RBI, 3 working days).
      </p>
    </div>
  );
}

function LangStrip() {
  const row = (hidden: boolean) =>
    SPOKEN.map(([code, label]) => (
      <li key={`${code}-${hidden ? 'b' : 'a'}`} lang={code === 'en' ? 'en' : code} aria-hidden={hidden || undefined}>
        {label}
      </li>
    ));
  return (
    <div className="ta-langs" aria-label="It speaks ten Indian languages">
      <ul className="ta-langs__row">
        {row(false)}
        {row(true)}
      </ul>
    </div>
  );
}

export function Hero(p: StartProps) {
  return (
    <>
      <header className="ta-nav">
        <Logo />
        <nav className="ta-links" aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#cases">Real cases</a>
          <a href="/proof">Check it yourself</a>
          <a href="#try">Try it on your phone</a>
          <a href="#sources">Sources</a>
        </nav>
        <a href="tel:1930" className="ta-btn ta-btn--sos ta-btn--nav">Call 1930</a>
      </header>
      <section className="ta-hero">
        <a className="ta-pill" href="#sources">
          <span className="ta-pill__k">In 2024</span>
          <span className="ta-pill__v">
            Indians reported losing ₹22,845 crore to cyber fraud <span aria-hidden="true">→</span>
          </span>
        </a>
        <h1 className="ta-h1">
          Catches the scam on the call. <span className="ta-h1__2">Chases the money if it&apos;s gone.</span>
        </h1>
        <p className="ta-sub">
          Open this page on another phone or laptop, put the scam call on speaker next to it, and it warns you in your language. Lost
          money? Tell it what happened and it gets every number right for the 1930 helpline and your bank.
        </p>
        <LangStrip />
        <div className="ta-ctas">
          <WatchButton {...p} className="ta-btn ta-btn--fill ta-btn--lg" />
          <StartButton {...p} className="ta-btn ta-btn--line ta-btn--lg" />
        </div>
        <div className="ta-prefs">
          <ListenButton {...p} link className="ta-link" />
          <LanguageChips className="up-langpick ta-lang" />
          <SlowToggle />
        </div>
        {p.error && <p className="hc-error">{p.error}</p>}
        <Tech className="ta-tech" />
        <div className="ta-stage">
          <span className="ta-bloom ta-bloom--r" aria-hidden="true" />
          <span className="ta-bloom ta-bloom--l" aria-hidden="true" />
          <figure className="ta-win" aria-label="Sample: the agent hears a fake KYC call ask for an OTP and tells the user to hang up">
            <div className="ta-win__bar" aria-hidden="true">
              <span className="ta-win__pause">
                <i />
                <i />
              </span>
              <span className="ta-win__track">
                <span className="ta-win__played" />
                <span className="ta-win__mark">Red flag</span>
              </span>
              <span className="ta-win__time">0:15 / 0:19</span>
            </div>
            <div className="ta-win__app">
              <aside className="ta-win__side">
                <span className="ta-seg">
                  <span aria-current="true">On guard</span>
                  <span>Complaint</span>
                </span>
                <p className="ta-side__k">What it&apos;s doing</p>
                <ol className="ta-steps">
                  <li data-kind="heard">Listening on speaker, silent while the caller talks</li>
                  <li data-kind="flag">Red flag on the call: the caller asked for the OTP sent to the phone. Told you to hang up (Fake KYC update)</li>
                </ol>
              </aside>
              <div className="ta-win__main">
                <GuardSample />
              </div>
              <div className="ta-win__card">
                <ComplaintSample />
              </div>
            </div>
          </figure>
        </div>
      </section>
    </>
  );
}
