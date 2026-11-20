import { describe, expect, it } from 'vitest';
import { withArchive } from './conversation';
import type { IMessageListItem } from 'agora-agent-uikit';

const m = (uid: number, turn_id: number, text: string, createdAt: number) => ({ uid, turn_id, text, status: 1, createdAt }) as unknown as IMessageListItem;

describe('transcript after the interpreter takes over', () => {
  it('keeps the old conversation and shows the new agent turns that reuse old ids after it, in time order', () => {
    const archive = [m(1, 0, 'old greeting', 1), m(2, 1, 'old reply', 2)];
    const live = [m(1, 0, 'interpreter greeting', 10), m(2, 1, 'old reply', 2), m(2, 2, 'operator line', 11)];
    expect(withArchive(archive, live).map((x) => x.text)).toEqual(['old greeting', 'old reply', 'interpreter greeting', 'operator line']);
  });
  it('is the live list before any switch', () => {
    const live = [m(1, 0, 'a', 1)];
    expect(withArchive(null, live)).toBe(live);
  });
});
