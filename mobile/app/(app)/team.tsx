import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { colors, radius } from '../../lib/theme';
import {
  fetchCompany,
  fetchMembers,
  fetchJoinRequests,
  decideJoinRequest,
  leaveCompany,
  CompanyInfo,
  MemberRow,
  JoinRequestRow,
} from '../../lib/team';

const ROLE_LABEL: Record<string, string> = {
  owner: 'Inhaber',
  admin: 'Admin',
  planner: 'Dienstplanung',
  hr: 'Personal',
  accounting: 'Buchhaltung',
  employee: 'Mitarbeiter',
};

export default function Team() {
  const { currentCompanyId, currentMembership, session, memberships, setCurrentCompanyId, refreshMemberships } =
    useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [requests, setRequests] = useState<JoinRequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canManage = currentMembership && ['owner', 'admin', 'hr'].includes(currentMembership.role);

  const load = useCallback(async () => {
    if (!currentCompanyId) return;
    const [c, m] = await Promise.all([fetchCompany(currentCompanyId), fetchMembers(currentCompanyId)]);
    setCompany(c);
    setMembers(m);
    if (canManage) setRequests(await fetchJoinRequests(currentCompanyId));
    else setRequests([]);
  }, [currentCompanyId, canManage]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function approve(r: JoinRequestRow) {
    setBusyId(r.id);
    try {
      await decideJoinRequest(r.id, true, 'employee');
      await load();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(r: JoinRequestRow) {
    setBusyId(r.id);
    try {
      await decideJoinRequest(r.id, false);
      await load();
    } catch (e: any) {
      Alert.alert('Fehler', e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  function confirmLeave() {
    if (!currentCompanyId || !session) return;
    Alert.alert('Firma verlassen', `Möchtest du „${company?.name}" wirklich verlassen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Verlassen',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveCompany(currentCompanyId, session.user.id);
            await refreshMemberships();
            router.replace('/');
          } catch (e: any) {
            Alert.alert('Fehler', e?.message || String(e));
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {company && (
        <View style={styles.card}>
          <Text style={styles.companyName}>{company.name}</Text>
          {!!company.industry && <Text style={styles.companySub}>{company.industry}</Text>}
          <Pressable
            style={styles.codeRow}
            onPress={async () => {
              await Clipboard.setStringAsync(company.join_code);
              Alert.alert('Kopiert', 'Firmencode wurde in die Zwischenablage kopiert.');
            }}
          >
            <Text style={styles.codeLabel}>Firmencode</Text>
            <View style={styles.codePill}>
              <Text style={styles.codeText}>{company.join_code}</Text>
              <Feather name="copy" size={13} color={colors.accent} />
            </View>
          </Pressable>
        </View>
      )}

      {memberships.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Firma wechseln</Text>
          {memberships.map((m) => (
            <Pressable
              key={m.company_id}
              style={[styles.switchRow, m.company_id === currentCompanyId && styles.switchRowActive]}
              onPress={() => setCurrentCompanyId(m.company_id)}
            >
              <Text style={styles.switchText}>{m.company?.name || m.company_id}</Text>
              {m.company_id === currentCompanyId && <Feather name="check" size={16} color={colors.accent} />}
            </Pressable>
          ))}
        </View>
      )}

      {canManage && requests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Beitrittsanfragen</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{requests.length}</Text>
            </View>
          </View>
          {requests.map((r) => (
            <View key={r.id} style={styles.reqRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqName}>{r.full_name}</Text>
                {!!r.message && <Text style={styles.reqMsg}>{r.message}</Text>}
              </View>
              {busyId === r.id ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable style={styles.rejectBtn} onPress={() => reject(r)}>
                    <Feather name="x" size={15} color={colors.danger} />
                  </Pressable>
                  <Pressable style={styles.approveBtn} onPress={() => approve(r)}>
                    <Feather name="check" size={15} color="#fff" />
                  </Pressable>
                </View>
              )}
            </View>
          ))}
          <Text style={styles.hint}>Wird als „Mitarbeiter" angenommen – Rolle danach am Desktop anpassbar.</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mitglieder ({members.length})</Text>
        {members.map((m) => (
          <View key={m.user_id} style={styles.memberRow}>
            <Text style={styles.memberName}>{m.full_name}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>{ROLE_LABEL[m.role] || m.role}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable style={styles.leaveBtn} onPress={confirmLeave}>
        <Text style={styles.leaveText}>Firma verlassen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  wrap: { padding: 16, paddingBottom: 40, backgroundColor: colors.bg },
  card: { backgroundColor: colors.sidebar, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 20 },
  companyName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  companySub: { fontSize: 13, color: colors.ink2, marginTop: 2 },
  codeRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeLabel: { fontSize: 12, color: colors.ink3 },
  codePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.active, borderRadius: radius.sm, paddingVertical: 5, paddingHorizontal: 10 },
  codeText: { fontSize: 13, fontWeight: '700', color: colors.accent, letterSpacing: 1 },
  section: { marginBottom: 22 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  badge: { backgroundColor: colors.warn, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  switchRowActive: {},
  switchText: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  reqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 10 },
  reqName: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  reqMsg: { fontSize: 12, color: colors.ink3 },
  approveBtn: { backgroundColor: colors.good, borderRadius: radius.sm, padding: 8 },
  rejectBtn: { backgroundColor: colors.hover, borderRadius: radius.sm, padding: 8 },
  hint: { fontSize: 11.5, color: colors.ink3, marginTop: 6, fontStyle: 'italic' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  memberName: { fontSize: 13.5, color: colors.ink, fontWeight: '600' },
  roleTag: { backgroundColor: colors.hover, borderRadius: radius.sm, paddingVertical: 3, paddingHorizontal: 8 },
  roleTagText: { fontSize: 11.5, color: colors.ink2, fontWeight: '600' },
  leaveBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 6 },
  leaveText: { color: colors.danger, fontWeight: '700', fontSize: 13.5 },
});
