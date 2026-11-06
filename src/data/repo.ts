import { db, type LiftLogDb } from './db';
import { seedDb, MAIN_LIFTS as SEED_MAIN_LIFTS } from './seed';
import { HISTORICAL_SESSION_ID } from './types';
import { nowIso, type Clock, systemClock } from './clock';
import type {
  Exercise,
  ExerciseFeel,
  ExerciseState,
  Feel,
  MainLift,
  MainLiftId,
  Meta,
  PlanDay,
  PlanItem,
  Session,
  SetLog,
  Settings,
  Side,
} from './types';
import { planMainLift, type Week } from '../engine/fiveThreeOne';
import { nextAccessoryState, type AccessoryContext } from '../engine/accessory';
import { e1rm } from '../engine/e1rm';

// Translate the MainLiftId → main-lift exerciseId used across the seed.
const MAIN_LIFT_EXERCISE_ID: Record<MainLiftId, string> = {
  bench: 'bench-press',
  deadlift: 'deadlift',
  ohp: 'ohp',
  squat: 'squat',
};

// ---------------------------------------------------------------------------
// Setup / first run
// ---------------------------------------------------------------------------

export async function isFirstRun(database: LiftLogDb = db): Promise<boolean> {
  const meta = await database.meta.get('singleton');
  return !meta;
}

export interface CompleteSetupInput {
  week: Week;
  daysDoneIds: string[];
  maxes?: Partial<Record<MainLiftId, number>>; // optional override
  database?: LiftLogDb;
}

export async function completeSetup(input: CompleteSetupInput): Promise<void> {
  const database = input.database ?? db;
  await seedDb(database);
  if (input.maxes) {
    const overrides = Object.entries(input.maxes) as [MainLiftId, number][];
    await database.transaction('rw', database.mainLifts, async () => {
      for (const [id, enteredMax] of overrides) {
        const existing = await database.mainLifts.get(id);
        if (!existing) continue;
        await database.mainLifts.put({
          ...existing,
          enteredMax,
          tm: enteredMax * 0.9,
        });
      }
    });
  }
  await database.cycleState.update('singleton', {
    week: input.week,
    daysDone: input.daysDoneIds,
  });
}

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }
  return navigator.storage.persist();
}

export async function getPersistenceStatus(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return false;
  }
  return navigator.storage.persisted();
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export type WeekKind = '5s' | '3s' | '1s' | 'deload';

export interface DayCard {
  planDayId: string;
  name: string;
  order: number;
  kind: PlanDay['kind'];
  mainLiftId?: MainLiftId;
  mainTopSet?: { weight: number; reps: number; isPlusSet: boolean };
  done: boolean;
}

export interface HomeData {
  cycle: number;
  week: Week;
  kind: WeekKind;
  liftDayCards: DayCard[];
  correctiveDayCards: DayCard[];
  resumeSessionId?: string;
  lastBackupAt?: string;
  cycleComplete: boolean;
}

const WEEK_KIND: Record<Week, WeekKind> = {
  1: '5s',
  2: '3s',
  3: '1s',
  4: 'deload',
};

export async function loadHome(database: LiftLogDb = db): Promise<HomeData> {
  const [cycleState, meta, planDays, mainLifts, openSessions] = await Promise.all([
    database.cycleState.get('singleton'),
    database.meta.get('singleton'),
    database.planDays.toArray(),
    database.mainLifts.toArray(),
    database.sessions.where('status').equals('open').toArray(),
  ]);
  if (!cycleState || !meta) throw new Error('loadHome called before setup');

  const mainById = new Map<MainLiftId, MainLift>(mainLifts.map((m) => [m.id, m]));
  const buildCard = (d: PlanDay): DayCard => {
    const card: DayCard = {
      planDayId: d.id,
      name: d.name,
      order: d.order,
      kind: d.kind,
      mainLiftId: d.mainLiftId,
      done: cycleState.daysDone.includes(d.id),
    };
    if (d.mainLiftId) {
      const main = mainById.get(d.mainLiftId);
      if (main) {
        const sets = planMainLift({ tm: main.tm, week: cycleState.week });
        const work = sets.filter((s) => !s.isWarmup);
        const top = work.at(-1);
        if (top) {
          card.mainTopSet = {
            weight: top.weight,
            reps: top.reps,
            isPlusSet: top.isPlusSet,
          };
        }
      }
    }
    return card;
  };

  const visibleDays = planDays.filter((d) => d.id !== 'day-historical');
  const liftDayCards = visibleDays
    .filter((d) => d.kind === 'lift')
    .sort((a, b) => a.order - b.order)
    .map(buildCard);
  const correctiveDayCards = visibleDays
    .filter((d) => d.kind === 'corrective')
    .sort((a, b) => a.order - b.order)
    .map(buildCard);

  const resume = openSessions[0];
  const cycleComplete =
    cycleState.week === 4 &&
    correctiveDayCards.every((c) => c.done);

  return {
    cycle: cycleState.cycle,
    week: cycleState.week,
    kind: WEEK_KIND[cycleState.week],
    liftDayCards,
    correctiveDayCards,
    resumeSessionId: resume?.id,
    lastBackupAt: meta.lastBackupAt,
    cycleComplete,
  };
}

// ---------------------------------------------------------------------------
// Session loading / start
// ---------------------------------------------------------------------------

export interface PlannedRow {
  kind: 'warmup' | 'work';
  side?: Side;
  weight: number;
  reps: number;
  isPlusSet: boolean;
  setIndex: number;
}

export interface SessionItemView {
  planItem: PlanItem;
  exercise: Exercise;
  state?: ExerciseState;
  rows: PlannedRow[];
  mainLift?: MainLift;
}

export interface SessionBlockView {
  mainLift?: {
    exercise: Exercise;
    mainLift: MainLift;
    rows: PlannedRow[];
    repsToBeat?: number;
  };
  items: SessionItemView[];
}

export interface SessionView {
  session: Session;
  planDay: PlanDay;
  block: SessionBlockView;
  loggedSets: SetLog[];
  feels: ExerciseFeel[];
}

export async function startSession(
  planDayId: string,
  clock: Clock = systemClock,
  database: LiftLogDb = db,
): Promise<Session> {
  const existing = await database.sessions
    .where('status')
    .equals('open')
    .and((s) => s.planDayId === planDayId)
    .first();
  if (existing) return existing;

  const cycleState = await database.cycleState.get('singleton');
  if (!cycleState) throw new Error('startSession before setup');
  const session: Session = {
    id: cryptoRandomId(),
    date: clock().toISOString().slice(0, 10),
    planDayId,
    cycle: cycleState.cycle,
    week: cycleState.week,
    status: 'open',
  };
  await database.sessions.put(session);
  return session;
}

export async function loadSession(
  sessionId: string,
  database: LiftLogDb = db,
): Promise<SessionView> {
  const session = await database.sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  const planDay = await database.planDays.get(session.planDayId);
  if (!planDay) throw new Error(`PlanDay ${session.planDayId} not found`);

  const [planItems, exercises, states, loggedSets, feels] = await Promise.all([
    database.planItems.where('planDayId').equals(planDay.id).toArray(),
    database.exercises.toArray(),
    database.exerciseStates.toArray(),
    database.setLogs.where('sessionId').equals(session.id).toArray(),
    database.exerciseFeels.where('sessionId').equals(session.id).toArray(),
  ]);

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const stateByItemId = new Map(states.map((s) => [s.planItemId, s]));
  planItems.sort((a, b) => a.order - b.order);

  const items: SessionItemView[] = planItems.map((planItem) => {
    const exercise = exerciseById.get(planItem.exerciseId);
    if (!exercise) throw new Error(`Missing exercise ${planItem.exerciseId}`);
    const state = stateByItemId.get(planItem.id);
    const rows = buildAccessoryRows(planItem, state);
    return { planItem, exercise, state, rows };
  });

  const block: SessionBlockView = { items };
  if (planDay.mainLiftId) {
    const mainLift = await database.mainLifts.get(planDay.mainLiftId);
    const exercise = exerciseById.get(MAIN_LIFT_EXERCISE_ID[planDay.mainLiftId]);
    if (mainLift && exercise) {
      const rows = buildMainLiftRows(mainLift, session.week);
      const repsToBeat = await computeMainLiftRepsToBeat(
        mainLift,
        exercise,
        rows,
        database,
      );
      block.mainLift = { exercise, mainLift, rows, repsToBeat };
    }
  }

  return { session, planDay, block, loggedSets, feels };
}

function buildAccessoryRows(planItem: PlanItem, state: ExerciseState | undefined): PlannedRow[] {
  const target = state?.target ?? planItem.repMin;
  const weight = state?.weight ?? 0;
  const rows: PlannedRow[] = [];
  const sidesPerSet: Side[][] = [];
  if (planItem.unilateral) {
    const lead: Side = planItem.leadSide ?? 'R';
    const other: Side = lead === 'R' ? 'L' : 'R';
    for (let s = 0; s < planItem.sets; s++) {
      sidesPerSet.push([lead, other]);
    }
    for (let s = 0; s < planItem.extraLeadSets; s++) {
      sidesPerSet.push([lead]);
    }
  } else {
    for (let s = 0; s < planItem.sets; s++) sidesPerSet.push([]);
  }
  let idx = 0;
  for (const sides of sidesPerSet) {
    if (sides.length === 0) {
      rows.push({
        kind: 'work',
        weight,
        reps: target,
        isPlusSet: false,
        setIndex: idx++,
      });
    } else {
      for (const side of sides) {
        rows.push({
          kind: 'work',
          side,
          weight,
          reps: target,
          isPlusSet: false,
          setIndex: idx++,
        });
      }
    }
  }
  return rows;
}

function buildMainLiftRows(mainLift: MainLift, week: Week): PlannedRow[] {
  const planned = planMainLift({ tm: mainLift.tm, week });
  return planned.map((p, i) => ({
    kind: p.isWarmup ? 'warmup' : 'work',
    weight: p.weight,
    reps: p.reps,
    isPlusSet: p.isPlusSet,
    setIndex: i,
  }));
}

async function computeMainLiftRepsToBeat(
  mainLift: MainLift,
  exercise: Exercise,
  rows: PlannedRow[],
  database: LiftLogDb,
): Promise<number | undefined> {
  const plus = rows.find((r) => r.isPlusSet);
  if (!plus) return undefined;
  const allLogs = await database.setLogs
    .where('exerciseId')
    .equals(exercise.id)
    .toArray();
  const bestE1rm = allLogs.reduce(
    (best, l) => Math.max(best, e1rm(l.weight, l.reps)),
    0,
  );
  if (bestE1rm === 0) return 1;
  let reps = 1;
  while (e1rm(plus.weight, reps) <= bestE1rm) reps += 1;
  // Keep caller aware of the main lift id for context (unused here, but
  // referenced from the UI's "Reps to beat" label).
  void mainLift;
  return reps;
}

// ---------------------------------------------------------------------------
// Tap handling
// ---------------------------------------------------------------------------

export interface LogSetInput {
  sessionId: string;
  planItemId: string | null;
  exerciseId: string;
  setIndex: number;
  side?: Side;
  weight: number;
  reps: number;
  target: number;
  isWarmup: boolean;
  isPlusSet: boolean;
  clock?: Clock;
}

export async function logSet(
  input: LogSetInput,
  database: LiftLogDb = db,
): Promise<SetLog> {
  const clock = input.clock ?? systemClock;
  // Replace any existing log at the same (session, planItem, setIndex, side).
  const existing = await database.setLogs
    .where('sessionId')
    .equals(input.sessionId)
    .and(
      (l) =>
        l.planItemId === (input.planItemId ?? mainLiftPlanItemKey(input.exerciseId)) &&
        l.setIndex === input.setIndex &&
        l.side === input.side,
    )
    .first();

  const row: SetLog = {
    id: existing?.id ?? cryptoRandomId(),
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    planItemId: input.planItemId ?? mainLiftPlanItemKey(input.exerciseId),
    setIndex: input.setIndex,
    side: input.side,
    weight: input.weight,
    reps: input.reps,
    target: input.target,
    isWarmup: input.isWarmup,
    isPlusSet: input.isPlusSet,
    done: true,
    at: nowIso(clock),
  };
  await database.setLogs.put(row);
  return row;
}

export async function undoSet(
  sessionId: string,
  planItemId: string | null,
  exerciseId: string,
  setIndex: number,
  side: Side | undefined,
  database: LiftLogDb = db,
): Promise<void> {
  const effectiveItemId = planItemId ?? mainLiftPlanItemKey(exerciseId);
  await database.setLogs
    .where('sessionId')
    .equals(sessionId)
    .and(
      (l) =>
        l.planItemId === effectiveItemId &&
        l.setIndex === setIndex &&
        l.side === side,
    )
    .delete();
}

export async function undoLastSet(
  sessionId: string,
  database: LiftLogDb = db,
): Promise<SetLog | undefined> {
  const logs = await database.setLogs
    .where('sessionId')
    .equals(sessionId)
    .toArray();
  if (logs.length === 0) return undefined;
  logs.sort((a, b) => b.at.localeCompare(a.at));
  const last = logs[0]!;
  await database.setLogs.delete(last.id);
  return last;
}

export async function setFeel(
  sessionId: string,
  planItemId: string,
  feel: Feel,
  database: LiftLogDb = db,
): Promise<void> {
  const existing = await database.exerciseFeels
    .where('sessionId')
    .equals(sessionId)
    .and((f) => f.planItemId === planItemId)
    .first();
  const row: ExerciseFeel = {
    id: existing?.id ?? cryptoRandomId(),
    sessionId,
    planItemId,
    feel,
  };
  await database.exerciseFeels.put(row);
}

// ---------------------------------------------------------------------------
// Finish
// ---------------------------------------------------------------------------

export interface NextTarget {
  planItemId: string;
  exerciseName: string;
  before: ExerciseState | null;
  after: ExerciseState;
  changed: boolean;
}

export interface FinishSummary {
  session: Session;
  nextTargets: NextTarget[];
  weekAdvanced: boolean;
  cycleComplete: boolean;
}

export async function finishSession(
  sessionId: string,
  clock: Clock = systemClock,
  database: LiftLogDb = db,
): Promise<FinishSummary> {
  const session = await database.sessions.get(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  if (session.status === 'finished') {
    throw new Error(`Session ${sessionId} already finished`);
  }
  const planDay = await database.planDays.get(session.planDayId);
  if (!planDay) throw new Error(`PlanDay ${session.planDayId} not found`);

  const [planItems, exercises, loggedSets, feels] = await Promise.all([
    database.planItems.where('planDayId').equals(planDay.id).toArray(),
    database.exercises.toArray(),
    database.setLogs.where('sessionId').equals(sessionId).toArray(),
    database.exerciseFeels.where('sessionId').equals(sessionId).toArray(),
  ]);
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const feelByItem = new Map(feels.map((f) => [f.planItemId, f.feel]));

  const nextTargets: NextTarget[] = [];
  const isDeload = session.week === 4;

  await database.transaction(
    'rw',
    [database.exerciseStates, database.sessions, database.cycleState],
    async () => {
      for (const planItem of planItems) {
        const exercise = exerciseById.get(planItem.exerciseId);
        if (!exercise) continue;

        const itemLogs = loggedSets.filter(
          (l) =>
            l.planItemId === planItem.id &&
            !l.isWarmup &&
            (!planItem.unilateral || l.side === planItem.leadSide),
        );
        if (itemLogs.length === 0) continue;

        const feel = feelByItem.get(planItem.id) ?? 'fine';
        const ctx: AccessoryContext = {
          isDeload,
          unit: planItem.unit,
          mode: planItem.mode,
          step: planItem.step,
          repMin: planItem.repMin,
          repMax: planItem.repMax,
          isBodyweight: exercise.equipment === 'bodyweight',
        };
        const before = (await database.exerciseStates.get(planItem.id)) ?? null;
        const after = nextAccessoryState(
          before,
          itemLogs.map((l) => ({ weight: l.weight, reps: l.reps })),
          feel,
          ctx,
        );
        const updated: ExerciseState = { ...after, planItemId: planItem.id, updatedAt: nowIso(clock) };
        await database.exerciseStates.put(updated);

        nextTargets.push({
          planItemId: planItem.id,
          exerciseName: exercise.name,
          before,
          after: updated,
          changed:
            !before ||
            before.weight !== after.weight ||
            before.target !== after.target,
        });
      }

      await database.sessions.update(sessionId, {
        status: 'finished',
        finishedAt: nowIso(clock),
      });

      const cs = await database.cycleState.get('singleton');
      if (cs && !cs.daysDone.includes(planDay.id)) {
        await database.cycleState.update('singleton', {
          daysDone: [...cs.daysDone, planDay.id],
        });
      }
    },
  );

  const cycleStatus = await getCycleStatus(database);
  return {
    session: (await database.sessions.get(sessionId))!,
    nextTargets,
    weekAdvanced: false,
    cycleComplete: cycleStatus.cycleComplete,
  };
}

interface CycleStatus {
  allLiftDaysDone: boolean;
  cycleComplete: boolean;
}

async function getCycleStatus(database: LiftLogDb): Promise<CycleStatus> {
  const [cs, planDays] = await Promise.all([
    database.cycleState.get('singleton'),
    database.planDays.toArray(),
  ]);
  if (!cs) return { allLiftDaysDone: false, cycleComplete: false };
  const liftDayIds = planDays
    .filter((d) => d.kind === 'lift' && d.id !== 'day-historical')
    .map((d) => d.id);
  const correctiveIds = planDays.filter((d) => d.kind === 'corrective').map((d) => d.id);
  const allLiftDaysDone = liftDayIds.every((id) => cs.daysDone.includes(id));
  const allCorrectivesDone = correctiveIds.every((id) => cs.daysDone.includes(id));
  return {
    allLiftDaysDone,
    cycleComplete: cs.week === 4 && allCorrectivesDone,
  };
}

// ---------------------------------------------------------------------------
// Week / cycle progression
// ---------------------------------------------------------------------------

export async function advanceWeek(database: LiftLogDb = db): Promise<Week> {
  const cs = await database.cycleState.get('singleton');
  if (!cs) throw new Error('advanceWeek before setup');
  if (cs.week === 4) throw new Error('Use confirmCycleTms after week 4');
  const next = (cs.week + 1) as Week;
  await database.cycleState.update('singleton', {
    week: next,
    daysDone: [],
  });
  return next;
}

// ---------------------------------------------------------------------------
// History + settings
// ---------------------------------------------------------------------------

export async function listSessions(database: LiftLogDb = db): Promise<Session[]> {
  const sessions = await database.sessions
    .where('status')
    .equals('finished')
    .toArray();
  return sessions
    .filter((s) => s.id !== HISTORICAL_SESSION_ID)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function readSettings(database: LiftLogDb = db): Promise<Settings> {
  const meta = await database.meta.get('singleton');
  if (!meta) throw new Error('readSettings before setup');
  return meta.settings;
}

export async function updateSettings(
  patch: Partial<Settings>,
  database: LiftLogDb = db,
): Promise<void> {
  const meta = await database.meta.get('singleton');
  if (!meta) throw new Error('updateSettings before setup');
  const next: Meta = { ...meta, settings: { ...meta.settings, ...patch } };
  await database.meta.put(next);
}

export async function readMainLifts(database: LiftLogDb = db): Promise<MainLift[]> {
  return database.mainLifts.toArray();
}

export async function updateMainLiftTm(
  id: MainLiftId,
  tm: number,
  database: LiftLogDb = db,
): Promise<void> {
  const existing = await database.mainLifts.get(id);
  if (!existing) throw new Error(`Main lift ${id} not found`);
  await database.mainLifts.put({ ...existing, tm });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function mainLiftPlanItemKey(exerciseId: string): string {
  return `mainlift-${exerciseId}`;
}

// Expose the seed main lifts for setup/screens that want the default labels.
export { SEED_MAIN_LIFTS };
