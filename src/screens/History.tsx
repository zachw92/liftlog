import { useEffect, useState } from 'react';
import { listSessions } from '../data/repo';
import { db } from '../data/db';
import type { Session, PlanDay } from '../data/types';
import type { Route } from '../router';

interface Props {
  navigate: (route: Route) => void;
}

export function HistoryScreen({ navigate }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [days, setDays] = useState<Map<string, PlanDay>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, d] = await Promise.all([listSessions(), db.planDays.toArray()]);
        setSessions(s);
        setDays(new Map(d.map((x) => [x.id, x])));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  if (error) return <p className="p-6 text-bad">{error}</p>;

  return (
    <div className="max-w-md mx-auto p-5 space-y-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ kind: 'home' })}
          className="text-muted text-sm"
        >
          ← Home
        </button>
        <h1 className="text-lg font-semibold">History</h1>
        <span className="w-10" />
      </header>

      {sessions.length === 0 ? (
        <p className="text-muted">No finished sessions yet.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const day = days.get(s.planDayId);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => navigate({ kind: 'session', id: s.id })}
                  className="w-full flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left"
                >
                  <div>
                    <div className="text-base font-medium">
                      {day?.name ?? s.planDayId}
                    </div>
                    <div className="text-xs text-muted">
                      {s.date} · C{s.cycle} W{s.week}
                    </div>
                  </div>
                  <span className="text-muted">→</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
