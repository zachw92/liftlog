import { useEffect, useRef, useState } from 'react';
import {
  readSettings,
  updateSettings,
  readMainLifts,
  updateMainLiftTm,
  getPersistenceStatus,
  requestPersistence,
} from '../data/repo';
import { db } from '../data/db';
import { exportBackup, importBackup, previewImport } from '../data/backup';
import type { MainLift, Settings } from '../data/types';
import type { Route } from '../router';
import { Banner } from '../components/Banner';
import { nowIso } from '../data/clock';

interface Props {
  navigate: (route: Route) => void;
}

const LIFT_LABEL: Record<string, string> = {
  ohp: 'Press (OHP)',
  bench: 'Bench',
  squat: 'Squat',
  deadlift: 'Deadlift',
};

export function SettingsScreen({ navigate }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mains, setMains] = useState<MainLift[]>([]);
  const [persisted, setPersisted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, m, p] = await Promise.all([
          readSettings(),
          readMainLifts(),
          getPersistenceStatus(),
        ]);
        setSettings(s);
        setMains(m);
        setPersisted(p);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  if (error) return <p className="p-6 text-bad">{error}</p>;
  if (!settings) return <p className="p-6 text-muted">Loading…</p>;

  const onThresholdChange = async (v: number) => {
    await updateSettings({ progressThreshold: v });
    setSettings((prev) => (prev ? { ...prev, progressThreshold: v } : prev));
  };

  const onPullPushTarget = async (v: number) => {
    await updateSettings({ pullPushTarget: v });
    setSettings((prev) => (prev ? { ...prev, pullPushTarget: v } : prev));
  };

  const onTmChange = async (id: MainLift['id'], tm: number) => {
    await updateMainLiftTm(id, tm);
    setMains((prev) => prev.map((m) => (m.id === id ? { ...m, tm } : m)));
  };

  const onPersist = async () => {
    const ok = await requestPersistence();
    setPersisted(ok);
  };

  const onExport = async () => {
    try {
      const payload = await exportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liftlog-backup-${nowIso().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      await db.meta.update('singleton', { lastBackupAt: nowIso() });
      setMessage('Backup downloaded.');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onPickImport = () => importRef.current?.click();

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const preview = previewImport(payload);
      const total = Object.values(preview.counts).reduce((a, b) => a + b, 0);
      if (!window.confirm(`Replace all data with ${total} rows from backup?`)) return;
      await importBackup(payload);
      setMessage('Backup imported. Reloading…');
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="max-w-md mx-auto p-5 space-y-6">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ kind: 'home' })}
          className="text-muted text-sm"
        >
          ← Home
        </button>
        <h1 className="text-lg font-semibold">Settings</h1>
        <span className="w-10" />
      </header>

      {message ? <Banner tone="info">{message}</Banner> : null}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-muted">Training maxes</h2>
        <div className="space-y-2">
          {mains.map((m) => (
            <label key={m.id} className="flex items-center justify-between">
              <span>{LIFT_LABEL[m.id] ?? m.id}</span>
              <input
                type="number"
                step={0.5}
                value={m.tm}
                onChange={(e) => onTmChange(m.id, Number(e.target.value))}
                className="w-28 h-12 rounded-xl bg-surface border border-line px-3 text-right tabular-nums"
              />
            </label>
          ))}
          <p className="text-xs text-muted">
            TMs are stored unrounded. Entered max × 0.9.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-muted">Rules</h2>
        <label className="flex items-center justify-between">
          <span>Week 3 progress threshold</span>
          <input
            type="number"
            min={1}
            value={settings.progressThreshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="w-24 h-12 rounded-xl bg-surface border border-line px-3 text-right tabular-nums"
          />
        </label>
        <label className="flex items-center justify-between">
          <span>Pull:push target</span>
          <input
            type="number"
            step={0.1}
            value={settings.pullPushTarget}
            onChange={(e) => onPullPushTarget(Number(e.target.value))}
            className="w-24 h-12 rounded-xl bg-surface border border-line px-3 text-right tabular-nums"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-muted">Storage</h2>
        <div className="flex items-center justify-between">
          <span>Persistent storage</span>
          {persisted ? (
            <span className="text-ok">On ✓</span>
          ) : (
            <button
              type="button"
              onClick={onPersist}
              className="h-10 px-3 rounded-xl bg-surface border border-line text-sm"
            >
              Request
            </button>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-muted">Backup</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExport}
            className="h-12 rounded-xl bg-accent text-bg font-semibold"
          >
            Export
          </button>
          <button
            type="button"
            onClick={onPickImport}
            className="h-12 rounded-xl border border-line bg-surface"
          >
            Import
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.currentTarget.value = '';
            }}
          />
        </div>
      </section>
    </div>
  );
}
