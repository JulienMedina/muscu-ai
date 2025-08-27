import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  remainingSec: number;
  totalSec: number;
  running: boolean;
  onToggle: () => void;
  onCancel: () => void;
  onPlus30: () => void;
  onMinimize?: () => void;
};

export default function RestTimer({ remainingSec, totalSec, running, onToggle, onCancel, onPlus30, onMinimize }: Props) {
  const insets = useSafeAreaInsets();
  const ratio = Math.max(0, Math.min(1, remainingSec / Math.max(1, totalSec)));
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const label = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(12, insets.bottom + 8), zIndex: 50 }}
      className="rounded-2xl border border-gray-300 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <View className="mb-2 h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-800">
        <View style={{ width: `${ratio * 100}%` }} className="h-full bg-blue-600" />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">Repos {label}</Text>
        <View className="flex-row gap-2">
          {onMinimize ? (
            <Pressable onPress={onMinimize} className="rounded-lg border border-gray-300 px-3 py-1 dark:border-gray-700">
              <Text className="text-sm text-gray-900 dark:text-gray-100">Min</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onPlus30} className="rounded-lg border border-gray-300 px-3 py-1 dark:border-gray-700">
            <Text className="text-sm text-gray-900 dark:text-gray-100">+30s</Text>
          </Pressable>
          <Pressable onPress={onToggle} className="rounded-lg border border-gray-300 px-3 py-1 dark:border-gray-700">
            <Text className="text-sm text-gray-900 dark:text-gray-100">{running ? 'Pause' : 'Reprendre'}</Text>
          </Pressable>
          <Pressable onPress={onCancel} className="rounded-lg bg-red-600 px-3 py-1 active:bg-red-700">
            <Text className="text-sm text-white">Stop</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type CompactProps = {
  remainingSec: number;
  totalSec: number;
  running: boolean;
  onToggle: () => void;
  onCancel: () => void;
  onExpand: () => void;
};

export function RestTimerCompact({ remainingSec, totalSec, running, onToggle, onCancel, onExpand }: CompactProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const label = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const ratio = Math.max(0, Math.min(1, remainingSec / Math.max(1, totalSec)));
  return (
    <View style={{ position: 'absolute', right: 12, top: Math.max(12, insets.top + 6), zIndex: 60 }}>
      <Pressable
        onPress={onExpand}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le minuteur"
        className="rounded-full border border-gray-300 bg-white px-3 py-1 shadow-md dark:border-gray-600 dark:bg-gray-900"
        android_ripple={{ color: '#ccc', borderless: true }}
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</Text>
          <Pressable onPress={(e) => { e.stopPropagation?.(); onToggle(); }} className="rounded px-1 py-0.5" hitSlop={8} accessibilityRole="button">
            <Text className="text-sm text-blue-600 dark:text-blue-400">{running ? 'Pause' : 'Play'}</Text>
          </Pressable>
          <Pressable onPress={(e) => { e.stopPropagation?.(); onCancel(); }} className="rounded px-1 py-0.5" hitSlop={8} accessibilityRole="button">
            <Text className="text-sm text-red-600 dark:text-red-400">Stop</Text>
          </Pressable>
          <Ionicons name="chevron-down" size={16} color={scheme === 'dark' ? palette.text : palette.text} />
        </View>
        <View className="mt-1 h-1 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-800">
          <View style={{ width: `${ratio * 100}%` }} className="h-full bg-blue-600" />
        </View>
      </Pressable>
    </View>
  );
}
