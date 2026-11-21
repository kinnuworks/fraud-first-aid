'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AgoraRTC, {
  useRTCClient,
  useLocalMicrophoneTrack,
  useRemoteUsers,
  useClientEvent,
  useJoin,
  usePublish,
  RemoteUser,
  UID,
} from 'agora-rtc-react';
import {
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  AgentState,
  MessageSalStatus,
  TranscriptHelperMode,
  type TranscriptHelperItem,
  type UserTranscription,
  type AgentTranscription,
} from 'agora-agent-client-toolkit';
import { AgentVisualizer } from 'agora-agent-uikit';
import { MicButtonWithVisualizer } from 'agora-agent-uikit/rtc';
import { agentUidFor } from '@/lib/agora';
import { TypeInstead } from '@/components/TypeInstead';
import {
  getCurrentInProgressMessage,
  getMessageList,
  mapAgentVisualizerState,
  normalizeTimestampMs,
  normalizeTranscript,
  withArchive,
} from '@/lib/conversation';
import { MicrophoneSelector } from './MicrophoneSelector';
import {
  getConversationIssueSeverity,
  type ConnectionIssue,
} from './ConversationErrorCard';
import { ConnectionStatusPanel } from './ConnectionStatusPanel';
import { QuickstartConversationLayout } from './QuickstartConversationLayout';
import {
  QuickstartPipelineMetrics,
  type QuickstartAgentMetric,
} from './QuickstartPipelineMetrics';
import { QuickstartTranscriptPanel } from './QuickstartTranscriptPanel';
import { ComplaintCard } from './ComplaintCard';
import { SampleScamCall, playClipIntoCall } from './SampleScamCall';
import { DEMO_COMPLAINT_STEPS, demo1930Clips, nextComplaintClip, operatorReply, scamClipFor } from '@/lib/complaint/demo1930';
import { SecondScreens } from './SecondScreens';
import type { ConversationComponentProps } from '@/types/conversation';

// Cap the displayed issues list to avoid overwhelming the UI during a cascade of errors.
const MAX_CONNECTION_ISSUES = 6;

type AgoraRtcWithParameters = typeof AgoraRTC & {
  setParameter?: (key: string, value: unknown) => void;
};

// Payload shape for signaling-level errors forwarded by the agent over RTM.
// The `module` field identifies which backend subsystem (LLM / ASR / TTS) raised the error.
type RtmMessageErrorPayload = {
  object: 'message.error';
  module?: string;
  code?: number;
  message?: string;
  send_ts?: number;
};

// Payload shape for SAL (Session Abstraction Layer) registration status messages.
// VP_REGISTER_FAIL and VP_REGISTER_DUPLICATE indicate RTM channel subscription problems.
type RtmSalStatusPayload = {
  object: 'message.sal_status';
  status?: string;
  timestamp?: number;
};

// Type guard for RTM signaling-level error payloads (object: 'message.error').
function isRtmMessageErrorPayload(
  value: unknown,
): value is RtmMessageErrorPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { object?: unknown }).object === 'message.error'
  );
}

// Type guard for RTM SAL status payloads (object: 'message.sal_status').
function isRtmSalStatusPayload(value: unknown): value is RtmSalStatusPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { object?: unknown }).object === 'message.sal_status'
  );
}

// uids given to listen-only links (lib/handlers/listen.ts)
const listenOnly = (uid: string | number) => Number(uid) >= 90000 && Number(uid) < 100000;

export default function ConversationComponent({
  agoraData,
  rtmClient,
  onTokenWillExpire,
  onEndConversation,
}: ConversationComponentProps) {
  const client = useRTCClient();
  // ?demo=1: lets the recorded full-flow demo play labelled sample clips into the call.
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('demo') !== '1') return;
    (window as unknown as { __utrPakkaPlay?: (u: string) => Promise<void> }).__utrPakkaPlay = (u) => playClipIntoCall(client, u);
  }, [client]);
  // ?watch=1: "Watch it catch a scam call" from the first screen. No microphone is opened; once the
  // agent is listening, the labelled sample scam call plays into the call by itself.
  const [watch] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('watch') === '1');
  // ?mode=demo1930: "Watch it call 1930 for you" (the sample 1930 operator instead of the scam call)
  const [demo1930] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'demo1930');
  // ?mode=democomplaint: "Watch it take a complaint" (the sample caller, in a live complaint call)
  const [demoComplaint] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'democomplaint');
  const unmounted = useRef(false);
  useEffect(() => () => { unmounted.current = true; }, []);
  const watchPlayed = useRef(false);
  const remoteUsers = useRemoteUsers();
  // A browser that blocks sound until a tap (iOS Safari) gets a button instead of silence.
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  useEffect(() => {
    import('agora-rtc-react')
      .then(({ default: AgoraRTC }) => {
        AgoraRTC.onAutoplayFailed = () => setAutoplayBlocked(true);
      })
      .catch((e) => console.error('[audio] could not watch for blocked autoplay:', e));
  }, []);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [isConnectionDetailsOpen, setIsConnectionDetailsOpen] = useState(false);

  // Tracks granular RTC connection state for the status dot.
  // Agora states: DISCONNECTED | CONNECTING | CONNECTED | DISCONNECTING | RECONNECTING
  const [connectionState, setConnectionState] = useState<string>('CONNECTING');
  // this call's agent (lib/agora.ts): the same uid the server gave it
  const agentUID = agentUidFor(agoraData.channel);
  const [joinedUID, setJoinedUID] = useState<UID>(0);

  // Transcript + agent state — managed with AgoraVoiceAI (see effect below).
  const [rawTranscript, setRawTranscript] = useState<
    TranscriptHelperItem<Partial<UserTranscription | AgentTranscription>>[]
  >([]);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<QuickstartAgentMetric[]>([]);
  const [connectionIssues, setConnectionIssues] = useState<ConnectionIssue[]>(
    [],
  );
  const addConnectionIssue = useCallback((issue: ConnectionIssue) => {
    setConnectionIssues((prev) => {
      const isDuplicate = prev.some(
        (x) =>
          x.agentUserId === issue.agentUserId &&
          x.code === issue.code &&
          x.message === issue.message &&
          Math.abs(x.timestamp - issue.timestamp) < 1500,
      );
      if (isDuplicate) return prev;
      return [issue, ...prev].slice(0, MAX_CONNECTION_ISSUES);
    });
  }, []);

  // Auto-open details panel as soon as a new issue is recorded.
  useEffect(() => {
    if (connectionIssues.length > 0) {
      setIsConnectionDetailsOpen(true);
    }
  }, [connectionIssues.length]);

  // StrictMode guard: delay `useJoin`'s ready flag until after the fake-unmount
  // cycle completes. React StrictMode fires cleanup synchronously before any
  // setTimeout callback, so the first (fake) mount's timeout is always cancelled.
  // Only the real second mount's timeout fires, meaning useJoin joins exactly once.
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      if (!cancelled) setIsReady(true);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
      setIsReady(false);
    };
  }, []);

  const { isConnected: joinSuccess } = useJoin(
    {
      appid: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
      channel: agoraData.channel,
      token: agoraData.token,
      uid: parseInt(agoraData.uid, 10),
    },
    isReady,
  );

  // Create mic track only after the StrictMode fake-unmount cycle completes (isReady).
  // Passing `true` here creates two tracks in StrictMode — the first publishes, then
  // StrictMode cleanup closes it and the second takes over, causing a ~3s audio gap.
  // isReady uses the same setTimeout(fn,0) pattern as useJoin: StrictMode cleanup fires
  // synchronously before the timeout, so only the real second mount's timer fires.
  // Do NOT pass `isEnabled` — that ties track lifetime to mute state and breaks the Web Audio
  // graph inside MicButtonWithVisualizer. Mute uses track.setEnabled() only.
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isReady && !watch);

  // ENABLE_AUDIO_PTS is a module-level SDK parameter (not on the client instance).
  // It must be set before publishing audio for transcript timing to be accurate.
  useEffect(() => {
    if (!client) return;
    try {
      (AgoraRTC as AgoraRtcWithParameters).setParameter?.(
        'ENABLE_AUDIO_PTS',
        true,
      );
    } catch (error) {
      console.warn('Could not set ENABLE_AUDIO_PTS:', error);
    }
  }, [client]);

  // Track the auto-assigned RTC UID for token renewal and agent invite.
  useEffect(() => {
    if (joinSuccess && client) {
      const uid = client.uid;
      if (uid !== null && uid !== undefined) {
        setJoinedUID(uid);
      }
    }
  }, [joinSuccess, client]);

  // Initialize AgoraVoiceAI once the channel is joined.
  //
  // Gating on `isReady && joinSuccess` is critical for StrictMode safety:
  //   - `isReady` ensures we are past the initial fake-unmount cycle, so this
  //     effect only runs on the real mount (not the discarded fake one).
  //   - Once `isReady` is true, React does NOT double-invoke this effect for
  //     subsequent state changes (`joinSuccess` becoming true). That means
  //     AgoraVoiceAI.init() is called exactly once.
  useEffect(() => {
    if (!isReady || !joinSuccess) return;

    let cancelled = false;

    (async () => {
      try {
        const ai = await AgoraVoiceAI.init({
          rtcEngine: client,
          rtmEngine: rtmClient,
          renderMode: TranscriptHelperMode.TEXT,
          enableLog: true,
        });

        if (cancelled) {
          try {
            if (AgoraVoiceAI.getInstance() === ai) {
              // Tear down only the instance created by this effect run.
              ai.unsubscribe();
              ai.destroy();
            }
          } catch {
            // teardown of a stale instance; nothing to recover
          }
          return;
        }

        ai.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (t) => {
          setRawTranscript([...t]);
        });
        // Agent state drives the visualizer, independent of RTC audio presence.
        ai.on(AgoraVoiceAIEvents.AGENT_STATE_CHANGED, (_, event) =>
          setAgentState(event.state),
        );
        ai.on(AgoraVoiceAIEvents.AGENT_METRICS, (_, metrics) => {
          setAgentMetrics((prev) => [...prev, metrics].slice(-8));
        });
        ai.on(AgoraVoiceAIEvents.MESSAGE_ERROR, (agentUserId, error) => {
          addConnectionIssue({
            id: `${Date.now()}-${agentUserId}-message-error-${error.code}`,
            source: 'rtm',
            agentUserId,
            code: error.code,
            message: error.message,
            timestamp: normalizeTimestampMs(error.timestamp),
          });
        });
        // SAL status: capture raw RTM messages so message.sal_status surfaces even if higher-level events don't.
        ai.on(
          AgoraVoiceAIEvents.MESSAGE_SAL_STATUS,
          (agentUserId, salStatus) => {
            if (
              salStatus.status === MessageSalStatus.VP_REGISTER_FAIL ||
              salStatus.status === MessageSalStatus.VP_REGISTER_DUPLICATE
            ) {
              addConnectionIssue({
                id: `${Date.now()}-${agentUserId}-sal-${salStatus.status}`,
                source: 'rtm',
                agentUserId,
                code: salStatus.status,
                message: `SAL status: ${salStatus.status}`,
                timestamp: normalizeTimestampMs(salStatus.timestamp),
              });
            }
          },
        );
        // Agent error: capture raw RTM messages so message.error surfaces even if higher-level events don't.
        ai.on(AgoraVoiceAIEvents.AGENT_ERROR, (agentUserId, error) => {
          addConnectionIssue({
            id: `${Date.now()}-${agentUserId}-agent-error-${error.code}`,
            source: 'agent',
            agentUserId,
            code: error.code,
            message: `${error.type}: ${error.message}`,
            timestamp: normalizeTimestampMs(error.timestamp),
          });
        });
        // subscribeMessage binds the toolkit to both RTC stream messages and RTM payloads.
        ai.subscribeMessage(agoraData.channel);
      } catch (error) {
        if (!cancelled) {
          console.error('[AgoraVoiceAI] init failed:', error);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        const ai = AgoraVoiceAI.getInstance();
        if (ai) {
          ai.unsubscribe();
          ai.destroy();
        }
      } catch {
        // unmount teardown; nothing to recover
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, joinSuccess]);

  // Raw RTM parsing is kept as a fallback for signaling-level errors and SAL status.
  useEffect(() => {
    const handleRtmMessage = (event: {
      message: string | Uint8Array;
      publisher: string;
    }) => {
      const payloadText =
        typeof event.message === 'string'
          ? event.message
          : new TextDecoder().decode(event.message);

      let parsed: unknown;
      try {
        parsed = JSON.parse(payloadText);
      } catch {
        return;
      }

      if (isRtmMessageErrorPayload(parsed)) {
        const p = parsed;
        addConnectionIssue({
          id: `${Date.now()}-${event.publisher}-rtm-msg-error-${p.code ?? 'unknown'}`,
          source: 'rtm-signaling',
          agentUserId: event.publisher,
          code: p.code ?? 'unknown',
          message: `${p.module ?? 'unknown'}: ${p.message ?? 'Unknown signaling error'}`,
          timestamp: normalizeTimestampMs(p.send_ts ?? Date.now()),
        });
        return;
      }

      if (isRtmSalStatusPayload(parsed)) {
        const p = parsed;
        if (
          p.status === 'VP_REGISTER_FAIL' ||
          p.status === 'VP_REGISTER_DUPLICATE'
        ) {
          addConnectionIssue({
            id: `${Date.now()}-${event.publisher}-rtm-sal-${p.status}`,
            source: 'rtm-signaling',
            agentUserId: event.publisher,
            code: p.status,
            message: `SAL status: ${p.status}`,
            timestamp: normalizeTimestampMs(p.timestamp ?? Date.now()),
          });
        }
      }
    };

    rtmClient.addEventListener('message', handleRtmMessage);
    return () => {
      rtmClient.removeEventListener('message', handleRtmMessage);
    };
  }, [rtmClient, addConnectionIssue]);

  // The toolkit uses uid="0" for local user speech — remap to actual RTC UID
  // so the transcript panel renders user messages on the correct side.
  // Also normalize punctuation spacing for display when upstream text arrives compacted.
  const transcript = useMemo(() => {
    return normalizeTranscript(rawTranscript, String(client.uid));
  }, [rawTranscript, client.uid]);

  // Completed (END + INTERRUPTED) messages shown as history.
  // INTERRUPTED must be included — if the agent's first turn is cut off,
  // messageList stays empty and the first interrupted turn is never shown.
  const liveList = useMemo(() => getMessageList(transcript), [transcript]);
  // The conversation as it stood when the 1930 interpreter took over (see withArchive).
  const [archive, setArchive] = useState<ReturnType<typeof getMessageList> | null>(null);
  const messageList = useMemo(() => withArchive(archive, liveList), [archive, liveList]);
  const onInterpreterStart = useCallback(() => setArchive(liveList), [liveList]);

  const currentInProgressMessage = useMemo(() => {
    // The live partial turn renders separately from the completed history list.
    return getCurrentInProgressMessage(transcript);
  }, [transcript]);

  // Publish local mic once the track exists; usePublish waits for RTC connection.
  usePublish([localMicrophoneTrack]);

  useClientEvent(client, 'user-joined', (user) => {
    if (user.uid.toString() === agentUID) setIsAgentConnected(true);
  });

  useClientEvent(client, 'user-left', (user) => {
    if (user.uid.toString() === agentUID) setIsAgentConnected(false);
  });

  // Watch mode: play the sample scam call once the agent is in the call (after its greeting).
  useEffect(() => {
    if (!watch || demo1930 || demoComplaint || !isAgentConnected || watchPlayed.current) return;
    watchPlayed.current = true;
    const t = setTimeout(() => {
      playClipIntoCall(client, scamClipFor(new URLSearchParams(window.location.search).get('lang'))).catch((e) => console.error('[watch]', e));
    }, 2500);
    return () => clearTimeout(t);
  }, [watch, demo1930, demoComplaint, isAgentConnected, client]);

  // "Watch it call 1930 for you": the labelled sample 1930 operator plays into the call one line at a
  // time, each after the interpreter has answered (it started speaking, then went quiet for 2 s), as
  // scripts/interpret-check.ts does. Then the operator confirms or corrects the read-back number.
  const stateRef = useRef<AgentState | null>(null);
  useEffect(() => {
    stateRef.current = agentState;
  }, [agentState]);
  useEffect(() => {
    if (!watch || !demo1930 || !isAgentConnected || watchPlayed.current) return;
    watchPlayed.current = true;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const busy = () => stateRef.current === 'speaking' || stateRef.current === 'thinking';
    const answered = async (max = 45000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < 15000 && !busy() && !unmounted.current) await sleep(200);
      let quiet = 0;
      while (Date.now() - t0 < max && !unmounted.current) {
        if (!busy()) {
          if (!quiet) quiet = Date.now();
          if (Date.now() - quiet > 1500) return;
        } else quiet = 0;
        await sleep(250);
      }
    };
    const ackNow = async () =>
      String(((await (await fetch(`/api/call/complaint?session=${agoraData.channel}&cap=${agoraData.cap}`)).json().catch(() => ({}))) as { ack1930?: string }).ack1930 ?? '');
    (async () => {
      // the complaint agent has joined with the sample complaint: hand the call to the 1930 interpreter
      // through the same route as 'Speak to 1930 for me' (a second Agora agent replaces the first)
      await sleep(2500);
      for (let i = 0; i < 5 && !unmounted.current; i++) {
        const r = await fetch('/api/call/interpret', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ channel: agoraData.channel, cap: agoraData.cap, uid: agoraData.uid }),
        }).catch(() => null);
        if (r?.ok) break;
        await sleep(2000);
      }
      onInterpreterStart();
      await sleep(1500);
      await answered(30000); // the interpreter's greeting
      await sleep(1000);
      const lang = new URLSearchParams(window.location.search).get('lang') ?? 'hi';
      for (const clip of demo1930Clips(lang)) {
        if (unmounted.current) return;
        await playClipIntoCall(client, `/demo/${clip}.wav`);
        await answered();
      }
      let heard = '';
      for (let i = 0; i < 45 && !heard && !unmounted.current; i++) {
        heard = await ackNow().catch(() => '');
        if (!heard) await sleep(2000);
      }
      const reply = operatorReply(heard);
      if (reply && !unmounted.current) {
        await answered(20000);
        await playClipIntoCall(client, `/demo/${reply}.wav`);
      }
    })().catch((e) => console.error('[watch 1930]', e));
  }, [watch, demo1930, isAgentConnected, client, agoraData.channel, agoraData.cap, agoraData.uid, onInterpreterStart]);

  // "Watch it take a complaint": the labelled sample caller's lines, each after the agent has answered,
  // the sample payment screenshot added through the card's own upload, then "yes" until the pack shows.
  useEffect(() => {
    if (!watch || !demoComplaint || !isAgentConnected || watchPlayed.current) return;
    watchPlayed.current = true;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const busy = () => stateRef.current === 'speaking' || stateRef.current === 'thinking';
    const answered = async (max = 45000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < 15000 && !busy() && !unmounted.current) await sleep(200);
      let quiet = 0;
      while (Date.now() - t0 < max && !unmounted.current) {
        if (!busy()) {
          if (!quiet) quiet = Date.now();
          if (Date.now() - quiet > 1500) return;
        } else quiet = 0;
        await sleep(250);
      }
    };
    const addShot = async () => {
      const input = document.querySelector<HTMLInputElement>('input[type=file]');
      if (!input) return;
      const blob = await (await fetch('/demo/sample-payment-today.png')).blob();
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'payment-screenshot.png', { type: 'image/png' }));
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const packShown = () => !!document.querySelector('[data-testid="pack"]');
    const state = async () =>
      (await (await fetch(`/api/call/complaint?session=${agoraData.channel}&cap=${agoraData.cap}`)).json().catch(() => ({}))) as Parameters<typeof nextComplaintClip>[0];
    (async () => {
      await answered(30000); // the agent's greeting
      await sleep(500);
      // the story, the UTR (one group wrong), the screenshot, then backing the screenshot
      for (const step of DEMO_COMPLAINT_STEPS.slice(0, 4)) {
        if (unmounted.current) return;
        if (step === 'screenshot') {
          await addShot();
          await sleep(1500);
        } else await playClipIntoCall(client, `/demo/${step}.wav`);
        await answered();
      }
      // then answer what the agent is asking, from the call's state, until the pack shows
      for (let i = 0; i < 12 && !packShown() && !unmounted.current; i++) {
        const clip = nextComplaintClip(await state().catch(() => ({})));
        if (!clip) break;
        await playClipIntoCall(client, `/demo/${clip}.wav`);
        await answered();
      }
    })().catch((e) => console.error('[watch complaint]', e));
  }, [watch, demoComplaint, isAgentConnected, client, agoraData.channel, agoraData.cap]);

  // Sync isAgentConnected with remoteUsers (covers cases where user-joined/left are missed)
  useEffect(() => {
    const isAgentInRemoteUsers = remoteUsers.some(
      (user) => user.uid.toString() === agentUID,
    );
    setIsAgentConnected(isAgentInRemoteUsers);
  }, [remoteUsers, agentUID]);

  useClientEvent(client, 'connection-state-change', (curState) => {
    setConnectionState(curState);
  });

  const connectionSeverity = useMemo<'normal' | 'warning' | 'error'>(() => {
    // RTC transport problems take precedence; otherwise derive severity from captured issues.
    if (
      connectionState === 'DISCONNECTED' ||
      connectionState === 'DISCONNECTING'
    ) {
      return 'error';
    }
    if (
      connectionState === 'CONNECTING' ||
      connectionState === 'RECONNECTING'
    ) {
      return 'warning';
    }
    if (connectionIssues.length === 0) {
      return 'normal';
    }
    return connectionIssues.some(
      (issue) => getConversationIssueSeverity(issue) === 'error',
    )
      ? 'error'
      : 'warning';
  }, [connectionState, connectionIssues]);

  const visualizerState = useMemo(
    () =>
      mapAgentVisualizerState(agentState, isAgentConnected, connectionState),
    [agentState, isAgentConnected, connectionState],
  );

  /**
   * Mute/unmute via track.setEnabled() only — usePublish owns publish state.
   * If we also unpublish in the toggle, usePublish and the button fight each other
   * and break the MicButtonWithVisualizer Web Audio graph.
   */
  const handleMicToggle = useCallback(async () => {
    const next = !isEnabled;
    const track = localMicrophoneTrack;
    if (!track) {
      setIsEnabled(next);
      return;
    }
    try {
      await track.setEnabled(next);
      setIsEnabled(next);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  }, [isEnabled, localMicrophoneTrack]);

  const handleTokenWillExpire = useCallback(async () => {
    if (!onTokenWillExpire || !joinedUID) return;
    try {
      // RTC and RTM renew independently, but the quickstart fetches both in one request.
      const { rtcToken, rtmToken } = await onTokenWillExpire(
        joinedUID.toString(),
      );
      await client?.renewToken(rtcToken);
      await rtmClient.renewToken(rtmToken);
    } catch (error) {
      console.error('Failed to renew Agora token:', error);
    }
  }, [client, onTokenWillExpire, joinedUID, rtmClient]);

  useClientEvent(client, 'token-privilege-will-expire', handleTokenWillExpire);

  const handleEndConversation = useCallback(async () => {
    onEndConversation();
  }, [onEndConversation]);

  return (
    <QuickstartConversationLayout
      statusPanel={
        <ConnectionStatusPanel
          connectionState={connectionState}
          connectionSeverity={connectionSeverity}
          connectionIssues={connectionIssues}
          isOpen={isConnectionDetailsOpen}
          onToggle={() => setIsConnectionDetailsOpen((open) => !open)}
        />
      }
      pipelineMetrics={<QuickstartPipelineMetrics metrics={agentMetrics} />}
      side={
        typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'guard' ? (
          <>
            <p className="up-note text-[1rem]" role="status">
              On guard: put the suspicious call on speaker near this device. Fraud First Aid stays quiet and speaks up the
              moment the caller asks for an OTP, a PIN, a QR scan, an app install or money.
            </p>
            <SampleScamCall />
          </>
        ) : null
      }
      transcriptPanel={
        <>
          <ComplaintCard session={agoraData.channel} cap={agoraData.cap} uid={agoraData.uid} onInterpreterStart={onInterpreterStart} agentState={agentState} />
          <SecondScreens session={agoraData.channel} viewKey={agoraData.viewCap} talkKey={agoraData.talkCap} />
        </>
      }
      transcript={
        <>
          <QuickstartTranscriptPanel
            messageList={messageList}
            currentInProgressMessage={currentInProgressMessage}
            agentUID={agentUID}
            userLabel={typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'guard' ? 'On the call' : 'You'}
          />
          <TypeInstead agentUid={agentUID} />
        </>
      }
      visualizer={
        <div
          className="relative flex h-full w-full items-center justify-center"
          role="region"
          aria-label="AI agent status visualization"
        >
          <AgentVisualizer state={visualizerState} size="md" />
          {/* listen-only family and operator links (uids 90000-99999) are never played: Agora would
              let a subscriber token publish unless co-host authentication is on (security pass, 20 Nov) */}
          {remoteUsers.filter((user) => !listenOnly(user.uid)).map((user) => (
            <div key={user.uid} className="hidden" data-remote-uid={String(user.uid)}>
              <RemoteUser user={user} />
            </div>
          ))}
          {autoplayBlocked && (
            <button
              type="button"
              className="up-btn absolute bottom-3 left-1/2 -translate-x-1/2"
              data-testid="tap-to-hear"
              onClick={() => {
                setAutoplayBlocked(false);
                remoteUsers.filter((u) => !listenOnly(u.uid)).forEach((u) => u.audioTrack?.play());
              }}
            >
              Tap to hear the agent
            </button>
          )}
        </div>
      }
      controls={
        <div
          className="mx-auto flex w-fit items-center gap-3 rounded-full px-4 py-2"
          style={{ background: 'var(--side-pane)' }}
          role="group"
          aria-label="Audio controls"
        >
          <div className="conversation-mic-host flex items-center justify-center">
            <MicButtonWithVisualizer
              isEnabled={isEnabled}
              setIsEnabled={setIsEnabled}
              track={localMicrophoneTrack}
              onToggle={handleMicToggle}
              className="overflow-visible"
              aria-label={isEnabled ? 'Mute microphone' : 'Unmute microphone'}
              enabledColor="hsl(var(--primary))"
              disabledColor="hsl(var(--destructive))"
            />
          </div>
          <MicrophoneSelector localMicrophoneTrack={localMicrophoneTrack} />
        </div>
      }
      onEndConversation={handleEndConversation}
    />
  );
}
