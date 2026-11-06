import { e1rm } from './e1rm';

const BASE_SET_XP = 10;
const BEAT_TARGET_BONUS = 5;
const MAX_XP_SETS_PER_EXERCISE = 5;

const REP_PR_BONUS = 25;
const WEIGHT_PR_BONUS = 50;
const E1RM_PR_BONUS = 100;

export interface SetForXp {
  reps: number;
  target: number;
}

export function xpForSet(set: SetForXp): number {
  if (set.reps < set.target) return 0;
  return set.reps > set.target ? BASE_SET_XP + BEAT_TARGET_BONUS : BASE_SET_XP;
}

export function xpForExerciseSession(sets: readonly SetForXp[]): number {
  let total = 0;
  const cap = Math.min(MAX_XP_SETS_PER_EXERCISE, sets.length);
  for (let i = 0; i < cap; i++) total += xpForSet(sets[i]!);
  return total;
}

export function muscleXpSplit(
  xp: number,
  primary: readonly string[],
  secondary: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of secondary) out[m] = xp * 0.5;
  for (const m of primary) out[m] = xp;
  return out;
}

export interface PastSet {
  weight: number;
  reps: number;
}

export interface Attempt {
  weight: number;
  reps: number;
}

export function isRepPr(attempt: Attempt, past: readonly PastSet[]): boolean {
  const bestAtWeight = past.reduce(
    (best, s) => (s.weight === attempt.weight && s.reps > best ? s.reps : best),
    0,
  );
  return attempt.reps > bestAtWeight;
}

export function isWeightPr(
  attempt: Attempt,
  past: readonly PastSet[],
  repMin: number,
  isMainLift: boolean,
): boolean {
  const threshold = isMainLift ? 1 : repMin;
  if (attempt.reps < threshold) return false;
  const heaviestQualified = past.reduce(
    (best, s) => (s.reps >= threshold && s.weight > best ? s.weight : best),
    0,
  );
  return attempt.weight > heaviestQualified;
}

export function isE1rmPr(
  attempt: Attempt,
  past: readonly PastSet[],
  isMainLift: boolean,
): boolean {
  if (!isMainLift) return false;
  const bestE1rm = past.reduce((best, s) => Math.max(best, e1rm(s.weight, s.reps)), 0);
  return e1rm(attempt.weight, attempt.reps) > bestE1rm;
}

export interface PrKinds {
  rep: boolean;
  weight: boolean;
  e1rm: boolean;
}

export function prBonus(kinds: PrKinds): number {
  let total = 0;
  if (kinds.rep) total += REP_PR_BONUS;
  if (kinds.weight) total += WEIGHT_PR_BONUS;
  if (kinds.e1rm) total += E1RM_PR_BONUS;
  return total;
}

export interface BarrierNote {
  roundNumber: number;
  bestSoFar: number;
  gap: number;
}

export function barrierNote(
  plannedWeight: number,
  bestEverOnLift: number,
  roundNumbers: readonly number[],
): BarrierNote | null {
  if (!roundNumbers.includes(plannedWeight)) return null;
  if (bestEverOnLift >= plannedWeight) return null;
  return {
    roundNumber: plannedWeight,
    bestSoFar: bestEverOnLift,
    gap: plannedWeight - bestEverOnLift,
  };
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpToNext: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 0;
  let consumed = 0;
  while (consumed + (level + 1) * 100 <= xp) {
    level += 1;
    consumed += level * 100;
  }
  const xpToNext = (level + 1) * 100 - (xp - consumed);
  return { level, xpIntoLevel: xp - consumed, xpToNext };
}
