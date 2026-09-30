import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Redirect } from 'expo-router';
import { supabase, lincomError } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { colors, radius } from '../lib/theme';

type Tab = 'create' | 'search' | 'code';
type SearchRow = { id: string; name: string; industry: string | null };

export default function Onboarding() {
  const { memberships, refreshMemberships, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('search');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  // Firma erstellen
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');

  // Firma suchen
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchRow[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Beitritt per Code
  const [code, setCode] = useState('');

  useEffect(() => {
    let alive = true;
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data, error: err } = await supabase.rpc('search_companies', { q: query.trim() });
      if (alive && !err) setResults((data as SearchRow[]) || []);
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  // Bereits vorhandene eigene Anfragen laden, um "angefragt" korrekt anzuzeigen
  useEffect(() => {
    function load() {
      supabase.rpc('my_join_requests').then(({ data }) => {
        if (Array.isArray(data)) {
          setPendingIds(new Set(data.filter((r: any) => r.status === 'pending').map((r: any) => r.company_id)));
        }
      });
    }
    load();
    // Alle 15s prüfen, ob eine Anfrage inzwischen angenommen wurde
    const iv = setInterval(() => {
      load();
      refreshMemberships();
    }, 15000);
    return () => clearInterval(iv);
  }, [refreshMemberships]);

  if (memberships.length > 0) return <Redirect href="/(app)" />;

  async function createCompany() {
    setError('');
    setBusy(true);
    try {
      const { error: err } = await supabase.rpc('create_company', {
        p_name: name.trim(),
        p_industry: industry.trim() || null,
      });
      if (err) throw err;
      await refreshMemberships();
    } catch (e) {
      setError(lincomError(e));
    } finally {
      setBusy(false);
    }
  }

  async function requestJoin(companyId: string) {
    setError('');
    setOk('');
    setBusy(true);
    try {
      const { error: err } = await supabase.rpc('request_join', { p_company: companyId });
      if (err) throw err;
      setPendingIds((s) => new Set(s).add(companyId));
      setOk('Beitrittsanfrage gesendet. Sobald sie angenommen wird, siehst du die Firma hier automatisch.');
    } catch (e) {
      setError(lincomError(e));
    } finally {
      setBusy(false);
    }
  }

  async function joinByCode() {
    setError('');
    setOk('');
    setBusy(true);
    try {
      const { error: err } = await supabase.rpc('request_join_by_code', { p_code: code.trim() });
      if (err) throw err;
      setOk('Beitrittsanfrage gesendet. Sobald sie angenommen wird, siehst du die Firma hier automatisch.');
      setCode('');
    } catch (e) {
      setError(lincomError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.brand}>Lincom</Text>
      <Text style={styles.title}>Firma beitreten oder erstellen</Text>
      <Text style={styles.sub}>Du bist angemeldet, aber noch in keiner Firma. Suche deine Firma, tritt per Code bei oder lege eine neue an.</Text>

      <View style={styles.seg}>
        {(['search', 'code', 'create'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segBtnActive]}>
            <Text style={[styles.segText, tab === t && styles.segTextActive]}>
              {t === 'search' ? 'Suchen' : t === 'code' ? 'Per Code' : 'Neu anlegen'}
            </Text>
          </Pressable>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!ok && <Text style={styles.ok}>{ok}</Text>}

      {tab === 'search' && (
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Firmenname (mind. 3 Zeichen)"
            placeholderTextColor={colors.ink3}
            value={query}
            onChangeText={setQuery}
          />
          {results.map((r) => (
            <View key={r.id} style={styles.resultRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{r.name}</Text>
                {!!r.industry && <Text style={styles.resultSub}>{r.industry}</Text>}
              </View>
              {pendingIds.has(r.id) ? (
                <Text style={styles.pending}>Angefragt</Text>
              ) : (
                <Pressable style={styles.smallBtn} onPress={() => requestJoin(r.id)} disabled={busy}>
                  <Text style={styles.smallBtnText}>Beitreten</Text>
                </Pressable>
              )}
            </View>
          ))}
          {query.trim().length >= 3 && results.length === 0 && (
            <Text style={styles.hint}>Keine durchsuchbare Firma mit diesem Namen gefunden.</Text>
          )}
        </View>
      )}

      {tab === 'code' && (
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Firmencode (von deiner Geschäftsführung)"
            placeholderTextColor={colors.ink3}
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
          />
          <Pressable style={styles.btn} onPress={joinByCode} disabled={busy || code.trim().length === 0}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Anfrage senden</Text>}
          </Pressable>
        </View>
      )}

      {tab === 'create' && (
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Firmenname"
            placeholderTextColor={colors.ink3}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Branche (optional)"
            placeholderTextColor={colors.ink3}
            value={industry}
            onChangeText={setIndustry}
          />
          <Pressable style={styles.btn} onPress={createCompany} disabled={busy || name.trim().length < 2}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Firma anlegen</Text>}
          </Pressable>
        </View>
      )}

      <Pressable onPress={signOut} style={styles.linkBtn}>
        <Text style={styles.link}>Ausloggen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 64, backgroundColor: colors.bg },
  brand: { fontSize: 20, fontWeight: '800', color: colors.accent, marginBottom: 16 },
  title: { fontSize: 19, fontWeight: '700', color: colors.ink, marginBottom: 6, textAlign: 'center' },
  sub: { fontSize: 13, color: colors.ink2, textAlign: 'center', marginBottom: 20, maxWidth: 360, lineHeight: 19 },
  seg: { flexDirection: 'row', backgroundColor: colors.hover, borderRadius: radius.md, padding: 3, marginBottom: 16 },
  segBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.sm },
  segBtnActive: { backgroundColor: '#fff' },
  segText: { fontSize: 13, color: colors.ink2, fontWeight: '600' },
  segTextActive: { color: colors.ink },
  card: { width: '100%', maxWidth: 380 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  btn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 10, textAlign: 'center' },
  ok: { color: colors.good, fontSize: 13, marginBottom: 10, textAlign: 'center', maxWidth: 340 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  resultName: { fontSize: 14, fontWeight: '600', color: colors.ink },
  resultSub: { fontSize: 12, color: colors.ink3 },
  smallBtn: { backgroundColor: colors.active, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 10 },
  smallBtnText: { color: colors.accent, fontWeight: '700', fontSize: 12 },
  pending: { color: colors.ink3, fontSize: 12, fontStyle: 'italic' },
  hint: { color: colors.ink3, fontSize: 13, textAlign: 'center', marginTop: 8 },
  linkBtn: { marginTop: 24 },
  link: { color: colors.ink3, fontSize: 13 },
});
