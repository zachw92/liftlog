import { afterEach, describe, expect, it } from 'vitest';
import {
  EXERCISES,
  GUARD_RAILS,
  MAIN_LIFTS,
  PLAN_DAYS,
  PLAN_ITEMS,
  EXERCISE_STATES,
  HISTORICAL_SET_LOGS,
  HISTORICAL_SESSION,
  DEFAULT_SETTINGS,
  seedDb,
} from './seed';
import { LiftLogDb } from './db';
import {
  pullPushRatio,
  weeklySetsByMuscle,
  type ExerciseForCoverage,
  type PlanItemForCoverage,
  type MainLiftForCoverage,
} from '../engine/coverage';
import { effectsFor } from '../engine/guardRails';

describe('seed — internal referential integrity', () => {
  const exerciseIds = new Set(EXERCISES.map((e) => e.id));
  const planDayIds = new Set(PLAN_DAYS.map((d) => d.id));
  const planItemIds = new Set(PLAN_ITEMS.map((i) => i.id));
  const mainLiftIds = new Set(MAIN_LIFTS.map((m) => m.id));

  it('every PlanItem.exerciseId exists in EXERCISES', () => {
    for (const it of PLAN_ITEMS) {
      expect(exerciseIds, `planItem ${it.id} → ${it.exerciseId}`).toContain(
        it.exerciseId,
      );
    }
  });

  it('every PlanItem.planDayId exists in PLAN_DAYS', () => {
    for (const it of PLAN_ITEMS) {
      expect(planDayIds).toContain(it.planDayId);
    }
  });

  it('every PlanDay.mainLiftId (if set) exists in MAIN_LIFTS', () => {
    for (const d of PLAN_DAYS) {
      if (d.mainLiftId) expect(mainLiftIds).toContain(d.mainLiftId);
    }
  });

  it('every ExerciseState.planItemId exists in PLAN_ITEMS', () => {
    for (const s of EXERCISE_STATES) {
      expect(planItemIds).toContain(s.planItemId);
    }
  });

  it('historical SetLogs reference real main-lift exercises', () => {
    for (const log of HISTORICAL_SET_LOGS) {
      expect(exerciseIds).toContain(log.exerciseId);
      const ex = EXERCISES.find((e) => e.id === log.exerciseId);
      expect(ex?.isMainLift).toBe(true);
    }
  });

  it('historical session has status "finished"', () => {
    expect(HISTORICAL_SESSION.status).toBe('finished');
  });

  it('every active PlanItem references an existing exercise', () => {
    for (const it of PLAN_ITEMS.filter((i) => i.active)) {
      expect(exerciseIds).toContain(it.exerciseId);
    }
  });
});

describe('seed — coverage against spec claims', () => {
  const coverageExercises: ExerciseForCoverage[] = EXERCISES.map((e) => ({
    id: e.id,
    primaryMuscles: e.primaryMuscles,
    secondaryMuscles: e.secondaryMuscles,
    pattern: e.pattern,
  }));

  // Main lifts count as their 3 working sets.
  const coverageMains: MainLiftForCoverage[] = MAIN_LIFTS.map((m) => ({
    exerciseId: {
      bench: 'bench-press',
      deadlift: 'deadlift',
      ohp: 'ohp',
      squat: 'squat',
    }[m.id],
    workingSetsPerWeek: 3,
  }));

  // Everything in the active, non-historical plan contributes.
  const coverageItems: PlanItemForCoverage[] = PLAN_ITEMS.filter(
    (i) => i.planDayId !== 'day-historical',
  ).map((i) => ({
    exerciseId: i.exerciseId,
    sets: i.sets,
    active: i.active,
  }));

  it('pull:push on the seeded plan triggers the under-target warning', () => {
    const r = pullPushRatio(coverageItems, coverageExercises, coverageMains, 2.0);
    // Spec sanity: the warning is expected to show "from day one" with the seed.
    expect(r.underTarget).toBe(true);
    expect(r.ratio).toBeGreaterThan(0);
    expect(r.ratio).toBeLessThan(2);
  });

  it('no important muscle sits at exactly 0 sets in the seeded plan', () => {
    const totals = weeklySetsByMuscle(coverageItems, coverageExercises, coverageMains);
    for (const m of DEFAULT_SETTINGS.importantMuscles) {
      expect(totals[m] ?? 0, `${m} coverage`).toBeGreaterThan(0);
    }
  });
});

describe('seedDb — persists the seed and is idempotent', () => {
  const dbs: LiftLogDb[] = [];
  afterEach(async () => {
    for (const d of dbs.splice(0)) {
      d.close();
      await d.delete();
    }
  });

  async function freshDb(): Promise<LiftLogDb> {
    const name = `test_${Math.random().toString(36).slice(2)}`;
    const d = new LiftLogDb(name);
    dbs.push(d);
    return d;
  }

  it('inserts every seeded entity on a fresh DB', async () => {
    const d = await freshDb();
    await seedDb(d);
    expect(await d.exercises.count()).toBe(EXERCISES.length);
    expect(await d.planDays.count()).toBe(PLAN_DAYS.length);
    expect(await d.planItems.count()).toBe(PLAN_ITEMS.length);
    expect(await d.exerciseStates.count()).toBe(EXERCISE_STATES.length);
    expect(await d.mainLifts.count()).toBe(MAIN_LIFTS.length);
    expect(await d.guardRails.count()).toBe(GUARD_RAILS.length);
    expect(await d.sessions.count()).toBe(1);
    expect(await d.setLogs.count()).toBe(HISTORICAL_SET_LOGS.length);
    expect((await d.meta.get('singleton'))?.settings.pullPushTarget).toBe(2);
  });

  it('is idempotent: running twice does not duplicate rows', async () => {
    const d = await freshDb();
    await seedDb(d);
    await seedDb(d);
    expect(await d.exercises.count()).toBe(EXERCISES.length);
  });
});

describe('seed — guard rails apply as the spec expects', () => {
  it('pec deck picks up rail 3 as a modify note', () => {
    const pecDeck = EXERCISES.find((e) => e.id === 'pec-deck')!;
    const effects = effectsFor(pecDeck, GUARD_RAILS);
    expect(effects.modifyNotes.length).toBeGreaterThan(0);
    expect(effects.blocked).toBe(false);
  });

  it('OHP passes rail 1 (overhead-loaded) via its exception', () => {
    const ohp = EXERCISES.find((e) => e.id === 'ohp')!;
    expect(effectsFor(ohp, GUARD_RAILS).blocked).toBe(false);
  });

  it('bench press is blocked by rail 2 (wide-flare)', () => {
    const bench = EXERCISES.find((e) => e.id === 'bench-press')!;
    expect(effectsFor(bench, GUARD_RAILS).blocked).toBe(true);
  });
});
