export const DEFAULT_AGENT_UID = 123456;

// Each call's agent gets its own uid, worked out from the call's channel the same way on the server
// and in the browser (FNV-1a), in a range no caller uses (10,000,000 to 99,999,999). With one uid for
// every agent, two calls at once knocked each other off Agora's messaging (RTM logins are per user,
// not per channel), and the transcript and agent state stopped for one of them (20 Nov).
export function agentUidFor(channel: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < channel.length; i++) {
    h ^= channel.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return String(10_000_000 + (h % 90_000_000));
}
