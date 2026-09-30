import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../lib/auth';
import { supabase, lincomError } from '../../lib/supabase';
import { colors, radius } from '../../lib/theme';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Inhaber',
  admin: 'Admin',
  planner: 'Dienstplanung',
  hr: 'Personal',
  accounting: 'Buchhaltung',
  employee: 'Mitarbeiter',
};

export default function Account() {
  const { session, currentMembership, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setFullName(data?.full_name || ''));
  }, [session]);

  async function saveName() {
    setErr('');
    setMsg('');
    setSavingName(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', session!.user.id);
      if (error) throw error;
      setMsg('Name gespeichert.');
    } catch (e) {
      setErr(lincomError(e));
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword() {
    setErr('');
    setMsg('');
    if (newPassword.length < 8) {
      setErr('Das Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setMsg('Passwort geändert.');
    } catch (e) {
      setErr(lincomError(e));
    } finally {
      setSavingPw(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Ausloggen', 'Möchtest du dich wirklich ausloggen?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Ausloggen', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.email}>{session?.user.email}</Text>
        {currentMembership && (
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>{ROLE_LABEL[currentMembership.role] || currentMembership.role}</Text>
          </View>
        )}
      </View>

      {!!err && <Text style={styles.error}>{err}</Text>}
      {!!msg && <Text style={styles.ok}>{msg}</Text>}

      <Text style={styles.sectionTitle}>Name</Text>
      <View style={styles.row}>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Dein Name" placeholderTextColor={colors.ink3} />
        <Pressable style={styles.smallBtn} onPress={saveName} disabled={savingName}>
          {savingName ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.smallBtnText}>Speichern</Text>}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Passwort ändern</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Neues Passwort"
          placeholderTextColor={colors.ink3}
          secureTextEntry
        />
        <Pressable style={styles.smallBtn} onPress={savePassword} disabled={savingPw}>
          {savingPw ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.smallBtnText}>Ändern</Text>}
        </Pressable>
      </View>

      <Pressable style={styles.logoutBtn} onPress={confirmLogout}>
        <Text style={styles.logoutText}>Ausloggen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40, backgroundColor: colors.bg },
  card: { backgroundColor: colors.sidebar, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 20, gap: 8 },
  email: { fontSize: 15, fontWeight: '700', color: colors.ink },
  roleTag: { alignSelf: 'flex-start', backgroundColor: colors.hover, borderRadius: radius.sm, paddingVertical: 3, paddingHorizontal: 8 },
  roleTagText: { fontSize: 11.5, color: colors.ink2, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 8, marginTop: 6 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: '#fff',
  },
  smallBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14 },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  error: { color: colors.danger, fontSize: 12.5, marginBottom: 10 },
  ok: { color: colors.good, fontSize: 12.5, marginBottom: 10 },
  logoutBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 24 },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
