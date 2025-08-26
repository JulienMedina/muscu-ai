import React from "react";
import { View, Alert, ScrollView, Text, Switch } from "react-native";
import ExerciseCard from "@/components/ExerciseCard";
import { useSQLiteContext } from "expo-sqlite";
import { runSql } from "@/db/schema";
import type { Exercise } from "@/db/types";
import SetLogModal from "@/components/SetLogModal";
import { ensureWorkoutForToday, insertSet, getLastSetForToday, getLastSetHistorical, countSetsToday, type SetRow } from "@/db/sets";
import { recommendNextLoad } from "@/logic/rpe";
import { Link } from "expo-router";

export default function TodayScreen() {
  const db = useSQLiteContext();
  const [exercises, setExercises] = React.useState<Exercise[]>([]);
  const [workoutId, setWorkoutId] = React.useState<string | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [selected, setSelected] = React.useState<Exercise | null>(null);
  const [defaults, setDefaults] = React.useState<{ loadKg: number; reps: number; rpe: number; restSec: number } | null>(null);
  const [lastSummaries, setLastSummaries] = React.useState<Record<string, string>>({});
  const [setsCount, setSetsCount] = React.useState<Record<string, number>>({});
  const sessionCache = React.useRef<Record<string, { loadKg: number; reps: number; rpe: number; restSec: number; source: string; lastSet?: SetRow }>>({});
  const DEBUG = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  const [showDebug, setShowDebug] = React.useState<boolean>(DEBUG);

  React.useEffect(() => {
    if (!db) return;
    (async () => {
      try {
        const res = await runSql(
          db,
          "SELECT id, name, primary_target AS \"primary\", secondary_target AS \"secondary\", substitutions FROM exercises WHERE primary_target IN (?,?,?) LIMIT 6",
          ["pectoraux", "deltoïdes", "triceps"]
        );
        const rows: any = res.rows;
        const list: Exercise[] = [];
        for (let i = 0; i < rows.length; i++) {
          list.push(rows.item(i));
        }
        setExercises(list);

        // Ensure workout for today (split: push)
        const wid = await ensureWorkoutForToday(db, 'push');
        setWorkoutId(wid);

        // Preload last summaries and counts
        const summaries: Record<string, string> = {};
        const counts: Record<string, number> = {};
        for (const e of list) {
          const dayLast = await getLastSetForToday(db, wid, e.id);
          let src: 'day' | 'history' | 'none' = 'none';
          let last: SetRow | null = dayLast;
          if (dayLast) src = 'day';
          if (!last) {
            const hist = await getLastSetHistorical(db, e.id);
            if (hist) {
              last = hist;
              src = 'history';
            }
          }
          if (last && last.loadKg != null && last.performedReps != null && last.actualRpe != null) {
            summaries[e.id] = `${last.loadKg} kg × ${last.performedReps} @RPE ${last.actualRpe}${src === 'history' ? ' (hist.)' : ''}`;
          }
          const c = await countSetsToday(db, wid, e.id);
          counts[e.id] = c;
        }
        setLastSummaries(summaries);
        setSetsCount(counts);
      } catch (e) {
        console.warn("load exercises error", e);
      }
    })();
  }, [db]);

  return (
    <ScrollView className="flex-1 bg-white p-4 dark:bg-black">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Séance du jour</Text>
        {DEBUG ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-gray-600 dark:text-gray-400">Debug</Text>
            <Switch value={showDebug} onValueChange={setShowDebug} />
          </View>
        ) : null}
      </View>
      {exercises.map((e) => (
        <ExerciseCard
          key={e.id}
          name={e.name}
          target={e.primary}
          lastSummary={lastSummaries[e.id]}
          setsTodayCount={setsCount[e.id]}
          debug={DEBUG && showDebug}
          onLog={async () => {
            setSelected(e);
            // Prefill strategy: session cache -> last of day -> history -> defaults
            let source = 'défaut';
            let values: { loadKg: number; reps: number; rpe: number; restSec: number } = {
              loadKg: 50,
              reps: 10,
              rpe: 8,
              restSec: 120,
            };
            const cached = sessionCache.current[e.id];
            if (cached) {
              values = { loadKg: cached.loadKg, reps: cached.reps, rpe: cached.rpe, restSec: cached.restSec };
              source = 'cache séance';
            } else if (db && workoutId) {
              const dayLast = await getLastSetForToday(db, workoutId, e.id);
              if (dayLast && dayLast.loadKg != null && dayLast.performedReps != null && dayLast.actualRpe != null) {
                const rec = recommendNextLoad(dayLast.loadKg, 8, dayLast.actualRpe ?? 8);
                values = {
                  loadKg: rec.nextLoad,
                  reps: dayLast.performedReps ?? 10,
                  rpe: dayLast.actualRpe ?? 8,
                  restSec: dayLast.restSec ?? 120,
                };
                source = 'dernier du jour';
              } else {
                const hist = await getLastSetHistorical(db, e.id);
                if (hist && hist.loadKg != null && hist.performedReps != null && hist.actualRpe != null) {
                  const rec = recommendNextLoad(hist.loadKg, 8, hist.actualRpe ?? 8);
                  values = {
                    loadKg: rec.nextLoad,
                    reps: hist.performedReps ?? 10,
                    rpe: hist.actualRpe ?? 8,
                    restSec: hist.restSec ?? 120,
                  };
                  source = 'historique';
                }
              }
            }
            if (DEBUG && showDebug) console.log(`[prefill] ${e.id} via ${source}`, values);
            setDefaults(values);
            setModalVisible(true);
          }}
          onSwap={() => Alert.alert("Remplacer", `Proposer une alternative à ${e.name} (bientôt)`)}
        />
      ))}
      {exercises.length === 0 ? (
        <View className="items-center py-10">
          <Text className="text-gray-500 dark:text-gray-400">Aucun exercice push trouvé.</Text>
        </View>
      ) : null}

      <SetLogModal
        visible={modalVisible}
        exerciseName={selected?.name}
        defaultLoadKg={defaults?.loadKg ?? 50}
        defaultReps={defaults?.reps ?? 10}
        defaultRpe={defaults?.rpe ?? 8}
        defaultPain={0}
        defaultRestSec={defaults?.restSec ?? 120}
        onCancel={() => {
          setModalVisible(false);
          setSelected(null);
          setDefaults(null);
        }}
        onSave={async ({ loadKg, reps, rpe, pain, restSec }) => {
          try {
            if (!db) throw new Error('DB non initialisée');
            const wid = workoutId ?? (await ensureWorkoutForToday(db, 'push'));
            if (!selected) throw new Error('Aucun exercice sélectionné');
            // Constantes de cible pour V1
            const targetReps = 10;
            const targetRpe = 8;
            await insertSet(db, {
              workoutId: wid,
              exerciseId: selected.id,
              targetReps,
              targetRpe,
              performedReps: reps,
              actualRpe: rpe,
              loadKg,
              pain,
              restSec,
            });

            const rec = recommendNextLoad(loadKg, targetRpe, rpe);
            Alert.alert(
              'Série enregistrée',
              `Prochaine charge: ${rec.nextLoad.toFixed(1)} kg\n${rec.note}`
            );

            // Update session cache for immediate continuity
            sessionCache.current[selected.id] = {
              loadKg: rec.nextLoad,
              reps,
              rpe,
              restSec,
              source: 'cache séance',
              lastSet: {
                id: 'last',
                workoutId: wid,
                exerciseId: selected.id,
                targetReps,
                targetRpe,
                performedReps: reps,
                actualRpe: rpe,
                loadKg,
                pain,
                restSec,
              },
            };
            // Update summary and count immediately
            setLastSummaries((prev) => ({
              ...prev,
              [selected.id]: `${loadKg} kg × ${reps} @RPE ${rpe}`,
            }));
            setSetsCount((prev) => ({
              ...prev,
              [selected.id]: (prev[selected.id] ?? 0) + 1,
            }));
          } catch (err: any) {
            Alert.alert('Erreur', err?.message ?? 'Enregistrement impossible');
          } finally {
            setModalVisible(false);
            setSelected(null);
            setDefaults(null);
          }
        }}
      />

      <View className="mt-6 items-center pb-6">
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-900 dark:border-gray-700 dark:text-gray-100"
        >
          Retour à l'accueil
        </Link>
      </View>
    </ScrollView>
  );
}
