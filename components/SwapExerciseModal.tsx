import React from 'react';
import { Modal, View, Text, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Exercise } from '@/db/types';
import { runSql } from '@/db/schema';

type Props = {
  visible: boolean;
  exerciseId: string | null;
  onCancel: () => void;
  onSelect: (exercise: Exercise) => void;
};

export default function SwapExerciseModal({ visible, exerciseId, onCancel, onSelect }: Props) {
  const db = useSQLiteContext();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
  const [loading, setLoading] = React.useState<boolean>(false);
  const [search, setSearch] = React.useState<string>('');
  const [current, setCurrent] = React.useState<Exercise | null>(null);
  const [suggestions, setSuggestions] = React.useState<Exercise[]>([]);
  const [searchResults, setSearchResults] = React.useState<Exercise[]>([]);

  React.useEffect(() => {
    if (!db || !exerciseId || !visible) return;
    (async () => {
      try {
        setLoading(true);
        // Load current exercise
        const res = await runSql(
          db,
          'SELECT id, name, primary_target AS "primary", secondary_target AS "secondary", substitutions FROM exercises WHERE id = ? LIMIT 1',
          [exerciseId]
        );
        const rows: any = res.rows;
        if (!rows || rows.length === 0) {
          setCurrent(null);
          setSuggestions([]);
          setLoading(false);
          return;
        }
        const cur: Exercise = rows.item(0);
        setCurrent(cur);

        let list: Exercise[] = [];
        let ids: string[] = [];
        try {
          ids = cur.substitutions ? (JSON.parse(cur.substitutions) as string[]) : [];
        } catch {
          ids = [];
        }
        if (ids.length > 0) {
          const qMarks = ids.map(() => '?').join(',');
          const subRes = await runSql(
            db,
            `SELECT id, name, primary_target AS "primary", secondary_target AS "secondary", substitutions FROM exercises WHERE id IN (${qMarks})`,
            ids
          );
          const sRows: any = subRes.rows;
          for (let i = 0; i < sRows.length; i++) list.push(sRows.item(i));
        }

        // Fallback: same primary target
        if (list.length === 0) {
          const fbRes = await runSql(
            db,
            'SELECT id, name, primary_target AS "primary", secondary_target AS "secondary", substitutions FROM exercises WHERE primary_target = ? AND id <> ? LIMIT 12',
            [cur.primary, cur.id]
          );
          const fRows: any = fbRes.rows;
          for (let i = 0; i < fRows.length; i++) list.push(fRows.item(i));
        }

        // Ensure uniqueness and exclude current id
        const map = new Map<string, Exercise>();
        for (const e of list) {
          if (e.id !== cur.id && !map.has(e.id)) map.set(e.id, e);
        }
        setSuggestions(Array.from(map.values()));
      } catch (e) {
        console.warn('swap modal load error', e);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [db, exerciseId, visible]);

  // Global search across all exercises when query length >= 2
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = search.trim();
      if (!db || !visible || !current || q.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        setLoading(true);
        const like = `%${q}%`;
        const res = await runSql(
          db,
          `SELECT id, name, primary_target AS "primary", secondary_target AS "secondary", substitutions
           FROM exercises
           WHERE (name LIKE ? OR primary_target LIKE ? OR secondary_target LIKE ?)
             AND id <> ?
           LIMIT 20`,
          [like, like, like, current.id]
        );
        if (cancelled) return;
        const rows: any = res.rows;
        const list: Exercise[] = [];
        for (let i = 0; i < rows.length; i++) list.push(rows.item(i));
        setSearchResults(list);
      } catch (e) {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, search, visible, current]);

  const listToShow = search.trim().length >= 2 ? searchResults : suggestions;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-end bg-black/40">
        <View className="w-full rounded-t-2xl bg-white p-4 dark:bg-gray-900">
          <Text className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">Remplacer l'exercice</Text>
          <Text className="mb-3 text-xs text-gray-600 dark:text-gray-400">{current?.name ?? '—'}</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une alternative…"
            placeholderTextColor={placeholderColor}
            className="mb-3 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-700 dark:text-gray-100"
          />

          {loading ? (
            <View className="py-6 items-center">
              <ActivityIndicator />
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {listToShow.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => onSelect(e)}
                  className="mb-2 rounded-xl border border-gray-200 bg-white p-3 active:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:active:bg-gray-800"
                >
                  <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">{e.name}</Text>
                  <Text className="text-[11px] text-gray-500 dark:text-gray-400">{e.primary}{e.secondary ? ` · ${e.secondary}` : ''}</Text>
                </Pressable>
              ))}

              {listToShow.length === 0 && (
                <Text className="py-6 text-center text-gray-500 dark:text-gray-400">Aucune suggestion.</Text>
              )}
            </ScrollView>
          )}

          <View className="mt-2 flex-row justify-end">
            <Pressable onPress={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700">
              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">Fermer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
