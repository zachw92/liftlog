import { describe, expect, it } from 'vitest';
import { e1rm, repsToBeat } from './e1rm';

describe('e1rm', () => {
  it('matches the Epley-variant formula from the spec', () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.65, 2);
    expect(e1rm(280, 3)).toBeCloseTo(307.97, 2);
  });

  it('equals the weight when reps = 1', () => {
    expect(e1rm(135, 1)).toBeCloseTo(135 + 135 * 1 * 0.0333, 2);
  });

  it('is monotonically increasing in reps', () => {
    for (let r = 1; r < 20; r++) {
      expect(e1rm(100, r + 1)).toBeGreaterThan(e1rm(100, r));
    }
  });
});

describe('repsToBeat', () => {
  it('returns smallest reps whose e1RM strictly exceeds the best so far (spec example)', () => {
    // Best OHP e1RM 116.65 (from 100 × 5); next session is 105 lb.
    expect(repsToBeat(116.65, 105)).toBe(4);
  });

  it('starts at 1 when there is no prior history', () => {
    expect(repsToBeat(0, 135)).toBe(1);
  });

  it('demands more reps at a lighter weight than at a heavier one', () => {
    expect(repsToBeat(200, 185)).toBeGreaterThan(repsToBeat(200, 195));
  });

  it('is at least 1 even when the planned weight already beats the PR at 0 reps', () => {
    expect(repsToBeat(100, 200)).toBe(1);
  });
});
