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
    setState('Calling your phone…');
    const q = new URLSearchParams(window.location.search);
    const t = await fetch('/api/generate-agora-token').then((r) => r.json()).catch(() => null);
    if (!t?.channel || !t?.cap) return setState('Could not start the call.');
    const r = await fetch(`/api/call/phone?session=${encodeURIComponent(t.channel)}&cap=${encodeURIComponent(t.cap)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // always the complaint, which greets whoever answers
      body: JSON.stringify({ to, lang: q.get('lang') ?? 'te', mode: 'complaint' }),
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
      <button type="submit" className="up-btn up-btn--ghost up-btn--sm" data-testid="phone-call-button">
        Call my phone
      </button>
      {state && (
        <span role="status" className="text-[0.875rem]">
          {state}
        </span>
      )}
    </form>
  );
}
