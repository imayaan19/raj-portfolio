import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import { GoogleButton } from '../../components/GoogleButton';
import { colors, spacing, font, radius } from '../../theme/theme';

export function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={{ fontSize: 34 }}>🎓</Text>
          </View>
          <Text style={styles.brand}>Campus Companion</Text>
          <Text style={styles.tag}>
            Expenses · Gym · Feedback · Case Pre-Reads
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[font.h2, { marginBottom: spacing.lg }]}>
            Welcome back
          </Text>

          <Input
            label="Email"
            placeholder="you@college.edu"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button title="Sign in" onPress={onSubmit} loading={loading} />

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.or}>or</Text>
            <View style={styles.line} />
          </View>

          <GoogleButton />

          <TouchableOpacity
            style={{ marginTop: spacing.xl, alignItems: 'center' }}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={{ color: colors.textMuted }}>
              New here?{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                Create an account
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brand: { fontSize: 26, fontWeight: '800', color: colors.white },
  tag: { color: 'rgba(255,255,255,0.85)', marginTop: 6, fontSize: 13 },
  form: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: spacing.md, color: colors.textFaint, fontSize: 13 },
});
