// Shared data-layer types. Mirrors the spec's Data model table. Engine files
// declare their own narrow input types; this file is the full persisted shape.

export type Unit = 'reps' | 'seconds' | 'steps';
export type Mode = 'progress' | 'hold';
export type Pattern = 'push' | 'pull' | 'other';
export type DayKind = 'lift' | 'corrective';
export type Side = 'L' | 'R';
export type Feel = 'bad' | 'fine' | 'great';
export type SessionStatus = 'open' | 'finished';
export type GuardRailAction = 'block' | 'modify' | 'caution';
export type MainLiftId = 'bench' | 'ohp' | 'squat' | 'deadlift';
export type MilestoneKind = 'e1rm' | 'actual';
export type PainType = 'sharp' | 'dull' | 'ache' | 'tingling-numbness';
export type PainContext = 'during' | 'rest' | 'after';

export interface Exercise {
  id: string;
  name: string;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  pattern: Pattern;
  stressTags: string[];
  unit: Unit;
  defaultStep: number;
  isMainLift: boolean;
}

export interface PlanDay {
  id: string;
  name: string;
  order: number;
  kind: DayKind;
  mainLiftId?: MainLiftId;
  warmupChecklist: string[];
}

export interface PlanItem {
  id: string;
  planDayId: string;
  order: number;
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
  step: number;
  unit: Unit;
  mode: Mode;
  unilateral: boolean;
  leadSide?: Side;
  extraLeadSets: number;
  supersetGroup?: string;
  note?: string;
  active: boolean;
}

export interface ExerciseState {
  planItemId: string;
  weight: number;
  target: number;
  badStreak: number;
  updatedAt: string;
}

export interface MainLift {
  id: MainLiftId;
  enteredMax: number;
  tm: number; // unrounded
  increment: number;
  missStreak: number; // consecutive cycles ending in a miss/hold
}

export interface CycleState {
  id: 'singleton';
  cycle: number;
  week: 1 | 2 | 3 | 4;
  daysDone: string[]; // planDay ids done this week
  tmHistory: TmHistoryEntry[];
}

export interface TmHistoryEntry {
  cycle: number;
  liftId: MainLiftId;
  tm: number;
  changedAt: string;
}

export interface Session {
  id: string;
  date: string;
  planDayId: string;
  cycle: number;
  week: 1 | 2 | 3 | 4;
  status: SessionStatus;
  finishedAt?: string;
}

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  planItemId: string;
  setIndex: number;
  side?: Side;
  weight: number;
  reps: number;
  target: number;
  isWarmup: boolean;
  isPlusSet: boolean;
  done: boolean;
  at: string;
}

export interface ExerciseFeel {
  id: string;
  sessionId: string;
  planItemId: string;
  feel: Feel;
}

export interface GuardRail {
  id: string;
  region: string;
  tags: string[];
  action: GuardRailAction;
  note: string;
  exceptExerciseIds: string[];
  active: boolean;
}

export interface PainLog {
  id: string;
  date: string;
  region: string;
  type: PainType;
  rating: number;
  context: PainContext;
  exerciseId?: string;
  note?: string;
  redFlag: boolean;
}

export interface Milestone {
  id: string;
  liftId: MainLiftId;
  targetWeight: number;
  kind: MilestoneKind;
  achievedAt?: string;
}

export interface XpEvent {
  id: string;
  sessionId: string;
  amount: number;
  reason: string;
  muscles: string[];
  at: string;
}

export interface Override {
  id: string;
  date: string;
  exerciseId: string;
  railId: string;
  reason: string;
}

export interface Settings {
  progressThreshold: number;
  roundingIncrement: number;
  equipmentSteps: Record<string, number>;
  importantMuscles: string[];
  pullPushTarget: number;
  roundNumbers: number[];
}

export interface Meta {
  id: 'singleton';
  schemaVersion: number;
  lastBackupAt?: string;
  settings: Settings;
}

export const SCHEMA_VERSION = 1;

export const HISTORICAL_SESSION_ID = 'seed-historical';
