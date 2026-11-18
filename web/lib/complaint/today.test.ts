import { describe, expect, it } from 'vitest';
import { istToday } from './today';

describe('istToday', () => {
  it("gives India's date, not UTC's", () => {
    // 21:45 UTC on 18 Nov is 03:15 IST on 19 Nov
    expect(istToday(new Date('2026-11-18T21:45:00Z'))).toBe('2026-11-19');
    expect(istToday(new Date('2026-11-19T10:00:00Z'))).toBe('2026-11-19');
    expect(istToday(new Date('2026-11-19T18:29:00Z'))).toBe('2026-11-19');
    expect(istToday(new Date('2026-11-19T18:31:00Z'))).toBe('2026-11-20');
  });
});
