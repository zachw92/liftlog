import { roundUpTo5 } from './rounding';

export type Week = 1 | 2 | 3 | 4;

export interface PlannedSet {
  weight: number;
  reps: number;
  percentage: number;
  isWarmup: boolean;
  isPlusSet: boolean;
}

interface SetTemplate {
  pct: number;
  reps: number;
}

const WARMUPS: readonly SetTemplate[] = [
  { pct: 0.4, reps: 5 },
  { pct: 0.5, reps: 5 },
  { pct: 0.6, reps: 3 },
];

const WORK_SETS: Record<Week, readonly SetTemplate[]> = {
  1: [
    { pct: 0.65, reps: 5 },
    { pct: 0.75, reps: 5 },
    { pct: 0.85, reps: 5 },
  ],
  2: [
    { pct: 0.7, reps: 3 },
    { pct: 0.8, reps: 3 },
    { pct: 0.9, reps: 3 },
  ],
  3: [
    { pct: 0.75, reps: 5 },
    { pct: 0.85, reps: 3 },
    { pct: 0.95, reps: 1 },
  ],
  4: [
    { pct: 0.4, reps: 5 },
    { pct: 0.5, reps: 5 },
    { pct: 0.6, reps: 5 },
  ],
};

export function planMainLift({ tm, week }: { tm: number; week: Week }): PlannedSet[] {
  const sets: PlannedSet[] = [];
  if (week !== 4) {
    for (const t of WARMUPS) {
      sets.push({
        weight: roundUpTo5(tm * t.pct),
        reps: t.reps,
        percentage: t.pct,
        isWarmup: true,
        isPlusSet: false,
      });
    }
  }
  const work = WORK_SETS[week];
  work.forEach((t, i) => {
    sets.push({
      weight: roundUpTo5(tm * t.pct),
      reps: t.reps,
      percentage: t.pct,
      isWarmup: false,
      isPlusSet: week !== 4 && i === work.length - 1,
    });
  });
  return sets;
}

export type CycleAction = 'increment' | 'hold' | 'reset';

export interface CycleReps {
  week1: number;
  week2: number;
  week3: number;
}

export interface AssessCycleInput {
  tm: number;
  increment: number;
  reps: CycleReps;
  threshold: number;
  priorMissStreak: number;
}

export interface AssessCycleResult {
  action: CycleAction;
  newTm: number;
  missStreak: number;
}

const WEEK_MINIMUMS = { week1: 5, week2: 3, week3: 1 } as const;

export function assessCycle({
  tm,
  increment,
  reps,
  threshold,
  priorMissStreak,
}: AssessCycleInput): AssessCycleResult {
  const allMinimumsHit =
    reps.week1 >= WEEK_MINIMUMS.week1 &&
    reps.week2 >= WEEK_MINIMUMS.week2 &&
    reps.week3 >= WEEK_MINIMUMS.week3;
  const thresholdHit = reps.week3 >= threshold;

  if (allMinimumsHit && thresholdHit) {
    return { action: 'increment', newTm: tm + increment, missStreak: 0 };
  }
  if (priorMissStreak >= 1) {
    return { action: 'reset', newTm: tm * 0.9, missStreak: 0 };
  }
  return { action: 'hold', newTm: tm, missStreak: priorMissStreak + 1 };
}
