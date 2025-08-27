import { runSql } from './schema';
import type { Exercise } from './types';

export type WorkoutExerciseItem = Exercise & { ord: number };

export async function getExercisesForWorkout(db: any, workoutId: string): Promise<WorkoutExerciseItem[]> {
  const res = await runSql(
    db,
    `SELECT we.ord as ord, e.id as id, e.name as name,
            e.primary_target AS "primary", e.secondary_target AS "secondary", e.substitutions as substitutions
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exerciseId
     WHERE we.workoutId = ?
     ORDER BY we.ord ASC`,
    [workoutId]
  );
  const rows: any = res.rows;
  const out: WorkoutExerciseItem[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

export async function initWorkoutExercisesIfEmpty(db: any, workoutId: string, list: Exercise[]): Promise<void> {
  const countRes = await runSql(db, `SELECT COUNT(*) as c FROM workout_exercises WHERE workoutId = ?`, [workoutId]);
  const rows: any = countRes.rows;
  const c = rows && rows.length > 0 ? (rows.item(0).c as number) : 0;
  if (c > 0) return;

  // Insert defaults with order
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    await runSql(
      db,
      `INSERT INTO workout_exercises (workoutId, ord, exerciseId) VALUES (?,?,?)`,
      [workoutId, i, e.id]
    );
  }
}

export async function replaceExerciseInWorkout(db: any, workoutId: string, ord: number, newExerciseId: string): Promise<void> {
  // Simple replace at position. If the new exercise already exists elsewhere, we keep it duplicated for now.
  await runSql(
    db,
    `UPDATE workout_exercises SET exerciseId = ? WHERE workoutId = ? AND ord = ?`,
    [newExerciseId, workoutId, ord]
  );
}

export async function saveWorkoutExercisesOrder(db: any, workoutId: string, exerciseIdsInOrder: string[]): Promise<void> {
  // Two-phase update to avoid UNIQUE(workoutId, ord) collisions during reindex
  await runSql(db, `UPDATE workout_exercises SET ord = ord + 1000 WHERE workoutId = ?`, [workoutId]);
  for (let i = 0; i < exerciseIdsInOrder.length; i++) {
    await runSql(
      db,
      `UPDATE workout_exercises SET ord = ? WHERE workoutId = ? AND exerciseId = ?`,
      [i, workoutId, exerciseIdsInOrder[i]]
    );
  }
}
