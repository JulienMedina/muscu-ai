import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function IndexScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-white p-6 dark:bg-black">
      <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Athletica</Text>
      <View className="w-full max-w-sm gap-3">
        <Link
          href="/today"
          className="rounded-xl bg-blue-600 px-4 py-3 text-center text-white active:bg-blue-700"
        >
          Aujourd'hui
        </Link>
        <Link
          href="/history"
          className="rounded-xl border border-gray-300 px-4 py-3 text-center text-gray-900 dark:border-gray-700 dark:text-gray-100"
        >
          Historique
        </Link>
      </View>
    </View>
  );
}

