'use client';
// Plays an illustration of a fake-KYC scam call into the call as if it came from the caller's
// phone on speaker, so the guard can be shown without a second person. Labelled on screen.
import { useState } from 'react';
import { useRTCClient, type IAgoraRTCClient } from 'agora-rtc-react';

// Publishes an audio file into the call as the caller's audio (heard locally too) and resolves
// when it has finished playing.
export async function playClipIntoCall(client: IAgoraRTCClient, source: string): Promise<void> {
  const AgoraRTC = (await import('agora-rtc-react')).default;
  const track = await AgoraRTC.createBufferSourceAudioTrack({ source });
  await new Promise<void>((resolve) => {
    track.on('source-state-change', async (st: string) => {
      if (st === 'stopped') {
        await client.unpublish(track).catch(() => {});
        track.close();
        resolve();
      }
    });
    track.startProcessAudioBuffer();
    track.play();
    client.publish(track).catch(() => resolve());
  });
}

export function SampleScamCall() {
  const client = useRTCClient();
  const [state, setState] = useState<'idle' | 'playing' | 'done' | 'error'>('idle');

  async function play() {
    setState('playing');
    try {
      await playClipIntoCall(client, '/demo/sample-scam-call.wav');
      setState('done');
    } catch (e) {
      console.error('[sample-scam-call]', e);
      setState('error');
    }
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-card)] border border-dashed p-4"
      style={{ borderColor: 'var(--warn)' }}
      data-testid="sample-scam-call"
    >
      <p className="max-w-[34rem] text-[0.9375rem]" style={{ color: 'var(--ink-2)' }}>
        <span className="up-sample-tag mr-2">Illustration</span>
        No scam call to hand? Play a sample (an illustration made with a generated voice, not a real call).
      </p>
      <button type="button" onClick={play} disabled={state === 'playing'} className="up-btn up-btn--sm up-btn--ghost">
        {state === 'playing' ? 'Playing the sample scam call…' : state === 'done' ? 'Play it again' : 'Play a sample scam call'}
      </button>
      {state === 'error' && <p className="w-full text-[0.875rem]" style={{ color: 'var(--bad)' }}>Couldn&apos;t play the sample.</p>}
    </div>
  );
}
