'use client';
import { ListenLive } from './ListenLive';
import { Logo } from './design/Logo';
// Read-only live views of a call, opened by link on a second screen:
//  - operator: the complaint as a 1930 helpline operator would receive it, in English
//  - family: the same card the caller sees, for a son or daughter
import { useEffect, useState } from 'react';
import { ComplaintCardView, UtrGroups, show, when, type ComplaintView } from './ComplaintCard';
import { scamById } from '@/lib/complaint/scams';
import { LANG_NAME } from '@/lib/complaint/pack';
import { minutesSince } from '@/lib/complaint/pack';

type Live = ComplaintView & { story?: { en: string; words: string } | null };

const ROWS: Array<[keyof ComplaintView['fields'], string]> = [
  ['utr', 'UTR'],
  ['amount', 'Amount'],
  ['when', 'Debited'],
  ['payee', 'Paid to'],
  ['victim_bank', "Caller's bank"],
];

function useLive(session: string, key: string) {
  const [data, setData] = useState<Live | null>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    let live = true;
    const tick = async () => {
      const r = await fetch(`/api/call/complaint?session=${encodeURIComponent(session)}&cap=${encodeURIComponent(key)}`);
      if (!live) return;
      if (r.ok) setData(await r.json());
      else if (r.status === 403 || r.status === 404) setGone(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [session, key]);
  return { data, gone };
}

function status(d: Live): string {
  if (d.emailSent && 'id' in d.emailSent) return 'Pack ready · emailed to the caller';
  if (d.pack.ok) return 'Pack ready';
  if (d.phase === 'guard') return d.flags?.length ? 'Scam warning given · on guard' : 'On guard: listening to a suspicious call';
  return 'Taking the report';
}

export function OperatorView({ session, viewKey }: { session: string; viewKey: string }) {
  const { data, gone } = useLive(session, viewKey);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  if (gone) return <p className="up-lead p-6">This call has ended or the link is not valid.</p>;
  if (!data) return <p className="up-lead p-6">Connecting to the call…</p>;
  const m = typeof data.fields.when?.value === 'string' ? minutesSince(data.fields.when.value, now) : null;
  return (
    <main className="up-page" data-testid="operator-view">
      <div className="up-wrap flex flex-col gap-6 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="up-label">1930 operator view · live · read only</p>
            <h1 className="up-display">Incoming UPI fraud report</h1>
          </div>
          <div className="text-right">
            <p className="up-label">Caller speaks</p>
            <p className="text-[1.5rem] font-semibold">{data.lang ? LANG_NAME[data.lang] : '—'}</p>
          </div>
        </header>
        <p className="up-lead" data-testid="operator-status">
          Status: {status(data)}
          {m !== null ? ` · money left ${m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`} ago` : ''}
        </p>
        {(data.flags ?? []).length > 0 && (
          <section className="up-alarm">
            <h2 className="up-alarm__kicker">Scam red flags heard on the call</h2>
            {(data.flags ?? []).map((f, i) => (
              <p key={i} className="up-alarm__body">
                <strong>{scamById(f.scam)?.name ?? f.scam}</strong>: the caller {f.red_flag}.
              </p>
            ))}
          </section>
        )}
        <section className="up-card p-5">
          <p className="up-label mb-3">Report (fields confirmed by the caller are ticked)</p>
          <div className="flex flex-col">
            {ROWS.map(([k, label]) => {
              const f = data.fields[k];
              return (
                <div key={k} className="up-slip__row" data-field={k}>
                  <span className="up-slip__k">{label}</span>
                  <span className="up-slip__v">
                    {f ? (k === 'utr' ? <UtrGroups value={f.value} state={f.confirmed ? 'ok' : 'plain'} small /> : show(k, f.value)) : '—'}{' '}
                    {f?.confirmed ? '✓' : f ? '(checking with caller)' : ''}
                  </span>
                </div>
              );
            })}
            {data.deadlines && (
              <div className="up-slip__row">
                <span className="up-slip__k">Bank deadline (zero liability)</span>
                <span className="up-slip__v">{when(data.deadlines.zeroLiabilityBy)}</span>
              </div>
            )}
          </div>
        </section>
        {data.story && (
          <section className="up-card p-5">
            <p className="up-label mb-2">What happened</p>
            <p className="text-[1.0625rem]">{data.story.en}</p>
            <p className="mt-2" style={{ color: 'var(--ink-2)' }}>
              Caller&apos;s own words: “{data.story.words}”
            </p>
          </section>
        )}
        {data.pack.ok && (
          <section className="up-card p-5">
            <p className="up-label mb-2">Ready to file</p>
            <pre className="up-pre whitespace-pre-wrap text-[0.9375rem]">{data.pack.operatorCard}</pre>
          </section>
        )}
      </div>
    </main>
  );
}

export function FamilyView({ session, viewKey, phone = false }: { session: string; viewKey: string; phone?: boolean }) {
  const { data, gone } = useLive(session, viewKey);
  if (gone) return <p className="up-lead p-6">This call has ended or the link is not valid.</p>;
  return (
    <main className="cs" data-testid="family-view">
      <header className="cs-top">
        <Logo />
        <span className="up-label">{phone ? 'Your phone call · live · answer your phone and speak' : 'Live view for family'}</span>
      </header>
      <div className="up-wrap flex max-w-[56rem] flex-col gap-5 py-8">
        {!phone && <ListenLive session={session} viewKey={viewKey} />}
        <ComplaintCardView data={data} />
      </div>
    </main>
  );
}
