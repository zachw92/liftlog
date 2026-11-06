import { db, type LiftLogDb, ALL_TABLE_NAMES, type TableName } from './db';
import { SCHEMA_VERSION } from './types';
import { nowIso, type Clock, systemClock } from './clock';

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  data: Record<TableName, unknown[]>;
}

export interface ImportReport {
  schemaVersion: number;
  exportedAt: string;
  counts: Record<TableName, number>;
}

export async function exportBackup(
  clock: Clock = systemClock,
  database: LiftLogDb = db,
): Promise<BackupPayload> {
  const data = {} as Record<TableName, unknown[]>;
  for (const name of ALL_TABLE_NAMES) {
    data[name] = await database.table(name).toArray();
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(clock),
    data,
  };
}

export function previewImport(payload: unknown): ImportReport {
  const parsed = assertValidPayload(payload);
  const counts = {} as Record<TableName, number>;
  for (const name of ALL_TABLE_NAMES) {
    counts[name] = parsed.data[name]?.length ?? 0;
  }
  return {
    schemaVersion: parsed.schemaVersion,
    exportedAt: parsed.exportedAt,
    counts,
  };
}

export async function importBackup(
  payload: unknown,
  database: LiftLogDb = db,
): Promise<ImportReport> {
  const parsed = assertValidPayload(payload);
  await database.transaction(
    'rw',
    ALL_TABLE_NAMES.map((n) => database.table(n)),
    async () => {
      for (const name of ALL_TABLE_NAMES) {
        const table = database.table(name);
        await table.clear();
        const rows = parsed.data[name] ?? [];
        if (rows.length > 0) await table.bulkPut(rows);
      }
    },
  );
  return previewImport(parsed);
}

function assertValidPayload(payload: unknown): BackupPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup payload is not an object.');
  }
  const p = payload as Partial<BackupPayload>;
  if (typeof p.schemaVersion !== 'number') {
    throw new Error('Backup is missing schemaVersion.');
  }
  if (p.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion ${p.schemaVersion} (this build expects ${SCHEMA_VERSION}).`,
    );
  }
  if (typeof p.exportedAt !== 'string') {
    throw new Error('Backup is missing exportedAt.');
  }
  if (!p.data || typeof p.data !== 'object') {
    throw new Error('Backup data is missing.');
  }
  for (const name of ALL_TABLE_NAMES) {
    const rows = (p.data as Record<string, unknown>)[name];
    if (rows !== undefined && !Array.isArray(rows)) {
      throw new Error(`Backup table ${name} is not an array.`);
    }
  }
  return p as BackupPayload;
}
