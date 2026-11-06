export type Pattern = 'push' | 'pull' | 'other';

export interface ExerciseForCoverage {
  id: string;
  primaryMuscles: readonly string[];
  secondaryMuscles: readonly string[];
  pattern: Pattern;
}

export interface PlanItemForCoverage {
  exerciseId: string;
  sets: number;
  active: boolean;
}

export interface MainLiftForCoverage {
  exerciseId: string;
  workingSetsPerWeek: number;
}

export interface CoverageSettings {
  importantMuscles: readonly string[];
  pullPushTarget: number;
}

export interface PullPushResult {
  ratio: number;
  pullSets: number;
  pushSets: number;
  underTarget: boolean;
}

type Contribution = { exercise: ExerciseForCoverage; sets: number };

function contributions(
  items: readonly PlanItemForCoverage[],
  exercises: readonly ExerciseForCoverage[],
  mainLifts: readonly MainLiftForCoverage[],
): Contribution[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const out: Contribution[] = [];
  for (const m of mainLifts) {
    const ex = byId.get(m.exerciseId);
    if (ex) out.push({ exercise: ex, sets: m.workingSetsPerWeek });
  }
  for (const i of items) {
    if (!i.active) continue;
    const ex = byId.get(i.exerciseId);
    if (ex) out.push({ exercise: ex, sets: i.sets });
  }
  return out;
}

export function weeklySetsByMuscle(
  items: readonly PlanItemForCoverage[],
  exercises: readonly ExerciseForCoverage[],
  mainLifts: readonly MainLiftForCoverage[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  const add = (muscle: string, amount: number) => {
    totals[muscle] = (totals[muscle] ?? 0) + amount;
  };
  for (const { exercise, sets } of contributions(items, exercises, mainLifts)) {
    for (const m of exercise.primaryMuscles) add(m, sets);
    for (const m of exercise.secondaryMuscles) add(m, sets * 0.5);
  }
  return totals;
}

export function pullPushRatio(
  items: readonly PlanItemForCoverage[],
  exercises: readonly ExerciseForCoverage[],
  mainLifts: readonly MainLiftForCoverage[],
  target = 2.0,
): PullPushResult {
  let pullSets = 0;
  let pushSets = 0;
  for (const { exercise, sets } of contributions(items, exercises, mainLifts)) {
    if (exercise.pattern === 'pull') pullSets += sets;
    else if (exercise.pattern === 'push') pushSets += sets;
  }
  const ratio = pushSets === 0 ? Number.POSITIVE_INFINITY : pullSets / pushSets;
  const underTarget = Number.isFinite(ratio) && ratio < target;
  return { ratio, pullSets, pushSets, underTarget };
}

export function coverageWarnings(
  items: readonly PlanItemForCoverage[],
  exercises: readonly ExerciseForCoverage[],
  mainLifts: readonly MainLiftForCoverage[],
  settings: CoverageSettings,
): string[] {
  const totals = weeklySetsByMuscle(items, exercises, mainLifts);
  return settings.importantMuscles.filter((m) => (totals[m] ?? 0) === 0);
}
