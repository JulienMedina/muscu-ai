import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getExerciseOverview } from '@/db/history';

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

export default function ExerciseOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const [title, setTitle] = React.useState<string>('Exercice');
  const [data, setData] = React.useState<Awaited<ReturnType<typeof getExerciseOverview>> | null>(null);
  const [range, setRange] = React.useState<{ start: string; end: string }>(() => ({ start: addDays(todayLocalISODate(), -30), end: todayLocalISODate() }));

  React.useEffect(() => {
    if (!db || !id) return;
    (async () => {
      try {
        // Title from exercises
        const res = await (await import('@/db/schema')).runSql(db, 'SELECT name FROM exercises WHERE id = ? LIMIT 1', [id]);
        const rows: any = res.rows;
        if (rows && rows.length > 0) setTitle(rows.item(0).name as string);
        const overview = await getExerciseOverview(db, id, range.start, range.end);
        setData(overview);
      } catch (e) {
        console.warn('exercise overview error', e);
      }
    })();
  }, [db, id, range.start, range.end]);

  const trendText = data?.rpeTrend
    ? data.rpeTrend.trend === 'up'
      ? `RPE en hausse (${data.rpeTrend.recentAvg.toFixed(1)} vs ${data.rpeTrend.prevAvg.toFixed(1)})`
      : data.rpeTrend.trend === 'down'
        ? `RPE en baisse (${data.rpeTrend.recentAvg.toFixed(1)} vs ${data.rpeTrend.prevAvg.toFixed(1)})`
        : `RPE stable (${data.rpeTrend.recentAvg.toFixed(1)})`
    : 'RPE insuffisant';

  return (
    <ScrollView className="flex-1 bg-white p-4 dark:bg-black">
      <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</Text>

      <View className="mt-3 flex-row gap-3">
        <View className="flex-1 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <Text className="text-xs text-gray-500 dark:text-gray-400">PR</Text>
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data?.pr ? `${Number(data.pr.loadKg).toFixed(1)} × ${data.pr.reps}` : '—'}</Text>
          <Text className="text-[10px] text-gray-500 dark:text-gray-400">{data?.pr?.date ?? ''}</Text>
        </View>
        <View className="flex-1 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <Text className="text-xs text-gray-500 dark:text-gray-400">Dernière</Text>
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data?.last ? `${Number(data.last.loadKg).toFixed(1)} × ${data.last.reps} @RPE ${data.last.rpe}` : '—'}</Text>
          <Text className="text-[10px] text-gray-500 dark:text-gray-400">{data?.last?.date ?? ''}</Text>
        </View>
        <View className="flex-1 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <Text className="text-xs text-gray-500 dark:text-gray-400">Volume 30j</Text>
          <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">{data ? Number(data.volume30d).toFixed(0) : '—'}</Text>
          <Text className="text-[10px] text-gray-500 dark:text-gray-400">kg·reps</Text>
        </View>
      </View>

      <View className="mt-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <Text className="text-xs text-gray-500 dark:text-gray-400">Tendance</Text>
        <Text className="text-sm text-gray-900 dark:text-gray-100">{trendText}</Text>
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Dernières occurrences</Text>
        {data?.occurrences?.map((o, idx) => (
          <View key={idx} className="mb-2 flex-row justify-between">
            <Text className="text-sm text-gray-900 dark:text-gray-100">{o.date}</Text>
            <Text className="text-sm text-gray-900 dark:text-gray-100">{Number(o.loadKg).toFixed(1)} × {o.reps} @RPE {o.rpe}</Text>
          </View>
        ))}
        {(!data || data.occurrences.length === 0) && (
          <Text className="text-gray-500 dark:text-gray-400">Aucune donnée.</Text>
        )}
      </View>

      <Link href="/history" className="mt-6 text-center text-sm text-blue-600 dark:text-blue-400">Retour à l'historique</Link>
    </ScrollView>
  );
}

