import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Redirect } from 'expo-router';
import { supabase, lincomError } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { colors, radius } from '../lib/theme';

type Mode = 'signin' | 'signup' | 'sent';

export default function Login() {
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!loading && session) return <Redirect href="/" />;

  async function submit() {
    setError('');
    if (!email || !password) {
      setError('Bitte E-Mail-Adresse und Passwort eingeben.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setMode('sent');
      }
    } catch (e) {
      setError(lincomError(e));
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'sent') {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>Lincom</Text>
        <Text style={styles.title}>Fast geschafft</Text>
        <Text style={styles.sub}>
          Wir haben dir eine Bestätigungs-E-Mail an {email} geschickt. Öffne den Link darin, um dein Konto zu
          aktivieren.
        </Text>
        <Pressable onPress={() => setMode('signin')} style={styles.linkBtn}>
          <Text style={styles.link}>Zurück zur Anmeldung</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View style={styles.center}>
        <Text style={styles.brand}>Lincom</Text>
        <Text style={styles.title}>{mode === 'signin' ? 'Anmelden' : 'Konto erstellen'}</Text>

        <TextInput
          style={styles.input}
          placeholder="E-Mail-Adresse"
          placeholderTextColor={colors.ink3}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Passwort"
          placeholderTextColor={colors.ink3}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.btn} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{mode === 'signin' ? 'Anmelden' : 'Registrieren'}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={styles.linkBtn}>
          <Text style={styles.link}>
            {mode === 'signin' ? 'Noch kein Konto? Jetzt registrieren' : 'Schon ein Konto? Anmelden'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  brand: { fontSize: 22, fontWeight: '800', color: colors.accent, marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 20 },
  sub: { fontSize: 14, color: colors.ink2, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  input: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  btn: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  linkBtn: { marginTop: 18 },
  link: { color: colors.accent, fontSize: 14, fontWeight: '600' },
});
