import React from "react";
import { View, Alert, ScrollView, Text } from "react-native";
import ExerciseCard from "@/components/ExerciseCard";
import { useSQLiteContext } from "expo-sqlite";
import { runSql } from "@/db/schema";
import type { Exercise } from "@/db/types";

export default function TodayScreen() {
  const db = useSQLiteContext();
  const [exercises, setExercises] = React.useState<Exercise[]>([]);

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
      } catch (e) {
        console.warn("load exercises error", e);
      }
    })();
  }, [db]);

  return (
    <ScrollView className="flex-1 bg-white p-4 dark:bg-black">
      <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Séance du jour</Text>
      {exercises.map((e) => (
        <ExerciseCard
          key={e.id}
          name={e.name}
          target={e.primary}
          onLog={() => Alert.alert("Log", `${e.name} enregistré`)}
          onSwap={() => Alert.alert("Remplacer", `Proposer une alternative à ${e.name}`)}
        />
      ))}
      {exercises.length === 0 ? (
        <View className="items-center py-10">
          <Text className="text-gray-500 dark:text-gray-400">Aucun exercice push trouvé.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
