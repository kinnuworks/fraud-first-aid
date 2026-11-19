'use client';
// Second screens for this call: the 1930 operator view (read only), a live view for family (read
// only), and an invitation for one family member to join the call and speak.
export function SecondScreens({ session, viewKey, talkKey }: { session: string; viewKey?: string; talkKey?: string }) {
  if (!viewKey || typeof window === 'undefined') return null;
  const watch = (key: string) => `${window.location.origin}/watch?session=${encodeURIComponent(session)}&key=${encodeURIComponent(key)}`;
  const base = watch(viewKey);
  const family = `${base}&as=family`;
  const join = talkKey ? `${watch(talkKey)}&as=family` : null;
  return (
    <div className="up-card flex flex-wrap items-center gap-3 p-4" data-testid="second-screens">
      <span className="up-label">Second screens</span>
      <a className="up-btn up-btn--ghost up-btn--sm" href={`${base}&as=operator`} target="_blank" rel="noopener noreferrer" data-testid="open-operator">
        Open the 1930 operator view
      </a>
      <a
        className="up-btn up-btn--ghost up-btn--sm"
        href={`https://wa.me/?text=${encodeURIComponent(`Follow my fraud complaint live (read only): ${family}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="share-family-live"
      >
        Share a live view with family
      </a>
      {join && (
        <a
          className="up-btn up-btn--ghost up-btn--sm"
          href={`https://wa.me/?text=${encodeURIComponent(`I got a scam call and need you on it. Open this to hear me and talk to me: ${join}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="invite-family-talk"
        >
          Bring family into the call
        </a>
      )}
    </div>
  );
}
