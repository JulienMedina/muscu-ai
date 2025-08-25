// Pas besoin d'openDatabaseSync ici
export async function initDb(db: any): Promise<void> {
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
      restSec INT
    );`
  );
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
  const isSelect = /^\s*select/i.test(sql);
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
