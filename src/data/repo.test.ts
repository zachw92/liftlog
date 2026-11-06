import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LiftLogDb } from './db';
import {
  isFirstRun,
  completeSetup,
  loadHome,
  startSession,
  loadSession,
  logSet,
  setFeel,
  finishSession,
  listSessions,
  undoLastSet,
  editFinishedSession,
  getCycleCompleteData,
  confirmCycle,
} from './repo';
import type { Clock } from './clock';
import type { Week } from '../engine/fiveThreeOne';

const FIXED_DATE = new Date('2026-11-06T12:00:00.000Z');
const fixedClock: Clock = () => FIXED_DATE;

// Each test gets its own Dexie DB to stay isolated.
let dbs: LiftLogDb[] = [];
function freshDb(): LiftLogDb {
  const name = `test_repo_${Math.random().toString(36).slice(2)}`;
  const d = new LiftLogDb(name);
  dbs.push(d);
  return d;
}

beforeEach(() => {
  dbs = [];
});

afterEach(async () => {
  for (const d of dbs.splice(0)) {
    d.close();
    await d.delete();
  }
});

describe('isFirstRun / completeSetup', () => {
  it('reports first run before setup and not after', async () => {
    const d = freshDb();
    expect(await isFirstRun(d)).toBe(true);
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    expect(await isFirstRun(d)).toBe(false);
  });

  it('records the week picked at setup', async () => {
    const d = freshDb();
    await completeSetup({ week: 3, daysDoneIds: ['day-bench'], database: d });
    const home = await loadHome(d);
    expect(home.week).toBe(3);
    expect(home.kind).toBe('1s');
    expect(home.liftDayCards.find((c) => c.planDayId === 'day-bench')?.done).toBe(true);
  });
});

describe('loadHome — main-lift top set reflects TM × week', () => {
  it('bench Week 1 top set: 165 × 5+ (TM 193.5)', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    const home = await loadHome(d);
    const bench = home.liftDayCards.find((c) => c.mainLiftId === 'bench')!;
    expect(bench.mainTopSet).toEqual({ weight: 165, reps: 5, isPlusSet: true });
  });

  it('OHP Week 3 top set: 105 × 1+ (TM 108)', async () => {
    const d = freshDb();
    await completeSetup({ week: 3, daysDoneIds: [], database: d });
    const home = await loadHome(d);
    const ohp = home.liftDayCards.find((c) => c.mainLiftId === 'ohp')!;
    expect(ohp.mainTopSet).toEqual({ weight: 105, reps: 1, isPlusSet: true });
  });
});

describe('startSession + loadSession', () => {
  it('creates an open session and returns the same one on resume', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    const s1 = await startSession('day-bench', fixedClock, d);
    const s2 = await startSession('day-bench', fixedClock, d);
    expect(s2.id).toBe(s1.id);
    expect(s1.status).toBe('open');
    expect(s1.week).toBe(1);
  });

  it('loadSession returns planned rows for main lift and accessories', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    const s = await startSession('day-bench', fixedClock, d);
    const view = await loadSession(s.id, d);
    expect(view.block.mainLift).toBeDefined();
    expect(view.block.mainLift!.rows).toHaveLength(6); // 3 warmups + 3 work
    expect(view.block.items.length).toBeGreaterThan(0);
    const workSets = view.block.mainLift!.rows.filter((r) => r.kind === 'work');
    expect(workSets.at(-1)!.isPlusSet).toBe(true);
  });

  it("loadSession computes 'reps to beat' for the + set using historical PRs", async () => {
    const d = freshDb();
    await completeSetup({ week: 3, daysDoneIds: [], database: d });
    const s = await startSession('day-ohp', fixedClock, d);
    const view = await loadSession(s.id, d);
    // Spec example: best OHP e1RM = 100 × 5 = 116.65, planned + set 105 lb → 4.
    expect(view.block.mainLift?.repsToBeat).toBe(4);
  });
});

describe('logSet + undo', () => {
  it('logs a set and replaces an existing log at the same slot', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    const s = await startSession('day-bench', fixedClock, d);
    await logSet(
      {
        sessionId: s.id,
        planItemId: 'pi-bench-row',
        exerciseId: 'seated-cable-row',
        setIndex: 0,
        weight: 120,
        reps: 10,
        target: 10,
        isWarmup: false,
        isPlusSet: false,
        clock: fixedClock,
      },
      d,
    );
    const view1 = await loadSession(s.id, d);
    expect(view1.loggedSets).toHaveLength(1);
    expect(view1.loggedSets[0]?.reps).toBe(10);

    await logSet(
      {
        sessionId: s.id,
        planItemId: 'pi-bench-row',
        exerciseId: 'seated-cable-row',
        setIndex: 0,
        weight: 120,
        reps: 12,
        target: 10,
        isWarmup: false,
        isPlusSet: false,
        clock: fixedClock,
      },
      d,
    );
    const view2 = await loadSession(s.id, d);
    expect(view2.loggedSets).toHaveLength(1);
    expect(view2.loggedSets[0]?.reps).toBe(12);
  });

  it('undoLastSet removes the most recent log', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    const s = await startSession('day-bench', fixedClock, d);
    for (let i = 0; i < 3; i++) {
      await logSet(
        {
          sessionId: s.id,
          planItemId: 'pi-bench-row',
          exerciseId: 'seated-cable-row',
          setIndex: i,
          weight: 120,
          reps: 10,
          target: 10,
          isWarmup: false,
          isPlusSet: false,
          clock: () => new Date(FIXED_DATE.getTime() + i * 1000),
        },
        d,
      );
    }
    expect((await loadSession(s.id, d)).loggedSets).toHaveLength(3);
    await undoLastSet(s.id, d);
    expect((await loadSession(s.id, d)).loggedSets).toHaveLength(2);
  });
});

describe('finishSession — next targets match the Rules section', () => {
  it('bench Day 1, every accessory exactly at target + Fine → +1 to target each', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    const s = await startSession('day-bench', fixedClock, d);
    const view = await loadSession(s.id, d);

    // Log every planned accessory row at its target.
    for (const item of view.block.items) {
      if (!item.planItem.active) continue;
      for (const row of item.rows) {
        await logSet(
          {
            sessionId: s.id,
            planItemId: item.planItem.id,
            exerciseId: item.exercise.id,
            setIndex: row.setIndex,
            side: row.side,
            weight: row.weight,
            reps: row.reps,
            target: row.reps,
            isWarmup: false,
            isPlusSet: false,
            clock: fixedClock,
          },
          d,
        );
      }
      await setFeel(s.id, item.planItem.id, 'fine', d);
    }

    const summary = await finishSession(s.id, fixedClock, d);
    const row = summary.nextTargets.find((t) => t.planItemId === 'pi-bench-row')!;
    // Before: 120 × 10. Fine → target + 1 → 120 × 11.
    expect(row.after.weight).toBe(120);
    expect(row.after.target).toBe(11);
    expect(row.changed).toBe(true);

    // Hold-mode face pull: no change.
    const facePull = summary.nextTargets.find((t) => t.planItemId === 'pi-bench-face-pull')!;
    expect(facePull.after.weight).toBe(50);
    expect(facePull.after.target).toBe(15);
    expect(facePull.changed).toBe(false);
  });

  it('deload week (Week 4) does not change any accessory state', async () => {
    const d = freshDb();
    await completeSetup({ week: 4, daysDoneIds: [], database: d });
    const s = await startSession('day-corrective-a', fixedClock, d);
    const view = await loadSession(s.id, d);
    for (const item of view.block.items) {
      for (const row of item.rows) {
        await logSet(
          {
            sessionId: s.id,
            planItemId: item.planItem.id,
            exerciseId: item.exercise.id,
            setIndex: row.setIndex,
            side: row.side,
            weight: row.weight,
            reps: row.reps,
            target: row.reps,
            isWarmup: false,
            isPlusSet: false,
            clock: fixedClock,
          },
          d,
        );
      }
      await setFeel(s.id, item.planItem.id, 'great', d);
    }
    const summary = await finishSession(s.id, fixedClock, d);
    // Items that had a prior state must be unchanged. Items without prior
    // state get a first-log baseline — a legitimate change from null.
    for (const t of summary.nextTargets) {
      if (t.before) {
        expect(t.after.weight).toBe(t.before.weight);
        expect(t.after.target).toBe(t.before.target);
      }
    }
  });

  it('marks the session finished and records it in daysDone', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    const s = await startSession('day-bench', fixedClock, d);
    await finishSession(s.id, fixedClock, d);
    const home = await loadHome(d);
    expect(home.liftDayCards.find((c) => c.planDayId === 'day-bench')?.done).toBe(true);
    const sessions = await listSessions(d);
    expect(sessions[0]?.id).toBe(s.id);
    expect(sessions[0]?.status).toBe('finished');
  });
});

describe('editFinishedSession — replays accessory engine forward', () => {
  async function runBenchDay(
    d: Awaited<ReturnType<typeof freshDb>>,
    feel: 'bad' | 'fine' | 'great',
    offsetMs: number,
  ) {
    const clock: Clock = () => new Date(FIXED_DATE.getTime() + offsetMs);
    const s = await startSession('day-bench', clock, d);
    const view = await loadSession(s.id, d);
    // Just log the row planItem (seated-cable-row) which has a seeded state.
    const item = view.block.items.find((i) => i.planItem.id === 'pi-bench-row')!;
    for (const row of item.rows) {
      await logSet(
        {
          sessionId: s.id,
          planItemId: item.planItem.id,
          exerciseId: item.exercise.id,
          setIndex: row.setIndex,
          weight: row.weight,
          reps: row.reps,
          target: row.reps,
          isWarmup: false,
          isPlusSet: false,
          clock,
        },
        d,
      );
    }
    await setFeel(s.id, item.planItem.id, feel, d);
    return finishSession(s.id, clock, d);
  }

  it('re-running the chain reproduces the latest state even after a mid-chain edit', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    // Baseline: pi-bench-row is 120 × 10.
    // Run three sessions: Fine (→11), Fine (→12), Great (→15 capped).
    const s1 = await runBenchDay(d, 'fine', 0);
    await d.cycleState.update('singleton', { daysDone: [] });
    const s2 = await runBenchDay(d, 'fine', 1000);
    await d.cycleState.update('singleton', { daysDone: [] });
    const s3 = await runBenchDay(d, 'great', 2000);

    expect(s1.nextTargets.find((t) => t.planItemId === 'pi-bench-row')?.after.target).toBe(
      11,
    );
    expect(s3.nextTargets.find((t) => t.planItemId === 'pi-bench-row')?.after.target).toBe(
      15,
    );

    // Now edit session 2's feel from fine → bad (simulating the user realised
    // they tanked). editFinishedSession should replay the chain: 120×10 Fine →
    // 11; 11 Bad → streak 1; 12 → capped Great still only moves to 15 but
    // streak resets. Let's keep it simple: change feel to 'bad' on session 2.
    await setFeel(s2.session.id, 'pi-bench-row', 'bad', d);
    await editFinishedSession(s2.session.id, fixedClock, d);

    // After replay with second session = Bad (not success, streak 1), target
    // stays at 11 for session 2. Then session 3 Great succeeds → target 14.
    const state = await d.exerciseStates.get('pi-bench-row');
    expect(state?.target).toBe(14);
    expect(state?.badStreak).toBe(0);
  });
});

describe('getCycleCompleteData + confirmCycle', () => {
  async function completeWeek(
    d: Awaited<ReturnType<typeof freshDb>>,
    week: Week,
    plusReps: number,
    offsetMs: number,
  ) {
    const clock: Clock = () => new Date(FIXED_DATE.getTime() + offsetMs);
    await d.cycleState.update('singleton', { week, daysDone: [] });
    const s = await startSession('day-bench', clock, d);
    const view = await loadSession(s.id, d);
    const main = view.block.mainLift!;
    // Log only the work sets. The + set reps vary by scenario.
    const workRows = main.rows.filter((r) => r.kind === 'work');
    for (const row of workRows) {
      await logSet(
        {
          sessionId: s.id,
          planItemId: null,
          exerciseId: main.exercise.id,
          setIndex: row.setIndex,
          weight: row.weight,
          reps: row.isPlusSet ? plusReps : row.reps,
          target: row.reps,
          isWarmup: false,
          isPlusSet: row.isPlusSet,
          clock,
        },
        d,
      );
    }
    await finishSession(s.id, clock, d);
  }

  it('assembles + set reps per week and returns an increment suggestion when all minimums hit', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    await completeWeek(d, 1, 5, 0); // 5+ → 5
    await completeWeek(d, 2, 3, 1000); // 3+ → 3
    await completeWeek(d, 3, 3, 2000); // 1+ → 3 (threshold = 3)
    const data = await getCycleCompleteData(d);
    const bench = data.find((x) => x.liftId === 'bench')!;
    expect(bench.reps).toEqual({ week1: 5, week2: 3, week3: 3 });
    expect(bench.assessment?.action).toBe('increment');
    expect(bench.assessment?.newTm).toBe(193.5 + 5);
  });

  it('confirmCycle applies TMs, increments cycle, resets week to 1 and daysDone', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    await confirmCycle(
      [
        { liftId: 'bench', newTm: 200, missStreak: 0 },
        { liftId: 'ohp', newTm: 110, missStreak: 0 },
      ],
      fixedClock,
      d,
    );
    const cs = await d.cycleState.get('singleton');
    expect(cs?.cycle).toBe(2);
    expect(cs?.week).toBe(1);
    expect(cs?.daysDone).toEqual([]);
    expect(cs?.tmHistory).toHaveLength(2);
    const bench = await d.mainLifts.get('bench');
    expect(bench?.tm).toBe(200);
  });
});
