import React from "react";
import { View, Text, Pressable } from "react-native";

type Props = {
  name: string;
  target: string;
  onLog: () => void;
  onSwap: () => void;
};

export default function ExerciseCard({ name, target, onLog, onSwap }: Props) {
  return (
    <View className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">{name}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">{target}</Text>
      </View>
      <View className="flex-row gap-3">
        <Pressable
          onPress={onLog}
          className="rounded-lg bg-blue-600 px-4 py-2 active:bg-blue-700"
        >
          <Text className="text-sm font-medium text-white">Log</Text>
        </Pressable>
        <Pressable
          onPress={onSwap}
          className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700"
        >
          <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">Remplacer</Text>
        </Pressable>
      </View>
    </View>
  );
}

