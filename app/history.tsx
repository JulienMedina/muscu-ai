import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Link, router } from 'expo-router';
import { getWorkoutsWithStats } from '@/db/history';

function pad2(n: number) { return n < 10 ? `0${n}` : String(n); }
function todayLocalISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(dateStr: string, delta: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof getWorkoutsWithStats>>>([]);
  const [start, setStart] = React.useState<string>(() => addDays(todayLocalISODate(), -30));
  const [end, setEnd] = React.useState<string>(() => todayLocalISODate());

  async function loadRange(s: string, e: string) {
    if (!db) return;
    try {
      const list = await getWorkoutsWithStats(db, s, e);
      setItems(list);
    } catch (e) {
      console.warn('history load error', e);
    }
  }

  React.useEffect(() => { loadRange(start, end); }, [db, start, end]);

  return (
    <ScrollView className="flex-1 bg-white p-4 dark:bg-black">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Historique</Text>
        <Pressable
          onPress={() => {
            // Charger 30 jours supplémentaires
            setStart((prev) => addDays(prev, -30));
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700"
        >
          <Text className="text-xs text-gray-900 dark:text-gray-100">Charger +30j</Text>
        </Pressable>
      </View>

      {items.map((w) => (
        <Pressable
          key={w.id}
          onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}
          className="mb-3 rounded-xl border border-gray-200 bg-white p-4 active:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:active:bg-gray-800"
        >
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{w.date}</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">{w.split}</Text>
          </View>
          <View className="flex-row gap-4">
            <Text className="text-xs text-gray-700 dark:text-gray-300">Vol: {Number(w.volume || 0).toFixed(0)} kg·reps</Text>
            <Text className="text-xs text-gray-700 dark:text-gray-300">Sets: {w.setsCount}</Text>
            <Text className="text-xs text-gray-700 dark:text-gray-300">RPE moyen: {w.avgRpe != null ? Number(w.avgRpe).toFixed(1) : '—'}</Text>
          </View>
        </Pressable>
      ))}

      {items.length === 0 ? (
        <View className="items-center py-10">
          <Text className="text-gray-500 dark:text-gray-400">Aucune séance sur la période.</Text>
        </View>
      ) : null}

      <View className="mt-6 items-center">
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
