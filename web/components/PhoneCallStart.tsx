'use client';
// "Give your number and it calls you": rings the caller's Indian mobile and opens the live card.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PhoneCallStart() {
  const router = useRouter();
  const [to, setTo] = useState('');
  const [state, setState] = useState<string | null>(null);
  async function call(e: React.FormEvent) {
    e.preventDefault();
    // "Listen to my call": the guard rings you; answer, then tap Merge to add it to the call you're on
    const guard = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === 'guard';
    setState(
      guard
        ? 'Calling you in about 40 seconds. Answer, then tap Merge to add it to the call you are on.'
        : 'Placing the call. Your phone rings in about 40 seconds…',
    );
    const q = new URLSearchParams(window.location.search);
    const t = await fetch('/api/generate-agora-token').then((r) => r.json()).catch(() => null);
    if (!t?.channel || !t?.cap) return setState('Could not start the call.');
    const r = await fetch(`/api/call/phone?session=${encodeURIComponent(t.channel)}&cap=${encodeURIComponent(t.cap)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // the complaint greets whoever answers; the guard rings only an allowlisted number (the server checks)
      body: JSON.stringify({ to, lang: q.get('lang') ?? 'te', mode: guard ? 'guard' : 'complaint' }),
    }).catch(() => null);
    if (!r) return setState('Could not reach the server. Check your connection and try again.');
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setState(j.error ?? 'Could not place the call.');
    router.push(`/watch?session=${encodeURIComponent(t.channel)}&key=${encodeURIComponent(t.viewCap)}&as=phone`);
  }
  return (
    <form onSubmit={call} className="flex flex-wrap items-center gap-2" data-testid="phone-call">
      <label htmlFor="phone-to" className="sr-only">
        Your mobile number, so Fraud First Aid can call you
      </label>
      <input
        id="phone-to"
        type="tel"
        inputMode="tel"
        required
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="98450 12345"
        className="up-input"
        data-testid="phone-to"
      />
      <button type="submit" value="complaint" className="up-btn up-btn--ghost up-btn--sm" data-testid="phone-call-button">
        Call my phone
      </button>
      <button type="submit" value="guard" className="up-btn up-btn--ghost up-btn--sm" data-testid="phone-guard-button">
        Listen to my call
      </button>
      {state && (
        <span role="status" className="text-[0.875rem]">
          {state}
        </span>
      )}
    </form>
  );
}
