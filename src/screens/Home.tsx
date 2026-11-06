import { useEffect, useState } from 'react';
import { loadHome, startSession, advanceWeek, type HomeData, type DayCard } from '../data/repo';
import { Banner } from '../components/Banner';
import type { Route } from '../router';

interface Props {
  navigate: (route: Route) => void;
}

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function HomeScreen({ navigate }: Props) {
  const [home, setHome] = useState<HomeData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadHome()
      .then((h) => {
        if (!cancelled) setHome(h);
      })
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="p-6 text-bad">{error}</p>;
  if (!home) return <p className="p-6 text-muted">Loading…</p>;

  const open = async (card: DayCard) => {
    setBusy(true);
    try {
      const session = await startSession(card.planDayId);
      navigate({ kind: 'session', id: session.id });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const allLiftDaysDone = home.liftDayCards.every((c) => c.done);
  const allCorrectivesDone = home.correctiveDayCards.every((c) => c.done);
  const canAdvance =
    (home.week !== 4 && allLiftDaysDone) ||
    (home.week === 4 && !allCorrectivesDone === false);
  const backupDays = daysSince(home.lastBackupAt);

  const onAdvance = async () => {
    setBusy(true);
    try {
      await advanceWeek();
      const fresh = await loadHome();
      setHome(fresh);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-5 space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">LiftLog</p>
          <h1 className="text-2xl font-semibold mt-1">
            Cycle {home.cycle} · Week {home.week} —{' '}
            <span className="text-accent">{home.kind}</span>
          </h1>
        </div>
        <nav className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate({ kind: 'history' })}
            className="text-muted"
          >
            History
          </button>
          <button
            type="button"
            onClick={() => navigate({ kind: 'settings' })}
            className="text-muted"
          >
            Settings
          </button>
        </nav>
      </header>

      {home.resumeSessionId ? (
        <button
          type="button"
          onClick={() => navigate({ kind: 'session', id: home.resumeSessionId! })}
          className="block w-full text-left"
        >
          <Banner tone="info">
            <div className="flex items-center justify-between">
              <span>Resume session</span>
              <span className="text-accent">→</span>
            </div>
          </Banner>
        </button>
      ) : null}

      {backupDays !== null && backupDays >= 14 ? (
        <Banner tone="warn">
          Last backup was {backupDays} days ago. Export one from Settings.
        </Banner>
      ) : null}
      {backupDays === null ? (
        <Banner tone="warn">
          No backup yet. Export one from Settings.
        </Banner>
      ) : null}

      {home.cycleComplete ? (
        <Banner tone="info">
          Cycle complete — review TMs in Settings and start Cycle {home.cycle + 1}.
        </Banner>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-muted">
          {home.week === 4 ? 'Correctives' : 'Lifts'}
        </h2>
        <div className="space-y-2">
          {(home.week === 4 ? home.correctiveDayCards : home.liftDayCards).map(
            (card) => (
              <button
                key={card.planDayId}
                type="button"
                onClick={() => open(card)}
                disabled={busy}
                className={`w-full rounded-xl border px-4 py-4 text-left ${
                  card.done ? 'bg-ok/10 border-ok/50' : 'bg-surface border-line'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-lg font-medium">{card.name}</div>
                    {card.mainTopSet ? (
                      <div className="text-sm text-muted tabular-nums">
                        Top set: {card.mainTopSet.weight} × {card.mainTopSet.reps}
                        {card.mainTopSet.isPlusSet ? '+' : ''}
                      </div>
                    ) : null}
                  </div>
                  {card.done ? <span className="text-ok text-xl">✓</span> : null}
                </div>
              </button>
            ),
          )}
        </div>
      </section>

      {home.week === 4 ? (
        <section className="space-y-2">
          <details className="rounded-xl border border-line bg-surface">
            <summary className="px-4 py-3 text-muted cursor-pointer">
              Deload lift days (optional)
            </summary>
            <div className="space-y-2 p-3">
              {home.liftDayCards.map((card) => (
                <button
                  key={card.planDayId}
                  type="button"
                  onClick={() => open(card)}
                  disabled={busy}
                  className="w-full rounded-xl border border-line bg-bg px-4 py-3 text-left"
                >
                  <div className="text-base font-medium">{card.name}</div>
                  {card.mainTopSet ? (
                    <div className="text-sm text-muted tabular-nums">
                      Top set: {card.mainTopSet.weight} × {card.mainTopSet.reps}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </details>
        </section>
      ) : null}

      {canAdvance && !home.cycleComplete ? (
        <button
          type="button"
          onClick={onAdvance}
          disabled={busy}
          className="w-full h-14 rounded-xl bg-accent text-bg font-semibold disabled:opacity-50"
        >
          Start Week {home.week + 1}
        </button>
      ) : null}
    </div>
  );
}
