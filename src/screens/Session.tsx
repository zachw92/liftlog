import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadSession,
  logSet,
  undoSet,
  setFeel,
  finishSession,
  editFinishedSession,
  type SessionView,
  type PlannedRow,
  type FinishSummary,
  type SessionItemView,
} from '../data/repo';
import type { Feel, Side } from '../data/types';
import { SetRow } from '../components/SetRow';
import { FeelButtons } from '../components/FeelButtons';
import { Stepper } from '../components/Stepper';
import { Modal } from '../components/Modal';
import { Banner } from '../components/Banner';
import { effectsFor } from '../engine/guardRails';
import { GUARD_RAILS } from '../data/seed';
import type { Route } from '../router';
import type { SetLog } from '../data/types';

interface Props {
  sessionId: string;
  navigate: (route: Route) => void;
}

interface EditTarget {
  planItemId: string | null;
  exerciseId: string;
  setIndex: number;
  side?: Side;
  weight: number;
  reps: number;
  target: number;
  step: number;
  isWarmup: boolean;
  isPlusSet: boolean;
  repsToBeat?: number;
}

export function SessionScreen({ sessionId, navigate }: Props) {
  const [view, setView] = useState<SessionView | null>(null);
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [summary, setSummary] = useState<FinishSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [warmupOpen, setWarmupOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const v = await loadSession(sessionId);
      setView(v);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (error) return <p className="p-6 text-bad">{error}</p>;
  if (!view) return <p className="p-6 text-muted">Loading…</p>;

  const findLog = (
    planItemId: string | null,
    exerciseId: string,
    setIndex: number,
    side: Side | undefined,
  ): SetLog | undefined => {
    const key = planItemId ?? `mainlift-${exerciseId}`;
    return view.loggedSets.find(
      (l) =>
        l.planItemId === key && l.setIndex === setIndex && l.side === side,
    );
  };

  const toggle = async (
    row: PlannedRow,
    planItemId: string | null,
    exerciseId: string,
  ) => {
    const log = findLog(planItemId, exerciseId, row.setIndex, row.side);
    if (log) {
      await undoSet(sessionId, planItemId, exerciseId, row.setIndex, row.side);
    } else {
      await logSet({
        sessionId,
        planItemId,
        exerciseId,
        setIndex: row.setIndex,
        side: row.side,
        weight: row.weight,
        reps: row.reps,
        target: row.reps,
        isWarmup: row.kind === 'warmup',
        isPlusSet: row.isPlusSet,
      });
    }
    await refresh();
  };

  const openEdit = (
    row: PlannedRow,
    planItemId: string | null,
    exerciseId: string,
    step: number,
    repsToBeat?: number,
  ) => {
    const log = findLog(planItemId, exerciseId, row.setIndex, row.side);
    setEdit({
      planItemId,
      exerciseId,
      setIndex: row.setIndex,
      side: row.side,
      weight: log?.weight ?? row.weight,
      reps: log?.reps ?? (row.isPlusSet ? row.reps : row.reps),
      target: row.reps,
      step,
      isWarmup: row.kind === 'warmup',
      isPlusSet: row.isPlusSet,
      repsToBeat,
    });
  };

  const submitEdit = async () => {
    if (!edit) return;
    await logSet({
      sessionId,
      planItemId: edit.planItemId,
      exerciseId: edit.exerciseId,
      setIndex: edit.setIndex,
      side: edit.side,
      weight: edit.weight,
      reps: edit.reps,
      target: edit.target,
      isWarmup: edit.isWarmup,
      isPlusSet: edit.isPlusSet,
    });
    setEdit(null);
    await refresh();
  };

  const onFeel = async (planItemId: string, feel: Feel) => {
    await setFeel(sessionId, planItemId, feel);
    await refresh();
  };

  const onFinish = async () => {
    setBusy(true);
    try {
      const s = await finishSession(sessionId);
      setSummary(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onSaveEdits = async () => {
    setBusy(true);
    try {
      await editFinishedSession(sessionId);
      navigate({ kind: 'history' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const isFinished = view.session.status === 'finished';
  const mainLift = view.block.mainLift;

  return (
    <div className="max-w-md mx-auto p-5 pb-32 space-y-5">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ kind: 'home' })}
          className="text-muted text-sm"
        >
          ← Home
        </button>
        <div className="text-sm text-muted">
          W{view.session.week} · {view.planDay.name}
        </div>
      </header>

      {view.planDay.warmupChecklist.length > 0 ? (
        <details
          className="rounded-xl border border-line bg-surface"
          open={warmupOpen}
          onToggle={(e) => setWarmupOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="px-4 py-3 text-muted cursor-pointer">
            Warm-up checklist
          </summary>
          <ul className="list-disc list-inside px-4 pb-4 space-y-1 text-sm text-muted">
            {view.planDay.warmupChecklist.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {mainLift ? (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{mainLift.exercise.name}</h2>
            <span className="text-xs text-muted">
              TM {Math.round(mainLift.mainLift.tm * 10) / 10}
            </span>
          </div>
          <div className="space-y-2">
            {mainLift.rows.map((row) => {
              const log = findLog(null, mainLift.exercise.id, row.setIndex, row.side);
              const displayWeight = log?.weight ?? row.weight;
              const displayReps = log?.reps ?? row.reps;
              return (
                <SetRow
                  key={`main-${row.setIndex}`}
                  weight={displayWeight}
                  reps={displayReps}
                  done={!!log}
                  kind={row.kind}
                  isPlusSet={row.isPlusSet}
                  label={row.kind === 'warmup' ? 'warmup' : undefined}
                  repsToBeat={row.isPlusSet ? mainLift.repsToBeat : undefined}
                  onTap={() => toggle(row, null, mainLift.exercise.id)}
                  onLongPress={() =>
                    openEdit(
                      row,
                      null,
                      mainLift.exercise.id,
                      5,
                      row.isPlusSet ? mainLift.repsToBeat : undefined,
                    )
                  }
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {view.block.items
        .filter((it) => it.planItem.active)
        .map((item) => (
          <ExerciseBlock
            key={item.planItem.id}
            item={item}
            findLog={(setIndex, side) =>
              findLog(item.planItem.id, item.exercise.id, setIndex, side)
            }
            onTap={(row) => toggle(row, item.planItem.id, item.exercise.id)}
            onLongPress={(row) =>
              openEdit(row, item.planItem.id, item.exercise.id, item.planItem.step)
            }
            feel={view.feels.find((f) => f.planItemId === item.planItem.id)?.feel}
            onFeel={(f) => onFeel(item.planItem.id, f)}
          />
        ))}

      <div className="fixed left-0 right-0 bottom-0 p-4 bg-bg/95 backdrop-blur border-t border-line">
        <div className="max-w-md mx-auto">
          {isFinished ? (
            <button
              type="button"
              onClick={onSaveEdits}
              disabled={busy}
              className="w-full h-14 rounded-xl bg-accent text-bg font-semibold disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save edits & replay engine'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              disabled={busy}
              className="w-full h-14 rounded-xl bg-accent text-bg font-semibold disabled:opacity-50"
            >
              {busy ? 'Finishing…' : 'Finish'}
            </button>
          )}
        </div>
      </div>

      <EditModal
        edit={edit}
        onCancel={() => setEdit(null)}
        onChange={(patch) => setEdit((prev) => (prev ? { ...prev, ...patch } : prev))}
        onSubmit={submitEdit}
      />

      <SummaryModal
        summary={summary}
        onClose={() => {
          setSummary(null);
          navigate({ kind: 'home' });
        }}
      />
    </div>
  );
}

interface ExerciseBlockProps {
  item: SessionItemView;
  findLog: (setIndex: number, side?: Side) => SetLog | undefined;
  onTap: (row: PlannedRow) => void;
  onLongPress: (row: PlannedRow) => void;
  feel?: Feel;
  onFeel: (feel: Feel) => void;
}

function ExerciseBlock({ item, findLog, onTap, onLongPress, feel, onFeel }: ExerciseBlockProps) {
  const effects = useMemo(() => effectsFor(item.exercise, GUARD_RAILS), [item.exercise]);
  const supersetLabel = item.planItem.supersetGroup
    ? `${item.planItem.supersetGroup}${item.planItem.order}`
    : null;
  const allDone = item.rows.every((r) => !!findLog(r.setIndex, r.side));
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      <header className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">
            {supersetLabel ? (
              <span className="text-accent mr-2">{supersetLabel}</span>
            ) : null}
            {item.exercise.name}
          </h3>
          {item.planItem.note ? (
            <p className="text-xs text-muted mt-1">{item.planItem.note}</p>
          ) : null}
        </div>
        <span className="text-xs text-muted shrink-0">
          {item.planItem.repMin}
          {item.planItem.repMin !== item.planItem.repMax
            ? `–${item.planItem.repMax}`
            : ''}{' '}
          {item.planItem.unit === 'reps' ? 'reps' : item.planItem.unit}
        </span>
      </header>

      {effects.modifyNotes.map((n, i) => (
        <Banner key={`mod-${i}`} tone="info">
          {n}
        </Banner>
      ))}
      {effects.cautionNotes.map((n, i) => (
        <Banner key={`cau-${i}`} tone="warn">
          {n}
        </Banner>
      ))}

      <div className="space-y-2">
        {item.rows.map((row) => {
          const log = findLog(row.setIndex, row.side);
          const displayWeight = log?.weight ?? row.weight;
          const displayReps = log?.reps ?? row.reps;
          return (
            <SetRow
              key={`${row.setIndex}-${row.side ?? ''}`}
              weight={displayWeight}
              reps={displayReps}
              done={!!log}
              side={row.side}
              kind="work"
              isPlusSet={false}
              onTap={() => onTap(row)}
              onLongPress={() => onLongPress(row)}
            />
          );
        })}
      </div>

      {allDone ? <FeelButtons value={feel} onChange={onFeel} /> : null}
    </section>
  );
}

interface EditModalProps {
  edit: EditTarget | null;
  onCancel: () => void;
  onChange: (patch: Partial<EditTarget>) => void;
  onSubmit: () => void;
}

function EditModal({ edit, onCancel, onChange, onSubmit }: EditModalProps) {
  return (
    <Modal open={!!edit} onClose={onCancel} title="Edit set">
      {edit ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Weight (lb)</span>
            <Stepper
              value={edit.weight}
              step={edit.step > 0 ? edit.step : 5}
              min={0}
              onChange={(v) => onChange({ weight: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Reps</span>
            <Stepper
              value={edit.reps}
              step={1}
              min={0}
              onChange={(v) => onChange({ reps: v })}
            />
          </div>
          {edit.isPlusSet && edit.repsToBeat !== undefined ? (
            <p className="text-xs text-muted">Reps to beat: {edit.repsToBeat}</p>
          ) : null}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-12 rounded-xl border border-line bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="flex-1 h-12 rounded-xl bg-accent text-bg font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

interface SummaryModalProps {
  summary: FinishSummary | null;
  onClose: () => void;
}

function SummaryModal({ summary, onClose }: SummaryModalProps) {
  return (
    <Modal open={!!summary} onClose={onClose} title="Session finished">
      {summary ? (
        <div className="space-y-4">
          <div className="space-y-2 max-h-80 overflow-auto">
            {summary.nextTargets.length === 0 ? (
              <p className="text-sm text-muted">No accessory changes recorded.</p>
            ) : (
              summary.nextTargets.map((t) => (
                <div
                  key={t.planItemId}
                  className="flex items-center justify-between py-2 border-b border-line last:border-b-0"
                >
                  <span className="text-sm">{t.exerciseName}</span>
                  <span className="tabular-nums text-sm">
                    {t.after.weight > 0 ? `${t.after.weight} × ` : ''}
                    {t.after.target}
                    {t.changed ? (
                      <span className="text-accent ml-1">↑</span>
                    ) : null}
                  </span>
                </div>
              ))
            )}
          </div>
          {summary.cycleComplete ? (
            <Banner tone="info">
              Cycle complete — review TMs in Settings.
            </Banner>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-accent text-bg font-semibold"
          >
            Done
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
