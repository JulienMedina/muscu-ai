import React from "react";
import { View, Text, Pressable } from "react-native";

type Props = {
  name: string;
  target: string;
  onLog: () => void;
  onSwap: () => void;
  lastSummary?: string;
  setsTodayCount?: number;
  debug?: boolean;
  onLongPress?: (e?: any) => void;
};

export default function ExerciseCard({ name, target, onLog, onSwap, lastSummary, setsTodayCount, debug, onLongPress }: Props) {
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={250} className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">{name}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">{target}</Text>
      </View>
      {lastSummary ? (
        <Text className="mb-3 text-xs text-gray-600 dark:text-gray-400">Dernier : {lastSummary}</Text>
      ) : null}
      {debug && typeof setsTodayCount === 'number' ? (
        <Text className="-mt-2 mb-3 text-[10px] text-gray-400">{setsTodayCount} sets aujourd'hui</Text>
      ) : null}
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
    </Pressable>
  );
}
