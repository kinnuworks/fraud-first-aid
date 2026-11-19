'use client';
// Read-only second screens for this call: the 1930 operator view and a live view for family.
export function SecondScreens({ session, viewKey }: { session: string; viewKey?: string }) {
  if (!viewKey || typeof window === 'undefined') return null;
  const base = `${window.location.origin}/watch?session=${encodeURIComponent(session)}&key=${encodeURIComponent(viewKey)}`;
  const family = `${base}&as=family`;
  return (
    <div className="up-card flex flex-wrap items-center gap-3 p-4" data-testid="second-screens">
      <span className="up-label">Second screens (read only)</span>
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
    </div>
  );
}
