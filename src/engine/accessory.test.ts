import { describe, expect, it } from 'vitest';
import {
  nextAccessoryState,
  type AccessoryContext,
  type AccessoryState,
} from './accessory';

const ctxReps = (overrides: Partial<AccessoryContext> = {}): AccessoryContext => ({
  isDeload: false,
  unit: 'reps',
  mode: 'progress',
  step: 5,
  repMin: 10,
  repMax: 15,
  isBodyweight: false,
  ...overrides,
});

const sets = (...pairs: [number, number][]) =>
  pairs.map(([weight, reps]) => ({ weight, reps }));

describe('nextAccessoryState — six-session lat pulldown table', () => {
  const ctx = ctxReps();
  const s0: AccessoryState = { weight: 100, target: 10, badStreak: 0 };

  it('session 1: 100 × 10,10,10 Fine → 100 × 11', () => {
    const next = nextAccessoryState(s0, sets([100, 10], [100, 10], [100, 10]), 'fine', ctx);
    expect(next).toEqual({ weight: 100, target: 11, badStreak: 0 });
  });

  it('session 2: 100 × 11,11,11 Great → 100 × 14', () => {
    const s = { weight: 100, target: 11, badStreak: 0 };
    const next = nextAccessoryState(s, sets([100, 11], [100, 11], [100, 11]), 'great', ctx);
    expect(next).toEqual({ weight: 100, target: 14, badStreak: 0 });
  });

  it('session 3: 100 × 14,14,14 Great → 100 × 15 (capped at repMax)', () => {
    const s = { weight: 100, target: 14, badStreak: 0 };
    const next = nextAccessoryState(s, sets([100, 14], [100, 14], [100, 14]), 'great', ctx);
    expect(next).toEqual({ weight: 100, target: 15, badStreak: 0 });
  });

  it('session 4: 100 × 15,15,15 Fine (cap+good) → 105 × 10', () => {
    const s = { weight: 100, target: 15, badStreak: 0 };
    const next = nextAccessoryState(s, sets([100, 15], [100, 15], [100, 15]), 'fine', ctx);
    expect(next).toEqual({ weight: 105, target: 10, badStreak: 0 });
  });

  it('session 5: 105 × 10,10,9 Fine (missed) → streak 1, no change', () => {
    const s = { weight: 105, target: 10, badStreak: 0 };
    const next = nextAccessoryState(s, sets([105, 10], [105, 10], [105, 9]), 'fine', ctx);
    expect(next).toEqual({ weight: 105, target: 10, badStreak: 1 });
  });

  it('session 6: 105 × 10,10,10 Bad (streak 2) → drop to 100 × 10, streak reset', () => {
    const s = { weight: 105, target: 10, badStreak: 1 };
    const next = nextAccessoryState(s, sets([105, 10], [105, 10], [105, 10]), 'bad', ctx);
    expect(next).toEqual({ weight: 100, target: 10, badStreak: 0 });
  });
});

describe('nextAccessoryState — first log (no prior state)', () => {
  it('bootstraps baseline: weight = used, target = min reps across sets, no progression', () => {
    const next = nextAccessoryState(null, sets([80, 12], [80, 12], [80, 12]), 'fine', ctxReps());
    expect(next).toEqual({ weight: 80, target: 12, badStreak: 0 });
  });

  it('caps initial target at repMax', () => {
    const next = nextAccessoryState(null, sets([80, 20], [80, 20], [80, 20]), 'great', ctxReps());
    expect(next.target).toBe(15); // repMax
  });

  it('target = weakest-set reps', () => {
    const next = nextAccessoryState(null, sets([80, 14], [80, 11], [80, 13]), 'fine', ctxReps());
    expect(next.target).toBe(11);
  });
});

describe('nextAccessoryState — hold mode and deload', () => {
  it('hold mode: never changes state', () => {
    const s: AccessoryState = { weight: 50, target: 15, badStreak: 0 };
    const ctx = ctxReps({ mode: 'hold' });
    expect(
      nextAccessoryState(s, sets([50, 15], [50, 15], [50, 15]), 'great', ctx),
    ).toEqual(s);
    expect(
      nextAccessoryState(s, sets([50, 10], [50, 8], [50, 7]), 'bad', ctx),
    ).toEqual(s);
  });

  it('deload week: never changes state for any exercise', () => {
    const s: AccessoryState = { weight: 100, target: 15, badStreak: 1 };
    const ctx = ctxReps({ isDeload: true });
    expect(
      nextAccessoryState(s, sets([100, 15], [100, 15], [100, 15]), 'great', ctx),
    ).toEqual(s);
  });
});

describe('nextAccessoryState — drop floor', () => {
  it('weight never drops below one step', () => {
    const s: AccessoryState = { weight: 5, target: 10, badStreak: 1 };
    const next = nextAccessoryState(s, sets([5, 10]), 'bad', ctxReps({ step: 5 }));
    expect(next.weight).toBe(5);
    expect(next.badStreak).toBe(0);
  });
});

describe('nextAccessoryState — seconds unit', () => {
  const sec = ctxReps({ unit: 'seconds', repMin: 30, repMax: 90, step: 0 });

  it('Great adds 10 seconds; Fine adds 5', () => {
    const s: AccessoryState = { weight: 0, target: 45, badStreak: 0 };
    expect(nextAccessoryState(s, sets([0, 45], [0, 45], [0, 45]), 'great', sec).target).toBe(55);
    expect(nextAccessoryState(s, sets([0, 45], [0, 45], [0, 45]), 'fine', sec).target).toBe(50);
  });

  it('at repMax holds (no load change)', () => {
    const s: AccessoryState = { weight: 0, target: 90, badStreak: 0 };
    const next = nextAccessoryState(s, sets([0, 90], [0, 90], [0, 90]), 'great', sec);
    expect(next).toEqual(s);
  });
});

describe('nextAccessoryState — steps unit', () => {
  it('70 × 50 clean + Fine → 80 × 50 (repMin = repMax triggers cap+good)', () => {
    const s: AccessoryState = { weight: 70, target: 50, badStreak: 0 };
    const ctx = ctxReps({ unit: 'steps', repMin: 50, repMax: 50, step: 10 });
    const next = nextAccessoryState(s, sets([70, 50], [70, 50], [70, 50]), 'fine', ctx);
    expect(next).toEqual({ weight: 80, target: 50, badStreak: 0 });
  });
});

describe('nextAccessoryState — bodyweight', () => {
  it('at repMax with Fine/Great: holds (no weight bump)', () => {
    const s: AccessoryState = { weight: 0, target: 15, badStreak: 0 };
    const ctx = ctxReps({ isBodyweight: true });
    const next = nextAccessoryState(s, sets([0, 15], [0, 15], [0, 15]), 'great', ctx);
    expect(next).toEqual(s);
  });
});
