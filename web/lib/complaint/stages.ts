// The organisers' five stages of an agent's work (FAQ 44), which the judges score against:
// Initiate, Understand and plan, Execute, Confirm, Follow up. Each step the server logs with act()
// belongs to one of them; the call screen shows the stage beside each step and which stages this
// call has reached.
import type { Action } from './session';

export const STAGE_NAMES = ['Initiate', 'Understand and plan', 'Execute', 'Confirm', 'Follow up'] as const;
export type Stage = 0 | 1 | 2 | 3 | 4;

export function stageOf(kind: Action['kind'], text: string): Stage {
  const t = text.toLowerCase();
  // Initiate: the Agora agent joins the call
  if (/agora voice agent (joined|that stays silent)|^listening through an agora voice agent/.test(t)) return 0;
  // Follow up: the summary sent, the confirmation spoken, the 1930 call, the record updated
  if (/^started the 1930 interpreter|^saved the 1930 acknowledgement|emailed the pack|told you aloud the pack was emailed/.test(t)) return 4;
  // Confirm: approval asked, errors handled, numbers checked against the evidence or the caller
  if (kind === 'ask') return 3;
  if (/^you confirmed|^corrected group|disagrees|screenshot differs|screenshot matches|^could not email/.test(t)) return 3;
  // Understand and plan: the scam recognised, what happened understood, the switch to a report
  if (kind === 'flag' || /^understood what happened|switched from listening to taking your report/.test(t)) return 1;
  // Execute: fields recorded by tools, lookups, the pack built
  return 2;
}

export function stagesSeen(actions: Array<Pick<Action, 'kind' | 'text'>> | undefined): Set<Stage> {
  const seen = new Set<Stage>();
  // any logged step means an agent is on the call, so the call was initiated
  if (actions?.length) seen.add(0);
  for (const a of actions ?? []) seen.add(stageOf(a.kind, a.text));
  return seen;
}
