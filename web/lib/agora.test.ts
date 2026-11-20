import { describe, expect, it } from 'vitest';
import { agentUidFor } from './agora';

describe("each call's agent has its own uid (concurrent calls shared one RTM login, 20 Nov)", () => {
  it('is the same for a channel every time, in a range no caller uses, and differs between calls', () => {
    const a = agentUidFor('up-0123456789abcdef0123456789abcdef');
    expect(agentUidFor('up-0123456789abcdef0123456789abcdef')).toBe(a);
    const n = Number(a);
    expect(n).toBeGreaterThanOrEqual(10_000_000);
    expect(n).toBeLessThan(100_000_000);
    const seen = new Set(Array.from({ length: 200 }, (_, i) => agentUidFor(`up-${i.toString(16).padStart(32, '0')}`)));
    expect(seen.size).toBeGreaterThan(195);
  });
});
