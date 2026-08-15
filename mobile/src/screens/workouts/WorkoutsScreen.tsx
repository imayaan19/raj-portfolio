import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { api } from '../../api/client';
import { Header } from '../../components/Header';
import { Button, Card, Input, EmptyState, Badge } from '../../components/ui';
import { colors, spacing, font, radius } from '../../theme/theme';
import { formatDate } from '../../lib/format';

interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
}
interface Workout {
  id: string;
  name: string;
  date: string;
  notes: string | null;
  exercises: Exercise[];
}
interface Routine {
  id: string;
  name: string;
  isPreset: boolean;
  exercises: Exercise[];
}

export function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [modal, setModal] = useState(false);
  const [prefill, setPrefill] = useState<Routine | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, r] = await Promise.all([
        api.get('/workouts'),
        api.get('/workouts/routines'),
      ]);
      setWorkouts(w.data);
      setRoutines(r.data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const startFrom = (routine: Routine) => {
    setPrefill(routine);
    setModal(true);
  };

  const remove = (w: Workout) =>
    Alert.alert('Delete workout?', w.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/workouts/${w.id}`);
          load();
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Gym Tracker"
        subtitle={`${workouts.length} sessions logged`}
        color={colors.workout}
      />

      <FlatList
        data={workouts}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            <Text style={[font.h3, { marginBottom: spacing.sm }]}>
              Preset routines
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.lg }}
            >
              {routines.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  activeOpacity={0.85}
                  onPress={() => startFrom(r)}
                  style={styles.routineCard}
                >
                  <Text style={styles.routineName}>{r.name}</Text>
                  <Text style={styles.routineCount}>
                    {r.exercises.length} exercises
                  </Text>
                  {r.isPreset && (
                    <View style={{ marginTop: 8 }}>
                      <Badge text="Preset" color={colors.workout} />
                    </View>
                  )}
                  <Text style={styles.routineStart}>Start ›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[font.h3, { marginBottom: spacing.sm }]}>History</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🏋️"
            title="No workouts yet"
            subtitle="Start from a preset above or log a custom session."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} onLongPress={() => remove(item)}>
            <Card>
              <View style={styles.wHeader}>
                <Text style={font.h3}>{item.name}</Text>
                <Text style={font.small}>{formatDate(item.date)}</Text>
              </View>
              {item.exercises.map((e, i) => (
                <View key={i} style={styles.exRow}>
                  <Text style={styles.exName}>• {e.name}</Text>
                  <Text style={styles.exMeta}>
                    {e.sets ?? '-'}×{e.reps ?? '-'}
                    {e.weight ? ` @ ${e.weight}kg` : ''}
                  </Text>
                </View>
              ))}
              {item.notes ? (
                <Text style={[font.small, { marginTop: 8, fontStyle: 'italic' }]}>
                  “{item.notes}”
                </Text>
              ) : null}
            </Card>
          </TouchableOpacity>
        )}
      />

      <View style={styles.fabBar}>
        <Button
          title="+ Log workout"
          onPress={() => {
            setPrefill(null);
            setModal(true);
          }}
          color={colors.workout}
        />
      </View>

      <LogWorkoutModal
        visible={modal}
        prefill={prefill}
        onClose={() => setModal(false)}
        onSaved={load}
      />
    </View>
  );
}

function LogWorkoutModal({
  visible,
  prefill,
  onClose,
  onSaved,
}: {
  visible: boolean;
  prefill: Routine | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([{ name: '' }]);
  const [saving, setSaving] = useState(false);

  // Reset the form each time the modal opens (optionally from a preset).
  useEffect(() => {
    if (visible) {
      setName(prefill?.name ?? '');
      setNotes('');
      setExercises(
        prefill
          ? prefill.exercises.map((e) => ({ ...e }))
          : [{ name: '', sets: undefined, reps: undefined }]
      );
    }
  }, [visible, prefill]);

  const updateEx = (i: number, patch: Partial<Exercise>) =>
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const addRow = () => setExercises((prev) => [...prev, { name: '' }]);
  const removeRow = (i: number) =>
    setExercises((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    const clean = exercises.filter((e) => e.name.trim());
    if (!name.trim() || clean.length === 0) {
      Alert.alert('Add a name and at least one exercise');
      return;
    }
    setSaving(true);
    try {
      await api.post('/workouts', {
        name: name.trim(),
        notes: notes.trim() || undefined,
        exercises: clean.map((e) => ({
          name: e.name.trim(),
          sets: e.sets ? Number(e.sets) : undefined,
          reps: e.reps ? Number(e.reps) : undefined,
          weight: e.weight ? Number(e.weight) : undefined,
        })),
      });
      onClose();
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalWrap}>
        <View style={[styles.sheet, { maxHeight: '88%' }]}>
          <View style={styles.grabber} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[font.h2, { marginBottom: spacing.lg }]}>
              {prefill ? `Start: ${prefill.name}` : 'Log workout'}
            </Text>

            <Input label="Session name" placeholder="Push Day" value={name} onChangeText={setName} />

            <Text style={[font.label, { marginBottom: 8 }]}>Exercises</Text>
            {exercises.map((e, i) => (
              <View key={i} style={styles.exEditRow}>
                <Input
                  placeholder="Exercise"
                  value={e.name}
                  onChangeText={(t) => updateEx(i, { name: t })}
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <Input
                  placeholder="Sets"
                  keyboardType="numeric"
                  value={e.sets?.toString() ?? ''}
                  onChangeText={(t) => updateEx(i, { sets: t ? Number(t) : undefined })}
                  style={{ width: 56, marginBottom: 0, marginLeft: 6 }}
                />
                <Input
                  placeholder="Reps"
                  keyboardType="numeric"
                  value={e.reps?.toString() ?? ''}
                  onChangeText={(t) => updateEx(i, { reps: t ? Number(t) : undefined })}
                  style={{ width: 56, marginBottom: 0, marginLeft: 6 }}
                />
                <TouchableOpacity onPress={() => removeRow(i)} style={{ padding: 8 }}>
                  <Text style={{ color: colors.danger, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={addRow} style={{ paddingVertical: spacing.sm }}>
              <Text style={{ color: colors.workout, fontWeight: '700' }}>
                + Add exercise
              </Text>
            </TouchableOpacity>

            <Input
              label="Notes"
              placeholder="Felt strong today"
              value={notes}
              onChangeText={setNotes}
              style={{ marginTop: spacing.md }}
            />

            <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
              <Button title="Cancel" variant="ghost" color={colors.textMuted} onPress={onClose} style={{ flex: 1 }} />
              <Button title="Save" onPress={save} loading={saving} color={colors.workout} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  routineCard: {
    width: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routineName: { ...font.h3, marginBottom: 2 },
  routineCount: { ...font.small },
  routineStart: { color: colors.workout, fontWeight: '700', marginTop: spacing.md },
  wHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  exName: { ...font.body },
  exMeta: { ...font.small, color: colors.textMuted },
  exEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
});
