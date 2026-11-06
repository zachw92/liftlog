import { describe, expect, it } from 'vitest';
import {
  weeklySetsByMuscle,
  pullPushRatio,
  coverageWarnings,
  type ExerciseForCoverage,
  type PlanItemForCoverage,
  type MainLiftForCoverage,
} from './coverage';

const exercises: readonly ExerciseForCoverage[] = [
  {
    id: 'bench-press',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'side delts'],
    pattern: 'push',
  },
  {
    id: 'ohp',
    primaryMuscles: ['side delts'],
    secondaryMuscles: ['triceps', 'upper back'],
    pattern: 'push',
  },
  {
    id: 'deadlift',
    primaryMuscles: ['hamstrings', 'glutes', 'low back'],
    secondaryMuscles: ['lats', 'upper back'],
    pattern: 'pull',
  },
  {
    id: 'squat',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['low back', 'hamstrings'],
    pattern: 'other',
  },
  {
    id: 'row',
    primaryMuscles: ['upper back'],
    secondaryMuscles: ['lats', 'biceps'],
    pattern: 'pull',
  },
  {
    id: 'ham-curl',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    pattern: 'other',
  },
  {
    id: 'face-pull',
    primaryMuscles: ['rear delts'],
    secondaryMuscles: ['upper back'],
    pattern: 'pull',
  },
];

const mains: readonly MainLiftForCoverage[] = [
  { exerciseId: 'bench-press', workingSetsPerWeek: 3 },
  { exerciseId: 'ohp', workingSetsPerWeek: 3 },
  { exerciseId: 'deadlift', workingSetsPerWeek: 3 },
  { exerciseId: 'squat', workingSetsPerWeek: 3 },
];

const items: readonly PlanItemForCoverage[] = [
  { exerciseId: 'row', sets: 3, active: true },
  { exerciseId: 'ham-curl', sets: 3, active: true },
  { exerciseId: 'face-pull', sets: 3, active: true },
];

describe('weeklySetsByMuscle', () => {
  it('counts primary as 1 and secondary as 0.5 per set', () => {
    const m = weeklySetsByMuscle(items, exercises, mains);
    // chest: bench 3 primary = 3
    expect(m.chest).toBe(3);
    // triceps: bench 3 × 0.5 + ohp 3 × 0.5 = 3
    expect(m.triceps).toBe(3);
    // side delts: bench 3 × 0.5 + ohp 3 × 1 = 4.5
    expect(m['side delts']).toBe(4.5);
    // hamstrings: deadlift 3 primary + squat 3 secondary 0.5 + ham-curl 3 primary = 3 + 1.5 + 3 = 7.5
    expect(m.hamstrings).toBe(7.5);
    // rear delts: face-pull 3 primary = 3
    expect(m['rear delts']).toBe(3);
  });

  it('inactive items do not count', () => {
    const inactive: PlanItemForCoverage[] = [
      ...items,
      { exerciseId: 'row', sets: 3, active: false },
    ];
    const m = weeklySetsByMuscle(inactive, exercises, mains);
    expect(m['upper back']).toBe(weeklySetsByMuscle(items, exercises, mains)['upper back']);
  });
});

describe('pullPushRatio', () => {
  it('counts main-lift working sets by their pattern', () => {
    const { pullSets, pushSets, ratio } = pullPushRatio(items, exercises, mains);
    // Pull: deadlift 3 + row 3 + face-pull 3 = 9
    // Push: bench 3 + ohp 3 = 6
    expect(pullSets).toBe(9);
    expect(pushSets).toBe(6);
    expect(ratio).toBeCloseTo(9 / 6, 4);
  });

  it('flags underTarget when ratio < target', () => {
    const r = pullPushRatio(items, exercises, mains, 2.0);
    expect(r.underTarget).toBe(true);
    const r2 = pullPushRatio(items, exercises, mains, 1.0);
    expect(r2.underTarget).toBe(false);
  });

  it('returns Infinity ratio when no push sets exist', () => {
    const onlyPull: PlanItemForCoverage[] = [{ exerciseId: 'row', sets: 3, active: true }];
    const onlyPullMains: MainLiftForCoverage[] = [
      { exerciseId: 'deadlift', workingSetsPerWeek: 3 },
    ];
    const r = pullPushRatio(onlyPull, exercises, onlyPullMains);
    expect(r.ratio).toBe(Number.POSITIVE_INFINITY);
    expect(r.underTarget).toBe(false);
  });
});

describe('coverageWarnings', () => {
  it('flags important muscles at 0', () => {
    const settings = {
      importantMuscles: ['chest', 'biceps', 'glute med'],
      pullPushTarget: 2,
    };
    const warnings = coverageWarnings(items, exercises, mains, settings);
    // chest is covered by bench (3); biceps covered by row secondary (1.5); glute med has 0.
    expect(warnings).toEqual(['glute med']);
  });

  it('removing every hamstring source flags hamstrings', () => {
    // Drop the explicit ham-curl, the deadlift main lift, and squat (which has
    // hamstrings as a secondary) so no exercise touches hamstrings.
    const stripped = items.filter((i) => i.exerciseId !== 'ham-curl');
    const strippedMains = mains.filter(
      (m) => m.exerciseId !== 'deadlift' && m.exerciseId !== 'squat',
    );
    const settings = { importantMuscles: ['hamstrings'], pullPushTarget: 2 };
    expect(coverageWarnings(stripped, exercises, strippedMains, settings)).toEqual([
      'hamstrings',
    ]);
  });
});
