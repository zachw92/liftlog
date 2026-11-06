import { useEffect, useState } from 'react';
import {
  getCycleCompleteData,
  confirmCycle,
  type CycleCompleteLift,
  type CycleConfirmChoice,
} from '../data/repo';
import type { Route } from '../router';
import { Banner } from '../components/Banner';

interface Props {
  navigate: (route: Route) => void;
}

type Pick = 'accept' | 'hold' | 'custom';

interface LiftChoice {
  pick: Pick;
  customTm: number;
}

function assessmentSuggestion(lift: CycleCompleteLift): number {
  return lift.assessment?.newTm ?? lift.currentTm;
}

export function CycleCompleteScreen({ navigate }: Props) {
  const [data, setData] = useState<CycleCompleteLift[] | null>(null);
  const [choices, setChoices] = useState<Record<string, LiftChoice>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCycleCompleteData()
      .then((d) => {
        setData(d);
        setChoices(
          Object.fromEntries(
            d.map((l) => [l.liftId, { pick: 'accept', customTm: assessmentSuggestion(l) }]),
          ),
        );
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="p-6 text-bad">{error}</p>;
  if (!data) return <p className="p-6 text-muted">Loading…</p>;

  const onSubmit = async () => {
    setBusy(true);
    try {
      const payload: CycleConfirmChoice[] = data.map((lift) => {
        const choice = choices[lift.liftId]!;
        let newTm: number;
        let missStreak: number;
        if (choice.pick === 'accept') {
          newTm = assessmentSuggestion(lift);
          missStreak = lift.assessment?.missStreak ?? 0;
        } else if (choice.pick === 'hold') {
          newTm = lift.currentTm;
          missStreak = lift.priorMissStreak + 1;
        } else {
          newTm = choice.customTm;
          missStreak = 0;
        }
        return { liftId: lift.liftId, newTm, missStreak };
      });
      await confirmCycle(payload);
      navigate({ kind: 'home' });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const update = (liftId: string, patch: Partial<LiftChoice>) =>
    setChoices((prev) => ({
      ...prev,
      [liftId]: { ...prev[liftId]!, ...patch },
    }));

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
        <h1 className="text-lg font-semibold">Cycle complete</h1>
        <span className="w-10" />
      </header>

      <Banner tone="info">
        Review each lift. Nothing changes until you confirm.
      </Banner>

      {data.map((lift) => {
        const choice = choices[lift.liftId]!;
        const suggested = assessmentSuggestion(lift);
        const label =
          lift.assessment?.action === 'increment'
            ? `Accept: TM → ${suggested} (+${lift.increment})`
            : lift.assessment?.action === 'reset'
              ? `Accept: TM × 0.9 → ${suggested.toFixed(2)}`
              : `Accept: hold at ${lift.currentTm}`;
        return (
          <section
            key={lift.liftId}
            className="rounded-2xl border border-line bg-surface p-4 space-y-3"
          >
            <header className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold">{lift.liftName}</h2>
              <span className="text-xs text-muted">Current TM {lift.currentTm}</span>
            </header>
            <div className="text-xs text-muted tabular-nums">
              + sets — W1: {lift.reps.week1 ?? '—'} · W2: {lift.reps.week2 ?? '—'} · W3:{' '}
              {lift.reps.week3 ?? '—'}
            </div>

            <div className="space-y-2">
              <Option
                selected={choice.pick === 'accept'}
                label={label}
                onClick={() => update(lift.liftId, { pick: 'accept' })}
                disabled={!lift.assessment}
              />
              <Option
                selected={choice.pick === 'hold'}
                label={`Hold at ${lift.currentTm}`}
                onClick={() => update(lift.liftId, { pick: 'hold' })}
              />
              <Option
                selected={choice.pick === 'custom'}
                label={
                  <div className="flex items-center justify-between w-full">
                    <span>Custom TM</span>
                    <input
                      type="number"
                      step={0.5}
                      value={choice.customTm}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        update(lift.liftId, {
                          customTm: Number(e.target.value),
                        })
                      }
                      className="w-24 h-10 rounded-lg bg-bg border border-line px-2 text-right tabular-nums"
                    />
                  </div>
                }
                onClick={() => update(lift.liftId, { pick: 'custom' })}
              />
            </div>
          </section>
        );
      })}

      <div className="fixed left-0 right-0 bottom-0 p-4 bg-bg/95 backdrop-blur border-t border-line">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="w-full h-14 rounded-xl bg-accent text-bg font-semibold disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Start next cycle'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface OptionProps {
  selected: boolean;
  label: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

function Option({ selected, label, onClick, disabled }: OptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl border px-4 py-3 text-left disabled:opacity-40 ${
        selected
          ? 'bg-accent/10 border-accent text-ink'
          : 'bg-bg border-line text-muted'
      }`}
    >
      {label}
    </button>
  );
}
