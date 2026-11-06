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
} from './repo';
import type { Clock } from './clock';

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
