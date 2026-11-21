// The live "behind the scenes" panel on the call screen: which parts of the system act right now.
// Two real signals drive it: Agora's agent state over RTM (listening, thinking, speaking) and each step
// the server logs with act(). Node ids match the landing page's "Behind the scenes" lanes.
import type { Action } from './session';

export type NodeId =
  | 'you-call'
  | 'you-screen'
  | 'ag-agent'
  | 'ag-speak'
  | 'ag-second'
  | 'ag-rtc'
  | 'sv-guard'
  | 'sv-numbers'
  | 'sv-model'
  | 'sv-shot'
  | 'sv-pack'
  | 'ex-sarvam'
  | 'ex-murf'
  | 'ex-ai'
  | 'ex-ifsc'
  | 'ex-resend'
  | 'ex-store';
export type Flow = 'you-ag' | 'ag-sv' | 'sv-ex' | 'ag-you';

export function nodesForState(state: string | null | undefined): NodeId[] {
  if (state === 'listening') return ['you-call', 'ag-rtc', 'ag-agent', 'ex-sarvam'];
  if (state === 'thinking') return ['ag-agent', 'sv-model'];
  if (state === 'speaking') return ['ag-agent', 'ex-murf', 'ag-rtc', 'you-call'];
  if (state === 'silent') return ['ag-agent', 'sv-guard'];
  return [];
}

export function nodesForAction(kind: Action['kind'], text: string): NodeId[] {
  const t = text.toLowerCase();
  const n = new Set<NodeId>(['ex-store', 'you-screen']); // every step is saved, and shows on your screen
  if (kind === 'flag') ['sv-guard', 'ag-agent', 'ex-murf'].forEach((x) => n.add(x as NodeId));
  if (/agora voice agent/.test(t)) ['ag-agent', 'ag-rtc'].forEach((x) => n.add(x as NodeId));
  if (/switched from listening|understood what happened/.test(t)) ['sv-model', 'ex-ai'].forEach((x) => n.add(x as NodeId));
  if (/^heard the|^worked out when|^noted your bank|^corrected group|^you confirmed/.test(t)) n.add('sv-numbers');
  if (/ifsc/.test(t)) ['sv-model', 'ex-ifsc'].forEach((x) => n.add(x as NodeId));
  if (/payment screenshot/.test(t)) ['sv-shot', 'ex-ai'].forEach((x) => n.add(x as NodeId));
  if (/agora speak/.test(t)) ['ag-speak', 'ex-murf'].forEach((x) => n.add(x as NodeId));
  if (/^every detail confirmed/.test(t)) n.add('sv-pack');
  if (kind === 'ask') n.add('sv-model');
  if (/email/.test(t) && /pack/.test(t) && kind !== 'ask') ['sv-pack', 'ex-resend'].forEach((x) => n.add(x as NodeId));
  if (/1930 interpreter|1930 acknowledgement/.test(t)) n.add('ag-second');
  if (/1930 acknowledgement/.test(t)) n.add('sv-numbers');
  return [...n];
}

export function flowsFor(nodes: NodeId[], state: string | null | undefined): Flow[] {
  const has = (p: string) => nodes.some((x) => x.startsWith(p));
  const out: Flow[] = [];
  if (state === 'listening') out.push('you-ag');
  if (state === 'thinking') out.push('ag-sv');
  if (has('sv-') && nodes.some((x) => ['ex-ai', 'ex-ifsc', 'ex-resend', 'ex-store'].includes(x))) out.push('sv-ex');
  if (state === 'speaking') out.push('ag-you');
  return out;
}

// The newest step lights its parts for FLASH_MS, then the panel goes back to Agora's agent state.
// Time-based, so the call screen's polling, which returns the same step again and again, neither
// restarts nor extends it.
export type FlashRec = { key: string; until: number } | null;
export const FLASH_MS = 5000;

export function nextFlash(prev: FlashRec, key: string, now: number): FlashRec {
  if (!key || key === prev?.key) return prev;
  return { key, until: now + FLASH_MS };
}

export function isFlashing(rec: FlashRec, key: string, now: number): boolean {
  return !!key && rec?.key === key && now < rec.until;
}

// What the panel says when no step is lit: Agora's agent state, in words.
export function stateCaption(state: string | null | undefined, phase?: string): string {
  if (state === 'listening')
    return phase === 'guard'
      ? 'On guard: Agora carries the call to Sarvam; our server stays silent until there is a red flag'
      : 'Listening: Agora carries the call to Sarvam, which turns it into text';
  if (state === 'thinking') return 'Thinking: Agora sends the turn to our server, which decides what to do';
  if (state === 'speaking') return 'Speaking: Murf Falcon answers in your language, over Agora';
  if (state === 'silent')
    return phase === 'guard'
      ? 'Silent turn: our scam guard heard nothing risky, so the agent stays quiet and keeps listening'
      : 'Silent turn: our server chose to say nothing, so the agent keeps listening';
  if (state) return 'On the call, waiting for someone to speak';
  return 'Waiting for the agent to join the call';
}
