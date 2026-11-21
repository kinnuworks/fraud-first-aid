'use client';
// The complaint as it is captured during the call: each field, whether the caller confirmed
// it, the RBI deadlines, and the finished pack.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { minutesSince } from '@/lib/complaint/pack';
import { scamById } from '@/lib/complaint/scams';
import { stageOf, stagesSeen, STAGE_NAMES } from '@/lib/complaint/stages';
import { LANG_NAME as LANG_LABEL } from '@/lib/complaint/pack';
import { LiveSystem } from './LiveSystem';

type Field = { value: string | number; confirmed: boolean };
type Pack =
  | { ok: false; missing: string[] }
  | { ok: true; bankLetter: string; script1930: string; operatorCard: string; reminders: string; bankLine?: { bank: string; phone: string; source: string } | null; portalSheet?: string; nextSteps?: string; ombudsmanDraft?: string; callRecord?: string; minutesSinceDebit: number | null; deadlines: { zeroLiabilityBy: string; boardPolicyAfter: string } };
type Check = { status: 'match' | 'mismatch' | 'spoken_only' | 'screenshot_only' | 'shown' | 'missing'; screenshot?: string | number; groups?: number[] };
type Flag = { red_flag: string; scam: string; heard: string };
type EmailState = { id: string; at: string } | { problem: string } | null;
export type ComplaintView = {
  lang?: keyof typeof LANG_LABEL;
  hasEmail?: boolean;
  emailSent?: EmailState;
  phase?: 'guard' | 'complaint' | 'interpret';
  ack1930?: string | null;
  actions?: Array<{ at: string; kind: 'heard' | 'check' | 'tool' | 'ask' | 'done' | 'flag'; text: string }>;
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
  shown: 'screenshot shows',
  missing: '',
};

function CheckNote({ c, k }: { c?: Check; k: string }) {
  if (!c || c.status === 'missing') return null;
  const extra = c.status === 'mismatch' || c.status === 'screenshot_only' || c.status === 'shown' ? `: ${show(k, c.screenshot!)}` : '';
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

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// The bank deadline as a month calendar: the day the money left, and the day the bank must hear by.
const todayIstYm = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 7);

function DeadlineCalendar({ data }: { data: ComplaintView }) {
  const [today] = useState(() => new Date());
  const debitIso = typeof data.fields.when?.value === 'string' ? data.fields.when.value.slice(0, 10) : null;
  const deadlineIso = data.deadlines?.zeroLiabilityBy ?? null;
  const anchor = deadlineIso ?? debitIso;
  const year = anchor ? Number(anchor.slice(0, 4)) : Number(todayIstYm().slice(0, 4));
  const month = anchor ? Number(anchor.slice(5, 7)) - 1 : Number(todayIstYm().slice(5, 7)) - 1;
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const iso = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // today in India, whatever time zone the viewer's device is set to
  const todayIso = new Date(today.getTime() + 330 * 60000).toISOString().slice(0, 10);
  return (
    <section aria-label="Bank deadline">
      <span className="up-label">Bank deadline</span>
      <div className="cal-head">
        <span>
          {MONTHS[month]} {year}
        </span>
      </div>
      <div className="cal-grid" aria-hidden="true">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <b key={d}>{d}</b>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <i key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1;
          const k = iso(d);
          return (
            <span
              key={d}
              data-deadline={k === deadlineIso ? '' : undefined}
              data-debit={k === debitIso ? '' : undefined}
              data-today={k === todayIso && k !== deadlineIso ? '' : undefined}
            >
              {d}
            </span>
          );
        })}
      </div>
      {deadlineIso ? (
        <>
          <div className="cal-legend">
            <span>
              <i style={{ boxShadow: 'inset 0 0 0 1.5px var(--side-edge)' }} />
              Money left
            </span>
            <span>
              <i style={{ background: 'var(--side-mark-bg)' }} />
              Tell your bank by
            </span>
          </div>
          <div className="cal-rows">
            {debitIso && (
              <div>
                <span>Money left</span>
                <span>{when(String(data.fields.when!.value))}</span>
              </div>
            )}
            <div>
              <span>Tell your bank by</span>
              <span>{when(deadlineIso)}</span>
            </div>
            <div>
              <span>RBI rule</span>
              <span>3 working days for zero liability</span>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-[0.9375rem]" style={{ color: 'var(--side-ink-2)' }}>
          The date appears here once you say when the money left.
        </p>
      )}
    </section>
  );
}

// Puts the calendar into the navy call panel when the page has one; otherwise shows it inline.
function CalendarSlot({ data }: { data: ComplaintView }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setSlot(document.getElementById('cs-deadline-slot'));
    setChecked(true);
  }, []);
  if (!checked) return null;
  if (slot) return createPortal(<DeadlineCalendar data={data} />, slot);
  return (
    <div className="cs-side">
      <DeadlineCalendar data={data} />
    </div>
  );
}

const BANK = (v?: string | number) => {
  const m = typeof v === 'string' ? v.match(/^(.*?)\s*\(([A-Z]{4}0[A-Z0-9]{6})\)\s*$/) : null;
  const full = m ? m[1] : v ? String(v) : null;
  const [name, branch] = full ? full.split(/,\s*/) : [null, null];
  return { name, branch: branch ?? null, ifsc: m ? m[2] : null };
};

function Row({ k, label, f, c, children }: { k: string; label: string; f?: Field; c?: Check; children?: React.ReactNode }) {
  return (
    <div className="cd-row" data-field={k}>
      <span>{label}</span>
      <span>
        {f ? children ?? show(k, f.value) : <span className="cd-muted">—</span>}
        {f && <Status f={f} />}
        <CheckNote c={c} k={k} />
      </span>
    </div>
  );
}

export function ComplaintCardView({
  data,
  onScreenshot,
  onEmail,
  onInterpret,
  agentState,
  watching,
}: {
  data: ComplaintView | null;
  onScreenshot?: (f: File) => void;
  onEmail?: (email: string) => Promise<string | null>;
  onInterpret?: () => Promise<string | null>;
  // the live call's Agora agent state (RTM); absent on previews and shared views
  agentState?: string | null;
  // the read-only watch page of a live call (a phone call, a shared view)
  watching?: boolean;
}) {
  if (!data)
    return (
      <p className="cd-card text-[1.0625rem]" style={{ color: 'var(--ink-3)' }}>
        Waiting for the call to start…
      </p>
    );
  const flags = data.flags ?? [];
  if (data.phase === 'guard' && flags.length === 0) {
    return (
      <>
        <section aria-label="Scam-call guard" className="cd-card gd-listen" data-testid="guard-listening">
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
        <LiveSystem actions={data.actions} agentState={agentState} phase={data.phase} watching={watching} />
      </>
    );
  }
  const mismatches = (['utr', 'amount', 'payee', 'when'] as const).filter((k) => data.check?.[k]?.status === 'mismatch' && data.fields[k]);
  const f = data.fields;
  const utrCheck = data.check?.utr;
  const done = LABELS.filter(([k]) => f[k]?.confirmed).length;
  const bank = BANK(f.victim_bank?.value);
  const shotStatus = (k: 'utr' | 'amount' | 'payee') => {
    const c = data.check?.[k];
    if (!c) return 'not added';
    return c.status === 'match' ? 'matches' : c.status === 'mismatch' ? 'differs' : c.status === 'spoken_only' ? 'not on screenshot' : c.status === 'shown' ? 'shown, not compared' : 'on screenshot';
  };
  return (
    <section aria-label="Your complaint" className="flex flex-col gap-5" id="complaint">
      {flags.length > 0 && (
        <div className="up-alarm" data-motion-in="" data-testid="red-flags">
          <h2 className="up-alarm__kicker">Scam warning given</h2>
          <p className="up-alarm__body">
            Said aloud{data.lang && LANG_LABEL[data.lang] ? ` in ${LANG_LABEL[data.lang]}` : ''}: hang up now, never share a code, scan or pay.
          </p>
          <ul className="space-y-5">
            {flags.map((fl, i) => {
              const sc = scamById(fl.scam);
              return (
                <li key={i}>
                  <p className="up-alarm__title">{sc?.name ?? fl.scam}</p>
                  <p className="up-alarm__body">
                    The caller {fl.red_flag}. <span style={{ opacity: 0.9 }}>Heard: “{fl.heard}”</span>
                  </p>
                  {sc && (
                    <p className="up-alarm__quote">
                      “{sc.official}”{' '}
                      <a href={sc.url} target="_blank" rel="noopener noreferrer">
                        {sc.source}
                      </a>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <AgentSteps actions={data.actions} />
      <LiveSystem actions={data.actions} agentState={agentState} phase={data.phase} watching={watching} />
      {data.phase === 'guard' ? null : (
        <>
          <CalendarSlot data={data} />
          <div className="cd-head">
            <span className="up-label">
              {data.lang && LANG_LABEL[data.lang] ? `Speaking ${LANG_LABEL[data.lang]} · ` : ''}
              {done} of 5 details confirmed
            </span>
            <span className="text-[0.9375rem]" style={{ color: 'var(--ink-2)' }}>
              <SinceDebit when={f.when?.value} />
            </span>
          </div>
          {data.pack.ok && <PackView pack={data.pack} emailSent={data.emailSent ?? null} onEmail={onEmail} interpreter={<Interpreter data={data} onInterpret={onInterpret} />} lang={data.lang} />}
          {mismatches.map((k) => (
            <Mismatch key={k} k={k} said={f[k]!.value} c={data.check![k]!} />
          ))}
          <h2 className="sr-only">Your complaint</h2>
          <div className="cd-card" data-field="utr">
            <div className="cd-k">
              <span>UTR (transaction reference)</span>
              {f.utr && <Status f={f.utr} />}
            </div>
            {f.utr ? (
              <p className="cd-utr" aria-label={show('utr', f.utr.value)}>
                {(String(f.utr.value).match(/\d{1,4}/g) ?? []).map((g, i) => (
                  <span
                    key={i}
                    data-state={
                      utrCheck?.status === 'mismatch' && (utrCheck.groups ?? []).includes(i + 1) ? 'bad' : f.utr!.confirmed ? undefined : 'pending'
                    }
                  >
                    {g}
                  </span>
                ))}
              </p>
            ) : (
              <p className="cd-utr-empty">Say the 12 digits from your bank SMS, in pairs or one by one.</p>
            )}
            <div className="cd-sub">
              <CheckNote c={utrCheck} k="utr" />
            </div>
          </div>
          <div className="cd-pair">
            <div className="cd-card cd-bank">
              <div className="cd-bank-title" data-field="victim_bank">
                <i aria-hidden="true" />
                <span className="flex-1">{bank.name ?? 'Your bank'}</span>
                {f.victim_bank ? <Status f={f.victim_bank} /> : <span className="cd-muted normal-case tracking-normal">not said yet</span>}
              </div>
              <div className="cd-big" data-field="amount">
                <p className="cd-k">
                  <span>Amount lost</span>
                  {f.amount && <Status f={f.amount} />}
                </p>
                <p className={`cd-bigv${f.amount ? '' : ' cd-muted'}`}>{f.amount ? show('amount', f.amount.value) : '—'}</p>
                <CheckNote c={data.check?.amount} k="amount" />
              </div>
              <Row k="when" label="When" f={f.when} c={data.check?.when} />
              <div className="cd-row">
                <span>Branch</span>
                <span className={bank.branch ? '' : 'cd-muted'}>{bank.branch ?? '—'}</span>
              </div>
              <div className="cd-row">
                <span>IFSC code</span>
                <span className={bank.ifsc ? 'up-num' : 'cd-muted'}>{bank.ifsc ?? '—'}</span>
              </div>
            </div>
            <div className="cd-card cd-bank">
              <div className="cd-bank-title">
                <i aria-hidden="true" style={{ background: 'var(--marker)' }} />
                <span className="flex-1">Money went to</span>
              </div>
              <div className="cd-big" data-field="payee">
                <p className="cd-k">
                  <span>UPI ID or number</span>
                  {f.payee && <Status f={f.payee} />}
                </p>
                <p className={`cd-bigv cd-bigv--id${f.payee ? '' : ' cd-muted'}`}>
                  {f.payee
                    ? String(f.payee.value)
                        .split('@')
                        .flatMap((part, i) => (i === 0 ? [part] : [<wbr key={i} />, `@${part}`]))
                    : '—'}
                </p>
                <CheckNote c={data.check?.payee} k="payee" />
              </div>
              <div className="cd-row">
                <span>Screenshot</span>
                <span>{shotStatus('utr')}</span>
              </div>
              <div className="cd-row">
                <span>Status</span>
                <span>{data.pack.ok ? 'ready to file' : done === 5 ? 'all confirmed' : 'checking'}</span>
              </div>
            </div>
          </div>
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

function EmailPack({ emailSent, onEmail }: { emailSent: EmailState; onEmail?: (e: string) => Promise<string | null> }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  if (emailSent && 'id' in emailSent) {
    return (
      <p className="text-[0.9375rem]" data-testid="email-sent">
        Emailed ✓ <span style={{ color: 'var(--ink-3)' }}>(message id {emailSent.id})</span>
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
        setProblem(null);
        try {
          setProblem(await onEmail(email));
        } finally {
          setBusy(false);
        }
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
      <button type="submit" disabled={busy} className="up-btn up-btn--ghost up-btn--sm" data-testid="email-send">
        {busy ? 'Sending…' : 'Send'}
      </button>
      {(problem || (emailSent && 'problem' in emailSent)) && (
        <span className="text-[0.875rem]" role="status">
          Couldn&apos;t send: {problem ?? (emailSent && 'problem' in emailSent ? emailSent.problem : '')}
        </span>
      )}
    </form>
  );
}

function PackView({
  pack,
  emailSent,
  onEmail,
  interpreter,
  lang,
}: {
  lang?: string;
  pack: Extract<Pack, { ok: true }>;
  emailSent: EmailState;
  onEmail?: (e: string) => Promise<string | null>;
  interpreter?: ReactNode;
}) {
  return (
    <div className="cd-card" data-testid="pack" id="pack">
      <div className="pk-hero">
        <div>
          <span className="up-label">Your pack is ready</span>
          <h3 className="mt-2">Ready: call 1930 now, then send this to your bank</h3>
          <p className="mt-2 text-[1.0625rem]" style={{ color: 'var(--ink-2)' }}>
            Tell your bank by <strong>{when(pack.deadlines.zeroLiabilityBy)}</strong> for zero liability (RBI, 3 working days).
          </p>
          {pack.bankLine && (
            <div className="pk-bank" data-testid="bank-line">
              <span className="pk-bank__k">{pack.bankLine.bank} fraud line</span>
              {/^\d/.test(pack.bankLine.phone) ? (
                <a className="pk-bank__num" href={`tel:${pack.bankLine.phone.split(' or ')[0].replace(/\D/g, '')}`}>
                  {pack.bankLine.phone}
                </a>
              ) : (
                <strong className="pk-bank__num">{pack.bankLine.phone}</strong>
              )}
              <a className="pk-bank__src" href={pack.bankLine.source} target="_blank" rel="noopener noreferrer">
                (from the bank&apos;s site)
              </a>
            </div>
          )}
          {pack.minutesSinceDebit !== null && (
            <p className="mt-1 text-[0.9375rem]" style={{ color: 'var(--ink-3)' }}>
              Complaint ready {hm(pack.minutesSinceDebit)} after the money left.
            </p>
          )}
        </div>
        <a href="tel:1930" className="up-btn pk-call" data-testid="call-1930">
          Call 1930 now
        </a>
      </div>
      {interpreter}
      <div className="pk-list">
        <PackItem n={1} title="Call 1930 now and read this out" text={pack.script1930} open lang={lang} />
        <PackItem n={2} title={`Send this letter to your bank by ${when(pack.deadlines.zeroLiabilityBy)}`} text={pack.bankLetter} />
        <PackItem n={3} title="If the 1930 operator asks, share this English summary" text={pack.operatorCard} />
        {pack.callRecord && <PackItem n={4} title="The scam call as Fraud First Aid heard it, with the red flags marked (evidence for 1930 and the cyber cell)" text={pack.callRecord} />}
        <div className="flex items-center gap-[14px] py-[14px]">
          <span className="pk-num">{pack.callRecord ? 5 : 4}</span>
          <a
            href={`data:text/calendar;charset=utf-8,${encodeURIComponent(pack.reminders)}`}
            download="fraud-first-aid-reminders.ics"
            className="up-link pk-remind font-semibold"
            data-testid="reminders"
          >
            Add 3 reminders to my calendar (the bank deadline, the RBI 10-working-day credit date, and day 30: did the bank reply?)
          </a>
        </div>
        {(pack.portalSheet || pack.nextSteps) && <p className="pk-group">If you need more</p>}
        {pack.portalSheet && <PackItem n={pack.callRecord ? 6 : 5} title="Filing online yourself? Every field in the portal's order" text={pack.portalSheet} />}
        {pack.nextSteps && <PackItem n={pack.callRecord ? 7 : 6} title="If the bank doesn't fix it: the next three steps" text={pack.nextSteps} />}
        {pack.ombudsmanDraft && <PackItem n={pack.callRecord ? 8 : 7} title="Day 30, if the bank hasn't replied: your RBI Ombudsman complaint, ready to paste" text={pack.ombudsmanDraft} />}
      </div>
      <div className="pk-actions">
        <a href="https://cybercrime.gov.in/" target="_blank" rel="noopener noreferrer" className="up-btn up-btn--ghost up-btn--sm">
          Open cybercrime.gov.in to file yourself
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${pack.script1930}\n\n${pack.operatorCard}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="up-btn up-btn--ghost up-btn--sm"
          data-testid="share-family"
        >
          Send to family on WhatsApp
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(pack.bankLetter.split('\n').find((l) => l.startsWith('Subject:'))?.slice(9) ?? 'Fraudulent UPI transaction')}&body=${encodeURIComponent(pack.bankLetter)}`}
          className="up-btn up-btn--ghost up-btn--sm"
          data-testid="email-bank"
        >
          Email the letter to your bank
        </a>
      </div>
      <div className="mt-4">
        <EmailPack emailSent={emailSent} onEmail={onEmail} />
      </div>
    </div>
  );
}

// What the agent has done on this call, newest last: each step it heard, checked, looked up, asked
// or finished, logged by the server as it happens (lib/complaint/session.ts act()).
const STEP_ICON: Record<NonNullable<ComplaintView['actions']>[number]['kind'], string> = {
  heard: '●', check: '◆', tool: '⚙', ask: '?', done: '✓', flag: '!',
};
function AgentSteps({ actions }: { actions?: ComplaintView['actions'] }) {
  if (!actions?.length) return null;
  const recent = actions.slice(-7);
  const seen = stagesSeen(actions);
  return (
    <section className="cd-card as-card" aria-label="What Fraud First Aid is doing" data-testid="agent-steps">
      <div className="as-head">
        <span className="up-label">What it&apos;s doing</span>
        <span className="as-live" aria-hidden="true">live</span>
      </div>
      <ol className="as-stages" aria-label="The five stages: which this call has reached">
        {STAGE_NAMES.map((name, i) => (
          <li key={name} className={`as-stage${seen.has(i as 0 | 1 | 2 | 3 | 4) ? ' is-on' : ''}`}>
            <span className="as-stage-n" aria-hidden="true">
              {seen.has(i as 0 | 1 | 2 | 3 | 4) ? '✓' : i + 1}
            </span>
            {name}
            <span className="sr-only">{seen.has(i as 0 | 1 | 2 | 3 | 4) ? ': reached' : ': not yet'}</span>
          </li>
        ))}
      </ol>
      <ol className="as-list" aria-live="polite">
        {recent.map((a) => (
          <li key={`${a.at}|${a.text}`} className={`as-step as-step--${a.kind}`}>
            <span className="as-icon" aria-hidden="true">{STEP_ICON[a.kind]}</span>
            <span className="as-text">
              <span className="as-tag">{STAGE_NAMES[stageOf(a.kind, a.text)]}</span> {a.text}
            </span>
            <time className="as-at">{a.at}</time>
          </li>
        ))}
      </ol>
      {actions.length > recent.length && <p className="as-more">{actions.length - recent.length} earlier steps in the pack&apos;s record</p>}
    </section>
  );
}

// The 1930 interpreter: the caller's 1930 call on speaker, Fraud First Aid speaking to the operator.
function Interpreter({ data, onInterpret }: { data: ComplaintView; onInterpret?: () => Promise<string | null> }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // the server said the interpreter started: show it at once, before the next poll catches up
  const [started, setStarted] = useState(false);
  const lang = data.lang && LANG_LABEL[data.lang] ? LANG_LABEL[data.lang] : 'your language';
  if (data.phase === 'interpret' || started) {
    return (
      <div className="pk-interp pk-interp--on" data-testid="interpreter-on" role="status">
        <p className="pk-interp__title">Interpreter on: speaking to 1930 for you</p>
        <p className="pk-interp__text">
          Keep the 1930 call on speaker next to this screen. It gives the operator your details and tells you in {lang} what they ask.
        </p>
        {data.ack1930 && (
          <p className="pk-interp__ack" data-testid="ack-1930">
            1930 acknowledgement number: <strong>{data.ack1930}</strong>
          </p>
        )}
      </div>
    );
  }
  if (!onInterpret) return null;
  return (
    <div className="pk-interp">
      <div>
        <p className="pk-interp__title">Hard to explain it to 1930 in their language?</p>
        <p className="pk-interp__text">
          Call 1930 on your phone and put it on speaker next to this screen. Fraud First Aid gives the operator your details, digit by digit, and tells you in {lang} what they ask.
        </p>
        {problem && <p className="pk-interp__text" role="alert" style={{ color: 'var(--bad)' }}>{problem}</p>}
      </div>
      <button
        type="button"
        className="up-btn pk-interp__btn"
        data-testid="interpret-1930"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const err = await onInterpret();
            setProblem(err);
            setStarted(err === null);
          } catch {
            setProblem("Couldn't reach the server. Read the script below to the operator instead.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Starting…' : 'Speak to 1930 for me'}
      </button>
    </div>
  );
}

function PackItem({ n, title, text, open = false, lang }: { n: number; title: string; text: string; open?: boolean; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="pk-row">
      <details className="pk-item" open={open}>
        <summary>
          <span className="pk-num">{n}</span>
          <strong>{title}</strong>
          <span className="pk-show" aria-hidden="true" />
        </summary>
        <pre className="up-pre" lang={lang}>{text}</pre>
      </details>
      <button
        type="button"
        className="up-btn up-btn--ghost up-btn--sm pk-copy"
        aria-label={`Copy ${title}`}
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

export function ComplaintCard({
  session,
  cap,
  uid,
  onInterpreterStart,
  agentState,
}: {
  session: string;
  cap: string;
  uid?: string | number;
  onInterpreterStart?: () => void;
  agentState?: string | null;
}) {
  const [data, setData] = useState<ComplaintView | null>(null);
  useEffect(() => {
    // one request at a time, the next a second after the last reply: an older reply can never land
    // after a newer one (slow mobile data)
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const r = await fetch(`/api/call/complaint?session=${encodeURIComponent(session)}&cap=${encodeURIComponent(cap)}`);
        if (live && r.ok) setData(await r.json());
      } catch {
        // offline for a moment: the next poll tries again
      } finally {
        if (live) timer = setTimeout(tick, 1000);
      }
    };
    tick();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [session, cap]);
  const [shotState, setShotState] = useState<string | null>(null);
  async function upload(file: File) {
    setShotState('Reading the screenshot…');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await fetch(`/api/call/screenshot?session=${encodeURIComponent(session)}&cap=${encodeURIComponent(cap)}`, { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      setShotState(r.ok ? null : `Couldn't read it: ${j.error ?? r.status}`);
    } catch {
      setShotState("Couldn't send the screenshot. Check your connection and try again.");
    }
  }
  return (
    <>
      <ComplaintCardView
        data={data}
        agentState={agentState ?? null}
        onScreenshot={upload}
        onInterpret={async () => {
          const r = await fetch('/api/call/interpret', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ channel: session, cap, uid }),
          });
          if (r.ok) {
            onInterpreterStart?.();
            return null;
          }
          const j = await r.json().catch(() => ({}));
          return j.error ?? 'Could not start the interpreter. Read the script below to the operator instead.';
        }}
        onEmail={async (email) => {
          try {
            const r = await fetch(`/api/call/email?session=${encodeURIComponent(session)}&cap=${encodeURIComponent(cap)}`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ email, send: true }),
            });
            const j = await r.json().catch(() => ({}));
            return r.ok && j.ok !== false ? null : (j.error ?? j.problem ?? `Couldn't send it (${r.status}).`);
          } catch {
            return "Couldn't reach the server. Check your connection and try again.";
          }
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
