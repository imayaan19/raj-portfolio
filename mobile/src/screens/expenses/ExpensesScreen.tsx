import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { api } from '../../api/client';
import { Header } from '../../components/Header';
import { Button, Card, Chip, Input, EmptyState } from '../../components/ui';
import { colors, spacing, font, radius } from '../../theme/theme';
import { formatMoney, formatDate, monthKey, monthLabel } from '../../lib/format';

interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  date: string;
}
interface Summary {
  month: string;
  total: number;
  byCategory: { category: string; total: number }[];
}

const CATEGORIES = [
  { name: 'Food', icon: '🍔' },
  { name: 'Transport', icon: '🚌' },
  { name: 'Books', icon: '📖' },
  { name: 'Rent', icon: '🏠' },
  { name: 'Fun', icon: '🎉' },
  { name: 'Other', icon: '🧾' },
];
const catIcon = (c: string) =>
  CATEGORIES.find((x) => x.name === c)?.icon ?? '🧾';

export function ExpensesScreen() {
  const [month] = useState(monthKey());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [modal, setModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, s] = await Promise.all([
        api.get(`/expenses?month=${month}`),
        api.get(`/expenses/summary?month=${month}`),
      ]);
      setExpenses(e.data);
      setSummary(s.data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const remove = (e: Expense) =>
    Alert.alert('Delete expense?', `${e.category} · ${formatMoney(e.amount)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/expenses/${e.id}`);
          load();
        },
      },
    ]);

  const maxCat = Math.max(1, ...(summary?.byCategory.map((c) => c.total) ?? [1]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title="Expenses"
        subtitle={monthLabel(month)}
        color={colors.expense}
      />

      <FlatList
        data={expenses}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Total card */}
            <Card style={{ backgroundColor: colors.expense }}>
              <Text style={styles.totalLabel}>Spent this month</Text>
              <Text style={styles.totalValue}>
                {formatMoney(summary?.total ?? 0)}
              </Text>
              <Text style={styles.totalSub}>
                {expenses.length} transactions
              </Text>
            </Card>

            {/* Category breakdown */}
            {summary && summary.byCategory.length > 0 && (
              <Card>
                <Text style={[font.h3, { marginBottom: spacing.md }]}>
                  By category
                </Text>
                {summary.byCategory
                  .sort((a, b) => b.total - a.total)
                  .map((c) => (
                    <View key={c.category} style={{ marginBottom: spacing.md }}>
                      <View style={styles.catRow}>
                        <Text style={font.body}>
                          {catIcon(c.category)} {c.category}
                        </Text>
                        <Text style={{ fontWeight: '700', color: colors.text }}>
                          {formatMoney(c.total)}
                        </Text>
                      </View>
                      <View style={styles.barBg}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${(c.total / maxCat) * 100}%` },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
              </Card>
            )}

            <Text style={[font.h3, { marginTop: spacing.sm, marginBottom: spacing.sm }]}>
              Transactions
            </Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="💰"
            title="No expenses yet"
            subtitle="Tap “Add expense” to log your first one."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => remove(item)} activeOpacity={0.7}>
            <Card style={styles.txn}>
              <Text style={{ fontSize: 26, marginRight: spacing.md }}>
                {catIcon(item.category)}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={font.h3}>{item.category}</Text>
                <Text style={font.small}>
                  {item.note ? `${item.note} · ` : ''}
                  {formatDate(item.date)}
                </Text>
              </View>
              <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />

      <View style={styles.fabBar}>
        <Button
          title="+ Add expense"
          onPress={() => setModal(true)}
          color={colors.expense}
        />
      </View>

      <AddExpenseModal
        visible={modal}
        onClose={() => setModal(false)}
        onCreated={load}
      />
    </View>
  );
}

function AddExpenseModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      Alert.alert('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await api.post('/expenses', { amount: value, category, note: note.trim() || undefined });
      setAmount('');
      setNote('');
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
          <Text style={[font.h2, { marginBottom: spacing.lg }]}>Add expense</Text>

          <Input
            label="Amount (₹)"
            placeholder="250"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={[font.label, { marginBottom: 8 }]}>Category</Text>
          <View style={styles.catWrap}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.name}
                label={`${c.icon} ${c.name}`}
                active={category === c.name}
                color={colors.expense}
                onPress={() => setCategory(c.name)}
              />
            ))}
          </View>

          <Input
            label="Note (optional)"
            placeholder="Lunch with friends"
            value={note}
            onChangeText={setNote}
            style={{ marginTop: spacing.md }}
          />

          <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
            <Button title="Cancel" variant="ghost" color={colors.textMuted} onPress={onClose} style={{ flex: 1 }} />
            <Button title="Save" onPress={save} loading={saving} color={colors.expense} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  totalValue: { color: colors.white, fontSize: 40, fontWeight: '800', marginVertical: 4 },
  totalSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.expense },
  txn: { flexDirection: 'row', alignItems: 'center' },
  amount: { fontSize: 16, fontWeight: '800', color: colors.text },
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
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
