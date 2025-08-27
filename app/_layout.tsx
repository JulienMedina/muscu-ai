import '@/global.css';
import 'react-native-reanimated';
import React, { Suspense } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { Slot } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { migrateDbIfNeeded } from '@/db/schema';
import { seedExercises } from '@/db/seed';

async function onInit(db: any) {
  await migrateDbIfNeeded(db);
  await seedExercises(db);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const bg = Colors[colorScheme ?? 'light'].background;
  React.useEffect(() => {
    // Assure un fond natif uniforme (Android nav bar, etc.)
    setBackgroundColorAsync(bg).catch(() => {});
  }, [bg]);
  return (
    <SafeAreaProvider>
      <Suspense
        fallback={
          <SafeAreaView edges={['top','bottom']} style={{ flex: 1, backgroundColor: bg }}>
            <View style={{ flex: 1 }} className="items-center justify-center bg-white dark:bg-black">
              <ActivityIndicator />
              <Text className="mt-3 text-gray-600 dark:text-gray-300">Initialisation de la base…</Text>
            </View>
          </SafeAreaView>
        }
      >
        <SQLiteProvider databaseName="muscuai.db" onInit={onInit} useSuspense>
          <SafeAreaView edges={['top','bottom']} style={{ flex: 1, backgroundColor: bg }}>
            <Slot />
          </SafeAreaView>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
