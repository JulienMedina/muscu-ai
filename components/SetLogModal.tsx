import React from 'react';
import { Modal, View, Text, TextInput, Pressable } from 'react-native';

type Props = {
  visible: boolean;
  title?: string;
  exerciseName?: string;
  defaultLoadKg?: number;
  defaultReps?: number;
  defaultRpe?: number;
  defaultPain?: number;
  defaultRestSec?: number;
  onCancel: () => void;
  onSave: (data: {
    loadKg: number;
    reps: number;
    rpe: number;
    pain: number;
    restSec: number;
  }) => void;
};

export default function SetLogModal({
  visible,
  title = 'Log série',
  exerciseName,
  defaultLoadKg = 50,
  defaultReps = 10,
  defaultRpe = 8,
  defaultPain = 0,
  defaultRestSec = 120,
  onCancel,
  onSave,
}: Props) {
  const [load, setLoad] = React.useState<string>(String(defaultLoadKg));
  const [reps, setReps] = React.useState<string>(String(defaultReps));
  const [rpe, setRpe] = React.useState<string>(String(defaultRpe));
  const [pain, setPain] = React.useState<string>(String(defaultPain));
  const [rest, setRest] = React.useState<string>(String(defaultRestSec));
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    if (visible) {
      setLoad(String(defaultLoadKg));
      setReps(String(defaultReps));
      setRpe(String(defaultRpe));
      setPain(String(defaultPain));
      setRest(String(defaultRestSec));
      setError('');
    }
  }, [visible, defaultLoadKg, defaultReps, defaultRpe, defaultPain, defaultRestSec]);

  function handleSave() {
    const loadNum = Number(load);
    const repsNum = Number(reps);
    const rpeNum = Number(rpe);
    const painNum = Number(pain);
    const restNum = Number(rest);

    if (
      Number.isNaN(loadNum) ||
      Number.isNaN(repsNum) ||
      Number.isNaN(rpeNum) ||
      Number.isNaN(painNum) ||
      Number.isNaN(restNum)
    ) {
      setError('Veuillez saisir des valeurs numériques.');
      return;
    }
    if (rpeNum < 1 || rpeNum > 10) {
      setError('RPE doit être entre 1 et 10.');
      return;
    }
    if (painNum < 0 || painNum > 3) {
      setError('Douleur doit être entre 0 et 3.');
      return;
    }
    if (repsNum <= 0 || repsNum > 50) {
      setError('Répétitions entre 1 et 50.');
      return;
    }
    if (loadNum < 0 || loadNum > 2000) {
      setError('Charge invalide.');
      return;
    }
    if (restNum < 0 || restNum > 1800) {
      setError('Repos invalide.');
      return;
    }

    setError('');
    onSave({ loadKg: loadNum, reps: repsNum, rpe: rpeNum, pain: painNum, restSec: restNum });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-end bg-black/40">
        <View className="w-full rounded-t-2xl bg-white p-4 dark:bg-gray-900">
          <Text className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</Text>
          {exerciseName ? (
            <Text className="mb-3 text-sm text-gray-600 dark:text-gray-400">{exerciseName}</Text>
          ) : null}

          <View className="mb-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">Charge (kg)</Text>
              <TextInput
                value={load}
                onChangeText={setLoad}
                keyboardType="decimal-pad"
                placeholder="kg"
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-700 dark:text-gray-100"
              />
            </View>
            <View className="w-24">
              <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">Rép.</Text>
              <TextInput
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                placeholder="10"
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-700 dark:text-gray-100"
              />
            </View>
          </View>

          <View className="mb-3 flex-row gap-3">
            <View className="w-24">
              <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">RPE (1-10)</Text>
              <TextInput
                value={rpe}
                onChangeText={setRpe}
                keyboardType="decimal-pad"
                placeholder="8"
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-700 dark:text-gray-100"
              />
            </View>
            <View className="w-24">
              <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">Douleur (0-3)</Text>
              <TextInput
                value={pain}
                onChangeText={setPain}
                keyboardType="number-pad"
                placeholder="0"
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-700 dark:text-gray-100"
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-xs text-gray-500 dark:text-gray-400">Repos (sec)</Text>
              <TextInput
                value={rest}
                onChangeText={setRest}
                keyboardType="number-pad"
                placeholder="120"
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 dark:border-gray-700 dark:text-gray-100"
              />
            </View>
          </View>

          {error ? (
            <Text className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</Text>
          ) : null}

          <View className="mt-1 flex-row justify-end gap-3">
            <Pressable
              onPress={onCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-700"
            >
              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">Annuler</Text>
            </Pressable>
            <Pressable onPress={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 active:bg-blue-700">
              <Text className="text-sm font-medium text-white">Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

