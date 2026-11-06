// Clock indirection so engines/tests never call Date.now() directly.

export type Clock = () => Date;

export const systemClock: Clock = () => new Date();

export function nowIso(clock: Clock = systemClock): string {
  return clock().toISOString();
}

export function todayIso(clock: Clock = systemClock): string {
  return clock().toISOString().slice(0, 10);
}
