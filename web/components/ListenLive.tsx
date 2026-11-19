'use client';
// "Listen live" for a family member: joins the call's channel with a subscribe-only token and plays
// the caller and the agent. It never opens a microphone and cannot speak into the call.
import { useEffect, useRef, useState } from 'react';
import type { IAgoraRTCClient } from 'agora-rtc-sdk-ng';

export function ListenLive({ session, viewKey }: { session: string; viewKey: string }) {
  const [state, setState] = useState<'idle' | 'joining' | 'on' | 'error'>('idle');
  const client = useRef<IAgoraRTCClient | null>(null);
  useEffect(() => () => { client.current?.leave().catch(() => {}); }, []);
  const start = async () => {
    setState('joining');
    try {
      const r = await fetch(`/api/call/listen?session=${encodeURIComponent(session)}&key=${encodeURIComponent(viewKey)}`);
      if (!r.ok) throw new Error(`listen ${r.status}`);
      const { appId, channel, uid, token } = await r.json();
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
      const c = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      client.current = c;
      c.on('user-published', async (user, kind) => {
        if (kind !== 'audio') return;
        await c.subscribe(user, 'audio');
        user.audioTrack?.play();
      });
      await c.join(appId, channel, token, uid);
      for (const u of c.remoteUsers) if (u.hasAudio) { await c.subscribe(u, 'audio'); u.audioTrack?.play(); }
      setState('on');
    } catch (e) {
      console.error('[listen]', e);
      setState('error');
    }
  };
  const stop = async () => {
    await client.current?.leave().catch(() => {});
    client.current = null;
    setState('idle');
  };
  return (
    <div className="ll" data-testid="listen-live" data-on={state === 'on' ? '' : undefined}>
      <span className="ll-dot" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[1.0625rem]">{state === 'on' ? 'Listening live' : 'Hear the call'}</p>
        <p className="text-[0.9375rem]" style={{ color: 'var(--on-navy-2)' }} role="status">
          {state === 'on' ? 'You are listening. You cannot be heard.' : state === 'error' ? 'Could not join the call audio.' : 'Hear your family member and UTR Pakka. Your microphone stays off.'}
        </p>
      </div>
      {state === 'on' ? (
        <button type="button" className="up-btn up-btn--outline-light up-btn--sm" onClick={stop}>Stop listening</button>
      ) : (
        <button type="button" className="up-btn up-btn--light up-btn--sm" onClick={start} disabled={state === 'joining'}>
          {state === 'joining' ? 'Joining…' : 'Listen to the call live'}
        </button>
      )}
    </div>
  );
}
