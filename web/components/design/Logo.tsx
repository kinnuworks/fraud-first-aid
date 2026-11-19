import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="up-logo">
      <span className="up-logo__mark">UTR</span>
      Pakka
    </Link>
  );
}
