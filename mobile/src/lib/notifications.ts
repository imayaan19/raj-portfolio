import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Foreground behaviour: show a banner + sound.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Feedback Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  return true;
}

// Schedule a local notification for a reminder's due date (defaults to 9am that day).
export async function scheduleReminderNotification(
  id: string,
  title: string,
  dueDate: Date
) {
  const fireAt = new Date(dueDate);
  fireAt.setHours(9, 0, 0, 0);
  if (fireAt.getTime() <= Date.now()) return; // don't schedule in the past

  await Notifications.scheduleNotificationAsync({
    identifier: `reminder-${id}`,
    content: {
      title: '🎓 Feedback due',
      body: title,
      data: { reminderId: id },
    },
    trigger: fireAt,
  });
}

export async function cancelReminderNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(`reminder-${id}`).catch(
    () => null
  );
}

// Fire an immediate confirmation (used after Gmail sync).
export async function notifyNow(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
