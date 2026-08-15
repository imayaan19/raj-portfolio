import React from 'react';
import { Text } from 'react-native';

// Emoji-based tab icons keep the app dependency-light (no icon font setup).
const ICONS: Record<string, string> = {
  Reminders: '🎓',
  Expenses: '💰',
  Gym: '🏋️',
  'Pre-Reads': '📚',
  Settings: '⚙️',
};

export function TabIcon({
  route,
  focused,
}: {
  route: string;
  color: string;
  focused: boolean;
}) {
  return (
    <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.7 }}>
      {ICONS[route] ?? '•'}
    </Text>
  );
}
