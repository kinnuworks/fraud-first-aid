import { describe, expect, it } from 'vitest';
import { newChannel, capFor, checkCap } from './capability';

describe('call capability', () => {
  const env = process.env;
  it('issues unguessable channel names that pass the session check', () => {
    process.env = { ...env, LLM_SHARED_SECRET: 's3cret' };
    const a = newChannel(), b = newChannel();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^up-[0-9a-f]{32}$/);
  });
  it('accepts only the capability issued for that channel', () => {
    process.env = { ...env, LLM_SHARED_SECRET: 's3cret' };
    const ch = newChannel();
    const cap = capFor(ch)!;
    expect(checkCap(ch, cap)).toBe(true);
    expect(checkCap(newChannel(), cap)).toBe(false);
    expect(checkCap(ch, cap.slice(0, -1) + (cap.endsWith('a') ? 'b' : 'a'))).toBe(false);
    expect(checkCap(ch, null)).toBe(false);
  });
  it('fails closed without a server secret', () => {
    process.env = { ...env, LLM_SHARED_SECRET: '' };
    expect(capFor('up-x')).toBeNull();
    expect(checkCap('up-x', 'anything')).toBe(false);
    process.env = env;
  });
});

describe('read-only view capability', () => {
  it('lets a viewer read a call but is not a full capability', async () => {
    const { viewCapFor, canView } = await import('./capability');
    process.env.LLM_SHARED_SECRET = 's3cret';
    const ch = newChannel();
    const view = viewCapFor(ch)!;
    expect(canView(ch, view)).toBe(true);
    expect(canView(ch, capFor(ch))).toBe(true); // the owner can view too
    expect(checkCap(ch, view)).toBe(false); // but a view link cannot act on the call
    expect(canView(newChannel(), view)).toBe(false);
  });
});
