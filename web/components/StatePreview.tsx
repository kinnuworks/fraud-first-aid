'use client';
// ?state=<name> shows one screen state with labelled sample data, for design and screenshots.
// It never runs inside a real call and says on screen that the data is a sample.
import { ComplaintCardView, type ComplaintView } from './ComplaintCard';
import { newComplaint } from '@/lib/complaint/session';
import { buildPack } from '@/lib/complaint/pack';
import { missingFields, deadlines } from '@/lib/complaint/session';

function view(lang: 'te' | 'en', fields: ReturnType<typeof newComplaint>['fields']): ComplaintView {
  const c = { ...newComplaint(lang), fields };
  return {
    fields: c.fields,
    missing: missingFields(c),
    deadlines: c.fields.when ? deadlines(c.fields.when.value.slice(0, 10)) : null,
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

export const STATES: Record<string, ComplaintView | null> = {
  'complaint-waiting': null,
  'complaint-empty': view('te', {}),
  'complaint-checking': view('te', { utr: { value: '402177889910', confirmed: false } }),
  'complaint-partial': view('te', { utr: SAMPLE.utr, amount: SAMPLE.amount, when: { value: SAMPLE.when.value, confirmed: false } }),
  'complaint-done': view('te', SAMPLE),
};

export function StatePreview({ state }: { state: string }) {
  if (!(state in STATES)) {
    return <p className="p-6">Unknown state. Try: {Object.keys(STATES).join(', ')}</p>;
  }
  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <p role="note" className="rounded bg-yellow-100 px-3 py-2 text-xs text-yellow-900">
        Preview of the “{state}” screen with sample data, not a real complaint.
      </p>
      <ComplaintCardView data={STATES[state]} />
    </main>
  );
}
