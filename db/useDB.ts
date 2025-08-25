import * as SQLite from "expo-sqlite";
import React from "react";
import { Platform } from "react-native";
import { initDb } from "./schema";
import { seedExercises } from "./seed";

type UseDBResult = {
  db: any | null;
  ready: boolean;
  error: any | null;
};

export function useDB(): UseDBResult {
  // IMPORTANT : API callbacks (pas openDatabaseSync)
  const db = React.useMemo(() => {
    if (Platform.OS === "web") return null; // on ignore la DB côté web pour l’instant
    try {
             return SQLite.openDatabaseSync("muscuai.db");
    } catch {
      return null;
    }
  }, []);

  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<any | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (Platform.OS === "web") {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        if (!db) {
          if (!cancelled) setError(new Error("DB unavailable"));
          if (!cancelled) setReady(true);
          return;
        }
        await initDb(db);        // utilise db.transaction/executeSql (callbacks)
        await seedExercises(db); // idem
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);
  if (__DEV__) {
    console.log("Platform:", Platform.OS);
         console.log("Has openDatabaseSync:", typeof SQLite.openDatabaseSync === "function");
    console.log("DB is null?", db === null);
  }
  

  return { db, ready, error };
}
