const EPLEY_COEFFICIENT = 0.0333;

export function e1rm(weight: number, reps: number): number {
  return weight * reps * EPLEY_COEFFICIENT + weight;
}

export function repsToBeat(bestE1rm: number, weight: number): number {
  if (weight <= 0) return Number.POSITIVE_INFINITY;
  let reps = 1;
  while (e1rm(weight, reps) <= bestE1rm) reps += 1;
  return reps;
}
