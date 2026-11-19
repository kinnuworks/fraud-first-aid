'use client';
// The finished complaint a judge sees before talking: sample data, labelled as a sample.
import { STATES } from './StatePreview';
import { UtrGroups, show, when } from './ComplaintCard';

const DONE = STATES['complaint-done']!;

const ROWS: Array<['amount' | 'when' | 'payee' | 'victim_bank', string]> = [
  ['amount', 'Amount lost'],
  ['when', 'When'],
  ['payee', 'Money went to'],
  ['victim_bank', 'Your bank'],
];

export function SampleSlip({ title = true }: { title?: boolean }) {
  const f = DONE.fields;
  const by = DONE.deadlines ? when(DONE.deadlines.zeroLiabilityBy) : null;
  return (
    <div className="up-slip" aria-label="Sample complaint">
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-1 pt-4">
          <span className="text-[1.125rem] font-semibold">Your complaint</span>
          <span className="up-sample-tag">Sample</span>
        </div>
      )}
      <div className="up-slip__row">
        <span className="up-slip__k">UTR (transaction reference)</span>
        <span className="up-slip__v">
          <UtrGroups value={f.utr!.value} state="ok" />
          <span className="up-tick">✓ confirmed</span>
          <span className="up-tick" style={{ color: 'var(--ok)' }}>
            (screenshot ✓)
          </span>
        </span>
      </div>
      {ROWS.map(([k, label]) => (
        <div className="up-slip__row" key={k}>
          <span className="up-slip__k">{label}</span>
          <span className="up-slip__v">
            <span className="up-num">{show(k, f[k]!.value)}</span>
            <span className="up-tick">✓</span>
          </span>
        </div>
      ))}
      {by && (
        <div className="up-slip__row" style={{ background: 'var(--sheet-2)' }}>
          <span className="up-slip__k">Bank deadline</span>
          <span className="up-slip__v">
            Tell your bank by <strong className="up-num">{by}</strong> for zero liability (RBI, 3 working days).
          </span>
        </div>
      )}
    </div>
  );
}
