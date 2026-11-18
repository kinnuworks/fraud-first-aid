'use client';
// The complaint as it is captured during the call: each field, whether the caller confirmed
// it, the RBI deadlines, and the finished pack. Plain on purpose until the design pass.
import { useEffect, useState } from 'react';

type Field = { value: string | number; confirmed: boolean };
type Pack =
  | { ok: false; missing: string[] }
  | { ok: true; bankLetter: string; script1930: string; deadlines: { zeroLiabilityBy: string; boardPolicyAfter: string } };
export type ComplaintView = {
  fields: Partial<Record<'utr' | 'amount' | 'when' | 'payee' | 'victim_bank', Field>>;
  missing: string[];
  deadlines: { zeroLiabilityBy: string; boardPolicyAfter: string } | null;
  pack: Pack;
};

const LABELS: Array<[keyof ComplaintView['fields'], string]> = [
  ['utr', 'UTR (transaction reference)'],
  ['amount', 'Amount lost'],
  ['when', 'When'],
  ['payee', 'Money went to'],
  ['victim_bank', 'Your bank'],
];

const show = (k: string, v: string | number) =>
  k === 'utr' ? String(v).replace(/(\d{4})(?=\d)/g, '$1 ') : k === 'amount' ? `₹${Number(v).toLocaleString('en-IN')}` : String(v);

export function ComplaintCardView({ data }: { data: ComplaintView | null }) {
  if (!data) return <p className="text-sm text-muted-foreground">Waiting for the call to start…</p>;
  return (
    <section aria-label="Your complaint" className="rounded-lg border border-border p-4 text-sm">
      <h2 className="mb-3 font-semibold">Your complaint</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {LABELS.map(([k, label]) => {
          const f = data.fields[k];
          return (
            <div key={k} className="contents" data-field={k}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono">
                {f ? `${show(k, f.value)} ${f.confirmed ? '✓ confirmed' : '(checking…)'}` : '—'}
              </dd>
            </div>
          );
        })}
      </dl>
      {data.deadlines && (
        <p className="mt-3">
          Tell your bank by <strong>{data.deadlines.zeroLiabilityBy}</strong> for zero liability (RBI, 3 working days).
        </p>
      )}
      {data.pack.ok && <PackView pack={data.pack} />}
    </section>
  );
}

function PackView({ pack }: { pack: Extract<Pack, { ok: true }> }) {
  return (
    <div className="mt-4 space-y-3" data-testid="pack">
      <h3 className="font-semibold">Ready: call 1930 now, then send this to your bank</h3>
      <Copyable title="What to say on 1930" text={pack.script1930} />
      <Copyable title="Letter for your bank" text={pack.bankLetter} />
    </div>
  );
}

function Copyable({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-medium">{title}</span>
        <button type="button" className="rounded border px-2 py-0.5 text-xs" onClick={() => navigator.clipboard?.writeText(text)}>
          Copy
        </button>
      </div>
      <pre className="mt-1 whitespace-pre-wrap rounded bg-muted p-2 text-xs">{text}</pre>
    </div>
  );
}

export function ComplaintCard({ session }: { session: string }) {
  const [data, setData] = useState<ComplaintView | null>(null);
  useEffect(() => {
    let live = true;
    const tick = async () => {
      const r = await fetch(`/api/call/complaint?session=${encodeURIComponent(session)}`);
      if (live && r.ok) setData(await r.json());
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [session]);
  return <ComplaintCardView data={data} />;
}
