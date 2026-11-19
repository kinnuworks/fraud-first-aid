'use client';
// "Who this happens to": a mosaic of Indian faces (Pexels, labelled an illustration) with the sourced
// numbers on a white card on top, and one reported case below it, away from any face.
import { useEffect, useRef, useState } from 'react';
// People only: the shared photo set also holds animals, products and landscapes, left out here.
import credits from './mosaic-faces.json';

type Credit = { file: string; photographer: string; url: string };
const FACES = credits as Credit[];

const STATS: Array<{ to: number; decimals: number; before: string; after: string; label: string; source: string }> = [
  {
    to: 22845,
    decimals: 0,
    before: '₹',
    after: ' crore',
    label: 'lost to cyber fraud in 2024',
    source: 'Lok Sabha reply, Ministry of Home Affairs, 22 Jul 2025',
  },
  {
    to: 12.64,
    decimals: 2,
    before: '',
    after: ' lakh',
    label: 'UPI fraud incidents in FY 2024-25',
    source: 'Lok Sabha reply, 15 Dec 2025',
  },
  {
    to: 11158,
    decimals: 0,
    before: '₹',
    after: ' crore',
    label: 'held through reports to 1930, till 30 Jun 2026',
    source: 'Lok Sabha reply, Aug 2026',
  },
];

const fmt = (n: number, d: number) => n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

// Counts up once when a reader scrolls the card into view. Until then, and for page captures that
// never scroll or with reduced motion, it shows the final numbers.
function useCountUp(ref: React.RefObject<HTMLElement | null>) {
  const [t, setT] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || window.scrollY === 0) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / 1400);
          setT(1 - Math.pow(1 - p, 3));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref]);
  return t;
}

export function ImpactBand() {
  const card = useRef<HTMLDivElement>(null);
  const t = useCountUp(card);
  return (
    <>
      <section className="im" aria-labelledby="im-title">
        <div className="im-mosaic" aria-hidden="true">
          {FACES.map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f.file} src={`/faces/${f.file}`} alt="" loading="lazy" decoding="async" width={64} height={64} />
          ))}
        </div>
        <div className="im-inner up-wrap">
          <div className="im-card" ref={card}>
            <h2 id="im-title" className="up-label">
              Who this happens to
            </h2>
            <div className="im-stats">
              {STATS.map((s) => (
                <div key={s.label} className="im-stat">
                  <p className="im-num">
                    {s.before}
                    {fmt(s.to * t, s.decimals)}
                    <span className="im-unit">{s.after}</span>
                  </p>
                  <p className="im-label">{s.label}</p>
                  <p className="im-src">{s.source}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="im-caption">
          Photos: Pexels, an illustration. The people shown are not fraud victims.{' '}
          <a href="#photo-credits">Photo credits</a>
        </p>
      </section>
      <section className="up-wrap im-case" aria-label="A reported case">
        <p className="im-case__text">A 44-year-old in Bengaluru called 1930 within the golden hour. All ₹14 lakh came back.</p>
        <p className="im-src">Telangana Today / PTI, 23 Sep 2025</p>
      </section>
    </>
  );
}

// The photographers behind the mosaic, each linked to the photo on Pexels.
export function PhotoCredits() {
  return (
    <details className="up-wrap im-credits" id="photo-credits">
      <summary>Photo credits: Pexels ({FACES.length} photos in the mosaic)</summary>
      <ul>
        {FACES.map((f) => (
          <li key={f.file}>
            <a href={f.url} target="_blank" rel="noopener noreferrer">
              {f.photographer}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
