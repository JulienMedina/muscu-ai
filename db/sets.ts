import { runSql } from './schema';

export type Split = 'push' | 'pull' | 'legs' | string;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function ensureWorkoutForToday(db: any, split: Split): Promise<string> {
  const date = todayLocalISODate();
  const found = await runSql(db, 'SELECT id FROM workouts WHERE date = ? AND split = ? LIMIT 1', [date, split]);
  const rows: any = found?.rows;
  if (rows && rows.length > 0) {
    return rows.item(0).id as string;
  }
  const id = genId('wo');
  await runSql(db, 'INSERT INTO workouts (id, date, split, notes) VALUES (?,?,?,?)', [id, date, split, null]);
  return id;
}

export type SetInsertInput = {
  workoutId: string;
  exerciseId: string;
  targetReps: number;
  targetRpe: number;
  performedReps: number;
  actualRpe: number;
  loadKg: number;
  pain: number;
  restSec: number;
};

export async function insertSet(db: any, input: SetInsertInput): Promise<string> {
  const id = genId('set');
  await runSql(
    db,
    `INSERT INTO sets (id, workoutId, exerciseId, targetReps, targetRpe, performedReps, actualRpe, loadKg, pain, restSec)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      input.workoutId,
      input.exerciseId,
      input.targetReps,
      input.targetRpe,
      input.performedReps,
      input.actualRpe,
      input.loadKg,
      input.pain,
      input.restSec,
    ]
  );
  return id;
}

export type SetRow = {
  id: string;
  workoutId: string;
  exerciseId: string;
  targetReps: number | null;
  targetRpe: number | null;
  performedReps: number | null;
  actualRpe: number | null;
  loadKg: number | null;
  pain: number | null;
  restSec: number | null;
};

export async function getLastSetForToday(
  db: any,
  workoutId: string,
  exerciseId: string
): Promise<SetRow | null> {
  const res = await runSql(
    db,
    `SELECT id, workoutId, exerciseId, targetReps, targetRpe, performedReps, actualRpe, loadKg, pain, restSec
     FROM sets WHERE workoutId = ? AND exerciseId = ? ORDER BY rowid DESC LIMIT 1`,
    [workoutId, exerciseId]
  );
  const rows: any = res?.rows;
  if (rows && rows.length > 0) return rows.item(0) as SetRow;
  return null;
}

export async function getLastSetHistorical(db: any, exerciseId: string): Promise<SetRow | null> {
  const res = await runSql(
    db,
    `SELECT id, workoutId, exerciseId, targetReps, targetRpe, performedReps, actualRpe, loadKg, pain, restSec
     FROM sets WHERE exerciseId = ? ORDER BY rowid DESC LIMIT 1`,
    [exerciseId]
  );
  const rows: any = res?.rows;
  if (rows && rows.length > 0) return rows.item(0) as SetRow;
  return null;
}

export async function countSetsToday(db: any, workoutId: string, exerciseId: string): Promise<number> {
  const res = await runSql(db, `SELECT COUNT(*) as c FROM sets WHERE workoutId = ? AND exerciseId = ?`, [
    workoutId,
    exerciseId,
  ]);
  const rows: any = res?.rows;
  return rows && rows.length > 0 ? (rows.item(0).c as number) : 0;
}

