import React from "react";
import { View, Alert, ScrollView, Text } from "react-native";
import ExerciseCard from "@/components/ExerciseCard";

export default function TodayScreen() {
  return (
    <ScrollView className="flex-1 bg-white p-4 dark:bg-black">
      <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">Séance du jour</Text>
      <ExerciseCard
        name="Développé couché"
        target="Pectoraux"
        onLog={() => Alert.alert("Log", "Développé couché enregistré")}
        onSwap={() => Alert.alert("Remplacer", "Proposer une alternative au développé couché")}
      />
      <ExerciseCard
        name="Squat"
        target="Jambes"
        onLog={() => Alert.alert("Log", "Squat enregistré")}
        onSwap={() => Alert.alert("Remplacer", "Proposer une alternative au squat")}
      />
    </ScrollView>
  );
}

