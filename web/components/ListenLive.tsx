'use client';
// A family member on the call: joins the call's channel and plays the caller and the agent. With a
// view link the token can only subscribe, so they cannot be heard. With the talk link the caller
// sent ("Bring family into the call") the token can publish, and a Talk button opens their
// microphone so they can speak to their parent; it starts muted and they choose to talk.
import { useEffect, useRef, useState } from 'react';
import type { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

export function ListenLive({ session, viewKey }: { session: string; viewKey: string }) {
  const [state, setState] = useState<'idle' | 'joining' | 'on' | 'error'>('idle');
  const client = useRef<IAgoraRTCClient | null>(null);
  const mic = useRef<IMicrophoneAudioTrack | null>(null);
  const [canSpeak, setCanSpeak] = useState(false);
  const [talking, setTalking] = useState(false);
  useEffect(() => () => { mic.current?.close(); client.current?.leave().catch(() => {}); }, []);
  const start = async () => {
    setState('joining');
    try {
      const r = await fetch(`/api/call/listen?session=${encodeURIComponent(session)}&key=${encodeURIComponent(viewKey)}`);
      if (!r.ok) throw new Error(`listen ${r.status}`);
      const { appId, channel, uid, token, canSpeak: speak } = await r.json();
      setCanSpeak(Boolean(speak));
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
  const talk = async () => {
    const c = client.current;
    if (!c) return;
    try {
      if (!mic.current) {
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        mic.current = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true });
        await c.publish(mic.current);
      } else await mic.current.setMuted(talking);
      setTalking(!talking);
    } catch (e) {
      console.error('[talk]', e);
      setState('error');
    }
  };
  const stop = async () => {
    mic.current?.close();
    mic.current = null;
    setTalking(false);
    await client.current?.leave().catch(() => {});
    client.current = null;
    setState('idle');
  };
  return (
    <div className="ll" data-testid="listen-live" data-on={state === 'on' ? '' : undefined}>
      <span className="ll-dot" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[1.0625rem]">{state === 'on' ? (talking ? 'You are on the call' : 'Listening live') : 'Hear the call'}</p>
        <p className="text-[0.9375rem]" style={{ color: 'var(--on-navy-2)' }} role="status">
          {state === 'on'
            ? talking
              ? 'They can hear you. Help them stay calm and give the details slowly.'
              : canSpeak
                ? 'You are listening. Press Talk to speak to them.'
                : 'You are listening. You cannot be heard.'
            : state === 'error'
              ? 'Could not join the call audio.'
              : 'Hear your family member and UTR Pakka. Your microphone stays off until you choose to talk.'}
        </p>
      </div>
      {state === 'on' ? (
        <div className="flex gap-2">
          {canSpeak && (
            <button type="button" className="up-btn up-btn--light up-btn--sm" onClick={talk} aria-pressed={talking} data-testid="family-talk">
              {talking ? 'Mute me' : 'Talk to them'}
            </button>
          )}
          <button type="button" className="up-btn up-btn--outline-light up-btn--sm" onClick={stop}>Leave</button>
        </div>
      ) : (
        <button type="button" className="up-btn up-btn--light up-btn--sm" onClick={start} disabled={state === 'joining'}>
          {state === 'joining' ? 'Joining…' : 'Listen to the call live'}
        </button>
      )}
    </div>
  );
}
