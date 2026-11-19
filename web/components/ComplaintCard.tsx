'use client';
// The complaint as it is captured during the call: each field, whether the caller confirmed
// it, the RBI deadlines, and the finished pack.
import { useEffect, useState } from 'react';
import { minutesSince } from '@/lib/complaint/pack';
import { scamById } from '@/lib/complaint/scams';
import { LANG_NAME as LANG_LABEL } from '@/lib/complaint/pack';

type Field = { value: string | number; confirmed: boolean };
type Pack =
  | { ok: false; missing: string[] }
  | { ok: true; bankLetter: string; script1930: string; operatorCard: string; reminders: string; minutesSinceDebit: number | null; deadlines: { zeroLiabilityBy: string; boardPolicyAfter: string } };
type Check = { status: 'match' | 'mismatch' | 'spoken_only' | 'screenshot_only' | 'missing'; screenshot?: string | number; groups?: number[] };
type Flag = { red_flag: string; scam: string; heard: string };
type EmailState = { id: string; at: string } | { problem: string } | null;
export type ComplaintView = {
  lang?: keyof typeof LANG_LABEL;
  hasEmail?: boolean;
  emailSent?: EmailState;
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
        {k === 'utr' ? <UtrGroups value={said} /> : <span className="up-num text-[1.25rem]">{show(k, said)}</span>}
        <span className="up-slip__k">Screenshot</span>
        {k === 'utr' ? (
          <UtrGroups value={c.screenshot ?? ''} bad={c.groups ?? []} />
        ) : (
          <span className="up-num text-[1.25rem]" style={{ color: 'var(--bad)', fontWeight: 700 }}>
            {show(k, c.screenshot ?? '')}
          </span>
        )}
      </div>
    </div>
  );
}

// What the guard listens for, in the words the guard banner uses.
const SIGNS = ['an OTP', 'a PIN', 'a QR scan', 'an app install', 'money'];

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function CalendarDay({ iso }: { iso: string }) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return (
    <span className="cd-cal" aria-hidden="true">
      <b>{MON[Number(m[2]) - 1]}</b>
      <strong>{Number(m[3])}</strong>
    </span>
  );
}

function FieldCard({
  k,
  label,
  f,
  c,
}: {
  k: keyof ComplaintView['fields'];
  label: string;
  f?: Field;
  c?: Check;
}) {
  return (
    <div className="up-card cd-field" data-field={k}>
      <div className="cd-k">
        <span>{label}</span>
        {f && <Status f={f} />}
      </div>
      {f ? (
        <p className={`cd-v${k === 'amount' ? ' cd-v--big' : ''}${k === 'when' ? ' up-num' : ''}`}>
          {k === 'payee' && (
            <span className="cd-avatar" aria-hidden="true">
              {String(f.value).charAt(0).toUpperCase()}
            </span>
          )}
          {show(k, f.value)}
        </p>
      ) : (
        <p className="cd-v cd-empty">—</p>
      )}
      <CheckNote c={c} k={k} />
    </div>
  );
}

export function ComplaintCardView({
  data,
  onScreenshot,
  onEmail,
}: {
  data: ComplaintView | null;
  onScreenshot?: (f: File) => void;
  onEmail?: (email: string) => Promise<void>;
}) {
  if (!data)
    return (
      <p className="up-card p-6 text-[1.0625rem]" style={{ color: 'var(--ink-3)' }}>
        Waiting for the call to start…
      </p>
    );
  const flags = data.flags ?? [];
  if (data.phase === 'guard' && flags.length === 0) {
    return (
      <section aria-label="Scam-call guard" className="up-card gd-listen" data-testid="guard-listening">
        <span className="gd-radar" aria-hidden="true">
          <span />
          <span />
          <span />
          <i />
        </span>
        <div>
          <h2 className="text-[1.625rem] font-bold leading-tight">Listening for scam signs…</h2>
          <p className="mt-1 text-[1.0625rem]" style={{ color: 'var(--ink-3)' }}>
            Nothing suspicious yet.
          </p>
          <div className="gd-signs" aria-label="It speaks up when the caller asks for">
            {SIGNS.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </div>
      </section>
    );
  }
  const mismatches = (['utr', 'amount', 'payee', 'when'] as const).filter((k) => data.check?.[k]?.status === 'mismatch' && data.fields[k]);
  const utr = data.fields.utr;
  const utrCheck = data.check?.utr;
  return (
    <section aria-label="Your complaint" className="flex flex-col gap-4">
      {flags.length > 0 && (
        <div className="up-alarm" data-motion-in="" data-testid="red-flags">
          <h2 className="up-alarm__kicker">Scam warning given</h2>
          <p className="up-alarm__body">
            Said aloud{data.lang && LANG_LABEL[data.lang] ? ` in ${LANG_LABEL[data.lang]}` : ''}: hang up now, never share a code, scan or pay.
          </p>
          <ul className="space-y-5">
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
          <div className="cd-progress" aria-label="Complaint progress">
            {LABELS.map(([k, label]) => {
              const f = data.fields[k];
              return (
                <span key={k} data-done={f?.confirmed ? '' : undefined} data-now={f && !f.confirmed ? '' : undefined}>
                  {f?.confirmed ? '✓ ' : ''}
                  {k === 'utr' ? 'UTR' : label}
                </span>
              );
            })}
            <span data-done={data.pack.ok ? '' : undefined}>{data.pack.ok ? '✓ ' : ''}Pack</span>
          </div>
          {data.pack.ok && <PackView pack={data.pack} emailSent={data.emailSent ?? null} onEmail={onEmail} whenValue={data.fields.when?.value} />}
          {mismatches.map((k) => (
            <Mismatch key={k} k={k} said={data.fields[k]!.value} c={data.check![k]!} />
          ))}
          <h2 className="sr-only">Your complaint</h2>
          <div className="up-card cd-utr" data-field="utr">
            <div className="cd-k">
              <span>UTR (transaction reference)</span>
              {utr && <Status f={utr} />}
            </div>
            {utr ? (
              <UtrGroups
                value={utr.value}
                state={utr.confirmed ? 'ok' : 'pending'}
                bad={utrCheck?.status === 'mismatch' ? utrCheck.groups ?? [] : []}
              />
            ) : (
              <p className="cd-v cd-empty">Say the 12 digits from your bank SMS, in pairs or one by one.</p>
            )}
            <div className="mt-2">
              <CheckNote c={utrCheck} k="utr" />
            </div>
          </div>
          <div className="cd-grid">
            {LABELS.filter(([k]) => k !== 'utr').map(([k, label]) => (
              <FieldCard key={k} k={k} label={label} f={data.fields[k]} c={data.check?.[k as 'utr']} />
            ))}
          </div>
          {data.deadlines && !data.pack.ok && (
            <div className="cd-deadline">
              <CalendarDay iso={data.deadlines.zeroLiabilityBy} />
              <div>
                <p>
                  Tell your bank by <strong>{when(data.deadlines.zeroLiabilityBy)}</strong> for zero liability (RBI, 3 working days).
                </p>
                <SinceDebit when={data.fields.when?.value} />
              </div>
            </div>
          )}
          {onScreenshot && (
            <div className="cd-shot">
              <p>Your payment screenshot lets every number be checked twice.</p>
              <label className="up-btn up-btn--ghost up-btn--sm cursor-pointer">
                {data.check ? 'Replace payment screenshot' : 'Add payment screenshot (double-checks the numbers)'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => e.target.files?.[0] && onScreenshot(e.target.files[0])}
                />
              </label>
            </div>
          )}
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

function EmailPack({ emailSent, onEmail }: { emailSent: EmailState; onEmail?: (e: string) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  if (emailSent && 'id' in emailSent) {
    return (
      <p className="text-[0.9375rem]" data-testid="email-sent">
        Emailed ✓ <span style={{ opacity: 0.8 }}>(message id {emailSent.id})</span>
      </p>
    );
  }
  if (!onEmail) return null;
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onEmail(email);
        setBusy(false);
      }}
    >
      <label className="text-[0.9375rem]" htmlFor="pack-email">
        Email me this pack:
      </label>
      <input
        id="pack-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="up-input min-w-[14rem]"
        data-testid="email-input"
      />
      <button type="submit" disabled={busy} className="up-btn up-btn--light up-btn--sm" data-testid="email-send">
        {busy ? 'Sending…' : 'Send'}
      </button>
      {emailSent && 'problem' in emailSent && (
        <span className="text-[0.875rem]" role="status">
          Couldn&apos;t send: {emailSent.problem}
        </span>
      )}
    </form>
  );
}

function PackView({
  pack,
  emailSent,
  onEmail,
  whenValue,
}: {
  pack: Extract<Pack, { ok: true }>;
  emailSent: EmailState;
  onEmail?: (e: string) => Promise<void>;
  whenValue?: string | number;
}) {
  return (
    <div className="flex flex-col gap-4" data-testid="pack">
      <div className="pk-banner">
        <h3>Ready: call 1930 now, then send this to your bank</h3>
        <div className="flex flex-wrap items-center gap-4">
          <a href="tel:1930" className="up-btn pk-call" data-testid="call-1930">
            Call 1930 now
          </a>
          <div className="flex items-center gap-3">
            <CalendarDay iso={pack.deadlines.zeroLiabilityBy} />
            <p className="max-w-[22rem] text-[1.0625rem] leading-snug">
              Tell your bank by <strong>{when(pack.deadlines.zeroLiabilityBy)}</strong> for zero liability (RBI, 3 working days).
            </p>
          </div>
        </div>
        <div className="text-[1rem]" style={{ color: 'var(--on-navy-2)' }}>
          <SinceDebit when={whenValue} />
          {pack.minutesSinceDebit !== null && <p>Complaint ready {hm(pack.minutesSinceDebit)} after the money left.</p>}
        </div>
        <div className="pk-actions">
          <a href="https://cybercrime.gov.in/" target="_blank" rel="noopener noreferrer" className="up-btn up-btn--outline-light up-btn--sm">
            Open cybercrime.gov.in to file yourself
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${pack.script1930}\n\n${pack.operatorCard}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="up-btn up-btn--outline-light up-btn--sm"
            data-testid="share-family"
          >
            Send to family on WhatsApp
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent(pack.bankLetter.split('\n').find((l) => l.startsWith('Subject:'))?.slice(9) ?? 'Fraudulent UPI transaction')}&body=${encodeURIComponent(pack.bankLetter)}`}
            className="up-btn up-btn--outline-light up-btn--sm"
            data-testid="email-bank"
          >
            Email the letter to your bank
          </a>
        </div>
        <EmailPack emailSent={emailSent} onEmail={onEmail} />
      </div>
      <div className="pk-docs">
        <Doc n={1} title="Call 1930 now and read this out" text={pack.script1930} />
        <Doc n={2} title={`Send this letter to your bank by ${when(pack.deadlines.zeroLiabilityBy)}`} text={pack.bankLetter} />
        <Doc n={3} title="If the 1930 operator asks, share this English summary" text={pack.operatorCard} />
      </div>
      <div className="up-card flex items-center gap-3 p-5">
        <span className="pk-num">4</span>
        <a
          href={`data:text/calendar;charset=utf-8,${encodeURIComponent(pack.reminders)}`}
          download="utr-pakka-reminders.ics"
          className="up-btn up-btn--ghost pk-remind"
          data-testid="reminders"
        >
          4. Add 2 reminders to my calendar (the bank deadline and the RBI 10-working-day credit date)
        </a>
      </div>
    </div>
  );
}

function Doc({ n, title, text }: { n: number; title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="up-card pk-doc">
      <div className="flex items-start gap-3">
        <span className="pk-num">{n}</span>
        <h4>{title}</h4>
      </div>
      <pre className="up-pre">{text}</pre>
      <button
        type="button"
        className="up-btn up-btn--ghost up-btn--sm w-fit"
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function ComplaintCard({ session, cap }: { session: string; cap: string }) {
  const [data, setData] = useState<ComplaintView | null>(null);
  useEffect(() => {
    let live = true;
    const tick = async () => {
      const r = await fetch(`/api/call/complaint?session=${encodeURIComponent(session)}&cap=${encodeURIComponent(cap)}`);
      if (live && r.ok) setData(await r.json());
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [session, cap]);
  const [shotState, setShotState] = useState<string | null>(null);
  async function upload(file: File) {
    setShotState('Reading the screenshot…');
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`/api/call/screenshot?session=${encodeURIComponent(session)}&cap=${encodeURIComponent(cap)}`, { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    setShotState(r.ok ? null : `Couldn't read it: ${j.error ?? r.status}`);
  }
  return (
    <>
      <ComplaintCardView
        data={data}
        onScreenshot={upload}
        onEmail={async (email) => {
          await fetch(`/api/call/email?session=${encodeURIComponent(session)}&cap=${encodeURIComponent(cap)}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, send: true }),
          });
        }}
      />
      {shotState && (
        <p className="text-[0.875rem]" style={{ color: 'var(--ink-3)' }} role="status">
          {shotState}
        </p>
      )}
    </>
  );
}
