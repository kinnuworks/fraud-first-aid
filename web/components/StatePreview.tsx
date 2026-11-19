'use client';
// ?state=<name> shows one screen state with labelled sample data, for design and screenshots.
// It never runs inside a real call and says on screen that the data is a sample.
import { Logo } from './design/Logo';
import { ComplaintCardView, type ComplaintView } from './ComplaintCard';
import { newComplaint } from '@/lib/complaint/session';
import { buildPack } from '@/lib/complaint/pack';
import { missingFields, deadlines } from '@/lib/complaint/session';
import { compareWithScreenshot, type Shot } from '@/lib/complaint/screenshot';

function view(lang: 'te' | 'en', fields: ReturnType<typeof newComplaint>['fields'], shot?: Shot): ComplaintView {
  const c = { ...newComplaint(lang), fields, shot };
  return {
    lang,
    fields: c.fields,
    missing: missingFields(c),
    deadlines: c.fields.when ? deadlines(c.fields.when.value.slice(0, 10)) : null,
    check: shot ? compareWithScreenshot(c, shot) : null,
    pack: buildPack(c, '2026-11-19'),
  };
}

const SAMPLE = {
  utr: { value: '402177889910', confirmed: true },
  amount: { value: 25000, confirmed: true },
  when: { value: '2026-11-19T14:30', confirmed: true },
  payee: { value: 'ramesh@okaxis', confirmed: true },
  victim_bank: { value: 'State Bank of India, BANGALORE (SBIN0000813)', confirmed: true },
};

const GUARD_FLAGGED: ComplaintView = {
  ...view('te', {}),
  phase: 'guard',
  flags: [{ red_flag: 'asked for the OTP sent to the phone', scam: 'fake_kyc', heard: 'आपके phone पर एक OTP आया होगा, वो मुझे बता दीजिए' }],
};

export const STATES: Record<string, ComplaintView | null> = {
  'guard-listening': { ...view('te', {}), phase: 'guard', flags: [] },
  'guard-flagged': GUARD_FLAGGED,
  'complaint-waiting': null,
  'complaint-empty': view('te', {}),
  'complaint-checking': view('te', { utr: { value: '402177889910', confirmed: false } }),
  'complaint-partial': view('te', { utr: SAMPLE.utr, amount: SAMPLE.amount, when: { value: SAMPLE.when.value, confirmed: false } }),
  'complaint-mismatch': view('te', { utr: { value: '402177889910', confirmed: false } }, { utr: '402177869910', amount: 25000, payee: 'ramesh@okaxis', when: '19 Nov 2026, 2:30 pm' }),
  'complaint-done': view('te', SAMPLE, { utr: '402177889910', amount: 25000, payee: 'ramesh@okaxis' }),
};

export function StatePreview({ state }: { state: string }) {
  if (!(state in STATES)) {
    return <p className="p-6">Unknown state. Try: {Object.keys(STATES).join(', ')}</p>;
  }
  const guard = state.startsWith('guard');
  return (
    <div className="cs">
      <header className="cs-top">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="cs-tabs" aria-label="Sections">
            <a href="#live" aria-current="true">Live call</a>
            <a href="#complaint">Complaint</a>
            <a href="#pack">Pack</a>
          </nav>
        </div>
        <p role="note" className="up-sample-tag" style={{ textTransform: 'none', letterSpacing: 0 }}>
          Preview of the “{state}” screen with sample data, not a real complaint.
        </p>
      </header>
      <div className="cs-grid">
        <div className="cs-left">
          <aside className="cs-side" aria-label="Call" id="live">
            <section>
              <span className="up-label">Live call</span>
              <div className="cs-orb">
                <p className="max-w-[14rem] text-center text-[0.9375rem]" style={{ color: 'var(--on-navy-2)' }}>
                  The agent appears here during a live call.
                </p>
              </div>
            </section>
            {guard && (
              <section>
                <p className="up-note text-[1rem]">
                  On guard: put the suspicious call on speaker near this device. Fraud First Aid stays quiet and speaks up the moment
                  the caller asks for an OTP, a PIN, a QR scan, an app install or money.
                </p>
              </section>
            )}
            <div id="cs-deadline-slot" />
          </aside>
        </div>
        <main className="cs-main">
          <ComplaintCardView data={STATES[state]} />
        </main>
        <div className="cs-right">
          <section className="up-transcript" aria-label="Transcription panel">
            <div className="px-6 pb-3 pt-5">
              <h2 className="up-label">Transcript</h2>
            </div>
            <div className="flex flex-1 items-center justify-center px-6 text-center text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
              The live transcript appears here during a call.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
