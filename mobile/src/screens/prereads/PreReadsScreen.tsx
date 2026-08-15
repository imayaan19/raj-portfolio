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
  TextInput,
  RefreshControl,
} from 'react-native';
import { api } from '../../api/client';
import { Header } from '../../components/Header';
import { Button, Card, Input, EmptyState } from '../../components/ui';
import { colors, spacing, font, radius } from '../../theme/theme';
import { formatDate } from '../../lib/format';

interface PreRead {
  id: string;
  title: string;
  source: string | null;
  keyProblems: string | null;
  coreAnalysis: string | null;
  actionableTakeaways: string | null;
  createdAt: string;
}

export function PreReadsScreen() {
  const [items, setItems] = useState<PreRead[]>([]);
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<PreRead | 'new' | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (q = '') => {
      try {
        const { data } = await api.get(`/prereads${q ? `?q=${encodeURIComponent(q)}` : ''}`);
        setItems(data);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    },
    []
  );

  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(query);
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Case Pre-Reads"
        subtitle={`${items.length} cases in your knowledge base`}
        color={colors.preread}
      />

      <View style={styles.searchWrap}>
        <TextInput
          placeholder="🔍  Search cases…"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📚"
            title={query ? 'No matches' : 'No pre-reads yet'}
            subtitle={
              query
                ? 'Try a different search term.'
                : 'Add structured case notes to build your knowledge base.'
            }
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => setEditor(item)}>
            <Text style={font.h3} numberOfLines={2}>
              {item.title}
            </Text>
            {item.source ? (
              <Text style={[font.small, { marginTop: 2 }]}>{item.source}</Text>
            ) : null}
            {item.coreAnalysis ? (
              <Text
                style={[font.body, { color: colors.textMuted, marginTop: spacing.sm }]}
                numberOfLines={2}
              >
                {item.coreAnalysis}
              </Text>
            ) : null}
            <View style={styles.cardFoot}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {item.actionableTakeaways ? '✓ Takeaways' : 'Draft'}
                </Text>
              </View>
              <Text style={font.small}>{formatDate(item.createdAt)}</Text>
            </View>
          </Card>
        )}
      />

      <View style={styles.fabBar}>
        <Button
          title="+ New pre-read"
          onPress={() => setEditor('new')}
          color={colors.preread}
        />
      </View>

      {editor && (
        <PreReadEditor
          record={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={() => load(query)}
        />
      )}
    </View>
  );
}

const FIELDS: {
  key: keyof PreRead;
  label: string;
  placeholder: string;
  big?: boolean;
}[] = [
  { key: 'title', label: 'Title', placeholder: 'e.g. Zappos: Delivering Happiness' },
  { key: 'source', label: 'Source', placeholder: 'HBR / Prof. handout / textbook ch. 4' },
  { key: 'keyProblems', label: 'Key Problems', placeholder: 'Central dilemmas the case poses…', big: true },
  { key: 'coreAnalysis', label: 'Core Analysis', placeholder: 'Frameworks, data, your reasoning…', big: true },
  { key: 'actionableTakeaways', label: 'Actionable Takeaways', placeholder: 'What you would do / lessons…', big: true },
];

function PreReadEditor({
  record,
  onClose,
  onSaved,
}: {
  record: PreRead | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<PreRead>>(record ?? { title: '' });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof PreRead, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const save = async () => {
    if (!form.title?.trim()) {
      Alert.alert('Title is required');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title?.trim(),
      source: form.source || undefined,
      keyProblems: form.keyProblems || undefined,
      coreAnalysis: form.coreAnalysis || undefined,
      actionableTakeaways: form.actionableTakeaways || undefined,
    };
    try {
      if (record) await api.patch(`/prereads/${record.id}`, payload);
      else await api.post('/prereads', payload);
      onClose();
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert('Delete this pre-read?', form.title ?? '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (record) await api.delete(`/prereads/${record.id}`);
          onClose();
          onSaved();
        },
      },
    ]);

  return (
    <Modal visible animationType="slide">
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.editorHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.white, fontSize: 16 }}>Close</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.white, fontWeight: '700', fontSize: 16 }}>
            {record ? 'Edit case' : 'New case'}
          </Text>
          {record ? (
            <TouchableOpacity onPress={remove}>
              <Text style={{ color: colors.white, fontSize: 16 }}>Delete</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 48 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {FIELDS.map((f) => (
            <View key={f.key} style={{ marginBottom: spacing.md }}>
              <Text style={[font.label, { marginBottom: 6 }]}>{f.label}</Text>
              <TextInput
                placeholder={f.placeholder}
                placeholderTextColor={colors.textFaint}
                value={(form[f.key] as string) ?? ''}
                onChangeText={(t) => set(f.key, t)}
                multiline={f.big}
                style={[styles.field, f.big && styles.fieldBig]}
              />
            </View>
          ))}

          <Button
            title="Save case"
            onPress={save}
            loading={saving}
            color={colors.preread}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, marginTop: -18 },
  search: {
    height: 46,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  tag: {
    backgroundColor: `${colors.preread}18`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tagText: { color: colors.preread, fontSize: 11, fontWeight: '700' },
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
  editorHeader: {
    backgroundColor: colors.preread,
    paddingTop: 56,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  fieldBig: { minHeight: 90, textAlignVertical: 'top' },
});
