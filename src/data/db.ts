import Dexie, { type Table } from 'dexie';
import type {
  Exercise,
  PlanDay,
  PlanItem,
  ExerciseState,
  MainLift,
  CycleState,
  Session,
  SetLog,
  ExerciseFeel,
  GuardRail,
  PainLog,
  Milestone,
  XpEvent,
  Override,
  Meta,
} from './types';

export class LiftLogDb extends Dexie {
  exercises!: Table<Exercise, string>;
  planDays!: Table<PlanDay, string>;
  planItems!: Table<PlanItem, string>;
  exerciseStates!: Table<ExerciseState, string>;
  mainLifts!: Table<MainLift, string>;
  cycleState!: Table<CycleState, string>;
  sessions!: Table<Session, string>;
  setLogs!: Table<SetLog, string>;
  exerciseFeels!: Table<ExerciseFeel, string>;
  guardRails!: Table<GuardRail, string>;
  painLogs!: Table<PainLog, string>;
  milestones!: Table<Milestone, string>;
  xpEvents!: Table<XpEvent, string>;
  overrides!: Table<Override, string>;
  meta!: Table<Meta, string>;

  constructor(name = 'liftlog_v1') {
    super(name);
    this.version(1).stores({
      exercises: 'id, isMainLift',
      planDays: 'id, order, kind',
      planItems: 'id, planDayId, exerciseId, order, active',
      exerciseStates: 'planItemId',
      mainLifts: 'id',
      cycleState: 'id',
      sessions: 'id, date, planDayId, status',
      setLogs: 'id, sessionId, exerciseId, planItemId, [sessionId+planItemId]',
      exerciseFeels: 'id, sessionId, planItemId, [sessionId+planItemId]',
      guardRails: 'id, region, active',
      painLogs: 'id, date, region, redFlag',
      milestones: 'id, liftId',
      xpEvents: 'id, sessionId',
      overrides: 'id, date, exerciseId',
      meta: 'id',
    });
  }
}

export const db = new LiftLogDb();

export const ALL_TABLE_NAMES = [
  'exercises',
  'planDays',
  'planItems',
  'exerciseStates',
  'mainLifts',
  'cycleState',
  'sessions',
  'setLogs',
  'exerciseFeels',
  'guardRails',
  'painLogs',
  'milestones',
  'xpEvents',
  'overrides',
  'meta',
] as const;

export type TableName = (typeof ALL_TABLE_NAMES)[number];
