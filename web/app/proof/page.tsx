import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/design/Logo';
import { GuardTry, NumberTry } from '@/components/proof/ProofTry';

export const metadata: Metadata = {
  title: 'Check it yourself: Fraud First Aid',
  description: 'Try to fool the scam guard, say a number any way you like, and see every result with the command that reruns it.',
};

const REPO = 'https://github.com/kinnuworks/fraud-first-aid/blob/master';

// Every number here is in STATE.md's Evidence ledger, with its data, baseline and limits.
const RESULTS: Array<{ big: string; what: string; base: string; label: string; file: string; rerun: string }> = [
  { big: '133 of 200', what: 'public scam conversations it had never seen got a warning', base: 'Keyword rules on the same lines: 5', label: 'Back-test on public data (ICFD-31k, synthetic conversations, English and Hinglish)', file: 'evidence/results/icfd-cross-domain-2026-11-20.csv', rerun: 'npx -y tsx@4.20.6 evidence/icfd/run.ts' },
  { big: '24 of 24', what: 'ordinary calls left alone: no warning, no false alarm', base: 'Family, office and payment talk in English, Hindi and Telugu', label: 'Our own break test (we tried to make it fail)', file: 'evidence/results/guard-ordinary-run3-2026-11-20.csv', rerun: 'npx -y tsx@4.20.6 evidence/breaktest/ordinary.ts' },
  { big: '40 of 40', what: 'disguised asks and "stay quiet" tricks still got a warning', base: '20 disguised asks and 20 attempts to switch it off', label: 'Our own break test (we tried to make it fail)', file: 'evidence/results/guard-breaktest-rerun3-2026-11-20.csv', rerun: 'npx -y tsx@4.20.6 evidence/breaktest/guard.ts' },
  { big: '295 of 300', what: 'spoken 10- and 12-digit numbers read exactly, in noise', base: "The speech-to-text's own numerals: 79", label: 'Our own break test (synthetic voices, white noise)', file: 'evidence/results/breaktest-2026-11-19.csv', rerun: 'npx -y tsx@4.20.6 evidence/breaktest/run.ts' },
  { big: '207 of 330', what: 'real read sentences in Hindi, Telugu and Kannada with every number exact', base: "The speech-to-text's own numerals: 114", label: 'Back-test on public data (FLEURS read speech)', file: 'evidence/results/fleurs-test-2026-11-19.csv', rerun: 'npx tsx evidence/fleurs/score.ts test' },
  { big: '211 of 330', what: 'the same sentences through a phone-line codec', base: "The speech-to-text's own numerals: 115", label: 'Back-test on public data (FLEURS, G.711 phone audio)', file: 'evidence/results/fleurs-test-phone-2026-11-20.csv', rerun: 'npx tsx evidence/fleurs/score.ts test phone' },
  { big: '5 of 5', what: 'scam calls started at the same moment each got the warning', base: 'Each with its own Agora agent; 23.5 to 26.3 s after the press', label: 'Our own test, five calls at once on the live app', file: 'evidence/results/concurrent-2026-11-20.csv', rerun: 'cd web && npx -y tsx@4.20.6 scripts/concurrent-check.ts' },
];

export default function Proof() {
  return (
    <div className="up-page">
      <div className="up-wrap">
        <header className="up-header">
          <Logo />
          <nav className="up-nav">
            <Link href="/" className="fd-pill">Back to the app</Link>
          </nav>
        </header>
        <section className="pf-hero">
          <span className="up-label">Check it yourself</span>
          <h1 className="pf-title">Don&apos;t take our word for it.</h1>
          <p className="up-lead">
            Two things you can try right here, with no microphone and no sign-up, and every result we claim, with the file behind it and the command that
            reruns it.
          </p>
        </section>
        <div className="pf-grid">
          <GuardTry />
          <NumberTry />
        </div>
        <section className="pf-results" aria-labelledby="pf-res">
          <h2 id="pf-res" className="pf-h2">What we measured</h2>
          <p className="pf-sub">No real users yet: it was built for this hackathon. So every claim is a back-test on public data or our own break test, labelled as such.</p>
          <ul className="pf-cards">
            {RESULTS.map((r) => (
              <li key={r.file} className="pf-card">
                <p className="pf-big">{r.big}</p>
                <p className="pf-what">{r.what}</p>
                <p className="pf-base">{r.base}</p>
                <p className="pf-label">{r.label}</p>
                <p className="pf-links">
                  <a href={`${REPO}/${r.file}`} target="_blank" rel="noopener noreferrer">Every row</a>
                  <code className="pf-cmd">{r.rerun}</code>
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section className="pf-more">
          <h2 className="pf-h2">See a whole call without talking</h2>
          <p className="pf-sub">
            The finished complaint, with every step the agent took: <Link href="/?state=complaint-done">sample screen</Link>. The 1930 interpreter after
            the operator gave an acknowledgement number: <Link href="/?state=complaint-interpret">sample screen</Link>. Both use labelled sample data.
          </p>
        </section>
      </div>
    </div>
  );
}
