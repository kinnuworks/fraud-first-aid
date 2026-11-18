'use client';
// The complaint as it is captured during the call: each field, whether the caller confirmed
// it, the RBI deadlines, and the finished pack. Plain on purpose until the design pass.
import { useEffect, useState } from 'react';
import { minutesSince } from '@/lib/complaint/pack';
import { scamById } from '@/lib/complaint/scams';

type Field = { value: string | number; confirmed: boolean };
type Pack =
  | { ok: false; missing: string[] }
  | { ok: true; bankLetter: string; script1930: string; operatorCard: string; minutesSinceDebit: number | null; deadlines: { zeroLiabilityBy: string; boardPolicyAfter: string } };
type Check = { status: 'match' | 'mismatch' | 'spoken_only' | 'screenshot_only' | 'missing'; screenshot?: string | number; groups?: number[] };
type Flag = { red_flag: string; scam: string; heard: string };
export type ComplaintView = {
  phase?: 'guard' | 'complaint';
  flags?: Flag[];
  fields: Partial<Record<'utr' | 'amount' | 'when' | 'payee' | 'victim_bank', Field>>;
  check?: Partial<Record<'utr' | 'amount' | 'payee' | 'when', Check>> | null;
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

// "2026-11-19T14:30" -> "19 Nov 2026, 2:30 pm" (Indian time, as recorded)
const when = (v: string) => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return v;
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1];
  const date = `${Number(m[3])} ${mon} ${m[1]}`;
  if (!m[4]) return date;
  const h = Number(m[4]);
  return `${date}, ${h % 12 || 12}:${m[5]} ${h < 12 ? 'am' : 'pm'}`;
};

const show = (k: string, v: string | number) =>
  k === 'utr'
    ? String(v).replace(/(\d{4})(?=\d)/g, '$1 ')
    : k === 'amount'
      ? `₹${Number(v).toLocaleString('en-IN')}`
      : k === 'when'
        ? when(String(v))
        : String(v);

const CHECK_TEXT: Record<Check['status'], string> = {
  match: 'screenshot ✓',
  mismatch: 'screenshot differs',
  spoken_only: 'not on screenshot',
  screenshot_only: 'on screenshot',
  missing: '',
};

function CheckNote({ c, k }: { c?: Check; k: string }) {
  if (!c || c.status === 'missing') return null;
  const extra = c.status === 'mismatch' || c.status === 'screenshot_only' ? `: ${show(k, c.screenshot!)}` : '';
  return (
    <span data-check={c.status} className={`ml-2 text-xs ${c.status === 'mismatch' ? 'text-destructive' : 'text-muted-foreground'}`}>
      ({CHECK_TEXT[c.status]}{extra})
    </span>
  );
}

export function ComplaintCardView({ data, onScreenshot }: { data: ComplaintView | null; onScreenshot?: (f: File) => void }) {
  if (!data) return <p className="text-sm text-muted-foreground">Waiting for the call to start…</p>;
  const flags = data.flags ?? [];
  if (data.phase === 'guard' && flags.length === 0) {
    return (
      <section aria-label="Scam-call guard" className="rounded-lg border border-border p-4 text-sm" data-testid="guard-listening">
        <h2 className="font-semibold">Listening for scam signs…</h2>
        <p className="mt-1 text-muted-foreground">Nothing suspicious yet.</p>
      </section>
    );
  }
  return (
    <section aria-label="Your complaint" className="rounded-lg border border-border p-4 text-sm">
      {flags.length > 0 && (
        <div className="mb-3 rounded border border-destructive/60 p-2" data-testid="red-flags">
          <h2 className="font-semibold text-destructive">Scam warning given</h2>
          <ul className="mt-1 space-y-1">
            {flags.map((f, i) => {
              const s = scamById(f.scam);
              return (
                <li key={i}>
                  <strong>{s?.name ?? f.scam}</strong>: the caller {f.red_flag}.{' '}
                  <span className="text-muted-foreground">Heard: “{f.heard}”</span>
                  {s && (
                    <p className="mt-1 text-xs">
                      “{s.official}”{' '}
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
                        {s.source}
                      </a>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {data.phase === 'guard' ? null : (
      <>
      <h2 className="mb-3 font-semibold">Your complaint</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        {LABELS.map(([k, label]) => {
          const f = data.fields[k];
          return (
            <div key={k} className="contents" data-field={k}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono">
                {f ? `${show(k, f.value)} ${f.confirmed ? '✓ confirmed' : '(checking…)'}` : '—'}
                <CheckNote c={data.check?.[k as 'utr']} k={k} />
              </dd>
            </div>
          );
        })}
      </dl>
      {onScreenshot && (
        <label className="mt-3 inline-block cursor-pointer rounded border px-2 py-1 text-xs">
          {data.check ? 'Replace payment screenshot' : 'Add payment screenshot (double-checks the numbers)'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && onScreenshot(e.target.files[0])}
          />
        </label>
      )}
      <SinceDebit when={data.fields.when?.value} />
      {data.deadlines && (
        <p className="mt-3">
          Tell your bank by <strong>{data.deadlines.zeroLiabilityBy}</strong> for zero liability (RBI, 3 working days).
        </p>
      )}
      {data.pack.ok && <PackView pack={data.pack} />}
      </>
      )}
    </section>
  );
}

const hm = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

// Time since the money left: the first hours decide whether it can still be held.
function SinceDebit({ when }: { when?: string | number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const m = typeof when === 'string' ? minutesSince(when, now) : null;
  if (m === null) return null;
  return (
    <p className="mt-3" data-testid="since-debit">
      Money left your account <strong>{hm(m)}</strong> ago. Report it now: the sooner 1930 hears, the better the chance it is held.
    </p>
  );
}

function PackView({ pack }: { pack: Extract<Pack, { ok: true }> }) {
  return (
    <div className="mt-4 space-y-3" data-testid="pack">
      <h3 className="font-semibold">Ready: call 1930 now, then send this to your bank</h3>
      <div className="flex flex-wrap gap-2">
        <a href="tel:1930" className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-black" data-testid="call-1930">
          Call 1930 now
        </a>
        <a
          href="https://cybercrime.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border px-3 py-1.5 text-sm"
        >
          File on cybercrime.gov.in
        </a>
      </div>
      {pack.minutesSinceDebit !== null && (
        <p className="text-xs text-muted-foreground">Complaint ready {hm(pack.minutesSinceDebit)} after the money left.</p>
      )}
      <Copyable title="1. Call 1930 now and read this out" text={pack.script1930} />
      <Copyable title={`2. Send this letter to your bank by ${when(pack.deadlines.zeroLiabilityBy)}`} text={pack.bankLetter} />
      <Copyable title="3. If the 1930 operator asks, share this English summary" text={pack.operatorCard} />
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
  const [shotState, setShotState] = useState<string | null>(null);
  async function upload(file: File) {
    setShotState('Reading the screenshot…');
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`/api/call/screenshot?session=${encodeURIComponent(session)}`, { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    setShotState(r.ok ? null : `Couldn't read it: ${j.error ?? r.status}`);
  }
  return (
    <>
      <ComplaintCardView data={data} onScreenshot={upload} />
      {shotState && <p className="text-xs text-muted-foreground" role="status">{shotState}</p>}
    </>
  );
}
