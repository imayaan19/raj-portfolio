import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, font, shadow } from '../theme/theme';

// ── Screen wrapper ──────────────────────────────────────
export function Screen({
  children,
  scroll,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Body
        style={[{ flex: scroll ? undefined : 1 }, style]}
        contentContainerStyle={scroll ? { padding: spacing.lg, paddingBottom: 48 } : undefined}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Body>
    </SafeAreaView>
  );
}

// ── Card ────────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  if (onPress)
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  return content;
}

// ── Button ──────────────────────────────────────────────
export function Button({
  title,
  onPress,
  loading,
  variant = 'primary',
  color,
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const accent = color || colors.primary;
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        isPrimary && { backgroundColor: accent },
        isOutline && { borderWidth: 1.5, borderColor: accent, backgroundColor: 'transparent' },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : accent} />
      ) : (
        <Text
          style={[
            styles.btnText,
            { color: isPrimary ? colors.white : accent },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Input ───────────────────────────────────────────────
export function Input({
  label,
  style,
  ...props
}: TextInputProps & { label?: string; style?: ViewStyle }) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

// ── Section header ──────────────────────────────────────
export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={font.h3}>{children}</Text>
      {action}
    </View>
  );
}

// ── Chip / Pill ─────────────────────────────────────────
export function Chip({
  label,
  active,
  color = colors.primary,
  onPress,
}: {
  label: string;
  active?: boolean;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: color }
          : { backgroundColor: colors.primarySoft },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? colors.white : color },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Badge ───────────────────────────────────────────────
export function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

// ── Empty state ─────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 44 }}>{icon}</Text>
      <Text style={[font.h3, { marginTop: spacing.sm }]}>{title}</Text>
      {subtitle ? (
        <Text style={[font.small, { textAlign: 'center', marginTop: 4 }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  btn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  inputLabel: { ...font.label, marginBottom: 6 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: spacing.xl,
  },
});
