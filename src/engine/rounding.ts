const EPSILON = 1e-9;
const EMPTY_BAR_LB = 45;

export function roundUpTo5(weight: number): number {
  if (weight <= EMPTY_BAR_LB) return EMPTY_BAR_LB;
  const scaled = weight / 5;
  const rounded = Math.ceil(scaled - EPSILON) * 5;
  return rounded < EMPTY_BAR_LB ? EMPTY_BAR_LB : rounded;
}
