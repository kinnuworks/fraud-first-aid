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
    <div className="rounded-lg border border-dashed border-yellow-600/60 p-3 text-xs" data-testid="sample-scam-call">
      <p className="text-yellow-200">No scam call to hand? Play a sample (an illustration made with a generated voice, not a real call).</p>
      <button
        type="button"
        onClick={play}
        disabled={state === 'playing'}
        className="mt-2 rounded border border-yellow-600/60 px-2 py-1 text-yellow-100 disabled:opacity-60"
      >
        {state === 'playing' ? 'Playing the sample scam call…' : state === 'done' ? 'Play it again' : 'Play a sample scam call'}
      </button>
      {state === 'error' && <p className="mt-1 text-destructive">Couldn&apos;t play the sample.</p>}
    </div>
  );
}
