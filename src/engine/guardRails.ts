export type GuardRailAction = 'block' | 'modify' | 'caution';

export interface GuardRail {
  id: string;
  region: string;
  tags: readonly string[];
  action: GuardRailAction;
  note: string;
  exceptExerciseIds: readonly string[];
  active: boolean;
}

export interface ExerciseForRails {
  id: string;
  stressTags: readonly string[];
}

export interface GuardRailEffects {
  blocked: boolean;
  blockingNotes: string[];
  modifyNotes: string[];
  cautionNotes: string[];
}

export function applies(rail: GuardRail, exercise: ExerciseForRails): boolean {
  if (!rail.active) return false;
  if (rail.exceptExerciseIds.includes(exercise.id)) return false;
  return rail.tags.some((tag) => exercise.stressTags.includes(tag));
}

export function effectsFor(
  exercise: ExerciseForRails,
  rails: readonly GuardRail[],
): GuardRailEffects {
  const result: GuardRailEffects = {
    blocked: false,
    blockingNotes: [],
    modifyNotes: [],
    cautionNotes: [],
  };
  for (const rail of rails) {
    if (!applies(rail, exercise)) continue;
    if (rail.action === 'block') {
      result.blocked = true;
      result.blockingNotes.push(rail.note);
    } else if (rail.action === 'modify') {
      result.modifyNotes.push(rail.note);
    } else {
      result.cautionNotes.push(rail.note);
    }
  }
  return result;
}
