import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LiftLogDb, ALL_TABLE_NAMES } from './db';
import { completeSetup, startSession, logSet, finishSession } from './repo';
import { exportBackup, importBackup, previewImport } from './backup';
import type { Clock } from './clock';

const FIXED_DATE = new Date('2026-11-06T12:00:00.000Z');
const fixedClock: Clock = () => FIXED_DATE;

let dbs: LiftLogDb[] = [];
function freshDb(name = `test_backup_${Math.random().toString(36).slice(2)}`): LiftLogDb {
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

async function snapshot(d: LiftLogDb) {
  const out: Record<string, unknown[]> = {};
  for (const name of ALL_TABLE_NAMES) {
    out[name] = await d.table(name).toArray();
  }
  return out;
}

describe('exportBackup + importBackup', () => {
  it('round-trip: every table matches after export → fresh DB → import', async () => {
    const src = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: src });
    // Log some activity so the backup covers more than just the seed.
    const session = await startSession('day-bench', fixedClock, src);
    await logSet(
      {
        sessionId: session.id,
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
      src,
    );
    await finishSession(session.id, fixedClock, src);

    const payload = await exportBackup(fixedClock, src);
    const before = await snapshot(src);

    const dst = freshDb();
    await importBackup(payload, dst);
    const after = await snapshot(dst);

    for (const name of ALL_TABLE_NAMES) {
      const sorted = (rows: unknown[]) =>
        [...rows].sort((a, b) =>
          JSON.stringify(a).localeCompare(JSON.stringify(b)),
        );
      expect(sorted(after[name]!), `table ${name}`).toEqual(sorted(before[name]!));
    }
  });

  it('import replaces existing data (clears before load)', async () => {
    const d = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: d });
    const payloadEmpty = {
      schemaVersion: 1,
      exportedAt: '2026-11-06T00:00:00.000Z',
      data: Object.fromEntries(ALL_TABLE_NAMES.map((n) => [n, []])),
    };
    await importBackup(payloadEmpty, d);
    for (const name of ALL_TABLE_NAMES) {
      expect(await d.table(name).count(), `${name} count after wipe`).toBe(0);
    }
  });

  it('previewImport returns counts without mutating the DB', async () => {
    const src = freshDb();
    await completeSetup({ week: 1, daysDoneIds: [], database: src });
    const payload = await exportBackup(fixedClock, src);
    const report = previewImport(payload);
    expect(report.schemaVersion).toBe(1);
    expect(report.counts.exercises).toBeGreaterThan(0);
    expect(report.counts.guardRails).toBeGreaterThan(0);
  });

  it('rejects wrong schemaVersion', () => {
    expect(() =>
      previewImport({ schemaVersion: 2, exportedAt: 'x', data: {} }),
    ).toThrow(/schemaVersion/i);
  });

  it('rejects malformed payload', () => {
    expect(() => previewImport(null)).toThrow();
    expect(() => previewImport({ data: {} })).toThrow(/schemaVersion/i);
    expect(() =>
      previewImport({
        schemaVersion: 1,
        exportedAt: 'x',
        data: { exercises: 'not-an-array' },
      }),
    ).toThrow(/array/i);
  });
});
