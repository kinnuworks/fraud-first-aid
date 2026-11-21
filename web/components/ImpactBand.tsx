import type { ReactNode } from 'react';

// "Who this happens to": sourced numbers, India first, then older people, then Karnataka, then what a
// fast report to 1930 can hold. Losses in red, money held in green. Final figures only, so a reader who
// scrolls fast never sees a half-counted number. Every number is in the fact sheet (STATE.md).
const STATS: Array<{ num: string; unit: string; label: ReactNode; source: string; tone?: 'loss' | 'held' }> = [
  {
    num: '₹22,845',
    unit: 'crore',
    label: 'reported lost to cyber fraud across India in 2024, in more than 36 lakh cases',
    source: 'Lok Sabha reply, Ministry of Home Affairs, 22 Jul 2025',
    tone: 'loss',
  },
  { num: '₹4,005', unit: 'crore', label: 'lost by senior citizens to cyber fraud in 2025', source: 'Rajya Sabha reply, 5 Aug 2026', tone: 'loss' },
  {
    num: '₹5,474',
    unit: 'crore',
    label: (
      <>
        lost in Karnataka over three years. <strong>Only ₹627 crore came back.</strong>
      </>
    ),
    source: 'Karnataka Home Minister, reply in the Assembly, 10 Dec 2025',
    tone: 'loss',
  },
  { num: '12.64', unit: 'lakh', label: 'UPI fraud incidents in FY 2024-25', source: 'Lok Sabha reply, 15 Dec 2025' },
  { num: '₹11,158', unit: 'crore', label: 'held because people reported to 1930 fast, till 30 Jun 2026', source: 'Lok Sabha reply, Aug 2026', tone: 'held' },
];

export function ImpactBand() {
  return (
    <section className="im" aria-labelledby="im-title">
      <div className="up-wrap">
        <h2 id="im-title" className="up-label im-title">
          Who this happens to
        </h2>
        <div className="im-stats">
          {STATS.map((s) => (
            <div key={s.num} className={`im-stat${s.tone ? ` im-stat--${s.tone}` : ''}`}>
              <p className="im-num">
                {s.num}
                <span className="im-unit"> {s.unit}</span>
              </p>
              <p className="im-label">{s.label}</p>
              <p className="im-src">{s.source}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
