export type Feel = 'bad' | 'fine' | 'great';
export type Unit = 'reps' | 'seconds' | 'steps';
export type Mode = 'progress' | 'hold';

export interface AccessoryState {
  weight: number;
  target: number;
  badStreak: number;
}

export interface AccessorySet {
  weight: number;
  reps: number;
}

export interface AccessoryContext {
  isDeload: boolean;
  unit: Unit;
  mode: Mode;
  step: number;
  repMin: number;
  repMax: number;
  isBodyweight: boolean;
}

const INCREMENTS: Record<Unit, { fine: number; great: number }> = {
  reps: { fine: 1, great: 3 },
  seconds: { fine: 5, great: 10 },
  steps: { fine: 1, great: 3 },
};

export function nextAccessoryState(
  state: AccessoryState | null,
  setLogs: readonly AccessorySet[],
  feel: Feel,
  ctx: AccessoryContext,
): AccessoryState {
  if (ctx.mode === 'hold' || ctx.isDeload) {
    return state ?? bootstrap(setLogs, ctx);
  }
  if (!state) return bootstrap(setLogs, ctx);

  const everySetAtTarget = setLogs.every((s) => s.reps >= state.target);
  const isSuccess = feel !== 'bad' && everySetAtTarget;

  if (isSuccess) {
    const atCap = state.target >= ctx.repMax;
    const goodFeel = feel === 'fine' || feel === 'great';
    if (atCap && goodFeel) {
      if (ctx.isBodyweight || ctx.unit === 'seconds') {
        return state;
      }
      return { weight: state.weight + ctx.step, target: ctx.repMin, badStreak: 0 };
    }
    const bump = feel === 'great' ? INCREMENTS[ctx.unit].great : INCREMENTS[ctx.unit].fine;
    return {
      weight: state.weight,
      target: Math.min(ctx.repMax, state.target + bump),
      badStreak: 0,
    };
  }

  const newStreak = state.badStreak + 1;
  if (newStreak >= 2) {
    const dropped = Math.max(ctx.step, state.weight - ctx.step);
    return { weight: dropped, target: state.target, badStreak: 0 };
  }
  return { weight: state.weight, target: state.target, badStreak: newStreak };
}

function bootstrap(setLogs: readonly AccessorySet[], ctx: AccessoryContext): AccessoryState {
  const usedWeight = setLogs[0]?.weight ?? 0;
  const minReps = setLogs.reduce(
    (min, s) => (s.reps < min ? s.reps : min),
    setLogs[0]?.reps ?? ctx.repMin,
  );
  return {
    weight: usedWeight,
    target: Math.min(ctx.repMax, minReps),
    badStreak: 0,
  };
}
