// The agent started for each call (channel), so a call can be stopped only by its holder and only
// one agent runs per call. In memory, bounded.
const agents = new Map<string, string>();
const MAX = 500;

export const agentFor = (channel: string) => agents.get(channel);

export function claimChannel(channel: string): boolean {
  if (agents.has(channel)) return false;
  agents.set(channel, '');
  if (agents.size > MAX) agents.delete(agents.keys().next().value as string);
  return true;
}

export function setAgent(channel: string, agentId: string) {
  agents.set(channel, agentId);
}

export function releaseChannel(channel: string) {
  agents.delete(channel);
}
