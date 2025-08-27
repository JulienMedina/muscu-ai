// Migrations versionnées via PRAGMA user_version
export async function migrateDbIfNeeded(db: any): Promise<void> {
  // Toujours activer WAL et les FK au démarrage
  await runSql(db, `PRAGMA journal_mode = 'wal'`);
  await runSql(db, `PRAGMA foreign_keys = ON`);

  const res = await runSql(db, `PRAGMA user_version`);
  const rows: any = res?.rows;
  const current = rows && rows.length > 0 ? (rows.item(0).user_version as number) : 0;

  const DATABASE_VERSION = 3;
  if ((current ?? 0) >= DATABASE_VERSION) return;

  // v0 -> v1: créer le schéma initial + index
  if ((current ?? 0) === 0) {
    await runSql(
      db,
      `CREATE TABLE IF NOT EXISTS exercises(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        primary_target TEXT,
        secondary_target TEXT,
        substitutions TEXT
      );`
    );

    await runSql(
      db,
      `CREATE TABLE IF NOT EXISTS workouts(
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        split TEXT NOT NULL,
        notes TEXT
      );`
    );

    await runSql(
      db,
      `CREATE TABLE IF NOT EXISTS sets(
        id TEXT PRIMARY KEY,
        workoutId TEXT NOT NULL,
        exerciseId TEXT NOT NULL,
        targetReps INT,
        targetRpe REAL,
        performedReps INT,
        actualRpe REAL,
        loadKg REAL,
        pain INT,
        restSec INT,
        FOREIGN KEY(workoutId) REFERENCES workouts(id) ON DELETE CASCADE,
        FOREIGN KEY(exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
      );`
    );

    // Index utiles
    await runSql(db, `CREATE INDEX IF NOT EXISTS idx_exercises_primary_target ON exercises(primary_target)`);
    await runSql(db, `CREATE INDEX IF NOT EXISTS idx_sets_workoutId ON sets(workoutId)`);
    await runSql(db, `CREATE INDEX IF NOT EXISTS idx_sets_exerciseId ON sets(exerciseId)`);

    await runSql(db, `PRAGMA user_version = 1`);
  }

  // v1 -> v2: Recréer la table sets avec contraintes FK si elle ne les a pas
  if ((current ?? 0) <= 1) {
    // Crée une nouvelle table avec FK, copie les données, remplace
    await runSql(
      db,
      `CREATE TABLE IF NOT EXISTS sets_new(
        id TEXT PRIMARY KEY,
        workoutId TEXT NOT NULL,
        exerciseId TEXT NOT NULL,
        targetReps INT,
        targetRpe REAL,
        performedReps INT,
        actualRpe REAL,
        loadKg REAL,
        pain INT,
        restSec INT,
        FOREIGN KEY(workoutId) REFERENCES workouts(id) ON DELETE CASCADE,
        FOREIGN KEY(exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
      );`
    );
    // Copie si l'ancienne existe
    await runSql(
      db,
      `INSERT OR IGNORE INTO sets_new (id, workoutId, exerciseId, targetReps, targetRpe, performedReps, actualRpe, loadKg, pain, restSec)
       SELECT id, workoutId, exerciseId, targetReps, targetRpe, performedReps, actualRpe, loadKg, pain, restSec FROM sets`
    );
    // Remplace la table
    await runSql(db, `DROP TABLE IF EXISTS sets`);
    await runSql(db, `ALTER TABLE sets_new RENAME TO sets`);
    // Recrée les index
    await runSql(db, `CREATE INDEX IF NOT EXISTS idx_sets_workoutId ON sets(workoutId)`);
    await runSql(db, `CREATE INDEX IF NOT EXISTS idx_sets_exerciseId ON sets(exerciseId)`);
    await runSql(db, `PRAGMA user_version = 2`);
  }

  // v2 -> v3: Table workout_exercises to persist session exercise list and order
  if ((current ?? 0) <= 2) {
    await runSql(
      db,
      `CREATE TABLE IF NOT EXISTS workout_exercises(
         workoutId TEXT NOT NULL,
         ord INT NOT NULL,
         exerciseId TEXT NOT NULL,
         PRIMARY KEY(workoutId, ord),
         FOREIGN KEY(workoutId) REFERENCES workouts(id) ON DELETE CASCADE,
         FOREIGN KEY(exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
       );`
    );
    await runSql(db, `CREATE INDEX IF NOT EXISTS idx_workout_exercises_workoutId ON workout_exercises(workoutId)`);
    await runSql(db, `PRAGMA user_version = 3`);
  }
}

// Helper Promisifié compatible avec API legacy (transaction/executeSql)
// et l'API "next" (runAsync/getAllAsync/withTransactionAsync)
export async function runSql(db: any, sql: string, params: any[] = []): Promise<any> {
  if (!db) throw new Error('DB not initialized');

  // Legacy: database.transaction(callback)
  if (typeof db.transaction === 'function') {
    return new Promise((resolve, reject) => {
      try {
        db.transaction((tx: any) => {
          tx.executeSql(
            sql,
            params,
            (_tx: any, result: any) => resolve(result),
            (_tx: any, error: any) => {
              reject(error);
              return false;
            }
          );
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // Next/JSI: use runAsync/getAllAsync
  const isSelect = /^\s*(select|pragma)/i.test(sql);
  try {
    if (isSelect && typeof db.getAllAsync === 'function') {
      const arr = await db.getAllAsync(sql, params);
      return {
        rows: {
          length: arr.length,
          item: (i: number) => arr[i],
        },
      };
    }
    if (typeof db.runAsync === 'function') {
      return await db.runAsync(sql, params);
    }
    if (typeof db.execAsync === 'function') {
      return await db.execAsync(sql);
    }
    throw new Error('Unsupported SQLite API');
  } catch (e) {
    throw e;
  }
}
