import { useState } from 'react';
import { completeSetup, requestPersistence, SEED_MAIN_LIFTS } from '../data/repo';
import type { MainLiftId } from '../data/types';
import type { Week } from '../engine/fiveThreeOne';

interface Props {
  onDone: () => void;
}

const WEEKS: Array<{ w: Week; label: string }> = [
  { w: 1, label: 'Week 1 — 5s' },
  { w: 2, label: 'Week 2 — 3s' },
  { w: 3, label: 'Week 3 — 5/3/1' },
  { w: 4, label: 'Week 4 — deload' },
];

const LIFT_LABEL: Record<MainLiftId, string> = {
  ohp: 'Press (OHP)',
  bench: 'Bench',
  squat: 'Squat',
  deadlift: 'Deadlift',
};

const LIFT_DAYS: Array<{ id: string; label: string; lift: MainLiftId }> = [
  { id: 'day-bench', label: 'Bench day', lift: 'bench' },
  { id: 'day-deadlift', label: 'Deadlift day', lift: 'deadlift' },
  { id: 'day-ohp', label: 'OHP day', lift: 'ohp' },
  { id: 'day-squat', label: 'Squat day', lift: 'squat' },
];

export function SetupScreen({ onDone }: Props) {
  const [week, setWeek] = useState<Week>(1);
  const [daysDone, setDaysDone] = useState<Set<string>>(new Set());
  const [maxes, setMaxes] = useState<Record<MainLiftId, number>>(() =>
    Object.fromEntries(
      SEED_MAIN_LIFTS.map((m) => [m.id, m.enteredMax]),
    ) as Record<MainLiftId, number>,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (id: string) => {
    setDaysDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      await completeSetup({
        week,
        daysDoneIds: [...daysDone],
        maxes,
      });
      await requestPersistence();
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-5 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Set up LiftLog</h1>
        <p className="text-muted text-sm mt-1">
          Confirm your current cycle so the app shows the right targets.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-muted">Which week are you on?</h2>
        <div className="grid grid-cols-2 gap-2">
          {WEEKS.map((w) => (
            <button
              key={w.w}
              type="button"
              onClick={() => setWeek(w.w)}
              className={`h-14 rounded-xl border text-left px-4 ${
                week === w.w
                  ? 'bg-accent/10 border-accent text-ink'
                  : 'bg-surface border-line text-muted'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </section>

      {week !== 4 ? (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-muted">
            Already done this week?
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {LIFT_DAYS.map((d) => {
              const on = daysDone.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={`h-14 rounded-xl border text-left px-4 ${
                    on
                      ? 'bg-ok/10 border-ok/60 text-ok'
                      : 'bg-surface border-line text-muted'
                  }`}
                >
                  {d.label} {on ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-muted">
          Confirm your entered maxes (lb)
        </h2>
        <p className="text-xs text-muted">
          TMs will be set to 90% of these, unrounded.
        </p>
        <div className="space-y-2">
          {SEED_MAIN_LIFTS.map((m) => (
            <label key={m.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{LIFT_LABEL[m.id]}</span>
              <input
                type="number"
                inputMode="numeric"
                value={maxes[m.id]}
                onChange={(e) =>
                  setMaxes((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))
                }
                className="w-24 h-12 rounded-xl bg-surface border border-line px-3 text-right tabular-nums"
              />
            </label>
          ))}
        </div>
      </section>

      {error ? (
        <p className="text-bad text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={saving}
        className="w-full h-14 rounded-xl bg-accent text-bg font-semibold disabled:opacity-50"
      >
        {saving ? 'Setting up…' : 'Start using LiftLog'}
      </button>
    </div>
  );
}
