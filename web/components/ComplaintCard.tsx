'use client';
// The complaint as it is captured during the call: each field, whether the caller confirmed
// it, the RBI deadlines, and the finished pack.
import { useEffect, useState } from 'react';
import { minutesSince } from '@/lib/complaint/pack';
import { scamById } from '@/lib/complaint/scams';

type Field = { value: string | number; confirmed: boolean };
type Pack =
  | { ok: false; missing: string[] }
  | { ok: true; bankLetter: string; script1930: string; operatorCard: string; reminders: string; minutesSinceDebit: number | null; deadlines: { zeroLiabilityBy: string; boardPolicyAfter: string } };
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
export const when = (v: string) => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return v;
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1];
  const date = `${Number(m[3])} ${mon} ${m[1]}`;
  if (!m[4]) return date;
  const h = Number(m[4]);
  return `${date}, ${h % 12 || 12}:${m[5]} ${h < 12 ? 'am' : 'pm'}`;
};

export const show = (k: string, v: string | number) =>
  k === 'utr'
    ? String(v).replace(/(\d{4})(?=\d)/g, '$1 ')
    : k === 'amount'
      ? `₹${Number(v).toLocaleString('en-IN')}`
      : k === 'when'
        ? when(String(v))
        : String(v);

// The UTR as groups of four, each group boxed like the digits on a railway ticket.
export function UtrGroups({
  value,
  state = 'plain',
  bad = [],
  small = false,
}: {
  value: string | number;
  state?: 'plain' | 'ok' | 'pending';
  bad?: number[];
  small?: boolean;
}) {
  const groups = String(value).match(/\d{1,4}/g) ?? [String(value)];
  return (
    <span className={`up-utr${small ? ' up-utr--sm' : ''}`} aria-label={show('utr', value)}>
      {groups.map((g, i) => (
        <span key={i} className="up-utr__g" data-state={bad.includes(i + 1) ? 'bad' : state === 'plain' ? undefined : state}>
          {g}
        </span>
      ))}
    </span>
  );
}

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
    <span
      data-check={c.status}
      className="ml-2 text-[0.8125rem]"
      style={{ color: c.status === 'mismatch' ? 'var(--bad)' : c.status === 'match' ? 'var(--ok)' : 'var(--ink-3)', fontWeight: c.status === 'mismatch' ? 700 : 500 }}
    >
      ({CHECK_TEXT[c.status]}{extra})
    </span>
  );
}

function Status({ f }: { f: Field }) {
  return f.confirmed ? <span className="up-tick">✓ confirmed</span> : <span className="up-pending">(checking…)</span>;
}

// The screenshot mismatch, big enough to read from a projector: what was said against what the
// screenshot shows, with the differing group of four marked.
function Mismatch({ k, said, c }: { k: string; said: string | number; c: Check }) {
  return (
    <div className="up-mismatch" role="alert">
      <p className="up-mismatch__title">Screenshot differs</p>
      <div className="up-mismatch__grid">
        <span className="up-slip__k">You said</span>
        {k === 'utr' ? <UtrGroups value={said} small /> : <span className="up-num">{show(k, said)}</span>}
        <span className="up-slip__k">Screenshot</span>
        {k === 'utr' ? (
          <UtrGroups value={c.screenshot ?? ''} bad={c.groups ?? []} small />
        ) : (
          <span className="up-num" style={{ color: 'var(--bad)', fontWeight: 700 }}>
            {show(k, c.screenshot ?? '')}
          </span>
        )}
      </div>
    </div>
  );
}

export function ComplaintCardView({ data, onScreenshot }: { data: ComplaintView | null; onScreenshot?: (f: File) => void }) {
  if (!data) return <p className="up-card p-5 text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>Waiting for the call to start…</p>;
  const flags = data.flags ?? [];
  if (data.phase === 'guard' && flags.length === 0) {
    return (
      <section aria-label="Scam-call guard" className="up-card p-5" data-testid="guard-listening">
        <h2 className="flex items-center text-[1.25rem] font-semibold">
          <span className="up-dot animate-pulse" aria-hidden="true" />
          Listening for scam signs…
        </h2>
        <p className="mt-1" style={{ color: 'var(--ink-3)' }}>Nothing suspicious yet.</p>
      </section>
    );
  }
  const mismatches = (['utr', 'amount', 'payee', 'when'] as const).filter((k) => data.check?.[k]?.status === 'mismatch' && data.fields[k]);
  return (
    <section aria-label="Your complaint" className="flex flex-col gap-4">
      {flags.length > 0 && (
        <div className="up-alarm" data-motion-in="" data-testid="red-flags">
          <h2 className="up-alarm__kicker">Scam warning given</h2>
          <ul className="space-y-4">
            {flags.map((f, i) => {
              const s = scamById(f.scam);
              return (
                <li key={i}>
                  <p className="up-alarm__title">{s?.name ?? f.scam}</p>
                  <p className="up-alarm__body">
                    The caller {f.red_flag}. <span style={{ opacity: 0.9 }}>Heard: “{f.heard}”</span>
                  </p>
                  {s && (
                    <p className="up-alarm__quote">
                      “{s.official}”{' '}
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
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
          {data.pack.ok && <PackView pack={data.pack} />}
          {mismatches.map((k) => (
            <Mismatch key={k} k={k} said={data.fields[k]!.value} c={data.check![k]!} />
          ))}
          <div className="up-slip">
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
              <h2 className="text-[1.25rem] font-semibold">Your complaint</h2>
            </div>
            <dl>
              {LABELS.map(([k, label]) => {
                const f = data.fields[k];
                const c = data.check?.[k as 'utr'];
                return (
                  <div key={k} className="up-slip__row" data-field={k}>
                    <dt className="up-slip__k">{label}</dt>
                    <dd className="up-slip__v">
                      {f ? (
                        <>
                          {k === 'utr' ? (
                            <UtrGroups
                              value={f.value}
                              state={f.confirmed ? 'ok' : 'pending'}
                              bad={c?.status === 'mismatch' ? c.groups ?? [] : []}
                            />
                          ) : (
                            <span className="up-num">{show(k, f.value)}</span>
                          )}
                          <Status f={f} />
                        </>
                      ) : (
                        <span style={{ color: 'var(--ink-3)' }}>—</span>
                      )}
                      <CheckNote c={c} k={k} />
                    </dd>
                  </div>
                );
              })}
            </dl>
            <div className="up-slip__foot">
              {onScreenshot && (
                <label className="up-btn up-btn--ghost up-btn--sm w-fit cursor-pointer">
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
              {data.deadlines && !data.pack.ok && (
                <p className="text-[1.0625rem]">
                  Tell your bank by <strong className="up-num">{when(data.deadlines.zeroLiabilityBy)}</strong> for zero liability (RBI, 3 working days).
                </p>
              )}
            </div>
          </div>
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
    <p data-testid="since-debit">
      Money left your account <strong className="up-num">{hm(m)}</strong> ago. Report it now: the sooner 1930 hears, the better the chance it is held.
    </p>
  );
}

function PackView({ pack }: { pack: Extract<Pack, { ok: true }> }) {
  return (
    <div className="up-card flex flex-col gap-5 p-5" data-testid="pack">
      <h3 className="text-[1.375rem] font-semibold leading-tight">Ready: call 1930 now, then send this to your bank</h3>
      <div className="flex flex-wrap items-center gap-3">
        <a href="tel:1930" className="up-btn" data-testid="call-1930">
          Call 1930 now
        </a>
        <a href="https://cybercrime.gov.in/" target="_blank" rel="noopener noreferrer" className="up-btn up-btn--ghost">
          File on cybercrime.gov.in
        </a>
      </div>
      <p className="text-[1.0625rem]">
        Tell your bank by <strong className="up-num">{when(pack.deadlines.zeroLiabilityBy)}</strong> for zero liability (RBI, 3 working days).
      </p>
      {pack.minutesSinceDebit !== null && (
        <p className="text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
          Complaint ready {hm(pack.minutesSinceDebit)} after the money left.
        </p>
      )}
      <Copyable title="1. Call 1930 now and read this out" text={pack.script1930} />
      <Copyable title={`2. Send this letter to your bank by ${when(pack.deadlines.zeroLiabilityBy)}`} text={pack.bankLetter} />
      <Copyable title="3. If the 1930 operator asks, share this English summary" text={pack.operatorCard} />
      <a
        href={`data:text/calendar;charset=utf-8,${encodeURIComponent(pack.reminders)}`}
        download="utr-pakka-reminders.ics"
        className="up-btn up-btn--ghost w-fit"
        data-testid="reminders"
      >
        4. Add 2 reminders to my calendar (bank deadline and refund date)
      </a>
    </div>
  );
}

function Copyable({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <button
          type="button"
          className="up-btn up-btn--ghost up-btn--sm"
          onClick={() => {
            navigator.clipboard?.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="up-pre mt-2">{text}</pre>
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
      {shotState && (
        <p className="text-[0.875rem]" style={{ color: 'var(--ink-3)' }} role="status">
          {shotState}
        </p>
      )}
    </>
  );
}
