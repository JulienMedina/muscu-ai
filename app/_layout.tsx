import React from 'react';
import 'react-native-reanimated';
import { SafeAreaView } from 'react-native';
import { Slot } from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Slot />
    </SafeAreaView>
  );
}
