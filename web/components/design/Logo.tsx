import Link from 'next/link';

// The name with its tagline under it. The mark is a white plus on navy: first aid, without the
// red cross emblem, which Indian law reserves (Geneva Conventions Act, 1960).
export function Logo() {
  return (
    <Link href="/" className="up-logo" aria-label="Fraud First Aid, for the first hour of a UPI fraud, in your language">
      <span className="up-logo__mark" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <rect x="6.5" y="1.5" width="5" height="15" rx="1.2" />
          <rect x="1.5" y="6.5" width="15" height="5" rx="1.2" />
        </svg>
      </span>
      <span className="up-logo__words">
        <span>Fraud First Aid</span>
        <span className="up-logo__tag">for the first hour of a UPI fraud, in your language</span>
      </span>
    </Link>
  );
}
