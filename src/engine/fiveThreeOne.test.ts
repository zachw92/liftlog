import { describe, expect, it } from 'vitest';
import { planMainLift, assessCycle } from './fiveThreeOne';

describe('planMainLift', () => {
  it('spec example: TM 115 Week 1 → warmups 50/60/70 × 5/5/3, work 75/90/100 × 5/5/5+', () => {
    const sets = planMainLift({ tm: 115, week: 1 });
    const warmups = sets.filter((s) => s.isWarmup);
    const work = sets.filter((s) => !s.isWarmup);

    expect(warmups.map((s) => [s.weight, s.reps])).toEqual([
      [50, 5],
      [60, 5],
      [70, 3],
    ]);
    expect(work.map((s) => [s.weight, s.reps, s.isPlusSet])).toEqual([
      [75, 5, false],
      [90, 5, false],
      [100, 5, true],
    ]);
  });

  it('Week 2 top set is 3+, Week 3 top set is 1+', () => {
    const w2 = planMainLift({ tm: 115, week: 2 });
    const w3 = planMainLift({ tm: 115, week: 3 });
    const last2 = w2.at(-1)!;
    const last3 = w3.at(-1)!;
    expect([last2.isPlusSet, last2.reps]).toEqual([true, 3]);
    expect([last3.isPlusSet, last3.reps]).toEqual([true, 1]);
  });

  it('Week 4 is three deload sets at 40/50/60 with no plus set and no extra warmups', () => {
    const sets = planMainLift({ tm: 115, week: 4 });
    expect(sets).toHaveLength(3);
    expect(sets.every((s) => !s.isWarmup && !s.isPlusSet)).toBe(true);
    expect(sets.map((s) => s.reps)).toEqual([5, 5, 5]);
    // 115 * 0.4 = 46 → 50, 115 * 0.5 = 57.5 → 60, 115 * 0.6 = 69 → 70
    expect(sets.map((s) => s.weight)).toEqual([50, 60, 70]);
  });

  it('never prescribes a set below the empty bar (45 lb)', () => {
    const sets = planMainLift({ tm: 50, week: 1 });
    for (const s of sets) expect(s.weight).toBeGreaterThanOrEqual(45);
  });

  describe('reproduces the seeded sheet exactly', () => {
    const SEED = {
      ohp: {
        tm: 108,
        week1: [
          [45, 5, false],
          [55, 5, false],
          [65, 3, false],
          [75, 5, false],
          [85, 5, false],
          [95, 5, true],
        ],
        week2: [
          [45, 5, false],
          [55, 5, false],
          [65, 3, false],
          [80, 3, false],
          [90, 3, false],
          [100, 3, true],
        ],
        week3: [
          [45, 5, false],
          [55, 5, false],
          [65, 3, false],
          [85, 5, false],
          [95, 3, false],
          [105, 1, true],
        ],
        week4: [
          [45, 5, false],
          [55, 5, false],
          [65, 5, false],
        ],
      },
      bench: {
        tm: 193.5,
        week1: [
          [80, 5, false],
          [100, 5, false],
          [120, 3, false],
          [130, 5, false],
          [150, 5, false],
          [165, 5, true],
        ],
        week2: [
          [80, 5, false],
          [100, 5, false],
          [120, 3, false],
          [140, 3, false],
          [155, 3, false],
          [175, 3, true],
        ],
        week3: [
          [80, 5, false],
          [100, 5, false],
          [120, 3, false],
          [150, 5, false],
          [165, 3, false],
          [185, 1, true],
        ],
        week4: [
          [80, 5, false],
          [100, 5, false],
          [120, 5, false],
        ],
      },
      squat: {
        tm: 238.5,
        week1: [
          [100, 5, false],
          [120, 5, false],
          [145, 3, false],
          [160, 5, false],
          [180, 5, false],
          [205, 5, true],
        ],
        week2: [
          [100, 5, false],
          [120, 5, false],
          [145, 3, false],
          [170, 3, false],
          [195, 3, false],
          [215, 3, true],
        ],
        week3: [
          [100, 5, false],
          [120, 5, false],
          [145, 3, false],
          [180, 5, false],
          [205, 3, false],
          [230, 1, true],
        ],
        week4: [
          [100, 5, false],
          [120, 5, false],
          [145, 5, false],
        ],
      },
      deadlift: {
        tm: 310.5,
        week1: [
          [125, 5, false],
          [160, 5, false],
          [190, 3, false],
          [205, 5, false],
          [235, 5, false],
          [265, 5, true],
        ],
        week2: [
          [125, 5, false],
          [160, 5, false],
          [190, 3, false],
          [220, 3, false],
          [250, 3, false],
          [280, 3, true],
        ],
        week3: [
          [125, 5, false],
          [160, 5, false],
          [190, 3, false],
          [235, 5, false],
          [265, 3, false],
          [295, 1, true],
        ],
        week4: [
          [125, 5, false],
          [160, 5, false],
          [190, 5, false],
        ],
      },
    } as const;

    for (const [lift, data] of Object.entries(SEED)) {
      for (const week of [1, 2, 3, 4] as const) {
        const key = `week${week}` as const;
        it(`${lift} week ${week}`, () => {
          const expected = data[key] as readonly (readonly [number, number, boolean])[];
          const actual = planMainLift({ tm: data.tm, week }).map(
            (s) => [s.weight, s.reps, s.isPlusSet] as const,
          );
          expect(actual).toEqual(expected.map((e) => [...e]));
        });
      }
    }
  });
});

describe('assessCycle', () => {
  it('all minimums hit AND Week 3 + set ≥ threshold → +increment', () => {
    // bench/OHP get +5
    expect(
      assessCycle({
        tm: 193.5,
        increment: 5,
        reps: { week1: 5, week2: 3, week3: 3 },
        threshold: 3,
        priorMissStreak: 0,
      }),
    ).toEqual({ action: 'increment', newTm: 198.5, missStreak: 0 });

    // squat/DL get +10
    expect(
      assessCycle({
        tm: 310.5,
        increment: 10,
        reps: { week1: 5, week2: 3, week3: 5 },
        threshold: 3,
        priorMissStreak: 0,
      }),
    ).toEqual({ action: 'increment', newTm: 320.5, missStreak: 0 });
  });

  it('Week 3 + set below threshold → hold even if all minimums hit (bench 185 × 2)', () => {
    expect(
      assessCycle({
        tm: 193.5,
        increment: 5,
        reps: { week1: 5, week2: 3, week3: 2 },
        threshold: 3,
        priorMissStreak: 0,
      }),
    ).toEqual({ action: 'hold', newTm: 193.5, missStreak: 1 });
  });

  it('Week 3 + set at threshold is good enough → increment (bench 185 × 3)', () => {
    expect(
      assessCycle({
        tm: 193.5,
        increment: 5,
        reps: { week1: 5, week2: 3, week3: 3 },
        threshold: 3,
        priorMissStreak: 0,
      }),
    ).toEqual({ action: 'increment', newTm: 198.5, missStreak: 0 });
  });

  it('any week minimum missed → hold', () => {
    expect(
      assessCycle({
        tm: 193.5,
        increment: 5,
        reps: { week1: 4, week2: 3, week3: 5 }, // week 1 min is 5
        threshold: 3,
        priorMissStreak: 0,
      }),
    ).toEqual({ action: 'hold', newTm: 193.5, missStreak: 1 });

    expect(
      assessCycle({
        tm: 193.5,
        increment: 5,
        reps: { week1: 5, week2: 2, week3: 5 }, // week 2 min is 3
        threshold: 3,
        priorMissStreak: 0,
      }),
    ).toEqual({ action: 'hold', newTm: 193.5, missStreak: 1 });
  });

  it('two cycle misses in a row → TM × 0.9 unrounded (193.5 → 174.15)', () => {
    expect(
      assessCycle({
        tm: 193.5,
        increment: 5,
        reps: { week1: 4, week2: 3, week3: 3 },
        threshold: 3,
        priorMissStreak: 1,
      }),
    ).toEqual({ action: 'reset', newTm: 174.15, missStreak: 0 });
  });

  it('a successful cycle resets miss streak to 0', () => {
    expect(
      assessCycle({
        tm: 193.5,
        increment: 5,
        reps: { week1: 5, week2: 3, week3: 3 },
        threshold: 3,
        priorMissStreak: 1,
      }).missStreak,
    ).toBe(0);
  });
});
