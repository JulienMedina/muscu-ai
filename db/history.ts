import { runSql } from './schema';

export type WorkoutListItem = {
  id: string;
  date: string;
  split: string;
  volume: number;
  setsCount: number;
  avgRpe: number | null;
};

export async function getWorkoutsWithStats(db: any, startDate: string, endDate: string): Promise<WorkoutListItem[]> {
  const res = await runSql(
    db,
    `SELECT w.id, w.date, w.split,
            COALESCE(SUM(s.loadKg * s.performedReps), 0) AS volume,
            COUNT(s.id) AS setsCount,
            AVG(s.actualRpe) AS avgRpe
     FROM workouts w
     LEFT JOIN sets s ON s.workoutId = w.id
     WHERE w.date BETWEEN ? AND ?
     GROUP BY w.id
     ORDER BY w.date DESC`,
    [startDate, endDate]
  );
  const rows: any = res.rows;
  const out: WorkoutListItem[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

export type WorkoutSetRow = {
  id: string;
  workoutId: string;
  exerciseId: string;
  name: string;
  targetReps: number | null;
  targetRpe: number | null;
  performedReps: number | null;
  actualRpe: number | null;
  loadKg: number | null;
  pain: number | null;
  restSec: number | null;
};

export async function getWorkoutDetailSets(db: any, workoutId: string): Promise<WorkoutSetRow[]> {
  const res = await runSql(
    db,
    `SELECT s.id, s.workoutId, s.exerciseId, e.name,
            s.targetReps, s.targetRpe, s.performedReps, s.actualRpe, s.loadKg, s.pain, s.restSec
     FROM sets s JOIN exercises e ON e.id = s.exerciseId
     WHERE s.workoutId = ?
     ORDER BY s.rowid ASC`,
    [workoutId]
  );
  const rows: any = res.rows;
  const out: WorkoutSetRow[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

export async function getWorkoutStats(db: any, workoutId: string): Promise<{ volume: number; setsCount: number; avgRpe: number | null }>{
  const res = await runSql(
    db,
    `SELECT COALESCE(SUM(s.loadKg * s.performedReps), 0) AS volume,
            COUNT(s.id) AS setsCount,
            AVG(s.actualRpe) AS avgRpe
     FROM sets s WHERE s.workoutId = ?`,
    [workoutId]
  );
  const rows: any = res.rows;
  if (rows && rows.length > 0) {
    const r = rows.item(0);
    return { volume: r.volume ?? 0, setsCount: r.setsCount ?? 0, avgRpe: r.avgRpe ?? null };
  }
  return { volume: 0, setsCount: 0, avgRpe: null };
}

export async function getWorkoutById(db: any, id: string): Promise<{ id: string; date: string; split: string } | null> {
  const res = await runSql(db, `SELECT id, date, split FROM workouts WHERE id = ? LIMIT 1`, [id]);
  const rows: any = res.rows;
  if (rows && rows.length > 0) return rows.item(0);
  return null;
}

export async function getExerciseOverview(
  db: any,
  exerciseId: string,
  startDate: string,
  endDate: string
): Promise<{
  last?: { date: string; loadKg: number; reps: number; rpe: number };
  pr?: { date: string; loadKg: number; reps: number; score: number };
  volume30d: number;
  rpeTrend?: { recentAvg: number; prevAvg: number; trend: 'up' | 'down' | 'flat' };
  occurrences: Array<{ date: string; loadKg: number; reps: number; rpe: number }>;
}> {
  // Last performance
  const lastRes = await runSql(
    db,
    `SELECT w.date as date, s.loadKg as loadKg, s.performedReps as reps, s.actualRpe as rpe
     FROM sets s JOIN workouts w ON w.id = s.workoutId
     WHERE s.exerciseId = ?
     ORDER BY w.date DESC, s.rowid DESC LIMIT 1`,
    [exerciseId]
  );
  const lastRows: any = lastRes.rows;
  const last = lastRows && lastRows.length > 0 ? (lastRows.item(0) as any) : undefined;

  // PR simple by load*reps
  const prRes = await runSql(
    db,
    `SELECT w.date as date, s.loadKg as loadKg, s.performedReps as reps, (s.loadKg * s.performedReps) as score
     FROM sets s JOIN workouts w ON w.id = s.workoutId
     WHERE s.exerciseId = ?
     ORDER BY score DESC LIMIT 1`,
    [exerciseId]
  );
  const prRows: any = prRes.rows;
  const pr = prRows && prRows.length > 0 ? (prRows.item(0) as any) : undefined;

  // Volume on period
  const volRes = await runSql(
    db,
    `SELECT COALESCE(SUM(s.loadKg * s.performedReps), 0) as volume
     FROM sets s JOIN workouts w ON w.id = s.workoutId
     WHERE s.exerciseId = ? AND w.date BETWEEN ? AND ?`,
    [exerciseId, startDate, endDate]
  );
  const volRows: any = volRes.rows;
  const volume30d = volRows && volRows.length > 0 ? (volRows.item(0).volume ?? 0) : 0;

  // RPE trend: average per workout, last 6 workouts
  const trendRes = await runSql(
    db,
    `SELECT w.date as date, AVG(s.actualRpe) as avgRpe
     FROM sets s JOIN workouts w ON w.id = s.workoutId
     WHERE s.exerciseId = ?
     GROUP BY w.id
     ORDER BY w.date DESC
     LIMIT 6`,
    [exerciseId]
  );
  const tRows: any = trendRes.rows;
  let rpeTrend: { recentAvg: number; prevAvg: number; trend: 'up' | 'down' | 'flat' } | undefined;
  if (tRows && tRows.length > 0) {
    const vals: number[] = [];
    for (let i = 0; i < tRows.length; i++) {
      const v = tRows.item(i).avgRpe as number | null;
      if (v != null) vals.push(v);
    }
    const recent = vals.slice(0, 3);
    const prev = vals.slice(3, 6);
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const recentAvg = avg(recent);
    const prevAvg = avg(prev);
    const diff = recentAvg - prevAvg;
    const trend = Math.abs(diff) < 0.1 ? 'flat' : diff > 0 ? 'up' : 'down';
    rpeTrend = { recentAvg, prevAvg, trend };
  }

  // Occurrences list (latest 20)
  const occRes = await runSql(
    db,
    `SELECT w.date as date, s.loadKg as loadKg, s.performedReps as reps, s.actualRpe as rpe
     FROM sets s JOIN workouts w ON w.id = s.workoutId
     WHERE s.exerciseId = ?
     ORDER BY w.date DESC, s.rowid DESC
     LIMIT 20`,
    [exerciseId]
  );
  const oRows: any = occRes.rows;
  const occurrences: Array<{ date: string; loadKg: number; reps: number; rpe: number }> = [];
  for (let i = 0; i < oRows.length; i++) occurrences.push(oRows.item(i));

  return { last, pr, volume30d, rpeTrend, occurrences };
}

