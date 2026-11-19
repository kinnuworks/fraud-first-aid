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
    <div className="up-page">
      <div className="up-wrap">
        <header className="up-callbar">
          <Logo />
          <p role="note" className="up-sample-tag" style={{ textTransform: 'none', letterSpacing: 0 }}>
            Preview of the “{state}” screen with sample data, not a real complaint.
          </p>
        </header>
        <main className="flex max-w-[52rem] flex-col gap-4 py-6">
          {guard && (
            <p className="up-note text-[1rem]">
              On guard: put the suspicious call on speaker near this device. UTR Pakka stays quiet and speaks up the moment the
              caller asks for an OTP, a PIN, a QR scan, an app install or money.
            </p>
          )}
          <ComplaintCardView data={STATES[state]} />
        </main>
      </div>
    </div>
  );
}
