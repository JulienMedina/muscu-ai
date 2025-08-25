import '@/global.css';
import 'react-native-reanimated';
import React, { Suspense } from 'react';
import { SafeAreaView } from 'react-native';
import { Slot } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '@/db/schema';
import { seedExercises } from '@/db/seed';

async function onInit(db: any) {
  await migrateDbIfNeeded(db);
  await seedExercises(db);
}

export default function RootLayout() {
  return (
    <Suspense
      fallback={
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1 }} className="items-center justify-center bg-white dark:bg-black">
            <ActivityIndicator />
            <Text className="mt-3 text-gray-600 dark:text-gray-300">Initialisation de la base…</Text>
          </View>
        </SafeAreaView>
      }
    >
      <SQLiteProvider databaseName="muscuai.db" onInit={onInit} useSuspense>
        <SafeAreaView style={{ flex: 1 }}>
          <Slot />
        </SafeAreaView>
      </SQLiteProvider>
    </Suspense>
  );
}
