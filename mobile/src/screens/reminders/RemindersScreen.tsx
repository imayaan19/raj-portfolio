import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { api } from '../../api/client';
import { Header } from '../../components/Header';
import {
  Button,
  Card,
  Chip,
  Badge,
  Input,
  EmptyState,
} from '../../components/ui';
import { colors, spacing, font, radius } from '../../theme/theme';
import { formatDate, relativeDue } from '../../lib/format';
import {
  registerForPushNotifications,
  scheduleReminderNotification,
  cancelReminderNotification,
  notifyNow,
} from '../../lib/notifications';

interface Reminder {
  id: string;
  title: string;
  course: string | null;
  sender: string | null;
  dueDate: string | null;
  source: 'manual' | 'gmail';
  status: 'pending' | 'done';
}

type Filter = 'pending' | 'done' | 'all';

export function RemindersScreen() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/reminders');
      setItems(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }, []);

  useEffect(() => {
    load();
    registerForPushNotifications();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const syncGmail = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/gmail/sync');
      await load();
      await notifyNow(
        '📥 Gmail synced',
        `${data.created} new, ${data.updated} updated from ${data.scanned} emails.`
      );
      Alert.alert(
        'Gmail synced',
        `Scanned ${data.scanned} emails · ${data.created} new reminders added.`
      );
    } catch (e: any) {
      Alert.alert(
        'Sync failed',
        e.message.includes('not connected')
          ? 'Connect your Gmail in the Settings tab first.'
          : e.message
      );
    } finally {
      setSyncing(false);
    }
  };

  const toggle = async (r: Reminder) => {
    const next = r.status === 'pending' ? 'done' : 'pending';
    setItems((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, status: next } : x))
    );
    try {
      await api.patch(`/reminders/${r.id}`, { status: next });
      if (next === 'done') await cancelReminderNotification(r.id);
      else if (r.dueDate)
        await scheduleReminderNotification(r.id, r.title, new Date(r.dueDate));
    } catch (e: any) {
      Alert.alert('Error', e.message);
      load();
    }
  };

  const remove = (r: Reminder) => {
    Alert.alert('Delete reminder?', r.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/reminders/${r.id}`);
          await cancelReminderNotification(r.id);
          load();
        },
      },
    ]);
  };

  const visible = items.filter((r) =>
    filter === 'all' ? true : r.status === filter
  );
  const pendingCount = items.filter((r) => r.status === 'pending').length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Faculty Feedback"
        subtitle={`${pendingCount} pending · auto-synced from Gmail`}
        color={colors.reminder}
      />

      <View style={styles.toolbar}>
        <View style={{ flexDirection: 'row' }}>
          {(['pending', 'done', 'all'] as Filter[]).map((f) => (
            <Chip
              key={f}
              label={f[0].toUpperCase() + f.slice(1)}
              active={filter === f}
              color={colors.reminder}
              onPress={() => setFilter(f)}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="🎓"
            title="No reminders yet"
            subtitle="Sync your Gmail or add one manually to get started."
          />
        }
        renderItem={({ item }) => {
          const due = relativeDue(item.dueDate);
          const done = item.status === 'done';
          return (
            <Card>
              <View style={styles.rowTop}>
                <TouchableOpacity
                  onPress={() => toggle(item)}
                  style={[
                    styles.checkbox,
                    done && { backgroundColor: colors.success, borderColor: colors.success },
                  ]}
                >
                  {done && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      font.h3,
                      done && {
                        textDecorationLine: 'line-through',
                        color: colors.textFaint,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <View style={styles.metaRow}>
                    {item.course ? (
                      <Badge text={item.course} color={colors.reminder} />
                    ) : null}
                    <Badge
                      text={item.source === 'gmail' ? '✉️ Gmail' : '✍️ Manual'}
                      color={
                        item.source === 'gmail' ? colors.primary : colors.textMuted
                      }
                    />
                  </View>
                  {item.sender ? (
                    <Text style={[font.small, { marginTop: 6 }]}>
                      From {item.sender}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => remove(item)}>
                  <Text style={{ color: colors.textFaint, fontSize: 18 }}>⋯</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dueRow}>
                <Text style={font.small}>{formatDate(item.dueDate)}</Text>
                {!done && (
                  <Text
                    style={[
                      styles.dueTag,
                      { color: due.overdue ? colors.danger : colors.reminder },
                    ]}
                  >
                    {due.label}
                  </Text>
                )}
              </View>
            </Card>
          );
        }}
      />

      {/* Floating actions */}
      <View style={styles.fabBar}>
        <Button
          title={syncing ? 'Syncing…' : '↻ Sync Gmail'}
          onPress={syncGmail}
          loading={syncing}
          variant="outline"
          color={colors.reminder}
          style={{ flex: 1, marginRight: spacing.sm }}
        />
        <Button
          title="+ Add"
          onPress={() => setModal(true)}
          color={colors.reminder}
          style={{ flex: 1 }}
        />
      </View>

      <AddReminderModal
        visible={modal}
        onClose={() => setModal(false)}
        onCreated={load}
      />
    </View>
  );
}

function AddReminderModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [sender, setSender] = useState('');
  const [due, setDue] = useState(''); // YYYY-MM-DD
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setCourse('');
    setSender('');
    setDue('');
  };

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Title required');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/reminders', {
        title: title.trim(),
        course: course.trim() || undefined,
        sender: sender.trim() || undefined,
        dueDate: due.trim() || undefined,
      });
      if (data.dueDate)
        await scheduleReminderNotification(
          data.id,
          data.title,
          new Date(data.dueDate)
        );
      reset();
      onClose();
      onCreated();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalWrap}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={[font.h2, { marginBottom: spacing.lg }]}>
            New reminder
          </Text>
          <Input label="Title" placeholder="Course feedback form" value={title} onChangeText={setTitle} />
          <Input label="Course" placeholder="MKT101" value={course} onChangeText={setCourse} />
          <Input label="Faculty / sender" placeholder="Prof. Rao" value={sender} onChangeText={setSender} />
          <Input
            label="Due date (YYYY-MM-DD)"
            placeholder="2026-08-20"
            value={due}
            onChangeText={setDue}
            autoCapitalize="none"
          />
          <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
            <Button
              title="Cancel"
              variant="ghost"
              color={colors.textMuted}
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <Button
              title="Save"
              onPress={save}
              loading={saving}
              color={colors.reminder}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: colors.white, fontWeight: '900', fontSize: 14 },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  dueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dueTag: { fontSize: 13, fontWeight: '700' },
  fabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
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
