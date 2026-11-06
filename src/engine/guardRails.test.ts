import { describe, expect, it } from 'vitest';
import { applies, effectsFor, type GuardRail, type ExerciseForRails } from './guardRails';

const rail1: GuardRail = {
  id: 'r1',
  region: 'R shoulder',
  tags: ['overhead-loaded'],
  action: 'block',
  note: 'No loaded overhead pressing beyond OHP programming',
  exceptExerciseIds: ['ohp', 'ohp-half-reps', 'bottoms-up-kb-press'],
  active: true,
};

const rail3: GuardRail = {
  id: 'r3',
  region: 'R shoulder',
  tags: ['shoulder-horizontal-abduction-end-range'],
  action: 'modify',
  note: 'Pec deck: adjusted start position, restricted range',
  exceptExerciseIds: [],
  active: true,
};

const rail4: GuardRail = {
  id: 'r4',
  region: 'L knee',
  tags: ['knee-single-leg-elevated'],
  action: 'block',
  note: 'No single-leg work on an elevated surface',
  exceptExerciseIds: [],
  active: true,
};

const rail6Inactive: GuardRail = {
  id: 'r6',
  region: 'L knee',
  tags: ['knee-loaded'],
  action: 'caution',
  note: 'Sleeves on',
  exceptExerciseIds: [],
  active: false,
};

const ohp: ExerciseForRails = {
  id: 'ohp',
  stressTags: ['overhead-loaded', 'spine-axial-heavy'],
};

const elevatedSplitSquat: ExerciseForRails = {
  id: 'elevated-split-squat',
  stressTags: ['knee-single-leg-elevated', 'knee-loaded'],
};

const pecDeck: ExerciseForRails = {
  id: 'pec-deck',
  stressTags: ['shoulder-horizontal-abduction-end-range'],
};

const latPulldown: ExerciseForRails = {
  id: 'cable-lat-pulldown',
  stressTags: ['grip-intensive'],
};

describe('applies', () => {
  it('matches when tags overlap and exercise is not excepted and rail is active', () => {
    expect(applies(rail4, elevatedSplitSquat)).toBe(true);
    expect(applies(rail3, pecDeck)).toBe(true);
  });

  it('respects exceptions', () => {
    expect(applies(rail1, ohp)).toBe(false);
  });

  it('inactive rails never apply', () => {
    expect(applies(rail6Inactive, elevatedSplitSquat)).toBe(false);
  });

  it('no tag overlap → no match', () => {
    expect(applies(rail1, latPulldown)).toBe(false);
  });
});

describe('effectsFor', () => {
  const rails = [rail1, rail3, rail4, rail6Inactive];

  it('elevated split squat is blocked by rail 4', () => {
    const effects = effectsFor(elevatedSplitSquat, rails);
    expect(effects.blocked).toBe(true);
    expect(effects.blockingNotes).toContain(rail4.note);
  });

  it('OHP passes rail 1 via exception → not blocked', () => {
    const effects = effectsFor(ohp, rails);
    expect(effects.blocked).toBe(false);
    expect(effects.blockingNotes).toEqual([]);
  });

  it('pec deck gets rail 3 as a modify note', () => {
    const effects = effectsFor(pecDeck, rails);
    expect(effects.modifyNotes).toContain(rail3.note);
    expect(effects.blocked).toBe(false);
    expect(effects.cautionNotes).toEqual([]);
  });

  it('inactive rails produce no notes', () => {
    const effects = effectsFor(elevatedSplitSquat, [rail6Inactive]);
    expect(effects.cautionNotes).toEqual([]);
    expect(effects.blocked).toBe(false);
  });
});
