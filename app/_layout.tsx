import React from 'react';
import 'react-native-reanimated';
import '@/global.css';
import { SafeAreaView } from 'react-native';
import { Slot } from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Slot />
    </SafeAreaView>
  );
}
