import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Button, Card } from '../components/ui';
import { colors, spacing, font, radius } from '../theme/theme';
import { formatDate } from '../lib/format';

interface GmailStatus {
  connected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
}

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [connecting, setConnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/gmail/status');
      setStatus(data);
    } catch {
      setStatus({ connected: false, email: null, lastSyncedAt: null });
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const connectGmail = async () => {
    setConnecting(true);
    try {
      const { data } = await api.get('/gmail/connect');
      // Open Google's consent screen in the system browser.
      const result = await WebBrowser.openAuthSessionAsync(data.url);
      if (result.type === 'success' || result.type === 'dismiss') {
        await loadStatus();
      }
    } catch (e: any) {
      Alert.alert(
        'Could not start Gmail connection',
        e.message.includes('not configured')
          ? 'The backend needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set.'
          : e.message
      );
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () =>
    Alert.alert('Disconnect Gmail?', 'Synced reminders stay, but no new emails will be pulled.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await api.delete('/gmail/disconnect');
          loadStatus();
        },
      },
    ]);

  const initials = (user?.name ?? user?.email ?? '?')
    .split(/[\s@]/)[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Settings" subtitle="Account & integrations" color={colors.primary} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {/* Profile */}
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={font.h3}>{user?.name ?? 'Student'}</Text>
            <Text style={font.small}>{user?.email}</Text>
          </View>
        </Card>

        {/* Gmail integration */}
        <Text style={[font.h3, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          Gmail integration
        </Text>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 30, marginRight: spacing.md }}>✉️</Text>
            <View style={{ flex: 1 }}>
              <Text style={font.h3}>
                {status?.connected ? 'Connected' : 'Not connected'}
              </Text>
              <Text style={font.small}>
                {status?.connected
                  ? status.email ?? 'College inbox linked'
                  : 'Link your college Gmail to auto-pull feedback tasks'}
              </Text>
            </View>
            <View
              style={[
                styles.dot,
                { backgroundColor: status?.connected ? colors.success : colors.textFaint },
              ]}
            />
          </View>

          {status?.connected && status.lastSyncedAt && (
            <Text style={[font.small, { marginTop: spacing.md }]}>
              Last synced: {formatDate(status.lastSyncedAt)}
            </Text>
          )}

          <View style={{ marginTop: spacing.lg }}>
            {status?.connected ? (
              <Button
                title="Disconnect Gmail"
                variant="outline"
                color={colors.danger}
                onPress={disconnect}
              />
            ) : (
              <Button
                title={connecting ? 'Opening…' : 'Connect Gmail'}
                onPress={connectGmail}
                loading={connecting}
              />
            )}
          </View>
        </Card>

        <Text style={[font.small, { marginTop: spacing.sm, lineHeight: 18 }]}>
          Campus Companion searches your inbox for keywords like “feedback”,
          “evaluation”, “survey” and “deadline”, then extracts the course, sender
          and due date into your Faculty Feedback list. Read-only access.
        </Text>

        {/* About */}
        <Text style={[font.h3, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          About
        </Text>
        <Card>
          <Row label="Version" value="1.0.0" />
          <Row label="Backend" value="Node + Prisma + Postgres" />
          <Row label="Sync" value="Cloud (JWT secured)" last />
        </Card>

        <Button
          title="Sign out"
          variant="outline"
          color={colors.danger}
          onPress={signOut}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <Text style={font.body}>{label}</Text>
      <Text style={[font.body, { color: colors.textMuted }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
});
