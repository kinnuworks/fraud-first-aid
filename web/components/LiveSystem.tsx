'use client';

// "Behind the scenes, live" on the call screen: the four parts of the system, lit as they act on this
// call. Driven by two real signals: Agora's agent state over RTM (listening, thinking, speaking) and
// each step our server logs (the same steps as "What it's doing"). See lib/complaint/live-nodes.ts.
import { useEffect, useRef, useState } from 'react';
import { flowsFor, nodesForAction, nodesForState, type Flow, type NodeId } from '@/lib/complaint/live-nodes';
import { STAGE_NAMES, stageOf } from '@/lib/complaint/stages';
import type { ComplaintView } from './ComplaintCard';

type Step = NonNullable<ComplaintView['actions']>[number];

const LANES: Array<{
  id: 'you' | 'ag' | 'sv' | 'ex';
  name: string;
  nodes: Array<[NodeId, string]>;
}> = [
  {
    id: 'you',
    name: 'You',
    nodes: [
      ['you-call', 'Call on speaker'],
      ['you-screen', 'This screen'],
    ],
  },
  {
    id: 'ag',
    name: 'Agora',
    nodes: [
      ['ag-agent', 'AI agent'],
      ['ag-rtc', 'RTC · RTM'],
      ['ag-speak', 'Speak API'],
      ['ag-second', 'Second agent'],
    ],
  },
  {
    id: 'sv',
    name: 'Our server',
    nodes: [
      ['sv-guard', 'Scam guard'],
      ['sv-numbers', 'Number layer'],
      ['sv-model', 'AI + 12 tools'],
      ['sv-shot', 'Screenshot check'],
      ['sv-pack', 'Pack builder'],
    ],
  },
  {
    id: 'ex',
    name: 'Services',
    nodes: [
      ['ex-sarvam', 'Sarvam'],
      ['ex-murf', 'Murf Falcon'],
      ['ex-ai', 'AI model'],
      ['ex-ifsc', 'Razorpay IFSC'],
      ['ex-resend', 'Resend'],
      ['ex-store', 'Upstash'],
    ],
  },
];

const SAY: Record<string, string> = {
  listening: 'Listening: Agora carries the call to Sarvam, which turns it into text',
  thinking: 'Thinking: Agora sends the turn to our server, which decides what to do',
  speaking: 'Speaking: Murf Falcon answers in your language, over Agora',
};

export function LiveSystem({ actions, agentState, phase }: { actions?: Step[]; agentState?: string | null; phase?: string }) {
  const newest = actions?.length ? actions[actions.length - 1] : undefined;
  const key = newest ? `${newest.at}|${newest.text}` : '';
  // a call screen passes agentState (null until the agent reports); previews and shared views don't
  const live = agentState !== undefined;
  const [flash, setFlash] = useState<Step | undefined>(live ? undefined : newest);
  const seen = useRef(key);
  useEffect(() => {
    if (!newest) return;
    if (!live) {
      setFlash(newest);
      return;
    }
    if (key === seen.current) return;
    seen.current = key;
    setFlash(newest);
    const t = setTimeout(() => setFlash(undefined), 5000);
    return () => clearTimeout(t);
  }, [key, live, newest]);

  const lit = new Set<NodeId>([...nodesForState(agentState), ...(flash ? nodesForAction(flash.kind, flash.text) : [])]);
  const flows = new Set<Flow>(flowsFor([...lit], agentState));
  const caption = flash
    ? `${STAGE_NAMES[stageOf(flash.kind, flash.text)]}: ${flash.text}`
    : agentState && SAY[agentState]
      ? phase === 'guard' && agentState === 'listening'
        ? 'On guard: Agora carries the call to Sarvam; our server stays silent until there is a red flag'
        : SAY[agentState]
      : live
        ? 'Waiting for the agent to join the call'
        : 'The latest step, and the parts that did it';

  return (
    <section className="cd-card ls-card" aria-label="Behind the scenes on this call">
      <div className="as-head">
        <span className="up-label">Behind the scenes</span>
        <span className="as-live" aria-hidden="true">
          {live ? 'live' : 'sample'}
        </span>
      </div>
      <div className="ls-strip" aria-hidden="true">
        <span className={`ls-node ls-node--you${[...lit].some((n) => n.startsWith('you')) ? ' is-on' : ''}`}>You</span>
        <span className={`ls-seg${flows.has('you-ag') ? ' is-fwd' : ''}${flows.has('ag-you') ? ' is-back' : ''}`}>
          <i />
        </span>
        <span className={`ls-node ls-node--ag${[...lit].some((n) => n.startsWith('ag')) ? ' is-on' : ''}`}>Agora</span>
        <span className={`ls-seg${flows.has('ag-sv') ? ' is-fwd' : ''}`}>
          <i />
        </span>
        <span className={`ls-node ls-node--sv${[...lit].some((n) => n.startsWith('sv')) ? ' is-on' : ''}`}>Our server</span>
        <span className={`ls-seg${flows.has('sv-ex') ? ' is-fwd' : ''}`}>
          <i />
        </span>
        <span className={`ls-node ls-node--ex${[...lit].some((n) => n.startsWith('ex')) ? ' is-on' : ''}`}>Services</span>
      </div>
      <div className="ls-lanes">
        {LANES.map((lane) => (
          <ul key={lane.id} className={`ls-lane ls-lane--${lane.id}`} aria-label={lane.name}>
            {lane.nodes.map(([id, label]) => (
              <li key={id} className={`ls-chip${lit.has(id) ? ' is-on' : ''}`}>
                {label}
              </li>
            ))}
          </ul>
        ))}
      </div>
      <p className="ls-now">
        <b>Now · </b>
        {caption}
      </p>
    </section>
  );
}
