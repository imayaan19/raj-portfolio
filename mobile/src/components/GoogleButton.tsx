import React, { useEffect } from 'react';
import { Alert, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme/theme';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

// "Continue with Google" — uses expo-auth-session and posts the ID token
// to the backend, which verifies it and issues our own JWT.
export function GoogleButton() {
  const { signInWithGoogle } = useAuth();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params.id_token;
      if (idToken) {
        signInWithGoogle(idToken).catch((e) =>
          Alert.alert('Google sign-in failed', e.message)
        );
      }
    }
  }, [response, signInWithGoogle]);

  const onPress = () => {
    if (!CLIENT_ID) {
      Alert.alert(
        'Google Sign-In not configured',
        'Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in mobile/.env to enable this. You can still use email sign-in.'
      );
      return;
    }
    promptAsync();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.btn}
      onPress={onPress}
      disabled={!request && !!CLIENT_ID}
    >
      <View style={styles.g}>
        <Text style={styles.gText}>G</Text>
      </View>
      <Text style={styles.label}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  g: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  gText: { color: '#4285F4', fontWeight: '900', fontSize: 16 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text },
});
