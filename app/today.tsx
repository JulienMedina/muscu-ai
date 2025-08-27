import React from "react";
import { View, Alert, ScrollView, Text, Switch } from "react-native";
import Animated, { Layout, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import ExerciseCard from "@/components/ExerciseCard";
import { useSQLiteContext } from "expo-sqlite";
import { runSql } from "@/db/schema";
import type { Exercise } from "@/db/types";
import SetLogModal from "@/components/SetLogModal";
import SwapExerciseModal from "@/components/SwapExerciseModal";
import { ensureWorkoutForToday, insertSet, getLastSetForToday, getLastSetHistorical, countSetsToday, type SetRow } from "@/db/sets";
import { getExercisesForWorkout, initWorkoutExercisesIfEmpty, replaceExerciseInWorkout, saveWorkoutExercisesOrder } from "@/db/workout_exercises";
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
  const [swapVisible, setSwapVisible] = React.useState<boolean>(false);
  const [swapFor, setSwapFor] = React.useState<Exercise | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const itemLayouts = React.useRef<Record<string, { y: number; height: number }>>({});
  const scrollY = React.useRef(0);
  const contentTopWindowY = React.useRef(0);
  const listContainerRef = React.useRef<View>(null);
  const dragY = useSharedValue(0);
  const dragOffset = useSharedValue(0);
  const overlayStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    transform: [{ translateY: dragY.value - dragOffset.value }],
    zIndex: 50,
    opacity: 0.98,
  }));
  const positionsRef = React.useRef<Array<{ id: string; height: number }>>([]);
  const GAP = 16; // approximate mb-4

  React.useEffect(() => {
    if (!db) return;
    (async () => {
      try {
        // Ensure workout for today (split: push)
        const wid = await ensureWorkoutForToday(db, 'push');
        setWorkoutId(wid);

        // Load persisted workout exercises; if empty, initialize with defaults
        let persisted = await getExercisesForWorkout(db, wid);
        if (persisted.length === 0) {
          const res = await runSql(
            db,
            "SELECT id, name, primary_target AS \"primary\", secondary_target AS \"secondary\", substitutions FROM exercises WHERE primary_target IN (?,?,?) LIMIT 6",
            ["pectoraux", "deltoïdes", "triceps"]
          );
          const rows: any = res.rows;
          const defaults: Exercise[] = [];
          for (let i = 0; i < rows.length; i++) defaults.push(rows.item(i));
          await initWorkoutExercisesIfEmpty(db, wid, defaults);
          persisted = await getExercisesForWorkout(db, wid);
        }
        setExercises(persisted);

        // Preload last summaries and counts
        const summaries: Record<string, string> = {};
        const counts: Record<string, number> = {};
        for (const e of persisted) {
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
    <ScrollView
      className="flex-1 bg-white p-4 dark:bg-black"
      scrollEnabled={!draggingId}
      scrollEventThrottle={16}
      onScroll={(e) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Séance du jour</Text>
        {DEBUG ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-xs text-gray-600 dark:text-gray-400">Debug</Text>
            <Switch value={showDebug} onValueChange={setShowDebug} />
          </View>
        ) : null}
      </View>
      <View ref={listContainerRef} onLayout={() => {
        try {
          listContainerRef.current?.measureInWindow?.((_x, y) => { contentTopWindowY.current = y ?? 0; });
        } catch {}
      }}>
      {exercises.map((e) => (
        <Animated.View key={e.id} layout={Layout.springify().stiffness(280).damping(22)} onLayout={(ev) => {
          const { y, height } = ev.nativeEvent.layout;
          itemLayouts.current[e.id] = { y, height };
        }} style={{ opacity: draggingId === e.id ? 0.3 : 1 }}>
        <ExerciseCard
          name={e.name}
          target={e.primary}
          lastSummary={lastSummaries[e.id]}
          setsTodayCount={setsCount[e.id]}
          debug={DEBUG && showDebug}
          onLongPress={(ev?: any) => {
            const l = itemLayouts.current[e.id];
            setDraggingId(e.id);
            const pageY = ev?.nativeEvent?.pageY ?? 0;
            const contentY = pageY - contentTopWindowY.current + scrollY.current;
            dragY.value = contentY;
            dragOffset.value = l ? (pageY - (contentTopWindowY.current + l.y)) : 0; // exact offset, no clamp
            // Snapshot current positions for stable thresholds during drag
            positionsRef.current = exercises.map((x) => ({ id: x.id, height: itemLayouts.current[x.id]?.height ?? 80 }));
          }}
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
          onSwap={() => {
            setSwapFor(e);
            setSwapVisible(true);
          }}
        />
        </Animated.View>
      ))}
      </View>
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

      <SwapExerciseModal
        visible={swapVisible}
        exerciseId={swapFor?.id ?? null}
        onCancel={() => {
          setSwapVisible(false);
          setSwapFor(null);
        }}
        onSelect={async (newEx) => {
          if (!swapFor) return;
          // Replace in visible list, keeping position
          setExercises((prev) => {
            const idx = prev.findIndex((x) => x.id === swapFor.id);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = newEx;
            return next;
          });
          // Persist replacement at same position
          try {
            if (db && workoutId) {
              const idx = exercises.findIndex((x) => x.id === swapFor.id);
              if (idx >= 0) await replaceExerciseInWorkout(db, workoutId, idx, newEx.id);
            }
          } catch (e) {
            console.warn('swap persist error', e);
          }
          // Clear session cache for old
          delete sessionCache.current[swapFor.id];
          // Preload summary and count for the new exercise
          try {
            if (db && workoutId) {
              const dayLast = await getLastSetForToday(db, workoutId, newEx.id);
              let last: SetRow | null = dayLast;
              let src: 'history' | 'day' | 'none' = 'none';
              if (dayLast) src = 'day';
              if (!last) {
                const hist = await getLastSetHistorical(db, newEx.id);
                if (hist) {
                  last = hist;
                  src = 'history';
                }
              }
              setLastSummaries((prev) => ({
                ...prev,
                [newEx.id]: last && last.loadKg != null && last.performedReps != null && last.actualRpe != null
                  ? `${last.loadKg} kg × ${last.performedReps} @RPE ${last.actualRpe}${src === 'history' ? ' (hist.)' : ''}`
                  : prev[newEx.id],
              }));
              const c = await countSetsToday(db, workoutId, newEx.id);
              setSetsCount((prev) => ({ ...prev, [newEx.id]: c }));
            }
          } catch (e) {
            console.warn('swap preload error', e);
          }
          setSwapVisible(false);
          setSwapFor(null);
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

      {draggingId ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 16, right: 16, top: 0, bottom: 0 }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderMove={(ev) => {
            const pageY = (ev as any).nativeEvent?.pageY ?? 0;
            const contentY = pageY - contentTopWindowY.current + scrollY.current;
            dragY.value = contentY;
            const fromIndex = exercises.findIndex((x) => x.id === draggingId);
            if (fromIndex === -1) return;
            // Compute target using stable snapshot of positions
            let yAcc = 0;
            let targetIndex = 0;
            for (let i = 0; i < positionsRef.current.length; i++) {
              const h = positionsRef.current[i].height;
              const center = yAcc + h / 2;
              if (contentY < center) { targetIndex = i; break; }
              targetIndex = i;
              yAcc += h + GAP;
            }
            if (targetIndex !== fromIndex) {
              setExercises((prev) => {
                const arr = [...prev];
                const [moved] = arr.splice(fromIndex, 1);
                arr.splice(targetIndex, 0, moved);
                return arr;
              });
              // Mirror the move in positions snapshot
              const pos = positionsRef.current;
              const [m] = pos.splice(fromIndex, 1);
              pos.splice(targetIndex, 0, m);
            }
          }}
          onResponderRelease={async () => {
            const finalOrder = exercises.map((x) => x.id);
            const wid = workoutId;
            setDraggingId(null);
            try {
              if (db && wid) await saveWorkoutExercisesOrder(db, wid, finalOrder);
            } catch (e) {
              console.warn('persist order error', e);
            }
          }}
        >
          {(() => {
            const item = exercises.find((x) => x.id === draggingId);
            if (!item) return null;
            return (
              <Animated.View style={overlayStyle}>
                <ExerciseCard
                  name={item.name}
                  target={item.primary}
                  lastSummary={lastSummaries[item.id]}
                  setsTodayCount={setsCount[item.id]}
                  debug={false}
                  onLog={() => {}}
                  onSwap={() => {}}
                />
              </Animated.View>
            );
          })()}
        </View>
      ) : null}
    </ScrollView>
  );
}
