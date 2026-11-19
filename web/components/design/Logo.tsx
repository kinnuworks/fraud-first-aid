import Link from 'next/link';

// The name with its tagline under it, so "UTR" never stands alone.
export function Logo() {
  return (
    <Link href="/" className="up-logo" aria-label="UTR Pakka, your UPI fraud complaint, spoken">
      <span className="up-logo__mark">UTR</span>
      <span className="up-logo__words">
        <span>Pakka</span>
        <span className="up-logo__tag">your UPI fraud complaint, spoken</span>
      </span>
    </Link>
  );
}
