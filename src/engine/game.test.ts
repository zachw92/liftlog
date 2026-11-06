import { describe, expect, it } from 'vitest';
import {
  xpForSet,
  xpForExerciseSession,
  muscleXpSplit,
  isRepPr,
  isWeightPr,
  isE1rmPr,
  prBonus,
  barrierNote,
  levelFromXp,
} from './game';

describe('xpForSet', () => {
  it('returns 10 for a completed set that hits its target', () => {
    expect(xpForSet({ reps: 10, target: 10 })).toBe(10);
  });

  it('returns 15 when the set beats its target', () => {
    expect(xpForSet({ reps: 12, target: 10 })).toBe(15);
  });

  it('returns 0 for a missed set', () => {
    expect(xpForSet({ reps: 8, target: 10 })).toBe(0);
  });
});

describe('xpForExerciseSession', () => {
  it('caps at first 5 sets (spec: 7-set exercise → XP for 5)', () => {
    const sets = Array(7).fill({ reps: 10, target: 10 });
    // 5 sets × 10 = 50
    expect(xpForExerciseSession(sets)).toBe(50);
  });

  it('counts beats too (mix of exact and beat)', () => {
    const sets = [
      { reps: 11, target: 10 },
      { reps: 10, target: 10 },
      { reps: 10, target: 10 },
    ];
    expect(xpForExerciseSession(sets)).toBe(15 + 10 + 10);
  });

  it('skips missed sets inside the first-5-window', () => {
    const sets = [
      { reps: 10, target: 10 },
      { reps: 8, target: 10 },
      { reps: 10, target: 10 },
    ];
    expect(xpForExerciseSession(sets)).toBe(10 + 0 + 10);
  });
});

describe('muscleXpSplit', () => {
  it('100% to primary, 50% to secondary', () => {
    const split = muscleXpSplit(10, ['chest'], ['triceps', 'side delts']);
    expect(split).toEqual({ chest: 10, triceps: 5, 'side delts': 5 });
  });

  it('a muscle that is both primary and secondary takes the higher share', () => {
    const split = muscleXpSplit(10, ['chest'], ['chest']);
    expect(split).toEqual({ chest: 10 });
  });
});

describe('PR detection', () => {
  const pastBench = [
    { weight: 180, reps: 2 },
    { weight: 185, reps: 1 },
    { weight: 195, reps: 1 },
  ];

  it('isRepPr: strictly more reps than any past attempt at this weight', () => {
    expect(isRepPr({ weight: 180, reps: 3 }, pastBench)).toBe(true);
    expect(isRepPr({ weight: 180, reps: 2 }, pastBench)).toBe(false);
    expect(isRepPr({ weight: 170, reps: 1 }, pastBench)).toBe(true); // never done
  });

  it('isWeightPr: heaviest weight for ≥ repMin reps (or 1 rep for main lifts)', () => {
    // Main lift: just needs 1 rep
    expect(isWeightPr({ weight: 200, reps: 1 }, pastBench, 1, true)).toBe(true);
    expect(isWeightPr({ weight: 195, reps: 1 }, pastBench, 1, true)).toBe(false);
    // Accessory: needs repMin reps
    const accessoryPast = [{ weight: 100, reps: 10 }];
    expect(isWeightPr({ weight: 105, reps: 10 }, accessoryPast, 10, false)).toBe(true);
    expect(isWeightPr({ weight: 105, reps: 8 }, accessoryPast, 10, false)).toBe(false);
  });

  it('isE1rmPr: only for main lifts, strictly beats past best', () => {
    // Best past e1RM is 195 × 1 = 195 + 195*1*0.0333 = 201.49
    expect(isE1rmPr({ weight: 205, reps: 1 }, pastBench, true)).toBe(true);
    expect(isE1rmPr({ weight: 195, reps: 1 }, pastBench, true)).toBe(false);
    // Accessory never counts
    expect(isE1rmPr({ weight: 1000, reps: 10 }, pastBench, false)).toBe(false);
  });

  it('prBonus sums per-kind bonuses', () => {
    expect(prBonus({ rep: true, weight: false, e1rm: false })).toBe(25);
    expect(prBonus({ rep: false, weight: true, e1rm: false })).toBe(50);
    expect(prBonus({ rep: false, weight: false, e1rm: true })).toBe(100);
    expect(prBonus({ rep: true, weight: true, e1rm: true })).toBe(175);
    expect(prBonus({ rep: false, weight: false, e1rm: false })).toBe(0);
  });
});

describe('barrierNote', () => {
  const rounds = [135, 185, 200, 225, 250];

  it('planned reaches a never-lifted round number → note', () => {
    expect(barrierNote(200, 195, rounds)).toEqual({
      roundNumber: 200,
      bestSoFar: 195,
      gap: 5,
    });
  });

  it('planned weight already lifted before → no note', () => {
    expect(barrierNote(200, 200, rounds)).toBeNull();
    expect(barrierNote(200, 210, rounds)).toBeNull();
  });

  it('planned weight is not a round number → no note', () => {
    expect(barrierNote(190, 180, rounds)).toBeNull();
  });
});

describe('levelFromXp', () => {
  it('level 0 at 0 XP, level 1 at 100 XP, level 2 at 300 XP', () => {
    expect(levelFromXp(0).level).toBe(0);
    expect(levelFromXp(99).level).toBe(0);
    expect(levelFromXp(100).level).toBe(1);
    expect(levelFromXp(299).level).toBe(1);
    expect(levelFromXp(300).level).toBe(2);
  });

  it('reports xpToNext consistently', () => {
    expect(levelFromXp(0).xpToNext).toBe(100);
    expect(levelFromXp(100).xpToNext).toBe(200);
    expect(levelFromXp(50).xpToNext).toBe(50);
  });
});
