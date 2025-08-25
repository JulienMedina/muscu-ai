import '@/global.css';
import 'react-native-reanimated';
import React from 'react';
import { SafeAreaView } from 'react-native';
import { Slot } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { useDB } from '@/db/useDB';

export default function RootLayout() {
  const { ready, error } = useDB();

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }} className="items-center justify-center bg-white dark:bg-black">
          <ActivityIndicator />
          {error ? <Text className="mt-3 text-red-600">{String(error)}</Text> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Slot />
    </SafeAreaView>
  );
}
