// "Who this happens to": three sourced national numbers on a navy band. Final figures only, so a
// reader who scrolls fast never sees a half-counted number.
const STATS: Array<{ num: string; unit: string; label: string; source: string }> = [
  { num: '₹22,845', unit: 'crore', label: 'lost to cyber fraud in 2024', source: 'Lok Sabha reply, Ministry of Home Affairs, 22 Jul 2025' },
  { num: '12.64', unit: 'lakh', label: 'UPI fraud incidents in FY 2024-25', source: 'Lok Sabha reply, 15 Dec 2025' },
  { num: '₹11,158', unit: 'crore', label: 'held through reports to 1930, till 30 Jun 2026', source: 'Lok Sabha reply, Aug 2026' },
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
            <div key={s.label} className="im-stat">
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
