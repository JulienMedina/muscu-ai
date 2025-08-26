import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getWorkoutById, getWorkoutDetailSets, getWorkoutStats } from '@/db/history';

type Group = {
  exerciseId: string;
  name: string;
  sets: Array<{ loadKg: number | null; reps: number | null; rpe: number | null; pain: number | null; restSec: number | null }>;
};

function feedbackText(volume: number, setsCount: number, avgRpe: number | null, painSets: number): string {
  const notes: string[] = [];
  if (volume > 10000) notes.push('Séance volumineuse');
  if ((avgRpe ?? 0) > 8.5) notes.push('RPE moyen élevé → récup conseillée');
  if (painSets > 0) notes.push(`Douleur signalée sur ${painSets} set(s)`);
  if (notes.length === 0) notes.push('Séance équilibrée');
  return notes.join(' · ');
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [header, setHeader] = React.useState<{ date: string; split: string } | null>(null);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [stats, setStats] = React.useState<{ volume: number; setsCount: number; avgRpe: number | null }>({ volume: 0, setsCount: 0, avgRpe: null });

  React.useEffect(() => {
    if (!db || !id) return;
    (async () => {
      try {
        const w = await getWorkoutById(db, id);
        if (w) setHeader({ date: w.date, split: w.split });
        const s = await getWorkoutDetailSets(db, id);
        const map = new Map<string, Group>();
        let painSets = 0;
        for (const row of s) {
          const key = row.exerciseId;
          if (!map.has(key)) map.set(key, { exerciseId: row.exerciseId, name: row.name, sets: [] });
          map.get(key)!.sets.push({ loadKg: row.loadKg, reps: row.performedReps, rpe: row.actualRpe, pain: row.pain, restSec: row.restSec });
          if ((row.pain ?? 0) > 0) painSets += 1;
        }
        setGroups(Array.from(map.values()));

        const st = await getWorkoutStats(db, id);
        setStats(st);
      } catch (e) {
        console.warn('workout detail error', e);
      }
    })();
  }, [db, id]);

  const feedback = feedbackText(stats.volume, stats.setsCount, stats.avgRpe, groups.reduce((acc, g) => acc + g.sets.filter((x) => (x.pain ?? 0) > 0).length, 0));

  return (
    <ScrollView className="flex-1 bg-white p-4 dark:bg-black">
      <View className="mb-3">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{header ? `${header.date} · ${header.split}` : 'Séance'}</Text>
        <Text className="mt-1 text-sm text-gray-700 dark:text-gray-300">
          Vol: {Number(stats.volume || 0).toFixed(0)} · Sets: {stats.setsCount} · RPE moy: {stats.avgRpe != null ? Number(stats.avgRpe).toFixed(1) : '—'}
        </Text>
        <Text className="mt-1 text-xs text-amber-700 dark:text-amber-300">{feedback}</Text>
      </View>

      {groups.map((g) => (
        <View key={g.exerciseId} className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <Link href={{ pathname: '/exercise/[id]', params: { id: g.exerciseId } }} className="mb-2 text-base font-semibold text-blue-600 dark:text-blue-400">
            {g.name}
          </Link>
          {g.sets.map((s, idx) => (
            <View key={idx} className="mb-1 flex-row justify-between">
              <Text className="text-sm text-gray-900 dark:text-gray-100">{s.loadKg ?? 0} kg × {s.reps ?? 0} @RPE {s.rpe ?? 0}</Text>
              {s.pain && s.pain > 0 ? (
                <Text className="text-xs text-red-600 dark:text-red-400">Douleur {s.pain}</Text>
              ) : (
                <Text className="text-xs text-gray-500 dark:text-gray-400">Repos {s.restSec ?? 0}s</Text>
              )}
            </View>
          ))}
        </View>
      ))}

      {groups.length === 0 ? (
        <View className="items-center py-10">
          <Text className="text-gray-500 dark:text-gray-400">Aucun set pour cette séance.</Text>
        </View>
      ) : null}

      <Link href="/history" className="mt-4 text-center text-sm text-blue-600 dark:text-blue-400">Retour à l'historique</Link>
    </ScrollView>
  );
}

